package handlers

import (
	"encoding/json"
	"encoding/xml"
	"html"
	"log"
	"net/http"
	"os"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
)

type NewsArticle struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	URL         string `json:"url"`
	ImageURL    string `json:"imageUrl"`
	Source      string `json:"source"`
	PublishedAt string `json:"publishedAt"`
	Category    string `json:"category"`
	Language    string `json:"language"` // "uz" yoki "en"
}

// ─── Manbalar ────────────────────────────────────────────────────────────────
// RSS lentalar API kalit talab qilmaydi. cyberOnly=true bo'lgan umumiy yangilik
// lentalaridan faqat kiberxavfsizlikka oid maqolalar olinadi.
type newsSource struct {
	name      string
	url       string
	language  string
	cyberOnly bool
}

var newsSources = []newsSource{
	{name: "Haad TC", url: "https://www.haad.ai/blog-feed.xml", language: "uz"},
	{name: "The Hacker News", url: "https://feeds.feedburner.com/TheHackersNews", language: "en"},
	{name: "BleepingComputer", url: "https://www.bleepingcomputer.com/feed/", language: "en"},
	{name: "SecurityWeek", url: "https://www.securityweek.com/feed/", language: "en"},
	{name: "CNA", url: "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml", language: "en", cyberOnly: true},
}

const (
	newsCacheTTL     = 30 * time.Minute
	newsPerSourceMax = 25
	newsTotalMax     = 90
)

// ─── Kategoriyalar ───────────────────────────────────────────────────────────
// Tartib bo'yicha tekshiriladi: aniqroq tahdidlar (ransomware, phishing...)
// umumiy "Hacking"dan oldin keladi. O'zbekcha kalit so'zlar Haad TC uchun.
var categoryKeywords = []struct {
	label    string
	keywords []string
}{
	{"Ransomware", []string{"ransomware", "to'lov talab", "shifrlovchi"}},
	{"Data Breach", []string{"data breach", "breach", "leaked", "leak", "sizdir", "sizib chiq", "oqib chiq"}},
	{"Phishing", []string{"phishing", "fishing", "firibgar", "scam"}},
	{"Malware", []string{"malware", "trojan", "spyware", "virus", "botnet", "zararli dastur", "troyan", "josuslik dastur"}},
	{"Hacking", []string{"hack", "hacker", "hacked", "exploit", "vulnerability", "zero-day", "cve-", "haker", "zaiflik", "zaifligi", "hujum", "buzib"}},
}

func categorize(text string) string {
	lower := strings.ToLower(text)
	for _, c := range categoryKeywords {
		for _, kw := range c.keywords {
			if strings.Contains(lower, kw) {
				return c.label
			}
		}
	}
	return "Umumiy"
}

// cyberRelated — umumiy lentalardan (CNA) faqat kiberga oid maqolalarni ajratish uchun.
func cyberRelated(text string) bool {
	lower := strings.ToLower(text)
	for _, kw := range []string{"cyber", "hacker", "hacking", "hacked", "data breach", "ransomware", "malware", "phishing", "spyware", "scam", "vulnerability", "data leak"} {
		if strings.Contains(lower, kw) {
			return true
		}
	}
	return false
}

// ─── RSS o'qish ──────────────────────────────────────────────────────────────
type rssFeed struct {
	Channel struct {
		Items []rssItem `xml:"item"`
	} `xml:"channel"`
}

type rssMediaURL struct {
	URL string `xml:"url,attr"`
}

type rssItem struct {
	Title       string `xml:"title"`
	Link        string `xml:"link"`
	Description string `xml:"description"`
	Content     string `xml:"http://purl.org/rss/1.0/modules/content/ encoded"`
	PubDate     string `xml:"pubDate"`
	Enclosure   struct {
		URL  string `xml:"url,attr"`
		Type string `xml:"type,attr"`
	} `xml:"enclosure"`
	MediaContent   []rssMediaURL `xml:"http://search.yahoo.com/mrss/ content"`
	MediaThumbnail []rssMediaURL `xml:"http://search.yahoo.com/mrss/ thumbnail"`
}

var (
	tagRe   = regexp.MustCompile(`<[^>]*>`)
	imgRe   = regexp.MustCompile(`(?i)<img[^>]+src=["']([^"']+)["']`)
	spaceRe = regexp.MustCompile(`\s+`)
)

func plainText(s string, max int) string {
	s = html.UnescapeString(tagRe.ReplaceAllString(s, " "))
	s = strings.TrimSpace(spaceRe.ReplaceAllString(s, " "))
	if utf8.RuneCountInString(s) > max {
		r := []rune(s)
		s = strings.TrimSpace(string(r[:max])) + "…"
	}
	return s
}

func parseRSSDate(s string) (time.Time, bool) {
	s = strings.TrimSpace(s)
	for _, layout := range []string{time.RFC1123Z, time.RFC1123, "Mon, 2 Jan 2006 15:04:05 -0700", "Mon, 2 Jan 2006 15:04:05 MST", time.RFC3339} {
		if t, err := time.Parse(layout, s); err == nil {
			return t, true
		}
	}
	return time.Time{}, false
}

func itemImage(it rssItem) string {
	if it.Enclosure.URL != "" && (it.Enclosure.Type == "" || strings.HasPrefix(it.Enclosure.Type, "image")) {
		return it.Enclosure.URL
	}
	for _, m := range append(it.MediaContent, it.MediaThumbnail...) {
		if m.URL != "" {
			return m.URL
		}
	}
	for _, src := range []string{it.Content, it.Description} {
		if m := imgRe.FindStringSubmatch(src); m != nil {
			return html.UnescapeString(m[1])
		}
	}
	return ""
}

var newsHTTP = &http.Client{Timeout: 12 * time.Second}

// Blogger (The Hacker News) rasmlari RSS'da 1600px — kartaga 640px yetarli (~10x yengil).
var bloggerSizeRe = regexp.MustCompile(`/s\d{3,4}/`)

func shrinkImage(u string) string {
	if strings.Contains(u, "googleusercontent.com") {
		return bloggerSizeRe.ReplaceAllString(u, "/w640/")
	}
	return u
}

// ─── og:image — RSS'da rasm bo'lmagan maqolalar uchun ────────────────────────
var (
	ogImageRe  = regexp.MustCompile(`(?i)<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)["']`)
	ogImageRe2 = regexp.MustCompile(`(?i)<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image)["']`)

	// Maqola URL → rasm URL ("" = topilmadi). Bir marta topilgani qayta yuklanmaydi.
	ogCacheMu sync.Mutex
	ogCache   = map[string]string{}
)

var ogHTTP = &http.Client{Timeout: 6 * time.Second}

func fetchOGImage(pageURL string) string {
	req, err := http.NewRequest(http.MethodGet, pageURL, nil)
	if err != nil {
		return ""
	}
	req.Header.Set("User-Agent", "CyberAI-NewsReader/1.0 (+education platform)")
	resp, err := ogHTTP.Do(req)
	if err != nil {
		return ""
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return ""
	}
	buf := make([]byte, 0, 64<<10)
	chunk := make([]byte, 32<<10)
	for len(buf) < 512<<10 { // og:image <head> ichida — sahifaning boshi yetarli
		n, err := resp.Body.Read(chunk)
		buf = append(buf, chunk[:n]...)
		if err != nil || strings.Contains(strings.ToLower(string(chunk[:n])), "</head>") {
			break
		}
	}
	page := string(buf)
	for _, re := range []*regexp.Regexp{ogImageRe, ogImageRe2} {
		if m := re.FindStringSubmatch(page); m != nil {
			return html.UnescapeString(strings.TrimSpace(m[1]))
		}
	}
	return ""
}

// enrichImages rasmi yo'q maqolalarga og:image'ni parallel (cheklangan) tarzda topadi.
func enrichImages(articles []NewsArticle) {
	sem := make(chan struct{}, 10)
	var wg sync.WaitGroup
	for i := range articles {
		if articles[i].ImageURL != "" {
			continue
		}
		ogCacheMu.Lock()
		img, known := ogCache[articles[i].URL]
		ogCacheMu.Unlock()
		if known {
			articles[i].ImageURL = img
			continue
		}
		wg.Add(1)
		go func(a *NewsArticle) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			img := fetchOGImage(a.URL)
			ogCacheMu.Lock()
			ogCache[a.URL] = img
			ogCacheMu.Unlock()
			a.ImageURL = img
		}(&articles[i])
	}
	wg.Wait()
}

func fetchRSS(src newsSource) ([]NewsArticle, error) {
	req, err := http.NewRequest(http.MethodGet, src.url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "CyberAI-NewsReader/1.0 (+education platform)")
	req.Header.Set("Accept", "application/rss+xml, application/xml, text/xml")
	resp, err := newsHTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, &httpStatusError{resp.StatusCode}
	}

	var feed rssFeed
	if err := xml.NewDecoder(resp.Body).Decode(&feed); err != nil {
		return nil, err
	}

	out := make([]NewsArticle, 0, len(feed.Channel.Items))
	for _, it := range feed.Channel.Items {
		title := plainText(it.Title, 300)
		link := strings.TrimSpace(it.Link)
		if title == "" || link == "" {
			continue
		}
		desc := plainText(it.Description, 280)
		if src.cyberOnly && !cyberRelated(title+" "+desc) {
			continue
		}
		published, ok := parseRSSDate(it.PubDate)
		if !ok {
			published = time.Now()
		}
		out = append(out, NewsArticle{
			Title:       title,
			Description: desc,
			URL:         link,
			ImageURL:    shrinkImage(itemImage(it)),
			Source:      src.name,
			PublishedAt: published.UTC().Format(time.RFC3339),
			Category:    categorize(title + " " + desc),
			Language:    src.language,
		})
		if len(out) >= newsPerSourceMax {
			break
		}
	}
	return out, nil
}

type httpStatusError struct{ code int }

func (e *httpStatusError) Error() string { return "HTTP " + http.StatusText(e.code) }

// ─── NewsAPI (ixtiyoriy) ─────────────────────────────────────────────────────
// NEWS_API_KEY berilsa, NewsAPI.org ham qo'shimcha manba sifatida ishlatiladi.
type newsAPIResponse struct {
	Status   string `json:"status"`
	Message  string `json:"message"`
	Articles []struct {
		Source struct {
			Name string `json:"name"`
		} `json:"source"`
		Title       string `json:"title"`
		Description string `json:"description"`
		URL         string `json:"url"`
		URLToImage  string `json:"urlToImage"`
		PublishedAt string `json:"publishedAt"`
	} `json:"articles"`
}

func fetchNewsAPI(apiKey string) ([]NewsArticle, error) {
	req, err := http.NewRequest(http.MethodGet, "https://newsapi.org/v2/everything", nil)
	if err != nil {
		return nil, err
	}
	q := req.URL.Query()
	q.Set("qInTitle", `cybersecurity OR "cyber security" OR hacking OR hacker OR "data breach" OR ransomware OR malware OR phishing`)
	q.Set("language", "en")
	q.Set("sortBy", "publishedAt")
	q.Set("pageSize", "30")
	req.URL.RawQuery = q.Encode()
	req.Header.Set("X-Api-Key", apiKey)

	resp, err := newsHTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var parsed newsAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return nil, err
	}
	if parsed.Status != "ok" {
		return nil, &newsAPIError{parsed.Message}
	}
	out := make([]NewsArticle, 0, len(parsed.Articles))
	for _, a := range parsed.Articles {
		if a.Title == "" || a.Title == "[Removed]" {
			continue
		}
		out = append(out, NewsArticle{
			Title:       a.Title,
			Description: a.Description,
			URL:         a.URL,
			ImageURL:    a.URLToImage,
			Source:      a.Source.Name,
			PublishedAt: a.PublishedAt,
			Category:    categorize(a.Title + " " + a.Description),
			Language:    "en",
		})
	}
	return out, nil
}

type newsAPIError struct{ msg string }

func (e *newsAPIError) Error() string { return "NewsAPI: " + e.msg }

// ─── Yig'ish va kesh ─────────────────────────────────────────────────────────
var (
	newsCacheMu  sync.Mutex
	newsCache    []NewsArticle
	newsCachedAt time.Time
)

func collectNews() []NewsArticle {
	type result struct {
		name     string
		articles []NewsArticle
		err      error
	}
	jobs := make([]func() result, 0, len(newsSources)+1)
	for _, src := range newsSources {
		src := src
		jobs = append(jobs, func() result { a, err := fetchRSS(src); return result{src.name, a, err} })
	}
	if key := os.Getenv("NEWS_API_KEY"); key != "" {
		jobs = append(jobs, func() result { a, err := fetchNewsAPI(key); return result{"NewsAPI", a, err} })
	}

	results := make([]result, len(jobs))
	var wg sync.WaitGroup
	for i, job := range jobs {
		wg.Add(1)
		go func(i int, job func() result) {
			defer wg.Done()
			results[i] = job()
		}(i, job)
	}
	wg.Wait()

	seen := make(map[string]bool)
	all := make([]NewsArticle, 0, 120)
	for _, r := range results {
		if r.err != nil {
			log.Printf("Yangiliklar manbasi ishlamadi (%s): %v", r.name, r.err)
			continue
		}
		for _, a := range r.articles {
			if seen[a.URL] {
				continue
			}
			seen[a.URL] = true
			all = append(all, a)
		}
	}
	sort.SliceStable(all, func(i, j int) bool { return all[i].PublishedAt > all[j].PublishedAt })
	if len(all) > newsTotalMax {
		all = all[:newsTotalMax]
	}
	enrichImages(all)
	return all
}

var newsRefreshing bool

// refreshNews yangiliklarni qayta yig'adi va keshni yangilaydi (bir vaqtda faqat bittasi).
func refreshNews() []NewsArticle {
	newsCacheMu.Lock()
	if newsRefreshing {
		newsCacheMu.Unlock()
		return nil
	}
	newsRefreshing = true
	newsCacheMu.Unlock()

	articles := collectNews()

	newsCacheMu.Lock()
	defer newsCacheMu.Unlock()
	newsRefreshing = false
	if len(articles) > 0 {
		newsCache = articles
		newsCachedAt = time.Now()
	}
	return articles
}

// WarmNewsCache backend ishga tushganda yangiliklarni oldindan yuklaydi —
// birinchi foydalanuvchi kutib qolmasligi uchun.
func WarmNewsCache() {
	go refreshNews()
}

// GET /api/news — bir nechta manbadan yig'ilgan kiberxavfsizlik yangiliklari (30 daqiqalik kesh).
// Kesh eskirgan bo'lsa, mavjud natija darhol qaytariladi va yangilash orqa fonda bajariladi.
func GetNews(c *gin.Context) {
	newsCacheMu.Lock()
	cached, fresh := newsCache, time.Since(newsCachedAt) < newsCacheTTL
	newsCacheMu.Unlock()

	if len(cached) > 0 {
		if !fresh {
			go refreshNews()
		}
		c.JSON(http.StatusOK, cached)
		return
	}

	// Kesh bo'sh (masalan, ishga tushish paytidagi yuklash hali tugamagan) — kutib olamiz.
	articles := refreshNews()
	if articles == nil {
		// Boshqa so'rov allaqachon yuklayapti — u tugashini qisqa kutamiz.
		for i := 0; i < 40 && len(articles) == 0; i++ {
			time.Sleep(250 * time.Millisecond)
			newsCacheMu.Lock()
			articles = newsCache
			newsCacheMu.Unlock()
		}
	}
	if len(articles) == 0 {
		c.JSON(http.StatusBadGateway, gin.H{"error": "Yangiliklar manbalariga ulanib bo'lmadi"})
		return
	}
	c.JSON(http.StatusOK, articles)
}

package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"os"
	"slices"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
)

// AI yordamchi (Google Gemini) uchun proksi. Kalit faqat serverda (GOOGLE_AI_API_KEY) —
// avval u frontend'da (VITE_...) turardi va saytni ochgan har kim uni ko'chirib olib,
// sizning kvotangiz hisobidan ishlata olardi.

const (
	assistantMaxMessages   = 20
	assistantMaxMsgLen     = 4000
	assistantMaxContextLen = 4000
	// Bitta foydalanuvchi bir kunda yuboradigan savollar soni (kvotani himoyalash)
	assistantDailyLimit = 150
)

// geminiBaseURL — Google API manzili (testlarda soxta server bilan almashtiriladi)
var geminiBaseURL = "https://generativelanguage.googleapis.com"

var assistantHTTP = &http.Client{}

const (
	// Bitta savolga umumiy kutish (barcha urinishlar bilan) va bitta urinish chegarasi
	assistantBudget         = 30 * time.Second
	assistantAttemptTimeout = 15 * time.Second
	// Zaxira sifatida sinaladigan boshqa modellar soni
	assistantMaxAlternatives = 2
)

// Google'dan olingan model ro'yxati (kalit uchun mavjud modellar) — soatiga bir marta yangilanadi.
var (
	assistantModelsMu      sync.Mutex
	assistantModelsCache   []string
	assistantModelsFetched time.Time
)

// assistantAlternatives — asosiy modeldan boshqa, matn yozadigan "flash" modellar
// (avval yengil "lite"lari: ular odatda kamroq band bo'ladi). Nomlar taxmin qilinmaydi —
// Google'ning shu kalit uchun haqiqiy ro'yxatidan olinadi.
func assistantAlternatives(key, primary string) []string {
	assistantModelsMu.Lock()
	defer assistantModelsMu.Unlock()
	if time.Since(assistantModelsFetched) > time.Hour {
		if list, err := listGeminiModels(key); err == nil {
			assistantModelsCache = list
			assistantModelsFetched = time.Now()
		} else {
			log.Printf("Gemini modellar ro'yxatini olib bo'lmadi: %v", err)
		}
	}
	var lite, other []string
	for _, m := range assistantModelsCache {
		if m == primary {
			continue
		}
		if strings.Contains(m, "lite") {
			lite = append(lite, m)
		} else {
			other = append(other, m)
		}
	}
	out := append(lite, other...)
	if len(out) > assistantMaxAlternatives {
		out = out[:assistantMaxAlternatives]
	}
	return out
}

func listGeminiModels(key string) ([]string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, geminiBaseURL+"/v1beta/models?pageSize=200", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("x-goog-api-key", key)
	resp, err := assistantHTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, errors.New(resp.Status)
	}
	var data struct {
		Models []struct {
			Name    string   `json:"name"`
			Methods []string `json:"supportedGenerationMethods"`
		} `json:"models"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 4<<20)).Decode(&data); err != nil {
		return nil, err
	}
	var out []string
	for _, m := range data.Models {
		name := strings.TrimPrefix(m.Name, "models/")
		// Faqat oddiy matnli "flash" modellar (rasm/ovoz/embedding/eksperimental emas)
		if !strings.Contains(name, "flash") || !slices.Contains(m.Methods, "generateContent") {
			continue
		}
		skip := false
		for _, bad := range []string{"image", "tts", "audio", "live", "embedding", "exp", "thinking"} {
			if strings.Contains(name, bad) {
				skip = true
				break
			}
		}
		if !skip {
			out = append(out, name)
		}
	}
	return out, nil
}

const assistantSystemPrompt = `Siz CyberAl Platform ichidagi AI yordamchisiz.
Javoblarni o'zbek tilida, qisqa va amaliy yozing.
Kiberxavfsizlik bo'yicha ta'lim, tushuntirish, mudofaa choralari, laboratoriya fikrlashi va o'quv rejasiga yordam bering.
Zararli ekspluatatsiya, ruxsatsiz buzib kirish, credential o'g'irlash yoki zararli kod bo'yicha bosqichma-bosqich ko'rsatma bermang.
Agar savol xavfli bo'lsa, uni himoyaviy va etik o'quv yo'nalishiga burib javob bering.`

func assistantKey() string { return strings.TrimSpace(os.Getenv("GOOGLE_AI_API_KEY")) }

func assistantModel() string {
	if m := strings.TrimSpace(os.Getenv("GEMINI_MODEL")); m != "" {
		return m
	}
	return "gemini-3.8-flash"
}

// Kunlik hisob (xotirada; server qayta ishga tushsa nolga qaytadi — bu yetarli)
var (
	assistantUsageMu  sync.Mutex
	assistantUsageDay string
	assistantUsage    = map[uint]int{}
)

func assistantAllow(userID uint) bool {
	day := time.Now().UTC().Format("2006-01-02")
	assistantUsageMu.Lock()
	defer assistantUsageMu.Unlock()
	if day != assistantUsageDay {
		assistantUsageDay = day
		assistantUsage = map[uint]int{}
	}
	if assistantUsage[userID] >= assistantDailyLimit {
		return false
	}
	assistantUsage[userID]++
	return true
}

// GET /api/assistant/status
func AssistantStatus(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"enabled": assistantKey() != ""})
}

type assistantMessage struct {
	Role string `json:"role"`
	Text string `json:"text"`
}

type assistantRequest struct {
	Messages []assistantMessage `json:"messages" binding:"required,min=1"`
	// O'quvchi holati (daraja, modullar) — faqat javobni moslashtirish uchun matn
	Context string `json:"context"`
}

func truncateRunes(s string, max int) string {
	if utf8.RuneCountInString(s) <= max {
		return s
	}
	return string([]rune(s)[:max])
}

// POST /api/assistant
func AskAssistant(c *gin.Context) {
	key := assistantKey()
	if key == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "AI yordamchi sozlanmagan (serverda GOOGLE_AI_API_KEY yo'q)."})
		return
	}
	var req assistantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Savol yuborilmadi"})
		return
	}
	if !assistantAllow(c.MustGet("userID").(uint)) {
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "Bugungi savollar limiti tugadi. Ertaga qayta urinib ko'ring."})
		return
	}

	msgs := req.Messages
	if len(msgs) > assistantMaxMessages {
		msgs = msgs[len(msgs)-assistantMaxMessages:]
	}
	contents := make([]gin.H, 0, len(msgs))
	for _, m := range msgs {
		role := "user"
		if m.Role == "model" {
			role = "model"
		}
		contents = append(contents, gin.H{"role": role, "parts": []gin.H{{"text": truncateRunes(m.Text, assistantMaxMsgLen)}}})
	}

	body, _ := json.Marshal(gin.H{
		"systemInstruction": gin.H{"parts": []gin.H{{"text": assistantSystemPrompt + "\n" + truncateRunes(req.Context, assistantMaxContextLen)}}},
		"contents":          contents,
		"generationConfig":  gin.H{"temperature": 0.4, "topP": 0.9, "maxOutputTokens": 700},
	})
	// Asosiy model band bo'lsa (503/429/5xx/timeout) — darhol boshqa mavjud modelga o'tiladi:
	// GEMINI_FALLBACK_MODEL (berilgan bo'lsa), keyin Google'ning shu kalit uchun ro'yxatidagi
	// boshqa "flash" modellar. Umumiy kutish assistantBudget bilan cheklangan — o'quvchi
	// daqiqalab kutib qolmasin.
	deadline := time.Now().Add(assistantBudget)
	primary := assistantModel()
	tried := map[string]bool{}
	var queue []string
	push := func(m string) {
		if m != "" && !tried[m] {
			tried[m] = true
			queue = append(queue, m)
		}
	}
	push(primary)
	push(strings.TrimSpace(os.Getenv("GEMINI_FALLBACK_MODEL")))

	busy, discovered := false, false
	for len(queue) > 0 {
		model := queue[0]
		queue = queue[1:]
		left := time.Until(deadline)
		if left < 3*time.Second {
			break
		}
		text, status, err := callGemini(c, key, model, body, min(left, assistantAttemptTimeout))
		if err == nil {
			c.JSON(http.StatusOK, gin.H{"text": text})
			return
		}
		log.Printf("Gemini xatosi (%s, %d): %v", model, status, err)
		busy = status == http.StatusServiceUnavailable || status == http.StatusTooManyRequests || status >= 500 || status == 0
		if !busy && model == primary {
			break // kalit xatosi — boshqa model ham yordam bermaydi
		}
		if c.Request.Context().Err() != nil {
			return // foydalanuvchi oynani yopdi
		}
		if !discovered {
			discovered = true
			for _, m := range assistantAlternatives(key, primary) {
				push(m)
			}
		}
	}
	if busy {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "AI xizmati hozir juda band. Bir daqiqadan keyin qayta urinib ko'ring."})
		return
	}
	c.JSON(http.StatusBadGateway, gin.H{"error": "AI yordamchi hozir javob bera olmadi. Birozdan keyin qayta urinib ko'ring."})
}

// callGemini bitta so'rov yuboradi. Xatoda Google'ning HTTP holati (tarmoq xatosi/timeout'da 0) qaytadi.
func callGemini(c *gin.Context, key, model string, body []byte, timeout time.Duration) (string, int, error) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), timeout)
	defer cancel()
	url := geminiBaseURL + "/v1beta/models/" + model + ":generateContent"
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return "", http.StatusInternalServerError, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-goog-api-key", key)

	resp, err := assistantHTTP.Do(httpReq)
	if err != nil {
		return "", 0, err
	}
	defer resp.Body.Close()

	var data struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
		Error *struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	_ = json.NewDecoder(io.LimitReader(resp.Body, 2<<20)).Decode(&data)
	if resp.StatusCode != http.StatusOK {
		msg := "javob yo'q"
		if data.Error != nil {
			msg = data.Error.Message
		}
		return "", resp.StatusCode, errors.New(msg)
	}

	var sb strings.Builder
	if len(data.Candidates) > 0 {
		for _, p := range data.Candidates[0].Content.Parts {
			sb.WriteString(p.Text)
		}
	}
	text := strings.TrimSpace(sb.String())
	if text == "" {
		return "", http.StatusBadGateway, errors.New("bo'sh javob")
	}
	return text, http.StatusOK, nil
}

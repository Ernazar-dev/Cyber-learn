package handlers

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
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

var assistantHTTP = &http.Client{Timeout: 40 * time.Second}

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
	url := "https://generativelanguage.googleapis.com/v1beta/models/" + assistantModel() + ":generateContent"
	httpReq, err := http.NewRequestWithContext(c.Request.Context(), http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Server xatosi"})
		return
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-goog-api-key", key)

	resp, err := assistantHTTP.Do(httpReq)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "AI xizmatiga ulanib bo'lmadi. Birozdan keyin qayta urinib ko'ring."})
		return
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
		// Google xatosi (kalit, kvota) logga yoziladi; foydalanuvchiga umumiy xabar
		if data.Error != nil {
			log.Printf("Gemini xatosi (%d): %s", resp.StatusCode, data.Error.Message)
		}
		c.JSON(http.StatusBadGateway, gin.H{"error": "AI yordamchi hozir javob bera olmadi. Birozdan keyin qayta urinib ko'ring."})
		return
	}

	var sb strings.Builder
	if len(data.Candidates) > 0 {
		for _, p := range data.Candidates[0].Content.Parts {
			sb.WriteString(p.Text)
		}
	}
	text := strings.TrimSpace(sb.String())
	if text == "" {
		c.JSON(http.StatusBadGateway, gin.H{"error": "AI bo'sh javob qaytardi."})
		return
	}
	c.JSON(http.StatusOK, gin.H{"text": text})
}

package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// SecurityHeaders — brauzerga xavfsiz sarlavhalar. API faqat JSON va yuklangan fayllar
// qaytaradi, shuning uchun CSP qattiq: hech qanday skript/stil bajarilmaydi.
// /api/files/* bundan mustasno — darslardagi PDF frontend <iframe>'ida ochiladi
// (fayl turlari upload.go'da oq ro'yxat bilan cheklangan, HTML/SVG yuklab bo'lmaydi).
func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		h := c.Writer.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("Referrer-Policy", "no-referrer")
		if !strings.HasPrefix(c.Request.URL.Path, "/api/files/") {
			h.Set("X-Frame-Options", "DENY")
			h.Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
		}
		if c.Request.TLS != nil || c.GetHeader("X-Forwarded-Proto") == "https" {
			h.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		c.Next()
	}
}

// uploadMaxBody — /api/upload uchun (64 MB fayl + multipart sarlavhalari).
const uploadMaxBody = 65 << 20

// BodyLimit so'rov tanasini `limit` bayt bilan cheklaydi — ulkan JSON yuborib
// xotira/diskni to'ldirishga (DoS) yo'l qo'ymaydi. Fayl yuklash yo'li o'z chegarasiga ega.
func BodyLimit(limit int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		max := limit
		if c.Request.URL.Path == "/api/upload" {
			max = uploadMaxBody
		}
		if c.Request.ContentLength > max {
			c.AbortWithStatusJSON(http.StatusRequestEntityTooLarge, gin.H{"error": "So'rov hajmi juda katta"})
			return
		}
		if c.Request.Body != nil {
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, max)
		}
		c.Next()
	}
}

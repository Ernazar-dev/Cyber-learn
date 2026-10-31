package middleware

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// RateLimit — bitta IP'dan `window` ichida ko'pi bilan `limit` ta so'rov (oddiy, xotiradagi
// sobit oyna). Login/parolni tanlab ko'rishni (brute-force) sekinlashtirish uchun.
// Bitta server nusxasi uchun yetarli (Render free — bitta instance).
func RateLimit(limit int, window time.Duration) gin.HandlerFunc {
	return rateLimit(limit, window, func(c *gin.Context) string { return c.ClientIP() })
}

// RateLimitUser — Auth()'dan keyin ishlatiladi: hisob bo'yicha limit (bitta IP ortidagi
// butun sinfga emas, aynan shu foydalanuvchiga ta'sir qiladi).
func RateLimitUser(limit int, window time.Duration) gin.HandlerFunc {
	return rateLimit(limit, window, func(c *gin.Context) string {
		if id, ok := c.Get("userID"); ok {
			return "u:" + strconv.FormatUint(uint64(id.(uint)), 10)
		}
		return c.ClientIP()
	})
}

func rateLimit(limit int, window time.Duration, keyOf func(*gin.Context) string) gin.HandlerFunc {
	type bucket struct {
		count int
		reset time.Time
	}
	var (
		mu      sync.Mutex
		buckets = map[string]*bucket{}
		sweep   = time.Now().Add(window)
	)

	return func(c *gin.Context) {
		now := time.Now()
		key := keyOf(c)

		mu.Lock()
		// Eskirgan yozuvlarni vaqti-vaqti bilan tozalash — xotira o'smasin
		if now.After(sweep) {
			for k, b := range buckets {
				if now.After(b.reset) {
					delete(buckets, k)
				}
			}
			sweep = now.Add(window)
		}
		b, ok := buckets[key]
		if !ok || now.After(b.reset) {
			b = &bucket{reset: now.Add(window)}
			buckets[key] = b
		}
		b.count++
		over := b.count > limit
		retry := int(b.reset.Sub(now).Seconds()) + 1
		mu.Unlock()

		if over {
			c.Header("Retry-After", strconv.Itoa(retry))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "Juda ko'p urinish. Birozdan keyin qayta urinib ko'ring.",
			})
			return
		}
		c.Next()
	}
}

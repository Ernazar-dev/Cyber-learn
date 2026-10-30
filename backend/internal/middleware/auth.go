package middleware

import (
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID uint   `json:"userId"`
	Name   string `json:"name"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

const tokenTTL = 14 * 24 * time.Hour

// getJWTSecret — kalit faqat muhitdan (.env) olinadi; main.go ishga tushishda borligini tekshiradi.
func getJWTSecret() []byte {
	return []byte(os.Getenv("JWT_SECRET"))
}

// Auth middleware — requires valid JWT
func Auth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Avtorizatsiya talab etiladi"})
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Noto'g'ri token format"})
			c.Abort()
			return
		}

		tokenStr := parts[1]
		claims := &Claims{}
		// Faqat HS256 — boshqa algoritm bilan imzolangan tokenlar rad etiladi
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
			return getJWTSecret(), nil
		}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token yaroqsiz yoki muddati o'tgan"})
			c.Abort()
			return
		}

		c.Set("userID", claims.UserID)
		c.Set("userName", claims.Name)
		c.Set("userRole", claims.Role)
		c.Next()
	}
}

// TeacherOnly middleware — only allows Teacher role
func TeacherOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, _ := c.Get("userRole")
		if role != "Teacher" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Bu amal faqat o'qituvchilar uchun"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// GenerateToken creates a JWT token for a user
func GenerateToken(userID uint, name, role string) (string, error) {
	now := time.Now()
	claims := &Claims{
		UserID: userID,
		Name:   name,
		Role:   role,
		// Muddatsiz token o'g'irlansa abadiy ishlaydi — 14 kundan keyin qayta kirish kerak
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(tokenTTL)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(getJWTSecret())
}

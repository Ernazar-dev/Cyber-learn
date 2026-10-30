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
	// Ver — foydalanuvchining token versiyasi (users.token_version). Parol o'zgarganda
	// versiya oshadi va undan oldin berilgan barcha tokenlar bekor bo'ladi.
	Ver int `json:"ver"`
	jwt.RegisteredClaims
}

const tokenTTL = 14 * 24 * time.Hour

// getJWTSecret — kalit faqat muhitdan (.env) olinadi; main.go ishga tushishda borligini tekshiradi.
func getJWTSecret() []byte {
	return []byte(os.Getenv("JWT_SECRET"))
}

func unauthorized(c *gin.Context, msg string) {
	c.JSON(http.StatusUnauthorized, gin.H{"error": msg})
	c.Abort()
}

// Auth middleware — requires valid JWT
func Auth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			unauthorized(c, "Avtorizatsiya talab etiladi")
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			unauthorized(c, "Noto'g'ri token format")
			return
		}

		tokenStr := parts[1]
		claims := &Claims{}
		// Faqat HS256 va albatta muddatli (exp) tokenlar qabul qilinadi
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
			return getJWTSecret(), nil
		}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}), jwt.WithExpirationRequired())

		if err != nil || !token.Valid {
			unauthorized(c, "Token yaroqsiz yoki muddati o'tgan")
			return
		}

		// Foydalanuvchi hali bormi va parolini o'zgartirmaganmi (keshlangan tekshiruv)
		state, err := lookupUserState(claims.UserID)
		if err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Server vaqtincha band, qayta urinib ko'ring"})
			c.Abort()
			return
		}
		if !state.exists {
			unauthorized(c, "Hisob topilmadi. Qayta kiring.")
			return
		}
		if state.version != claims.Ver {
			unauthorized(c, "Parol o'zgartirilgan. Iltimos, qayta kiring.")
			return
		}

		c.Set("userID", claims.UserID)
		c.Set("userName", claims.Name)
		// Rol bazadan — tokendagi eskirgan rolga ishonilmaydi
		c.Set("userRole", state.role)
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

// GenerateToken creates a JWT token for a user. ver — users.token_version.
func GenerateToken(userID uint, name, role string, ver int) (string, error) {
	now := time.Now()
	claims := &Claims{
		UserID: userID,
		Name:   name,
		Role:   role,
		Ver:    ver,
		// Muddatsiz token o'g'irlansa abadiy ishlaydi — 14 kundan keyin qayta kirish kerak
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(tokenTTL)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(getJWTSecret())
}

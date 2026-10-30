package handlers

import (
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"cyberai-backend/internal/database"
	"cyberai-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// GET /api/modules/:id/certificate — generates and returns a downloadable PNG
// certificate for the currently logged-in student's completion of one module.
func GetModuleCertificate(c *gin.Context) {
	idStr := c.Param("id")
	moduleID, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Noto'g'ri ID"})
		return
	}

	userID, _ := c.Get("userID")

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Foydalanuvchi topilmadi"})
		return
	}

	if user.Role != models.RoleStudent {
		c.JSON(http.StatusForbidden, gin.H{"error": "Sertifikat faqat o'quvchilarga beriladi"})
		return
	}

	var mod models.Module
	if err := database.DB.First(&mod, moduleID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Modul topilmadi"})
		return
	}

	var mp models.ModuleProgress
	if err := database.DB.Where("user_id = ? AND module_id = ?", userID, moduleID).First(&mp).Error; err != nil || !mp.Completed {
		c.JSON(http.StatusForbidden, gin.H{"error": "Sertifikat olish uchun avval ushbu modulni testdan o'tib tugatishingiz kerak"})
		return
	}

	var cert models.Certificate
	if err := database.DB.Where("user_id = ? AND module_id = ?", userID, moduleID).First(&cert).Error; err != nil {
		cert = models.Certificate{
			UserID:           user.ID,
			ModuleID:         mod.ID,
			VerificationCode: uuid.New().String()[:8],
			ModuleTitle:      mod.Title,
			Score:            mp.Score,
			IssuedAt:         time.Now(),
		}
		database.DB.Create(&cert)
	}

	png, err := renderCertificatePNG(certificateData{
		Name:        user.Name,
		ModuleID:    mod.ID,
		ModuleTitle: cert.ModuleTitle,
		// Modul balli — topshiriqlar natijalarining o'rtachasi (eski sertifikatlarda cert.Score noto'g'ri)
		Score:     mp.Score,
		IssuedAt:  cert.IssuedAt,
		Code:      cert.VerificationCode,
		VerifyURL: verifyURL(cert.VerificationCode),
		// Imzo qatori — .env: CERT_SIGNER_NAME, CERT_SIGNER_TITLE
		SignerName:  strings.TrimSpace(os.Getenv("CERT_SIGNER_NAME")),
		SignerTitle: strings.TrimSpace(os.Getenv("CERT_SIGNER_TITLE")),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Sertifikat yaratishda xato: " + err.Error()})
		return
	}

	c.Header("Content-Disposition", `attachment; filename="sertifikat-`+strconv.FormatUint(moduleID, 10)+`.png"`)
	c.Data(http.StatusOK, "image/png", png)
}

// GET /api/certificate/verify/:code — public lookup to confirm a certificate is genuine
func VerifyCertificate(c *gin.Context) {
	code := c.Param("code")

	var cert models.Certificate
	if err := database.DB.Where("verification_code = ?", code).First(&cert).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"valid": false, "error": "Bunday sertifikat topilmadi"})
		return
	}

	var user models.User
	database.DB.First(&user, cert.UserID)

	c.JSON(http.StatusOK, gin.H{
		"valid":       true,
		"name":        user.Name,
		"moduleTitle": cert.ModuleTitle,
		"issuedAt":    cert.IssuedAt,
	})
}

func verifyURL(code string) string {
	base := strings.TrimSpace(os.Getenv("PUBLIC_API_URL"))
	if base == "" {
		// Render har bir web-servisga o'zining ochiq manzilini beradi
		base = os.Getenv("RENDER_EXTERNAL_URL")
	}
	if base == "" {
		base = "http://localhost:8080"
	}
	return fmt.Sprintf("%s/api/certificate/verify/%s", strings.TrimSuffix(base, "/"), code)
}

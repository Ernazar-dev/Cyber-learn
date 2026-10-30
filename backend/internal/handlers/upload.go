package handlers

import (
	"fmt"
	"io"
	"mime"
	"net/http"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"cyberai-backend/internal/database"
	"cyberai-backend/internal/models"

	"github.com/gin-gonic/gin"
)

var (
	allowedUploadExts = map[string]bool{
		".pdf": true, ".ppt": true, ".pptx": true,
		".doc": true, ".docx": true, ".xlsx": true, ".xls": true,
		".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true,
		".mp4": true, ".webm": true, ".mov": true, ".avi": true,
		".zip": true, ".rar": true,
		".txt": true, ".md": true,
	}
	unsafeFileChars = regexp.MustCompile(`[^a-zA-Z0-9]`)
)

func UploadFile(c *gin.Context) {
	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Fayl topilmadi"})
		return
	}
	defer file.Close()

	const maxSize int64 = 64 << 20 // 64 MB
	if header.Size > maxSize {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "Fayl hajmi 64MB dan oshmasligi kerak"})
		return
	}

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if !allowedUploadExts[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Bu fayl turi ruxsat etilmagan: " + ext})
		return
	}

	data, err := io.ReadAll(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Faylni o'qishda xato"})
		return
	}

	baseName := strings.TrimSuffix(header.Filename, filepath.Ext(header.Filename))
	safeName := unsafeFileChars.ReplaceAllString(baseName, "_")
	if len(safeName) > 40 {
		safeName = safeName[:40]
	}
	uniqueName := fmt.Sprintf("%d_%s%s", time.Now().UnixNano(), safeName, ext)

	contentType := mime.TypeByExtension(ext)
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	uploaded := models.UploadedFile{
		StoredName:   uniqueName,
		OriginalName: header.Filename,
		ContentType:  contentType,
		Size:         header.Size,
		Data:         data,
	}
	if err := database.DB.Create(&uploaded).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fayl saqlashda xato"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"url":  "/api/files/" + uniqueName,
		"name": header.Filename,
		"size": header.Size,
	})
}

// GET /api/files/:name — serves a previously uploaded file's bytes straight
// from Postgres, inline (so PDFs render in an iframe instead of downloading).
func GetUploadedFile(c *gin.Context) {
	name := c.Param("name")

	var uploaded models.UploadedFile
	if err := database.DB.Where("stored_name = ?", name).First(&uploaded).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Fayl topilmadi"})
		return
	}

	// Fayl nomi (qo'shtirnoq, kirill harflari) sarlavhani buzmasligi uchun RFC 6266 bo'yicha kodlanadi
	disposition := mime.FormatMediaType("inline", map[string]string{"filename": uploaded.OriginalName})
	if disposition == "" {
		disposition = "inline"
	}
	c.Header("Content-Disposition", disposition)
	// Brauzer turini "taxmin qilib" faylni boshqa narsa (masalan, HTML) sifatida ochmasin
	c.Header("X-Content-Type-Options", "nosniff")
	// Nom noyob (vaqt belgisi bilan) va fayl o'zgarmaydi — brauzer keshlay oladi; bazaga qayta so'rov kamayadi
	c.Header("Cache-Control", "public, max-age=31536000, immutable")
	c.Data(http.StatusOK, uploaded.ContentType, uploaded.Data)
}

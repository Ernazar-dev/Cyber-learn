package handlers

import (
	"net/http"
	"strconv"

	"cyberai-backend/internal/database"
	"cyberai-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GET /api/modules
func GetModules(c *gin.Context) {
	userID, _ := c.Get("userID")
	role, _ := c.Get("userRole")

	var modules []models.Module
	database.DB.Order("order_index asc").Find(&modules)

	type ModuleWithProgress struct {
		ID          uint   `json:"id"`
		Title       string `json:"title"`
		Description string `json:"description"`
		Content     string `json:"content"`
		OrderIndex  int    `json:"orderIndex"`
		Unlocked    bool   `json:"unlocked"`
		Completed   bool   `json:"completed"`
	}

	var result []ModuleWithProgress
	for _, mod := range modules {
		mwp := ModuleWithProgress{
			ID:          mod.ID,
			Title:       mod.Title,
			Description: mod.Description,
			Content:     mod.Content,
			OrderIndex:  mod.OrderIndex,
			Unlocked:    role == "Teacher",
			Completed:   false,
		}

		if role == "Student" {
			var mp models.ModuleProgress
			if err := database.DB.Where("user_id = ? AND module_id = ?", userID, mod.ID).First(&mp).Error; err == nil {
				mwp.Unlocked = mp.Unlocked
				mwp.Completed = mp.Completed
			}
		}

		result = append(result, mwp)
	}

	if result == nil {
		result = []ModuleWithProgress{}
	}
	c.JSON(http.StatusOK, result)
}

// GET /api/modules/:id
func GetModule(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Noto'g'ri ID"})
		return
	}

	var mod models.Module
	if err := database.DB.First(&mod, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Modul topilmadi"})
		return
	}

	userID, _ := c.Get("userID")
	role, _ := c.Get("userRole")

	unlocked := role == "Teacher"
	completed := false

	if role == "Student" {
		var mp models.ModuleProgress
		if err := database.DB.Where("user_id = ? AND module_id = ?", userID, id).First(&mp).Error; err == nil {
			unlocked = mp.Unlocked
			completed = mp.Completed
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"id":          mod.ID,
		"title":       mod.Title,
		"description": mod.Description,
		"content":     mod.Content,
		"orderIndex":  mod.OrderIndex,
		"unlocked":    unlocked,
		"completed":   completed,
	})
}

// modulePassingScore — topshiriq (va shu bilan modul) bajarilgan hisoblanishi uchun minimal natija
const modulePassingScore = 0.7

// tryCompleteModule o'quvchining shu moduldagi barcha savolli topshiriqlari bajarilgan
// bo'lsa, modulni tugatadi (ball — topshiriqlar natijalarining o'rtachasi).
// Modul alohida nazorat testi bilan emas, faqat o'qituvchi topshiriqlari orqali tugaydi.
// Savolsiz ("Bajardim") topshiriqlar hisobga olinmaydi. Modul shu chaqiruvda tugagan bo'lsa true.
func tryCompleteModule(userID, moduleID uint) (bool, error) {
	var tasks []models.Assignment
	err := database.DB.
		Where("student_id = ? AND target_module_id = ?", userID, moduleID).
		Where("EXISTS (SELECT 1 FROM assignment_questions q WHERE q.assignment_id = assignments.id AND q.deleted_at IS NULL)").
		Find(&tasks).Error
	if err != nil || len(tasks) == 0 {
		return false, err
	}

	sum, scored := 0.0, 0
	for _, t := range tasks {
		if !t.Completed {
			return false, nil
		}
		// O'qituvchi qo'lda belgilagan topshiriqda natija yo'q (0) — o'rtachaga qo'shilmaydi
		if t.Score > 0 {
			sum += t.Score
			scored++
		}
	}
	score := 0.0
	if scored > 0 {
		score = sum / float64(scored)
	}

	var mp models.ModuleProgress
	if err := database.DB.Where("user_id = ? AND module_id = ?", userID, moduleID).First(&mp).Error; err != nil {
		return false, err
	}
	if mp.Completed {
		// Yangi topshiriq qayta yechilgan bo'lsa ham modul balli yangilanib tursin
		return false, database.DB.Model(&mp).Update("score", score).Error
	}

	// Shartli UPDATE: parallel so'rovlarda XP va ochilish faqat bir marta
	res := database.DB.Model(&models.ModuleProgress{}).
		Where("id = ? AND completed = ?", mp.ID, false).
		Updates(map[string]interface{}{"completed": true, "unlocked": true, "score": score})
	if res.Error != nil || res.RowsAffected == 0 {
		return false, res.Error
	}

	var currentMod models.Module
	database.DB.First(&currentMod, moduleID)

	var completedCount int64
	database.DB.Model(&models.ModuleProgress{}).
		Where("user_id = ? AND completed = ?", userID, true).
		Count(&completedCount)
	// Keyingi modullar qiyinroq — XP ko'proq
	database.DB.Model(&models.User{}).Where("id = ?", userID).
		Updates(map[string]interface{}{
			"completed_modules_count": completedCount,
			"xp":                      gorm.Expr("xp + ?", 50*currentMod.OrderIndex),
		})

	// Keyingi modulni ochish
	var nextModule models.Module
	if database.DB.Where("order_index = ?", currentMod.OrderIndex+1).First(&nextModule).Error == nil {
		database.DB.Model(&models.ModuleProgress{}).
			Where("user_id = ? AND module_id = ?", userID, nextModule.ID).
			Update("unlocked", true)
	}
	return true, nil
}

package handlers

import (
	"net/http"

	"cyberai-backend/internal/database"
	"cyberai-backend/internal/fuzzy"
	"cyberai-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AssessmentRequest struct {
	// Diagnostika savollari tartibida tanlangan variantlar; javobsiz savol uchun -1
	Answers []int `json:"answers" binding:"required"`
}

// assessmentResult — fuzzy baholash natijasi (frontend do'koni shu bilan yangilanadi).
type assessmentResult struct {
	Score     float64      `json:"score"`
	Level     models.Level `json:"level"`
	Rule1     float64      `json:"rule1"`
	Rule2     float64      `json:"rule2"`
	Rule3     float64      `json:"rule3"`
	Knowledge float64      `json:"knowledge"`
	Errors    float64      `json:"errors"`
	Speed     float64      `json:"speed"`
}

// applyAssessment fuzzy tizimini serverda hisoblangan ko'rsatkichlar bilan ishga tushiradi,
// o'quvchi darajasini saqlaydi va darajaga mos modullarni ochadi.
// Ko'rsatkichlar faqat serverda baholangan javoblardan keladi — brauzer raqamlariga ishonilmaydi.
func applyAssessment(user models.User, knowledge, errors, speed float64) (assessmentResult, error) {
	var fw models.FuzzyWeights
	database.DB.First(&fw)

	result := fuzzy.Run(knowledge, errors, speed, fuzzy.FuzzyWeightsInput{
		Rule1Weight:           fw.Rule1Weight,
		Rule2Weight:           fw.Rule2Weight,
		Rule3Weight:           fw.Rule3Weight,
		BeginnerThreshold:     fw.BeginnerThreshold,
		IntermediateThreshold: fw.IntermediateThreshold,
	})

	updates := map[string]interface{}{
		"diagnostic_score":           knowledge,
		"level":                      result.Level,
		"fuzzy_score":                result.Score,
		"speed":                      speed,
		"errors":                     errors,
		"has_completed_initial_test": true,
		"last_fuzzy_score":           result.Score,
		"last_fuzzy_level":           result.Level,
		"last_fuzzy_rule1":           result.Rule1,
		"last_fuzzy_rule2":           result.Rule2,
		"last_fuzzy_rule3":           result.Rule3,
		"has_fuzzy_result":           true,
	}
	// Diagnostic test gives a flat completion bonus, not a score-based one —
	// otherwise a weaker result would earn less XP for the same effort.
	// Only awarded once: retaking the test must not re-add it.
	const diagnosticTestXP = 30
	if !user.HasCompletedInitialTest {
		updates["xp"] = gorm.Expr("xp + ?", diagnosticTestXP)
	}
	if err := database.DB.Model(&models.User{}).Where("id = ?", user.ID).Updates(updates).Error; err != nil {
		return assessmentResult{}, err
	}

	// Update module progress based on level
	var progresses []models.ModuleProgress
	database.DB.Where("user_id = ?", user.ID).Preload("Module").Find(&progresses)

	for _, mp := range progresses {
		unlocked := mp.Unlocked || mp.Completed
		switch result.Level {
		case models.LevelBeginner:
			if mp.Module.OrderIndex == 1 {
				unlocked = true
			}
		case models.LevelIntermediate:
			if mp.Module.OrderIndex <= 2 {
				unlocked = true
			}
		case models.LevelAdvanced:
			unlocked = true
		}
		if unlocked != mp.Unlocked {
			database.DB.Model(&mp).Update("unlocked", unlocked)
		}
	}

	return assessmentResult{
		Score: result.Score, Level: result.Level,
		Rule1: result.Rule1, Rule2: result.Rule2, Rule3: result.Rule3,
		Knowledge: knowledge, Errors: errors, Speed: speed,
	}, nil
}

// POST /api/assessment/submit — diagnostika testi javoblari (faqat o'quvchi)
func SubmitAssessment(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	if role, _ := c.Get("userRole"); role != "Student" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Diagnostikani faqat o'quvchi topshiradi"})
		return
	}

	var req AssessmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Javoblar yuborilmadi"})
		return
	}
	correct, ok := gradeDiagnostic(req.Answers)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Javoblar soni savollar soniga mos emas"})
		return
	}

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Foydalanuvchi topilmadi"})
		return
	}

	total := len(diagnosticQuestions)
	knowledge := float64(correct) / float64(total)
	res, err := applyAssessment(user, knowledge, 1-knowledge, takeDiagnosticSpeed(userID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Natijani saqlashda xato"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"correct": correct, "total": total, "result": res})
}

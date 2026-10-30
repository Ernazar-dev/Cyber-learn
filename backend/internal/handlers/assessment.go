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
	Knowledge float64 `json:"knowledge" binding:"required,min=0,max=1"`
	Errors    float64 `json:"errors" binding:"min=0,max=1"`
	Speed     float64 `json:"speed" binding:"min=0,max=1"`
}

// POST /api/assessment/submit
func SubmitAssessment(c *gin.Context) {
	userID, _ := c.Get("userID")

	var req AssessmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Foydalanuvchi topilmadi"})
		return
	}

	// Load fuzzy weights
	var fw models.FuzzyWeights
	database.DB.First(&fw)

	weights := fuzzy.FuzzyWeightsInput{
		Rule1Weight:           fw.Rule1Weight,
		Rule2Weight:           fw.Rule2Weight,
		Rule3Weight:           fw.Rule3Weight,
		BeginnerThreshold:     fw.BeginnerThreshold,
		IntermediateThreshold: fw.IntermediateThreshold,
	}

	result := fuzzy.Run(req.Knowledge, req.Errors, req.Speed, weights)

	// Update user fields
	updates := map[string]interface{}{
		"diagnostic_score":          req.Knowledge,
		"level":                     result.Level,
		"fuzzy_score":               result.Score,
		"speed":                     req.Speed,
		"errors":                    req.Errors,
		"has_completed_initial_test": true,
		"last_fuzzy_score":          result.Score,
		"last_fuzzy_level":          result.Level,
		"last_fuzzy_rule1":          result.Rule1,
		"last_fuzzy_rule2":          result.Rule2,
		"last_fuzzy_rule3":          result.Rule3,
		"has_fuzzy_result":          true,
	}
	// Diagnostic test gives a flat completion bonus, not a score-based one —
	// otherwise a weaker result would earn less XP for the same effort.
	// Only awarded once: retaking the test must not re-add it.
	const diagnosticTestXP = 30
	if !user.HasCompletedInitialTest {
		updates["xp"] = gorm.Expr("xp + ?", diagnosticTestXP)
	}
	database.DB.Model(&models.User{}).Where("id = ?", userID).Updates(updates)

	// Update module progress based on level
	var progresses []models.ModuleProgress
	database.DB.Where("user_id = ?", userID).Preload("Module").Find(&progresses)

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
		database.DB.Model(&mp).Update("unlocked", unlocked)
	}

	c.JSON(http.StatusOK, gin.H{
		"score": result.Score,
		"level": result.Level,
		"rule1": result.Rule1,
		"rule2": result.Rule2,
		"rule3": result.Rule3,
	})
}

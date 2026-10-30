package handlers

import (
	"net/http"

	"cyberai-backend/internal/database"
	"cyberai-backend/internal/models"

	"github.com/gin-gonic/gin"
)

// GET /api/fuzzy-weights
func GetFuzzyWeights(c *gin.Context) {
	var fw models.FuzzyWeights
	if err := database.DB.First(&fw).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Fuzzy og'irliklari topilmadi"})
		return
	}
	c.JSON(http.StatusOK, fw)
}

type FuzzyWeightsUpdateRequest struct {
	Rule1Weight           *float64 `json:"rule1Weight"`
	Rule2Weight           *float64 `json:"rule2Weight"`
	Rule3Weight           *float64 `json:"rule3Weight"`
	BeginnerThreshold     *float64 `json:"beginnerThreshold"`
	IntermediateThreshold *float64 `json:"intermediateThreshold"`
}

// PUT /api/fuzzy-weights — Teacher only
func UpdateFuzzyWeights(c *gin.Context) {
	var req FuzzyWeightsUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var fw models.FuzzyWeights
	if err := database.DB.First(&fw).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Fuzzy og'irliklari topilmadi"})
		return
	}

	if req.Rule1Weight != nil {
		fw.Rule1Weight = *req.Rule1Weight
	}
	if req.Rule2Weight != nil {
		fw.Rule2Weight = *req.Rule2Weight
	}
	if req.Rule3Weight != nil {
		fw.Rule3Weight = *req.Rule3Weight
	}
	if req.BeginnerThreshold != nil {
		fw.BeginnerThreshold = *req.BeginnerThreshold
	}
	if req.IntermediateThreshold != nil {
		fw.IntermediateThreshold = *req.IntermediateThreshold
	}

	database.DB.Save(&fw)
	c.JSON(http.StatusOK, fw)
}

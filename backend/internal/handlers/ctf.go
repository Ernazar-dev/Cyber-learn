package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"cyberai-backend/internal/database"
	"cyberai-backend/internal/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type CTFChallengeResponse struct {
	ID          uint                 `json:"id"`
	ModuleID    uint                 `json:"moduleId"`
	ModuleTitle string               `json:"moduleTitle,omitempty"`
	Title       string               `json:"title"`
	Description string               `json:"description"`
	Difficulty  models.CTFDifficulty `json:"difficulty"`
	Points      int                  `json:"points"`
	Hint        string               `json:"hint"`
	Solved      bool                 `json:"solved"`
}

// GET /api/ctf — all CTF challenges the current user can see, across every
// module. Students only see challenges from modules they've unlocked;
// teachers see everything.
func GetAllCTFChallenges(c *gin.Context) {
	userID, _ := c.Get("userID")
	role, _ := c.Get("userRole")

	query := database.DB.Order("module_id asc, id asc")

	if role == "Student" {
		var progresses []models.ModuleProgress
		database.DB.Where("user_id = ? AND unlocked = ?", userID, true).Find(&progresses)
		if len(progresses) == 0 {
			c.JSON(http.StatusOK, []CTFChallengeResponse{})
			return
		}
		unlockedModuleIDs := make([]uint, 0, len(progresses))
		for _, p := range progresses {
			unlockedModuleIDs = append(unlockedModuleIDs, p.ModuleID)
		}
		query = query.Where("module_id IN ?", unlockedModuleIDs)
	}

	var challenges []models.CTFChallenge
	query.Find(&challenges)

	var modules []models.Module
	database.DB.Find(&modules)
	moduleTitles := make(map[uint]string, len(modules))
	for _, m := range modules {
		moduleTitles[m.ID] = m.Title
	}

	solvedIDs := map[uint]bool{}
	if role == "Student" {
		var solves []models.CTFSolve
		database.DB.Where("user_id = ?", userID).Find(&solves)
		for _, s := range solves {
			solvedIDs[s.ChallengeID] = true
		}
	}

	result := make([]CTFChallengeResponse, 0, len(challenges))
	for _, ch := range challenges {
		result = append(result, CTFChallengeResponse{
			ID:          ch.ID,
			ModuleID:    ch.ModuleID,
			ModuleTitle: moduleTitles[ch.ModuleID],
			Title:       ch.Title,
			Description: ch.Description,
			Difficulty:  ch.Difficulty,
			Points:      ch.Points,
			Hint:        ch.Hint,
			Solved:      solvedIDs[ch.ID],
		})
	}

	c.JSON(http.StatusOK, result)
}

// GET /api/modules/:id/ctf — CTF challenges for a module; flags are never sent to the client
func GetModuleCTFChallenges(c *gin.Context) {
	moduleID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Noto'g'ri modul ID"})
		return
	}

	userID, _ := c.Get("userID")
	role, _ := c.Get("userRole")

	if role == "Student" {
		var mp models.ModuleProgress
		if err := database.DB.Where("user_id = ? AND module_id = ?", userID, moduleID).First(&mp).Error; err != nil || !mp.Unlocked {
			c.JSON(http.StatusForbidden, gin.H{"error": "Bu modul hali ochilmagan"})
			return
		}
	}

	var challenges []models.CTFChallenge
	database.DB.Where("module_id = ?", moduleID).Order("id asc").Find(&challenges)

	solvedIDs := map[uint]bool{}
	if role == "Student" {
		var solves []models.CTFSolve
		database.DB.Where("user_id = ?", userID).Find(&solves)
		for _, s := range solves {
			solvedIDs[s.ChallengeID] = true
		}
	}

	result := make([]CTFChallengeResponse, 0, len(challenges))
	for _, ch := range challenges {
		result = append(result, CTFChallengeResponse{
			ID:          ch.ID,
			ModuleID:    ch.ModuleID,
			Title:       ch.Title,
			Description: ch.Description,
			Difficulty:  ch.Difficulty,
			Points:      ch.Points,
			Hint:        ch.Hint,
			Solved:      solvedIDs[ch.ID],
		})
	}

	c.JSON(http.StatusOK, result)
}

type CreateCTFChallengeRequest struct {
	ModuleID    uint   `json:"moduleId" binding:"required"`
	Title       string `json:"title" binding:"required"`
	Description string `json:"description"`
	Difficulty  string `json:"difficulty"`
	Points      int    `json:"points"`
	Hint        string `json:"hint"`
	Flag        string `json:"flag" binding:"required"`
}

// POST /api/ctf — Teacher creates a new CTF challenge for a module
func CreateCTFChallenge(c *gin.Context) {
	var req CreateCTFChallengeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Sarlavha, modul va flag kiritilishi shart"})
		return
	}

	var module models.Module
	if err := database.DB.First(&module, req.ModuleID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Modul topilmadi"})
		return
	}

	difficulty := models.CTFDifficulty(req.Difficulty)
	if difficulty != models.CTFDifficultyEasy && difficulty != models.CTFDifficultyMedium && difficulty != models.CTFDifficultyHard {
		difficulty = models.CTFDifficultyEasy
	}

	points := req.Points
	if points <= 0 {
		points = 50
	}

	normalizedFlag := strings.ToLower(strings.TrimSpace(req.Flag))
	if normalizedFlag == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Flag bo'sh bo'lishi mumkin emas"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(normalizedFlag), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Flag hash qilishda xato"})
		return
	}

	challenge := models.CTFChallenge{
		ModuleID:    req.ModuleID,
		Title:       req.Title,
		Description: req.Description,
		Difficulty:  difficulty,
		Points:      points,
		Hint:        req.Hint,
		FlagHash:    string(hash),
	}

	if err := database.DB.Create(&challenge).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Challenge yaratishda xato"})
		return
	}

	c.JSON(http.StatusCreated, CTFChallengeResponse{
		ID:          challenge.ID,
		ModuleID:    challenge.ModuleID,
		ModuleTitle: module.Title,
		Title:       challenge.Title,
		Description: challenge.Description,
		Difficulty:  challenge.Difficulty,
		Points:      challenge.Points,
		Hint:        challenge.Hint,
		Solved:      false,
	})
}

// DELETE /api/ctf/:id — Teacher deletes a CTF challenge and its solve records
func DeleteCTFChallenge(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Noto'g'ri ID"})
		return
	}

	var challenge models.CTFChallenge
	if err := database.DB.First(&challenge, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Challenge topilmadi"})
		return
	}

	database.DB.Where("challenge_id = ?", id).Delete(&models.CTFSolve{})
	database.DB.Delete(&challenge)

	c.JSON(http.StatusOK, gin.H{"message": "Challenge o'chirildi"})
}

type SubmitFlagRequest struct {
	Flag string `json:"flag" binding:"required"`
}

// POST /api/ctf/:id/submit — Student submits a flag guess
func SubmitCTFFlag(c *gin.Context) {
	challengeID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Noto'g'ri ID"})
		return
	}

	role, _ := c.Get("userRole")
	if role != "Student" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Faqat o'quvchilar flag yubora oladi"})
		return
	}

	var req SubmitFlagRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Flag kiritilishi shart"})
		return
	}

	var challenge models.CTFChallenge
	if err := database.DB.First(&challenge, challengeID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Challenge topilmadi"})
		return
	}

	userIDVal, _ := c.Get("userID")
	userID := userIDVal.(uint)

	var existing models.CTFSolve
	if database.DB.Where("user_id = ? AND challenge_id = ?", userID, challengeID).First(&existing).Error == nil {
		c.JSON(http.StatusOK, gin.H{"correct": true, "alreadySolved": true, "message": "Siz bu challenge'ni allaqachon yechgansiz"})
		return
	}

	normalized := strings.ToLower(strings.TrimSpace(req.Flag))
	if err := bcrypt.CompareHashAndPassword([]byte(challenge.FlagHash), []byte(normalized)); err != nil {
		c.JSON(http.StatusOK, gin.H{"correct": false, "message": "Flag noto'g'ri. Qayta urinib ko'ring."})
		return
	}

	database.DB.Create(&models.CTFSolve{UserID: userID, ChallengeID: uint(challengeID), SolvedAt: time.Now()})
	database.DB.Model(&models.User{}).Where("id = ?", userID).
		Update("xp", gorm.Expr("xp + ?", challenge.Points))

	c.JSON(http.StatusOK, gin.H{
		"correct":       true,
		"alreadySolved": false,
		"message":       "To'g'ri! Flag qabul qilindi.",
		"pointsAwarded": challenge.Points,
	})
}

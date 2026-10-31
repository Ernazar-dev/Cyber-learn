package handlers

import (
	"math"
	"net/http"
	"strconv"
	"sync"
	"time"

	"cyberai-backend/internal/database"
	"cyberai-backend/internal/fuzzy"
	"cyberai-backend/internal/models"

	"github.com/gin-gonic/gin"
)

// Fuzzy o'zlashtirish bahosi (успеваемость) uchun yordamchilar. % baho o'zgarmaydi —
// bu yerdagi baho uning yonida hisoblanadi (qarang: fuzzy.EvaluatePerformance).

// assignmentSecondsPerQuestion — tezlik me'yori (frontend AssignmentPanel bilan bir xil)
const assignmentSecondsPerQuestion = 60

type attemptKey struct{ userID, assignmentID uint }

// Topshiriq boshlangan vaqt — tezlik brauzer aytgan raqamdan emas, shundan hisoblanadi.
var (
	assignmentStartsMu sync.Mutex
	assignmentStarts   = map[attemptKey]time.Time{}
)

// POST /api/assignments/:id/start — o'quvchi savollarni yechishni boshlaganda
func StartAssignment(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Noto'g'ri ID"})
		return
	}
	userID := c.MustGet("userID").(uint)

	var assignment models.Assignment
	if err := database.DB.Select("id", "student_id").First(&assignment, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Topshiriq topilmadi"})
		return
	}
	if assignment.StudentID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Bu topshiriq sizga tegishli emas"})
		return
	}

	now := time.Now()
	assignmentStartsMu.Lock()
	// Xotira o'smasin: eskirgan (tugatilmagan) urinishlarni tozalash
	if len(assignmentStarts) > 10000 {
		for k, t := range assignmentStarts {
			if now.Sub(t) > 6*time.Hour {
				delete(assignmentStarts, k)
			}
		}
	}
	assignmentStarts[attemptKey{userID, assignment.ID}] = now
	assignmentStartsMu.Unlock()
	c.JSON(http.StatusOK, gin.H{"started": true})
}

// takeAssignmentSpeed boshlanish yozuvini o'chiradi va tezlikni (0..1) qaytaradi:
// 1 — darhol, 0 — me'yoriy vaqt (savol soni × 60s) yoki undan ko'p ketdi.
// Boshlanish qayd etilmagan bo'lsa (masalan, server qayta ishga tushgan) ok=false.
func takeAssignmentSpeed(userID, assignmentID uint, questions int) (speed float64, ok bool) {
	key := attemptKey{userID, assignmentID}
	assignmentStartsMu.Lock()
	start, ok := assignmentStarts[key]
	delete(assignmentStarts, key)
	assignmentStartsMu.Unlock()
	if !ok || questions == 0 {
		return 0, false
	}
	limit := float64(questions * assignmentSecondsPerQuestion)
	return math.Max(0, math.Min(1, 1-time.Since(start).Seconds()/limit)), true
}

func loadFuzzyWeights() fuzzy.FuzzyWeightsInput {
	var fw models.FuzzyWeights
	database.DB.First(&fw)
	return fuzzy.FuzzyWeightsInput{
		Rule1Weight:           fw.Rule1Weight,
		Rule2Weight:           fw.Rule2Weight,
		Rule3Weight:           fw.Rule3Weight,
		BeginnerThreshold:     fw.BeginnerThreshold,
		IntermediateThreshold: fw.IntermediateThreshold,
	}
}

// updateModuleFuzzy modulning fuzzy bahosini qayta hisoblaydi: o'quvchi yechib ko'rgan
// savolli topshiriqlar fuzzy baholarining o'rtachasi. Hech biri yechilmagan bo'lsa — o'zgarmaydi.
func updateModuleFuzzy(userID, moduleID uint) (score float64, ok bool) {
	var tasks []models.Assignment
	database.DB.Select("fuzzy_score").
		Where("student_id = ? AND target_module_id = ? AND attempts > 0", userID, moduleID).
		Find(&tasks)
	if len(tasks) == 0 {
		return 0, false
	}
	for _, t := range tasks {
		score += t.FuzzyScore
	}
	score /= float64(len(tasks))
	database.DB.Model(&models.ModuleProgress{}).
		Where("user_id = ? AND module_id = ?", userID, moduleID).
		Updates(map[string]interface{}{"fuzzy_score": score, "has_fuzzy": true})
	return score, true
}

// FinalFuzzyResult — o'quvchining yakuniy fuzzy bahosi (готов / частично / не готов)
type FinalFuzzyResult struct {
	Score     float64         `json:"score"`
	Readiness fuzzy.Readiness `json:"readiness"`
	Modules   int             `json:"modules,omitempty"` // nechta modul baholangan
}

// finalFuzzy fuzzy bahosi bor modullar o'rtachasidan yakuniy bahoni chiqaradi
func finalFuzzy(progresses []models.ModuleProgress, w fuzzy.FuzzyWeightsInput) *FinalFuzzyResult {
	sum, n := 0.0, 0
	for _, mp := range progresses {
		if mp.HasFuzzy {
			sum += mp.FuzzyScore
			n++
		}
	}
	if n == 0 {
		return nil
	}
	score := sum / float64(n)
	return &FinalFuzzyResult{Score: score, Readiness: fuzzy.ReadinessOf(score, w), Modules: n}
}

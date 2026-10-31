package handlers

import (
	"net/http"
	"sort"
	"strconv"

	"cyberai-backend/internal/database"
	"cyberai-backend/internal/fuzzy"
	"cyberai-backend/internal/middleware"
	"cyberai-backend/internal/models"

	"github.com/gin-gonic/gin"
)

type StudentResponse struct {
	ID                      uint                     `json:"id"`
	Name                    string                   `json:"name"`
	Username                string                   `json:"username"`
	HasPassword             bool                     `json:"hasPassword"`
	Age                     int                      `json:"age"`
	Role                    models.Role              `json:"role"`
	DiagnosticScore         float64                  `json:"diagnosticScore"`
	Level                   models.Level             `json:"level"`
	FuzzyScore              float64                  `json:"fuzzyScore"`
	XP                      int                      `json:"xp"`
	CompletedModulesCount   int                      `json:"completedModulesCount"`
	Speed                   float64                  `json:"speed"`
	Errors                  float64                  `json:"errors"`
	HasCompletedInitialTest bool                     `json:"hasCompletedInitialTest"`
	HasFuzzyResult          bool                     `json:"hasFuzzyResult"`
	LastFuzzyResult         *FuzzyResultPublic       `json:"lastFuzzyResult"`
	ModuleProgress          []ModuleProgressResponse `json:"moduleProgress"`
	// FinalFuzzy — yakuniy fuzzy baho (готов / частично / не готов); hech bir modul baholanmagan bo'lsa null
	FinalFuzzy *FinalFuzzyResult `json:"finalFuzzy"`
}

type ModuleProgressResponse struct {
	ID        uint    `json:"id"`
	Title     string  `json:"title"`
	Unlocked  bool    `json:"unlocked"`
	Completed bool    `json:"completed"`
	Score     float64 `json:"score"`
	// Fuzzy o'zlashtirish bahosi (% bilan yonma-yon); HasFuzzy=false — hali yechilmagan
	FuzzyScore float64         `json:"fuzzyScore"`
	HasFuzzy   bool            `json:"hasFuzzy"`
	Readiness  fuzzy.Readiness `json:"readiness,omitempty"`
}

func moduleProgressResponse(mp models.ModuleProgress, w fuzzy.FuzzyWeightsInput) ModuleProgressResponse {
	r := ModuleProgressResponse{
		ID:         mp.ModuleID,
		Title:      mp.Module.Title,
		Unlocked:   mp.Unlocked,
		Completed:  mp.Completed,
		Score:      mp.Score,
		FuzzyScore: mp.FuzzyScore,
		HasFuzzy:   mp.HasFuzzy,
	}
	if mp.HasFuzzy {
		r.Readiness = fuzzy.ReadinessOf(mp.FuzzyScore, w)
	}
	return r
}

func buildStudentResponse(u models.User, w fuzzy.FuzzyWeightsInput) StudentResponse {
	resp := StudentResponse{
		ID:                      u.ID,
		Name:                    u.Name,
		Username:                usernameOf(u),
		HasPassword:             u.Password != "",
		Age:                     u.Age,
		Role:                    u.Role,
		DiagnosticScore:         u.DiagnosticScore,
		Level:                   u.Level,
		FuzzyScore:              u.FuzzyScore,
		XP:                      u.XP,
		CompletedModulesCount:   u.CompletedModulesCount,
		Speed:                   u.Speed,
		Errors:                  u.Errors,
		HasCompletedInitialTest: u.HasCompletedInitialTest,
		HasFuzzyResult:          u.HasFuzzyResult,
	}
	if u.HasFuzzyResult {
		resp.LastFuzzyResult = &FuzzyResultPublic{
			Score: u.LastFuzzyScore,
			Level: u.LastFuzzyLevel,
			Rule1: u.LastFuzzyRule1,
			Rule2: u.LastFuzzyRule2,
			Rule3: u.LastFuzzyRule3,
		}
	}
	// Build module progress — always in module order, regardless of the
	// order GORM's preload happened to return rows in.
	progresses := make([]models.ModuleProgress, len(u.ModuleProgresses))
	copy(progresses, u.ModuleProgresses)
	sort.Slice(progresses, func(i, j int) bool { return progresses[i].ModuleID < progresses[j].ModuleID })

	for _, mp := range progresses {
		resp.ModuleProgress = append(resp.ModuleProgress, moduleProgressResponse(mp, w))
	}
	resp.FinalFuzzy = finalFuzzy(progresses, w)
	return resp
}

// GET /api/students — Teacher only
func GetStudents(c *gin.Context) {
	var users []models.User
	database.DB.
		Where("role = ?", models.RoleStudent).
		Preload("ModuleProgresses.Module").
		Find(&users)

	w := loadFuzzyWeights()
	var result []StudentResponse
	for _, u := range users {
		result = append(result, buildStudentResponse(u, w))
	}
	if result == nil {
		result = []StudentResponse{}
	}
	c.JSON(http.StatusOK, result)
}

// GET /api/students/:id
func GetStudent(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Noto'g'ri ID"})
		return
	}

	// Students can only view their own profile; teachers can view any
	userID, _ := c.Get("userID")
	role, _ := c.Get("userRole")
	if role != "Teacher" && userID.(uint) != uint(id) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Ruxsat yo'q"})
		return
	}

	var user models.User
	if err := database.DB.
		Where("role = ?", models.RoleStudent).
		Preload("ModuleProgresses.Module").
		First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "O'quvchi topilmadi"})
		return
	}

	c.JSON(http.StatusOK, buildStudentResponse(user, loadFuzzyWeights()))
}

// GET /api/students/me/progress — current student's module progress
func GetMyProgress(c *gin.Context) {
	userID, _ := c.Get("userID")

	var progresses []models.ModuleProgress
	database.DB.Where("user_id = ?", userID).Preload("Module").Order("module_id asc").Find(&progresses)

	w := loadFuzzyWeights()
	var result []ModuleProgressResponse
	for _, mp := range progresses {
		result = append(result, moduleProgressResponse(mp, w))
	}
	if result == nil {
		result = []ModuleProgressResponse{}
	}
	c.JSON(http.StatusOK, result)
}

// DELETE /api/students/:id — Teacher only; removes student and all related data
func DeleteStudent(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Noto'g'ri ID"})
		return
	}

	// Make sure target is actually a student
	var user models.User
	if err := database.DB.Where("role = ? AND id = ?", models.RoleStudent, id).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "O'quvchi topilmadi"})
		return
	}

	// Cascade-delete related rows first (GORM soft-delete won't cascade automatically)
	database.DB.Where("user_id = ?", id).Delete(&models.ModuleProgress{})
	database.DB.Where("student_id = ?", id).Delete(&models.Assignment{})
	database.DB.Where("user_id = ?", id).Delete(&models.CTFSolve{})
	database.DB.Where("user_id = ?", id).Delete(&models.Certificate{})
	database.DB.Where("user_id = ?", id).Delete(&models.LessonRead{})

	// Delete the user itself
	if err := database.DB.Delete(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "O'quvchini o'chirishda xatolik"})
		return
	}
	// O'chirilgan o'quvchining tokeni darhol ishlamay qolsin
	middleware.ForgetUser(user.ID)

	c.JSON(http.StatusOK, gin.H{"message": "O'quvchi muvaffaqiyatli o'chirildi"})
}

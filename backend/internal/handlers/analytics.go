package handlers

import (
	"net/http"

	"cyberai-backend/internal/database"
	"cyberai-backend/internal/models"

	"github.com/gin-gonic/gin"
)

type StudentSummary struct {
	ID                      uint         `json:"id"`
	Name                    string       `json:"name"`
	Age                     int          `json:"age"`
	Level                   models.Level `json:"level"`
	FuzzyScore              float64      `json:"fuzzyScore"`
	DiagnosticScore         float64      `json:"diagnosticScore"`
	CompletedModulesCount   int          `json:"completedModulesCount"`
	HasCompletedInitialTest bool         `json:"hasCompletedInitialTest"`
	Speed                   float64      `json:"speed"`
	Errors                  float64      `json:"errors"`
}

type TeacherAnalytics struct {
	TotalStudents        int              `json:"totalStudents"`
	AverageFuzzyScore    float64          `json:"averageFuzzyScore"`
	TotalAssignments     int64            `json:"totalAssignments"`
	CompletedAssignments int64            `json:"completedAssignments"`
	Students             []StudentSummary `json:"students"`
	LevelDistribution    map[string]int   `json:"levelDistribution"`
}

type StudentAnalytics struct {
	FuzzyScore      float64                  `json:"fuzzyScore"`
	DiagnosticScore float64                  `json:"diagnosticScore"`
	Level           models.Level             `json:"level"`
	Speed           float64                  `json:"speed"`
	Errors          float64                  `json:"errors"`
	LastFuzzyResult *FuzzyResultPublic       `json:"lastFuzzyResult"`
	ModuleProgress  []ModuleProgressResponse `json:"moduleProgress"`
	MyAssignments   []AssignmentResponse     `json:"myAssignments"`
}

func GetAnalytics(c *gin.Context) {
	userID, _ := c.Get("userID")
	role, _ := c.Get("userRole")

	if role == "Teacher" {
		getTeacherAnalytics(c)
	} else {
		getStudentAnalytics(c, userID.(uint))
	}
}

func getTeacherAnalytics(c *gin.Context) {
	var students []models.User
	database.DB.Where("role = ?", models.RoleStudent).Find(&students)

	var totalAssignments, completedAssignments int64
	database.DB.Model(&models.Assignment{}).Count(&totalAssignments)
	database.DB.Model(&models.Assignment{}).Where("completed = ?", true).Count(&completedAssignments)

	levelDist := map[string]int{
		"Beginner":     0,
		"Intermediate": 0,
		"Advanced":     0,
	}

	var totalScore float64
	var summaries []StudentSummary
	for _, s := range students {
		totalScore += s.FuzzyScore
		levelDist[string(s.Level)]++
		summaries = append(summaries, StudentSummary{
			ID:                      s.ID,
			Name:                    s.Name,
			Age:                     s.Age,
			Level:                   s.Level,
			FuzzyScore:              s.FuzzyScore,
			DiagnosticScore:         s.DiagnosticScore,
			CompletedModulesCount:   s.CompletedModulesCount,
			HasCompletedInitialTest: s.HasCompletedInitialTest,
			Speed:                   s.Speed,
			Errors:                  s.Errors,
		})
	}

	avgScore := 0.0
	if len(students) > 0 {
		avgScore = totalScore / float64(len(students))
	}
	if summaries == nil {
		summaries = []StudentSummary{}
	}

	c.JSON(http.StatusOK, TeacherAnalytics{
		TotalStudents:        len(students),
		AverageFuzzyScore:    avgScore,
		TotalAssignments:     totalAssignments,
		CompletedAssignments: completedAssignments,
		Students:             summaries,
		LevelDistribution:    levelDist,
	})
}

func getStudentAnalytics(c *gin.Context, userID uint) {
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Foydalanuvchi topilmadi"})
		return
	}

	var progresses []models.ModuleProgress
	database.DB.Where("user_id = ?", userID).Preload("Module").Order("module_id asc").Find(&progresses)
	var mpResp []ModuleProgressResponse
	for _, mp := range progresses {
		mpResp = append(mpResp, ModuleProgressResponse{
			ID:        mp.ModuleID,
			Title:     mp.Module.Title,
			Unlocked:  mp.Unlocked,
			Completed: mp.Completed,
			Score:     mp.Score,
		})
	}
	if mpResp == nil {
		mpResp = []ModuleProgressResponse{}
	}

	var assignments []models.Assignment
	database.DB.Where("student_id = ?", userID).Preload("Questions", preloadQuestions).Order("created_at desc").Find(&assignments)
	var assignResp []AssignmentResponse
	for _, a := range assignments {
		assignResp = append(assignResp, buildAssignmentResponse(a, false))
	}
	if assignResp == nil {
		assignResp = []AssignmentResponse{}
	}

	resp := StudentAnalytics{
		FuzzyScore:      user.FuzzyScore,
		DiagnosticScore: user.DiagnosticScore,
		Level:           user.Level,
		Speed:           user.Speed,
		Errors:          user.Errors,
		ModuleProgress:  mpResp,
		MyAssignments:   assignResp,
	}
	if user.HasFuzzyResult {
		resp.LastFuzzyResult = &FuzzyResultPublic{
			Score: user.LastFuzzyScore,
			Level: user.LastFuzzyLevel,
			Rule1: user.LastFuzzyRule1,
			Rule2: user.LastFuzzyRule2,
			Rule3: user.LastFuzzyRule3,
		}
	}

	c.JSON(http.StatusOK, resp)
}

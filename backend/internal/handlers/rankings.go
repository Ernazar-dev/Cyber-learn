package handlers

import (
	"net/http"
	"strconv"

	"cyberai-backend/internal/database"
	"cyberai-backend/internal/models"

	"github.com/gin-gonic/gin"
)

type RankingEntry struct {
	Rank           int          `json:"rank"`
	UserID         uint         `json:"userId"`
	Name           string       `json:"name"`
	Avatar         string       `json:"avatar"`
	XP             int          `json:"xp"`
	Level          models.Level `json:"level"`
	TotalScore     int          `json:"totalScore"`
	CompletedTasks int          `json:"completedTasks"`
}

// GET /api/rankings — public leaderboard, ordered by XP desc
func GetRankings(c *gin.Context) {
	limit := 500
	if v := c.Query("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			limit = n
		}
	}

	var users []models.User
	database.DB.
		Where("role = ?", models.RoleStudent).
		Order("xp desc").
		Limit(limit).
		Find(&users)

	// Completed tasks = modules + completed assignments + lessons read,
	// so the count reflects every action that actually earns XP.
	var assignmentCounts []struct {
		StudentID uint
		Cnt       int64
	}
	database.DB.Model(&models.Assignment{}).
		Select("student_id, count(*) as cnt").
		Where("completed = ?", true).
		Group("student_id").
		Scan(&assignmentCounts)
	assignmentsByUser := make(map[uint]int64, len(assignmentCounts))
	for _, a := range assignmentCounts {
		assignmentsByUser[a.StudentID] = a.Cnt
	}

	var lessonCounts []struct {
		UserID uint
		Cnt    int64
	}
	database.DB.Model(&models.LessonRead{}).
		Select("user_id, count(*) as cnt").
		Group("user_id").
		Scan(&lessonCounts)
	lessonsByUser := make(map[uint]int64, len(lessonCounts))
	for _, l := range lessonCounts {
		lessonsByUser[l.UserID] = l.Cnt
	}

	result := make([]RankingEntry, 0, len(users))
	for i, u := range users {
		completedTasks := u.CompletedModulesCount + int(assignmentsByUser[u.ID]) + int(lessonsByUser[u.ID])
		result = append(result, RankingEntry{
			Rank:           i + 1,
			UserID:         u.ID,
			Name:           u.Name,
			Avatar:         u.Avatar,
			XP:             u.XP,
			Level:          u.Level,
			TotalScore:     u.XP,
			CompletedTasks: completedTasks,
		})
	}

	c.JSON(http.StatusOK, result)
}

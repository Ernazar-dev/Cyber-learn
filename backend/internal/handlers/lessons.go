package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"cyberai-backend/internal/database"
	"cyberai-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type LessonRequest struct {
	Title       string   `json:"title" binding:"required,min=2"`
	Description string   `json:"description"`
	Content     string   `json:"content"`
	Category    string   `json:"category"`
	Difficulty  string   `json:"difficulty"`
	LessonType  string   `json:"lessonType"`
	VideoURL    string   `json:"videoUrl"`
	Tags        []string `json:"tags"`
	FileURL     string   `json:"fileUrl"`
	FileName    string   `json:"fileName"`
	FileSize    int64    `json:"fileSize"`
}

type LessonResponse struct {
	ID             uint       `json:"id"`
	Title          string     `json:"title"`
	Description    string     `json:"description"`
	Content        string     `json:"content"`
	Category       string     `json:"category"`
	Difficulty     string     `json:"difficulty"`
	LessonType     string     `json:"lessonType"`
	VideoURL       string     `json:"videoUrl"`
	Tags           []string   `json:"tags"`
	CreatedAt      time.Time  `json:"createdAt"`
	ReadByStudents []uint     `json:"readByStudents"`
	IsRead         bool       `json:"isRead"`
	FileURL        string     `json:"fileUrl,omitempty"`
	FileName       string     `json:"fileName,omitempty"`
	FileSize       int64      `json:"fileSize,omitempty"`
}

func buildLessonResponse(l models.Lesson, currentUserID uint) LessonResponse {
	var tags []string
	if l.Tags != "" {
		_ = json.Unmarshal([]byte(l.Tags), &tags)
	}
	if tags == nil {
		tags = []string{}
	}

	var readBy []uint
	isRead := false
	for _, u := range l.ReadByStudents {
		readBy = append(readBy, u.ID)
		if u.ID == currentUserID {
			isRead = true
		}
	}
	if readBy == nil {
		readBy = []uint{}
	}

	lessonType := string(l.LessonType)
	if lessonType == "" {
		lessonType = "Nazariy"
	}

	return LessonResponse{
		ID:             l.ID,
		Title:          l.Title,
		Description:    l.Description,
		Content:        l.Content,
		Category:       l.Category,
		Difficulty:     string(l.Difficulty),
		LessonType:     lessonType,
		VideoURL:       l.VideoURL,
		Tags:           tags,
		CreatedAt:      l.CreatedAt,
		ReadByStudents: readBy,
		IsRead:         isRead,
		FileURL:        l.FileURL,
		FileName:       l.FileName,
		FileSize:       l.FileSize,
	}
}

// GET /api/lessons
func GetLessons(c *gin.Context) {
	userID, _ := c.Get("userID")

	var lessons []models.Lesson
	database.DB.Preload("ReadByStudents").Order("created_at desc").Find(&lessons)

	var result []LessonResponse
	for _, l := range lessons {
		result = append(result, buildLessonResponse(l, userID.(uint)))
	}
	if result == nil {
		result = []LessonResponse{}
	}
	c.JSON(http.StatusOK, result)
}

// POST /api/lessons — Teacher only
func CreateLesson(c *gin.Context) {
	var req LessonRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tagsJSON, _ := json.Marshal(req.Tags)

	lessonType := models.LessonType(req.LessonType)
	if lessonType == "" {
		lessonType = models.LessonTypeNazariy
	}

	lesson := models.Lesson{
		Title:       req.Title,
		Description: req.Description,
		Content:     req.Content,
		Category:    req.Category,
		Difficulty:  models.Difficulty(req.Difficulty),
		LessonType:  lessonType,
		VideoURL:    req.VideoURL,
		Tags:        string(tagsJSON),
		FileURL:     req.FileURL,
		FileName:    req.FileName,
		FileSize:    req.FileSize,
	}

	if err := database.DB.Create(&lesson).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Dars yaratishda xato"})
		return
	}

	database.DB.Preload("ReadByStudents").First(&lesson, lesson.ID)
	userID, _ := c.Get("userID")
	c.JSON(http.StatusCreated, buildLessonResponse(lesson, userID.(uint)))
}

// DELETE /api/lessons/:id — Teacher only
func DeleteLesson(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Noto'g'ri ID"})
		return
	}

	var lesson models.Lesson
	if err := database.DB.First(&lesson, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Dars topilmadi"})
		return
	}

	// Delete lesson reads
	database.DB.Where("lesson_id = ?", id).Delete(&models.LessonRead{})
	// Delete associations
	database.DB.Model(&lesson).Association("ReadByStudents").Clear()
	database.DB.Delete(&lesson)

	c.JSON(http.StatusOK, gin.H{"message": "Dars o'chirildi"})
}

// lessonReadXP scales the reward with how hard the lesson's material is.
func lessonReadXP(d models.Difficulty) int {
	switch d {
	case models.DifficultyIntermediate:
		return 20
	case models.DifficultyAdvanced:
		return 30
	default:
		return 10
	}
}

// POST /api/lessons/:id/read — Student marks lesson as read
func MarkLessonRead(c *gin.Context) {
	idStr := c.Param("id")
	lessonID, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Noto'g'ri ID"})
		return
	}

	userID, _ := c.Get("userID")

	var lesson models.Lesson
	if err := database.DB.First(&lesson, lessonID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Dars topilmadi"})
		return
	}

	// Check if already read
	var read models.LessonRead
	result := database.DB.Where("lesson_id = ? AND user_id = ?", lessonID, userID).First(&read)
	if result.Error == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Dars allaqachon o'qilgan"})
		return
	}

	lr := models.LessonRead{
		LessonID: uint(lessonID),
		UserID:   userID.(uint),
		ReadAt:   time.Now(),
	}
	database.DB.Create(&lr)
	database.DB.Model(&models.User{}).Where("id = ?", userID).
		Update("xp", gorm.Expr("xp + ?", lessonReadXP(lesson.Difficulty)))

	c.JSON(http.StatusOK, gin.H{"message": "Dars o'qilgan deb belgilandi"})
}

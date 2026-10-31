package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"cyberai-backend/internal/database"
	"cyberai-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AssignmentQuestionRequest struct {
	Question      string   `json:"question" binding:"required"`
	Options       []string `json:"options" binding:"required,min=2"`
	CorrectAnswer int      `json:"correctAnswer"`
}

type AssignmentRequest struct {
	Title          string                      `json:"title" binding:"required,min=2"`
	Description    string                      `json:"description"`
	StudentID      uint                        `json:"studentId"`
	AllStudents    bool                        `json:"allStudents"`
	TargetModuleID uint                        `json:"targetModuleId" binding:"required"`
	AssignmentType string                      `json:"assignmentType"`
	Questions      []AssignmentQuestionRequest `json:"questions"`
}

type AssignmentQuestionResponse struct {
	ID       uint     `json:"id"`
	Question string   `json:"question"`
	Options  []string `json:"options"`
	// O'quvchiga yuborilmaydi — javoblar CompleteAssignment'da serverda tekshiriladi
	CorrectAnswer *int `json:"correctAnswer,omitempty"`
}

// preloadQuestions savollarni doim bir xil tartibda yuklaydi: o'quvchining
// javoblari (answers[i]) aynan shu tartib bo'yicha tekshiriladi.
func preloadQuestions(db *gorm.DB) *gorm.DB {
	return db.Order("id asc")
}

type AssignmentResponse struct {
	ID             uint                         `json:"id"`
	Title          string                       `json:"title"`
	Description    string                       `json:"description"`
	StudentID      uint                         `json:"studentId"`
	StudentName    string                       `json:"studentName"`
	TargetModuleID uint                         `json:"targetModuleId"`
	AssignmentType string                       `json:"assignmentType"`
	Completed      bool                         `json:"completed"`
	DateAssigned   time.Time                    `json:"dateAssigned"`
	Questions      []AssignmentQuestionResponse `json:"questions"`
}

// withAnswers=false bo'lsa to'g'ri javoblar javobga qo'shilmaydi (o'quvchi uchun).
func buildAssignmentResponse(a models.Assignment, withAnswers bool) AssignmentResponse {
	assignmentType := string(a.AssignmentType)
	if assignmentType == "" {
		assignmentType = "Nazariy"
	}
	resp := AssignmentResponse{
		ID:             a.ID,
		Title:          a.Title,
		Description:    a.Description,
		StudentID:      a.StudentID,
		StudentName:    a.StudentName,
		TargetModuleID: a.TargetModuleID,
		AssignmentType: assignmentType,
		Completed:      a.Completed,
		DateAssigned:   a.DateAssigned,
		Questions:      []AssignmentQuestionResponse{},
	}
	for _, q := range a.Questions {
		var opts []string
		if q.Options != "" {
			_ = json.Unmarshal([]byte(q.Options), &opts)
		}
		if opts == nil {
			opts = []string{}
		}
		qr := AssignmentQuestionResponse{ID: q.ID, Question: q.Question, Options: opts}
		if withAnswers {
			correct := q.CorrectAnswer
			qr.CorrectAnswer = &correct
		}
		resp.Questions = append(resp.Questions, qr)
	}
	return resp
}

// GET /api/assignments
// Teacher: all assignments; Student: own assignments
func GetAssignments(c *gin.Context) {
	userID, _ := c.Get("userID")
	role, _ := c.Get("userRole")

	var assignments []models.Assignment
	query := database.DB.Preload("Questions", preloadQuestions).Order("created_at desc")

	if role == "Student" {
		query = query.Where("student_id = ?", userID)
	}

	query.Find(&assignments)

	var result []AssignmentResponse
	for _, a := range assignments {
		result = append(result, buildAssignmentResponse(a, role == "Teacher"))
	}
	if result == nil {
		result = []AssignmentResponse{}
	}
	c.JSON(http.StatusOK, result)
}

// GET /api/assignments/:id
func GetAssignment(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Noto'g'ri ID"})
		return
	}

	userID, _ := c.Get("userID")
	role, _ := c.Get("userRole")

	var assignment models.Assignment
	if err := database.DB.Preload("Questions", preloadQuestions).First(&assignment, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Topshiriq topilmadi"})
		return
	}

	if role == "Student" && assignment.StudentID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Ruxsat yo'q"})
		return
	}

	c.JSON(http.StatusOK, buildAssignmentResponse(assignment, role == "Teacher"))
}

// POST /api/assignments — Teacher only
func CreateAssignment(c *gin.Context) {
	var req AssignmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Resolve target students: one specific student, or every student.
	var targets []models.User
	if req.AllStudents {
		database.DB.Where("role = ?", models.RoleStudent).Find(&targets)
		if len(targets) == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "O'quvchilar topilmadi"})
			return
		}
	} else {
		if req.StudentID == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "O'quvchi tanlanmagan"})
			return
		}
		var student models.User
		if err := database.DB.Where("id = ? AND role = ?", req.StudentID, models.RoleStudent).First(&student).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "O'quvchi topilmadi"})
			return
		}
		targets = []models.User{student}
	}

	assignmentType := models.AssignmentType(req.AssignmentType)
	if assignmentType == "" {
		assignmentType = models.AssignmentTypeNazariy
	}

	// Rows created for an "all students" assignment share a BatchID so that
	// students who register later can be backfilled with the same assignment
	// (see Register in auth.go).
	var batchID string
	if req.AllStudents {
		batchID = uuid.NewString()
	}

	// Hammasi paketlarda va bitta tranzaksiyada: masofaviy bazada (Neon) har bir
	// alohida INSERT ~0.5–2s oladi, shuning uchun so'rovlar soni minimal bo'lishi kerak.
	now := time.Now()
	rows := make([]models.Assignment, len(targets))
	studentIDs := make([]uint, len(targets))
	for i, student := range targets {
		studentIDs[i] = student.ID
		rows[i] = models.Assignment{
			Title:          req.Title,
			Description:    req.Description,
			StudentID:      student.ID,
			StudentName:    student.Name,
			TargetModuleID: req.TargetModuleID,
			AssignmentType: assignmentType,
			Completed:      false,
			DateAssigned:   now,
			BatchID:        batchID,
		}
	}

	err := database.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Omit("Questions").CreateInBatches(&rows, 200).Error; err != nil {
			return err
		}
		if n := len(req.Questions); n > 0 {
			questions := make([]models.AssignmentQuestion, 0, len(rows)*n)
			for i := range rows {
				for _, qr := range req.Questions {
					optsJSON, _ := json.Marshal(qr.Options)
					questions = append(questions, models.AssignmentQuestion{
						AssignmentID:  rows[i].ID,
						Question:      qr.Question,
						Options:       string(optsJSON),
						CorrectAnswer: qr.CorrectAnswer,
					})
				}
			}
			if err := tx.CreateInBatches(&questions, 500).Error; err != nil {
				return err
			}
			for i := range rows {
				rows[i].Questions = questions[i*n : (i+1)*n]
			}
		}
		// Maqsadli modulni barcha qabul qiluvchilar uchun ochish — bitta UPDATE
		return tx.Model(&models.ModuleProgress{}).
			Where("user_id IN ? AND module_id = ?", studentIDs, req.TargetModuleID).
			Update("unlocked", true).Error
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Topshiriq yaratishda xato"})
		return
	}

	created := make([]AssignmentResponse, 0, len(rows))
	for _, a := range rows {
		created = append(created, buildAssignmentResponse(a, true))
	}

	if req.AllStudents {
		c.JSON(http.StatusCreated, gin.H{"createdCount": len(created), "assignments": created})
		return
	}
	c.JSON(http.StatusCreated, created[0])
}

type CompleteAssignmentRequest struct {
	// Savollar tartibida (id asc) tanlangan variant indekslari; javobsiz savol uchun -1
	Answers []int `json:"answers"`
}

// POST /api/assignments/:id/complete
// O'quvchi: savollari bor topshiriqda javoblar shu yerda tekshiriladi va natija
// modulePassingScore'dan past bo'lsa topshiriq bajarilmagan bo'lib qoladi.
// Bajarilgan topshiriqni qayta yechish mumkin — natija qaytadi, XP qayta berilmaydi.
// O'qituvchi: javobsiz, to'g'ridan-to'g'ri bajarildi deb belgilaydi (masalan, offline ishni ko'rib chiqqach).
func CompleteAssignment(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Noto'g'ri ID"})
		return
	}

	userID, _ := c.Get("userID")
	role, _ := c.Get("userRole")
	isTeacher := role == "Teacher"

	var assignment models.Assignment
	if err := database.DB.Preload("Questions", preloadQuestions).First(&assignment, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Topshiriq topilmadi"})
		return
	}

	if !isTeacher && assignment.StudentID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Bu topshiriq sizga tegishli emas"})
		return
	}

	var req CompleteAssignmentRequest
	// Savolsiz topshiriq va o'qituvchi uchun tana bo'sh bo'lishi mumkin
	_ = c.ShouldBindJSON(&req)

	total := len(assignment.Questions)
	correct := 0
	passed := true
	var assessment *assessmentResult
	if !isTeacher && total > 0 {
		if len(req.Answers) != total {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Javoblar soni savollar soniga mos emas"})
			return
		}
		for i, q := range assignment.Questions {
			if req.Answers[i] == q.CorrectAnswer {
				correct++
			}
		}
		score := float64(correct) / float64(total)
		passed = score >= modulePassingScore
		// Tayyorgarlik darajasi (fuzzy) server baholagan natijadan yangilanadi. Tezlikni
		// brauzer o'lchaydi va unga ishonib bo'lmaydi — diagnostikadagi tezlik saqlanadi.
		var student models.User
		if err := database.DB.First(&student, assignment.StudentID).Error; err == nil {
			if res, err := applyAssessment(student, score, 1-score, student.Speed); err == nil {
				assessment = &res
			}
		}
		// Eng yaxshi natija saqlanadi — modul balli shulardan hisoblanadi
		if score > assignment.Score {
			database.DB.Model(&models.Assignment{}).Where("id = ?", assignment.ID).Update("score", score)
		}
	}

	if passed && !assignment.Completed {
		// Shartli UPDATE: parallel so'rovlarda XP faqat bir marta beriladi
		res := database.DB.Model(&models.Assignment{}).
			Where("id = ? AND completed = ?", assignment.ID, false).
			Update("completed", true)
		if res.Error != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Natijani saqlashda xato"})
			return
		}
		if res.RowsAffected == 1 {
			// Savollar ko'p bo'lsa — ish ko'p, XP ham ko'p. XP topshiriq egasiga beriladi.
			xpAward := 20 + 10*total
			database.DB.Model(&models.User{}).Where("id = ?", assignment.StudentID).
				Update("xp", gorm.Expr("xp + ?", xpAward))
		}
	}

	// Shu moduldagi barcha savolli topshiriqlar bajarilgan bo'lsa — modul tugaydi
	moduleCompleted := false
	if passed {
		var err error
		moduleCompleted, err = tryCompleteModule(assignment.StudentID, assignment.TargetModuleID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Modul holatini yangilashda xato"})
			return
		}
	}

	message := "Topshiriq muvaffaqiyatli bajarildi!"
	if moduleCompleted {
		message = "Topshiriq bajarildi — modul tugatildi, sertifikat tayyor!"
	} else if !passed {
		message = "Natija yetarli emas — topshiriq hali bajarilmagan"
	}
	c.JSON(http.StatusOK, gin.H{
		"message":         message,
		"passed":          passed,
		"correct":         correct,
		"total":           total,
		"completed":       assignment.Completed || passed,
		"moduleCompleted": moduleCompleted,
		"assessment":      assessment,
	})
}

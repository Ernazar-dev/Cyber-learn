package handlers

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"unicode/utf8"

	"cyberai-backend/internal/database"
	"cyberai-backend/internal/middleware"
	"cyberai-backend/internal/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type LoginRequest struct {
	Username string `json:"username" binding:"required,max=64"`
	Password string `json:"password" binding:"required,max=128"`
}

// dummyHash — mavjud bo'lmagan login uchun taqqoslanadigan soxta hash (DefaultCost bilan).
var dummyHash, _ = bcrypt.GenerateFromPassword([]byte("cyberai-timing-equalizer"), bcrypt.DefaultCost)

type RegisterRequest struct {
	Name     string `json:"name" binding:"required,min=2,max=80"`
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required,min=8,max=72"`
}

type SetPasswordRequest struct {
	Username string `json:"username"`
	Password string `json:"password" binding:"required,min=8,max=72"`
}

// Login uchun yagona shart — kamida 4 belgi (yuqori chegara faqat bazani himoyalash uchun).
const (
	usernameMinLen = 4
	usernameMaxLen = 64
)

// normalizeUsername kichik harfga o'tkazadi va chetdagi bo'shliqlarni olib tashlaydi.
func normalizeUsername(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}

func validUsername(s string) bool {
	n := utf8.RuneCountInString(s)
	return n >= usernameMinLen && n <= usernameMaxLen
}

func usernameOf(u models.User) string {
	if u.Username == nil {
		return ""
	}
	return *u.Username
}

func usernameTaken(username string, exceptID uint) bool {
	var count int64
	database.DB.Model(&models.User{}).Where("username = ? AND id <> ?", username, exceptID).Count(&count)
	return count > 0
}

type AuthResponse struct {
	Token string     `json:"token"`
	User  UserPublic `json:"user"`
}

type UserPublic struct {
	ID                      uint               `json:"id"`
	Name                    string             `json:"name"`
	Username                string             `json:"username"`
	Age                     int                `json:"age"`
	Role                    models.Role        `json:"role"`
	DiagnosticScore         float64            `json:"diagnosticScore"`
	Level                   models.Level       `json:"level"`
	FuzzyScore              float64            `json:"fuzzyScore"`
	CompletedModulesCount   int                `json:"completedModulesCount"`
	Speed                   float64            `json:"speed"`
	Errors                  float64            `json:"errors"`
	HasCompletedInitialTest bool               `json:"hasCompletedInitialTest"`
	HasFuzzyResult          bool               `json:"hasFuzzyResult"`
	LastFuzzyResult         *FuzzyResultPublic `json:"lastFuzzyResult"`
}

type FuzzyResultPublic struct {
	Score float64      `json:"score"`
	Level models.Level `json:"level"`
	Rule1 float64      `json:"rule1"`
	Rule2 float64      `json:"rule2"`
	Rule3 float64      `json:"rule3"`
}

func userToPublic(u models.User) UserPublic {
	pub := UserPublic{
		ID:                      u.ID,
		Name:                    u.Name,
		Username:                usernameOf(u),
		Age:                     u.Age,
		Role:                    u.Role,
		DiagnosticScore:         u.DiagnosticScore,
		Level:                   u.Level,
		FuzzyScore:              u.FuzzyScore,
		CompletedModulesCount:   u.CompletedModulesCount,
		Speed:                   u.Speed,
		Errors:                  u.Errors,
		HasCompletedInitialTest: u.HasCompletedInitialTest,
		HasFuzzyResult:          u.HasFuzzyResult,
	}
	if u.HasFuzzyResult {
		pub.LastFuzzyResult = &FuzzyResultPublic{
			Score: u.LastFuzzyScore,
			Level: u.LastFuzzyLevel,
			Rule1: u.LastFuzzyRule1,
			Rule2: u.LastFuzzyRule2,
			Rule3: u.LastFuzzyRule3,
		}
	}
	return pub
}

// POST /api/auth/login
func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Login va parolni kiriting"})
		return
	}

	const invalidCreds = "Login yoki parol noto'g'ri"
	username := normalizeUsername(req.Username)
	if locked, wait := loginLocked(username, c.ClientIP()); locked {
		c.Header("Retry-After", strconv.Itoa(int(wait.Seconds())+1))
		c.JSON(http.StatusTooManyRequests, gin.H{
			"error": fmt.Sprintf("Juda ko'p noto'g'ri urinish. %d daqiqadan keyin qayta urinib ko'ring.", int(wait.Minutes())+1),
		})
		return
	}
	var user models.User
	result := database.DB.Where("username = ?", username).First(&user)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			// Mavjud hisobdagidek bcrypt vaqti sarflanadi — javob tezligidan
			// login bor-yo'qligini bilib bo'lmasin (user enumeration)
			_ = bcrypt.CompareHashAndPassword(dummyHash, []byte(req.Password))
			loginFailed(username, c.ClientIP())
			c.JSON(http.StatusUnauthorized, gin.H{"error": invalidCreds})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Server xatosi"})
		}
		return
	}
	if user.Password == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Bu hisob uchun parol o'rnatilmagan. O'qituvchingizga murojaat qiling."})
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		loginFailed(username, c.ClientIP())
		c.JSON(http.StatusUnauthorized, gin.H{"error": invalidCreds})
		return
	}
	loginSucceeded(username, c.ClientIP())

	token, err := middleware.GenerateToken(user.ID, user.Name, string(user.Role), user.TokenVersion)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Token yaratishda xato"})
		return
	}

	c.JSON(http.StatusOK, AuthResponse{
		Token: token,
		User:  userToPublic(user),
	})
}

// seedNewStudent yangi o'quvchi uchun modul progresslarini yaratadi va u ro'yxatdan
// o'tishidan oldin "hamma o'quvchilar"ga yuborilgan topshiriqlarni unga ham nusxalaydi
// (aks holda u CreateAssignment paytida ro'yxatda bo'lmagani uchun ularni olmay qolardi).
// Har bir guruhdan (batch) bitta namuna olinadi; barcha yozuvlar paketlarda yoziladi.
func seedNewStudent(tx *gorm.DB, student models.User) error {
	var modules []models.Module
	if err := tx.Order("order_index asc").Find(&modules).Error; err != nil {
		return err
	}
	if len(modules) > 0 {
		progress := make([]models.ModuleProgress, len(modules))
		for i, mod := range modules {
			progress[i] = models.ModuleProgress{UserID: student.ID, ModuleID: mod.ID, Unlocked: mod.OrderIndex == 1}
		}
		if err := tx.Omit("Module").Create(&progress).Error; err != nil {
			return err
		}
	}

	// Har bir broadcast guruhining eng birinchi nusxasi — namuna
	var templateIDs []uint
	if err := tx.Raw(`SELECT MIN(id) FROM assignments WHERE batch_id <> '' AND deleted_at IS NULL GROUP BY batch_id`).Scan(&templateIDs).Error; err != nil {
		return err
	}
	if len(templateIDs) == 0 {
		return nil
	}
	var templates []models.Assignment
	if err := tx.Preload("Questions").Where("id IN ?", templateIDs).Order("created_at asc").Find(&templates).Error; err != nil {
		return err
	}

	rows := make([]models.Assignment, len(templates))
	moduleSet := make(map[uint]bool)
	for i, t := range templates {
		rows[i] = models.Assignment{
			Title:          t.Title,
			Description:    t.Description,
			StudentID:      student.ID,
			StudentName:    student.Name,
			TargetModuleID: t.TargetModuleID,
			AssignmentType: t.AssignmentType,
			DateAssigned:   t.DateAssigned,
			BatchID:        t.BatchID,
		}
		moduleSet[t.TargetModuleID] = true
	}
	if err := tx.Omit("Questions").CreateInBatches(&rows, 200).Error; err != nil {
		return err
	}

	var questions []models.AssignmentQuestion
	for i, t := range templates {
		for _, q := range t.Questions {
			questions = append(questions, models.AssignmentQuestion{
				AssignmentID:  rows[i].ID,
				Question:      q.Question,
				Options:       q.Options,
				CorrectAnswer: q.CorrectAnswer,
			})
		}
	}
	if len(questions) > 0 {
		if err := tx.CreateInBatches(&questions, 500).Error; err != nil {
			return err
		}
	}

	// Topshiriq berilgan modullarni ochish (CreateAssignment bilan bir xil) — bitta UPDATE
	moduleIDs := make([]uint, 0, len(moduleSet))
	for id := range moduleSet {
		moduleIDs = append(moduleIDs, id)
	}
	return tx.Model(&models.ModuleProgress{}).
		Where("user_id = ? AND module_id IN ?", student.ID, moduleIDs).
		Update("unlocked", true).Error
}

// POST /api/auth/register
func Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ism (kamida 2 belgi), login va parolni (kamida 8 belgi) kiriting"})
		return
	}

	name := strings.TrimSpace(req.Name)
	username := normalizeUsername(req.Username)
	if !validUsername(username) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Login kamida 4 belgidan iborat bo'lsin"})
		return
	}
	if usernameTaken(username, 0) {
		c.JSON(http.StatusConflict, gin.H{"error": "Bu login band. Boshqasini tanlang."})
		return
	}
	var sameName int64
	database.DB.Model(&models.User{}).Where("name = ?", name).Count(&sameName)
	if sameName > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Bu ismdagi foydalanuvchi allaqachon mavjud"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Server xatosi"})
		return
	}

	newUser := models.User{
		Name:     name,
		Username: &username,
		Password: string(hash),
		Role:     models.RoleStudent,
		Level:    models.LevelBeginner,
	}
	if err := database.DB.Create(&newUser).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Foydalanuvchi yaratishda xato"})
		return
	}

	// Modul progresslari va "hamma o'quvchilar" topshiriqlarining nusxalari —
	// paketlarda va bitta tranzaksiyada (masofaviy bazada har bir so'rov qimmat).
	if err := database.DB.Transaction(func(tx *gorm.DB) error {
		return seedNewStudent(tx, newUser)
	}); err != nil {
		log.Printf("Yangi o'quvchi (%d) uchun boshlang'ich ma'lumotlar to'liq yaratilmadi: %v", newUser.ID, err)
	}

	token, err := middleware.GenerateToken(newUser.ID, newUser.Name, string(newUser.Role), newUser.TokenVersion)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Token yaratishda xato"})
		return
	}

	c.JSON(http.StatusCreated, AuthResponse{
		Token: token,
		User:  userToPublic(newUser),
	})
}

// PUT /api/students/:id/credentials (faqat o'qituvchi)
// O'quvchiga yangi parol (va ixtiyoriy ravishda yangi login) o'rnatadi.
func SetStudentCredentials(c *gin.Context) {
	var req SetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Parol kamida 8 belgidan iborat bo'lsin"})
		return
	}

	var student models.User
	if err := database.DB.Where("id = ? AND role = ?", c.Param("id"), models.RoleStudent).First(&student).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "O'quvchi topilmadi"})
		return
	}

	updates := map[string]interface{}{}
	if req.Username != "" {
		username := normalizeUsername(req.Username)
		if !validUsername(username) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Login kamida 4 belgidan iborat bo'lsin"})
			return
		}
		if usernameTaken(username, student.ID) {
			c.JSON(http.StatusConflict, gin.H{"error": "Bu login band. Boshqasini tanlang."})
			return
		}
		updates["username"] = username
	} else if student.Username == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "O'quvchi uchun login kiriting"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Server xatosi"})
		return
	}
	updates["password"] = string(hash)
	// Yangi parol berildi — o'quvchining eski tokenlari (masalan, begona qurilmada) bekor bo'ladi
	updates["token_version"] = gorm.Expr("token_version + 1")

	if err := database.DB.Model(&student).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Saqlashda xato"})
		return
	}
	middleware.ForgetUser(student.ID)
	database.DB.First(&student, student.ID)
	c.JSON(http.StatusOK, gin.H{"username": usernameOf(student), "hasPassword": true})
}

// GET /api/auth/me
func Me(c *gin.Context) {
	userID, _ := c.Get("userID")
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Foydalanuvchi topilmadi"})
		return
	}
	c.JSON(http.StatusOK, userToPublic(user))
}

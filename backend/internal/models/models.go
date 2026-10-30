package models

import (
	"time"

	"gorm.io/gorm"
)

type Role string

const (
	RoleStudent Role = "Student"
	RoleTeacher Role = "Teacher"
)

type Level string

const (
	LevelBeginner     Level = "Beginner"
	LevelIntermediate Level = "Intermediate"
	LevelAdvanced     Level = "Advanced"
)

type Difficulty string

const (
	DifficultyBeginner     Difficulty = "Boshlang'ich"
	DifficultyIntermediate Difficulty = "O'rta"
	DifficultyAdvanced     Difficulty = "Yuqori"
)

// User represents both students and teacher
type User struct {
	gorm.Model
	Name     string  `gorm:"uniqueIndex;not null" json:"name"`
	Username *string `gorm:"uniqueIndex" json:"username"` // kirish uchun login (pointer: eski yozuvlarda NULL bo'lishi mumkin)
	Age      int     `json:"age"`
	Role     Role    `gorm:"not null;default:'Student'" json:"role"`
	Password string  `json:"-"` // bcrypt hash; bo'sh bo'lsa foydalanuvchi kira olmaydi
	// TokenVersion parol o'zgarganda oshadi — tokenlardagi "ver" bilan mos kelmasa, token bekor (middleware.Auth)
	TokenVersion int `gorm:"not null;default:0" json:"-"`

	// Student-specific fields
	DiagnosticScore         float64 `json:"diagnosticScore"`
	Level                   Level   `gorm:"default:'Beginner'" json:"level"`
	FuzzyScore              float64 `json:"fuzzyScore"`
	CompletedModulesCount   int     `json:"completedModulesCount"`
	Speed                   float64 `json:"speed"`
	Errors                  float64 `json:"errors"`
	HasCompletedInitialTest bool    `gorm:"default:false" json:"hasCompletedInitialTest"`
	XP                      int     `gorm:"default:0" json:"xp"`
	Avatar                  string  `json:"avatar"`

	// Fuzzy result (stored as separate fields)
	LastFuzzyScore float64 `json:"lastFuzzyScore"`
	LastFuzzyLevel Level   `json:"lastFuzzyLevel"`
	LastFuzzyRule1 float64 `json:"lastFuzzyRule1"`
	LastFuzzyRule2 float64 `json:"lastFuzzyRule2"`
	LastFuzzyRule3 float64 `json:"lastFuzzyRule3"`
	HasFuzzyResult bool    `gorm:"default:false" json:"hasFuzzyResult"`

	// Relations
	ModuleProgresses []ModuleProgress `gorm:"foreignKey:UserID" json:"moduleProgress,omitempty"`
}

// ModuleProgress tracks each student's progress per module
type ModuleProgress struct {
	gorm.Model
	UserID    uint    `gorm:"uniqueIndex:idx_user_module;not null" json:"userId"`
	ModuleID  uint    `gorm:"uniqueIndex:idx_user_module;not null" json:"moduleId"`
	Unlocked  bool    `gorm:"default:false" json:"unlocked"`
	Completed bool    `gorm:"default:false" json:"completed"`
	Score     float64 `gorm:"default:0" json:"score"` // quiz score (0-1) from the completion attempt

	Module Module `gorm:"foreignKey:ModuleID" json:"module,omitempty"`
}

// Module is the static module definition
type Module struct {
	gorm.Model
	Title       string `gorm:"not null" json:"title"`
	Description string `json:"description"`
	Content     string `json:"content"`
	OrderIndex  int    `gorm:"default:0" json:"orderIndex"`
}

type LessonType string

const (
	LessonTypeNazariy LessonType = "Nazariy"
	LessonTypeAmaliy  LessonType = "Amaliy"
)

// Lesson created by teacher
type Lesson struct {
	gorm.Model
	Title       string     `gorm:"not null" json:"title"`
	Description string     `json:"description"`
	Content     string     `json:"content"`
	Category    string     `json:"category"`
	Difficulty  Difficulty `json:"difficulty"`
	LessonType  LessonType `gorm:"default:'Nazariy'" json:"lessonType"`
	VideoURL    string     `json:"videoUrl"`
	Tags        string     `json:"tags"` // JSON array stored as string
	CreatedAt   time.Time  `json:"createdAt"`
	FileURL     string     `json:"fileUrl"`
	FileName    string     `json:"fileName"`
	FileSize    int64      `json:"fileSize"`

	// Many-to-many: students who read this lesson
	ReadByStudents []User `gorm:"many2many:lesson_reads;" json:"readByStudents,omitempty"`
}

// UploadedFile stores lesson material bytes directly in Postgres so they
// survive container restarts/redeploys (the app's disk is ephemeral).
type UploadedFile struct {
	gorm.Model
	StoredName   string `gorm:"uniqueIndex;not null" json:"storedName"`
	OriginalName string `json:"originalName"`
	ContentType  string `json:"contentType"`
	Size         int64  `json:"size"`
	Data         []byte `gorm:"type:bytea" json:"-"`
}

// LessonRead tracks which students read which lessons
type LessonRead struct {
	LessonID uint      `gorm:"primaryKey" json:"lessonId"`
	UserID   uint      `gorm:"primaryKey" json:"userId"`
	ReadAt   time.Time `json:"readAt"`
}

type AssignmentType string

const (
	AssignmentTypeNazariy AssignmentType = "Nazariy"
	AssignmentTypeAmaliy  AssignmentType = "Amaliy"
)

// Assignment created by teacher for a student
type Assignment struct {
	gorm.Model
	Title          string         `gorm:"not null" json:"title"`
	Description    string         `json:"description"`
	StudentID      uint           `gorm:"not null" json:"studentId"`
	StudentName    string         `json:"studentName"`
	TargetModuleID uint           `gorm:"not null" json:"targetModuleId"`
	AssignmentType AssignmentType `gorm:"default:'Nazariy'" json:"assignmentType"`
	Completed      bool           `gorm:"default:false" json:"completed"`
	// Score — o'quvchining eng yaxshi natijasi (0..1); modul balli shulardan hisoblanadi
	Score        float64   `gorm:"default:0" json:"score"`
	DateAssigned time.Time `json:"dateAssigned"`
	// BatchID groups the per-student rows created together for a "hamma
	// o'quvchilar" (all-students) assignment, so it can be backfilled for
	// students who register after the assignment was created.
	BatchID string `gorm:"index" json:"-"`

	Questions []AssignmentQuestion `gorm:"foreignKey:AssignmentID" json:"questions"`
}

// AssignmentQuestion is a quiz question in an assignment
type AssignmentQuestion struct {
	gorm.Model
	AssignmentID  uint   `gorm:"not null" json:"assignmentId"`
	Question      string `gorm:"not null" json:"question"`
	Options       string `json:"options"`       // JSON array stored as string
	CorrectAnswer int    `json:"correctAnswer"` // index of correct option
}

// FuzzyWeights stores the teacher-configurable fuzzy engine parameters
type FuzzyWeights struct {
	gorm.Model
	Rule1Weight           float64 `gorm:"default:0.2" json:"rule1Weight"`
	Rule2Weight           float64 `gorm:"default:0.5" json:"rule2Weight"`
	Rule3Weight           float64 `gorm:"default:0.9" json:"rule3Weight"`
	BeginnerThreshold     float64 `gorm:"default:0.4" json:"beginnerThreshold"`
	IntermediateThreshold float64 `gorm:"default:0.7" json:"intermediateThreshold"`
}

// Certificate records a per-module completion certificate issued to a student
type Certificate struct {
	gorm.Model
	UserID           uint      `gorm:"uniqueIndex:idx_user_module_cert;not null" json:"userId"`
	ModuleID         uint      `gorm:"uniqueIndex:idx_user_module_cert;not null" json:"moduleId"`
	VerificationCode string    `gorm:"uniqueIndex;not null" json:"verificationCode"`
	ModuleTitle      string    `json:"moduleTitle"`
	Score            float64   `json:"score"`
	IssuedAt         time.Time `json:"issuedAt"`
}

type CTFDifficulty string

const (
	CTFDifficultyEasy   CTFDifficulty = "Oson"
	CTFDifficultyMedium CTFDifficulty = "O'rta"
	CTFDifficultyHard   CTFDifficulty = "Qiyin"
)

// CTFChallenge is a per-module flag-capture challenge. FlagHash is a bcrypt
// hash of the (lowercased, trimmed) correct flag — never exposed to clients.
type CTFChallenge struct {
	gorm.Model
	ModuleID    uint          `gorm:"not null;index" json:"moduleId"`
	Title       string        `gorm:"not null" json:"title"`
	Description string        `json:"description"`
	Difficulty  CTFDifficulty `gorm:"default:'Oson'" json:"difficulty"`
	Points      int           `gorm:"default:50" json:"points"`
	Hint        string        `json:"hint"`
	FlagHash    string        `json:"-"`
}

// CTFSolve records that a student solved a given challenge
type CTFSolve struct {
	gorm.Model
	UserID      uint      `gorm:"uniqueIndex:idx_user_challenge;not null" json:"userId"`
	ChallengeID uint      `gorm:"uniqueIndex:idx_user_challenge;not null" json:"challengeId"`
	SolvedAt    time.Time `json:"solvedAt"`
}

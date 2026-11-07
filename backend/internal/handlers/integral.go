package handlers

import (
	"net/http"
	"strconv"

	"cyberai-backend/internal/database"
	"cyberai-backend/internal/fuzzy"
	"cyberai-backend/internal/models"

	"github.com/gin-gonic/gin"
)

// Integral kiberxavfsizlik ko'rsatkichi K (fuzzy.EvaluateIntegral) uchun kirishlarni yig'adi.
// Manbalar (yangi kontent talab qilmaydi, mavjud natijalardan):
//
//	X1 — nazariy bilim:   "Nazariy" topshiriqlar (eng yaxshi natijalar) o'rtachasi; ular bo'lmasa — diagnostika testi
//	X2 — amaliy ko'nikma: "Amaliy" topshiriqlar (eng yaxshi natijalar) o'rtachasi
//	X3 — vaziyat tahlili: CTF — ochiq modullardagi challenge'lar ballari bo'yicha yechilgan ulush
//
// K har bir o'quvchi uchun bitta (umumiy) va har so'rovda joriy ma'lumotlardan hisoblanadi —
// shuning uchun har topshiriq/CTF'dan keyin o'zi yangilanadi. Ball/XP tizimi o'zgarmaydi.

// IntegralSource — bitta kirish qayerdan va nechta natijadan olingani
type IntegralSource struct {
	Value   float64 `json:"value"`   // 0..100
	HasData bool    `json:"hasData"` // false — hali natija yo'q (qiymat 0 deb olinadi)
	Count   int     `json:"count"`   // hisobga olingan natijalar soni
	Origin  string  `json:"origin"`  // "assignments" | "diagnostic" | "ctf"
}

// IntegralResponse — GET /api/students/:id/integral javobi
type IntegralResponse struct {
	// Evaluated=false — kirishlarning birortasida ham natija yo'q, K hisoblanmadi
	Evaluated bool            `json:"evaluated"`
	Result    *fuzzy.Integral `json:"result,omitempty"`
	X1        IntegralSource  `json:"x1"`
	X2        IntegralSource  `json:"x2"`
	X3        IntegralSource  `json:"x3"`
}

// assignmentAverage — berilgan turdagi, kamida bir marta yechilgan topshiriqlar o'rtachasi (0..100)
func assignmentAverage(userID uint, kind models.AssignmentType) (avg float64, n int) {
	var tasks []models.Assignment
	database.DB.Select("score").
		Where("student_id = ? AND assignment_type = ? AND attempts > 0", userID, kind).
		Find(&tasks)
	for _, t := range tasks {
		avg += t.Score
	}
	if len(tasks) == 0 {
		return 0, 0
	}
	return avg / float64(len(tasks)) * 100, len(tasks)
}

// ctfShare — ochiq modullardagi challenge'lar bo'yicha yechilgan ball ulushi (0..100);
// n — shu challenge'lar soni
func ctfShare(userID uint) (share float64, n int) {
	var unlocked []uint
	database.DB.Model(&models.ModuleProgress{}).
		Where("user_id = ? AND unlocked = ?", userID, true).
		Pluck("module_id", &unlocked)
	if len(unlocked) == 0 {
		return 0, 0
	}
	var challenges []models.CTFChallenge
	database.DB.Select("id", "points").Where("module_id IN ?", unlocked).Find(&challenges)
	if len(challenges) == 0 {
		return 0, 0
	}
	var solvedIDs []uint
	database.DB.Model(&models.CTFSolve{}).Where("user_id = ?", userID).Pluck("challenge_id", &solvedIDs)
	solved := make(map[uint]bool, len(solvedIDs))
	for _, id := range solvedIDs {
		solved[id] = true
	}
	var total, got float64
	for _, ch := range challenges {
		total += float64(ch.Points)
		if solved[ch.ID] {
			got += float64(ch.Points)
		}
	}
	if total == 0 {
		return 0, len(challenges)
	}
	return got / total * 100, len(challenges)
}

func computeIntegral(user models.User) IntegralResponse {
	resp := IntegralResponse{}

	x1, n1 := assignmentAverage(user.ID, models.AssignmentTypeNazariy)
	resp.X1 = IntegralSource{Value: x1, HasData: n1 > 0, Count: n1, Origin: "assignments"}
	if n1 == 0 && user.HasCompletedInitialTest {
		resp.X1 = IntegralSource{Value: user.DiagnosticScore * 100, HasData: true, Count: 1, Origin: "diagnostic"}
	}

	x2, n2 := assignmentAverage(user.ID, models.AssignmentTypeAmaliy)
	resp.X2 = IntegralSource{Value: x2, HasData: n2 > 0, Count: n2, Origin: "assignments"}

	// X3: challenge'lar bor bo'lsa, birortasi yechilmagan bo'lsa ham 0% — bu ma'lumot (hali yecha olmagan)
	x3, n3 := ctfShare(user.ID)
	resp.X3 = IntegralSource{Value: x3, HasData: n3 > 0, Count: n3, Origin: "ctf"}

	return finishIntegral(resp)
}

// finishIntegral kirishlardan kamida bittasida natija bo'lsa K ni hisoblaydi
func finishIntegral(resp IntegralResponse) IntegralResponse {
	if resp.X1.HasData || resp.X2.HasData || resp.X3.HasData {
		r := fuzzy.EvaluateIntegral(resp.X1.Value, resp.X2.Value, resp.X3.Value)
		resp.Evaluated = true
		resp.Result = &r
	}
	return resp
}

// IntegralSummary — o'quvchilar ro'yxati uchun ixcham K
type IntegralSummary struct {
	StudentID uint                `json:"studentId"`
	Evaluated bool                `json:"evaluated"`
	K         float64             `json:"k"`
	Level     fuzzy.IntegralLevel `json:"level,omitempty"`
}

// GET /api/students/integrals — faqat o'qituvchi. Hamma o'quvchilar K si bir nechta umumiy so'rov bilan
// (har bir o'quvchi uchun alohida so'rov emas — masofaviy bazada sekin bo'lardi).
func GetStudentIntegrals(c *gin.Context) {
	var users []models.User
	database.DB.Select("id", "has_completed_initial_test", "diagnostic_score").
		Where("role = ?", models.RoleStudent).Find(&users)

	var tasks []models.Assignment
	database.DB.Select("student_id", "assignment_type", "score").Where("attempts > 0").Find(&tasks)
	type agg struct {
		sum float64
		n   int
	}
	theory, practice := map[uint]*agg{}, map[uint]*agg{}
	for _, t := range tasks {
		var m map[uint]*agg
		switch t.AssignmentType {
		case models.AssignmentTypeNazariy:
			m = theory
		case models.AssignmentTypeAmaliy:
			m = practice
		default:
			continue
		}
		a := m[t.StudentID]
		if a == nil {
			a = &agg{}
			m[t.StudentID] = a
		}
		a.sum += t.Score
		a.n++
	}

	var progresses []models.ModuleProgress
	database.DB.Select("user_id", "module_id").Where("unlocked = ?", true).Find(&progresses)
	unlocked := map[uint]map[uint]bool{}
	for _, p := range progresses {
		if unlocked[p.UserID] == nil {
			unlocked[p.UserID] = map[uint]bool{}
		}
		unlocked[p.UserID][p.ModuleID] = true
	}
	var challenges []models.CTFChallenge
	database.DB.Select("id", "module_id", "points").Find(&challenges)
	var solves []models.CTFSolve
	database.DB.Select("user_id", "challenge_id").Find(&solves)
	solved := map[uint]map[uint]bool{}
	for _, s := range solves {
		if solved[s.UserID] == nil {
			solved[s.UserID] = map[uint]bool{}
		}
		solved[s.UserID][s.ChallengeID] = true
	}

	out := make([]IntegralSummary, 0, len(users))
	for _, u := range users {
		resp := IntegralResponse{}
		if a := theory[u.ID]; a != nil {
			resp.X1 = IntegralSource{Value: a.sum / float64(a.n) * 100, HasData: true, Count: a.n}
		} else if u.HasCompletedInitialTest {
			resp.X1 = IntegralSource{Value: u.DiagnosticScore * 100, HasData: true, Count: 1}
		}
		if a := practice[u.ID]; a != nil {
			resp.X2 = IntegralSource{Value: a.sum / float64(a.n) * 100, HasData: true, Count: a.n}
		}
		var total, got float64
		n := 0
		for _, ch := range challenges {
			if !unlocked[u.ID][ch.ModuleID] {
				continue
			}
			n++
			total += float64(ch.Points)
			if solved[u.ID][ch.ID] {
				got += float64(ch.Points)
			}
		}
		if n > 0 {
			resp.X3 = IntegralSource{HasData: true, Count: n}
			if total > 0 {
				resp.X3.Value = got / total * 100
			}
		}
		resp = finishIntegral(resp)
		s := IntegralSummary{StudentID: u.ID, Evaluated: resp.Evaluated}
		if resp.Result != nil {
			s.K, s.Level = resp.Result.K, resp.Result.Level
		}
		out = append(out, s)
	}
	c.JSON(http.StatusOK, out)
}

// GET /api/students/me/integral — o'quvchining o'z K si
func GetMyIntegral(c *gin.Context) {
	userID, _ := c.Get("userID")
	var user models.User
	if err := database.DB.Where("role = ?", models.RoleStudent).First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "O'quvchi topilmadi"})
		return
	}
	c.JSON(http.StatusOK, computeIntegral(user))
}

// GET /api/students/:id/integral — o'qituvchi istalgan o'quvchining, o'quvchi faqat o'zining K sini ko'radi
func GetStudentIntegral(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Noto'g'ri ID"})
		return
	}
	userID, _ := c.Get("userID")
	role, _ := c.Get("userRole")
	if role != "Teacher" && userID.(uint) != uint(id) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Ruxsat yo'q"})
		return
	}
	var user models.User
	if err := database.DB.Where("role = ?", models.RoleStudent).First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "O'quvchi topilmadi"})
		return
	}
	c.JSON(http.StatusOK, computeIntegral(user))
}

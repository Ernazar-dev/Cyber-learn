package handlers

import (
	"math"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// Diagnostika testi serverda turadi: to'g'ri javoblar o'quvchiga yuborilmaydi, ball va
// tezlik shu yerda hisoblanadi. Avval ball brauzerda hisoblanib, tayyor raqam sifatida
// yuborilardi — har kim API'ga knowledge=1 yuborib o'zini "Advanced" qila olardi.

type diagnosticQuestion struct {
	Q       string
	Options []string
	Correct int
}

// diagnosticTimeLimit — butun test uchun vaqt (frontend taymeri ham shundan oladi).
const diagnosticTimeLimit = 60 * time.Second

var diagnosticQuestions = []diagnosticQuestion{
	{"Kiberxavfsizlikda CIA nimaning qisqartmasi?", []string{"Maxfiylik, butunlik, mavjudlik", "Markaziy razvedka agentligi", "Kompyuter ma'lumotlariga kirish", "Kiber infratuzilma arxitekturasi"}, 0},
	{"Qaysi protokol veb trafikni shifrlaydi?", []string{"HTTP", "FTP", "HTTPS", "SMTP"}, 2},
	{"Zero-day zaiflik nima?", []string{"Darhol tuzatilgan xato", "Hali tuzatish (patch) chiqmagan noma'lum zaiflik", "Firewall qoidasi", "Zararli dastur turi"}, 1},
	{"Firewall nima qiladi?", []string{"Internetni tezlashtiradi", "Tarmoq trafigini nazorat qiladi va filtrlaydi", "Ma'lumotni shifrlaydi", "Fayllarni zaxiralaydi"}, 1},
	{"Phishing nima?", []string{"Tarmoqni skanerlash usuli", "Login ma'lumotlarini o'g'irlashga qaratilgan firibgarlik", "Shifrlash turi", "Monitoring vositasi"}, 1},
	{"Qaysi parol kuchli?", []string{"password123", "abc", "Tr0ub4dor&3!", "123456"}, 2},
	{"Ikki faktorli autentifikatsiya nima?", []string{"Ikkita paroldan foydalanish", "Faqat biometrika", "Ikki xil tekshiruvni talab qiluvchi himoya", "Ikki marta shifrlash"}, 2},
	{"Malware nima?", []string{"Uskuna nosozligi", "Tizimga zarar yetkazuvchi dastur", "Tarmoq protokoli", "Firewall turi"}, 1},
}

type DiagnosticQuestionResponse struct {
	Q       string   `json:"q"`
	Options []string `json:"options"`
	// Faqat o'qituvchiga; o'quvchiga -1
	Correct int `json:"correct"`
}

// GET /api/diagnostic — savollar (o'quvchiga javobsiz)
func GetDiagnostic(c *gin.Context) {
	role, _ := c.Get("userRole")
	qs := make([]DiagnosticQuestionResponse, len(diagnosticQuestions))
	for i, q := range diagnosticQuestions {
		correct := -1
		if role == "Teacher" {
			correct = q.Correct
		}
		qs[i] = DiagnosticQuestionResponse{Q: q.Q, Options: q.Options, Correct: correct}
	}
	c.JSON(http.StatusOK, gin.H{
		"timeLimit": int(diagnosticTimeLimit.Seconds()),
		"questions": qs,
	})
}

// Test boshlangan vaqt — tezlik ko'rsatkichi brauzer aytgan vaqtdan emas, shundan hisoblanadi.
var (
	diagnosticStartsMu sync.Mutex
	diagnosticStarts   = map[uint]time.Time{}
)

// POST /api/diagnostic/start — o'quvchi "Testni boshlash"ni bosganda
func StartDiagnostic(c *gin.Context) {
	userID := c.MustGet("userID").(uint)
	now := time.Now()
	diagnosticStartsMu.Lock()
	// Xotira o'smasin: eskirgan (tugatilmagan) urinishlarni tozalash
	if len(diagnosticStarts) > 10000 {
		for id, t := range diagnosticStarts {
			if now.Sub(t) > time.Hour {
				delete(diagnosticStarts, id)
			}
		}
	}
	diagnosticStarts[userID] = now
	diagnosticStartsMu.Unlock()
	c.JSON(http.StatusOK, gin.H{"timeLimit": int(diagnosticTimeLimit.Seconds())})
}

// takeDiagnosticSpeed boshlanish yozuvini o'chiradi va tezlikni (0..1) qaytaradi:
// 1 — darhol, 0 — vaqt tugadi yoki boshlanish qayd etilmagan.
func takeDiagnosticSpeed(userID uint) float64 {
	diagnosticStartsMu.Lock()
	start, ok := diagnosticStarts[userID]
	delete(diagnosticStarts, userID)
	diagnosticStartsMu.Unlock()
	if !ok {
		return 0
	}
	speed := 1 - time.Since(start).Seconds()/diagnosticTimeLimit.Seconds()
	return math.Max(0, math.Min(1, speed))
}

// gradeDiagnostic to'g'ri javoblar sonini qaytaradi; javoblar soni mos kelmasa ok=false.
func gradeDiagnostic(answers []int) (correct int, ok bool) {
	if len(answers) != len(diagnosticQuestions) {
		return 0, false
	}
	for i, q := range diagnosticQuestions {
		if answers[i] == q.Correct {
			correct++
		}
	}
	return correct, true
}

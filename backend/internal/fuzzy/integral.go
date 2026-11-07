package fuzzy

// Integral kiberxavfsizlik bilim ko'rsatkichi K — Mamdani tipidagi noaniq xulosa tizimi
// (mijoz hujjati, 2.3-bo'lim):
//
//	X1 (nazariy bilim), X2 (amaliy ko'nikma), X3 (vaziyatni tahlil qilish) → FIS → K
//
// Hamma o'zgaruvchilar 0–100 oralig'ida. Termlar: past / o'rta / yuqori (2.3.1-jadval).
// 1) fazzifikatsiya, 2) IF–THEN qoidalar (AND = min), 3) agregatsiya (OR = max),
// 4) defazzifikatsiya — og'irlik markazi (centroid) usuli.
//
// Eslatma: bu "topshiriq o'zlashtirishi" modeli (performance.go) dan alohida — u bitta urinishni
// baholaydi, K esa o'quvchining umumiy kompetensiyasini.

// Term — lingvistik qiymat indeksi
type Term int

const (
	TermLow Term = iota
	TermMid
	TermHigh
)

// trapezoid — trapetsiya a'zolik funksiyasi (a ≤ b ≤ c ≤ d); b == c bo'lsa uchburchak.
// a == b (yoki c == d) bo'lsa o'sha tomon tik ("yelka").
func trapezoid(x, a, b, c, d float64) float64 {
	switch {
	case x >= b && x <= c:
		return 1
	case x > a && x < b:
		return (x - a) / (b - a)
	case x > c && x < d:
		return (d - x) / (d - c)
	}
	return 0
}

// Kirish termlari (2.3.1-jadval). "O'rta" — uchburchak (cho'qqi 55), "yuqori" — 80 dan keyin to'liq 1
// (trapetsiya): hujjat misolida μyuqori(78)=0,90, μyuqori(85)=1,00, μo'rta(78)=(80−78)/(80−55).
func inputLow(x, upper float64) float64 { return trapezoid(x, 0, 0, 30, upper) }
func inputMid(x float64) float64        { return trapezoid(x, 30, 55, 55, 80) }
func inputHigh(x float64) float64       { return trapezoid(x, 60, 80, 100, 100) }

// X1 uchun "past" 0–60, X2/X3 uchun 0–55.
const (
	lowUpperX1  = 60.0
	lowUpperX23 = 55.0
)

// Chiqish (K) termlari. 2.3.1-jadval: past 0–40, o'rta 40–70, yuqori 70–100 — termlar kirishlardagi kabi
// o'zaro qoplanadi (past/o'rta/yuqori chegaralari ≈ 40 va 70 atrofida). Cho'qqilar hujjat misoliga (K ≈ 71 %) moslab
// tanlangan: hujjatda K ning aniq shakli berilmagan.
func outputLow(y float64) float64  { return trapezoid(y, 0, 0, 25, 45) }
func outputMid(y float64) float64  { return trapezoid(y, 35, 55, 55, 75) }
func outputHigh(y float64) float64 { return trapezoid(y, 55, 85, 100, 100) }

func fuzzifyInput(x, lowUpper float64) Membership {
	x = clamp100(x)
	return Membership{Low: inputLow(x, lowUpper), Medium: inputMid(x), High: inputHigh(x)}
}

func clamp100(x float64) float64 {
	if x < 0 {
		return 0
	}
	if x > 100 {
		return 100
	}
	return x
}

// RuleFiring — bitta qoidaning faollashuvi (ko'rsatish uchun)
type RuleFiring struct {
	ID     string  `json:"id"`
	Text   string  `json:"text"`
	Output string  `json:"output"` // low | mid | high
	Alpha  float64 `json:"alpha"`
}

// IntegralLevel — K bo'yicha daraja (K<40 past, K<70 o'rta, aks holda yuqori)
type IntegralLevel string

const (
	IntegralLow  IntegralLevel = "low"
	IntegralMid  IntegralLevel = "mid"
	IntegralHigh IntegralLevel = "high"
)

// Integral — to'liq natija
type Integral struct {
	K     float64       `json:"k"`
	Level IntegralLevel `json:"level"`

	X1 float64 `json:"x1"`
	X2 float64 `json:"x2"`
	X3 float64 `json:"x3"`

	X1Mu Membership `json:"x1Mu"`
	X2Mu Membership `json:"x2Mu"`
	X3Mu Membership `json:"x3Mu"`

	// Chiqish termlarining agregatsiyalangan faolligi (kesish balandligi)
	Output Membership `json:"output"`
	// Faol (alpha > 0) qoidalar, kuchlisi birinchi
	Rules []RuleFiring `json:"rules"`
	// Individual tavsiyalar (R5 va kuchsiz tomonlar bo'yicha)
	Recommendations []string `json:"recommendations"`
}

var termNames = [3]string{"past", "o'rta", "yuqori"}
var outNames = [3]string{"low", "mid", "high"}

// outputOf — 27 ta kombinatsiya uchun chiqish termi. Hujjatdagi R1–R4 ni umumlashtiradi:
//   - hammasi yuqori → yuqori (R1);
//   - X1 va X2 past (R4) yoki ballar yig'indisi (past=0, o'rta=1, yuqori=2) ≤ 2 → past;
//   - qolgan hamma holat (R2, R3 va ularning qo'shnilari) → o'rta.
//
// Shunda har qanday kirishda kamida bitta qoida ishlaydi (hujjatda 5 ta qoida, 27 ta kombinatsiya).
func outputOf(t1, t2, t3 Term) Term {
	if t1 == TermHigh && t2 == TermHigh && t3 == TermHigh {
		return TermHigh
	}
	if (t1 == TermLow && t2 == TermLow) || int(t1)+int(t2)+int(t3) <= 2 {
		return TermLow
	}
	return TermMid
}

// ruleID — hujjatdagi qoida raqami (bo'lsa)
func ruleID(t1, t2, t3 Term) string {
	switch {
	case t1 == TermHigh && t2 == TermHigh && t3 == TermHigh:
		return "R1"
	case t1 == TermHigh && t2 == TermMid && t3 == TermHigh:
		return "R2"
	case t1 == TermMid && t2 == TermMid && t3 == TermMid:
		return "R3"
	case t1 == TermLow && t2 == TermLow:
		return "R4"
	}
	return ""
}

// centroid — agregatsiyalangan chiqish funksiyasining og'irlik markazi (0..100, qadam 0,1)
func centroid(out Membership) (float64, bool) {
	var num, den float64
	for i := 0; i <= 1000; i++ {
		y := float64(i) / 10
		mu := max64(min64(out.Low, outputLow(y)), min64(out.Medium, outputMid(y)), min64(out.High, outputHigh(y)))
		num += y * mu
		den += mu
	}
	if den == 0 {
		return 0, false
	}
	return num / den, true
}

// LevelOfK K ni past / o'rta / yuqori darajaga aylantiradi (2.3.1-jadval)
func LevelOfK(k float64) IntegralLevel {
	switch {
	case k >= 70:
		return IntegralHigh
	case k >= 40:
		return IntegralMid
	default:
		return IntegralLow
	}
}

// EvaluateIntegral X1, X2, X3 (0..100) bo'yicha K ni hisoblaydi.
func EvaluateIntegral(x1, x2, x3 float64) Integral {
	x1, x2, x3 = clamp100(x1), clamp100(x2), clamp100(x3)
	m1 := fuzzifyInput(x1, lowUpperX1)
	m2 := fuzzifyInput(x2, lowUpperX23)
	m3 := fuzzifyInput(x3, lowUpperX23)

	vals := func(m Membership) [3]float64 { return [3]float64{m.Low, m.Medium, m.High} }
	v1, v2, v3 := vals(m1), vals(m2), vals(m3)

	var agg [3]float64
	rules := []RuleFiring{}
	for a := Term(0); a < 3; a++ {
		for b := Term(0); b < 3; b++ {
			for c := Term(0); c < 3; c++ {
				alpha := min64(v1[a], min64(v2[b], v3[c]))
				if alpha <= 0 {
					continue
				}
				o := outputOf(a, b, c)
				if alpha > agg[o] {
					agg[o] = alpha
				}
				id := ruleID(a, b, c)
				if id == "" {
					id = "R*"
				}
				rules = append(rules, RuleFiring{
					ID:     id,
					Text:   "nazariy " + termNames[a] + ", amaliy " + termNames[b] + ", tahliliy " + termNames[c] + " → " + termNames[o],
					Output: outNames[o],
					Alpha:  alpha,
				})
			}
		}
	}
	// Kuchli faollashgan qoidalar birinchi
	for i := 1; i < len(rules); i++ {
		for j := i; j > 0 && rules[j].Alpha > rules[j-1].Alpha; j-- {
			rules[j], rules[j-1] = rules[j-1], rules[j]
		}
	}

	out := Membership{Low: agg[TermLow], Medium: agg[TermMid], High: agg[TermHigh]}
	k, _ := centroid(out) // kirish fazosi to'liq qoplangan: kamida bitta qoida har doim ishlaydi

	return Integral{
		K: k, Level: LevelOfK(k),
		X1: x1, X2: x2, X3: x3,
		X1Mu: m1, X2Mu: m2, X3Mu: m3,
		Output: out, Rules: rules,
		Recommendations: recommend(x2, m1, m2, m3),
	}
}

// recommend — R5 va kuchsiz tomonlar bo'yicha tavsiyalar
func recommend(x2 float64, m1, m2, m3 Membership) []string {
	var tips []string
	// R5: nazariy yuqori, ammo amaliy past → amaliy mashg'ulotlarni kuchaytirish
	if m1.High > 0.5 && x2 < 55 {
		tips = append(tips, "Nazariy bilim yuqori, ammo amaliy ko'nikma past — amaliy mashg'ulotlar va topshiriqlarni ko'paytiring.")
	}
	if m3.Low > 0.5 {
		tips = append(tips, "Vaziyatni tahlil qilish past — CTF topshiriqlari va situatsion keyslar ulushini oshiring.")
	}
	if m1.Low > 0.5 {
		tips = append(tips, "Nazariy bilim past — darslarni qayta o'qib, nazariy testlarni takrorlang.")
	}
	if m2.Low > 0.5 && m1.High <= 0.5 {
		tips = append(tips, "Amaliy ko'nikma past — amaliy topshiriqlarni bajarishga ko'proq vaqt ajrating.")
	}
	if len(tips) == 0 {
		tips = append(tips, "Natijalar barqaror — qiyinroq CTF va amaliy topshiriqlar bilan davom eting.")
	}
	return tips
}

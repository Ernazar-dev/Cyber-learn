package fuzzy

// O'zlashtirish (успеваемость) bo'yicha fuzzy baholash — mijoz hujjatidagi model:
//
//	x1 — bilim (to'g'ri javoblar ulushi), x2 — xatolar (noto'g'ri javoblar ulushi),
//	x3 — tezlik (server o'lchagan vaqtdan). Har biri [0, 1].
//
// 1) Fazzifikatsiya: har bir kirish uchburchak funksiyalar bilan μLow/μMedium/μHigh ga aylanadi.
// 2) IF–THEN qoidalar (AND = min), 3) agregatsiya (OR = max) — har bir chiqish sinfi uchun,
// 4) defazzifikatsiya — sinf qiymatlari bo'yicha og'irlikli o'rtacha (singletonli markaz).
//
// Bu % bahoni almashtirmaydi: % — topshiriq/modul o'tish sharti bo'lib qoladi, fuzzy baho
// esa uning yonida o'quvchining keyingi yo'nalishini (o'tish / takrorlash / remediatsiya) belgilaydi.

// Membership — bitta kirishning uchta lingvistik termga tegishlilik darajasi
type Membership struct {
	Low    float64 `json:"low"`
	Medium float64 `json:"medium"`
	High   float64 `json:"high"`
}

func fuzzify(x float64) Membership {
	return Membership{Low: low(x), Medium: medium(x), High: high(x)}
}

// Decision — hujjatdagi "нечеткое решение перехода"
type Decision string

const (
	DecisionAdvance   Decision = "advance"   // IF успех = высокий THEN перейти дальше
	DecisionRepeat    Decision = "repeat"    // IF успех = средний THEN повтор + подсказки
	DecisionRemediate Decision = "remediate" // IF успех = низкий THEN ремедиация (упрощение)
)

// Readiness — hujjatdagi "Fuzzy итоговая оценка"
type Readiness string

const (
	ReadinessReady    Readiness = "ready"     // готов
	ReadinessPartial  Readiness = "partial"   // частично готов
	ReadinessNotReady Readiness = "not_ready" // не готов
)

// Performance — bitta urinishning to'liq fuzzy bahosi (o'qituvchi va o'quvchiga ko'rsatiladi)
type Performance struct {
	Score     float64 `json:"score"`
	Knowledge float64 `json:"knowledge"`
	Errors    float64 `json:"errors"`
	Speed     float64 `json:"speed"`

	KnowledgeMu Membership `json:"knowledgeMu"`
	ErrorsMu    Membership `json:"errorsMu"`
	SpeedMu     Membership `json:"speedMu"`
	// Chiqish sinflarining agregatsiyalangan darajasi: μ(low), μ(mid), μ(high)
	Output Membership `json:"output"`

	Decision  Decision  `json:"decision"`
	Readiness Readiness `json:"readiness"`
}

func max64(vals ...float64) float64 {
	m := 0.0
	for _, v := range vals {
		if v > m {
			m = v
		}
	}
	return m
}

func withDefaults(w FuzzyWeightsInput) FuzzyWeightsInput {
	if w.Rule1Weight == 0 && w.Rule2Weight == 0 && w.Rule3Weight == 0 {
		w.Rule1Weight, w.Rule2Weight, w.Rule3Weight = 0.2, 0.5, 0.9
	}
	if w.BeginnerThreshold == 0 && w.IntermediateThreshold == 0 {
		w.BeginnerThreshold, w.IntermediateThreshold = 0.4, 0.7
	}
	return w
}

// EvaluatePerformance topshiriq natijasini fuzzy baholaydi. Og'irliklar va chegaralar —
// o'qituvchi "AI dvigateli" sahifasida sozlaydigan qiymatlar (Rule1/2/3 — past/o'rta/yuqori sinf).
func EvaluatePerformance(knowledge, errors, speed float64, w FuzzyWeightsInput) Performance {
	w = withDefaults(w)
	k, e, s := fuzzify(knowledge), fuzzify(errors), fuzzify(speed)

	// Qoidalar bazasi (AND = min). R1–R3 — hujjatdagi qoidalar, R4–R7 esa butun kirish
	// fazosini qoplaydi: aks holda ba'zi kombinatsiyalarda hech bir qoida ishlamay, baho 0 chiqardi.
	r1 := min64(k.Low, e.High)      // IF bilim LOW AND xato HIGH        → past
	r2 := min64(k.Medium, s.Medium) // IF bilim MEDIUM AND tezlik MEDIUM → o'rta
	r3 := min64(k.High, e.Low)      // IF bilim HIGH AND xato LOW        → yuqori
	r4 := k.Low                     // IF bilim LOW (javobsiz qoldirilgan) → past
	r5 := min64(k.Medium, s.High)   // IF bilim MEDIUM AND tezlik HIGH   → o'rta
	r6 := min64(k.Medium, s.Low)    // IF bilim MEDIUM AND tezlik LOW    → past (qiynalgan)
	r7 := min64(k.High, s.High)     // IF bilim HIGH AND tezlik HIGH     → yuqori

	// Agregatsiya (OR = max)
	out := Membership{
		Low:    max64(r1, r4, r6),
		Medium: max64(r2, r5),
		High:   max64(r3, r7),
	}

	// Defazzifikatsiya
	den := out.Low + out.Medium + out.High
	score := 0.0
	if den > 0 {
		score = (out.Low*w.Rule1Weight + out.Medium*w.Rule2Weight + out.High*w.Rule3Weight) / den
	}

	decision := DecisionRemediate
	if score >= w.IntermediateThreshold {
		decision = DecisionAdvance
	} else if score >= w.BeginnerThreshold {
		decision = DecisionRepeat
	}

	return Performance{
		Score: score, Knowledge: knowledge, Errors: errors, Speed: speed,
		KnowledgeMu: k, ErrorsMu: e, SpeedMu: s, Output: out,
		Decision: decision, Readiness: ReadinessOf(score, w),
	}
}

// ReadinessOf yakuniy fuzzy bahoni "tayyor / qisman tayyor / tayyor emas" ga aylantiradi
func ReadinessOf(score float64, w FuzzyWeightsInput) Readiness {
	w = withDefaults(w)
	switch {
	case score >= w.IntermediateThreshold:
		return ReadinessReady
	case score >= w.BeginnerThreshold:
		return ReadinessPartial
	default:
		return ReadinessNotReady
	}
}

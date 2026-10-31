package fuzzy

import "testing"

func TestEvaluatePerformance(t *testing.T) {
	w := FuzzyWeightsInput{} // standart: 0.2 / 0.5 / 0.9, chegaralar 0.4 / 0.7
	cases := []struct {
		name              string
		knowledge, errors float64
		speed             float64
		decision          Decision
		readiness         Readiness
	}{
		{"hammasi to'g'ri va tez", 1, 0, 0.8, DecisionAdvance, ReadinessReady},
		{"hammasi noto'g'ri", 0, 1, 0.5, DecisionRemediate, ReadinessNotReady},
		{"yarmi to'g'ri, o'rtacha tezlik", 0.5, 0.5, 0.5, DecisionRepeat, ReadinessPartial},
		{"yarmi to'g'ri, juda sekin", 0.5, 0.5, 0, DecisionRemediate, ReadinessNotReady},
		{"javobsiz qoldirilgan", 0, 0, 0.9, DecisionRemediate, ReadinessNotReady},
	}
	for _, c := range cases {
		p := EvaluatePerformance(c.knowledge, c.errors, c.speed, w)
		if p.Decision != c.decision || p.Readiness != c.readiness {
			t.Errorf("%s: score=%.3f decision=%s readiness=%s; kutilgan %s/%s",
				c.name, p.Score, p.Decision, p.Readiness, c.decision, c.readiness)
		}
	}
}

// Har qanday kirishda kamida bitta qoida ishlashi kerak — baho hech qachon "teshik"ka tushib 0 bo'lmasin
func TestEvaluatePerformanceCoversInputSpace(t *testing.T) {
	for k := 0.0; k <= 1.0001; k += 0.05 {
		for s := 0.0; s <= 1.0001; s += 0.05 {
			p := EvaluatePerformance(k, 1-k, s, FuzzyWeightsInput{})
			if p.Score < 0.2-1e-9 || p.Score > 0.9+1e-9 {
				t.Fatalf("k=%.2f s=%.2f: score=%.3f [0.2, 0.9] oralig'idan tashqarida", k, s, p.Score)
			}
		}
	}
}

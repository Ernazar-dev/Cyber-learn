package fuzzy

import (
	"math"
	"testing"
)

// Hujjat misoli (2.3.2-jadval): X1=78, X2=70, X3=85
func TestIntegralDocumentExample(t *testing.T) {
	r := EvaluateIntegral(78, 70, 85)
	near := func(name string, got, want, tol float64) {
		if math.Abs(got-want) > tol {
			t.Errorf("%s = %.3f, kutilgan %.3f", name, got, want)
		}
	}
	// 2.3.3-jadval
	near("μyuqori(X1)", r.X1Mu.High, 0.90, 1e-9)
	near("μo'rta(X1)", r.X1Mu.Medium, 0.08, 1e-9)
	near("μo'rta(X2)", r.X2Mu.Medium, 0.40, 1e-9)
	near("μyuqori(X2)", r.X2Mu.High, 0.50, 1e-9)
	near("μyuqori(X3)", r.X3Mu.High, 1.00, 1e-9)
	// Qoidalar faolligi: α1 = 0,50 (yuqori), α2 = 0,40 (o'rta)
	near("yuqori faolligi", r.Output.High, 0.50, 1e-9)
	near("o'rta faolligi", r.Output.Medium, 0.40, 1e-9)
	t.Logf("K = %.4f", r.K)
	near("K", r.K, 70.96, 0.5) // hujjat: ≈ 71 %
}

func TestIntegralBounds(t *testing.T) {
	if k := EvaluateIntegral(100, 100, 100).K; k < 75 {
		t.Errorf("hammasi 100: K=%.2f", k)
	}
	if k := EvaluateIntegral(0, 0, 0).K; k > 20 {
		t.Errorf("hammasi 0: K=%.2f", k)
	}
}

// Kirish fazosining har bir nuqtasida kamida bitta qoida ishlashi va K 0..100 da bo'lishi kerak
func TestIntegralCoversInputSpace(t *testing.T) {
	for a := 0.0; a <= 100; a += 5 {
		for b := 0.0; b <= 100; b += 5 {
			for c := 0.0; c <= 100; c += 5 {
				r := EvaluateIntegral(a, b, c)
				if len(r.Rules) == 0 {
					t.Fatalf("(%.0f,%.0f,%.0f): hech bir qoida ishlamadi", a, b, c)
				}
				if r.K < 0 || r.K > 100 {
					t.Fatalf("(%.0f,%.0f,%.0f): K=%.2f", a, b, c, r.K)
				}
			}
		}
	}
}

// Monotonlik: hamma kirish oshsa K kamaymasligi kerak
func TestIntegralMonotonic(t *testing.T) {
	prev := -1.0
	for v := 0.0; v <= 100; v += 2 {
		k := EvaluateIntegral(v, v, v).K
		if k < prev-1e-6 {
			t.Fatalf("v=%.0f: K=%.3f oldingidan (%.3f) kichik", v, k, prev)
		}
		prev = k
	}
}

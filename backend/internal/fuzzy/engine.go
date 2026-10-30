package fuzzy

import "cyberai-backend/internal/models"

// FuzzyResult holds the result of fuzzy logic evaluation
type FuzzyResult struct {
	Score float64      `json:"score"`
	Level models.Level `json:"level"`
	Rule1 float64      `json:"rule1"`
	Rule2 float64      `json:"rule2"`
	Rule3 float64      `json:"rule3"`
}

// FuzzyWeightsInput holds the input weights
type FuzzyWeightsInput struct {
	Rule1Weight           float64
	Rule2Weight           float64
	Rule3Weight           float64
	BeginnerThreshold     float64
	IntermediateThreshold float64
}

func low(x float64) float64 {
	v := 1 - x/0.5
	if v < 0 {
		return 0
	}
	return v
}

func medium(x float64) float64 {
	v := 1 - abs(x-0.5)/0.5
	if v < 0 {
		return 0
	}
	return v
}

func high(x float64) float64 {
	v := (x - 0.5) / 0.5
	if v < 0 {
		return 0
	}
	return v
}

func abs(x float64) float64 {
	if x < 0 {
		return -x
	}
	return x
}

func min64(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

// Run executes the fuzzy logic engine and returns a FuzzyResult
func Run(knowledge, errors, speed float64, w FuzzyWeightsInput) FuzzyResult {
	rule1Weight := w.Rule1Weight
	rule2Weight := w.Rule2Weight
	rule3Weight := w.Rule3Weight
	beginnerThreshold := w.BeginnerThreshold
	intermediateThreshold := w.IntermediateThreshold

	if rule1Weight == 0 && rule2Weight == 0 && rule3Weight == 0 {
		rule1Weight = 0.2
		rule2Weight = 0.5
		rule3Weight = 0.9
		beginnerThreshold = 0.4
		intermediateThreshold = 0.7
	}

	rule1 := min64(low(knowledge), high(errors))
	rule2 := min64(medium(knowledge), medium(speed))
	rule3 := min64(high(knowledge), low(errors))

	denominator := rule1 + rule2 + rule3 + 0.001
	score := (rule1*rule1Weight + rule2*rule2Weight + rule3*rule3Weight) / denominator

	var level models.Level
	if score < beginnerThreshold {
		level = models.LevelBeginner
	} else if score < intermediateThreshold {
		level = models.LevelIntermediate
	} else {
		level = models.LevelAdvanced
	}

	return FuzzyResult{
		Score: score,
		Level: level,
		Rule1: rule1,
		Rule2: rule2,
		Rule3: rule3,
	}
}

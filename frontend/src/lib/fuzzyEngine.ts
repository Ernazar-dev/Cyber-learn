export interface FuzzyResult {
  score: number;
  level: "Beginner" | "Intermediate" | "Advanced";
  rule1: number;
  rule2: number;
  rule3: number;
}

export interface FuzzyWeights {
  rule1Weight: number;
  rule2Weight: number;
  rule3Weight: number;
  beginnerThreshold: number;
  intermediateThreshold: number;
}

function low(x: number): number {
  return Math.max(0, 1 - x / 0.5);
}

function medium(x: number): number {
  return Math.max(0, 1 - Math.abs(x - 0.5) / 0.5);
}

function high(x: number): number {
  return Math.max(0, (x - 0.5) / 0.5);
}

export function runFuzzyEngine(
  knowledge: number, 
  errors: number, 
  speed: number,
  customWeights?: Partial<FuzzyWeights>
): FuzzyResult {
  const rule1Weight = customWeights?.rule1Weight ?? 0.2;
  const rule2Weight = customWeights?.rule2Weight ?? 0.5;
  const rule3Weight = customWeights?.rule3Weight ?? 0.9;
  const beginnerThreshold = customWeights?.beginnerThreshold ?? 0.4;
  const intermediateThreshold = customWeights?.intermediateThreshold ?? 0.7;

  const rule1 = Math.min(low(knowledge), high(errors));
  const rule2 = Math.min(medium(knowledge), medium(speed));
  const rule3 = Math.min(high(knowledge), low(errors));

  const score = (rule1 * rule1Weight + rule2 * rule2Weight + rule3 * rule3Weight) / (rule1 + rule2 + rule3 + 0.001);

  let level: "Beginner" | "Intermediate" | "Advanced" = "Beginner";
  if (score < beginnerThreshold) {
    level = "Beginner";
  } else if (score < intermediateThreshold) {
    level = "Intermediate";
  } else {
    level = "Advanced";
  }

  return {
    score,
    level,
    rule1,
    rule2,
    rule3,
  };
}

export type FuzzyWeights = {
  rule1Weight: number;
  rule2Weight: number;
  rule3Weight: number;
  beginnerThreshold: number;
  intermediateThreshold: number;
};

/**
 * Membership functions for inputs (Knowledge, Errors, Speed)
 * Maps a crisp input [0, 1] to a degree of membership.
 */
export const membership = {
  low: (x: number) => Math.max(0, 1 - x / 0.5),
  medium: (x: number) => Math.max(0, 1 - Math.abs(x - 0.5) / 0.5),
  high: (x: number) => Math.max(0, (x - 0.5) / 0.5),
};

export function calculateAdaptiveScore(k: number, e: number, s: number, w: FuzzyWeights) {
  // Fuzzy Inference Rules (Mamdani style)
  const r1 = Math.min(membership.low(k), membership.high(s)); // Low knowledge + High speed = Potential guessing
  const r2 = Math.min(membership.medium(k), membership.medium(e)); // Average performance
  const r3 = Math.min(membership.high(k), membership.low(s)); // High knowledge + Low speed = Careful expert

  // Defuzzification using Weighted Average
  const numerator = (r1 * w.rule1Weight) + (r2 * w.rule2Weight) + (r3 * w.rule3Weight);
  const denominator = r1 + r2 + r3 + 0.001; 
  const score = numerator / denominator;

  let level: 'Beginner' | 'Intermediate' | 'Advanced' = 'Beginner';
  if (score >= w.intermediateThreshold) level = 'Advanced';
  else if (score >= w.beginnerThreshold) level = 'Intermediate';

  return { score, level, firingStrengths: { r1, r2, r3 } };
}
import type { Dimension } from '@/lib/scoring-engine-v2';
import { DIMENSION_KEYS, type DimensionKey } from '@/lib/user-data';

/**
 * Recompute a coin's AI score using custom dimension weights.
 *
 * The original `dimensions[i].coefficient` (ML-optimized) is replaced by the
 * user's weight. Because each `dimension.score` is already in the 1-10 range
 * and the custom weights sum to 1, the resulting weighted sum stays inside
 * the 1-10 range. We still clamp + guard NaN/Infinity for safety.
 *
 * @param dimensions   - The coin's 12-dimension breakdown (1-10 scores).
 * @param customWeights - User-defined weights keyed by dimension key (0..1, sum=1).
 * @returns Recomputed AI score in the 1-10 range. Returns 5 (neutral) if NaN.
 */
export function recomputeScore(
  dimensions: Dimension[],
  customWeights: Record<DimensionKey, number>
): number {
  let score = 0;
  let totalWeight = 0;

  for (const dim of dimensions) {
    const w = customWeights[dim.key as DimensionKey] ?? 0;
    if (!Number.isFinite(w)) continue;
    score += dim.score * w;
    totalWeight += w;
  }

  // If no weights matched (e.g. unknown dimension keys), fall back to neutral.
  if (totalWeight <= 0) {
    return 5;
  }

  // Guard NaN / Infinity (shouldn't happen because weights are normalized, but safe).
  if (!Number.isFinite(score) || Number.isNaN(score)) {
    return 5;
  }

  // Clamp to 1-10 range.
  return Math.max(1, Math.min(10, score));
}

/**
 * Build a default-weights record (equal weights across all 12 dimensions).
 * Useful as a fallback when the store is not yet hydrated.
 */
export function equalWeights(): Record<DimensionKey, number> {
  const w = {} as Record<DimensionKey, number>;
  for (const k of DIMENSION_KEYS) w[k] = 1 / DIMENSION_KEYS.length;
  return w;
}

/**
 * Recompute scores for many coins in one pass.
 */
export function recomputeScores(
  coins: { dimensions: Dimension[] }[],
  customWeights: Record<DimensionKey, number>
): number[] {
  return coins.map((c) => recomputeScore(c.dimensions, customWeights));
}

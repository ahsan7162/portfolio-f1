// The sum behind the OpenUI demo's ranking, kept apart from the component so it can be tested.
export const MAX = 5;

/** An option's share of the best possible score under these weights, 0 to 100. With every weight at 0 nothing can lead: 0. */
export function weighted(scores: readonly number[], weights: readonly number[]) {
  const total = weights.reduce((a, w) => a + w, 0);
  return total ? Math.round((scores.reduce((a, s, i) => a + s * (weights[i] ?? 0), 0) / (MAX * total)) * 100) : 0;
}

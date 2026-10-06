/**
 * Budget arithmetic (Claude final spec, §D / Phase 10).
 * The product communicates a COST CEILING, never a guaranteed exact cost.
 *
 * Pure functions — no I/O. The backend ledger uses the same math;
 * the UI uses it for plan-review ceilings. One implementation, two consumers.
 */

export interface RateCard {
  /** USD per 1M input tokens */
  inputPerMillion: number;
  /** USD per 1M output tokens */
  outputPerMillion: number;
}

/**
 * Worst-case cost for one model call:
 *   inputTokens × input price + maxOutputTokens × output price.
 * The reservation step reserves this amount atomically before the call.
 */
export function worstCaseCost(inputTokens: number, maxOutputTokens: number, rates: RateCard): number {
  if (inputTokens < 0 || maxOutputTokens < 0) throw new Error('token counts must be non-negative');
  return (inputTokens / 1e6) * rates.inputPerMillion + (maxOutputTokens / 1e6) * rates.outputPerMillion;
}

/** True if reserving `amount` keeps total reserved within `ceiling`. */
export function canReserve(reserved: number, ceiling: number, amount: number): boolean {
  return reserved + amount <= ceiling;
}

/** Settle after a call: reserved drops by the worst-case hold, spent rises by actual. */
export function settle(reserved: number, spent: number, held: number, actual: number): { reserved: number; spent: number } {
  if (held < actual) throw new Error('actual cost cannot exceed the held reservation');
  return { reserved: reserved - held, spent: spent + actual };
}

export function formatUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

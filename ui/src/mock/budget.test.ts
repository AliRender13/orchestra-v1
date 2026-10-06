import { describe, it, expect } from 'vitest';
import { worstCaseCost, canReserve, settle, formatUsd } from './budget';

const RATES = { inputPerMillion: 3, outputPerMillion: 15 };

describe('worstCaseCost — the ceiling, not an estimate', () => {
  it('computes input × price + maxOutput × price', () => {
    // 30k input @ $3/M + 3k max output @ $15/M = 0.09 + 0.045
    expect(worstCaseCost(30000, 3000, RATES)).toBeCloseTo(0.135, 6);
  });

  it('is zero for zero tokens', () => {
    expect(worstCaseCost(0, 0, RATES)).toBe(0);
  });

  it('rejects negative token counts', () => {
    expect(() => worstCaseCost(-1, 0, RATES)).toThrow();
  });
});

describe('canReserve', () => {
  it('allows reservations within the ceiling', () => {
    expect(canReserve(3.12, 10, 0.135)).toBe(true);
  });

  it('blocks reservations that would exceed the ceiling', () => {
    expect(canReserve(9.95, 10, 0.135)).toBe(false);
  });

  it('allows exact-fit reservations', () => {
    expect(canReserve(9.865, 10, 0.135)).toBe(true);
  });
});

describe('settle', () => {
  it('releases the hold and records actual spend', () => {
    const s = settle(3.255, 3.12, 0.135, 0.09);
    expect(s.reserved).toBeCloseTo(3.12, 6);
    expect(s.spent).toBeCloseTo(3.21, 6);
  });

  it('rejects actual cost above the held reservation', () => {
    expect(() => settle(1, 0, 0.135, 0.2)).toThrow();
  });
});

describe('formatUsd', () => {
  it('formats to two decimals', () => {
    expect(formatUsd(4.2)).toBe('$4.20');
  });
});

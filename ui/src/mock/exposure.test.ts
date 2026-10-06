import { describe, it, expect } from 'vitest';
import { checkExposure, validatePlanExposure } from './exposure';

describe('checkExposure — network × private-data rule', () => {
  it('rejects a task holding both network and private data', () => {
    const r = checkExposure({ network: true, privateData: true });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/split/i);
  });

  it('accepts network-only gather tasks', () => {
    expect(checkExposure({ network: true, privateData: false }).ok).toBe(true);
  });

  it('accepts private-data-only synthesis tasks', () => {
    expect(checkExposure({ network: false, privateData: true }).ok).toBe(true);
  });

  it('rejects a task with neither (it could observe nothing)', () => {
    expect(checkExposure({ network: false, privateData: false }).ok).toBe(false);
  });
});

describe('validatePlanExposure', () => {
  it('reports violating task ids', () => {
    const r = validatePlanExposure([
      { id: 't-ok', network: true, privateData: false },
      { id: 't-bad', network: true, privateData: true },
    ]);
    expect(r.ok).toBe(false);
    expect(r.violations).toEqual(['t-bad']);
  });

  it('passes a clean plan', () => {
    const r = validatePlanExposure([
      { id: 't-1', network: true, privateData: false },
      { id: 't-2', network: false, privateData: true },
    ]);
    expect(r.ok).toBe(true);
    expect(r.violations).toEqual([]);
  });
});

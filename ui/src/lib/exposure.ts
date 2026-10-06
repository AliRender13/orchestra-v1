/**
 * Exposure rule (Claude final spec, §B1 / Phase 8):
 * A task must not simultaneously hold NETWORK access and PRIVATE WORKSPACE DATA
 * access. Research happens in "gather" tasks (network only, public inputs);
 * synthesis happens in separate tasks (workspace data, no network).
 *
 * Pure function — no I/O. The backend plan validator calls this; the UI calls
 * it to render exposure manifests. One implementation, two consumers.
 */

export interface Exposure {
  network: boolean;
  privateData: boolean;
}

export interface ExposureCheck {
  ok: boolean;
  reason: string;
}

export function checkExposure(e: Exposure): ExposureCheck {
  if (e.network && e.privateData) {
    return {
      ok: false,
      reason:
        'Task holds both network access and private workspace data. Split into a gather task (network only) and a synthesis task (workspace data only).',
    };
  }
  if (!e.network && !e.privateData) {
    return {
      ok: false,
      reason: 'Task has neither network nor workspace data access — it cannot observe anything. Check the task definition.',
    };
  }
  return { ok: true, reason: 'Exposure boundary respected.' };
}

/** Validate every task in a plan; returns the failing task ids. */
export function validatePlanExposure(tasks: ({ id: string } & Exposure)[]): { ok: boolean; violations: string[] } {
  const violations = tasks.filter((t) => !checkExposure(t).ok).map((t) => t.id);
  return { ok: violations.length === 0, violations };
}

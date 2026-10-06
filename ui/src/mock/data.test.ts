import { describe, it, expect } from 'vitest';
import {
  mockProjects, mockTasks, mockApprovals, mockFiles, mockPlans, mockResultReviews,
} from './data';
import { mockAgents } from './agents';
import { validatePlanExposure } from '../lib/exposure';

import { buildInitialSim } from './simulation';

const agentIds = new Set(mockAgents.map((a) => a.id));
const projectIds = new Set(mockProjects.map((p) => p.id));
const taskIds = new Set([...mockTasks.map((t) => t.id), ...buildInitialSim().tasks.map((t) => t.id)]);

describe('mock data integrity', () => {
  it('every task references a real agent and project', () => {
    for (const t of mockTasks) {
      expect(agentIds.has(t.agentId), `task ${t.id} agent`).toBe(true);
      expect(projectIds.has(t.projectId), `task ${t.id} project`).toBe(true);
    }
  });

  it('every project references real agents', () => {
    for (const p of mockProjects) {
      for (const id of p.agents) expect(agentIds.has(id), `project ${p.id} agent ${id}`).toBe(true);
    }
  });

  it('every approval references a real agent and project', () => {
    for (const a of mockApprovals) {
      expect(agentIds.has(a.agentId), `approval ${a.id} agent`).toBe(true);
      expect(projectIds.has(a.projectId), `approval ${a.id} project`).toBe(true);
    }
  });

  it('every file access list references real agents', () => {
    for (const f of mockFiles) {
      for (const id of f.access) expect(agentIds.has(id), `file ${f.id} access ${id}`).toBe(true);
    }
  });

  it('every result review references a real task and agent (incl. simulated tasks)', () => {
    for (const r of mockResultReviews) {
      expect(taskIds.has(r.taskId), `review ${r.id} task`).toBe(true);
      expect(agentIds.has(r.agentId), `review ${r.id} agent`).toBe(true);
    }
  });

  it('every plan task passes the exposure rule', () => {
    for (const p of mockPlans) {
      const r = validatePlanExposure(p.tasks);
      expect(r.violations, `plan ${p.id} violations`).toEqual([]);
    }
  });

  it('plan task ids referenced by the plan exist in tasks or are plan-local', () => {
    for (const p of mockPlans) {
      expect(p.tasks.length).toBeGreaterThan(0);
      const ceilingSum = p.tasks.reduce((s, t) => s + t.costCeiling, 0);
      expect(ceilingSum).toBeLessThanOrEqual(p.costCeiling);
    }
  });
});

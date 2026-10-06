import { describe, it, expect } from 'vitest';
import {
  buildInitialSim, simReducer, taskCounts, overallProgress, formatAgo, agentWorkStatus,
} from './simulation';

describe('simulation initial state', () => {
  it('starts active with the 4-task golden-path mix', () => {
    const s = buildInitialSim();
    expect(s.projectStatus).toBe('active');
    const c = taskCounts(s.tasks);
    expect(c.completed).toBe(1);   // s-r1
    expect(c.running).toBe(1);     // s-r2
    expect(c.ready).toBe(1);       // s-r3
    expect(c.pending).toBe(1);     // s-s1
    expect(c.waiting_approval).toBe(0);
    expect(c.failed).toBe(0);
    expect(s.tasks.length).toBe(4);
  });

  it('every task references a known agent and resolvable dependencies', () => {
    const s = buildInitialSim();
    const ids = new Set(s.tasks.map((t) => t.id));
    for (const t of s.tasks) {
      expect(t.agentId).toMatch(/^a-/);
      for (const d of t.dependsOn) expect(ids.has(d), `${t.id} dep ${d}`).toBe(true);
    }
  });

  it('overall progress counts completed tasks', () => {
    expect(overallProgress(buildInitialSim().tasks)).toBe(25); // 1/4
  });
});

describe('simReducer TICK', () => {
  it('advances running task progress deterministically', () => {
    let s = buildInitialSim();
    const before = s.tasks.find((t) => t.id === 's-r2')!.progress;
    s = simReducer(s, { type: 'TICK' });
    expect(s.tasks.find((t) => t.id === 's-r2')!.progress).toBe(before + 8);
    expect(s.elapsedSec).toBe(5);
  });

  it('completes a task at 100 and emits an event', () => {
    let s = buildInitialSim();
    // s-r2 at 62 + 8/tick → 5 ticks to finish
    for (let i = 0; i < 5; i++) s = simReducer(s, { type: 'TICK' });
    const t = s.tasks.find((x) => x.id === 's-r2')!;
    expect(t.status).toBe('completed');
    expect(t.progress).toBe(100);
    expect(s.events.some((e) => e.kind === 'complete' && e.text.includes('research crewai'))).toBe(true);
  });

  it('promotes a ready task when a slot frees and deps are done', () => {
    let s = buildInitialSim();
    for (let i = 0; i < 5; i++) s = simReducer(s, { type: 'TICK' });
    // s-r2 finished on tick 5; the freed slot goes to s-r3 (deps: s-r1 completed)
    expect(s.tasks.find((x) => x.id === 's-r3')!.status).toBe('running');
    expect(s.events.some((e) => e.kind === 'start' && e.text.includes('openai agents sdk'))).toBe(true);
  });

  it('promotes a pending task to ready when its deps complete, then starts it', () => {
    let s = buildInitialSim();
    for (let i = 0; i < 5; i++) s = simReducer(s, { type: 'TICK' });
    // s-r2 done; s-s1 still pending (s-r3 not done yet)
    expect(s.tasks.find((x) => x.id === 's-s1')!.status).toBe('pending');
    // s-r3 at 0 + 9/tick → 12 more ticks to finish
    for (let i = 0; i < 12; i++) s = simReducer(s, { type: 'TICK' });
    expect(s.tasks.find((x) => x.id === 's-r3')!.status).toBe('completed');
    const s1 = s.tasks.find((x) => x.id === 's-s1')!;
    expect(s1.status).toBe('running'); // pending → ready → running in the same tick
    expect(s.events.some((e) => e.kind === 'system' && e.text.includes('is ready'))).toBe(true);
  });

  it('does nothing when the project is paused', () => {
    let s = simReducer(buildInitialSim(), { type: 'PAUSE_PROJECT' });
    const snap = JSON.stringify(s.tasks.map((t) => t.progress));
    s = simReducer(s, { type: 'TICK' });
    expect(JSON.stringify(s.tasks.map((t) => t.progress))).toBe(snap);
    expect(s.elapsedSec).toBe(0);
  });

  it('caps concurrent running tasks at 2', () => {
    let s = buildInitialSim();
    for (let i = 0; i < 40; i++) s = simReducer(s, { type: 'TICK' });
    expect(s.tasks.filter((t) => t.status === 'running').length).toBeLessThanOrEqual(2);
  });
});

describe('simReducer controls', () => {
  it('pause/resume round-trips', () => {
    let s = simReducer(buildInitialSim(), { type: 'PAUSE_PROJECT' });
    expect(s.projectStatus).toBe('paused');
    s = simReducer(s, { type: 'RESUME_PROJECT' });
    expect(s.projectStatus).toBe('active');
  });

  it('cancel stops the clock', () => {
    let s = simReducer(buildInitialSim(), { type: 'CANCEL_PROJECT' });
    expect(s.projectStatus).toBe('cancelled');
    s = simReducer(s, { type: 'TICK' });
    expect(s.elapsedSec).toBe(0);
  });

  it('retry on a non-failed task is a no-op', () => {
    const s0 = buildInitialSim();
    expect(simReducer(s0, { type: 'RETRY_TASK', id: 's-r2' })).toBe(s0);
  });

  it('approve on a non-waiting task is a no-op', () => {
    const s0 = buildInitialSim();
    expect(simReducer(s0, { type: 'APPROVE_TASK', id: 's-r1' })).toBe(s0);
  });

  it('ignores invalid transitions', () => {
    const s0 = buildInitialSim();
    expect(simReducer(s0, { type: 'RETRY_TASK', id: 's-r1' })).toBe(s0);
    expect(simReducer(s0, { type: 'APPROVE_TASK', id: 's-r2' })).toBe(s0);
  });
});

describe('selectors', () => {
  it('formatAgo renders friendly times', () => {
    expect(formatAgo(100, 95)).toBe('just now');
    expect(formatAgo(100, 70)).toBe('30 sec ago');
    expect(formatAgo(600, 120)).toBe('8 min ago');
    expect(formatAgo(7200, 0)).toBe('2 hr ago');
  });

  it('agentWorkStatus derives from tasks', () => {
    const s = buildInitialSim();
    expect(agentWorkStatus(s.tasks, 'a-research')).toBe('working');
    expect(agentWorkStatus(s.tasks, 'a-synthesis')).toBe('waiting');
    expect(agentWorkStatus(s.tasks, 'a-planner')).toBe('done');
  });
});

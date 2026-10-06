// ── Orchestra · mock execution engine ────────────────────────────────
// Frontend/demo ONLY. A deterministic reducer that simulates a live run:
// tasks advance waiting → ready → running → completed, activity events are
// appended, agent statuses derive from their tasks, project progress updates.
//
// The state shape mirrors the future backend run model so the real API can
// replace this 1:1. No randomness — every tick is deterministic and testable.

import type { ActivityEvent, Project, Task, TaskStatus } from '../types';

export const TICK_SEC = 5;

export interface SimArtifact { name: string; type: string }

export interface SimTask extends Task {
  progress: number;            // 0–100
  startedAt: string | null;
  elapsedSec: number;
  currentStep: string;
  stepPhrases: string[];
  tickStep: number;            // progress points per tick (deterministic)
  dependsOn: string[];
  artifacts: SimArtifact[];
  failureReason?: string;
}

export type SimProjectStatus = 'active' | 'paused' | 'cancelled' | 'completed';

export interface SimEvent extends ActivityEvent { atSec: number }

export interface SimState {
  projectId: string;
  projectStatus: SimProjectStatus;
  tasks: SimTask[];
  events: SimEvent[];
  elapsedSec: number;   // sim clock; event times are relative to it
  tickCount: number;
  seq: number;          // event id counter
}

export type SimAction =
  | { type: 'TICK' }
  | { type: 'PAUSE_PROJECT' }
  | { type: 'RESUME_PROJECT' }
  | { type: 'CANCEL_PROJECT' }
  | { type: 'RETRY_TASK'; id: string }
  | { type: 'PAUSE_TASK'; id: string }
  | { type: 'RESUME_TASK'; id: string }
  | { type: 'APPROVE_TASK'; id: string };

const P = 'p-research';

function T(
  id: string, name: string, agentId: string, status: TaskStatus,
  extra: Partial<SimTask> = {},
): SimTask {
  return {
    id, projectId: P, name, agentId, status,
    priority: 'medium', createdAt: 'today', costUsd: 0.2, tokens: 12000,
    progress: status === 'completed' ? 100 : 0,
    startedAt: status === 'completed' || status === 'running' ? 'earlier today' : null,
    elapsedSec: 0, currentStep: '', stepPhrases: [], tickStep: 8,
    dependsOn: [], artifacts: [],
    ...extra,
  };
}

export function buildInitialSim(): SimState {
  const tasks: SimTask[] = [
    T('s-r1', 'Research LangGraph architecture', 'a-research', 'completed',
      { priority: 'high', result: '12-page brief with 18 cited sources. Claims checked against primary docs.',
        costUsd: 0.42, tokens: 28400,
        artifacts: [{ name: 'langgraph-brief.md', type: 'doc' }, { name: 'sources.json', type: 'data' }] }),
    T('s-r2', 'Research CrewAI and AutoGen', 'a-research', 'running',
      { priority: 'high', progress: 62, currentStep: 'Reading CrewAI docs…', dependsOn: ['s-r1'],
        stepPhrases: ['Reading CrewAI docs…', 'Mapping AutoGen patterns…', 'Writing comparison notes…'],
        tickStep: 8, costUsd: 0.31, tokens: 21300 }),
    T('s-r3', 'Research OpenAI Agents SDK', 'a-research', 'ready',
      { dependsOn: ['s-r1'], currentStep: 'Queued — starts when a worker is free.',
        stepPhrases: ['Reading Agents SDK docs…', 'Noting guardrail gaps…'],
        tickStep: 9, costUsd: 0.24, tokens: 16900 }),
    T('s-s1', 'Synthesize comparison matrix', 'a-synthesis', 'pending',
      { priority: 'high', dependsOn: ['s-r1', 's-r2', 's-r3'],
        currentStep: 'Waiting on research tasks.',
        stepPhrases: ['Combining research briefs…', 'Scoring the matrix…', 'Drafting the recommendation…'],
        tickStep: 10, costUsd: 0.35, tokens: 24000 }),
  ];

  const events: SimEvent[] = [
    { id: 'ev-0', runId: 'run-8f3a', time: '', kind: 'plan', agentId: 'a-planner', text: 'Plan v3 approved — 4 tasks, ceiling $2.50', atSec: -7200 },
    { id: 'ev-1', runId: 'run-8f3a', time: '', kind: 'complete', agentId: 'a-research', text: 'Completed LangGraph architecture research', atSec: -1500 },
    { id: 'ev-2', runId: 'run-8f3a', time: '', kind: 'start', agentId: 'a-research', text: 'Started researching CrewAI and AutoGen', atSec: -400 },
    { id: 'ev-3', runId: 'run-8f3a', time: '', kind: 'system', text: 'Budget reserved: $0.31 / $2.50 ceiling', atSec: -380 },
    { id: 'ev-4', runId: 'run-8f3a', time: '', kind: 'handoff', agentId: 'a-synthesis', text: 'Orchestrator passed research brief to Synthesis', atSec: -2900 },
  ];

  return { projectId: P, projectStatus: 'active', tasks, events, elapsedSec: 0, tickCount: 0, seq: 5 };
}

/* ── selectors ─────────────────────────────────────────────────────── */

export function taskCounts(tasks: SimTask[]): Record<TaskStatus, number> {
  const c = { pending: 0, ready: 0, running: 0, paused: 0, waiting_approval: 0, completed: 0, failed: 0 };
  for (const t of tasks) c[t.status] += 1;
  return c;
}

export function overallProgress(tasks: SimTask[]): number {
  if (!tasks.length) return 0;
  return Math.round((tasks.filter((t) => t.status === 'completed').length / tasks.length) * 100);
}

export function formatAgo(nowSec: number, atSec: number): string {
  const d = Math.max(0, nowSec - atSec);
  if (d < 10) return 'just now';
  if (d < 60) return `${d} sec ago`;
  const m = Math.floor(d / 60);
  if (m < 60) return `${m} min ago`;
  return `${Math.floor(m / 60)} hr ago`;
}

export type AgentWorkStatus = 'working' | 'waiting' | 'done';

export function agentWorkStatus(tasks: SimTask[], agentId: string): AgentWorkStatus {  const mine = tasks.filter((t) => t.agentId === agentId);
  if (!mine.length) return 'done';
  if (mine.some((t) => t.status === 'running')) return 'working';
  if (mine.every((t) => t.status === 'completed' || t.status === 'waiting_approval')) return 'done';
  return 'waiting';
}

/* ── reducer ───────────────────────────────────────────────────────── */

function pushEvent(s: SimState, e: Omit<SimEvent, 'id' | 'atSec' | 'time'>): SimState {
  const ev: SimEvent = { ...e, id: `ev-${s.seq}`, atSec: s.elapsedSec, time: '' };
  return { ...s, seq: s.seq + 1, events: [ev, ...s.events].slice(0, 60) };
}

function depsComplete(tasks: SimTask[], t: SimTask): boolean {
  const done = new Set(tasks.filter((x) => x.status === 'completed').map((x) => x.id));
  return t.dependsOn.every((d) => done.has(d));
}

export function simReducer(s: SimState, a: SimAction): SimState {
  switch (a.type) {
    case 'TICK': {
      if (s.projectStatus !== 'active') return s;
      let next: SimState = { ...s, elapsedSec: s.elapsedSec + TICK_SEC, tickCount: s.tickCount + 1 };
      const running = next.tasks.filter((t) => t.status === 'running');
      if (!running.length) return next;

      let tasks = next.tasks.map((t) => {
        if (t.status !== 'running') return t;
        const progress = Math.min(100, t.progress + t.tickStep);
        const phraseIdx = Math.floor(next.tickCount / 2) % Math.max(1, t.stepPhrases.length);
        return {
          ...t,
          progress,
          elapsedSec: t.elapsedSec + TICK_SEC,
          currentStep: t.stepPhrases.length ? t.stepPhrases[phraseIdx] : t.currentStep,
          status: progress >= 100 ? ('completed' as TaskStatus) : t.status,
          result: progress >= 100 ? (t.result ?? 'Completed successfully.') : t.result,
          artifacts: progress >= 100 && !t.artifacts.length
            ? [{ name: `${t.id}-output.md`, type: 'doc' }]
            : t.artifacts,
        };
      });

      next = { ...next, tasks };

      // completions this tick
      const completedNow = tasks.filter(
        (t) => t.status === 'completed' && s.tasks.find((o) => o.id === t.id)?.status === 'running',
      );
      for (const t of completedNow) {
        next = pushEvent(next, { runId: 'run-8f3a', kind: 'complete', agentId: t.agentId, text: `Completed ${t.name.toLowerCase()}` });
      }

      // newly unblocked: pending → ready
      const unblocked = next.tasks.filter((t) => t.status === 'pending' && depsComplete(next.tasks, t));
      for (const u of unblocked) {
        next = {
          ...next,
          tasks: next.tasks.map((t) =>
            t.id === u.id ? { ...t, status: 'ready' as TaskStatus, currentStep: 'Queued — starts when a worker is free.' } : t,
          ),
        };
        next = pushEvent(next, { runId: 'run-8f3a', kind: 'system', text: `${u.name} is ready — queued` });
      }

      // promote ready tasks (max 2 concurrent running)
      const runningCount = next.tasks.filter((t) => t.status === 'running').length;
      let slots = Math.max(0, 2 - runningCount);
      if (slots > 0) {
        const promotable = next.tasks.filter((t) => t.status === 'ready' && depsComplete(next.tasks, t));
        for (const p of promotable.slice(0, slots)) {
          tasks = next.tasks.map((t) =>
            t.id === p.id
              ? { ...t, status: 'running' as TaskStatus, startedAt: 'just now', currentStep: t.stepPhrases[0] ?? 'Starting…' }
              : t,
          );
          next = { ...next, tasks };
          next = pushEvent(next, { runId: 'run-8f3a', kind: 'start', agentId: p.agentId, text: `Started ${p.name.toLowerCase()}` });
        }
      }

      // flavor: checkpoint heartbeat every 4th tick on the first running task
      if (next.tickCount % 4 === 0) {
        const r = next.tasks.find((t) => t.status === 'running');
        if (r) next = pushEvent(next, { runId: 'run-8f3a', kind: 'system', agentId: r.agentId, text: `Checkpoint saved · ${r.progress}% · budget holding` });
      }

      // project completes when nothing is left active
      const activeLeft = next.tasks.some((t) => ['running', 'ready', 'pending', 'paused'].includes(t.status));
      if (!activeLeft && next.projectStatus === 'active') {
        next = { ...next, projectStatus: 'completed' };
        next = pushEvent(next, { runId: 'run-8f3a', kind: 'system', text: 'All tasks finished — project ready for final review' });
      }
      return next;
    }

    case 'PAUSE_PROJECT':
      if (s.projectStatus !== 'active') return s;
      return pushEvent({ ...s, projectStatus: 'paused' },
        { runId: 'run-8f3a', kind: 'system', text: 'You paused the project — workers stopped after current steps' });

    case 'RESUME_PROJECT':
      if (s.projectStatus !== 'paused') return s;
      return pushEvent({ ...s, projectStatus: 'active' },
        { runId: 'run-8f3a', kind: 'system', text: 'You resumed the project' });

    case 'CANCEL_PROJECT':
      if (s.projectStatus === 'cancelled' || s.projectStatus === 'completed') return s;
      return pushEvent({ ...s, projectStatus: 'cancelled' },
        { runId: 'run-8f3a', kind: 'system', text: 'You cancelled the project — no further tasks will run' });

    case 'RETRY_TASK': {
      const t = s.tasks.find((x) => x.id === a.id);
      if (!t || t.status !== 'failed') return s;
      const tasks = s.tasks.map((x) =>
        x.id === a.id ? { ...x, status: 'ready' as TaskStatus, progress: 0, failureReason: undefined, currentStep: 'Queued for retry.' } : x,
      );
      return pushEvent({ ...s, tasks },
        { runId: 'run-8f3a', kind: 'start', agentId: t.agentId, text: `You retried ${t.name.toLowerCase()} — queued again` });
    }

    case 'PAUSE_TASK': {
      const t = s.tasks.find((x) => x.id === a.id);
      if (!t || t.status !== 'running') return s;
      return { ...s, tasks: s.tasks.map((x) => (x.id === a.id ? { ...x, status: 'paused' as TaskStatus } : x)) };
    }

    case 'RESUME_TASK': {
      const t = s.tasks.find((x) => x.id === a.id);
      if (!t || t.status !== 'paused') return s;
      return { ...s, tasks: s.tasks.map((x) => (x.id === a.id ? { ...x, status: 'running' as TaskStatus } : x)) };
    }

    case 'APPROVE_TASK': {
      const t = s.tasks.find((x) => x.id === a.id);
      if (!t || t.status !== 'waiting_approval') return s;
      const tasks = s.tasks.map((x) => (x.id === a.id ? { ...x, status: 'completed' as TaskStatus } : x));
      let next = pushEvent({ ...s, tasks },
        { runId: 'run-8f3a', kind: 'approval', agentId: t.agentId, text: `You approved ${t.name.toLowerCase()}` });
      // approving may unblock dependents
      const ready = next.tasks.filter((x) => x.status === 'pending' && depsComplete(next.tasks, x));
      if (ready.length) {
        next = { ...next, tasks: next.tasks.map((x) => (ready.some((r) => r.id === x.id) ? { ...x, status: 'ready' as TaskStatus, currentStep: 'Queued — starts when a worker is free.' } : x)) };
      }
      return next;
    }

    default:
      return s;
  }
}

/* ── live project snapshot for cards ─────────────────────────────────── */

/** Overlay simulated numbers onto the static project so cards stay coherent. */
export function simProjectSnapshot(base: Project, s: SimState): Project {
  const c = taskCounts(s.tasks);
  const latest = s.events[0];
  return {
    ...base,
    status: s.projectStatus === 'cancelled' ? 'cancelled' : s.projectStatus === 'completed' ? 'completed' : base.status,
    progress: overallProgress(s.tasks),
    taskCounts: {
      pending: c.pending, ready: c.ready, running: c.running, paused: c.paused,
      waiting_approval: c.waiting_approval, completed: c.completed, failed: c.failed,
    },
    lastActivity: latest ? latest.text : base.lastActivity,
    lastActivityAt: latest ? formatAgo(s.elapsedSec, latest.atSec) : base.lastActivityAt,
  };
}

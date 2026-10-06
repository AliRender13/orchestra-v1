/* useRealProject — backend-backed project state for the V1 vertical slice.

It adapts the REST API into the SAME shapes the frozen UI already renders
(SimState / SimTask / SimEvent), so no screen, style, or reducer rule had
to change. The mock simulation (SimulationContext) is untouched and still
drives the demo project.

Polling every 5s replaces the worker's server-side progress with fresh
snapshots. Controls map 1:1 onto backend endpoints.
*/
import React from 'react';
import { api } from '../lib/api';
import type { ApiRun, ApiTask, ApiEvent } from '../lib/api';
import type { SimState, SimTask, SimEvent, SimAction, SimProjectStatus } from '../mock/simulation';
import type { TaskStatus } from '../types';

const ROLE_TO_AGENT: Record<string, string> = {
  Planner: 'a-planner',
  Research: 'a-research',
  Synthesis: 'a-synthesis',
};

const KIND_TO_AGENT: Record<string, string> = {
  research: 'a-research',
  synthesis: 'a-synthesis',
};

function mapTask(t: ApiTask): SimTask {
  const status = t.status as TaskStatus;
  return {
    id: t.id,
    projectId: t.project_id,
    name: t.name,
    agentId: KIND_TO_AGENT[t.kind] ?? 'a-research',
    status,
    priority: 'medium',
    createdAt: '',
    costUsd: t.cost_usd,
    tokens: t.input_tokens + t.output_tokens,
    result: t.result ?? undefined,
    progress: t.progress,
    startedAt: null,
    elapsedSec: 0,
    currentStep:
      t.status === 'running' ? 'Working…' :
      t.status === 'failed' ? (t.failure_reason ?? 'Failed.') :
      t.status === 'completed' ? 'Done.' : 'Queued.',
    stepPhrases: [],
    tickStep: 0,
    dependsOn: t.depends_on ?? [],
    artifacts: (t.artifacts ?? []).map((a) => ({ name: a.name, type: a.type as 'doc' })),
    failureReason: t.failure_reason ?? undefined,
  };
}

function mapEvent(e: ApiEvent): SimEvent {
  const kind = (e.kind === 'error' ? 'system' : e.kind) as SimEvent['kind'];
  return {
    id: e.id,
    runId: 'run-live',
    time: new Date(e.created_at).toLocaleString(),
    kind,
    agentId: e.role ? ROLE_TO_AGENT[e.role] : undefined,
    text: e.text,
    atSec: 0,
  };
}

function mapProjectStatus(s: string): SimProjectStatus {
  if (s === 'paused') return 'paused';
  if (s === 'completed') return 'completed';
  if (s === 'cancelled' || s === 'failed') return 'cancelled';
  return 'active'; // draft / awaiting_plan render as the live workspace
}

function emptySim(projectId: string): SimState {
  return { projectId, projectStatus: 'active', tasks: [], events: [], elapsedSec: 0, tickCount: 0, seq: 0 };
}

export interface RealProject {
  sim: SimState;
  run: ApiRun | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  dispatch: (action: SimAction) => void;
  approve: (approvalId: string) => Promise<void>;
  reject: (approvalId: string, note?: string) => Promise<void>;
}

export function useRealProject(projectId: string | null): RealProject {
  const [run, setRun] = React.useState<ApiRun | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (!projectId) return;
    try {
      const r = await api.getRun(projectId);
      setRun(r);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Backend unreachable.');
    }
  }, [projectId]);

  React.useEffect(() => {
    if (!projectId) return;
    refresh();
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [projectId, refresh]);

  const dispatch = React.useCallback((action: SimAction) => {
    if (!projectId) return;
    (async () => {
      try {
        switch (action.type) {
          case 'TICK': break;
          case 'PAUSE_PROJECT': await api.pauseProject(projectId); break;
          case 'RESUME_PROJECT': await api.resumeProject(projectId); break;
          case 'CANCEL_PROJECT': await api.cancelProject(projectId); break;
          case 'RETRY_TASK': await api.retryTask(action.id); break;
          case 'PAUSE_TASK': await api.pauseTask(action.id); break;
          case 'RESUME_TASK': await api.resumeTask(action.id); break;
          case 'APPROVE_TASK': break; // no task-level approvals in V1
        }
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Backend unreachable.');
      }
    })();
  }, [projectId, refresh]);

  const approve = React.useCallback(async (approvalId: string) => {
    await api.approveApproval(approvalId);
    await refresh();
  }, [refresh]);

  const reject = React.useCallback(async (approvalId: string, note = '') => {
    await api.rejectApproval(approvalId, note);
    await refresh();
  }, [refresh]);

  const sim: SimState = React.useMemo(() => {
    if (!projectId) return emptySim('');
    if (!run) return emptySim(projectId);
    return {
      projectId,
      projectStatus: mapProjectStatus(run.project.status),
      tasks: run.tasks.map(mapTask),
      events: run.events.map(mapEvent),
      elapsedSec: 0,
      tickCount: 0,
      seq: run.events.length,
    };
  }, [projectId, run]);

  return { sim, run, loading: !!projectId && !run && !error, error, refresh, dispatch, approve, reject };
}

/* Orchestra V1 API client — the ONLY place the frontend talks to the backend.
   Provider keys never leave the server; this client only sends objectives,
   approvals, and control commands. */

const win = typeof window !== 'undefined' ? window as unknown as { ORCHESTRA_API_URL?: string } : {};
const BASE =
  win.ORCHESTRA_API_URL ||
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL ||
  'http://localhost:8000';

export interface ApiProject {
  id: string; objective: string; status: string;
  budget_ceiling_usd: number; budget_spent_usd: number; created_at: string;
}
export interface ApiPlanTask {
  name: string; kind: string; purpose: string;
  network: boolean; privateData: boolean; tools: string[]; costCeiling: number;
}
export interface ApiPlan {
  id: string; project_id: string; version: number; status: string;
  cost_ceiling_usd: number; tasks: ApiPlanTask[]; failure_reason: string | null;
}
export interface ApiTask {
  id: string; project_id: string; name: string; kind: string; status: string;
  progress: number; depends_on: string[]; result: string | null;
  artifacts: { name: string; type: string }[]; failure_reason: string | null;
  cost_usd: number; input_tokens: number; output_tokens: number;
}
export interface ApiApproval {
  id: string; project_id: string; plan_id: string | null; gate: string;
  title: string; description: string; reason: string; status: string; requested_at: string;
}
export interface ApiEvent {
  id: string; kind: string; role: string | null; text: string; created_at: string;
}
export interface ApiRun {
  project: ApiProject; plan: ApiPlan | null;
  tasks: ApiTask[]; events: ApiEvent[]; approvals: ApiApproval[];
}
export interface ApiHealth {
  ok: boolean; provider: string; provider_configured: boolean; ceiling_usd: number;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    });
  } catch {
    throw new Error(`Cannot reach the Orchestra backend at ${BASE}. Is it running?`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let msg = text;
    try { msg = (JSON.parse(text) as { detail?: string }).detail || text; } catch { /* keep text */ }
    throw new Error(typeof msg === 'string' && msg ? msg : `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  base: BASE,
  health: () => req<ApiHealth>('/api/health'),
  createProject: (objective: string) =>
    req<ApiProject>('/api/projects', { method: 'POST', body: JSON.stringify({ objective }) }),
  requestPlan: (projectId: string) =>
    req<ApiPlan>(`/api/projects/${projectId}/plan`, { method: 'POST' }),
  getRun: (projectId: string) => req<ApiRun>(`/api/projects/${projectId}/run`),
  approveApproval: (approvalId: string) =>
    req<ApiPlan>(`/api/approvals/${approvalId}/approve`, { method: 'POST' }),
  rejectApproval: (approvalId: string, note = '') =>
    req<{ ok: boolean }>(`/api/approvals/${approvalId}/reject`, {
      method: 'POST', body: JSON.stringify({ note }),
    }),
  retryTask: (taskId: string) =>
    req<ApiTask>(`/api/tasks/${taskId}/retry`, { method: 'POST' }),
  pauseTask: (taskId: string) =>
    req<ApiTask>(`/api/tasks/${taskId}/pause`, { method: 'POST' }),
  resumeTask: (taskId: string) =>
    req<ApiTask>(`/api/tasks/${taskId}/resume`, { method: 'POST' }),
  pauseProject: (projectId: string) =>
    req<{ ok: boolean }>(`/api/projects/${projectId}/pause`, { method: 'POST' }),
  resumeProject: (projectId: string) =>
    req<{ ok: boolean }>(`/api/projects/${projectId}/resume`, { method: 'POST' }),
  cancelProject: (projectId: string) =>
    req<{ ok: boolean }>(`/api/projects/${projectId}/cancel`, { method: 'POST' }),
};

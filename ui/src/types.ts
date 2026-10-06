// ── Orchestra · domain types ────────────────────────────────────────────
// These types mirror the future backend API shapes (see blueprint §6, §7).
// The mock layer implements them; the real API will replace it 1:1.

export type AgentStatus = 'working' | 'idle' | 'waiting' | 'error';
export type TaskStatus = 'pending' | 'ready' | 'running' | 'paused' | 'waiting_approval' | 'completed' | 'failed';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type ApprovalGate = 'plan' | 'tool' | 'result' | 'escalation';
export type ProjectStatus = 'active' | 'paused' | 'completed' | 'cancelled';

export interface Agent {
  id: string;
  name: string;
  role: string;
  model: string;
  provider: 'OpenAI' | 'Anthropic' | 'xAI' | 'DeepSeek' | 'Google' | 'MVP';
  status: AgentStatus;
  currentTask?: string;
  instructions: string;
  permissions: { label: string; granted: boolean }[];
  tools: string[];
  tokensUsed: number;
  tasksCompleted: number;
  avatarHue: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  objective: string;
  status: ProjectStatus;
  progress: number;
  agents: string[]; // agent ids
  taskCounts: Record<TaskStatus, number>;
  lastActivity: string;
  lastActivityAt: string;
  createdAt: string;
  color: string;
}

export interface Task {
  id: string;
  projectId: string;
  name: string;
  agentId: string;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  costUsd: number;
  tokens: number;
  result?: string;
  progress?: number;
}

export interface ActivityEvent {
  id: string;
  runId: string;
  time: string;
  kind: 'plan' | 'start' | 'complete' | 'handoff' | 'approval' | 'result' | 'system';
  agentId?: string;
  text: string;
}

export interface Approval {
  id: string;
  gate: ApprovalGate;
  title: string;
  description: string;
  reason: string;
  agentId: string;
  projectId: string;
  requestedAt: string;
  expiresIn: string;
  status: ApprovalStatus;
  diff?: string[];
}

export interface WorkspaceFile {
  id: string;
  name: string;
  path: string;
  type: 'doc' | 'code' | 'data' | 'image' | 'other';
  size: string;
  modified: string;
  modifiedBy: string; // agent id or 'you'
  access: string[]; // agent ids with access
}

export interface Integration {
  id: string;
  name: string;
  category: string;
  description: string;
  status: 'connected' | 'available' | 'coming_soon';
  icon: string;
}

export interface UsageSummary {
  period: string;
  requests: number;
  tokens: number;
  costUsd: number;
  tasksCompleted: number;
  byProvider: { provider: string; pct: number; color: string }[];
  daily: number[];
}

import { Badge } from './ui';
import type { AgentStatus, TaskStatus, ApprovalStatus, ProjectStatus } from '../types';

const agentStatus: Record<AgentStatus, { tone: 'success' | 'info' | 'warning' | 'danger' | 'neutral'; label: string; live?: boolean }> = {
  working: { tone: 'info', label: 'Working', live: true },
  idle: { tone: 'neutral', label: 'Idle' },
  waiting: { tone: 'warning', label: 'Waiting approval' },
  error: { tone: 'danger', label: 'Error' },
};

const taskStatus: Record<TaskStatus, { tone: 'success' | 'info' | 'warning' | 'danger' | 'neutral'; label: string; live?: boolean }> = {
  pending: { tone: 'neutral', label: 'Waiting' },
  ready: { tone: 'info', label: 'Ready' },
  running: { tone: 'info', label: 'Running', live: true },
  paused: { tone: 'neutral', label: 'Paused' },
  waiting_approval: { tone: 'warning', label: 'Needs approval' },
  completed: { tone: 'success', label: 'Completed' },
  failed: { tone: 'danger', label: 'Failed' },
};

const approvalStatus: Record<ApprovalStatus, { tone: 'success' | 'warning' | 'danger'; label: string }> = {
  pending: { tone: 'warning', label: 'Pending' },
  approved: { tone: 'success', label: 'Approved' },
  rejected: { tone: 'danger', label: 'Rejected' },
};

const projectStatus: Record<ProjectStatus, { tone: 'success' | 'neutral' | 'info' | 'danger'; label: string }> = {
  active: { tone: 'success', label: 'Active' },
  paused: { tone: 'neutral', label: 'Paused' },
  completed: { tone: 'info', label: 'Completed' },
  cancelled: { tone: 'danger', label: 'Cancelled' },
};

export function AgentStatusBadge({ status }: { status: AgentStatus }) {
  const s = agentStatus[status];
  return <Badge tone={s.tone} dot live={s.live}>{s.label}</Badge>;
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const s = taskStatus[status];
  return <Badge tone={s.tone} dot live={s.live}>{s.label}</Badge>;
}

export function ApprovalStatusBadge({ status }: { status: ApprovalStatus }) {
  const s = approvalStatus[status];
  return <Badge tone={s.tone} dot>{s.label}</Badge>;
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const s = projectStatus[status];
  return <Badge tone={s.tone} dot>{s.label}</Badge>;
}

export function PriorityBadge({ priority }: { priority: 'low' | 'medium' | 'high' }) {
  const tone = priority === 'high' ? 'danger' : priority === 'medium' ? 'warning' : 'neutral';
  return <Badge tone={tone}>{priority}</Badge>;
}

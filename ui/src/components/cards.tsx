import { Link } from 'react-router-dom';
import { Card, CardHead, Avatar, ProgressBar, Badge, Button } from './ui';
import { TaskStatusBadge, ProjectStatusBadge, PriorityBadge } from './StatusBadge';
import { agentById } from '../mock/agents';
import { projectById } from '../mock/data';
import type { Project, Task, Approval, ActivityEvent } from '../types';

/* ── Project card ───────────────────────────────────────────────────── */
export function ProjectCard({ project }: { project: Project }) {
  const total = Object.values(project.taskCounts).reduce((a, b) => a + b, 0);
  const running = project.taskCounts.running + project.taskCounts.waiting_approval;
  return (
    <Card hover className="card-pad">
      <CardHead
        title={project.name}
        sub={project.description}
        action={<ProjectStatusBadge status={project.status} />}
      />
      <div style={{ display: 'flex', gap: 18, marginBottom: 12, fontSize: 'var(--text-sm)', color: 'var(--text-2)' }}>
        <span><strong style={{ color: 'var(--text-1)' }}>{project.agents.length}</strong> agents</span>
        <span><strong style={{ color: 'var(--text-1)' }}>{total}</strong> tasks</span>
        {running > 0 && <span><strong style={{ color: 'var(--accent)' }}>{running}</strong> active</span>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <ProgressBar value={project.progress} tone="progress-success" />
        <span className="mono" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)' }}>{project.progress}%</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="hint">{project.lastActivity} · {project.lastActivityAt}</span>
        <Link to={`/projects/${project.id}`}><Button size="sm">Open Project</Button></Link>
      </div>
    </Card>
  );
}

/* ── Task card / row ────────────────────────────────────────────────── */
export function TaskRow({ task, showProject = false, onClick }: { task: Task; showProject?: boolean; onClick?: () => void }) {
  const agent = agentById(task.agentId);
  return (
    <div
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px',
      background: 'var(--bg-2)', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-md)',
      cursor: onClick ? 'pointer' : undefined,
    }}>
      <Avatar name={agent.name} hue={agent.avatarHue} size="sm" />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }} className="ellipsis">{task.name}</div>
        <div className="dim" style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>
          {agent.name} · {agent.role}{showProject ? ` · ${projectById(task.projectId).name}` : ''} · {task.createdAt}
        </div>
        {(task.status === 'running' || task.status === 'paused') && task.progress != null && (
          <div style={{ marginTop: 8, maxWidth: 320 }}><ProgressBar value={task.progress} /></div>
        )}
      </div>
      <PriorityBadge priority={task.priority} />
      <TaskStatusBadge status={task.status} />
      <span className="mono dim" style={{ fontSize: 'var(--text-xs)', minWidth: 64, textAlign: 'right' }}>
        ${task.costUsd.toFixed(2)}
      </span>
    </div>
  );
}

/* ── Approval card ──────────────────────────────────────────────────── */
export function ApprovalCard({ approval, onReview }:
  { approval: Approval; onReview?: () => void }) {
  const agent = agentById(approval.agentId);
  const gateLabel = { plan: 'Plan', tool: 'Tool', result: 'Result', escalation: 'Escalation' }[approval.gate];
  return (
    <Card className="card-pad" hover={!!onReview} onClick={onReview}
      style={onReview ? { cursor: 'pointer' } : undefined}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <Avatar name={agent.name} hue={agent.avatarHue} size="md" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <strong style={{ fontSize: 'var(--text-sm)' }}>{approval.title}</strong>
            <Badge tone="info">{gateLabel} gate</Badge>
          </div>
          <p className="muted" style={{ fontSize: 'var(--text-sm)', marginBottom: 6 }}>{approval.description}</p>
          <p className="dim" style={{ fontSize: 'var(--text-xs)' }}>
            {agent.name} · requested {approval.requestedAt} · expires in {approval.expiresIn}
          </p>
        </div>
      </div>
    </Card>
  );
}

/* ── Activity item ──────────────────────────────────────────────────── */
const KIND_ICON: Record<ActivityEvent['kind'], string> = {
  plan: '◈', start: '▶', complete: '✓', handoff: '⇄', approval: '⚠', result: '◉', system: '●',
};
const KIND_TONE: Record<ActivityEvent['kind'], 'success' | 'info' | 'warning' | 'violet' | 'neutral'> = {
  plan: 'violet', start: 'info', complete: 'success', handoff: 'neutral', approval: 'warning', result: 'success', system: 'neutral',
};

export function ActivityItem({ event }: { event: ActivityEvent }) {
  const agent = event.agentId ? agentById(event.agentId) : null;
  const isAgentVoice = !!agent && (event.kind === 'start' || event.kind === 'complete' || event.kind === 'handoff');
  return (
    <div style={{ display: 'flex', gap: 12, padding: '10px 0' }}>
      <span className={`badge badge-${KIND_TONE[event.kind]}`} style={{ height: 26, width: 26, padding: 0, justifyContent: 'center', flexShrink: 0 }}>
        {KIND_ICON[event.kind]}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 'var(--text-sm)' }}>
          {isAgentVoice && <span className="badge badge-violet" style={{ marginRight: 8 }}>agent says</span>}
          {agent && <strong>{agent.name}</strong>}{agent && ' — '}{event.text}
        </div>
        <div className="dim" style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>
          {event.time} · <span className="mono">{event.runId}</span>
          {!agent && <span> · <span className="badge badge-info" style={{ marginLeft: 4 }}>platform</span></span>}
        </div>
      </div>
    </div>
  );
}

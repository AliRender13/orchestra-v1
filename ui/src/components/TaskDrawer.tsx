import React from 'react';
import { Button, Avatar, ProgressBar } from './ui';
import { TaskStatusBadge, PriorityBadge } from './StatusBadge';
import { agentById } from '../mock/agents';
import type { SimTask } from '../mock/simulation';
import { formatAgo } from '../mock/simulation';

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  if (m < 1) return `${sec}s`;
  return `${m}m ${sec % 60}s`;
}

/**
 * Slide-over task detail. Keeps workspace context visible behind it.
 */
export default function TaskDrawer({
  task, tasks, elapsedSec, onClose, onAction,
}: {
  task: SimTask;
  tasks: SimTask[];
  elapsedSec: number;
  onClose: () => void;
  onAction: (action: 'pause' | 'resume' | 'retry' | 'approve', id: string) => void;
}) {
  const agent = agentById(task.agentId);

  React.useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  const depStatus = (id: string) => tasks.find((t) => t.id === id);

  return (
    <div className="drawer-scrim" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Task: ${task.name}`}>
        <div className="drawer-head">
          <div>
            <div className="dim" style={{ fontSize: 'var(--text-xs)', marginBottom: 4 }}>TASK</div>
            <h2 style={{ fontSize: 'var(--text-lg)', margin: 0 }}>{task.name}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="drawer-body">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <TaskStatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>

          <div className="drawer-section">
            <div className="field-label">Assigned agent</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar name={agent.name} hue={agent.avatarHue} size="md" />
              <div>
                <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{agent.name}</div>
                <div className="dim" style={{ fontSize: 'var(--text-xs)' }}>{agent.role} · {agent.model}</div>
              </div>
            </div>
          </div>

          {(task.status === 'running' || task.status === 'paused') && (
            <div className="drawer-section">
              <div className="field-label">Progress · {task.progress}%</div>
              <ProgressBar value={task.progress} />
              <div className="muted" style={{ fontSize: 'var(--text-sm)', marginTop: 8 }}>
                <span className="badge badge-violet" style={{ marginRight: 8 }}>agent says</span>
                {task.currentStep}
              </div>
            </div>
          )}

          <div className="drawer-section">
            <div className="field-label">Timing</div>
            <div className="kv">
              <span>Started</span><span>{task.startedAt ?? '—'}</span>
              <span>Elapsed</span><span className="mono">{fmtDuration(task.elapsedSec)}</span>
              <span>Cost so far</span><span className="mono">${task.costUsd.toFixed(2)}</span>
              <span>Tokens</span><span className="mono">{(task.tokens / 1000).toFixed(1)}K</span>
            </div>
          </div>

          {task.dependsOn.length > 0 && (
            <div className="drawer-section">
              <div className="field-label">Dependencies</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {task.dependsOn.map((d) => {
                  const dep = depStatus(d);
                  const done = dep?.status === 'completed';
                  return (
                    <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-sm)' }}>
                      <span style={{ color: done ? 'var(--success)' : 'var(--text-3)' }}>{done ? '✓' : '○'}</span>
                      <span className={done ? 'muted' : ''}>{dep?.name ?? d}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {task.status === 'failed' && task.failureReason && (
            <div className="banner" style={{ background: 'var(--danger-soft)', borderColor: 'rgba(255,107,107,.3)', color: 'var(--danger)', marginBottom: 16 }}>
              {task.failureReason}
            </div>
          )}

          {(task.result || task.status === 'completed') && (
            <div className="drawer-section">
              <div className="field-label"><span className="badge badge-info" style={{ marginRight: 6 }}>platform</span>Result</div>
              <p className="muted" style={{ fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>{task.result ?? '—'}</p>
            </div>
          )}

          {task.artifacts.length > 0 && (
            <div className="drawer-section">
              <div className="field-label">Artifacts</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {task.artifacts.map((a) => (
                  <div key={a.name} className="artifact-row">
                    <span aria-hidden>{a.type === 'doc' ? '▤' : a.type === 'data' ? '◫' : '▦'}</span>
                    <span className="mono" style={{ fontSize: 'var(--text-sm)' }}>{a.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="drawer-section">
            <div className="field-label">Controls</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {task.status === 'running' && <Button size="sm" variant="secondary" onClick={() => onAction('pause', task.id)}>⏸ Pause task</Button>}
              {task.status === 'paused' && <Button size="sm" variant="primary" onClick={() => onAction('resume', task.id)}>▶ Resume task</Button>}
              {task.status === 'failed' && <Button size="sm" variant="primary" onClick={() => onAction('retry', task.id)}>↻ Retry task</Button>}
              {task.status === 'waiting_approval' && <Button size="sm" variant="success" onClick={() => onAction('approve', task.id)}>✓ Approve result</Button>}
            </div>
            <p className="hint" style={{ marginTop: 10 }}>
              Task {task.id} · run run-8f3a · last update {formatAgo(elapsedSec, elapsedSec)}
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

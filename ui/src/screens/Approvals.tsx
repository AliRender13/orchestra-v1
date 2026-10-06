import React from 'react';
import { Card, Button, Badge, Avatar, Modal, EmptyState } from '../components/ui';
import { ApprovalStatusBadge } from '../components/StatusBadge';
import { mockApprovals } from '../mock/data';
import { agentById } from '../mock/agents';
import type { Approval } from '../types';

const GATE_LABEL = { plan: 'Plan', tool: 'Tool', result: 'Result', escalation: 'Escalation' } as const;

function ReviewModal({ approval, onClose, onDecide }: {
  approval: Approval; onClose: () => void; onDecide: (id: string, ok: boolean) => void;
}) {
  const agent = agentById(approval.agentId);
  return (
    <Modal
      title={approval.title}
      onClose={onClose}
      foot={
        <>
          <Button variant="ghost" onClick={onClose}>Later</Button>
          <Button variant="danger" onClick={() => { onDecide(approval.id, false); onClose(); }}>Reject</Button>
          <Button variant="success" onClick={() => { onDecide(approval.id, true); onClose(); }}>Approve</Button>
        </>
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Avatar name={agent.name} hue={agent.avatarHue} size="md" />
        <div>
          <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{agent.name} · {agent.role}</div>
          <div className="dim" style={{ fontSize: 'var(--text-xs)' }}>
            <Badge tone="info">{GATE_LABEL[approval.gate]} gate</Badge>{' '}
            requested {approval.requestedAt} · expires in {approval.expiresIn}
          </div>
        </div>
      </div>
      <p style={{ fontSize: 'var(--text-sm)', marginBottom: 6 }}><strong>What:</strong> <span className="muted">{approval.description}</span></p>
      <p style={{ fontSize: 'var(--text-sm)', marginBottom: 14 }}><strong>Why:</strong> <span className="muted">{approval.reason}</span></p>
      {approval.diff && (
        <>
          <div className="field-label">Proposed changes</div>
          <div className="mono" style={{ fontSize: 'var(--text-xs)', background: 'var(--bg-0)', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-md)', padding: 12, marginBottom: 14, lineHeight: 1.8 }}>
            {approval.diff.map((d) => (
              <div key={d} style={{ color: d.startsWith('+') ? 'var(--success)' : d.startsWith('~') ? 'var(--warning)' : 'var(--text-2)' }}>{d}</div>
            ))}
          </div>
        </>
      )}
      <div className="banner" style={{ fontSize: 'var(--text-xs)' }}>
        🔒 This approval is bound to this exact action. Approving here cannot authorize anything else.
      </div>
    </Modal>
  );
}

export default function Approvals() {
  const [items, setItems] = React.useState(mockApprovals);
  const [reviewing, setReviewing] = React.useState<Approval | null>(null);
  const pending = items.filter((a) => a.status === 'pending');
  const decided = items.filter((a) => a.status !== 'pending');

  const decide = (id: string, ok: boolean) => {
    const target = mockApprovals.find((a) => a.id === id);
    if (target) target.status = ok ? 'approved' : 'rejected'; // keep sidebar badge in sync
    setItems((xs) => xs.map((a) => (a.id === id ? { ...a, status: ok ? 'approved' : 'rejected' } : a)));
  };

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Approval Center</h1>
        <p className="page-sub">Nothing consequential happens without you. Approvals are bound to the exact action, single-use, and expire.</p>
      </div>

      <Card className="card-pad" style={{ marginBottom: 20, borderLeft: '3px solid var(--warning)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>🛡</span>
          <div>
            <strong style={{ fontSize: 'var(--text-sm)' }}>The human is in control.</strong>
            <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
              {pending.length === 0
                ? 'No pending requests. Agents are working within their approved bounds.'
                : `${pending.length} request${pending.length > 1 ? 's' : ''} waiting for your decision.`}
            </p>
          </div>
        </div>
      </Card>

      {pending.length > 0 && (
        <>
          <h2 className="section-title" style={{ marginBottom: 12 }}>Waiting for you · {pending.length}</h2>
          <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
            {pending.map((a) => {
              const agent = agentById(a.agentId);
              return (
                <Card key={a.id} className="card-pad" hover>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <Avatar name={agent.name} hue={agent.avatarHue} size="md" />
                    <div style={{ flex: 1, minWidth: 220 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                        <strong>{a.title}</strong>
                        <Badge tone="info">{GATE_LABEL[a.gate]} gate</Badge>
                      </div>
                      <p className="muted" style={{ fontSize: 'var(--text-sm)', marginBottom: 4 }}>{a.description}</p>
                      <p className="dim" style={{ fontSize: 'var(--text-xs)' }}>{agent.name} · {a.requestedAt} · expires in {a.expiresIn}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button size="sm" variant="secondary" onClick={() => setReviewing(a)}>Review</Button>
                      <Button size="sm" variant="success" onClick={() => decide(a.id, true)}>Approve</Button>
                      <Button size="sm" variant="danger" onClick={() => decide(a.id, false)}>Reject</Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <h2 className="section-title" style={{ marginBottom: 12 }}>Decided</h2>
      {decided.length === 0 ? (
        <EmptyState icon="✓" title="Nothing decided yet" sub="Your past decisions will appear here with full context." />
      ) : (
        <Card className="card-pad">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {decided.map((a) => {
              const agent = agentById(a.agentId);
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar name={agent.name} hue={agent.avatarHue} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="ellipsis" style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{a.title}</div>
                    <div className="dim" style={{ fontSize: 'var(--text-xs)' }}>{agent.name} · {a.requestedAt}</div>
                  </div>
                  <ApprovalStatusBadge status={a.status} />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {reviewing && (
        <ReviewModal approval={reviewing} onClose={() => setReviewing(null)} onDecide={decide} />
      )}
    </div>
  );
}

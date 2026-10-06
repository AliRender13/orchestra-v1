import React from 'react';
import { Card, CardHead, Button, Badge } from './ui';
import { checkExposure } from '../lib/exposure';
import { formatUsd } from '../lib/budget';
import { agentById } from '../mock/agents';
import type { Plan } from '../mock/data';

function YesNo({ value, invert = false }: { value: boolean; invert?: boolean }) {
  // Network YES = exposure (amber). Private-data YES = exposure (amber). NO = neutral.
  const tone = value ? (invert ? 'success' : 'warning') : 'neutral';
  return <Badge tone={tone}>{value ? 'YES' : 'NO'}</Badge>;
}

/**
 * Plan review: shows the proposed plan, per-task exposure manifest,
 * cost ceiling, and the plan approval gate.
 * Task purposes are agent-proposed → labeled AGENT SAYS.
 */
export default function PlanReview({ plan }: { plan: Plan }) {
  const [decision, setDecision] = React.useState<'none' | 'approved' | 'changes'>('none');
  const proposer = agentById(plan.proposedBy);
  const violations = plan.tasks.filter((t) => !checkExposure(t).ok);

  return (
    <div>
      <Card className="card-pad" style={{ marginBottom: 16, borderLeft: '3px solid var(--accent)' }}>
        <CardHead
          title={`Plan v${plan.version}`}
          sub={`Proposed by ${proposer.name} (${proposer.role}) · validated ${plan.validatedAt}`}
          action={
            plan.status === 'approved'
              ? <Badge tone="success" dot>Approved</Badge>
              : <Badge tone="warning" dot>Pending your approval</Badge>
          }
        />
        <div className="grid-3" style={{ marginTop: 4 }}>
          <div><div className="field-label">Cost ceiling</div>
            <div className="mono" style={{ fontSize: 'var(--text-xl)', fontWeight: 800 }}>{formatUsd(plan.costCeiling)}</div>
            <div className="hint">Ceiling, not estimate — worst case per task, summed.</div></div>
          <div><div className="field-label">Exposure check</div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: violations.length ? 'var(--danger)' : 'var(--success)' }}>
              {violations.length ? `${violations.length} violation${violations.length > 1 ? 's' : ''}` : 'All tasks clean'}
            </div>
            <div className="hint">No task holds network + private data together.</div></div>
          <div><div className="field-label">Validator</div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--success)' }}>Valid</div>
            <div className="hint">Acyclic · dependencies resolve · criteria non-empty.</div></div>
        </div>
      </Card>

      <Card className="card-pad" style={{ marginBottom: 16 }}>
        <CardHead title="Exposure manifest" sub="What each task may touch — enforced by the backend, not just displayed" />
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr><th>Task</th><th>Purpose <span className="badge badge-neutral" style={{ marginLeft: 6 }}>agent says</span></th><th>Inputs</th><th>Network</th><th>Private data</th><th>Tools</th><th>Ceiling</th></tr>
            </thead>
            <tbody>
              {plan.tasks.map((t) => {
                const check = checkExposure(t);
                return (
                  <tr key={t.id} style={!check.ok ? { background: 'var(--danger-soft)' } : undefined}>
                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{t.name}</td>
                    <td className="muted" style={{ minWidth: 220 }}>{t.purpose}</td>
                    <td className="dim" style={{ fontSize: 'var(--text-xs)' }}>{t.inputs.join(', ')}</td>
                    <td><YesNo value={t.network} /></td>
                    <td><YesNo value={t.privateData} /></td>
                    <td><span className="mono" style={{ fontSize: 'var(--text-xs)' }}>{t.tools.join(', ')}</span></td>
                    <td className="mono">{formatUsd(t.costCeiling)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="hint" style={{ marginTop: 12 }}>
          Research tasks see only the objective and public inputs. Synthesis tasks see workspace data and have no network.
          Outputs of network tasks are treated as untrusted data.
        </p>
      </Card>

      {plan.status !== 'approved' && decision === 'none' && (
        <Card className="card-pad" style={{ borderLeft: '3px solid var(--warning)' }}>
          <CardHead title="Your decision required" sub="Approving the plan authorizes execution within the ceiling above — nothing more." />
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="success" onClick={() => setDecision('approved')}>Approve plan</Button>
            <Button variant="secondary" onClick={() => setDecision('changes')}>Request changes</Button>
          </div>
        </Card>
      )}
      {decision === 'approved' && (
        <div className="banner" style={{ background: 'var(--success-soft)', borderColor: 'rgba(62,207,142,.3)', color: 'var(--success)' }}>
          ✓ Plan approved. The scheduler may now claim tasks within the {formatUsd(plan.costCeiling)} ceiling.
        </div>
      )}
      {decision === 'changes' && (
        <div className="banner">↩ Change request recorded. The planner must submit a new plan version — completed work is never invalidated.</div>
      )}
    </div>
  );
}

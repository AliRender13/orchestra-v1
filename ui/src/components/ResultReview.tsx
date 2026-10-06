import React from 'react';
import { Card, CardHead, Button, Badge, Avatar } from './ui';
import { agentById } from '../mock/agents';
import type { ClaimReview } from '../mock/data';

const VALIDATOR_TONE = {
  passed: 'success',
  failed: 'danger',
  needs_review: 'warning',
} as const;

const VALIDATOR_LABEL = {
  passed: 'Passed',
  failed: 'Failed',
  needs_review: 'Needs review',
} as const;

/**
 * Result review: each claim checked against sources.
 * Three content kinds are visually separated:
 *   PLATFORM  — validator outcomes, URL status, stored references
 *   AGENT SAYS — model-generated commentary
 *   (claim text itself is the artifact under review)
 */
export function ClaimCard({ review }: { review: ClaimReview }) {
  const [decision, setDecision] = React.useState(review.status);
  const agent = agentById(review.agentId);

  return (
    <Card className="card-pad" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
        <Badge tone={VALIDATOR_TONE[review.validatorStatus]} dot>{VALIDATOR_LABEL[review.validatorStatus]}</Badge>
        {review.flags.map((f) => <Badge key={f} tone="warning">{f}</Badge>)}
        {decision !== 'pending' && (
          <Badge tone={decision === 'accepted' ? 'success' : decision === 'rejected' ? 'danger' : 'info'}>
            {decision.replace('_', ' ')}
          </Badge>
        )}
      </div>

      <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', marginBottom: 10 }}>“{review.claim}”</div>

      <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
        <div>
          <div className="field-label"><span className="badge badge-info" style={{ marginRight: 6 }}>platform</span>Source</div>
          <div style={{ fontSize: 'var(--text-sm)' }}>{review.source}</div>
          {review.sourceUrl && (
            <div className="mono" style={{ fontSize: 'var(--text-xs)', color: 'var(--accent)', marginTop: 2 }}>{review.sourceUrl}</div>
          )}
          <div className="dim" style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>URL status: {review.urlStatus}</div>
          <div className="dim" style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>Stored reference: <span className="mono">{review.storedRef}</span></div>
        </div>
        <div>
          <div className="field-label"><span className="badge badge-info" style={{ marginRight: 6 }}>platform</span>Validator</div>
          <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>{review.validatorNote}</div>
          {review.quote !== '—' && (
            <div style={{ marginTop: 8, padding: 10, background: 'var(--bg-0)', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontStyle: 'italic' }} className="muted">
              Supporting quote: {review.quote}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: 10, background: 'var(--bg-1)', border: '1px solid var(--border-1)', borderRadius: 'var(--radius-md)', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Avatar name={agent.name} hue={agent.avatarHue} size="sm" />
          <span className="badge badge-violet">agent says</span>
          <span className="dim" style={{ fontSize: 'var(--text-xs)' }}>{agent.name} · {agent.role}</span>
        </div>
        <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>{review.agentCommentary}</p>
      </div>

      {decision === 'pending' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button size="sm" variant="success" onClick={() => setDecision('accepted')}>Accept claim</Button>
          <Button size="sm" variant="danger" onClick={() => setDecision('rejected')}>Reject claim</Button>
          <Button size="sm" variant="secondary" onClick={() => setDecision('correction_requested')}>Request correction</Button>
        </div>
      )}
    </Card>
  );
}

export default function ResultReview({ reviews, title, sub }: { reviews: ClaimReview[]; title: string; sub?: string }) {
  const counts = {
    passed: reviews.filter((r) => r.validatorStatus === 'passed').length,
    failed: reviews.filter((r) => r.validatorStatus === 'failed').length,
    needs_review: reviews.filter((r) => r.validatorStatus === 'needs_review').length,
  };
  return (
    <div>
      <CardHead title={title} sub={sub}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Badge tone="success">{counts.passed} passed</Badge>
            <Badge tone="warning">{counts.needs_review} need review</Badge>
            <Badge tone="danger">{counts.failed} failed</Badge>
          </div>
        } />
      <p className="hint" style={{ marginBottom: 14 }}>
        Validators check traceability — quote present in stored snapshot, URL resolves, source recorded.
        They do not establish objective truth. That judgment is yours.
      </p>
      {reviews.map((r) => <ClaimCard key={r.id} review={r} />)}
    </div>
  );
}

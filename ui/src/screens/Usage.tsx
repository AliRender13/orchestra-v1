import { Card, CardHead, Stat, ProgressBar } from '../components/ui';
import { mockUsage } from '../mock/data';

function BarChart({ data, height = 120 }: { data: number[]; height?: number }) {
  const max = Math.max(...data);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
          <div
            title={`$${v.toFixed(2)}`}
            style={{
              height: `${(v / max) * 100}%`, minHeight: 4,
              background: i === data.length - 1 ? 'var(--accent)' : 'var(--bg-4)',
              border: i === data.length - 1 ? '1px solid var(--accent-border)' : '1px solid var(--border-1)',
              borderRadius: 4, transition: 'height 600ms var(--ease)',
            }}
          />
        </div>
      ))}
    </div>
  );
}

export default function Usage() {
  const u = mockUsage;
  return (
    <div>
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 className="page-title">Usage</h1>
          <p className="page-sub">{u.period} · demo data — real metering arrives with the backend.</p>
        </div>
        <span className="badge badge-success">BYOK · you pay providers directly</span>
      </div>

      <div className="grid-4 stagger" style={{ marginBottom: 20 }}>
        <Card className="card-pad" hover><Stat label="AI requests" value={u.requests} sub={<span className="muted">across 4 providers</span>} /></Card>
        <Card className="card-pad" hover><Stat label="Tokens" value={`${(u.tokens / 1e6).toFixed(2)}M`} sub={<span className="muted">input + output</span>} /></Card>
        <Card className="card-pad" hover><Stat label="Est. cost" value={`$${u.costUsd.toFixed(2)}`} sub={<span className="muted">against ceiling — never exact</span>} /></Card>
        <Card className="card-pad" hover><Stat label="Tasks completed" value={u.tasksCompleted} sub={<span className="muted">checked results</span>} /></Card>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <Card className="card-pad">
          <CardHead title="Daily spend" sub="Last 14 days · USD" />
          <BarChart data={u.daily} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }} className="hint">
            <span>Sep 20</span><span>Oct 3</span>
          </div>
        </Card>
        <Card className="card-pad">
          <CardHead title="Usage by provider" sub="Share of tokens" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {u.byProvider.map((p) => (
              <div key={p.provider}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 'var(--text-sm)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color }} />
                    <strong>{p.provider}</strong>
                  </span>
                  <span className="mono muted">{p.pct}%</span>
                </div>
                <ProgressBar value={p.pct} />
              </div>
            ))}
          </div>
          <p className="hint" style={{ marginTop: 16 }}>
            Multi-provider routing is builder insurance: if one provider has an outage or price shock, work continues on the others.
          </p>
        </Card>
      </div>

      <Card className="card-pad" style={{ marginTop: 20 }}>
        <CardHead title="Budget guardrails" sub="Hard gates, not warnings" />
        <div className="grid-3">
          <div><div className="field-label">Monthly ceiling</div><div className="mono" style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>$25.00</div></div>
          <div><div className="field-label">Per-objective ceiling</div><div className="mono" style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>$10.00</div></div>
          <div><div className="field-label">On exceed</div><div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Pause pipeline · notify you</div></div>
        </div>
      </Card>
    </div>
  );
}

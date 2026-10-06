import React from 'react';
import { Card, CardHead, Button, Field, Toggle, Badge } from '../components/ui';

function Row({ label, sub, control }: { label: string; sub?: string; control: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0', borderBottom: '1px solid var(--border-1)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{label}</div>
        {sub && <div className="dim" style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>{sub}</div>}
      </div>
      {control}
    </div>
  );
}

export default function Settings() {
  const [toggles, setToggles] = React.useState({ approvals: true, notify: true, memory: true, analytics: false });
  const set = (k: keyof typeof toggles) => (v: boolean) => setToggles((t) => ({ ...t, [k]: v }));

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Settings</h1>
        <p className="page-sub">Workspace preferences. UI-only for now — real persistence arrives with the backend.</p>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div>
          <Card className="card-pad" style={{ marginBottom: 16 }}>
            <CardHead title="Profile" sub="Local demo identity — real auth arrives with the backend" />
            <Field label="Display name"><input className="input" defaultValue="Operator" /></Field>
            <Field label="Email"><input className="input" placeholder="Not configured" /></Field>
            <Button size="sm" variant="secondary">Save changes</Button>
          </Card>
          <Card className="card-pad" style={{ marginBottom: 16 }}>
            <CardHead title="AI providers" sub="Encrypted at rest. Decrypted only when required to call your provider." />
            {['OpenAI', 'Anthropic', 'xAI', 'DeepSeek', 'Google'].map((p, i) => (
              <Row key={p} label={p}
                sub={i < 2 ? 'Key connected · sk-••••' + (4820 + i) : 'No key added'}
                control={i < 2
                  ? <Badge tone="success" dot>Connected</Badge>
                  : <Button size="sm" variant="secondary">Add key</Button>} />
            ))}
          </Card>
          <Card className="card-pad">
            <CardHead title="Usage limits" sub="Hard ceilings enforced before every model call" />
            <Field label="Monthly ceiling (USD)"><input className="input mono" defaultValue="25.00" /></Field>
            <Field label="Per-objective ceiling (USD)"><input className="input mono" defaultValue="10.00" /></Field>
          </Card>
        </div>
        <div>
          <Card className="card-pad" style={{ marginBottom: 16 }}>
            <CardHead title="Approvals & control" />
            <Row label="Require approval for side effects" sub="File writes, external actions — always on in this demo"
              control={<Toggle on={toggles.approvals} onChange={set('approvals')} label="Require approval" />} />
            <Row label="Notifications" sub="Ping me on approvals and completions"
              control={<Toggle on={toggles.notify} onChange={set('notify')} label="Notifications" />} />
          </Card>
          <Card className="card-pad" style={{ marginBottom: 16 }}>
            <CardHead title="Memory & privacy" />
            <Row label="Long-term project memory" sub="Decisions, findings, and disagreements persist per project"
              control={<Toggle on={toggles.memory} onChange={set('memory')} label="Project memory" />} />
            <Row label="Share anonymized usage analytics" sub="Helps improve routing — off by default"
              control={<Toggle on={toggles.analytics} onChange={set('analytics')} label="Analytics" />} />
            <div style={{ paddingTop: 14 }}>
              <Button size="sm" variant="danger">Delete all workspace data</Button>
            </div>
          </Card>
          <Card className="card-pad">
            <CardHead title="About this demo" />
            <p className="muted" style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>
              Orchestra UI prototype · v0.1. All data on screen is mock data living in <span className="mono">src/mock/</span> —
              designed so the real API can replace it without rewriting any component.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

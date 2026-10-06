import React from 'react';
import { Card, CardHead, Badge, Avatar, Button } from '../components/ui';
import { ActivityItem } from '../components/cards';
import { mockActivity } from '../mock/data';
import { agentById } from '../mock/agents';
import type { ActivityEvent } from '../types';

/* Live run view — mock streaming: new events append every few seconds */
const STREAM: Omit<ActivityEvent, 'id' | 'runId' | 'time'>[] = [
  { kind: 'system', text: 'Heartbeat OK · 3 roles active · budget $1.32 / $2.50 reserved' },
  { kind: 'start', agentId: 'a-synthesis', text: 'Synthesis started “comparison matrix draft”' },
  { kind: 'handoff', agentId: 'a-planner', text: 'Orchestrator passed research brief to Synthesis' },
  { kind: 'complete', agentId: 'a-research', text: 'Research checkpoint saved · 14,200 tokens this attempt' },
];

export default function RunView() {
  const [live, setLive] = React.useState(true);
  const [extra, setExtra] = React.useState(0);
  const [elapsed, setElapsed] = React.useState(47 * 60 + 12);

  React.useEffect(() => {
    if (!live) return;
    const t = setInterval(() => {
      setExtra((e) => Math.min(e + 1, STREAM.length));
      setElapsed((s) => s + 4);
    }, 4000);
    return () => clearInterval(t);
  }, [live]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  const streamed = STREAM.slice(0, extra).map((s, i) => ({
    id: `live-${i}`, runId: 'run-8f3a', time: 'just now',
    kind: s.kind, agentId: s.agentId, text: s.text,
  }));

  return (
    <div>
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 className="page-title">Live Run</h1>
          <p className="page-sub">Watch the AI team work — every step is recorded.</p>
        </div>
        <Button variant={live ? 'secondary' : 'primary'} size="sm" onClick={() => setLive(!live)}>
          {live ? '⏸ Pause stream' : '▶ Resume stream'}
        </Button>
      </div>

      <div className="grid-4 stagger" style={{ marginBottom: 20 }}>
        <Card className="card-pad"><div className="stat"><span className="stat-label">Run ID</span><span className="stat-value mono" style={{ fontSize: 'var(--text-lg)' }}>run-8f3a</span></div></Card>
        <Card className="card-pad"><div className="stat"><span className="stat-label">Status</span><span className="stat-value" style={{ fontSize: 'var(--text-lg)' }}><Badge tone="info" dot live>Running</Badge></span></div></Card>
        <Card className="card-pad"><div className="stat"><span className="stat-label">Elapsed</span><span className="stat-value mono" style={{ fontSize: 'var(--text-lg)' }}>{mm}:{ss}</span></div></Card>
        <Card className="card-pad"><div className="stat"><span className="stat-label">Budget used</span><span className="stat-value mono" style={{ fontSize: 'var(--text-lg)' }}>$3.12 <span className="dim" style={{ fontSize: 'var(--text-sm)' }}>/ $10.00</span></span></div></Card>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <Card className="card-pad">
          <CardHead title="Activity timeline"
            sub={live ? 'Streaming live' : 'Paused'}
            action={live ? <Badge tone="info" dot live>Live</Badge> : <Badge tone="neutral">Paused</Badge>} />
          <div>
            {streamed.map((e) => <ActivityItem key={e.id} event={e} />)}
            {mockActivity.map((e) => <ActivityItem key={e.id} event={e} />)}
          </div>
        </Card>
        <div>
          <Card className="card-pad" style={{ marginBottom: 16 }}>
            <CardHead title="Agents on this run" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['a-planner', 'a-research', 'a-synthesis'].map((id) => {
                const a = agentById(id);
                return (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={a.name} hue={a.avatarHue} size="sm" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{a.name}</div>
                      <div className="dim ellipsis" style={{ fontSize: 'var(--text-xs)' }}>{a.currentTask ?? a.role}</div>
                    </div>
                    <Badge tone={a.status === 'working' ? 'info' : 'neutral'} dot live={a.status === 'working'}>
                      {a.status === 'working' ? 'active' : a.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card className="card-pad">
            <CardHead title="Run controls" sub="Human override — always available" />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button variant="secondary" size="sm">⏸ Pause run</Button>
              <Button variant="danger" size="sm">■ Cancel run</Button>
            </div>
            <p className="hint" style={{ marginTop: 10 }}>Cancelling stops queued tasks immediately; in-flight steps finish their current call, then halt. You get a receipt of what stopped and what was spent.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

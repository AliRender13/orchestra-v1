import { Link } from 'react-router-dom';
import { Card, CardHead, Button, Stat, SectionHead, Avatar } from '../components/ui';
import { ProjectCard } from '../components/cards';
import { mockProjects, mockApprovals, mockUsage } from '../mock/data';
import { agentById, mockAgents } from '../mock/agents';
import { useSimulation } from '../state/SimulationContext';
import { formatAgo, overallProgress, agentWorkStatus, simProjectSnapshot } from '../mock/simulation';

export default function Dashboard() {
  const { sim } = useSimulation();
  const pendingApprovals = mockApprovals.filter((a) => a.status === 'pending');
  const running = sim.tasks.filter((t) => t.status === 'running');
  const activeProjects = mockProjects
    .map((p) => (p.id === sim.projectId ? simProjectSnapshot(p, sim) : p))
    .filter((p) => p.status === 'active');
  const recentArtifacts = sim.tasks
    .flatMap((t) => t.artifacts.map((a) => ({ ...a, task: t.name })))
    .slice(0, 5);
  const needsApproval = sim.tasks.filter((t) => t.status === 'waiting_approval');
  const workingAgents = mockAgents.filter((a) => agentWorkStatus(sim.tasks, a.id) === 'working');

  return (
    <div>
      {/* ── Right now ── */}
      <Card className="card-pad" style={{ marginBottom: 20, background: 'linear-gradient(180deg, var(--bg-2), var(--bg-1))', borderLeft: '3px solid var(--success)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <span className="badge badge-success"><span className="pulse-dot" /> live</span>
          <h1 style={{ fontSize: 'var(--text-xl)', margin: 0 }}>What is happening right now</h1>
        </div>
        <div className="ws-stats" style={{ margin: '0 0 12px' }}>
          <span><b>{activeProjects.length}</b> projects active</span>
          <span className="ok"><b>{running.length}</b> tasks running</span>
          <span><b>{workingAgents.length}</b> agents working</span>
          {needsApproval.length > 0 && <span className="warn"><b>{needsApproval.length}</b> approval waiting</span>}
          <span><b>{overallProgress(sim.tasks)}%</b> AI Research Platform</span>
        </div>
        {sim.events[0] && (
          <p className="muted" style={{ fontSize: 'var(--text-sm)', marginBottom: 14 }}>
            Last activity: <strong style={{ color: 'var(--text-1)' }}>
              {sim.events[0].agentId ? `${agentById(sim.events[0].agentId!).name} — ` : ''}{sim.events[0].text}
            </strong>{' '}
            <span className="dim">· {formatAgo(sim.elapsedSec, sim.events[0].atSec)}</span>
          </p>
        )}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/projects/p-research"><Button variant="primary">◉ Open live project</Button></Link>
          <Link to="/approvals"><Button variant="secondary">✓ Review queue ({pendingApprovals.length + needsApproval.length})</Button></Link>
          <Link to="/ask"><Button variant="ghost">✦ Ask Orchestra</Button></Link>
        </div>
      </Card>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div>
          <SectionHead title="Tasks running now" link="View all" linkTo="/tasks" />
          <Card className="card-pad" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {running.map((t) => {
                const a = agentById(t.agentId);
                return (
                  <Link key={t.id} to="/projects/p-research" style={{ display: 'block' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={a.name} hue={a.avatarHue} size="sm" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="ellipsis" style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{t.name}</div>
                        <div className="dim" style={{ fontSize: 'var(--text-xs)' }}>
                          <span className="badge badge-violet" style={{ marginRight: 6 }}>agent says</span>{t.currentStep}
                        </div>
                        <div className="progress" style={{ marginTop: 6, maxWidth: 280 }}>
                          <i style={{ width: `${t.progress}%` }} />
                        </div>
                      </div>
                      <span className="mono dim" style={{ fontSize: 'var(--text-xs)' }}>{t.progress}%</span>
                    </div>
                  </Link>
                );
              })}
              {running.length === 0 && (
                <p className="dim" style={{ fontSize: 'var(--text-sm)' }}>
                  {sim.projectStatus === 'paused' ? 'Project paused — resume it to continue.' : 'No tasks running right now.'}
                </p>
              )}
            </div>
          </Card>

          <SectionHead title="Active projects" link="View all" linkTo="/projects" />
          <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {activeProjects.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
        </div>

        <div>
          <SectionHead title="Waiting for you" link="Review queue" linkTo="/approvals" />
          <Card className="card-pad" style={{ marginBottom: 20 }}>
            {needsApproval.length === 0 && pendingApprovals.length === 0 && (
              <p className="dim" style={{ fontSize: 'var(--text-sm)' }}>Nothing waiting. The human is in control.</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {needsApproval.map((t) => {
                const a = agentById(t.agentId);
                return (
                  <div key={t.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--warning)', fontSize: 16 }}>⚠</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{t.name}</div>
                      <div className="dim" style={{ fontSize: 'var(--text-xs)' }}>{a.name} · ready for review</div>
                    </div>
                    <Link to="/projects/p-research"><Button size="sm" variant="secondary">Review</Button></Link>
                  </div>
                );
              })}
              {pendingApprovals.slice(0, 2).map((ap) => (
                <div key={ap.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--warning)', fontSize: 16 }}>⚠</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{ap.title}</div>
                    <div className="dim" style={{ fontSize: 'var(--text-xs)' }}>{agentById(ap.agentId).name} · {ap.gate} gate</div>
                  </div>
                  <Link to="/approvals"><Button size="sm" variant="secondary">Review</Button></Link>
                </div>
              ))}
            </div>
          </Card>

          <SectionHead title="Recent activity" link="Live view" linkTo="/activity" />
          <Card className="card-pad" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {sim.events.slice(0, 5).map((e) => {
                const agent = e.agentId ? agentById(e.agentId) : null;
                return (
                  <div key={e.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-1)' }}>
                    {agent && <Avatar name={agent.name} hue={agent.avatarHue} size="sm" />}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 'var(--text-sm)' }}>
                        {agent && <strong>{agent.name}</strong>}{agent && ' — '}{e.text}
                      </div>
                      <div className="dim" style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>
                        {formatAgo(sim.elapsedSec, e.atSec)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <SectionHead title="Recent artifacts" link="Files" linkTo="/files" />
          <Card className="card-pad" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentArtifacts.map((a, i) => (
                <div key={i} className="artifact-row">
                  <span aria-hidden>▤</span>
                  <span className="mono" style={{ fontSize: 'var(--text-sm)', flex: 1 }}>{a.name}</span>
                  <span className="dim" style={{ fontSize: 'var(--text-xs)' }}>{a.task}</span>
                </div>
              ))}
            </div>
          </Card>

          <SectionHead title="This period" />
          <div className="grid-2">
            <Card className="card-pad"><Stat label="Spend · Oct 1–3" value={`$${mockUsage.costUsd.toFixed(2)}`}
              sub={<span className="muted">ceiling, not estimate</span>} /></Card>
            <Card className="card-pad"><Stat label="Project progress" value={`${overallProgress(sim.tasks)}%`}
              sub={<Link to="/projects/p-research" className="section-link">Open project</Link>} /></Card>
          </div>
        </div>
      </div>

      {/* How it works strip — the product's mental model */}
      <Card className="card-pad" style={{ marginTop: 20 }}>
        <CardHead title="How Orchestra works" sub="You set the objective. The AI team does the work. You approve what matters." />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
          {['You', 'Objective', 'AI Team', 'Tasks', 'Tools', 'Result'].map((s, i, arr) => (
            <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="badge badge-info">{s}</span>
              {i < arr.length - 1 && <span className="dim">→</span>}
            </span>
          ))}
        </div>
        <p className="hint" style={{ marginTop: 12 }}>
          AI can work, collaborate, and use tools — but the human remains in control. Every consequential action needs your approval.
        </p>
      </Card>
    </div>
  );
}

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardHead, Button, Tabs, ProgressBar, Avatar, Badge, EmptyState } from '../components/ui';
import { ProjectStatusBadge } from '../components/StatusBadge';
import { TaskRow, ApprovalCard, ActivityItem } from '../components/cards';
import FileTable from '../components/FileTable';
import { projectById, tasksForProject, mockActivity, mockApprovals, mockFiles, planForProject, mockResultReviews } from '../mock/data';
import { mockAgents, agentById } from '../mock/agents';
import { useSimulation } from '../state/SimulationContext';
import { useRealProject } from '../state/useRealProject';
import type { Project } from '../types';
import { taskCounts, overallProgress, formatAgo, agentWorkStatus } from '../mock/simulation';
import type { SimTask } from '../mock/simulation';
import PlanReview from '../components/PlanReview';
import ResultReview from '../components/ResultReview';
import TaskDrawer from '../components/TaskDrawer';

const SIM_PROJECT = 'p-research';

/* ── execution timeline derived from task states ── */
function timelineSteps(tasks: SimTask[]): { label: string; state: 'done' | 'current' | 'todo' }[] {
  const st = (id: string) => tasks.find((t) => t.id === id)?.status;
  const isDone = (ids: string[]) => ids.every((i) => st(i) === 'completed');
  const isCurrent = (ids: string[]) => ids.some((i) => ['running', 'ready', 'paused'].includes(st(i) ?? ''));
  const step = (label: string, ids: string[]) => ({
    label, state: (isDone(ids) ? 'done' : isCurrent(ids) ? 'current' : 'todo') as 'done' | 'current' | 'todo',
  });
  return [
    { label: 'Objective created', state: 'done' },
    { label: 'Plan generated', state: 'done' },
    { label: 'Plan approved', state: 'done' },
    step('Research', ['s-r1', 's-r2', 's-r3']),
    step('Synthesis', ['s-s1']),
  ];
}

export default function ProjectWorkspace() {
  const { id } = useParams();
  const isReal = !!id && !id.startsWith('p-');
  const mockProject = projectById(id ?? '');
  const { sim: simCtx, dispatch: simDispatch } = useSimulation();
  const real = useRealProject(isReal ? (id as string) : null);

  // Real backend projects render through the same frozen UI by adapting the
  // API snapshot into the shapes the screens already consume.
  const sim = isReal ? real.sim : simCtx;
  const dispatch = isReal ? real.dispatch : simDispatch;
  const project: Project = isReal && real.run ? {
    id: real.run.project.id,
    name: real.run.project.objective.length > 64
      ? real.run.project.objective.slice(0, 64) + '…'
      : real.run.project.objective,
    description: real.run.project.objective,
    objective: real.run.project.objective,
    status: sim.projectStatus as Project['status'],
    progress: sim.tasks.length ? Math.round((sim.tasks.filter((t) => t.status === 'completed').length / sim.tasks.length) * 100) : 0,
    agents: ['a-planner', 'a-research', 'a-synthesis'],
    taskCounts: { pending: 0, ready: 0, running: 0, paused: 0, waiting_approval: 0, completed: 0, failed: 0 },
    lastActivity: '',
    lastActivityAt: '',
    createdAt: real.run.project.created_at,
    color: '#5b8cff',
  } : mockProject;
  const isSim = mockProject.id === SIM_PROJECT || isReal;
  const [tab, setTab] = React.useState('Overview');
  const [drawerTaskId, setDrawerTaskId] = React.useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = React.useState(false);

  const legacyTasks = isReal ? [] : tasksForProject(project.id);
  const tasks: SimTask[] = isSim ? sim.tasks : (legacyTasks as SimTask[]);
  const agents = mockAgents.filter((a) => project.agents.includes(a.id));
  const approvals: import('../types').Approval[] = isReal && real.run
    ? real.run.approvals.map((a) => ({
        id: a.id, gate: a.gate as import('../types').ApprovalGate,
        title: a.title, description: a.description, reason: a.reason,
        agentId: 'a-planner', projectId: a.project_id,
        requestedAt: new Date(a.requested_at).toLocaleString(),
        expiresIn: '—', status: a.status as import('../types').ApprovalStatus,
      }))
    : mockApprovals.filter((a) => a.projectId === project.id);

  const tabs = ['Overview', 'Plan', 'Tasks', 'Results', 'Files', 'Activity', 'Approvals'];

  const counts = isSim ? taskCounts(sim.tasks) : null;
  const progress = isSim ? overallProgress(sim.tasks) : project.progress;
  const doneCount = isSim ? counts!.completed : legacyTasks.filter((t) => t.status === 'completed').length;
  const waitingApproval = isSim ? sim.tasks.filter((t) => t.status === 'waiting_approval') : [];
  const drawerTask = drawerTaskId ? tasks.find((t) => t.id === drawerTaskId) ?? null : null;

  const projStatus = isSim ? sim.projectStatus : project.status;

  if (isReal && real.loading) {
    return (
      <div>
        <Link to="/projects" className="section-link" style={{ fontSize: 'var(--text-sm)' }}>← Projects</Link>
        <Card className="card-pad" style={{ marginTop: 16, textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>◈</div>
          <h1 className="page-title" style={{ marginBottom: 8 }}>Connecting to Orchestra backend…</h1>
          <p className="page-sub">Fetching the live project state.</p>
        </Card>
      </div>
    );
  }

  if (isReal && real.error && !real.run) {
    return (
      <div>
        <Link to="/projects" className="section-link" style={{ fontSize: 'var(--text-sm)' }}>← Projects</Link>
        <Card className="card-pad" style={{ marginTop: 16, textAlign: 'center', padding: '48px 24px', borderColor: 'var(--danger)' }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>⚠</div>
          <h1 className="page-title" style={{ marginBottom: 8 }}>Backend unreachable</h1>
          <p className="page-sub" style={{ marginBottom: 16 }}>{real.error}</p>
          <Button size="sm" onClick={() => real.refresh()}>Retry</Button>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* ── Project header ── */}
      <div style={{ marginBottom: 14 }}>
        <Link to="/projects" className="section-link" style={{ fontSize: 'var(--text-sm)' }}>← Projects</Link>
      </div>
      <Card className="card-pad" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ width: 48, height: 48, borderRadius: 12, background: project.color + '22', border: `1px solid ${project.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>▦</span>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 className="page-title">{project.name}</h1>
              <ProjectStatusBadge status={projStatus} />
              {isSim && sim.projectStatus === 'active' && (
                <span className="badge badge-info"><span className="pulse-dot" /> live</span>
              )}
            </div>
            <p className="page-sub">{project.description}</p>
          </div>
          {isSim && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {sim.projectStatus === 'active' && (
                <Button variant="secondary" size="sm" onClick={() => dispatch({ type: 'PAUSE_PROJECT' })}>⏸ Pause</Button>
              )}
              {sim.projectStatus === 'paused' && (
                <Button variant="primary" size="sm" onClick={() => dispatch({ type: 'RESUME_PROJECT' })}>▶ Resume</Button>
              )}
              {(sim.projectStatus === 'active' || sim.projectStatus === 'paused') && (
                confirmCancel
                  ? <><Button variant="danger" size="sm" onClick={() => { dispatch({ type: 'CANCEL_PROJECT' }); setConfirmCancel(false); }}>Confirm cancel</Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmCancel(false)}>Keep running</Button></>
                  : <Button variant="ghost" size="sm" onClick={() => setConfirmCancel(true)}>Cancel</Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setTab('Tasks')}>View tasks</Button>
              <Button variant="ghost" size="sm" onClick={() => setTab('Activity')}>Activity</Button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <div style={{ flex: 1 }}><ProgressBar value={progress} tone="progress-success" /></div>
          <span className="mono" style={{ fontSize: 'var(--text-base)', fontWeight: 800 }}>{progress}%</span>
          <span className="dim" style={{ fontSize: 'var(--text-xs)' }}>{doneCount}/{tasks.length} tasks complete</span>
        </div>

        {isSim && counts && (
          <div className="ws-stats">
            <span><b>{tasks.length}</b> tasks</span>
            <span className="ok"><b>{counts.running}</b> running</span>
            <span><b>{counts.ready + counts.pending}</b> waiting</span>
            <span className="ok"><b>{counts.completed}</b> completed</span>
            {counts.waiting_approval > 0 && <span className="warn"><b>{counts.waiting_approval}</b> need approval</span>}
            {counts.failed > 0 && <span className="bad"><b>{counts.failed}</b> failed</span>}
          </div>
        )}
      </Card>

      {/* ── approval callout ── */}
      {isSim && waitingApproval.length > 0 && sim.projectStatus !== 'cancelled' && (
        <div className="banner" style={{ background: 'rgba(255,176,32,.08)', borderColor: 'rgba(255,176,32,.35)', color: 'var(--warning)', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 18 }}>⚠</span>
            <div style={{ flex: 1, minWidth: 200 }}>
              <b>Approval required.</b>{' '}
              <span style={{ color: 'var(--text-2)' }}>{waitingApproval[0].name} is ready for review — {waitingApproval[0].result}</span>
            </div>
            <Button size="sm" variant="primary" onClick={() => setDrawerTaskId(waitingApproval[0].id)}>Review result</Button>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
      </div>

      <div key={tab} className="page-enter">
        {tab === 'Overview' && isSim && (
          <div className="ws-grid">
            {/* main column */}
            <div>
              <Card className="card-pad" style={{ marginBottom: 16 }}>
                <CardHead title="Execution timeline" sub="Where this project stands in its plan" />
                <div className="timeline">
                  {timelineSteps(sim.tasks).map((s, i) => (
                    <div key={s.label} className={`tl-step ${s.state}`}>
                      <span className="tl-dot">{s.state === 'done' ? '✓' : s.state === 'current' ? '◉' : '○'}</span>
                      <span className="tl-label">{s.label}</span>
                      {i < timelineSteps(sim.tasks).length - 1 && <span className="tl-line" />}
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="card-pad">
                <CardHead title="Tasks" sub="Click any task for detail"
                  action={<Button size="sm" variant="ghost" onClick={() => setTab('Tasks')}>All tasks →</Button>} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(['running', 'waiting_approval', 'ready', 'pending', 'failed', 'paused', 'completed'] as const).map((st) => {
                    const group = sim.tasks.filter((t) => t.status === st);
                    if (!group.length) return null;
                    const label = { running: 'Running now', waiting_approval: 'Needs your approval', ready: 'Ready', pending: 'Waiting', failed: 'Failed', paused: 'Paused', completed: 'Completed' }[st];
                    return (
                      <div key={st}>
                        <div className="nav-section" style={{ padding: '10px 2px 6px' }}>{label} · {group.length}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {group.map((t) => (
                            <TaskRow key={t.id} task={t} onClick={() => setDrawerTaskId(t.id)} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* side column */}
            <div>
              <Card className="card-pad" style={{ marginBottom: 16 }}>
                <CardHead title="Live activity" sub="Demo feed — updates as tasks run"
                  action={<span className="badge badge-info"><span className="pulse-dot" /> live</span>} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {sim.events.slice(0, 7).map((e) => {
                    const agent = e.agentId ? agentById(e.agentId) : null;
                    return (
                      <div key={e.id} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border-1)' }}>
                        {agent && <Avatar name={agent.name} hue={agent.avatarHue} size="sm" />}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 'var(--text-sm)' }}>
                            {agent && <strong>{agent.name}</strong>}{agent && ' — '}{e.text}
                          </div>
                          <div className="dim" style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>
                            {formatAgo(sim.elapsedSec, e.atSec)} · <span className="mono">{e.runId}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card className="card-pad" style={{ marginBottom: 16 }}>
                <CardHead title="AI team" sub={`${agents.length} agents on this project`} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {agents.map((a) => {
                    const ws = agentWorkStatus(sim.tasks, a.id);
                    const current = sim.tasks.find((t) => t.agentId === a.id && t.status === 'running');
                    return (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={a.name} hue={a.avatarHue} size="sm" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{a.name}</div>
                          <div className="dim ellipsis" style={{ fontSize: 'var(--text-xs)' }}>
                            {a.role}{current ? ` · ${current.name} (${current.progress}%)` : ''}
                          </div>
                        </div>
                        {ws === 'working' && <span className="badge badge-info"><span className="pulse-dot" /> working</span>}
                        {ws === 'waiting' && <span className="badge badge-warning">waiting</span>}
                        {ws === 'done' && <span className="badge badge-success">✓ done</span>}
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card className="card-pad">
                <CardHead title="Budget" sub="Hard ceiling — execution stops at the cap" />
                <div className="mono" style={{ fontSize: 'var(--text-xl)', fontWeight: 800 }}>
                  ${isReal && real.run ? real.run.project.budget_ceiling_usd.toFixed(2) : '2.50'}
                </div>
                <div className="hint" style={{ marginTop: 4 }}>
                  Ceiling, not estimate. Spent so far: ${isReal && real.run
                    ? real.run.project.budget_spent_usd.toFixed(4)
                    : sim.tasks.reduce((s, t) => s + t.costUsd, 0).toFixed(2)} · BYOK — you pay providers directly.
                </div>
              </Card>
            </div>
          </div>
        )}

        {tab === 'Overview' && !isSim && (
          <div>
            <Card className="card-pad" style={{ marginBottom: 16, borderLeft: '3px solid var(--accent)' }}>
              <CardHead title="Objective" sub="Set by you" />
              <p style={{ fontSize: 'var(--text-lg)', lineHeight: 1.6 }}>{project.objective}</p>
            </Card>
            <div className="grid-2" style={{ alignItems: 'start' }}>
              <div>
                <h3 style={{ marginBottom: 12, fontSize: 'var(--text-base)' }}>Roles</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {agents.map((a) => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={a.name} hue={a.avatarHue} size="sm" />
                      <div>
                        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{a.name}</div>
                        <div className="dim" style={{ fontSize: 'var(--text-xs)' }}>{a.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <h3 style={{ margin: '20px 0 12px', fontSize: 'var(--text-base)' }}>Pending approvals</h3>
                {approvals.filter((a) => a.status === 'pending').length === 0
                  ? <p className="dim" style={{ fontSize: 'var(--text-sm)' }}>Nothing waiting. The human is in control.</p>
                  : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {approvals.filter((a) => a.status === 'pending').map((a) => <ApprovalCard key={a.id} approval={a} />)}
                    </div>}
              </div>
              <div>
                <h3 style={{ marginBottom: 12, fontSize: 'var(--text-base)' }}>Latest activity</h3>
                <Card className="card-pad">
                  {mockActivity.slice(0, 4).map((e) => <ActivityItem key={e.id} event={e} />)}
                </Card>
              </div>
            </div>
          </div>
        )}

        {tab === 'Plan' && (() => {
          if (isReal && real.run) {
            const rp = real.run.plan;
            if (!rp) {
              return <EmptyState icon="◈" title="No plan yet" sub="The planner will propose a versioned plan for your approval." />;
            }
            if (rp.status === 'generating') {
              return <EmptyState icon="◈" title="Planner is drafting plan v1…" sub="The real provider is generating the task plan. This appears for your approval shortly." />;
            }
            if (rp.status === 'failed') {
              return (
                <Card className="card-pad" style={{ borderColor: 'var(--danger)' }}>
                  <CardHead title="Plan generation failed" />
                  <p className="muted" style={{ fontSize: 'var(--text-sm)', marginBottom: 12 }}>{rp.failure_reason || 'Unknown error.'}</p>
                  <p className="hint">No fake plan was substituted. Fix the cause (e.g. provider key, budget ceiling) and request a new plan from Ask.</p>
                </Card>
              );
            }
            if (rp.status === 'rejected') {
              return (
                <Card className="card-pad" style={{ borderColor: 'var(--danger)' }}>
                  <CardHead title="Plan rejected" />
                  <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                    You rejected plan v{rp.version}. Create a new project from Ask to try again with an adjusted objective.
                  </p>
                </Card>
              );
            }
            const planLike = {
              id: rp.id, projectId: rp.project_id, version: rp.version,
              status: (rp.status === 'approved' ? 'approved' : 'pending_review') as 'approved' | 'pending_review',
              proposedBy: 'a-planner', validatedAt: 'just now',
              costCeiling: rp.cost_ceiling_usd,
              tasks: rp.tasks.map((t, i) => ({
                id: `rp-${i}`, name: t.name, purpose: t.purpose, inputs: [],
                network: t.network, privateData: t.privateData,
                tools: t.tools, costCeiling: t.costCeiling,
              })),
            };
            return (
              <div>
                {rp.status === 'pending_approval' && (
                  <Card className="card-pad" style={{ marginBottom: 16, borderLeft: '3px solid var(--warning)' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <strong style={{ fontSize: 'var(--text-sm)' }}>Your approval needed</strong>
                        <p className="muted" style={{ fontSize: 'var(--text-sm)', marginTop: 4 }}>
                          Plan v{rp.version}: {rp.tasks.length} tasks, ceiling ${rp.cost_ceiling_usd.toFixed(2)}.
                          Every task passed the exposure check.
                        </p>
                      </div>
                      <Button size="sm" variant="success" onClick={() => {
                        const ap = real.run?.approvals.find((a) => a.plan_id === rp.id && a.status === 'pending');
                        if (ap) real.approve(ap.id);
                      }}>Approve plan</Button>
                      <Button size="sm" variant="secondary" onClick={() => {
                        const ap = real.run?.approvals.find((a) => a.plan_id === rp.id && a.status === 'pending');
                        if (ap) real.reject(ap.id);
                      }}>Reject</Button>
                    </div>
                  </Card>
                )}
                <PlanReview plan={planLike} />
              </div>
            );
          }
          const plan = planForProject(project.id);
          return plan ? <PlanReview plan={plan} /> : (
            <EmptyState icon="◈" title="No plan yet" sub="The planner will propose a versioned plan for your approval." />
          );
        })()}

        {tab === 'Results' && (() => {
          if (isReal) {
            const done = tasks.filter((t) => t.status === 'completed' && t.result);
            if (!done.length) {
              return <EmptyState icon="◉" title="No results yet" sub="Completed task results will appear here as the worker finishes." />;
            }
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {done.map((t) => (
                  <Card key={t.id} className="card-pad">
                    <CardHead
                      title={t.name}
                      sub={`${agentById(t.agentId).name} · $${t.costUsd.toFixed(4)} · ${t.tokens.toLocaleString()} tokens`}
                      action={<Badge tone="success">completed</Badge>}
                    />
                    <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{t.result}</p>
                  </Card>
                ))}
              </div>
            );
          }
          const doneIds = new Set(tasks.filter((t) => t.status === 'completed').map((t) => t.id));
          const reviews = mockResultReviews.filter((r) => doneIds.has(r.taskId));
          return reviews.length ? (
            <ResultReview reviews={reviews} title="Result review" sub="Claims checked against sources — your judgment completes the check" />
          ) : (
            <EmptyState icon="◉" title="No results to review" sub="Completed tasks with checkable claims will appear here." />
          );
        })()}

        {tab === 'Tasks' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(['running', 'waiting_approval', 'ready', 'pending', 'failed', 'paused', 'completed'] as const).map((s) => {
              const group = tasks.filter((t) => t.status === s);
              if (!group.length) return null;
              return (
                <div key={s}>
                  <div className="nav-section" style={{ padding: '8px 2px' }}>{s.replace('_', ' ')} · {group.length}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {group.map((t) => (
                      <TaskRow key={t.id} task={t} onClick={isSim ? () => setDrawerTaskId(t.id) : undefined} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'Files' && (
          <Card className="card-pad">
            <CardHead title="Project files" sub={`${mockFiles.length} files · versioned · agent access controlled`}
              action={<Button size="sm" variant="secondary">⤒ Upload</Button>} />
            <FileTable files={mockFiles} />
          </Card>
        )}

        {tab === 'Activity' && (
          <Card className="card-pad">
            <CardHead title="Activity timeline" sub={isSim ? 'Live demo feed — updates as tasks run' : 'Every run, handoff, and decision — auditable'} />
            {isSim
              ? sim.events.map((e) => {
                  const agent = e.agentId ? agentById(e.agentId) : null;
                  return (
                    <div key={e.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-1)' }}>
                      {agent ? <Avatar name={agent.name} hue={agent.avatarHue} size="sm" /> : <span className="badge badge-info" style={{ height: 26, width: 26, padding: 0, justifyContent: 'center' }}>◈</span>}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 'var(--text-sm)' }}>
                          {agent && <strong>{agent.name}</strong>}{agent && ' — '}{e.text}
                        </div>
                        <div className="dim" style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>
                          {formatAgo(sim.elapsedSec, e.atSec)} · <span className="mono">{e.runId}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              : mockActivity.map((e) => <ActivityItem key={e.id} event={e} />)}
          </Card>
        )}

        {tab === 'Approvals' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {isSim && waitingApproval.map((t) => (
              <Card key={t.id} className="card-pad" style={{ borderLeft: '3px solid var(--warning)' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <Avatar name={agentById(t.agentId).name} hue={agentById(t.agentId).avatarHue} size="md" />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                      <strong style={{ fontSize: 'var(--text-sm)' }}>{t.name}</strong>
                      <Badge tone="info">Result gate</Badge>
                    </div>
                    <p className="muted" style={{ fontSize: 'var(--text-sm)', marginBottom: 8 }}>{t.result}</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button size="sm" variant="success" onClick={() => dispatch({ type: 'APPROVE_TASK', id: t.id })}>Approve</Button>
                      <Button size="sm" variant="secondary" onClick={() => setDrawerTaskId(t.id)}>Review detail</Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            {approvals.length === 0 && waitingApproval.length === 0
              ? <EmptyState icon="✓" title="No approvals" sub="Approval requests for this project will appear here." />
              : approvals.map((a) => (
                  <div key={a.id}>
                    <ApprovalCard approval={a} onReview={() => {}} />
                    {isReal && a.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <Button size="sm" variant="success" onClick={() => real.approve(a.id)}>Approve</Button>
                        <Button size="sm" variant="secondary" onClick={() => real.reject(a.id)}>Reject</Button>
                      </div>
                    )}
                  </div>
                ))}
          </div>
        )}
      </div>

      {/* task detail drawer */}
      {drawerTask && (
        <TaskDrawer
          task={drawerTask}
          tasks={tasks}
          elapsedSec={isSim ? sim.elapsedSec : 0}
          onClose={() => setDrawerTaskId(null)}
          onAction={(action, taskId) => {
            if (action === 'pause') dispatch({ type: 'PAUSE_TASK', id: taskId });
            if (action === 'resume') dispatch({ type: 'RESUME_TASK', id: taskId });
            if (action === 'retry') dispatch({ type: 'RETRY_TASK', id: taskId });
            if (action === 'approve') { dispatch({ type: 'APPROVE_TASK', id: taskId }); setDrawerTaskId(null); }
          }}
        />
      )}
    </div>
  );
}

import type { Project, Task, ActivityEvent, Approval, WorkspaceFile, Integration, UsageSummary } from '../types';

export const mockProjects: Project[] = [
  {
    id: 'p-research',
    name: 'AI Research Platform',
    description: 'Competitive analysis of AI agent orchestration frameworks.',
    objective:
      'Produce a competitive analysis of AI agent orchestration frameworks (LangGraph, CrewAI, AutoGen, OpenAI Agents SDK), with every claim cited and every number traced to a source.',
    status: 'active',
    progress: 25,
    agents: ['a-planner', 'a-research', 'a-synthesis'],
    taskCounts: { pending: 1, ready: 1, running: 1, paused: 0, waiting_approval: 0, completed: 1, failed: 0 },
    lastActivity: 'Research started “CrewAI and AutoGen”',
    lastActivityAt: 'just now',
    createdAt: 'Sep 28',
    color: '#5b8cff',
  },
  {
    id: 'p-market',
    name: 'Market Analysis',
    description: 'TAM/SAM/SOM sizing for the AI workspace category.',
    objective:
      'Size the AI collaboration workspace market (TAM/SAM/SOM) with sourced methodology and a one-page executive summary.',
    status: 'paused',
    progress: 20,
    agents: ['a-planner', 'a-research', 'a-synthesis'],
    taskCounts: { pending: 5, ready: 0, running: 0, waiting_approval: 0, paused: 0, completed: 2, failed: 0 },
    lastActivity: 'Paused by you',
    lastActivityAt: '2 days ago',
    createdAt: 'Sep 25',
    color: '#3ecf8e',
  },
];

export const mockTasks: Task[] = [
  // NOTE: p-research tasks live in the simulation (src/mock/simulation.ts).
  // Static tasks for other projects (if any) go here.
];

export const mockActivity: ActivityEvent[] = [
  { id: 'e-1', runId: 'run-8f3a', time: '4 min ago', kind: 'complete', agentId: 'a-research', text: 'Research completed “LangGraph architecture” — 18 sources cited' },
  { id: 'e-2', runId: 'run-8f3a', time: '20 min ago', kind: 'start', agentId: 'a-research', text: 'Research started “CrewAI and AutoGen”' },
  { id: 'e-3', runId: 'run-8f3a', time: '48 min ago', kind: 'handoff', agentId: 'a-synthesis', text: 'Orchestrator passed research brief to Synthesis' },
  { id: 'e-4', runId: 'run-8f3a', time: '3 hrs ago', kind: 'plan', agentId: 'a-planner', text: 'Planner proposed plan v3: 4 tasks, est. ceiling $2.50 — approved by you' },
];

export const mockApprovals: Approval[] = [
  {
    id: 'ap-2', gate: 'result', title: 'Publish comparison matrix', status: 'pending',
    description: 'Planner wants to publish the synthesis result.',
    reason: 'All claims checked against stored sources. 3 unverifiable claims excluded.',
    agentId: 'a-planner', projectId: 'p-research', requestedAt: '26 min ago', expiresIn: '23h 34m',
  },
];

export const mockFiles: WorkspaceFile[] = [
  { id: 'f-1', name: 'comparison-matrix.md', path: '/research/comparison-matrix.md', type: 'doc', size: '48 KB', modified: '12 min ago', modifiedBy: 'a-planner', access: ['a-planner', 'a-research', 'a-synthesis'] },
  { id: 'f-2', name: 'langgraph-brief.md', path: '/research/langgraph-brief.md', type: 'doc', size: '32 KB', modified: '2 hrs ago', modifiedBy: 'a-research', access: ['a-research', 'a-planner', 'a-synthesis'] },
  { id: 'f-3', name: 'market-sizing.csv', path: '/research/market-sizing.csv', type: 'data', size: '12 KB', modified: '4 min ago', modifiedBy: 'a-research', access: ['a-research', 'a-planner'] },
  { id: 'f-6', name: 'api-reference.md', path: '/docs/api-reference.md', type: 'doc', size: '21 KB', modified: '48 min ago', modifiedBy: 'a-synthesis', access: ['a-synthesis', 'a-planner'] },
  { id: 'f-7', name: 'exec-summary.md', path: '/research/exec-summary.md', type: 'doc', size: '9 KB', modified: 'Yesterday', modifiedBy: 'a-synthesis', access: ['a-synthesis', 'a-planner'] },
];

export const mockIntegrations: Integration[] = [
  { id: 'i-github', name: 'GitHub', category: 'Code', description: 'Read repos, open pull requests behind approval.', status: 'available', icon: '⬡' },
  { id: 'i-drive', name: 'Google Drive', category: 'Files', description: 'Sync project documents and exports.', status: 'available', icon: '▣' },
  { id: 'i-gmail', name: 'Gmail', category: 'Communication', description: 'Draft and send mail behind approval.', status: 'available', icon: '✉' },
  { id: 'i-slack', name: 'Slack', category: 'Communication', description: 'Post run summaries to channels.', status: 'available', icon: '#' },
  { id: 'i-discord', name: 'Discord', category: 'Communication', description: 'Notify on approvals and completions.', status: 'available', icon: '◈' },
  { id: 'i-postgres', name: 'PostgreSQL', category: 'Data', description: 'Query project databases with declared schemas.', status: 'coming_soon', icon: '⛁' },
  { id: 'i-api', name: 'REST API', category: 'Developer', description: 'Call external APIs through scoped grants.', status: 'coming_soon', icon: '{ }' },
  { id: 'i-browser', name: 'Browser', category: 'Automation', description: 'Drive web workflows behind approval.', status: 'coming_soon', icon: '◐' },
];

export const mockUsage: UsageSummary = {
  period: 'Oct 1 – Oct 3',
  requests: 148,
  tokens: 1240000,
  costUsd: 4.87,
  tasksCompleted: 26,
  byProvider: [
    { provider: 'Anthropic', pct: 46, color: '#d97757' },
    { provider: 'OpenAI', pct: 31, color: '#3ecf8e' },
    { provider: 'xAI', pct: 13, color: '#9dacc1' },
    { provider: 'DeepSeek', pct: 10, color: '#5b8cff' },
  ],
  daily: [0.9, 1.4, 1.1, 0.6, 1.8, 2.2, 1.5, 0.8, 1.2, 1.9, 2.4, 1.7, 1.3, 4.87],
};

export const projectById = (id: string): Project =>
  mockProjects.find((p) => p.id === id) ?? mockProjects[0];

export const tasksForProject = (projectId: string): Task[] =>
  mockTasks.filter((t) => t.projectId === projectId);

/* ── Plans + exposure manifests (demo data) ─────────────────────────── */

export interface PlanTask {
  id: string;
  name: string;
  purpose: string; // agent-proposed — labeled AGENT SAYS in the UI
  inputs: string[];
  network: boolean;
  privateData: boolean;
  tools: string[];
  costCeiling: number;
}

export interface Plan {
  id: string;
  projectId: string;
  version: number;
  status: 'approved' | 'pending_review';
  proposedBy: string; // agent id
  validatedAt: string;
  costCeiling: number;
  tasks: PlanTask[];
}

export const mockPlans: Plan[] = [
  {
    id: 'plan-3', projectId: 'p-research', version: 3, status: 'approved',
    proposedBy: 'a-planner', validatedAt: '3 hrs ago', costCeiling: 2.5,
    tasks: [
      { id: 's-r1', name: 'Research LangGraph architecture', purpose: 'Gather primary-source facts on LangGraph checkpointing and tool use.', inputs: ['objective', 'public web'], network: true, privateData: false, tools: ['web-search', 'web-fetch'], costCeiling: 0.6 },
      { id: 's-r2', name: 'Research CrewAI and AutoGen', purpose: 'Gather primary-source facts on CrewAI and AutoGen for the comparison matrix.', inputs: ['objective', 'public web'], network: true, privateData: false, tools: ['web-search', 'web-fetch'], costCeiling: 0.6 },
      { id: 's-r3', name: 'Research OpenAI Agents SDK', purpose: 'Gather primary-source facts on the Agents SDK guardrail model.', inputs: ['objective', 'public web'], network: true, privateData: false, tools: ['web-search', 'web-fetch'], costCeiling: 0.5 },
      { id: 's-s1', name: 'Synthesize comparison matrix', purpose: 'Combine gathered research into a comparison matrix using only workspace data.', inputs: ['s-r1 result', 's-r2 result', 's-r3 result'], network: false, privateData: true, tools: ['file-reader', 'file-writer'], costCeiling: 0.8 },
    ],
  },
];

export const planForProject = (projectId: string): Plan | undefined =>
  mockPlans.find((p) => p.projectId === projectId);

/* ── Result review: claims checked against sources (demo data) ───────── */

export interface ClaimReview {
  id: string;
  taskId: string;
  claim: string;
  source: string;
  sourceUrl: string;
  urlStatus: string;
  quote: string;
  storedRef: string;
  validatorStatus: 'passed' | 'failed' | 'needs_review';
  validatorNote: string;
  flags: string[];
  agentCommentary: string; // labeled AGENT SAYS in the UI
  agentId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'correction_requested';
}

export const mockResultReviews: ClaimReview[] = [
  {
    id: 'cr-1', taskId: 's-r1', agentId: 'a-research', status: 'pending',
    claim: 'LangGraph supports durable checkpointing with a Postgres checkpointer.',
    source: 'LangGraph documentation — persistence guide',
    sourceUrl: 'https://docs.langchain.com/langgraph/persistence',
    urlStatus: '200 OK · fetched 2h ago',
    quote: '“…use PostgresSaver to persist checkpoints across runs…”',
    storedRef: 'snapshot #s-118 · sha256:9f2c…a41b',
    validatorStatus: 'passed',
    validatorNote: 'Quote found verbatim in stored snapshot. URL resolves.',
    flags: [],
    agentCommentary: 'This is the load-bearing claim for the orchestration recommendation — it held up in the primary docs.',
  },
  {
    id: 'cr-2', taskId: 's-r1', agentId: 'a-research', status: 'pending',
    claim: 'LangGraph provides human-in-the-loop interrupt points for approval flows.',
    source: 'LangGraph documentation — human-in-the-loop guide',
    sourceUrl: 'https://docs.langchain.com/langgraph/human-in-the-loop',
    urlStatus: '200 OK · fetched 2h ago',
    quote: '“…interrupt execution to wait for human input before continuing…”',
    storedRef: 'snapshot #s-121 · sha256:77be…c903',
    validatorStatus: 'passed',
    validatorNote: 'Quote found verbatim in stored snapshot. URL resolves.',
    flags: [],
    agentCommentary: 'Directly relevant to our approval-gate design.',
  },
  {
    id: 'cr-3', taskId: 's-r2', agentId: 'a-research', status: 'pending',
    claim: 'CrewAI offers per-agent role configuration comparable to LangGraph subgraphs.',
    source: 'CrewAI documentation — agents guide',
    sourceUrl: 'https://docs.crewai.com/agents',
    urlStatus: '200 OK · fetched 3h ago',
    quote: '“…define agents with roles, goals, and backstories…”',
    storedRef: 'snapshot #s-130 · sha256:31ad…e7f2',
    validatorStatus: 'needs_review',
    validatorNote: 'Quote found, but "comparable to subgraphs" is an interpretation, not a sourced fact.',
    flags: ['Interpretation flagged — not directly sourced'],
    agentCommentary: 'I believe the comparison holds, but I could not find a source that states it outright.',
  },
  {
    id: 'cr-4', taskId: 's-r2', agentId: 'a-research', status: 'pending',
    claim: 'AutoGen has high framework maturity for production multi-agent systems.',
    source: '—',
    sourceUrl: '',
    urlStatus: 'No source provided',
    quote: '—',
    storedRef: '—',
    validatorStatus: 'failed',
    validatorNote: 'No source snapshot. Claim cannot be traced.',
    flags: ['Unsourced claim', 'Maturity rating disputed — see project memory'],
    agentCommentary: 'My assessment from usage patterns, but I could not back it with a citable source.',
  },
];

export const reviewsForTask = (taskId: string): ClaimReview[] =>
  mockResultReviews.filter((r) => r.taskId === taskId);

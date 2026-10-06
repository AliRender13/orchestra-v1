import type { Agent } from '../types';

// ── MVP roles ────────────────────────────────────────────────────────────
// These labels reflect the actual MVP task/exposure model, not personalities:
//   Planner   — generates versioned plans with per-task exposure manifests.
//   Research  — network-only gather tasks (never sees private workspace data).
//   Synthesis — workspace-data-only tasks (no network access).
// The MVP runs on a single provider.

export const mockAgents: Agent[] = [
  {
    id: 'a-planner',
    name: 'Planner',
    role: 'Plan generation',
    model: 'MVP provider',
    provider: 'MVP',
    status: 'idle',
    currentTask: undefined,
    instructions:
      'Generate versioned plans: sequenced tasks, per-task exposure manifests (network XOR private data), and cost ceilings. Never assign both network and private-data access to one task.',
    permissions: [
      { label: 'Create and assign tasks', granted: true },
      { label: 'Read project files', granted: true },
      { label: 'Modify project files', granted: false },
      { label: 'External actions', granted: false },
    ],
    tools: ['task-planner', 'file-reader'],
    tokensUsed: 3200,
    tasksCompleted: 1,
    avatarHue: 222,
  },
  {
    id: 'a-research',
    name: 'Research',
    role: 'Web research',
    model: 'MVP provider',
    provider: 'MVP',
    status: 'working',
    currentTask: 'Researching agent orchestration frameworks',
    instructions:
      'Gather information from the public web. You never see private workspace data in the same task where you use network tools. Cite every claim with a source URL.',
    permissions: [
      { label: 'Web research', granted: true },
      { label: 'Read project files', granted: false },
      { label: 'Modify project files', granted: false },
      { label: 'External actions', granted: false },
    ],
    tools: ['web-search', 'web-fetch'],
    tokensUsed: 52100,
    tasksCompleted: 3,
    avatarHue: 160,
  },
  {
    id: 'a-synthesis',
    name: 'Synthesis',
    role: 'Result synthesis',
    model: 'MVP provider',
    provider: 'MVP',
    status: 'idle',
    currentTask: undefined,
    instructions:
      'Combine completed research into comparisons and recommendations using workspace data only. No network access. Flag claims you cannot trace to a stored source.',
    permissions: [
      { label: 'Web research', granted: false },
      { label: 'Read project files', granted: true },
      { label: 'Modify project files', granted: true },
      { label: 'External actions', granted: false },
    ],
    tools: ['file-reader', 'file-writer', 'schema-validator'],
    tokensUsed: 10800,
    tasksCompleted: 1,
    avatarHue: 280,
  },
];

export const agentById = (id: string): Agent =>
  mockAgents.find((a) => a.id === id) ?? mockAgents[0];

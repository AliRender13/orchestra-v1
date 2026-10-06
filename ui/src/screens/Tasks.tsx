import React from 'react';
import { Tabs, EmptyState } from '../components/ui';
import { TaskRow } from '../components/cards';
import { mockTasks } from '../mock/data';
import { useSimulation } from '../state/SimulationContext';
import type { Task, TaskStatus } from '../types';

const ORDER: TaskStatus[] = ['running', 'waiting_approval', 'ready', 'pending', 'paused', 'completed', 'failed'];
const LABELS: Record<string, string> = {
  All: 'All', running: 'Running', waiting_approval: 'Needs approval', ready: 'Ready',
  pending: 'Waiting', paused: 'Paused', completed: 'Completed', failed: 'Failed',
};

export default function Tasks() {
  const { sim } = useSimulation();
  const [tab, setTab] = React.useState('All');

  // Simulated p-research tasks replace the old static ones; other projects stay static.
  const all: Task[] = [...sim.tasks, ...mockTasks.filter((t) => t.projectId !== sim.projectId)];
  const tabs = ['All', ...ORDER];
  const filtered = tab === 'All' ? all : all.filter((t) => t.status === tab);

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Tasks</h1>
        <p className="page-sub">Every unit of agent work across projects — status, owner, cost.</p>
      </div>
      <div style={{ marginBottom: 20 }}>
        <Tabs tabs={tabs.map((t) => LABELS[t])} active={LABELS[tab]}
          onChange={(label) => setTab(tabs.find((t) => LABELS[t] === label) ?? 'All')} />
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon="☰" title="No tasks here" sub="Tasks will appear as agents start working." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} className="stagger">
          {filtered.map((t) => <TaskRow key={t.id} task={t} showProject />)}
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { ProjectCard } from '../components/cards';
import { Button, Tabs, EmptyState } from '../components/ui';
import { mockProjects } from '../mock/data';
import { useSimulation } from '../state/SimulationContext';
import { simProjectSnapshot } from '../mock/simulation';

export default function Projects() {
  const { sim } = useSimulation();
  const [tab, setTab] = React.useState('All');
  const projects = mockProjects.map((p) => (p.id === sim.projectId ? simProjectSnapshot(p, sim) : p));
  const tabs = ['All', 'Active', 'Paused', 'Completed'];
  const filtered = projects.filter((p) =>
    tab === 'All' ? true : tab === 'Active' ? p.status === 'active' : tab === 'Paused' ? p.status === 'paused' : p.status === 'completed'
  );

  return (
    <div>
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-sub">Each project is a shared workspace: objective, AI team, tasks, files, memory.</p>
        </div>
        <Button variant="primary">＋ New Project</Button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="▦" title={`No ${tab.toLowerCase()} projects`} sub="Projects you create will appear here." />
      ) : (
        <div className="grid-auto stagger">
          {filtered.map((p) => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}
    </div>
  );
}

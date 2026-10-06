import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SimulationProvider } from '../state/SimulationContext';
import Shell from '../components/Shell';
import Dashboard from './Dashboard';
import Projects from './Projects';
import ProjectWorkspace from './ProjectWorkspace';
import Tasks from './Tasks';
import RunView from './RunView';
import Ask from './Ask';
import Approvals from './Approvals';
import Files from './Files';
import Usage from './Usage';
import Settings from './Settings';

const PATHS = [
  '/', '/ask', '/projects', '/projects/p-research',
  '/tasks', '/activity', '/approvals',
  '/files', '/usage', '/settings',
];

function renderAt(path: string): string {
  return renderToString(
    <SimulationProvider>
    <MemoryRouter initialEntries={[path]}>
      <Shell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/ask" element={<Ask />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectWorkspace />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/activity" element={<RunView />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/files" element={<Files />} />
          <Route path="/usage" element={<Usage />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Shell>
    </MemoryRouter>
    </SimulationProvider>
  );
}

describe('all routes render without crashing', () => {
  for (const path of PATHS) {
    it(`renders ${path}`, () => {
      const html = renderAt(path);
      expect(html.length).toBeGreaterThan(2000);
      expect(html).not.toMatch(/>undefined</);
      // no personal data leaks into the demo
      expect(html).not.toMatch(/Mohammad Ali/);
      expect(html).not.toMatch(/onlyfarmingaura13/);
    });
  }
});

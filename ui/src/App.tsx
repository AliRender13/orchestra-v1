import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Shell from './components/Shell';
import { SimulationProvider } from './state/SimulationContext';
import Dashboard from './screens/Dashboard';
import Projects from './screens/Projects';
import ProjectWorkspace from './screens/ProjectWorkspace';
import Tasks from './screens/Tasks';
import RunView from './screens/RunView';
import Approvals from './screens/Approvals';
import Ask from './screens/Ask';
import Files from './screens/Files';
import Usage from './screens/Usage';
import Settings from './screens/Settings';

export default function App() {
  return (
    <HashRouter>
      <SimulationProvider>
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Shell>
      </SimulationProvider>
    </HashRouter>
  );
}

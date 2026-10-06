import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Avatar } from './ui';
import { mockApprovals } from '../mock/data';

const NAV = [
  { section: 'Workspace' },
  { to: '/ask', label: 'Ask', icon: '✦' },
  { to: '/', label: 'Home', icon: '⌂', end: true },
  { to: '/projects', label: 'Projects', icon: '▦' },
  { to: '/tasks', label: 'Tasks', icon: '☰' },
  { to: '/activity', label: 'Activity', icon: '◔' },
  { section: 'Manage' },
  { to: '/approvals', label: 'Approvals', icon: '✓', badge: () => mockApprovals.filter((a) => a.status === 'pending').length },
  { to: '/files', label: 'Files', icon: '▤' },
  { to: '/usage', label: 'Usage', icon: '◫' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

const TITLES: Record<string, { title: string; sub: string }> = {
  '/': { title: 'Home', sub: 'Workspace overview' },
  '/ask': { title: 'Ask Orchestra', sub: 'Start with an objective' },
  '/projects': { title: 'Projects', sub: 'All workspaces' },
  '/tasks': { title: 'Tasks', sub: 'Execution queue' },
  '/activity': { title: 'Activity', sub: 'Live run timeline' },
  '/approvals': { title: 'Approval Center', sub: 'You are in control' },
  '/files': { title: 'Files', sub: 'Shared workspace' },
  '/usage': { title: 'Usage', sub: 'Tokens, cost, activity' },
  '/settings': { title: 'Settings', sub: 'Workspace preferences' },
};

export default function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const title = React.useMemo(() => {
    const exact = TITLES[location.pathname];
    if (exact) return exact;
    if (location.pathname.startsWith('/projects/')) return { title: 'Project Workspace', sub: 'Objective · team · tasks · files' };
    return { title: 'Orchestra', sub: '' };
  }, [location.pathname]);

  React.useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div className="app">
      {open && <div className="sidebar-scrim" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Primary">
        <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <span className="brand-mark">◈</span>
          <span>
            <div className="brand-name">Orchestra</div>
            <div className="brand-sub">AI Workspace</div>
          </span>
        </div>
        <nav className="nav">
          {NAV.map((item, i) =>
            'section' in item ? (
              <div key={i} className="nav-section">{item.section}</div>
            ) : (
              <NavLink key={item.to} to={item.to!} end={item.end}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <span className="nav-icon">{item.icon}</span>
                {item.label}
                {item.badge && item.badge() > 0 && (
                  <span className="nav-badge">{item.badge()}</span>
                )}
              </NavLink>
            )
          )}
        </nav>
        <div className="sidebar-foot">
          <button className="user-chip" onClick={() => navigate('/settings')}>
            <Avatar name="Operator" hue={210} size="md" round />
            <span className="user-meta">
              <div className="user-name ellipsis">Operator</div>
              <div className="user-plan">Demo workspace</div>
            </span>
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Open menu">☰</button>
          <div>
            <div className="topbar-title">{title.title}</div>
            {title.sub && <div className="topbar-sub">{title.sub}</div>}
          </div>
          <label className="search">
            <span>⌕</span>
            <input placeholder="Search projects, tasks, files…" aria-label="Search" />
          </label>
          <div className="topbar-actions">
            <span className="badge badge-warning hide-sm">DEMO DATA</span>
            <button className="icon-btn hide-sm" aria-label="Notifications" onClick={() => navigate('/approvals')}>
              🔔<span className="ping" />
            </button>
            <Avatar name="Operator" hue={210} size="md" round />
          </div>
        </header>
        <main className="content">
          <div className="content-narrow page-enter" key={location.pathname}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

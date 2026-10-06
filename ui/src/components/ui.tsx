import React from 'react';

/* ── Button ─────────────────────────────────────────────────────────── */
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type BtnSize = 'sm' | 'md' | 'lg' | 'icon';

export function Button({
  variant = 'secondary', size = 'md', className = '', ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize }) {
  return <button className={`btn btn-${variant} btn-${size} ${className}`} {...rest} />;
}

/* ── Card ───────────────────────────────────────────────────────────── */
export function Card({ className = '', hover = false, children, ...rest }:
  React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return <div className={`card ${hover ? 'card-hover' : ''} ${className}`} {...rest}>{children}</div>;
}

export function CardHead({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="card-head">
      <div>
        <div className="card-title">{title}</div>
        {sub && <div className="card-sub">{sub}</div>}
      </div>
      {action}
    </div>
  );
}

/* ── Badge ──────────────────────────────────────────────────────────── */
type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'violet';

export function Badge({ tone = 'neutral', dot = false, live = false, children }:
  { tone?: BadgeTone; dot?: boolean; live?: boolean; children: React.ReactNode }) {
  return (
    <span className={`badge badge-${tone}`}>
      {dot && <span className={`dot ${live ? 'dot-live' : ''}`} />}
      {children}
    </span>
  );
}

/* ── Avatar ─────────────────────────────────────────────────────────── */
export function Avatar({ name, hue = 222, size = 'md', round = false }:
  { name: string; hue?: number; size?: 'sm' | 'md' | 'lg'; round?: boolean }) {
  const initials = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <span
      className={`avatar avatar-${size} ${round ? 'avatar-round' : ''}`}
      style={{ background: `linear-gradient(135deg, hsl(${hue},55%,45%), hsl(${(hue + 40) % 360},55%,38%))` }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

/* ── Progress ───────────────────────────────────────────────────────── */
export function ProgressBar({ value, tone = '' }: { value: number; tone?: string }) {
  return (
    <div className={`progress ${tone}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

/* ── Empty state ────────────────────────────────────────────────────── */
export function EmptyState({ icon, title, sub, action }:
  { icon: string; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {sub && <p style={{ marginBottom: action ? 16 : 0 }}>{sub}</p>}
      {action}
    </div>
  );
}

/* ── Section head ───────────────────────────────────────────────────── */
export function SectionHead({ title, link, linkTo }: { title: string; link?: string; linkTo?: string }) {
  return (
    <div className="section-head">
      <h2 className="section-title">{title}</h2>
      {link && <a className="section-link" href={linkTo ?? '#'}>{link} →</a>}
    </div>
  );
}

/* ── Tabs ───────────────────────────────────────────────────────────── */
export function Tabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t} role="tab" aria-selected={t === active}
          className={`tab ${t === active ? 'active' : ''}`} onClick={() => onChange(t)}>
          {t}
        </button>
      ))}
    </div>
  );
}

/* ── Modal ──────────────────────────────────────────────────────────── */
export function Modal({ title, onClose, children, foot, wide = false }:
  { title: string; onClose: () => void; children: React.ReactNode; foot?: React.ReactNode; wide?: boolean }) {
  React.useEffect(() => {
    const fn = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);
  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className={`modal ${wide ? 'modal-lg' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3 style={{ fontSize: 'var(--text-lg)' }}>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {foot && <div className="modal-foot">{foot}</div>}
      </div>
    </div>
  );
}

/* ── Toggle ─────────────────────────────────────────────────────────── */
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button className={`toggle ${on ? 'on' : ''}`} role="switch" aria-checked={on}
      aria-label={label ?? 'toggle'} onClick={() => onChange(!on)} />
  );
}

/* ── Stat ───────────────────────────────────────────────────────────── */
export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

/* ── Field ──────────────────────────────────────────────────────────── */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

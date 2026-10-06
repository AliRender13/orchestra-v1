import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Badge, Button } from '../components/ui';
import { api } from '../lib/api';

/* Ask is the front door for Objective → Create/Start Project.
   It is NOT a free-chat surface: no model selector, no provider picker —
   the MVP runs on a single provider and routes everything through the
   orchestrator. Project creation arrives with the backend; the demo
   explores the golden-path demo project. */

const SUGGESTIONS = [
  { icon: '◈', label: 'Research a topic', text: 'Research the best agent orchestration frameworks and compare them on maturity, control, and cost' },
  { icon: '◫', label: 'Compare options', text: 'Compare LangGraph, CrewAI and AutoGen, and recommend one for a verification-first product' },
  { icon: '⌕', label: 'Investigate deeply', text: 'Investigate how durable execution works in modern agent frameworks, with cited sources' },
  { icon: '✎', label: 'Draft from research', text: 'Draft an executive summary of our agent framework research from completed sources' },
];

export default function Ask() {
  const [text, setText] = React.useState('');
  const [objective, setObjective] = React.useState<string | null>(null);
  const [starting, setStarting] = React.useState(false);
  const [startError, setStartError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const submit = (value: string) => {
    const v = value.trim();
    if (!v) return;
    setObjective(v);
    setText('');
    setStartError(null);
  };

  const startProject = async () => {
    if (!objective || starting) return;
    setStarting(true);
    setStartError(null);
    try {
      const project = await api.createProject(objective);
      await api.requestPlan(project.id);
      navigate(`/projects/${project.id}`);
    } catch (e) {
      setStartError(e instanceof Error ? e.message : 'Could not start the project.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="ask-wrap">
      <div className="ask-brand">
        <span className="brand-mark">◈</span> Orchestra
      </div>
      <h1 className="ask-title">Ready when you are.</h1>
      <p className="page-sub" style={{ marginBottom: 18 }}>
        State your objective. Orchestra turns it into a planned, approved project.
      </p>

      <form
        className="ask-composer"
        onSubmit={(e) => { e.preventDefault(); submit(text); }}
      >
        <button type="button" className="ask-plus" aria-label="Attach or start something new"
          onClick={() => inputRef.current?.focus()} title="Attach (planned)">＋</button>
        <input
          ref={inputRef}
          className="ask-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Describe your objective…"
          aria-label="Describe your objective"
          autoFocus
        />
        <div className="ask-tools">
          <span className="ask-mic planned" title="Dictation — planned" aria-label="Dictation, planned">🎙</span>
          <button
            type="submit"
            className="ask-voice"
            aria-label="Send"
            title={text.trim() ? 'Send' : 'Type something first'}
            disabled={!text.trim()}
            style={!text.trim() ? { opacity: 0.45, boxShadow: 'none' } : undefined}
          >◉</button>
        </div>
      </form>

      {objective && (
        <Card className="card-pad" style={{ textAlign: 'left', borderLeft: '3px solid var(--accent)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <Badge tone="info">Objective captured</Badge>
          </div>
          <p style={{ fontSize: 'var(--text-sm)', marginBottom: 10 }}>“{objective}”</p>
          <p className="hint" style={{ marginBottom: 12 }}>
            The Planner drafts a plan from your objective, you approve it, then the worker
            executes research and synthesis with the real provider. Nothing is faked —
            a provider failure shows as a task failure with a retry option.
          </p>
          {startError && (
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--danger)', marginBottom: 12 }}>
              {startError}
            </p>
          )}
          <Button size="sm" onClick={startProject} disabled={starting}>
            {starting ? 'Starting…' : 'Start project →'}
          </Button>
        </Card>
      )}

      <div className="ask-suggest">
        {SUGGESTIONS.map((s) => (
          <button key={s.label} type="button" onClick={() => { setText(s.text); inputRef.current?.focus(); }}>
            <span className="s-ic" aria-hidden>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

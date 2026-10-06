import { Avatar } from './ui';
import { agentById } from '../mock/agents';
import type { WorkspaceFile } from '../types';

const TYPE_ICON: Record<WorkspaceFile['type'], string> = {
  doc: '📄', code: '⌨', data: '▦', image: '🖼', other: '📁',
};

export default function FileTable({ files }: { files: WorkspaceFile[] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="table">
        <thead>
          <tr><th>Name</th><th>Modified</th><th>By</th><th>Agent access</th><th>Size</th></tr>
        </thead>
        <tbody>
          {files.map((f) => {
            const by = f.modifiedBy === 'you' ? null : agentById(f.modifiedBy);
            return (
              <tr key={f.id}>
                <td>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 16 }}>{TYPE_ICON[f.type]}</span>
                    <span>
                      <div style={{ fontWeight: 600 }}>{f.name}</div>
                      <div className="dim mono" style={{ fontSize: 'var(--text-xs)' }}>{f.path}</div>
                    </span>
                  </span>
                </td>
                <td className="muted">{f.modified}</td>
                <td>
                  {by ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <Avatar name={by.name} hue={by.avatarHue} size="sm" />{by.name}
                    </span>
                  ) : <span className="muted">You</span>}
                </td>
                <td>
                  <span style={{ display: 'inline-flex', gap: 4 }}>
                    {f.access.slice(0, 4).map((id) => {
                      const a = agentById(id);
                      return <Avatar key={id} name={a.name} hue={a.avatarHue} size="sm" />;
                    })}
                    {f.access.length > 4 && <span className="dim" style={{ fontSize: 'var(--text-xs)' }}>+{f.access.length - 4}</span>}
                  </span>
                </td>
                <td className="mono muted">{f.size}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

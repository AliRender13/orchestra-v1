import { Card, CardHead, Button } from '../components/ui';
import FileTable from '../components/FileTable';
import { mockFiles } from '../mock/data';

export default function Files() {
  return (
    <div>
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 className="page-title">Files</h1>
          <p className="page-sub">Everything the team produces — versioned, with per-agent access control.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary">⤒ Upload</Button>
          <Button variant="primary">＋ New folder</Button>
        </div>
      </div>
      <Card className="card-pad">
        <CardHead title="Workspace files" sub={`${mockFiles.length} files · 1.3 MB total`} />
        <FileTable files={mockFiles} />
      </Card>
      <p className="hint" style={{ marginTop: 12 }}>
        Files are content-addressed and versioned — the orchestrator verifies hashes before marking any task complete.
      </p>
    </div>
  );
}

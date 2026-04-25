import { useCallback, useEffect, useState } from 'react';
import { health, listFiles, presign, uploadFile } from './api.js';

function formatSize(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString();
}

/**
 * Main UI: upload form + file list with “Get link” to open pre-signed S3 download.
 * Students: see `api.js` for how the browser talks to Express.
 */
export default function App() {
  const [userLabel, setUserLabel] = useState(
    () => localStorage.getItem('userLabel') || 'default'
  );
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(null);
  const [expiresInDays, setExpiresInDays] = useState('');
  const [uploading, setUploading] = useState(false);
  const [apiOk, setApiOk] = useState(true);

  const refresh = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const data = await listFiles();
      setFiles(data);
    } catch (e) {
      setError(e.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('userLabel', userLabel);
  }, [userLabel]);

  useEffect(() => {
    health()
      .then(() => setApiOk(true))
      .catch(() => setApiOk(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function onUpload(ev) {
    ev.preventDefault();
    const input = ev.target.querySelector('input[type=file]');
    const file = input?.files?.[0];
    if (!file) {
      setError('Choose a file first.');
      return;
    }
    setUploading(true);
    setError('');
    setStatus(null);
    try {
      const meta = await uploadFile({
        file,
        expiresInDays: expiresInDays === '' ? undefined : Number(expiresInDays),
      });
      setStatus(`Uploaded: ${meta.originalName}`);
      input.value = '';
      await refresh();
    } catch (e) {
      setError(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function onGetLink(id) {
    setError('');
    try {
      const { url, originalName } = await presign(id);
      window.open(url, '_blank', 'noopener');
      setStatus(`Opened download for ${originalName} (pre-signed URL, expires in ~5 min)`);
    } catch (e) {
      setError(e.message || 'Could not get link');
    }
  }

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        background:
          'radial-gradient(1200px 600px at 20% 0%, rgba(61,139,253,0.12), transparent), radial-gradient(800px 400px at 100% 20%, rgba(52,211,153,0.08), transparent)',
      }}
    >
      <header
        style={{
          borderBottom: '1px solid var(--border)',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 600 }}>Smart File Share</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
            Uploads go to S3; downloads use time-limited pre-signed URLs.
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'var(--muted)',
            fontSize: '0.85rem',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: apiOk ? 'var(--success)' : 'var(--danger)',
            }}
          />
          API {apiOk ? 'reachable' : 'unreachable (start backend)'}
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: 900, width: '100%', margin: '0 auto', padding: '1.5rem' }}>
        <section
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem' }}>Session label</h2>
          <p style={{ margin: '0 0 0.5rem', color: 'var(--muted)', fontSize: '0.9rem' }}>
            Files are scoped by this label (sent as <code>X-User-Label</code>). Change it to
            simulate different users in the same database—no password in this learning version.
          </p>
          <input
            value={userLabel}
            onChange={(e) => setUserLabel(e.target.value)}
            style={inputStyle}
            placeholder="e.g. team-alpha"
            aria-label="User label"
          />
        </section>

        <section
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem' }}>Upload a file</h2>
          <form onSubmit={onUpload} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input type="file" name="file" required style={{ color: 'var(--muted)' }} />
            <label
              style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.9rem' }}
            >
              <span>
                Optional expiry: delete access after <strong>N days</strong> (from upload)
              </span>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="Leave empty = no expiry"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                style={inputStyle}
              />
            </label>
            <button
              type="submit"
              disabled={uploading}
              style={{
                ...buttonStyle,
                opacity: uploading ? 0.7 : 1,
                alignSelf: 'flex-start',
              }}
            >
              {uploading ? 'Uploading…' : 'Upload to S3'}
            </button>
          </form>
        </section>

        {error && (
          <div
            style={{
              background: 'rgba(248,113,113,0.12)',
              border: '1px solid var(--danger)',
              color: '#fecaca',
              padding: '0.75rem 1rem',
              borderRadius: 8,
              marginBottom: '1rem',
            }}
          >
            {error}
          </div>
        )}

        {status && (
          <div
            style={{
              background: 'rgba(52,211,153,0.1)',
              border: '1px solid var(--success)',
              color: '#d1fae5',
              padding: '0.75rem 1rem',
              borderRadius: 8,
              marginBottom: '1rem',
            }}
          >
            {status}
          </div>
        )}

        <section
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '1.25rem 1.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Your files</h2>
            <button type="button" onClick={refresh} style={buttonGhost}>
              Refresh
            </button>
          </div>
          {loading ? (
            <p style={{ color: 'var(--muted)' }}>Loading…</p>
          ) : files.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>No files yet for this label.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--muted)' }}>
                    <th style={th}>Name</th>
                    <th style={th}>Size</th>
                    <th style={th}>Uploaded</th>
                    <th style={th}>Expires</th>
                    <th style={th} />
                  </tr>
                </thead>
                <tbody>
                  {files.map((f) => (
                    <tr key={f.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={td}>
                        {f.originalName}
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                          {f.contentType}
                        </div>
                      </td>
                      <td style={td}>{formatSize(f.size)}</td>
                      <td style={td}>{formatDate(f.uploadedAt)}</td>
                      <td style={td}>{formatDate(f.expiresAt)}</td>
                      <td style={td}>
                        <button type="button" onClick={() => onGetLink(f.id)} style={buttonStyle}>
                          Open download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <footer
        style={{
          borderTop: '1px solid var(--border)',
          padding: '1rem 1.5rem',
          color: 'var(--muted)',
          fontSize: '0.8rem',
        }}
      >
        Development: run backend on :3000 and <code>npm run dev</code> in <code>frontend</code> (Vite
        proxies <code>/api</code>).
      </footer>
    </div>
  );
}

const th = { padding: '0.5rem 0.75rem 0.5rem 0', fontWeight: 500 };
const td = { padding: '0.75rem 0.75rem 0.75rem 0', verticalAlign: 'top' };
const inputStyle = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  borderRadius: 8,
  padding: '0.5rem 0.75rem',
  maxWidth: 360,
  width: '100%',
};
const buttonStyle = {
  background: 'linear-gradient(180deg, var(--accent) 0%, var(--accent-dim) 100%)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '0.45rem 0.9rem',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '0.9rem',
};
const buttonGhost = {
  ...buttonStyle,
  background: 'transparent',
  color: 'var(--text)',
  border: '1px solid var(--border)',
};

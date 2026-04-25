/**
 * API base: in dev Vite proxies /api; in production the same origin serves the app + API.
 */
const prefix = import.meta.env.VITE_API_BASE || '';

function headers(extra = {}) {
  const h = { ...extra };
  const userLabel = localStorage.getItem('userLabel') || 'default';
  h['X-User-Label'] = userLabel;
  return h;
}

export async function listFiles() {
  const r = await fetch(`${prefix}/api/files`, { headers: headers() });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function uploadFile({ file, expiresInDays }) {
  const fd = new FormData();
  fd.append('file', file);
  if (expiresInDays !== undefined && expiresInDays !== '') {
    fd.append('expiresInDays', String(expiresInDays));
  }
  const r = await fetch(`${prefix}/api/files/upload`, {
    method: 'POST',
    headers: headers(), // do not set Content-Type; browser sets multipart boundary
    body: fd,
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function presign(id) {
  const r = await fetch(`${prefix}/api/files/${id}/presign`, { headers: headers() });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function health() {
  const r = await fetch(`${prefix}/api/health`);
  return r.json();
}

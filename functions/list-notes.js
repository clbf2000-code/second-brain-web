const { getStore } = require('@netlify/blobs');
const { requireAuth } = require('./_auth');
const STORE = process.env.SB_BLOBS_STORE;
const SITE_ID = process.env.SB_BLOBS_SITE_ID;
const TOKEN = process.env.SB_BLOBS_TOKEN;
const KEY = 'notes.json';
function makeStore() {
  if (!STORE) throw new Error('SB_BLOBS_STORE is required');
  return getStore(STORE, SITE_ID && TOKEN ? { siteID: SITE_ID, token: TOKEN } : undefined);
}
function displayMode(n) {
  const hay = `${n.para || ''} ${n.category || ''} ${(n.tags || []).join(' ')}`.toUpperCase();
  if (n.display_mode === 'full' || n.display_mode === 'index') return n.display_mode;
  if (/PROJECT|INBOX|ACTIVE|ĐANG HOẠT ĐỘNG/.test(hay)) return 'full';
  return 'index';
}
function compactNote(n) {
  const mode = displayMode(n);
  if (mode === 'full') return { ...n, display_mode: 'full' };
  return {
    id: n.id,
    category: n.category || n.para || 'Index',
    title: n.title || n.name || 'Untitled',
    content: '',
    tags: Array.isArray(n.tags) ? n.tags : [],
    created_at: n.created_at,
    updated_at: n.updated_at,
    source: n.source || 'catalog',
    display_mode: 'index',
    storage_path: n.storage_path || n.source_path || n.vps_path || '',
    drive_url: n.drive_url || n.google_drive_url || '',
    para: n.para || ''
  };
}
exports.handler = async (event) => {
  const auth = requireAuth(event); if (!auth.ok) return auth.response;
  try {
    const store = makeStore();
    const raw = await store.get(KEY, { type: 'text' });
    const data = raw ? JSON.parse(raw) : [];
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(Array.isArray(data) ? data.map(compactNote) : []) };
  } catch (e) {
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: '[]' };
  }
};
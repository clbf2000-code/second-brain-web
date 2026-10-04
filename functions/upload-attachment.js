const { getStore } = require('@netlify/blobs');
const { requireAuth } = require('./_auth');

const STORE = process.env.SB_BLOBS_STORE;
const MAX_FILE_BYTES = 4 * 1024 * 1024;

function json(statusCode, body) {
  return { statusCode, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  const auth = requireAuth(event);
  if (!auth.ok) return auth.response;
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  if (!STORE) return json(500, { ok: false, error: 'SB_BLOBS_STORE is required' });

  try {
    const { name, mime, data, noteId } = JSON.parse(event.body || '{}');
    if (!name || !data || !noteId) return json(400, { ok: false, error: 'name, data and noteId are required' });

    const bytes = Buffer.from(data, 'base64');
    if (!bytes.length) return json(400, { ok: false, error: 'Invalid attachment data' });
    if (bytes.length > MAX_FILE_BYTES) {
      return json(413, { ok: false, error: 'Tệp vượt giới hạn 4MB', max_bytes: MAX_FILE_BYTES });
    }

    const safeNoteId = String(noteId).replace(/[^a-zA-Z0-9_.-]/g, '_');
    const safeName = String(name).replace(/[^a-zA-Z0-9_.-]/g, '_');
    const key = `attachments/${safeNoteId}/${Date.now()}-${safeName}`;
    await getStore(STORE).set(key, bytes, {
      metadata: {
        originalName: String(name),
        contentType: mime || 'application/octet-stream',
        size: String(bytes.length)
      }
    });

    return json(200, {
      ok: true,
      attachment: {
        name: String(name),
        type: mime || 'application/octet-stream',
        size: bytes.length,
        blob_key: key,
        url: `/.netlify/functions/get-attachment?key=${encodeURIComponent(key)}`
      }
    });
  } catch (error) {
    return json(500, { ok: false, error: String(error?.message || error) });
  }
};

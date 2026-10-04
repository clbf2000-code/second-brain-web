const { getStore } = require('@netlify/blobs');
const { requireAuth } = require('./_auth');

const STORE_NAME = process.env.SB_BLOBS_STORE || 'second-brain-store';
const SITE_ID = process.env.SB_BLOBS_SITE_ID;
const TOKEN = process.env.SB_BLOBS_TOKEN;

function makeStore() {
  return getStore(STORE_NAME, SITE_ID && TOKEN ? { siteID: SITE_ID, token: TOKEN } : undefined);
}

exports.handler = async (event) => {
  const auth = requireAuth(event);
  if (!auth.ok) return auth.response;

  const path = event.path || '';
  const key = event.queryStringParameters?.key;

  if (!key) {
    return {
      statusCode: 400,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Missing key parameter' })
    };
  }

  try {
    const store = makeStore();
    const blob = await store.get(key, { type: 'arrayBuffer' });
    const metadata = await store.getMetadata(key);

    if (!blob) {
      return {
        statusCode: 404,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Attachment not found' })
      };
    }

    const contentType = metadata?.metadata?.contentType || 'application/octet-stream';
    const originalName = metadata?.metadata?.originalName || 'file';

    return {
      statusCode: 200,
      headers: {
        'content-type': contentType,
        'content-disposition': `inline; filename="${encodeURIComponent(originalName)}"`,
        'cache-control': 'public, max-age=86400'
      },
      body: Buffer.from(blob).toString('base64'),
      isBase64Encoded: true
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: false, error: String(e && e.message || e) })
    };
  }
};

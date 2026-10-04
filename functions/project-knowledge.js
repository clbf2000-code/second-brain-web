const {getStore} = require('@netlify/blobs');
const {requireAuth} = require('./_auth');
const project = require('./_project-data/hong-linh.json');
const ids = new Set(project.items.map(x => x.id));
const norm = s => String(s || '').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
  .replace(/[-_]/g, ' ');
const reply = (statusCode, data) => ({
  statusCode,
  headers: {'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store'},
  body: JSON.stringify(data)
});
function suggested(title) {
  const t = norm(title), tags = ['dat-hong-linh'];
  if (/so do|thua|do dac|ranh|giap/.test(t)) tags.push('do-dac-ranh-gioi');
  if (/mat|cam ket|hs dat/.test(t)) tags.push('ho-so-thu-tuc');
  if (/cccd|ket hon/.test(t)) tags.push('giay-to-nhan-than');
  if (/gieng|dien luc/.test(t)) tags.push('dien-nuoc');
  if (/nha xay|cong sat/.test(t)) tags.push('hien-trang');
  if (/1995/.test(t)) tags.push('moc-1995');
  if (/1996/.test(t)) tags.push('moc-1996');
  if (/378/.test(t)) tags.push('thua-378');
  return tags;
}
exports.handler = async event => {
  const auth = requireAuth(event);
  if (!auth.ok) return auth.response;
  if (!['GET','POST'].includes(event.httpMethod))
    return reply(405, {error:'Method Not Allowed'});
  try {
    if (!process.env.SB_BLOBS_STORE) throw Error('Chưa cấu hình kho');
    const store = getStore(process.env.SB_BLOBS_STORE,
      process.env.SB_BLOBS_SITE_ID && process.env.SB_BLOBS_TOKEN
        ? {siteID:process.env.SB_BLOBS_SITE_ID, token:process.env.SB_BLOBS_TOKEN}
        : undefined);
    const key = id => `knowledge/${project.project_id}/${id}.json`;
    if (event.httpMethod === 'POST') {
      let b;
      try { b = JSON.parse(event.body || '{}'); }
      catch { return reply(400, {error:'JSON không hợp lệ'}); }
      if (!ids.has(b.id) || !Array.isArray(b.tags) ||
          !Array.isArray(b.links) || typeof b.context !== 'string')
        return reply(400, {error:'Dữ liệu không hợp lệ'});
      if (b.tags.length > 40 || b.context.length > 4000 ||
          b.tags.some(t => typeof t !== 'string' || t.length > 80) ||
          b.links.some(id => !ids.has(id) || id === b.id))
        return reply(400, {error:'Tag, ngữ cảnh hoặc liên kết không hợp lệ'});
      const tags = [...new Set(b.tags.map(t => t.trim()
        .replace(/^#+/, '')).filter(Boolean))];
      const links = [...new Set(b.links)];
      const old = await store.get(key(b.id), {type:'text'});
      if (old) await store.set(
        `backups/knowledge/${b.id}-${Date.now()}.json`, old);
      await store.set(key(b.id), JSON.stringify({
        tags, links, context:b.context.trim(),
        updated_at:new Date().toISOString()
      }));
      return reply(200, {ok:true});
    }
    const items = await Promise.all(project.items.map(async x => {
      const raw = await store.get(key(x.id), {type:'text'});
      const m = raw ? JSON.parse(raw) : {};
      return {...x,
        tags:Array.isArray(m.tags) ? m.tags : suggested(x.title),
        links:Array.isArray(m.links) ? m.links.filter(id => ids.has(id)) : [],
        context:m.context || '',
        metadata_saved:!!raw
      };
    }));
    return reply(200, {project_id:project.project_id, title:project.title, items});
  } catch (e) {
    console.error('project-knowledge:', e.message);
    return reply(503, {error:'Không đọc/lưu được dữ liệu tri thức. Kiểm tra function logs.'});
  }
};

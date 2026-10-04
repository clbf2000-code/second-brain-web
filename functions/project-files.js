
const { requireAuth } = require('./_auth');
const project = require('./_project-data/hong-linh.json');

exports.handler = async (event) => {
  const auth = requireAuth(event);
  if (!auth.ok) return auth.response;
  if (event.httpMethod !== 'GET')
    return {statusCode: 405, body: 'Method Not Allowed'};
  return {
    statusCode: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    },
    body: JSON.stringify({
      project_id: project.project_id,
      title: project.title,
      items: project.items.map(x => ({
        id: x.id, title: x.title, size: x.size,
        drive_file_id: x.drive_file_id,
        original_url: x.original_url
      }))
    })
  };
};

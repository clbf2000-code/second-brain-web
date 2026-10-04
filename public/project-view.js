
(() => {
  const tools = document.querySelector('.topTools');
  if (!tools || document.getElementById('projectFilesButton')) return;

  const button = document.createElement('button');
  button.id = 'projectFilesButton';
  button.className = 'toolBtn';
  button.textContent = 'Đất Hồng Lĩnh';
  tools.style.flexWrap = 'wrap';
  tools.append(button);

  const panel = document.createElement('section');
  panel.style.cssText =
    'position:fixed;inset:3vh 3vw;z-index:45;background:var(--surface);' +
    'border:1px solid var(--line);border-radius:16px;padding:16px;' +
    'display:none;overflow:auto';
  panel.setAttribute('aria-label', 'Hồ sơ Đất Hồng Lĩnh');
  document.body.append(panel);

  button.onclick = async () => {
    panel.replaceChildren();
    panel.style.display = 'block';

    const close = document.createElement('button');
    close.textContent = 'Đóng hồ sơ';
    close.style.width = 'auto';
    close.onclick = () => {
      panel.replaceChildren();
      panel.style.display = 'none';
    };
    const heading = document.createElement('h2');
    heading.textContent = 'Đất Hồng Lĩnh';
    const status = document.createElement('p');
    status.textContent = 'Đang lấy danh sách hồ sơ…';
    panel.append(close, heading, status);

    try {
      const response = await fetch('/.netlify/functions/project-files', {
        credentials: 'include', cache: 'no-store'
      });
      if (!response.ok) {
        throw new Error(response.status === 401
          ? 'Anh cần đăng nhập Second Brain.'
          : 'Không lấy được danh sách hồ sơ.');
      }
      const project = await response.json();
      status.textContent = project.items.length +
        ' hồ sơ · Chọn file để xem. Google Drive kiểm tra quyền truy cập.';

      const list = document.createElement('div');
      list.style.cssText =
        'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px';
      const original = document.createElement('a');
      original.textContent = 'Mở bản gốc trên Google Drive';
      original.target = '_blank';
      original.rel = 'noopener noreferrer';
      original.style.cssText =
        'display:none;color:var(--accent2);margin:12px 0';

      const frame = document.createElement('iframe');
      frame.title = 'Xem hồ sơ được chọn';
      frame.style.cssText =
        'width:100%;height:65vh;border:1px solid var(--line);' +
        'border-radius:10px;display:none;background:white';
      frame.referrerPolicy = 'no-referrer';

      for (const file of project.items) {
        if (!/^[A-Za-z0-9_-]+$/.test(file.drive_file_id)) continue;
        const b = document.createElement('button');
        b.textContent = file.title;
        b.style.cssText = 'width:auto;text-align:left';
        b.onclick = () => {
          original.href = 'https://drive.google.com/file/d/' +
            file.drive_file_id + '/view';
          original.style.display = 'block';
          frame.src = 'https://drive.google.com/file/d/' +
            file.drive_file_id + '/preview';
          frame.title = file.title;
          frame.style.display = 'block';
        };
        list.append(b);
      }
      panel.append(list, original, frame);
    } catch (error) {
      status.textContent = error.message;
    }
  };
})();

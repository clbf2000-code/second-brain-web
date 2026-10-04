'use strict';
let items=[], selected='';
const $=id=>document.getElementById(id);
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
const neighbors=n=>items.filter(x=>x.id!==n.id &&
  (n.links.includes(x.id)||x.links.includes(n.id)));
function renderList(){
  const q=norm($('search').value);
  $('list').innerHTML=items.filter(n=>norm(n.title+' '+n.tags.join(' ')).includes(q))
    .map(n=>'<button data-id="'+esc(n.id)+'">'+esc(n.title)+
      '<div class="small">'+n.tags.map(t=>'#'+esc(t)).join(' ')+'</div></button>').join('');
}
function choose(id){
  selected=id;
  const n=items.find(x=>x.id===id);
  if(!n)return;
  const related=neighbors(n);
  $('editor').innerHTML='<h2>'+esc(n.title)+'</h2>'+
    '<p><a id="original" target="_blank" rel="noopener noreferrer">Mở tài liệu gốc</a></p>'+
    '<p class="small">'+(n.metadata_saved?'Đã lưu metadata.':
      'Tag đề xuất từ tên file — có thể sửa trước khi lưu.')+'</p>'+
    '<label>Tag / hashtag, cách nhau bằng dấu phẩy<input id="editTags"></label>'+
    '<label>Ngữ cảnh / ghi chú về mối liên hệ<textarea id="editContext"></textarea></label>'+
    '<button id="saveMeta">Lưu tag, ngữ cảnh và liên kết</button><h3>Liên kết từ tài liệu này</h3><div id="relations">'+
    items.filter(x=>x.id!==id).map(x=>'<label><input type="checkbox" value="'+esc(x.id)+'" '+
      (n.links.includes(x.id)?'checked':'')+'>'+esc(x.title)+'</label>').join('')+
    '</div>'+
    '<h3>Các tài liệu liên quan — hai chiều</h3><div>'+
    (related.map(x=>'<p><button data-id="'+esc(x.id)+'">'+esc(x.title)+'</button>'+
      (!n.links.includes(x.id)?' <span class="small">Liên kết từ tài liệu kia; sửa ở tài liệu đó để bỏ.</span>':'')+
      '</p>').join('')||'<p class="small">Chưa có liên kết đã lưu.</p>')+'</div>';
  $('editTags').value=n.tags.join(', ');
  $('editContext').value=n.context;
  const url=n.original_url||'';
  if(/^https?:\/\//i.test(url))$('original').href=url;
  else $('original').remove();
  $('saveMeta').onclick=save;
  graph(n);
}
function graph(n){
  const direct=new Set(neighbors(n).map(x=>x.id));
  const others=items.filter(x=>x.id!==n.id &&
    (direct.has(x.id)||n.tags.some(t=>t!=='dat-hong-linh'&&x.tags.includes(t))));
  const positions=others.map((x,i)=>{
    const angle=2*Math.PI*i/Math.max(others.length,1)-Math.PI/2;
    return {n:x,x:500+370*Math.cos(angle),y:350+270*Math.sin(angle)};
  });
  const node=(x,y,item,label)=>'<g tabindex="0" role="button" data-id="'+esc(item.id)+
    '" aria-label="'+esc(item.title)+'"><title>'+esc(item.title)+'</title>'+
    '<circle cx="'+x+'" cy="'+y+'" r="24"/><text x="'+x+'" y="'+(y+42)+
    '" text-anchor="middle">'+esc(label)+'</text></g>';
  $('map').innerHTML=positions.map(p=>'<line class="'+(direct.has(p.n.id)?'':'topic')+
    '" x1="500" y1="350" x2="'+p.x+'" y2="'+p.y+'"/>').join('')+
    node(500,350,n,'Đang chọn')+
    positions.map((p,i)=>node(p.x,p.y,p.n,String(i+1))).join('');
  $('legend').innerHTML=positions.map((p,i)=>'<p><button data-id="'+esc(p.n.id)+'">'+
    (i+1)+'. '+esc(p.n.title)+'</button></p>').join('')||
    '<p class="small">Chưa có quan hệ hoặc tag chung ngoài tag dự án.</p>';
}
async function load(){
  const r=await fetch('/.netlify/functions/project-knowledge',{credentials:'include'});
  if(r.status===401){location.href='/';return;}
  const d=await r.json();
  if(!r.ok)throw Error(d.error||'Không tải được dữ liệu');
  items=d.items;
  renderList();
  if(items.length)choose(items.some(n=>n.id===selected)?selected:items[0].id);
  $('status').textContent='Đã tải '+items.length+' tài liệu.';
}
async function save(){
  const id=selected,button=$('saveMeta');
  const tags=$('editTags').value.split(',').map(t=>t.trim().replace(/^#+/,'')).filter(Boolean);
  const context=$('editContext').value;
  const links=[...$('relations').querySelectorAll('input:checked')].map(x=>x.value);
  button.disabled=true;$('status').textContent='Đang lưu…';
  try{
    const r=await fetch('/.netlify/functions/project-knowledge',{
      method:'POST',credentials:'include',headers:{'content-type':'application/json'},
      body:JSON.stringify({id,tags,context,links})});
    const d=await r.json();
    if(!r.ok)throw Error(d.error||'Lưu thất bại');
    await load();
    $('status').textContent='Đã lưu. Liên kết ngược hiển thị ở tài liệu liên quan.';
  }catch(e){$('status').textContent=e.message;}
  finally{if(button.isConnected)button.disabled=false;}
}
document.addEventListener('click',e=>{
  const target=e.target.closest('[data-id]');
  if(target)choose(target.dataset.id);
});
$('map').addEventListener('keydown',e=>{
  const target=e.target.closest('[data-id]');
  if(target&&(e.key==='Enter'||e.key===' ')){
    e.preventDefault();choose(target.dataset.id);
  }
});
$('search').oninput=renderList;
load().catch(e=>{$('status').textContent=e.message;});

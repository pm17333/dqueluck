/* ตรรกะการทำงาน — ต่อยอดจากไฟล์เดิม เพิ่มเฉพาะตัวช่วยด้านการมองเห็น
   LAYERS, BRANCHES, TABLE_SUFFIX, CATALOG มาจาก queries.js */

window.initApp = function initApp(){

const picked = new Set(['PIPE','DMA']);
let visible = [], idx = 0, sql = '';
const $ = id => document.getElementById(id);

/* ---------- สาขาและชื่อตาราง ---------- */
BRANCHES.forEach(([code, name]) => {
  const o = document.createElement('option');
  o.value = code; o.textContent = code + ' — ' + name;
  $('branch').appendChild(o);
});
$('branch').value = '5541018';

const tableName = k => 'B' + $('branch').value + '_' + (TABLE_SUFFIX[k] || k);
const LAYER_RE = new RegExp('\\b(' + LAYERS.map(L => L.k).join('|') + ')\\b', 'g');
const expand = s => s.replace(LAYER_RE, m => tableName(m));

function drawPreview(){
  const box = $('preview');
  box.innerHTML = '';
  const order = LAYERS.filter(L => picked.has(L.k));
  if(!order.length){ box.textContent = 'เลือกชั้นข้อมูลเพื่อดูชื่อตารางที่จะใช้ในคำสั่ง'; return; }
  order.forEach(L => {
    const b = document.createElement('b');
    b.textContent = tableName(L.k);
    box.appendChild(b);
  });
}

$('branch').addEventListener('change', () => { drawPreview(); regenerate(); });

/* ---------- ปุ่มชั้นข้อมูล ---------- */
const chipOf = {};
LAYERS.forEach(L => {
  const btn = document.createElement('button');
  btn.className = 'chip'; btn.type = 'button'; btn.dataset.layer = L.k;
  btn.setAttribute('aria-pressed', String(picked.has(L.k)));
  const b = document.createElement('b'); b.textContent = L.k;
  const s = document.createElement('span'); s.textContent = L.th;
  const badge = document.createElement('i'); badge.className = 'badge';
  btn.append(b, s, badge);
  btn.addEventListener('click', () => {
    picked.has(L.k) ? picked.delete(L.k) : picked.add(L.k);
    btn.setAttribute('aria-pressed', String(picked.has(L.k)));
    refresh();
  });
  chipOf[L.k] = btn;
  $('chips').appendChild(btn);
});

$('all').addEventListener('click', () => {
  const on = picked.size < LAYERS.length;
  picked.clear();
  if(on) LAYERS.forEach(L => picked.add(L.k));
  document.querySelectorAll('.chip').forEach(c =>
    c.setAttribute('aria-pressed', String(picked.has(c.dataset.layer))));
  $('all').textContent = on ? 'ล้างทั้งหมด' : 'เลือกทั้งหมด';
  refresh();
});

$('total').textContent = CATALOG.length + ' คำสั่ง';

/* ---------- ตัวช่วย: นับคำสั่งที่ปลดล็อกได้ ---------- */
const countFor = set => CATALOG.filter(q => q.req.every(r => set.has(r))).length;

function drawBadges(){
  const base = countFor(picked);
  LAYERS.forEach(L => {
    const badge = chipOf[L.k].querySelector('.badge');
    if(picked.has(L.k)){
      const n = visible.filter(q => q.req.includes(L.k)).length;
      badge.textContent = n ? String(n) : '';
    }else{
      const test = new Set(picked); test.add(L.k);
      const gain = countFor(test) - base;
      badge.textContent = gain > 0 ? '+' + gain : '';
    }
  });
}

/* ตัวช่วยเมื่อไม่มีคำสั่งตรงกับชุดที่เลือก */
function drawHint(){
  const box = $('hint');
  box.innerHTML = '';
  if(visible.length){ box.hidden = true; return; }
  box.hidden = false;
  const base = countFor(picked);
  const gains = LAYERS.filter(L => !picked.has(L.k)).map(L => {
    const test = new Set(picked); test.add(L.k);
    return {k:L.k, th:L.th, gain:countFor(test) - base};
  }).filter(g => g.gain > 0).sort((a, b) => b.gain - a.gain).slice(0, 4);

  const p = document.createElement('p');
  if(!picked.size){
    p.textContent = 'ยังไม่ได้เลือกชั้นข้อมูล — กดปุ่มด้านบนตามชั้นที่เปิดอยู่ในโปรเจกต์ QGIS';
  }else if(gains.length){
    p.innerHTML = 'ชุดชั้นข้อมูลนี้ยังไม่ตรงกับคำสั่งใด <b>เพิ่มอีกหนึ่งชั้น</b> เพื่อปลดล็อก';
  }else{
    p.textContent = 'ไม่มีคำสั่งสำหรับชุดนี้ ลองเอาบางชั้นออกแล้วเลือกใหม่';
  }
  box.appendChild(p);
  if(gains.length){
    const row = document.createElement('div'); row.className = 'row';
    gains.forEach(g => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = '+ ' + g.k + '  (' + g.gain + ' คำสั่ง)';
      b.addEventListener('click', () => {
        picked.add(g.k);
        chipOf[g.k].setAttribute('aria-pressed', 'true');
        refresh();
      });
      row.appendChild(b);
    });
    box.appendChild(row);
  }
}

/* ---------- กรองคำถามตามชั้นข้อมูลที่เลือก ---------- */
function refresh(){
  drawPreview();
  visible = CATALOG.filter(q => q.req.every(r => picked.has(r)));
  idx = 0;
  const sel = $('q');
  sel.innerHTML = '';
  sel.disabled = visible.length === 0;
  $('go').disabled = visible.length === 0;

  if(!visible.length){
    const o = document.createElement('option');
    o.textContent = picked.size ? 'ไม่มีคำสั่งสำหรับชุดชั้นข้อมูลนี้ — เลือกเพิ่มอีกชั้น' : 'ยังไม่ได้เลือกชั้นข้อมูล';
    sel.appendChild(o);
    $('qcount').textContent = '0 รายการ';
    $('about').textContent = 'คำสั่งจะแสดงเมื่อเลือกชั้นข้อมูลที่คำสั่งนั้นต้องใช้ครบทุกชั้น เช่น ความยาวท่อในแต่ละ DMA ต้องเลือกทั้ง PIPE และ DMA';
    markInUse([]);
    drawBadges(); drawHint();
    resetPlate();
    return;
  }

  const groups = {};
  visible.forEach((q, i) => (groups[q.req[0]] = groups[q.req[0]] || []).push(i));
  Object.keys(groups).forEach(g => {
    const th = (LAYERS.find(L => L.k === g) || {}).th || '';
    const og = document.createElement('optgroup');
    og.label = g + ' · ' + th;
    groups[g].forEach(i => {
      const o = document.createElement('option');
      o.value = String(i); o.textContent = visible[i].n;
      og.appendChild(o);
    });
    sel.appendChild(og);
  });
  sel.value = '0';
  $('qcount').textContent = visible.length + ' รายการ';
  drawBadges(); drawHint();
  describe();
}

/* ทำเครื่องหมายว่าคำสั่งที่เลือกใช้ชั้นข้อมูลใดร่วมกัน */
function markInUse(req){
  LAYERS.forEach(L => chipOf[L.k].classList.toggle('inuse', req.indexOf(L.k) > -1));
}

function describe(){
  const q = visible[idx];
  $('about').innerHTML = '';
  const tag = document.createElement('span');
  tag.className = 'uses'; tag.textContent = q.req.join(' + ');
  $('about').append(tag, document.createTextNode(q.a));
  markInUse(q.req);
}

$('q').addEventListener('change', () => { idx = Number($('q').value); describe(); });

function resetPlate(){
  $('out').innerHTML = '<div class="empty"><div class="box"><b>ยังไม่มีคำสั่ง</b>เลือกคำถามในขั้น 02 แล้วกด CREATE SQL<br>หรือกด CTRL + ENTER</div></div>';
  $('note').hidden = true; sql = '';
  $('copy').disabled = true; $('dl').disabled = true;
  const t = $('trace'); t.innerHTML = '';
  const e = document.createElement('em'); e.textContent = '03';
  t.append(e, document.createTextNode('SQL Statement'));
}

/* ---------- ระบายสีไวยากรณ์ ---------- */
const KW = 'SELECT|FROM|WHERE|AND|OR|NOT|NULL|AS|ON|JOIN|LEFT|RIGHT|INNER|OUTER|GROUP|ORDER|BY|HAVING|LIMIT|DISTINCT|EXISTS|UNION|ALL|CASE|WHEN|THEN|ELSE|END|IS|IN|ASC|DESC|CAST|INTEGER';
const FN = 'ST_[A-Za-z0-9_]+|count|sum|min|max|avg|round|abs|coalesce|strftime|group_concat';
const RE = new RegExp("('[^']*')|\\b(" + FN + ")\\b|\\b(" + KW + ")\\b|\\b(\\d+(?:\\.\\d+)?)\\b", 'g');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const paint = line => esc(line).replace(RE, (m, s, f, k, n) =>
  s ? '<i class="s">' + s + '</i>' :
  f ? '<i class="f">' + f + '</i>' :
  k ? '<i class="k">' + k + '</i>' :
      '<i class="n">' + n + '</i>');

/* ---------- สร้างคำสั่ง ---------- */
function create(){
  if(!visible.length) return;
  const item = visible[idx];
  sql = expand(item.sql);
  const lines = sql.split('\n');

  $('out').innerHTML = '';
  const area = document.createElement('div'); area.className = 'code-area';
  const gut = document.createElement('div'); gut.className = 'gutter';
  gut.textContent = lines.map((_, i) => i + 1).join('\n');
  const pre = document.createElement('pre'); pre.className = 'code reveal';
  pre.innerHTML = lines.map(l => '<span class="line">' + (paint(l) || '&nbsp;') + '</span>').join('');
  Array.from(pre.children).forEach((el, i) => el.style.animationDelay = Math.min(i * 12, 420) + 'ms');
  area.append(gut, pre); $('out').appendChild(area);

  const t = $('trace'); t.innerHTML = '';
  const e = document.createElement('em'); e.textContent = '03';
  const br = document.createElement('b');
  br.textContent = ($('branch').selectedOptions[0].textContent.split(' — ')[1] || '');
  const sep1 = document.createElement('i'); sep1.textContent = '/';
  const lay = document.createElement('b'); lay.textContent = item.req.join(' + ');
  const sep2 = document.createElement('i'); sep2.textContent = '/';
  const nm = document.createElement('span'); nm.textContent = item.n;
  const cnt = document.createElement('i'); cnt.textContent = lines.length + ' บรรทัด';
  t.append(e, br, sep1, lay, sep2, nm, cnt);

  $('note').hidden = false;
  $('note').textContent = item.note;
  $('copy').disabled = false; $('dl').disabled = false;
}

function regenerate(){ if(sql) create(); }

$('go').addEventListener('click', create);
document.addEventListener('keydown', e => {
  if((e.ctrlKey || e.metaKey) && e.key === 'Enter'){ e.preventDefault(); create(); }
});

/* ---------- คัดลอก / ดาวน์โหลด ---------- */
$('copy').addEventListener('click', async () => {
  const btn = $('copy');
  try{ await navigator.clipboard.writeText(sql); }
  catch(err){
    const ta = document.createElement('textarea');
    ta.value = sql; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try{ document.execCommand('copy'); }
    catch(e2){ btn.textContent = 'คัดลอกไม่สำเร็จ'; return; }
    finally{ ta.remove(); }
  }
  btn.textContent = 'คัดลอกแล้ว'; btn.classList.add('done');
  setTimeout(() => { btn.textContent = 'คัดลอก SQL'; btn.classList.remove('done'); }, 1600);
});

$('dl').addEventListener('click', () => {
  const blob = new Blob([sql], {type:'text/plain;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = $('branch').value + '_' + visible[idx].req[0].toLowerCase() + '.sql';
  a.click(); URL.revokeObjectURL(a.href);
});

refresh();
resetPlate();
};

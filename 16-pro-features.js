/* Vistoria profissional: fotos, plano de ação, histórico, assinatura */
/* ===== PRO FEATURES — parte 1: base, fotos, ações ===== */
(function(){
'use strict';
if (window.Pro) return;

/* ---------- utilidades ---------- */
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = (p) => (p||'id') + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const LS = {
  get(k, d){ try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch(e){ return false; } },
  del(k){ try { localStorage.removeItem(k); } catch(e){} }
};
const toast = (m, t) => { if (typeof showToast === 'function') showToast(esc(m), t || 'info'); };
const deb = (fn, ms) => { let t; return function(){ const a = arguments, c = this; clearTimeout(t); t = setTimeout(() => fn.apply(c, a), ms); }; };
const pad2 = n => String(n).padStart(2, '0');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; };
const parseD = s => { const [y,m,d] = String(s).split('-').map(Number); return new Date(y, (m||1)-1, d||1); };
const addDays = (s, n) => { const d = s ? parseD(s) : new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; };
const diffDays = (a, b) => Math.round((parseD(b) - parseD(a)) / 864e5);
const fmtD = s => { if (!s) return '—'; const [y,m,d] = String(s).slice(0,10).split('-'); return `${d}/${m}/${y}`; };
const fmtDT = iso => { try { return new Date(iso).toLocaleString('pt-BR', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); } catch(e){ return ''; } };
const curLoja = () => ($('#fLoja') && $('#fLoja').value) || '';
const curData = () => ($('#fData') && $('#fData').value) || today();
const ICON = {
  camera:'<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
  mic:'<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/>',
  scan:'<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/>',
  flag:'<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
  check:'<polyline points="20 6 9 17 4 12"/>',
  history:'<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/><polyline points="12 7 12 12 15 14"/>',
  clip:'<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><polyline points="9 14 11 16 15 12"/>',
  more:'<circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/>',
  bars:'<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  plus:'<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  undo:'<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  redo:'<path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
  share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
  refresh:'<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
  pin:'<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  trash:'<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
  pen:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  list:'<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
  eye:'<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
};
const svg = (n, s) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${s ? ` width="${s}" height="${s}"` : ''}>${ICON[n] || ''}</svg>`;
const STATUS_RANK = { ok:0, na:0, warn:1, crit:2 };
const STATUS_LABEL = { ok:'OK', warn:'Atenção', crit:'Crítico', na:'N/A' };
const PRIO_LABEL = { alta:'Alta', media:'Média', baixa:'Baixa' };
const AST_LABEL = { aberta:'Aberta', andamento:'Em andamento', concluida:'Concluída' };

function downloadBlob(blob, name){
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* ---------- IndexedDB (fotos + histórico) ---------- */
const DB = (() => {
  let dbp = null;
  function open(){
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error('IndexedDB indisponível'));
      const r = indexedDB.open('checklist-ti-pro', 1);
      r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('photos', {keyPath:'id'}); d.createObjectStore('visits', {keyPath:'id'}); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  async function tx(store, mode, fn){
    const d = await open();
    return new Promise((res, rej) => {
      const t = d.transaction(store, mode); let out;
      const rq = fn(t.objectStore(store));
      if (rq) rq.onsuccess = () => { out = rq.result; };
      t.oncomplete = () => res(out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    });
  }
  return {
    put: (s, v) => tx(s, 'readwrite', o => o.put(v)),
    get: (s, k) => tx(s, 'readonly', o => o.get(k)),
    del: (s, k) => tx(s, 'readwrite', o => o.delete(k)),
    all: s => tx(s, 'readonly', o => o.getAll()),
    keys: s => tx(s, 'readonly', o => o.getAllKeys())
  };
})();

/* ---------- estado ---------- */
const KEY_DRAFT = 'ti-pro-draft', KEY_ACTIONS = 'ti-pro-actions', KEY_SET = 'ti-pro-settings', KEY_SIG = 'ti-pro-sig-inspetor';
const blankMeta = () => ({ notes:'', geo:null, visitId:null, startedAt:null,
  sig:{ inspetor:{nome:'', png:'', ar:0}, loja:{nome:'', cargo:'', png:'', ar:0} } });
const P = {
  photos: {},                       // chave do item -> [ids]
  cache:  {},                       // id -> {id, mid, thumb, w, h}
  meta:   blankMeta(),
  settings: Object.assign({ stamp:true, requireEvidence:false }, LS.get(KEY_SET, {})),
  actions: LS.get(KEY_ACTIONS, []),
  visits: []
};
const persistDraft = deb(() => { LS.set(KEY_DRAFT, { photos:P.photos, meta:P.meta, savedAt:new Date().toISOString() }); }, 350);
const saveActions  = () => { LS.set(KEY_ACTIONS, P.actions); refreshBadges(); };
const saveSettings = () => LS.set(KEY_SET, P.settings);

/* ---------- sheets, confirm, snack ---------- */
const sheets = new Map(); let sheetN = 0;
function sheet(o){
  const id = 'pro-sheet-' + (++sheetN);
  const bd = document.createElement('div');
  bd.className = 'modal-backdrop pro-bd'; bd.id = id;
  bd.innerHTML = `<div class="modal-sheet pro-sheet${o.tall ? ' tall' : ''}" role="dialog" aria-modal="true" aria-label="${esc(o.title)}">
    <div class="modal-handle"></div>
    <div class="modal-header"><span class="modal-title">${esc(o.title)}</span><button type="button" class="modal-close" data-close aria-label="Fechar">${ICON_CLOSE}</button></div>
    <div class="modal-body">${o.html || ''}</div>${o.foot ? `<div class="pro-foot">${o.foot}</div>` : ''}</div>`;
  document.body.appendChild(bd);
  let closed = false;
  const api = {
    id, el: bd, body: $('.modal-body', bd), foot: $('.pro-foot', bd),
    close(){
      if (closed) return; closed = true; sheets.delete(id);
      bd.classList.remove('open');
      setTimeout(() => bd.remove(), 320);
      if (o.onClose) try { o.onClose(); } catch(e){}
    }
  };
  sheets.set(id, api);
  bd.addEventListener('click', e => { if (e.target === bd || e.target.closest('[data-close]')) api.close(); });
  requestAnimationFrame(() => requestAnimationFrame(() => bd.classList.add('open')));
  return api;
}
function confirmSheet(o){
  return new Promise(res => {
    const s = sheet({ title:o.title, html:`<p style="margin:0;font-size:14px;line-height:1.5;color:var(--text-secondary)">${esc(o.text)}</p>`,
      foot:`<button type="button" class="pro-btn" data-close>Cancelar</button><button type="button" class="pro-btn ${o.danger ? 'danger' : 'primary'}" data-ok>${esc(o.ok || 'Confirmar')}</button>`,
      onClose:() => res(false) });
    $('[data-ok]', s.el).onclick = () => { res(true); s.close(); };
  });
}
let snackT = null;
function snack(msg, label, fn, ms){
  const old = $('.pro-snack'); if (old) old.remove(); clearTimeout(snackT);
  const el = document.createElement('div'); el.className = 'pro-snack'; el.setAttribute('role', 'status');
  el.innerHTML = `<span>${esc(msg)}</span>${label ? `<button type="button">${esc(label)}</button>` : ''}`;
  document.body.appendChild(el);
  const b = $('button', el);
  if (b) b.onclick = () => { el.remove(); clearTimeout(snackT); try { fn && fn(); } catch(e){} };
  snackT = setTimeout(() => el.remove(), ms || 6500);
}

/* ---------- referência de item ---------- */
function itemRef(key){
  const [si, ii] = String(key).split('-').map(Number);
  const sec = SECTIONS[si]; if (!sec) return null;
  return { si, ii, secao: sec.title, item: sec.items[ii] };
}
const itemKeyOf = (secao, item) => `${secao}||${item}`;

/* ---------- fotos ---------- */
async function loadBitmap(file){
  if (window.createImageBitmap) {
    try { return await createImageBitmap(file, { imageOrientation:'from-image' }); } catch(e){}
  }
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => { URL.revokeObjectURL(url); res(im); };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Imagem inválida')); };
    im.src = url;
  });
}
function drawScaled(src, max, q, stamp){
  const sw = src.width || src.naturalWidth, sh = src.height || src.naturalHeight;
  const r = Math.min(1, max / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * r)), h = Math.max(1, Math.round(sh * r));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.drawImage(src, 0, 0, w, h);
  if (stamp) {
    const fs = Math.max(11, Math.round(w / 48)), pad = Math.round(fs * .6);
    g.font = `600 ${fs}px sans-serif`; g.textBaseline = 'middle';
    const txt = stamp; const tw = Math.min(w - pad * 2, g.measureText(txt).width + pad * 2);
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, h - fs - pad * 2, tw + pad, fs + pad * 2);
    g.fillStyle = '#fff'; g.fillText(txt, pad, h - fs / 2 - pad, w - pad * 2);
  }
  return { url: c.toDataURL('image/jpeg', q), w, h };
}
async function makePhoto(file){
  const bmp = await loadBitmap(file);
  const stampTxt = P.settings.stamp ? `${new Date().toLocaleString('pt-BR', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}${curLoja() ? '  ·  ' + curLoja() : ''}` : '';
  const mid = drawScaled(bmp, 960, .72, stampTxt);
  const th  = drawScaled(bmp, 240, .7, '');
  if (bmp.close) try { bmp.close(); } catch(e){}
  return { id: uid('ph'), mid: mid.url, thumb: th.url, w: mid.w, h: mid.h, at: Date.now() };
}
async function addPhotos(key, files){
  const list = Array.from(files || []).filter(f => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic)$/i.test(f.name || ''));
  if (!list.length) return;
  const have = (P.photos[key] || []).length, room = Math.max(0, 8 - have);
  if (!room) { toast('Limite de 8 fotos por item.', 'error'); return; }
  let added = 0;
  for (const f of list.slice(0, room)) {
    try {
      const ph = await makePhoto(f);
      P.cache[ph.id] = ph;
      try { await DB.put('photos', ph); } catch(e){ /* segue só em memória */ }
      (P.photos[key] = P.photos[key] || []).push(ph.id); added++;
    } catch(e){ toast('Não foi possível ler a imagem.', 'error'); }
  }
  if (added) { persistDraft(); renderItem(key); toast(added === 1 ? 'Foto adicionada.' : `${added} fotos adicionadas.`, 'success'); }
}
async function loadPhoto(id){
  if (P.cache[id]) return P.cache[id];
  try { const p = await DB.get('photos', id); if (p) P.cache[id] = p; return p || null; } catch(e){ return null; }
}
async function removePhoto(key, id){
  P.photos[key] = (P.photos[key] || []).filter(x => x !== id);
  if (!P.photos[key].length) delete P.photos[key];
  const used = P.visits.some(v => Object.values(v.items || {}).some(i => (i.p || []).includes(id)));
  if (!used) { delete P.cache[id]; try { await DB.del('photos', id); } catch(e){} }
  persistDraft(); renderItem(key);
}

/* ---------- visualizador / anotação de foto ---------- */
function openPhoto(key, id){
  const ids = P.photos[key] || []; let idx = Math.max(0, ids.indexOf(id));
  const el = document.createElement('div'); el.className = 'pro-full'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Foto');
  document.body.appendChild(el);
  const close = () => { el.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  document.addEventListener('keydown', onKey);
  async function show(){
    const cur = ids[idx], ph = await loadPhoto(cur); const ref = itemRef(key);
    el.innerHTML = `<div class="top"><div class="grow">${esc(ref ? ref.item : 'Foto')} · ${idx + 1}/${ids.length}</div><button type="button" class="modal-close" data-x aria-label="Fechar">${ICON_CLOSE}</button></div>
      <div class="stage">${ph ? `<img alt="Foto do item" src="${ph.mid}">` : '<div style="color:#fff">Foto indisponível neste aparelho.</div>'}</div>
      <div class="bot">${ids.length > 1 ? '<button type="button" class="pro-btn" data-prev>Anterior</button><button type="button" class="pro-btn" data-next>Próxima</button>' : ''}
        <button type="button" class="pro-btn" data-draw>${svg('pen', 14)} Anotar</button>
        <button type="button" class="pro-btn danger" data-del>${svg('trash', 14)} Excluir</button></div>`;
    $('[data-x]', el).onclick = close;
    const pv = $('[data-prev]', el), nx = $('[data-next]', el);
    if (pv) pv.onclick = () => { idx = (idx - 1 + ids.length) % ids.length; show(); };
    if (nx) nx.onclick = () => { idx = (idx + 1) % ids.length; show(); };
    $('[data-draw]', el).onclick = () => { if (ph) annotate(ph, () => show()); };
    $('[data-del]', el).onclick = async () => {
      if (await confirmSheet({ title:'Excluir foto', text:'Remover esta foto do item?', ok:'Excluir', danger:true })) {
        await removePhoto(key, cur); close();
        if ((P.photos[key] || []).length) openPhoto(key, P.photos[key][Math.min(idx, P.photos[key].length - 1)]);
      }
    };
  }
  show();
}
function annotate(ph, done){
  const el = document.createElement('div'); el.className = 'pro-full'; el.style.zIndex = 255;
  el.innerHTML = `<div class="top"><div class="grow">Anotar foto</div>
    <button type="button" class="pro-pen sel" data-c="#ef4444" style="background:#ef4444" aria-label="Vermelho"></button>
    <button type="button" class="pro-pen" data-c="#facc15" style="background:#facc15" aria-label="Amarelo"></button>
    <button type="button" class="pro-pen" data-c="#ffffff" style="background:#fff" aria-label="Branco"></button></div>
    <div class="stage"><canvas></canvas></div>
    <div class="bot"><button type="button" class="pro-btn" data-undo>Desfazer</button><button type="button" class="pro-btn" data-cancel>Cancelar</button><button type="button" class="pro-btn primary" data-save>Salvar</button></div>`;
  document.body.appendChild(el);
  const cv = $('canvas', el), g = cv.getContext('2d'); let color = '#ef4444'; const strokes = []; let cur = null, base = null;
  const im = new Image();
  im.onload = () => { cv.width = im.naturalWidth; cv.height = im.naturalHeight; base = im; redraw(); };
  im.src = ph.mid;
  const lw = () => Math.max(3, cv.width / 140);
  function redraw(){
    g.clearRect(0, 0, cv.width, cv.height); g.drawImage(base, 0, 0);
    g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = lw();
    strokes.concat(cur ? [cur] : []).forEach(s => { g.strokeStyle = s.c; g.beginPath(); s.p.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); if (s.p.length === 1) g.lineTo(s.p[0].x + .1, s.p[0].y); g.stroke(); });
  }
  const pt = e => { const r = cv.getBoundingClientRect(); return { x:(e.clientX - r.left) * cv.width / r.width, y:(e.clientY - r.top) * cv.height / r.height }; };
  cv.addEventListener('pointerdown', e => { e.preventDefault(); cv.setPointerCapture(e.pointerId); cur = { c:color, p:[pt(e)] }; redraw(); });
  cv.addEventListener('pointermove', e => { if (!cur) return; cur.p.push(pt(e)); redraw(); });
  const end = () => { if (cur) { strokes.push(cur); cur = null; redraw(); } };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  $$('.pro-pen', el).forEach(b => b.onclick = () => { color = b.dataset.c; $$('.pro-pen', el).forEach(x => x.classList.toggle('sel', x === b)); });
  $('[data-undo]', el).onclick = () => { strokes.pop(); redraw(); };
  $('[data-cancel]', el).onclick = () => el.remove();
  $('[data-save]', el).onclick = async () => {
    if (!base) return;
    ph.mid = cv.toDataURL('image/jpeg', .78);
    const t = drawScaled(cv, 240, .7, ''); ph.thumb = t.url;
    P.cache[ph.id] = ph; try { await DB.put('photos', ph); } catch(e){}
    el.remove(); persistDraft(); $$('.pro-extra').forEach(x => renderItem(x.dataset.key)); done && done();
  };
}

/* ---------- ditado por voz e leitor de código ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, recKey = null;
function setObs(key, text){
  const ta = document.getElementById('obs-' + key); if (!ta) return;
  ta.value = (ta.value ? ta.value.replace(/\s+$/, '') + ' ' : '') + text;
  ta.dispatchEvent(new Event('input', { bubbles:true }));
}
function toggleDictation(key){
  if (!SR) return;
  if (rec) { try { rec.stop(); } catch(e){} return; }
  rec = new SR(); recKey = key; rec.lang = 'pt-BR'; rec.continuous = true; rec.interimResults = false;
  rec.onresult = e => { for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) setObs(key, e.results[i][0].transcript.trim()); };
  rec.onerror = ev => { if (ev.error === 'not-allowed') toast('Permita o microfone para ditar.', 'error'); };
  rec.onend = () => { const k = recKey; rec = null; recKey = null; renderItem(k); };
  try { rec.start(); renderItem(key); toast('Ouvindo… toque em Ditar de novo para parar.', 'info'); } catch(e){ rec = null; }
}
async function scanCode(key){
  if (!('BarcodeDetector' in window)) { toast('Este aparelho não lê códigos pela câmera.', 'error'); return; }
  let stream, timer, stopped = false;
  const el = document.createElement('div'); el.className = 'pro-full';
  el.innerHTML = `<div class="top"><div class="grow">Aponte para o QR code / código de barras</div><button type="button" class="modal-close" data-x aria-label="Fechar">${ICON_CLOSE}</button></div>
    <div class="stage"><video playsinline muted></video><div class="pro-scanline"></div></div>
    <div class="bot"><button type="button" class="pro-btn" data-manual>Digitar manualmente</button></div>`;
  document.body.appendChild(el);
  const stop = () => { stopped = true; clearInterval(timer); if (stream) stream.getTracks().forEach(t => t.stop()); el.remove(); };
  $('[data-x]', el).onclick = stop;
  $('[data-manual]', el).onclick = () => { stop(); const t = $('#obs-' + key); if (t) t.focus(); };
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'environment' }, audio:false });
    const v = $('video', el); v.srcObject = stream; await v.play();
    let fmts; try { fmts = await BarcodeDetector.getSupportedFormats(); } catch(e){}
    const det = new BarcodeDetector(fmts && fmts.length ? { formats:fmts } : undefined);
    timer = setInterval(async () => {
      if (stopped) return;
      try {
        const r = await det.detect(v);
        if (r && r.length) { const val = r[0].rawValue; stop(); setObs(key, `S/N: ${val}`); toast('Código lido: ' + val, 'success'); if (navigator.vibrate) navigator.vibrate(60); }
      } catch(e){}
    }, 300);
  } catch(e) { stop(); toast('Não foi possível abrir a câmera.', 'error'); }
}

/* ---------- plano de ação ---------- */
const isOverdue = a => a.status !== 'concluida' && a.prazo && a.prazo < today();
function findAction(key, anyStatus){
  const r = itemRef(key); if (!r) return null; const loja = curLoja();
  return P.actions.find(a => a.loja === loja && a.secao === r.secao && a.item === r.item && (anyStatus || a.status !== 'concluida')) || null;
}
const openActions = loja => P.actions.filter(a => a.status !== 'concluida' && (!loja || a.loja === loja));
function dueText(a){
  if (a.status === 'concluida') return { t:`Concluída em ${fmtD((a.concluidaEm || '').slice(0,10))}`, late:false };
  if (!a.prazo) return { t:'Sem prazo', late:false };
  const d = diffDays(today(), a.prazo);
  if (d < 0) return { t:`Atrasada há ${-d} dia${-d > 1 ? 's' : ''}`, late:true };
  if (d === 0) return { t:'Vence hoje', late:false };
  return { t:`Vence em ${d} dia${d > 1 ? 's' : ''} (${fmtD(a.prazo).slice(0,5)})`, late:false };
}
function newActionFor(key){
  const r = itemRef(key), st = State.items[key] || {};
  const crit = st.status === 'crit';
  return { id: uid('ac'), loja: curLoja(), secao: r.secao, item: r.item, titulo: `Corrigir: ${r.item}`, desc: (st.obs || '').trim(),
    resp:'', prazo: addDays(today(), crit ? 7 : 15), prio: crit ? 'alta' : 'media', status:'aberta',
    criadaEm: new Date().toISOString(), visita: curData(), origem: st.status || '', concluidaEm: null };
}
function editAction(idOrKey, isKey){
  let a = idOrKey === '__manual' ? P._manual : isKey ? newActionFor(idOrKey) : P.actions.find(x => x.id === idOrKey);
  if (!a) return;
  if (isKey && !curLoja()) { toast('Selecione a loja antes de criar a ação.', 'error'); return; }
  const isNew = !P.actions.some(x => x.id === a.id);
  const resps = Array.from(new Set(P.actions.map(x => x.resp).filter(Boolean)));
  const s = sheet({ title: isNew ? 'Nova ação corretiva' : 'Editar ação', tall:false,
    html:`<div class="pro-field"><span class="pro-lbl">Loja · Item</span><div style="font-size:13px">${esc(a.loja)}<br><span style="color:var(--text-muted);font-size:12px">${esc(a.secao)} · ${esc(a.item)}</span></div></div>
      <div class="pro-field"><label for="acT">Ação</label><input id="acT" class="pro-in" maxlength="140" value="${esc(a.titulo)}"></div>
      <div class="pro-field"><label for="acD">Detalhes / o que precisa ser feito</label><textarea id="acD" class="pro-in" placeholder="Ex.: trocar o switch do rack 2 e testar a rede">${esc(a.desc)}</textarea></div>
      <div class="pro-row2"><div class="pro-field"><label for="acR">Responsável</label><input id="acR" class="pro-in" list="acRL" value="${esc(a.resp)}" placeholder="Nome"><datalist id="acRL">${resps.map(r => `<option value="${esc(r)}">`).join('')}</datalist></div>
      <div class="pro-field"><label for="acP">Prazo</label><input id="acP" type="date" class="pro-in" value="${esc(a.prazo || '')}"></div></div>
      <div class="pro-seg" id="acQ">${[3,7,15,30].map(n => `<button type="button" class="pro-chip" data-d="${n}">+${n} dias</button>`).join('')}</div>
      <div class="pro-field"><span class="pro-lbl">Prioridade</span><div class="pro-seg" id="acPr">${Object.keys(PRIO_LABEL).map(k => `<button type="button" class="pro-chip${a.prio === k ? ' on' : ''}" data-v="${k}">${PRIO_LABEL[k]}</button>`).join('')}</div></div>
      ${isNew ? '' : `<div class="pro-field"><span class="pro-lbl">Status</span><div class="pro-seg" id="acSt">${Object.keys(AST_LABEL).map(k => `<button type="button" class="pro-chip${a.status === k ? ' on' : ''}" data-v="${k}">${AST_LABEL[k]}</button>`).join('')}</div></div>`}`,
    foot:`${isNew ? '<button type="button" class="pro-btn" data-close>Cancelar</button>' : '<button type="button" class="pro-btn danger" data-del>Excluir</button>'}<button type="button" class="pro-btn primary" data-save>Salvar ação</button>` });
  const seg = (id, set) => $$('#' + id + ' .pro-chip', s.el).forEach(b => b.onclick = () => { $$('#' + id + ' .pro-chip', s.el).forEach(x => x.classList.toggle('on', x === b)); set(b.dataset.v); });
  seg('acPr', v => a.prio = v); if (!isNew) seg('acSt', v => a.status = v);
  $$('#acQ .pro-chip', s.el).forEach(b => b.onclick = () => { $('#acP', s.el).value = addDays(today(), +b.dataset.d); });
  $('[data-save]', s.el).onclick = () => {
    const t = $('#acT', s.el).value.trim(); if (!t) { $('#acT', s.el).focus(); toast('Dê um título para a ação.', 'error'); return; }
    a.titulo = t; a.desc = $('#acD', s.el).value.trim(); a.resp = $('#acR', s.el).value.trim(); a.prazo = $('#acP', s.el).value || null;
    if (a.status === 'concluida' && !a.concluidaEm) a.concluidaEm = new Date().toISOString();
    if (a.status !== 'concluida') a.concluidaEm = null;
    if (isNew) P.actions.push(a);
    saveActions(); refreshAllItems(); s.close(); toast(isNew ? 'Ação criada.' : 'Ação atualizada.', 'success'); if (P._onActions) P._onActions();
  };
  const del = $('[data-del]', s.el);
  if (del) del.onclick = async () => { if (await confirmSheet({ title:'Excluir ação', text:'Excluir esta ação corretiva?', ok:'Excluir', danger:true })) { P.actions = P.actions.filter(x => x.id !== a.id); saveActions(); refreshAllItems(); s.close(); if (P._onActions) P._onActions(); } };
}
function setActionStatus(id, status){
  const a = P.actions.find(x => x.id === id); if (!a) return;
  a.status = status; a.concluidaEm = status === 'concluida' ? new Date().toISOString() : null;
  saveActions(); refreshAllItems(); if (P._onActions) P._onActions();
}
function autoActions(){
  let n = 0;
  Object.keys(State.items).forEach(k => { const st = State.items[k]; if ((st.status === 'crit' || st.status === 'warn') && !findAction(k)) { P.actions.push(newActionFor(k)); n++; } });
  if (n) { saveActions(); refreshAllItems(); }
  return n;
}
function actionsCsv(list){
  const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const head = ['Loja','Seção','Item','Ação','Detalhes','Responsável','Prazo','Prioridade','Status','Criada em','Concluída em'];
  const rows = list.map(a => [a.loja, a.secao, a.item, a.titulo, a.desc, a.resp, fmtD(a.prazo), PRIO_LABEL[a.prio], AST_LABEL[a.status], fmtD((a.criadaEm || '').slice(0,10)), a.concluidaEm ? fmtD(a.concluidaEm.slice(0,10)) : '']);
  return '﻿' + [head].concat(rows).map(r => r.map(q).join(';')).join('\r\n');
}
function openPlan(){
  const st = { scope: curLoja() ? 'loja' : 'todas', filter:'abertas' };
  const s = sheet({ title:'Plano de ação', tall:true, html:'', foot:`<button type="button" class="pro-btn" data-csv>${svg('share', 14)} Exportar CSV</button><button type="button" class="pro-btn primary" data-new>Nova ação</button>` });
  function view(){
    const loja = curLoja();
    let list = P.actions.filter(a => st.scope === 'todas' || a.loja === loja);
    const all = list;
    const open = all.filter(a => a.status !== 'concluida'), late = all.filter(isOverdue), done = all.filter(a => a.status === 'concluida');
    list = st.filter === 'abertas' ? open : st.filter === 'atrasadas' ? late : st.filter === 'concluidas' ? done : all;
    const ord = { alta:0, media:1, baixa:2 };
    list = list.slice().sort((a, b) => (a.status === 'concluida') - (b.status === 'concluida') || (a.prazo || '9') .localeCompare(b.prazo || '9') || ord[a.prio] - ord[b.prio]);
    const sug = Object.keys(State.items).filter(k => { const x = State.items[k]; return (x.status === 'crit' || x.status === 'warn') && !findAction(k); }).length;
    s.body.innerHTML = `<div class="pro-stats"><div class="pro-stat"><b>${open.length}</b><span>Abertas</span></div><div class="pro-stat"><b style="color:${late.length ? 'var(--crit)' : 'inherit'}">${late.length}</b><span>Atrasadas</span></div><div class="pro-stat"><b style="color:var(--ok)">${done.length}</b><span>Concluídas</span></div></div>
      <div class="pro-seg" id="plS">${loja ? `<button type="button" class="pro-chip${st.scope === 'loja' ? ' on' : ''}" data-s="loja">${esc(loja.split(' - ')[0])}</button>` : ''}<button type="button" class="pro-chip${st.scope === 'todas' ? ' on' : ''}" data-s="todas">Todas as lojas</button></div>
      <div class="pro-seg" id="plF">${[['abertas','Abertas'],['atrasadas','Atrasadas'],['concluidas','Concluídas'],['todas','Todas']].map(([k, l]) => `<button type="button" class="pro-chip${st.filter === k ? ' on' : ''}" data-f="${k}">${l}</button>`).join('')}</div>
      ${sug && loja ? `<div class="pro-banner"><div class="grow"><b>${sug} item${sug > 1 ? 'ns' : ''} crítico/atenção sem ação.</b><br>Crie ações com prazo sugerido (7 dias crítico, 15 dias atenção).</div><button type="button" class="pro-mini" data-auto>Criar todas</button></div>` : ''}
      <div class="pro-list">${list.length ? list.map(card).join('') : '<div class="pro-empty">Nenhuma ação nesta visão.</div>'}</div>`;
    $$('#plS .pro-chip', s.el).forEach(b => b.onclick = () => { st.scope = b.dataset.s; view(); });
    $$('#plF .pro-chip', s.el).forEach(b => b.onclick = () => { st.filter = b.dataset.f; view(); });
    const au = $('[data-auto]', s.el); if (au) au.onclick = () => { const n = autoActions(); toast(`${n} ação(ões) criada(s).`, 'success'); view(); };
    $$('[data-a]', s.el).forEach(b => b.onclick = () => { const id = b.dataset.id, k = b.dataset.a;
      if (k === 'edit') editAction(id); else if (k === 'done') setActionStatus(id, 'concluida'); else if (k === 'reopen') setActionStatus(id, 'aberta'); else if (k === 'prog') setActionStatus(id, 'andamento'); });
  }
  function card(a){
    const d = dueText(a);
    return `<div class="pro-card ${a.prio}${a.status === 'concluida' ? ' done' : ''}"><div style="display:flex;gap:8px;align-items:flex-start;justify-content:space-between"><div><h4>${esc(a.titulo)}</h4><div class="sub">${esc(a.loja.split(' - ')[0])} · ${esc(a.secao)} · ${esc(a.item)}</div></div><span class="pro-tag ${a.status === 'concluida' ? 'ok' : a.prio}">${a.status === 'concluida' ? 'Concluída' : PRIO_LABEL[a.prio]}</span></div>
      ${a.desc ? `<div style="font-size:12px;color:var(--text-secondary)">${esc(a.desc)}</div>` : ''}
      <div class="meta"><span class="${d.late ? 'late' : ''}">${esc(d.t)}</span><span>${a.resp ? 'Resp.: ' + esc(a.resp) : 'Sem responsável'}</span><span>${esc(AST_LABEL[a.status])}</span></div>
      <div class="acts">${a.status === 'concluida' ? `<button type="button" class="pro-mini" data-a="reopen" data-id="${a.id}">Reabrir</button>` : `<button type="button" class="pro-mini" data-a="done" data-id="${a.id}">Concluir</button>${a.status === 'aberta' ? `<button type="button" class="pro-mini" data-a="prog" data-id="${a.id}">Iniciar</button>` : ''}`}<button type="button" class="pro-mini" data-a="edit" data-id="${a.id}">Editar</button></div></div>`;
  }
  P._onActions = () => { if (sheets.has(s.id)) view(); };
  const oldClose = s.close; s.close = function(){ P._onActions = null; oldClose.call(s); };
  $('[data-new]', s.el).onclick = () => {
    if (!curLoja()) { toast('Selecione a loja no topo para criar ações.', 'error'); return; }
    const pick = Object.keys(State.items).filter(k => { const x = State.items[k]; return x.status === 'crit' || x.status === 'warn'; });
    const manual = { id: uid('ac'), loja: curLoja(), secao:'Geral', item:'Ação avulsa', titulo:'', desc:'', resp:'', prazo:addDays(today(), 7), prio:'media', status:'aberta', criadaEm:new Date().toISOString(), visita:curData(), origem:'', concluidaEm:null };
    if (pick.length) {
      const m = sheet({ title:'Criar ação para…', html:`<div class="pro-list">${pick.map(k => { const r = itemRef(k); return `<button type="button" class="pro-visit" data-k="${k}"><div class="tx"><b>${esc(r.item)}</b><span>${esc(r.secao)} · ${STATUS_LABEL[State.items[k].status]}</span></div></button>`; }).join('')}<button type="button" class="pro-visit" data-k="__m"><div class="tx"><b>Ação avulsa</b><span>Não ligada a um item do checklist</span></div></button></div>` });
      $$('[data-k]', m.el).forEach(b => b.onclick = () => { m.close(); if (b.dataset.k === '__m') { P._manual = manual; editAction('__manual'); } else editAction(b.dataset.k, true); });
    } else { P._manual = manual; editAction('__manual'); }
  };
  $('[data-csv]', s.el).onclick = () => {
    const list = P.actions.filter(a => st.scope === 'todas' || a.loja === curLoja());
    if (!list.length) { toast('Não há ações para exportar.', 'error'); return; }
    downloadBlob(new Blob([actionsCsv(list)], { type:'text/csv;charset=utf-8' }), `plano-de-acao-${today()}.csv`);
  };
  view();
}

/* ===== parte 2: itens, revisão, histórico, PDF, menu, hooks ===== */
function renderItem(key){
  const card = document.getElementById('card-' + key); if (!card) return;
  const host = $('.pro-extra', card); if (!host) return;
  const st = State.items[key] || {}, ids = P.photos[key] || [], act = findAction(key);
  const dict = rec && recKey === key;
  const chip = (kind, icon, label, cls = '') => `<button type="button" class="pro-chip${cls}" data-pro="${kind}" data-key="${key}" title="${label}">${svg(icon)}<span class="lbl">${label}</span></button>`;
  let h = `<div class="pro-tools">${chip('cam', 'camera', 'Foto')}${chip('gal', 'image', 'Galeria')}`;
  if (SR) h += chip('mic', 'mic', dict ? 'Parar' : 'Ditar', dict ? ' rec' : '');
  if ('BarcodeDetector' in window) h += chip('scan', 'scan', 'Escanear');
  h += '</div>';
  if (ids.length) h += `<div class="pro-thumbs">${ids.map(id => `<button type="button" class="pro-thumb" data-pro="photo" data-key="${key}" data-id="${id}" aria-label="Ver foto">${P.cache[id] ? `<img alt="" src="${P.cache[id].thumb}">` : ''}</button>`).join('')}</div>`;
  if (act) { const d = dueText(act); h += `<div class="pro-action-chip${d.late ? ' late' : ''}">${svg('flag', 15)}<div class="grow"><div><b>${esc(act.titulo)}</b></div><div>${esc(d.t)}${act.resp ? ' · ' + esc(act.resp) : ''}</div></div><button type="button" class="pro-mini" data-pro="actedit" data-id="${act.id}">Abrir</button>${st.status === 'ok' ? `<button type="button" class="pro-mini" data-pro="actdone" data-id="${act.id}">Concluir</button>` : ''}</div>`; }
  else if (st.status === 'crit' || st.status === 'warn') h += `<div class="pro-tools"><button type="button" class="pro-chip ${st.status === 'crit' ? 'rec' : 'warnc'}" data-pro="act" data-key="${key}">${svg('flag')}Criar ação corretiva</button></div>`;
  host.dataset.key = key; host.innerHTML = h;
}
function refreshAllItems(){ $$('.pro-extra').forEach(x => renderItem(x.dataset.key)); }
function decorateAll(){
  $$('.item-card').forEach(card => {
    const key = `${card.dataset.si}-${card.dataset.ii}`;
    if (!$('.pro-extra', card)) {
      const inner = $('.item-details-inner', card), ts = $('.item-timestamp', card);
      const d = document.createElement('div'); d.className = 'pro-extra'; d.dataset.key = key;
      inner && inner.insertBefore(d, ts);
    }
    renderItem(key);
  });
  $$('.slide[id^="slide-"]').forEach(sl => {
    const hd = $('.slide-section-header', sl); if (!hd || $('.pro-bulk', hd)) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'pro-bulk'; b.dataset.si = sl.id.replace('slide-', '');
    b.innerHTML = `${svg('check', 12)} Restantes OK`; hd.insertBefore(b, $('.slide-section-count', hd));
  });
}
function bulkOk(si){
  const sec = SECTIONS[si]; if (!sec) return;
  const keys = sec.items.map((_, ii) => `${si}-${ii}`).filter(k => State.items[k] && !State.items[k].status);
  if (!keys.length) { toast('Todos os itens desta seção já foram avaliados.', 'info'); return; }
  keys.forEach(k => window.handleStatusClick(k, 'ok'));
  snack(`${keys.length} itens marcados como OK em "${sec.title}".`, 'Desfazer', () => keys.forEach(k => { if (State.items[k].status === 'ok') window.handleStatusClick(k, 'ok'); }));
}

/* ---------- assinatura ---------- */
function sigPad(canvas, png, onChange){
  const dpr = Math.max(1, window.devicePixelRatio || 1), r = canvas.getBoundingClientRect();
  canvas.width = Math.round((r.width || 320) * dpr); canvas.height = Math.round((r.height || 130) * dpr);
  const g = canvas.getContext('2d'); g.lineWidth = 2.4 * dpr; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#111';
  let dirty = false, down = false, last = null;
  if (png) { const im = new Image(); im.onload = () => { g.drawImage(im, 0, 0, canvas.width, canvas.height); dirty = true; }; im.src = png; }
  const pt = e => { const b = canvas.getBoundingClientRect(); return { x:(e.clientX - b.left) * canvas.width / b.width, y:(e.clientY - b.top) * canvas.height / b.height }; };
  canvas.addEventListener('pointerdown', e => { e.preventDefault(); canvas.setPointerCapture(e.pointerId); down = true; last = pt(e); g.beginPath(); g.moveTo(last.x, last.y); g.lineTo(last.x + .1, last.y); g.stroke(); dirty = true; });
  canvas.addEventListener('pointermove', e => { if (!down) return; const p = pt(e); g.beginPath(); g.moveTo(last.x, last.y); g.lineTo(p.x, p.y); g.stroke(); last = p; });
  const up = () => { if (!down) return; down = false; onChange(api.png(), canvas.width / canvas.height); };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  const api = { png: () => dirty ? canvas.toDataURL('image/png') : '', clear(){ g.clearRect(0, 0, canvas.width, canvas.height); dirty = false; onChange('', 0); } };
  return api;
}

/* Assinatura digitada: o nome vira letra cursiva automática (como em sistemas de RH) */
const SIG_FONT = '600 72px "Dancing Script", "Brush Script MT", cursive';
function sigText(canvas, onChange){
  let tk = 0;
  const api = { async set(txt){
    const my = ++tk; txt = (txt || '').trim();
    const g = canvas.getContext('2d');
    if (!txt) { canvas.width = 300; canvas.height = 110; onChange('', 0); return; }
    try { await document.fonts.load(SIG_FONT, txt); } catch(e){}
    if (my !== tk) return;
    g.font = SIG_FONT; const w = Math.ceil(g.measureText(txt).width) + 48, h = 110;
    canvas.width = w; canvas.height = h; g.font = SIG_FONT; g.fillStyle = '#1b2a5a'; g.textBaseline = 'alphabetic'; g.fillText(txt, 24, 76);
    onChange(canvas.toDataURL('image/png'), w / h);
  } };
  return api;
}

/* ---------- snapshot / histórico / comparação ---------- */
function snapshot(){
  const items = {}, sections = [];
  SECTIONS.forEach((sec, si) => {
    const c = { ok:0, warn:0, crit:0, na:0 };
    sec.items.forEach((it, ii) => {
      const k = `${si}-${ii}`, st = State.items[k]; if (!st || !st.status) return;
      c[st.status]++; items[itemKeyOf(sec.title, it)] = { s:st.status, q:st.qty || '', o:st.obs || '', p:(P.photos[k] || []).slice() };
    });
    sections.push({ title:sec.title, score:State.scoreFor(si), total:sec.items.length, ok:c.ok, warn:c.warn, crit:c.crit, na:c.na });
  });
  return { loja:curLoja(), data:curData(), resp:($('#fResp') || {}).value || '', reg:($('#fReg') || {}).value || '',
    score:State.overallScore(), grade:State.grade(), done:State.doneItems(), total:State.totalItems(),
    ok:State.countBy('ok'), warn:State.countBy('warn'), crit:State.countBy('crit'), na:State.countBy('na'), sections, items };
}
async function archiveVisit(){
  if (!State.doneItems()) return;
  const v = snapshot();
  v.id = P.meta.visitId || uid('v'); v.savedAt = new Date().toISOString();
  v.notes = P.meta.notes; v.geo = P.meta.geo; v.sig = P.meta.sig;
  v.duracaoMin = P.meta.startedAt ? Math.round((Date.now() - P.meta.startedAt) / 6e4) : null;
  v.acoes = P.actions.filter(a => a.loja === v.loja && a.visita === v.data).length;
  P.meta.visitId = v.id; persistDraft();
  P.visits = P.visits.filter(x => x.id !== v.id).concat(v);
  try { await DB.put('visits', v); } catch(e){ toast('Histórico local indisponível neste navegador.', 'error'); }
  return v;
}
const prevVisit = (loja, exclude) => P.visits.filter(v => v.loja === loja && v.id !== exclude).sort((a, b) => b.savedAt.localeCompare(a.savedAt))[0] || null;
function compare(cur, prev){
  const out = { delta:cur.score - prev.score, worse:[], better:[], persist:[], fresh:[], sections:[] };
  Object.keys(cur.items).forEach(k => {
    const c = cur.items[k], p = prev.items[k], name = k.split('||');
    const e = { secao:name[0], item:name[1], de:p ? p.s : null, para:c.s };
    if (!p) { if (STATUS_RANK[c.s] > 0) out.fresh.push(e); return; }
    if (STATUS_RANK[c.s] > STATUS_RANK[p.s]) out.worse.push(e);
    else if (STATUS_RANK[c.s] < STATUS_RANK[p.s]) out.better.push(e);
    else if (c.s === 'crit') out.persist.push(e);
  });
  cur.sections.forEach(s => { const q = prev.sections.find(x => x.title === s.title); out.sections.push({ title:s.title, now:s.score, before:q ? q.score : null }); });
  return out;
}
const dlt = d => d == null ? '' : `<span class="pro-delta ${d > 0 ? 'up' : d < 0 ? 'down' : 'eq'}">${d > 0 ? '+' : ''}${d} pts</span>`;
function openCompare(cur, prev){
  cur = cur || snapshot(); prev = prev || prevVisit(cur.loja, P.meta.visitId);
  if (!cur.done) { toast('Avalie alguns itens antes de comparar.', 'error'); return; }
  if (!prev) { toast('Sem visita anterior salva para esta loja.', 'info'); return; }
  const c = compare(cur, prev);
  const list = (t, a, col) => a.length ? `<div><div class="modal-section-label" style="color:${col}">${t} (${a.length})</div><div class="pro-list">${a.map(e => `<div class="pro-check"><div class="grow">${esc(e.item)}<small>${esc(e.secao)} · ${e.de ? STATUS_LABEL[e.de] + ' → ' : 'novo → '}${STATUS_LABEL[e.para]}</small></div></div>`).join('')}</div></div>` : '';
  sheet({ title:'Comparativo', tall:true, html:`<div class="pro-score"><div class="n">${cur.score}</div><div><div class="g">Agora · ${esc(fmtD(cur.data))}</div>${dlt(c.delta)} <span class="g">vs ${fmtD(prev.data)} (${prev.score})</span></div></div>
    <table class="pro-table"><tr><th>Seção</th><th class="r">Antes</th><th class="r">Agora</th></tr>${c.sections.map(s => `<tr><td>${esc(s.title)}</td><td class="r">${s.before == null ? '—' : s.before}</td><td class="r">${s.now == null ? '—' : s.now}${s.before != null && s.now != null ? ' ' + dlt(s.now - s.before) : ''}</td></tr>`).join('')}</table>
    ${list('Pioraram', c.worse, 'var(--crit)')}${list('Novos problemas', c.fresh, 'var(--warn)')}${list('Críticos persistentes', c.persist, 'var(--crit)')}${list('Melhoraram', c.better, 'var(--ok)')}` });
}
function trendSvg(vs){
  const a = vs.slice().sort((x, y) => x.savedAt.localeCompare(y.savedAt)).slice(-12); if (a.length < 2) return '';
  const W = 300, H = 80, pts = a.map((v, i) => [10 + i * (W - 20) / (a.length - 1), H - 8 - v.score * (H - 16) / 100]);
  return `<div class="pro-trend"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><polyline fill="none" stroke="var(--brand)" stroke-width="2" points="${pts.map(p => p.join(',')).join(' ')}"/>${pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="var(--brand)"/>`).join('')}</svg><div class="cap"><span>${fmtD(a[0].data)}</span><span>Evolução da nota</span><span>${fmtD(a[a.length - 1].data)}</span></div></div>`;
}
function openHistory(){
  let loja = curLoja();
  const s = sheet({ title:'Histórico de vistorias', tall:true });
  function view(){
    const lojas = Array.from(new Set(P.visits.map(v => v.loja))).sort();
    const vs = P.visits.filter(v => !loja || v.loja === loja).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
    s.body.innerHTML = `<div class="pro-field"><label for="hF">Loja</label><select id="hF" class="pro-in"><option value="">Todas</option>${lojas.map(l => `<option${l === loja ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
      ${loja ? trendSvg(vs) : ''}<div class="pro-list">${vs.length ? vs.map(v => `<button type="button" class="pro-visit" data-id="${v.id}"><div class="sc ${v.grade}">${v.score}<small>${v.grade}</small></div><div class="tx"><b>${esc(v.loja)}</b><span>${fmtD(v.data)} · ${esc(v.resp)} · ${v.crit} crít. · ${v.warn} aten.</span></div></button>`).join('') : '<div class="pro-empty">Nenhuma vistoria salva ainda. Ao salvar, ela aparece aqui.</div>'}</div>`;
    $('#hF', s.el).onchange = e => { loja = e.target.value; view(); };
    $$('.pro-visit', s.el).forEach(b => b.onclick = () => visitDetail(b.dataset.id, view));
  }
  view();
}
async function visitDetail(id, back){
  const v = P.visits.find(x => x.id === id); if (!v) return;
  const crit = Object.keys(v.items).filter(k => v.items[k].s === 'crit');
  const s = sheet({ title:`${v.loja.split(' - ')[0]} · ${fmtD(v.data)}`, tall:true,
    html:`<div class="pro-score"><div class="n">${v.score}</div><div><div class="g">Nota ${v.grade} · ${v.done}/${v.total} itens</div><div class="g">${v.ok} OK · ${v.warn} atenção · ${v.crit} crítico</div><div class="g">${esc(v.resp)}${v.duracaoMin != null ? ' · ' + v.duracaoMin + ' min' : ''}</div></div></div>
    <div class="pro-bars">${v.sections.filter(x => x.score != null).map(x => `<div class="pro-bar"><span>${esc(x.title)}</span><i><b style="width:${x.score}%;background:${x.score >= 75 ? 'var(--ok)' : x.score >= 55 ? 'var(--warn)' : 'var(--crit)'}"></b></i><span>${x.score}</span></div>`).join('')}</div>
    ${v.notes ? `<div><div class="modal-section-label">Parecer</div><div style="font-size:13px;white-space:pre-wrap">${esc(v.notes)}</div></div>` : ''}
    ${crit.length ? `<div><div class="modal-section-label">Itens críticos</div><div class="pro-list">${crit.map(k => { const i = v.items[k]; return `<div class="pro-check bad"><div class="grow">${esc(k.split('||')[1])}<small>${esc(k.split('||')[0])}${i.o ? ' · ' + esc(i.o) : ''}</small>${i.p.length ? `<div class="pro-thumbs" style="margin-top:6px" data-ph="${i.p.join(',')}"></div>` : ''}</div></div>`; }).join('')}</div></div>` : ''}`,
    foot:`<button type="button" class="pro-btn danger" data-del>Excluir</button><button type="button" class="pro-btn primary" data-cmp>Comparar com atual</button>` });
  for (const box of $$('[data-ph]', s.el)) for (const pid of box.dataset.ph.split(',')) { const ph = await loadPhoto(pid); if (ph) box.insertAdjacentHTML('beforeend', `<span class="pro-thumb" style="width:52px;height:52px"><img alt="" src="${ph.thumb}"></span>`); }
  $('[data-cmp]', s.el).onclick = () => { s.close(); openCompare(null, v); };
  $('[data-del]', s.el).onclick = async () => {
    if (!await confirmSheet({ title:'Excluir vistoria', text:'Excluir esta vistoria do histórico deste aparelho?', ok:'Excluir', danger:true })) return;
    P.visits = P.visits.filter(x => x.id !== id); try { await DB.del('visits', id); } catch(e){}
    const inUse = new Set([].concat(...Object.values(P.photos)));
    for (const k of Object.keys(v.items)) for (const pid of v.items[k].p) if (!inUse.has(pid) && !P.visits.some(o => Object.values(o.items).some(i => i.p.includes(pid)))) { delete P.cache[pid]; try { await DB.del('photos', pid); } catch(e){} }
    s.close(); if (back) back();
  };
}

/* ---------- revisão antes de salvar ---------- */
function analyze(){
  const r = { pending:[], noEv:[], noAct:[], crit:0 };
  SECTIONS.forEach((sec, si) => {
    let n = 0;
    sec.items.forEach((_, ii) => {
      const k = `${si}-${ii}`, st = State.items[k]; if (!st) return;
      if (!st.status) { n++; return; }
      if (st.status === 'crit') { r.crit++; if (!((st.obs || '').trim().length >= 3 || (P.photos[k] || []).length)) r.noEv.push(k); }
      if ((st.status === 'crit' || st.status === 'warn') && !findAction(k)) r.noAct.push(k);
    });
    if (n) r.pending.push({ si, title:sec.title, n });
  });
  return r;
}
let ORIG_SAVE = null;
function openReview(){
  const s = sheet({ title:'Finalizar vistoria', tall:true, foot:`<button type="button" class="pro-btn" data-pdf>${svg('eye', 14)} Prévia PDF</button><button type="button" class="pro-btn primary" data-save>Salvar vistoria</button>` });
  const geoTxt = () => P.meta.geo ? `${P.meta.geo.lat}, ${P.meta.geo.lng} (±${P.meta.geo.acc} m)` : 'Não registrada';
  function view(){
    const a = analyze(), loja = curLoja(), prev = prevVisit(loja, P.meta.visitId), cur = snapshot();
    const blockEv = P.settings.requireEvidence && a.noEv.length, block = !loja || blockEv;
    const ck = (cls, t, sm, btn) => `<div class="pro-check ${cls}"><div class="ic">${cls === 'ok' ? '✓' : '!'}</div><div class="grow">${t}${sm ? `<small>${sm}</small>` : ''}</div>${btn || ''}</div>`;
    s.body.innerHTML = `<div class="pro-score"><div class="n">${cur.score}</div><div><div class="g">Nota ${cur.grade} · ${cur.done}/${cur.total} itens</div><div class="g">${cur.ok} OK · ${cur.warn} atenção · ${cur.crit} crítico</div>${prev ? `<div>${dlt(cur.score - prev.score)} <span class="g">vs ${fmtD(prev.data)}</span></div>` : ''}</div></div>
      <div class="pro-list">${!loja ? ck('bad', 'Loja não selecionada', 'Escolha a loja no topo do checklist.') : ck('ok', esc(loja))}
      ${a.pending.length ? ck('warn', `${a.pending.reduce((x, y) => x + y.n, 0)} itens sem resposta`, a.pending.map(p => `<a href="#" data-go="${p.si}" style="color:var(--brand)">${esc(p.title)} (${p.n})</a>`).join(' · ')) : ck('ok', 'Todos os itens avaliados')}
      ${a.noEv.length ? ck(P.settings.requireEvidence ? 'bad' : 'warn', `${a.noEv.length} crítico(s) sem foto ou observação`, P.settings.requireEvidence ? 'Obrigatório nas configurações.' : 'Recomendado anexar evidência.') : ck('ok', 'Críticos com evidência')}
      ${a.noAct.length ? ck('warn', `${a.noAct.length} item(ns) sem ação corretiva`, '', '<button type="button" class="pro-mini" data-auto>Criar ações</button>') : ck('ok', 'Ações corretivas em dia')}</div>
      <div class="pro-field"><label for="rvN">Parecer geral</label><textarea id="rvN" class="pro-in" placeholder="Resumo da visita, pontos de atenção, combinados com a loja…">${esc(P.meta.notes)}</textarea></div>
      <div class="pro-field"><span class="pro-lbl">Localização</span><div style="display:flex;gap:8px;align-items:center"><span style="flex:1;font-size:12px;color:var(--text-secondary)" id="rvG">${esc(geoTxt())}</span><button type="button" class="pro-mini" data-geo>${svg('pin', 12)} Registrar</button></div></div>
      <div class="pro-sig"><span class="pro-lbl">Técnico (assinatura)</span><input id="sgI" class="pro-in" placeholder="Nome completo do técnico" value="${esc(P.meta.sig.inspetor.nome || ($('#fResp') || {}).value || '')}"><canvas id="cvI" role="img" aria-label="Prévia da assinatura do técnico"></canvas><span class="pro-hint">A assinatura é gerada automaticamente a partir do nome.</span></div>
      <div class="pro-sig"><span class="pro-lbl">Gerente da loja (assinatura)</span><div class="pro-row2"><input id="sgLn" class="pro-in" placeholder="Nome do gerente" value="${esc(P.meta.sig.loja.nome)}"><input id="sgLc" class="pro-in" placeholder="Cargo (ex.: Gerente)" value="${esc(P.meta.sig.loja.cargo)}"></div><canvas id="cvL" role="img" aria-label="Prévia da assinatura do gerente da loja"></canvas><span class="pro-hint">A assinatura é gerada automaticamente a partir do nome.</span></div>`;
    const sv = $('[data-save]', s.el); sv.disabled = !!block;
    const sg = P.meta.sig;
    const padI = sigText($('#cvI', s.el), (png, ar) => { sg.inspetor.png = png; sg.inspetor.ar = ar; persistDraft(); });
    const padL = sigText($('#cvL', s.el), (png, ar) => { sg.loja.png = png; sg.loja.ar = ar; persistDraft(); });
    if (!sg.inspetor.nome) sg.inspetor.nome = $('#sgI', s.el).value;
    padI.set($('#sgI', s.el).value); padL.set($('#sgLn', s.el).value);
    $('#rvN', s.el).oninput = e => { P.meta.notes = e.target.value; persistDraft(); };
    $('#sgI', s.el).oninput = e => { sg.inspetor.nome = e.target.value; padI.set(e.target.value); };
    $('#sgLn', s.el).oninput = e => { sg.loja.nome = e.target.value; padL.set(e.target.value); };
    $('#sgLc', s.el).oninput = e => { sg.loja.cargo = e.target.value; persistDraft(); };
    $$('[data-go]', s.el).forEach(l => l.onclick = e => { e.preventDefault(); s.close(); goToTab(+l.dataset.go); });
    const au = $('[data-auto]', s.el); if (au) au.onclick = () => { const n = autoActions(); toast(`${n} ação(ões) criada(s).`, 'success'); view(); };
    $('[data-geo]', s.el).onclick = async () => {
      $('#rvG', s.el).textContent = 'Obtendo…';
      try { P.meta.geo = await new Promise((ok, no) => { if (!navigator.geolocation) return no(); navigator.geolocation.getCurrentPosition(p => ok({ lat:+p.coords.latitude.toFixed(6), lng:+p.coords.longitude.toFixed(6), acc:Math.round(p.coords.accuracy), at:new Date().toISOString() }), no, { enableHighAccuracy:true, timeout:12000 }); }); persistDraft(); }
      catch(e){ toast('Não foi possível obter a localização.', 'error'); }
      $('#rvG', s.el).textContent = geoTxt();
    };
  }
  view();
  $('[data-pdf]', s.el).onclick = () => { try { const b = dataUriToBlob(buildPdfReport()); const u = URL.createObjectURL(b); window.open(u, '_blank') || downloadBlob(b, 'previa-checklist.pdf'); setTimeout(() => URL.revokeObjectURL(u), 60000); } catch(e){ console.error(e); toast('Falha ao gerar a prévia.', 'error'); } };
  $('[data-save]', s.el).onclick = async function(){
    this.disabled = true; this.textContent = 'Salvando…';
    P.meta.notes = ($('#rvN', s.el) || {}).value || P.meta.notes; persistDraft();
    try { await ORIG_SAVE(); await archiveVisit(); } catch(e){ console.error(e); }
    s.close(); done();
  };
  function done(){
    const d = sheet({ title:'Vistoria salva', html:`<p style="margin:0;font-size:14px;color:var(--text-secondary);line-height:1.5">Registrada no histórico deste aparelho e enviada à planilha (ou colocada na fila se estiver offline).</p>`,
      foot:`<button type="button" class="pro-btn" data-share>${svg('share', 14)} Compartilhar PDF</button><button type="button" class="pro-btn primary" data-new>Nova vistoria</button>` });
    $('[data-share]', d.el).onclick = sharePdf; $('[data-new]', d.el).onclick = () => { d.close(); newVisit(true); };
  }
}
async function sharePdf(){
  try {
    const blob = dataUriToBlob(buildPdfReport()), file = new File([blob], `${getReportFilename('checklist')}.pdf`, { type:'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files:[file] })) await navigator.share({ files:[file], title:'Checklist TI', text:`Checklist TI — ${curLoja()}` });
    else { downloadBlob(blob, file.name); toast('Compartilhar não é suportado aqui; PDF baixado.', 'info'); }
  } catch(e){ if (e && e.name !== 'AbortError') { console.error(e); toast('Falha ao gerar o PDF.', 'error'); } }
}
async function newVisit(skipConfirm){
  if (!skipConfirm && !await confirmSheet({ title:'Nova vistoria', text:'Limpar o checklist atual e começar do zero? Vistorias já salvas continuam no histórico.', ok:'Começar', danger:true })) return;
  rebuildApp();
  State.printers = {}; try { localStorage.removeItem(PRINTERS_DRAFT_KEY); } catch(e){}
  localStorage.removeItem('checklist-draft');
  const l = $('#fLoja'); if (l) l.value = ''; const dt = $('#fData'); if (dt) dt.value = today();
  if (typeof renderPrintersForSelectedStore === 'function') try { renderPrintersForSelectedStore(); } catch(e){}
  toast('Nova vistoria iniciada.', 'success');
}

/* ---------- menu ---------- */
function openMenu(){
  const n = openActions(curLoja()).length, late = openActions(curLoja()).filter(isOverdue).length;
  const tile = (id, ic, t, d, bd) => `<button type="button" class="pro-tile" data-m="${id}">${bd ? `<span class="bd">${bd}</span>` : ''}${svg(ic)}<b>${t}</b><span>${d}</span></button>`;
  const s = sheet({ title:'Ferramentas', html:`<div class="pro-grid">
    ${tile('review', 'clip', 'Finalizar vistoria', 'Revisão, parecer e assinaturas')}
    ${tile('plan', 'flag', 'Plano de ação', n ? `${n} aberta(s)${late ? ', ' + late + ' atrasada(s)' : ''}` : 'Ações corretivas com prazo', late || '')}
    ${tile('hist', 'history', 'Histórico', 'Vistorias anteriores e evolução')}
    ${tile('cmp', 'bars', 'Comparar', 'Com a última visita da loja')}
    ${tile('share', 'share', 'Compartilhar PDF', 'WhatsApp, Teams, e-mail')}
    ${tile('new', 'refresh', 'Nova vistoria', 'Limpar e recomeçar')}
    ${tile('undo', 'undo', 'Desfazer', 'Última alteração de status')}
    ${tile('redo', 'redo', 'Refazer', 'Reaplicar alteração')}</div>` });
  $$('[data-m]', s.el).forEach(b => b.onclick = () => { s.close(); const k = b.dataset.m;
    setTimeout(() => ({ review:openReview, plan:openPlan, hist:openHistory, cmp:() => openCompare(), share:sharePdf, new:() => newVisit(), undo:() => checklistHistory.undo(), redo:() => checklistHistory.redo() })[k](), 120); });
}
function refreshBadges(){
  const late = openActions(curLoja()).filter(isOverdue).length, b = $('#proMoreDot');
  if (b) { b.textContent = late; b.classList.toggle('show', late > 0); }
}

/* ---------- PDF ---------- */
const PDFC = { ok:[22,163,74], warn:[217,119,6], crit:[220,38,38] };
window.ProPdf = {
  afterItem(doc, key, y, ctx){
    const imgs = (P.photos[key] || []).map(id => P.cache[id]).filter(Boolean); if (!imgs.length) return y;
    const bw = 84, bh = 63, gap = 8; let x = 112;
    if (y + bh > ctx.pageHeight - 60) y = ctx.newPage();
    imgs.forEach(im => {
      if (x + bw > ctx.pageWidth - 40) { x = 112; y += bh + gap; if (y + bh > ctx.pageHeight - 60) y = ctx.newPage(); }
      const r = Math.min(bw / im.w, bh / im.h), w = im.w * r, h = im.h * r;
      try { doc.addImage(im.mid, 'JPEG', x, y, w, h, undefined, 'FAST'); } catch(e){}
      x += bw + gap;
    });
    return y + bh + 8;
  },
  appendix(doc, report, y, ctx){
    const W = ctx.pageWidth;
    const need = h => { if (y + h > ctx.pageHeight - 60) y = ctx.newPage(); };
    const head = t => { need(40); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(30, 41, 69); doc.text(t, 40, y); y += 14; doc.setDrawColor(220, 224, 232); doc.line(40, y, W - 40, y); y += 12; };
    const para = (t, sz, col) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(sz || 9); doc.setTextColor(...(col || [15, 23, 42])); doc.splitTextToSize(t, W - 80).forEach(l => { need(12); doc.text(l, 40, y); y += 11; }); };
    const loja = report.summary.loja, acts = P.actions.filter(a => a.loja === loja && (a.status !== 'concluida' || a.visita === curData()));
    if (acts.length) {
      head('Plano de Ação Corretiva');
      acts.forEach(a => {
        need(40); const col = a.prio === 'alta' ? PDFC.crit : a.prio === 'media' ? PDFC.warn : PDFC.ok;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...col); doc.text(a.status === 'concluida' ? 'CONCLUÍDA' : PRIO_LABEL[a.prio].toUpperCase(), 40, y);
        doc.setTextColor(15, 23, 42); doc.setFontSize(9); const t = doc.splitTextToSize(a.titulo, W - 160); doc.text(t, 112, y); y += t.length * 11;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80, 89, 110);
        const m = `${a.secao} · ${a.item} | Resp.: ${a.resp || 'não definido'} | Prazo: ${fmtD(a.prazo)} | ${AST_LABEL[a.status]}`;
        doc.splitTextToSize(m, W - 160).forEach(l => { need(10); doc.text(l, 112, y); y += 10; });
        if (a.desc) doc.splitTextToSize(a.desc, W - 160).forEach(l => { need(10); doc.text(l, 112, y); y += 10; });
        y += 5;
      });
      y += 6;
    }
    const prev = prevVisit(loja, P.meta.visitId), cur = snapshot();
    if (prev && cur.done) { const c = compare(cur, prev); head('Comparativo com a visita anterior');
      para(`Nota atual ${cur.score} contra ${prev.score} em ${fmtD(prev.data)} (${c.delta > 0 ? '+' : ''}${c.delta} pontos). Pioraram: ${c.worse.length} · Melhoraram: ${c.better.length} · Críticos persistentes: ${c.persist.length} · Novos problemas: ${c.fresh.length}.`);
      c.worse.slice(0, 8).forEach(e => para(`- ${e.item} (${e.secao}): ${STATUS_LABEL[e.de]} para ${STATUS_LABEL[e.para]}`, 8, [80, 89, 110])); y += 8; }
    if (P.meta.notes.trim()) { head('Parecer Geral'); para(P.meta.notes.trim(), 9); y += 8; }
    const g = P.meta.geo, dur = P.meta.startedAt ? Math.round((Date.now() - P.meta.startedAt) / 6e4) : null;
    if (g || dur != null) { head('Registro da Visita'); if (g) para(`Localização: ${g.lat}, ${g.lng} (precisão ${g.acc} m) · https://maps.google.com/?q=${g.lat},${g.lng}`, 8); if (dur != null) para(`Duração aproximada: ${dur} min`, 8); y += 8; }
    const sg = P.meta.sig;
    if (sg.inspetor.png || sg.loja.png || sg.inspetor.nome || sg.loja.nome) {
      need(120); head('Assinaturas');
      [[sg.inspetor, 'Técnico', 40], [sg.loja, 'Gerente da loja', W / 2 + 10]].forEach(([s, lab, x]) => {
        if (s.png) { const w = 190, h = Math.min(60, w / (s.ar || 3)); try { doc.addImage(s.png, 'PNG', x, y, w, h); } catch(e){} }
        doc.setDrawColor(120, 128, 145); doc.line(x, y + 64, x + 210, y + 64);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(15, 23, 42); doc.text(s.nome || '—', x, y + 76);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80, 89, 110); doc.text(lab + (s.cargo ? ' · ' + s.cargo : ''), x, y + 87);
      });
      y += 100;
    }
    return y;
  }
};

/* ---------- rascunho, hooks e inicialização ---------- */
function restoreDraft(){
  const d = LS.get(KEY_DRAFT, null); if (!d) return;
  P.photos = d.photos || {}; P.meta = Object.assign(blankMeta(), d.meta || {});
  P.meta.sig = Object.assign(blankMeta().sig, P.meta.sig || {});
  Promise.all(Object.values(P.photos).flat().map(loadPhoto)).then(refreshAllItems);
  refreshAllItems();
}
function resetDraft(){ P.photos = {}; P.meta = blankMeta(); LS.del(KEY_DRAFT); }
window.renderAll = function(){
  Object.keys(State.items).forEach(key => {
    const s = State.items[key], card = document.getElementById('card-' + key); if (!card) return;
    card.className = 'item-card'; if (s.status) card.classList.add('has-' + s.status);
    $$('.status-btn', card).forEach(b => b.classList.toggle('sel', b.dataset.s === s.status));
    const det = document.getElementById('det-' + key); if (det) det.classList.toggle('open', !!s.status);
    const q = document.getElementById('qty-' + key), o = document.getElementById('obs-' + key); if (q) q.value = s.qty || ''; if (o) o.value = s.obs || '';
    const ts = document.getElementById('ts-' + key); if (ts) ts.textContent = s.ts ? new Date(s.ts).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }) : '';
    renderItem(key);
  });
  updateProgress(); updateTabBadges(); if (State.ui.currentTab === -1) updateDashboard();
};
function onStoreChange(){
  refreshAllItems(); refreshBadges();
  const loja = curLoja(); if (!loja) return;
  const n = openActions(loja), late = n.filter(isOverdue).length, pv = prevVisit(loja, P.meta.visitId);
  if (n.length) snack(`${loja.split(' - ')[0]}: ${n.length} ação(ões) em aberto${late ? ` (${late} atrasada${late > 1 ? 's' : ''})` : ''}.${pv ? ` Última nota: ${pv.score}.` : ''}`, 'Ver', openPlan, 9000);
  else if (pv) snack(`Última visita em ${fmtD(pv.data)}: nota ${pv.score} (${pv.grade}).`, 'Histórico', openHistory, 7000);
}
async function init(){
  if (!localStorage.getItem('checklist-draft')) LS.del(KEY_DRAFT);
  /* botão "Ferramentas" na barra inferior */
  const bar = $('.bottom-bar');
  if (bar && !$('#proMoreBtn')) {
    const b = document.createElement('button'); b.type = 'button'; b.id = 'proMoreBtn'; b.className = 'icon-btn'; b.title = 'Ferramentas'; b.setAttribute('aria-label', 'Ferramentas');
    b.innerHTML = `${svg('more', 16)}<span class="btn-label">Ferramentas</span><span class="pro-more-dot" id="proMoreDot"></span>`; b.onclick = openMenu; bar.insertBefore(b, bar.firstChild);
  }
  /* configurações */
  const body = $('#settingsModal .modal-body');
  if (body && !$('#proStamp')) {
    const box = document.createElement('div');
    box.innerHTML = `<div class="modal-section-label">Vistoria profissional</div>
      <div class="toggle-row"><div class="toggle-info"><div class="toggle-label">Carimbar data/hora nas fotos</div><div class="toggle-desc">Evidência com loja e horário</div></div><label class="toggle-switch"><input type="checkbox" id="proStamp"><span class="toggle-track"></span></label></div>
      <div class="toggle-row"><div class="toggle-info"><div class="toggle-label">Evidência obrigatória em críticos</div><div class="toggle-desc">Exige foto ou observação para salvar</div></div><label class="toggle-switch"><input type="checkbox" id="proEvid"><span class="toggle-track"></span></label></div>`;
    const sb = body.querySelector(':scope > .cfg-save-btn'); sb.parentNode.insertBefore(box, sb);
    const a = $('#proStamp'), e = $('#proEvid'); a.checked = P.settings.stamp; e.checked = P.settings.requireEvidence;
    a.onchange = () => { P.settings.stamp = a.checked; saveSettings(); }; e.onchange = () => { P.settings.requireEvidence = e.checked; saveSettings(); };
  }
  /* entrada de arquivos e delegação de cliques */
  const mk = cap => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.multiple = true; if (cap) i.setAttribute('capture', 'environment'); i.hidden = true; document.body.appendChild(i); i.onchange = () => { const k = i._key; addPhotos(k, i.files); i.value = ''; }; return i; };
  const inCam = mk(true), inGal = mk(false);
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-pro]'); if (!t) return; const k = t.dataset.key, a = t.dataset.pro;
    if (a === 'cam') { inCam._key = k; inCam.click(); } else if (a === 'gal') { inGal._key = k; inGal.click(); }
    else if (a === 'photo') openPhoto(k, t.dataset.id); else if (a === 'mic') toggleDictation(k); else if (a === 'scan') scanCode(k);
    else if (a === 'act') editAction(k, true); else if (a === 'actedit') editAction(t.dataset.id); else if (a === 'actdone') setActionStatus(t.dataset.id, 'concluida');
    const bk = e.target.closest('.pro-bulk'); if (bk) bulkOk(+bk.dataset.si);
  });
  document.addEventListener('click', e => { const bk = e.target.closest('.pro-bulk'); if (bk) { e.stopPropagation(); bulkOk(+bk.dataset.si); } }, true);
  /* ganchos nas funções existentes */
  const hs = window.handleStatusClick;
  window.handleStatusClick = function(key, status){
    hs.apply(this, arguments);
    if (!P.meta.startedAt) { P.meta.startedAt = Date.now(); persistDraft(); }
    renderItem(key); checklistHistory.checkpoint();
    const act = findAction(key), st = State.items[key];
    if (st && st.status === 'ok' && act) snack(`Ação "${act.titulo}" ainda está aberta.`, 'Concluir', () => setActionStatus(act.id, 'concluida'));
  };
  const rs = window.restoreSession; window.restoreSession = function(){ const r = rs.apply(this, arguments); restoreDraft(); return r; };
  const dr = window.dismissResume; window.dismissResume = function(){ dr.apply(this, arguments); resetDraft(); };
  const rb = window.rebuildApp; window.rebuildApp = function(){ rb.apply(this, arguments); resetDraft(); decorateAll(); checklistHistory.checkpoint(); };
  const cm = window.closeModal; window.closeModal = function(id){ const s = sheets.get(id); return s ? s.close() : cm.apply(this, arguments); };
  ORIG_SAVE = window.doSave; window.doSave = function(){ openReview(); };
  const ld = $('#fLoja'); if (ld) ld.addEventListener('change', onStoreChange);
  $('#slidesTrack').addEventListener('input', deb(() => checklistHistory.checkpoint(), 800));
  decorateAll(); checklistHistory.checkpoint(); refreshBadges();
  try { P.visits = await DB.all('visits'); } catch(e){}
  /* limpeza de fotos órfãs */
  try {
    const used = new Set(Object.values(LS.get(KEY_DRAFT, { photos:{} }).photos || {}).flat());
    P.visits.forEach(v => Object.values(v.items || {}).forEach(i => (i.p || []).forEach(p => used.add(p))));
    (await DB.keys('photos')).forEach(k => { if (!used.has(k)) DB.del('photos', k).catch(() => {}); });
  } catch(e){}
  /* ações vencidas: aviso ao abrir */
  const late = P.actions.filter(isOverdue).length; if (late) setTimeout(() => snack(`${late} ação(ões) corretiva(s) atrasada(s).`, 'Ver', openPlan, 8000), 2500);
}

window.Pro = {
  exportExtras(){ const g = P.meta.geo, s = P.meta.sig; return { notas:P.meta.notes, geo:g, inspetor:s.inspetor.nome, responsavelLoja:s.loja.nome, fotos:Object.values(P.photos).flat().length, acoes:P.actions.filter(a => a.loja === curLoja() && a.status !== 'concluida').map(a => ({ item:a.item, acao:a.titulo, responsavel:a.resp, prazo:a.prazo, prioridade:a.prio, status:a.status })) }; },
  openMenu, openPlan, openHistory, openReview, _P:P
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

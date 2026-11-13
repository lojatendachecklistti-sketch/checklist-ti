/* Paleta de comandos (Ctrl/Cmd + K): ir para uma seção ou item, filtrar e executar ações.
   Tudo é montado a partir do estado atual: seções, itens e ações disponíveis agora. */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '');
  const MOD = isMac ? '⌘' : 'Ctrl+';
  const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const ic = inner => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  const I = {
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
    next: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    grid: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
    filter: '<path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/>',
    printer: '<path d="M6 9V2h12v7"/><rect x="2" y="9" width="20" height="9" rx="2"/><path d="M6 14h12v8H6z"/>',
    checks: '<path d="m3 12 5 5L20 5"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
    rows: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    keyboard: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3"/><path d="M1 14h6M9 8h6M17 16h6"/>',
    archive: '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>'
  };

  /* rótulos de tecla no padrão do sistema */
  const kbdEl = $('#paletteKbd'); if (kbdEl) kbdEl.textContent = isMac ? '⌘ K' : 'Ctrl K';
  const openBtn = $('#paletteBtn'); if (openBtn) openBtn.title = `Buscar e executar comandos (${isMac ? '⌘K' : 'Ctrl+K'})`;
  $$('kbd.mod').forEach(k => { k.textContent = isMac ? '⌘' : 'Ctrl'; });

  /* ---------- estrutura ---------- */
  const root = document.createElement('div');
  root.className = 'cmdk';
  root.id = 'cmdk';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'Paleta de comandos');
  root.innerHTML = `
    <div class="cmdk-box">
      <div class="cmdk-head">
        ${ic(I.search)}
        <input class="cmdk-input" id="cmdkInput" type="text" role="combobox" aria-expanded="true" aria-controls="cmdkList" aria-autocomplete="list" aria-activedescendant="" aria-label="Buscar item, seção ou ação" placeholder="Buscar item, seção ou ação…" autocomplete="off" autocapitalize="off" spellcheck="false">
        <kbd class="kbd cmdk-esc" aria-hidden="true">Esc</kbd>
      </div>
      <div class="cmdk-list" id="cmdkList" role="listbox" aria-label="Resultados"></div>
      <div class="cmdk-foot" aria-hidden="true">
        <span><kbd class="kbd-hint">↑</kbd><kbd class="kbd-hint">↓</kbd> navegar</span>
        <span><kbd class="kbd-hint">Enter</kbd> abrir</span>
        <span><kbd class="kbd-hint">Esc</kbd> fechar</span>
      </div>
    </div>`;
  document.body.appendChild(root);
  const input = $('#cmdkInput'), list = $('#cmdkList');

  let results = [], sel = 0, isOpen = false, prevFocus = null;

  /* ---------- fontes de resultado ---------- */
  function commands() {
    const out = [];
    const tab = State.ui.currentTab;
    const pending = State.totalItems() - State.doneItems();
    const pro = window.Pro;
    const dark = document.documentElement.getAttribute('data-theme') === 'dark' ||
      (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
    const add = (label, icon, run, o) => out.push(Object.assign({ type: 'cmd', label, icon, run }, o || {}));
    const filter = (f, label) => add(label, 'filter', () => {
      if (State.ui.currentTab === -1) goToTab(State.ui.lastTab >= 0 ? State.ui.lastTab : 0);
      const chip = $(`.filter-chip[data-filter="${f}"]`); if (chip) setFilter(f, chip);
    }, { alias: 'filtrar mostrar' });

    if (pending > 0) add('Ir para o próximo item pendente', 'next', () => Flow.next(), { hint: 'N', alias: 'continuar proximo falta' });
    add('Abrir visão geral', 'grid', () => goToTab(-1), { hint: 'D', alias: 'dashboard painel nota' });
    add('Revisar e salvar vistoria', 'save', () => doSave(), { hint: MOD + 'S', alias: 'sincronizar enviar planilha' });
    add('Exportar relatório (PDF)', 'download', () => showExport(), { alias: 'pdf exportar baixar' });
    if (State.user.isAdmin) add('Enviar relatório por e-mail', 'mail', () => openEmailModal(), { alias: 'email enviar' });
    if (tab >= 0 && State.sectionStats(tab).pending > 0 && $(`#slide-${tab} .pro-bulk`)) {
      add('Marcar restantes da seção como OK', 'checks', () => $(`#slide-${tab} .pro-bulk`).click(), { alias: 'todos ok lote' });
    }
    if (pro) {
      add('Ferramentas: fotos, ações e histórico', 'more', () => pro.openMenu(), { alias: 'fotos assinatura' });
      add('Plano de ação', 'flag', () => pro.openPlan(), { alias: 'acoes corretivas' });
      add('Histórico de vistorias', 'history', () => pro.openHistory(), { alias: 'visitas anteriores comparar' });
    }
    add('Abrir vistoria de impressoras', 'printer', () => openPrintersScreen());
    filter('pending', 'Mostrar apenas itens pendentes');
    filter('crit', 'Mostrar apenas itens críticos');
    filter('warn', 'Mostrar apenas itens em atenção');
    filter('ok', 'Mostrar apenas itens OK');
    if (State.ui.activeFilter !== 'all') filter('all', 'Mostrar todos os itens');
    if (window.checklistHistory) {
      add('Desfazer', 'undo', () => checklistHistory.undo(), { hint: MOD + 'Z' });
      add('Refazer', 'redo', () => checklistHistory.redo(), { hint: MOD + 'Y' });
    }
    add(document.body.classList.contains('compact') ? 'Desativar modo compacto' : 'Ativar modo compacto', 'rows',
      () => { const on = !document.body.classList.contains('compact'); setDensity(on); const t = $('#densityToggle'); if (t) t.checked = on; }, { alias: 'densidade' });
    add(dark ? 'Usar tema claro' : 'Usar tema escuro', 'moon', () => { setTheme(dark ? 'light' : 'dark'); const s = $('#themeSelect'); if (s) s.value = dark ? 'light' : 'dark'; }, { alias: 'aparencia' });
    add('Atalhos de teclado', 'keyboard', () => openModal('shortcutsModal'), { hint: '?' });
    add('Configurações', 'sliders', () => openSettings());
    if (State.user.isAdmin) add('Baixar backup da vistoria (.json)', 'archive', () => downloadChecklistBackup());
    if (State.user && State.user.isAdmin) add('Administrar seções do checklist', 'shield', () => openAdminPanel(), { alias: 'admin' });
    add('Sair', 'logout', () => doLogout());
    return out;
  }

  function sections() {
    return SECTIONS.map((sec, si) => {
      const s = State.sectionStats(si);
      return { type: 'sec', label: sec.title, prefix: 'Ir para ', meta: `${s.done}/${s.total}`, icon: 'list', run: () => goToTab(si) };
    });
  }

  function items() {
    const out = [];
    SECTIONS.forEach((sec, si) => sec.items.forEach((label, ii) => {
      const key = `${si}-${ii}`;
      out.push({ type: 'item', label, meta: sec.title, extra: sec.title, status: State.items[key] && State.items[key].status, run: () => Flow.goTo(key) });
    }));
    return out;
  }

  /* ---------- busca ---------- */
  function score(text, tokens) {
    const t = norm(text);
    let total = 0;
    for (const tok of tokens) {
      const i = t.indexOf(tok);
      if (i < 0) return -1;
      total += i === 0 ? 3 : (t[i - 1] === ' ' ? 2 : 1);
    }
    return total;
  }
  function pick(arr, tokens, cap) {
    const hit = [];
    arr.forEach((it, idx) => {
      const sc = tokens.length ? score(`${it.label} ${it.alias || ''} ${it.extra || ''}`, tokens) : 0;
      if (sc >= 0) hit.push([sc, idx, it]);
    });
    if (tokens.length) hit.sort((a, b) => b[0] - a[0] || a[1] - b[1]);
    return hit.slice(0, cap).map(h => h[2]);
  }
  function highlight(text, tokens) {
    const safe = escapeHtml(text);
    if (!tokens.length) return safe;
    const n = norm(text);
    if (n.length !== text.length) return safe;
    const ranges = [];
    tokens.forEach(t => { const i = n.indexOf(t); if (i >= 0) ranges.push([i, i + t.length]); });
    if (!ranges.length) return safe;
    ranges.sort((a, b) => a[0] - b[0]);
    const merged = [ranges[0].slice()];
    ranges.slice(1).forEach(r => { const last = merged[merged.length - 1]; if (r[0] <= last[1]) last[1] = Math.max(last[1], r[1]); else merged.push(r.slice()); });
    let out = '', pos = 0;
    merged.forEach(([a, b]) => { out += escapeHtml(text.slice(pos, a)) + '<mark>' + escapeHtml(text.slice(a, b)) + '</mark>'; pos = b; });
    return out + escapeHtml(text.slice(pos));
  }

  function rowHtml(r, tokens, n) {
    let lead, label = highlight(r.label, tokens), meta = '';
    if (r.type === 'item') {
      lead = `<i class="ci-dot st-${r.status || 'none'}"></i>`;
      meta = escapeHtml(r.meta);
    } else {
      lead = ic(I[r.icon] || I.search);
      if (r.type === 'sec') { label = escapeHtml(r.prefix) + label; meta = escapeHtml(r.meta); }
      else if (r.hint) meta = `<kbd class="kbd-hint">${escapeHtml(r.hint)}</kbd>`;
    }
    return `<div class="cmdk-item" role="option" id="ck-${n}" data-i="${n}" aria-selected="false"><span class="ci-ic">${lead}</span><span class="ci-label">${label}</span>${meta ? `<span class="ci-meta">${meta}</span>` : ''}</div>`;
  }

  function render(q) {
    const tokens = norm(q).split(/\s+/).filter(Boolean);
    const q1 = tokens.length > 0;
    const groups = [
      { title: 'Ações', rows: pick(commands(), tokens, q1 ? 5 : 8) },
      { title: 'Seções', rows: pick(sections(), tokens, q1 ? 4 : 12) },
      { title: 'Itens do checklist', rows: q1 ? pick(items(), tokens, 12) : [] }
    ];
    results = [];
    let html = '', n = 0;
    groups.forEach(g => {
      if (!g.rows.length) return;
      html += `<div class="cmdk-group" role="presentation">${g.title}</div>`;
      g.rows.forEach(r => { results.push(r); html += rowHtml(r, tokens, n++); });
    });
    list.innerHTML = html || `<div class="cmdk-empty">Nada encontrado para “${escapeHtml(q)}”.</div>`;
    sel = 0;
    setSel(0, false);
  }

  function setSel(i, scroll) {
    sel = i;
    $$('.cmdk-item', list).forEach((el, idx) => el.setAttribute('aria-selected', idx === i ? 'true' : 'false'));
    const el = $(`#ck-${i}`, list);
    input.setAttribute('aria-activedescendant', el ? el.id : '');
    if (el && scroll !== false) el.scrollIntoView({ block: 'nearest' });
  }

  /* ---------- abrir / fechar / executar ---------- */
  function open() {
    if (isOpen) return;
    const app = $('#app');
    if (!app || !app.classList.contains('visible') || app.hasAttribute('inert')) return;
    if ($('.modal-backdrop.open, .printers-screen.open, .pro-full')) return;
    prevFocus = document.activeElement;
    isOpen = true;
    root.classList.add('open');
    app.setAttribute('inert', '');
    input.value = '';
    render('');
    input.focus();
  }

  function close(restore) {
    if (!isOpen) return;
    isOpen = false;
    root.classList.remove('open');
    const app = $('#app');
    if (app) app.removeAttribute('inert');
    if (restore !== false && prevFocus && document.contains(prevFocus) && typeof prevFocus.focus === 'function') prevFocus.focus({ preventScroll: true });
  }

  function run(i) {
    const r = results[i];
    if (!r) return;
    close(true); /* devolve o foco a quem o tinha: janelas abertas pelo comando restauram para o lugar certo */
    setTimeout(() => {
      try { r.run(); } catch (e) { console.error('[Paleta]', e); showToast('Não foi possível executar o comando.', 'error'); }
    }, 0);
  }

  input.addEventListener('input', () => render(input.value));
  input.addEventListener('keydown', e => {
    if (e.isComposing) return;
    const n = results.length;
    if (e.key === 'ArrowDown') { e.preventDefault(); if (n) setSel((sel + 1) % n); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (n) setSel((sel - 1 + n) % n); }
    else if (e.key === 'Enter') { e.preventDefault(); run(sel); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
  });
  list.addEventListener('mousemove', e => {
    const el = e.target.closest('.cmdk-item');
    if (el && +el.dataset.i !== sel) setSel(+el.dataset.i, false);
  });
  list.addEventListener('click', e => {
    const el = e.target.closest('.cmdk-item');
    if (el) run(+el.dataset.i);
  });
  root.addEventListener('mousedown', e => { if (e.target === root) close(true); });
  if (openBtn) openBtn.addEventListener('click', open);

  window.Palette = { open, close, toggle: () => (isOpen ? close(true) : open()), isOpen: () => isOpen };
})();

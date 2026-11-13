/* Renderização: dashboard, seções, itens, progresso, busca, filtros, swipe */
/* RENDER ENGINE */
const DOM = {
  slidesTrack: null,
  sectionTabs: null,
  progressFill: null,
  progressPct: null,
  progressCount: null,
  fc: {},   // contadores dos filtros (todos, pendentes, ok, atenção, crítico, n/a)

  init() {
    this.slidesTrack  = document.getElementById('slidesTrack');
    this.sectionTabs  = document.getElementById('sectionTabs');
    this.progressFill = document.getElementById('progressFill');
    this.progressPct  = document.getElementById('progressPct');
    this.progressCount= document.getElementById('progressCount');
    const g = id => document.getElementById(id);
    this.fc = { all: g('fcAll'), pending: g('fcPending'), ok: g('fcOk'), warn: g('fcWarn'), crit: g('fcCrit'), na: g('fcNa') };
  }
};

function buildUI() {
  DOM.init();
  buildDashboardSlide();
  buildChecklistSlides();
  buildTabNav();
  updateProgress();
  setupFieldListeners();
  setupSwipe();
  goToTab(0);
}

/* Reconstrói o app inteiro (dashboard, abas e cartões) a partir do array
   SECTIONS atual. Usado depois que um administrador adiciona/remove uma
   seção pela tela — o progresso da vistoria atual é reiniciado porque a
   estrutura de itens mudou. */
function rebuildApp() {
  State.items = {};
  SECTIONS.forEach((sec, si) => {
    sec.items.forEach((_, ii) => {
      State.items[`${si}-${ii}`] = { status: null, qty: '', obs: '', ts: null };
    });
  });
  DOM.slidesTrack.innerHTML = '';
  buildDashboardSlide();
  buildChecklistSlides();
  buildTabNav();
  updateProgress();
  goToTab(0);
  if (typeof upgradeQtyInputs === 'function') upgradeQtyInputs();
}

function buildChecklistSlides() {
  SECTIONS.forEach((sec, si) => {
    const slide = document.createElement('div');
    slide.className = 'slide';
    slide.id = `slide-${si}`;
    slide.setAttribute('role', 'tabpanel');

    slide.setAttribute('aria-labelledby', `tab-${si}`);

    const header = document.createElement('div');
    header.className = 'slide-section-header';
    header.innerHTML = `<span class="slide-section-title">${escapeHtml(sec.title)}</span><span class="slide-section-count" id="shcount-${si}" title="Itens avaliados">0/${sec.items.length}</span><span class="slide-section-bar" aria-hidden="true"><i id="shbar-${si}"></i></span>`;
    slide.appendChild(header);

    if (sec.id === 'impr') {
      const printersPanel = document.createElement('section');
      printersPanel.className = 'printers-store-panel';
      printersPanel.id = 'printersStorePanel';
      printersPanel.innerHTML = `
        <div class="printers-panel-title" data-printers-title>Selecione uma loja para consultar as impressoras</div>
        <div data-printers-content><div class="printers-empty">Escolha a loja no topo do checklist.</div></div>
        <button type="button" class="printers-open-btn" id="printersOpenBtn" onclick="openPrintersScreen()" disabled>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="9" rx="1"/><path d="M6 12v8h12v-8"/><path d="M6 17h4"/></svg>
          Abrir vistoria de impressoras
        </button>`;
      slide.appendChild(printersPanel);
    }

    /* Estado vazio quando um filtro de status esconde todos os itens da seção */
    const empty = document.createElement('div');
    empty.className = 'slide-empty';
    empty.id = `empty-${si}`;
    empty.innerHTML = `<span class="slide-empty-text">Nenhum item corresponde ao filtro nesta seção.</span><button type="button" class="btn slide-empty-btn" data-clear-filter>Mostrar todos</button>`;
    slide.appendChild(empty);

    sec.items.forEach((item, ii) => {
      slide.appendChild(buildItemCard(si, ii, item));
    });

    /* Rodapé: resumo da seção e caminho para a próxima etapa (preenchido em updateTabBadges) */
    const foot = document.createElement('div');
    foot.className = 'section-foot';
    foot.id = `foot-${si}`;
    slide.appendChild(foot);

    DOM.slidesTrack.appendChild(slide);
  });
}

function buildItemCard(si, ii, label) {
  const key = `${si}-${ii}`;
  const card = document.createElement('div');
  card.className = 'item-card';
  card.id = `card-${key}`;
  card.dataset.label = label.toLowerCase();
  card.dataset.si = si;
  card.dataset.ii = ii;

  card.innerHTML = `
    <div class="item-main">
      <div class="item-status-stripe"></div>
      <span class="item-label" id="lbl-${key}">${label}</span>
      <div class="item-actions" role="group" aria-labelledby="lbl-${key}">
        ${statusButtonsHtml('status-btn', s => `data-key="${key}" data-s="${s}"`, null)}
      </div>
    </div>
    <div class="item-details" id="det-${key}">
      <div class="item-details-inner">
        <div class="detail-row detail-qty">
          <label class="detail-label" for="qty-${key}"><span aria-hidden="true">Qtd.</span><span class="sr-only">Quantidade</span></label>
          <input type="number" class="detail-input qty-input" id="qty-${key}" placeholder="0" min="0" inputmode="numeric" value="">
        </div>
        <div class="detail-row detail-obs">
          <label class="detail-label sr-only" for="obs-${key}">Observação</label>
          <textarea class="detail-input obs-input" id="obs-${key}" rows="1" placeholder="Observação, nº de série, modelo…"></textarea>
        </div>
        <div class="item-timestamp" id="ts-${key}"></div>
      </div>
    </div>`;

  const STATUS_KEY = { ok: '1', warn: '2', crit: '3', na: '4' };
  card.querySelectorAll('.status-btn').forEach(btn => {
    const k = STATUS_KEY[btn.dataset.s];
    btn.setAttribute('aria-keyshortcuts', k);
    btn.title = `${STATUS_TITLE[btn.dataset.s]} (tecla ${k})`;
    btn.insertAdjacentHTML('beforeend', `<kbd class="st-key" aria-hidden="true">${k}</kbd>`);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleStatusClick(btn.dataset.key, btn.dataset.s);
    });
  });

  const qtyIn = card.querySelector(`#qty-${key}`);
  const obsIn = card.querySelector(`#obs-${key}`);
  if (qtyIn) qtyIn.addEventListener('input', debounce(e => { State.items[key].qty = e.target.value; autoSave(); }, 300));
  if (obsIn) obsIn.addEventListener('input', debounce(e => { State.items[key].obs = e.target.value; autoSave(); }, 300));

  return card;
}

/* Siglas de 2 letras (ou 3, se houver colisão) para o menu recolhido — sempre únicas. */
function sectionAbbreviations(titles) {
  const STOP = new Set(['e', 'de', 'da', 'do', 'das', 'dos', 'a', 'o', 'em', 'para']);
  const clean = t => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9 ]/g, ' ').trim();
  const used = new Set();
  return titles.map(t => {
    const words = clean(t).split(/\s+/).filter(w => w && !STOP.has(w.toLowerCase()));
    const w0 = words[0] || '';
    const tries = [];
    if (words.length > 1) tries.push(words[0][0] + words[1][0]);
    tries.push(w0.slice(0, 2), w0.slice(0, 3), clean(t).replace(/\s+/g, '').slice(0, 3));
    for (const c of tries.map(x => x.toUpperCase()).filter(Boolean)) {
      if (!used.has(c)) { used.add(c); return c; }
    }
    let n = 2, c;
    do { c = (tries[0] || '·').toUpperCase() + n++; } while (used.has(c));
    used.add(c);
    return c;
  });
}

function buildTabNav() {
  DOM.sectionTabs.innerHTML = '';

  const abbr = sectionAbbreviations(SECTIONS.map(sec => sec.title));

  // Visão geral (dashboard)
  const dashTab = document.createElement('button');
  dashTab.type = 'button';
  dashTab.className = 'tab-btn';
  dashTab.id = 'tab-dashboard';
  dashTab.setAttribute('role', 'tab');
  dashTab.setAttribute('aria-selected', 'false');
  dashTab.setAttribute('aria-controls', 'slide-dashboard');
  dashTab.title = 'Visão geral';
  dashTab.innerHTML = `<span class="tab-ic"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg></span><span class="tab-label">Visão geral</span>`;
  dashTab.addEventListener('click', () => goToTab(-1));
  DOM.sectionTabs.appendChild(dashTab);

  SECTIONS.forEach((sec, si) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tab-btn';
    btn.id = `tab-${si}`;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', 'false');
    btn.setAttribute('aria-controls', `slide-${si}`);
    btn.title = sec.title;
    btn.innerHTML = `<span class="tab-ic" aria-hidden="true">${escapeHtml(abbr[si])}</span><span class="tab-label">${escapeHtml(sec.title)}</span><span class="tab-badge" id="tbadge-${si}">0/${sec.items.length}</span><span class="tab-prog" aria-hidden="true"><i id="tprog-${si}"></i></span>`;
    btn.addEventListener('click', () => goToTab(si));
    DOM.sectionTabs.appendChild(btn);
  });
}

function goToTab(si) {
  // Se estava em modo de busca global (lista vertical), navegar para
  // uma aba específica volta ao carrossel normal daquela seção.
  if (State.ui.searchQuery) {
    clearSearch();
  }

  State.ui.currentTab = si;
  if (si >= 0) State.ui.lastTab = si;
  document.body.dataset.view = si === -1 ? 'dashboard' : 'checklist';
  const trackOffset = si === -1 ? 0 : (si + 1);
  DOM.slidesTrack.style.transform = `translateX(-${trackOffset * 100}%)`;

  document.querySelectorAll('.tab-btn').forEach((b, i) => {
    const isActive = (si === -1 && i === 0) || (si >= 0 && i === si + 1);
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  // Scroll active tab into view
  const activeTab = si === -1
    ? document.getElementById('tab-dashboard')
    : document.getElementById(`tab-${si}`);
  if (activeTab) activeTab.scrollIntoView({ behavior: document.documentElement.classList.contains('fx') ? 'smooth' : 'auto', block: 'nearest', inline: 'center' });

  updateTabBadges();
  if (si === -1) updateDashboard();
  updatePageHead(si);
  const dt = document.getElementById('dashboardToggle');
  if (dt) dt.classList.toggle('active', si === -1);
  document.dispatchEvent(new CustomEvent('ti:tab', { detail: { si } }));
}

/* Título da página e trilha de navegação (breadcrumbs) no topo */
function updatePageHead(si) {
  const title = document.getElementById('pageTitle');
  const crumbs = document.getElementById('pageCrumbs');
  const name = si === -1 ? 'Visão geral' : (SECTIONS[si] ? SECTIONS[si].title : '');
  if (title) title.textContent = name;
  if (crumbs) {
    const loja = (document.getElementById('fLoja')?.value || '').trim();
    const sep = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';
    crumbs.innerHTML = ['Vistoria'].concat(loja ? [loja] : []).map(t => `<span>${escapeHtml(t)}</span>`).join(sep);
  }
}

function handleStatusClick(key, newStatus) {
  const s = State.items[key];
  const prev = s.status;
  const same = prev === newStatus;

  s.status = same ? null : newStatus;
  if (!same) s.ts = new Date().toISOString();
  else s.ts = null;

  // Update card
  const card = document.getElementById(`card-${key}`);
  if (!card) return;

  card.className = 'item-card';
  if (s.status) card.classList.add(`has-${s.status}`);

  // Update buttons
  card.querySelectorAll('.status-btn').forEach(b => {
    b.classList.toggle('sel', b.dataset.s === s.status);
    b.setAttribute('aria-pressed', b.dataset.s === s.status ? 'true' : 'false');
  });

  // Toggle details
  const det = document.getElementById(`det-${key}`);
  if (det) det.classList.toggle('open', s.status !== null);

  // Update timestamp
  const tsEl = document.getElementById(`ts-${key}`);
  if (tsEl && s.ts) {
    const d = new Date(s.ts);
    tsEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${d.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}`;
  } else if (tsEl) {
    tsEl.innerHTML = '';
  }

  // Pulse animation
  card.classList.add('just-selected');
  setTimeout(() => card.classList.remove('just-selected'), 500);

  updateProgress();
  updateTabBadges();
  autoSave();

}

/* PROGRESS */
function updateProgress() {
  const total = State.totalItems();
  const done  = State.doneItems();
  const okC   = State.countBy('ok');
  const warnC = State.countBy('warn');
  const critC = State.countBy('crit');
  const naC   = State.countBy('na');
  const pct   = State.pct();

  DOM.progressFill.style.width = pct + '%';
  DOM.progressFill.classList.toggle('has-value', pct > 0);
  DOM.progressPct.textContent = pct + '%';
  const pbar = DOM.progressFill.parentElement; if (pbar) pbar.setAttribute('aria-valuenow', String(pct));
  DOM.progressCount.textContent = `${done}/${total}`;
  const fc = DOM.fc, set = (el, v) => { if (el) el.textContent = v; };
  set(fc.all, total); set(fc.pending, total - done);
  set(fc.ok, okC); set(fc.warn, warnC); set(fc.crit, critC); set(fc.na, naC);
  document.dispatchEvent(new Event('ti:progress'));
}

function updateTabBadges() {
  SECTIONS.forEach((sec, si) => {
    const badge = document.getElementById(`tbadge-${si}`);
    const tab   = document.getElementById(`tab-${si}`);
    if (!badge || !tab) return;

    const s     = State.sectionStats(si);
    const done  = s.total > 0 && s.pending === 0;
    const allOk = done && s.crit === 0 && s.warn === 0;

    badge.innerHTML = allOk ? ICON_CHECK_SM : `${s.done}/${s.total}`;
    tab.className = 'tab-btn' + (s.crit > 0 ? ' has-crit' : s.warn > 0 ? ' has-warn' : allOk ? ' all-ok' : '');
    if (State.ui.currentTab === si) tab.classList.add('active');
    tab.setAttribute('aria-label', `${sec.title}: ${s.done} de ${s.total} avaliados` + (s.crit ? `, ${s.crit} crítico${s.crit > 1 ? 's' : ''}` : ''));

    const prog = document.getElementById(`tprog-${si}`);
    if (prog) prog.style.width = s.pct + '%';
    const cnt = document.getElementById(`shcount-${si}`);
    if (cnt) cnt.textContent = `${s.done}/${s.total}`;
    const bar = document.getElementById(`shbar-${si}`);
    if (bar) bar.style.width = s.pct + '%';
    renderSectionFoot(si, s);
  });
}

/* Rodapé de cada seção: resumo + caminho para o próximo passo */
function renderSectionFoot(si, s) {
  const el = document.getElementById(`foot-${si}`);
  if (!el) return;
  s = s || State.sectionStats(si);
  const last = si === SECTIONS.length - 1;
  const complete = s.total > 0 && s.pending === 0;
  const flags = [];
  if (s.crit) flags.push(`${s.crit} crítico${s.crit > 1 ? 's' : ''}`);
  if (s.warn) flags.push(`${s.warn} em atenção`);
  const title = complete ? 'Seção concluída' : `${s.pending} ${s.pending === 1 ? 'item pendente' : 'itens pendentes'}`;
  const detail = flags.length ? flags.join(' · ') : (complete ? 'Nenhum ponto de atenção.' : `${s.done} de ${s.total} avaliados`);
  const ic = complete
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/></svg>'
    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 7v5l3 2"/></svg>';
  const next = last
    ? (complete ? `<button type="button" class="btn btn-primary" data-foot="save">Revisar e salvar</button>` : `<button type="button" class="btn" data-foot="overview">Ver visão geral</button>`)
    : `<button type="button" class="btn btn-primary" data-foot="next">Próxima: ${escapeHtml(SECTIONS[si + 1].title)}<kbd class="kbd-hint" aria-hidden="true">]</kbd></button>`;
  const pend = s.pending ? `<button type="button" class="btn" data-foot="pending">Próximo pendente<kbd class="kbd-hint" aria-hidden="true">N</kbd></button>` : '';
  const html = `<div class="sf-main"><span class="sf-ic">${ic}</span><div class="sf-text"><b>${title}</b><span>${detail}</span></div></div><div class="sf-actions">${pend}${next}</div>`;
  if (el._html !== html) { el._html = html; el.innerHTML = html; }
  el.classList.toggle('is-complete', complete);
  el.dataset.si = si;
}

/* SEARCH & FILTER */
function toggleSearch() {
  State.ui.searchOpen = !State.ui.searchOpen;
  const bar = document.getElementById('searchBar');
  const btn = document.getElementById('searchToggle');
  bar.classList.toggle('open', State.ui.searchOpen);
  btn.classList.toggle('active', State.ui.searchOpen);
  if (State.ui.searchOpen) {
    setTimeout(() => document.getElementById('searchInput').focus(), 200);
  } else {
    clearSearch();
  }
}

function handleSearch(q) {
  State.ui.searchQuery = q.toLowerCase().trim();
  applyFilters();
}

function clearSearch() {
  State.ui.searchQuery = '';
  document.getElementById('searchInput').value = '';
  applyFilters();
}

function setFilter(filter, el) {
  State.ui.activeFilter = filter;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  applyFilters();
}

/* A busca é GLOBAL: funciona em qualquer seção, independente da aba
   atualmente aberta. Quando há texto digitado, o carrossel horizontal
   (que mostra só uma seção por vez) é substituído por uma lista
   vertical com TODAS as seções, exibindo apenas os itens que batem
   com a busca/filtro — cada um já identificado com sua seção de origem. */
const FILTER_EMPTY_TEXT = {
  pending: 'Nenhum item pendente nesta seção.',
  ok: 'Nenhum item marcado como OK nesta seção.',
  warn: 'Nenhum item em atenção nesta seção.',
  crit: 'Nenhum item crítico nesta seção.',
  na: 'Nenhum item marcado como N/A nesta seção.',
  all: 'Nenhum item corresponde ao filtro nesta seção.'
};

function applyFilters() {
  const q = State.ui.searchQuery;
  const f = State.ui.activeFilter;
  const globalSearchMode = q.length > 0;

  const track = DOM.slidesTrack;
  const emptyState = document.getElementById('searchModeEmpty');
  track.classList.toggle('search-mode', globalSearchMode);
  document.body.classList.toggle('searching', globalSearchMode);

  let anyVisibleAnywhere = false;

  SECTIONS.forEach((sec, si) => {
    const slideEl = document.getElementById(`slide-${si}`);
    let sectionHasVisible = false;

    sec.items.forEach((label, ii) => {
      const key = `${si}-${ii}`;
      const card = document.getElementById(`card-${key}`);
      if (!card) return;
      const item = State.items[key];
      const status = item?.status;
      const cardLabel = card.dataset.label || '';

      let visible = true;

      // Search filter (busca em qualquer seção, não só na aberta)
      if (q && !cardLabel.includes(q)) visible = false;

      // Status filter
      if (f === 'pending' && status !== null) visible = false;
      if (f === 'ok'      && status !== 'ok')   visible = false;
      if (f === 'warn'    && status !== 'warn')  visible = false;
      if (f === 'crit'    && status !== 'crit')  visible = false;
      if (f === 'na'      && status !== 'na')    visible = false;

      card.classList.toggle('filtered-out', !visible);
      if (visible) { sectionHasVisible = true; anyVisibleAnywhere = true; }

      // Highlight search + mostra a seção de origem do item no modo global
      const labelEl = card.querySelector('.item-label');
      if (q && visible) {
        if (labelEl) {
          const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
          const prefix = globalSearchMode ? `<span class="item-section-tag">${sec.title}</span> ` : '';
          labelEl.innerHTML = prefix + label.replace(re, '<mark>$1</mark>');
        }
        card.classList.add('highlight-search');
      } else {
        if (labelEl) labelEl.textContent = label;
        card.classList.remove('highlight-search');
      }
    });

    if (slideEl) {
      slideEl.classList.toggle('has-search-results', globalSearchMode && sectionHasVisible);
      slideEl.classList.toggle('filter-empty', !globalSearchMode && f !== 'all' && !sectionHasVisible);
      const msg = slideEl.querySelector('.slide-empty-text');
      if (msg) msg.textContent = FILTER_EMPTY_TEXT[f] || FILTER_EMPTY_TEXT.all;
    }
  });

  if (emptyState) emptyState.classList.toggle('show', globalSearchMode && !anyVisibleAnywhere);
}

/* SWIPE NAVIGATION */
function setupSwipe() {
  const vp = document.querySelector('.slides-viewport');
  let touchStartX = 0, touchStartY = 0, startTab = 0;
  let isDragging = false;

  vp.addEventListener('touchstart', e => {
    if (State.ui.searchQuery) return; // sem swipe de aba durante busca global
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    startTab = State.ui.currentTab;
    isDragging = false;
  }, { passive: true });

  vp.addEventListener('touchmove', e => {
    if (State.ui.searchQuery) return;
    const dx = e.touches[0].clientX - touchStartX;
    const dy = e.touches[0].clientY - touchStartY;
    if (!isDragging && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      isDragging = true;
    }
  }, { passive: true });

  vp.addEventListener('touchend', e => {
    if (State.ui.searchQuery) return;
    if (!isDragging) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 45) {
      const cur = State.ui.currentTab;
      const maxTab = SECTIONS.length - 1;
      if (dx < 0 && cur < maxTab) goToTab(cur + 1);
      else if (dx > 0 && cur > -1) goToTab(cur - 1);
    }
  }, { passive: true });
}

/* FIELD LISTENERS */
function setupFieldListeners() {
  ['fLoja', 'fData', 'fResp', 'fReg'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', autoSave);
      el.addEventListener('input',  autoSave);
      if (id === 'fLoja') el.addEventListener('change', renderPrintersForSelectedStore);
    }
  });
}

/* DASHBOARD TOGGLE */
function toggleDashboard() {
  const isDash = State.ui.currentTab === -1;
  if (isDash) {
    goToTab(State.ui.lastTab >= 0 && State.ui.lastTab < SECTIONS.length ? State.ui.lastTab : 0);
  } else {
    goToTab(-1);
  }
  document.getElementById('dashboardToggle').classList.toggle('active', !isDash);
}


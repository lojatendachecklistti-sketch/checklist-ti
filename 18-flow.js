/* Fluxo rápido de vistoria: item atual, atalhos de teclado, avanço automático,
   rodapé de seção e navegação por teclado nas abas.

   Conceitos:
   - "item atual" (cursor): o cartão em que as teclas 1-4 / O atuam. Só fica visível no
     "modo teclado" (classe kbd-nav no body), que liga ao usar o teclado e desliga ao tocar/clicar.
   - A primeira tecla depois de usar o mouse só MOSTRA o cursor; as seguintes agem nele.
   - Avanço automático: após marcar OK ou N/A (por toque, clique ou tecla) o cursor vai
     para o próximo item pendente da mesma seção. Atenção e Crítico ficam parados para
     você registrar detalhes. Ações em lote ("Restantes OK") nunca disparam o avanço. */
(function () {
  'use strict';

  const KEY_AUTO = 'ti-auto-advance';
  const STATUS_KEYS = { '1': 'ok', '2': 'warn', '3': 'crit', '4': 'na' };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const behavior = () => (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

  let cur = null;         // chave "si-ii" do item atual
  let userMark = false;   // marcação iniciada pelo usuário (toque, clique ou tecla)
  let auto = true;
  try { auto = localStorage.getItem(KEY_AUTO) !== '0'; } catch (e) {}

  const keyOf = card => card.id.slice(5);
  const siOf = key => +key.split('-')[0];
  const cardOf = key => (key ? document.getElementById('card-' + key) : null);
  const hidden = card => !card || card.classList.contains('filtered-out');
  const appActive = () => { const a = $('#app'); return !!a && a.classList.contains('visible') && !a.hasAttribute('inert'); };
  const overlayOpen = () => !!$('.modal-backdrop.open, .printers-screen.open, .pro-full, .cmdk.open');

  /* posição de um item na ordem das seções */
  function orderIndex(key) {
    const [si, ii] = key.split('-').map(Number);
    let n = 0;
    for (let i = 0; i < si; i++) n += SECTIONS[i].items.length;
    return n + ii;
  }

  /* chaves pendentes na ordem; visibleOnly ignora itens escondidos por filtro */
  function pendingKeys(visibleOnly, si) {
    const out = [];
    SECTIONS.forEach((sec, s) => {
      if (si != null && s !== si) return;
      sec.items.forEach((_, ii) => {
        const k = `${s}-${ii}`;
        if (State.items[k] && !State.items[k].status && (!visibleOnly || !hidden(cardOf(k)))) out.push(k);
      });
    });
    return out;
  }
  const firstPending = () => pendingKeys(false)[0] || null;
  const visiblePendingIn = si => pendingKeys(true, si)[0] || null;
  const firstIn = si => { const c = $(`#slide-${si} .item-card:not(.filtered-out)`); return c ? keyOf(c) : null; };

  /* cartões navegáveis, na ordem; na busca global, apenas os resultados */
  function cards() {
    return $$(State.ui.searchQuery
      ? '.slide.has-search-results .item-card:not(.filtered-out)'
      : '.item-card:not(.filtered-out)');
  }

  function inView(card, key) {
    if (!card || (!State.ui.searchQuery && State.ui.currentTab !== siOf(key))) return false;
    const r = card.getBoundingClientRect(), v = $('.slides-viewport').getBoundingClientRect();
    return r.top >= v.top + 40 && r.bottom <= v.bottom;
  }

  /* ---------- cursor ---------- */
  function setCurrent(key, o) {
    o = o || {};
    const prev = cardOf(cur);
    if (prev) prev.classList.remove('is-current');
    const card = cardOf(key);
    cur = card ? key : null;
    if (!card) return;
    card.classList.add('is-current');
    if (o.reveal) reveal(card, key);
    if (o.flash) {
      card.classList.remove('flash'); void card.offsetWidth; card.classList.add('flash');
      setTimeout(() => card.classList.remove('flash'), 1200);
    }
  }

  function reveal(card, key) {
    if (!State.ui.searchQuery && State.ui.currentTab !== siOf(key)) goToTab(siOf(key));
    requestAnimationFrame(() => card.scrollIntoView({ block: 'nearest', behavior: behavior() }));
  }

  function resetFilters() {
    if (State.ui.searchQuery) clearSearch();
    if (State.ui.activeFilter !== 'all') {
      const chip = $('.filter-chip[data-filter="all"]');
      if (chip) setFilter('all', chip);
    }
  }

  /* vai até um item de qualquer lugar (dashboard, paleta, rodapé) */
  function goTo(key, o) {
    if (!key || !cardOf(key)) return;
    if (hidden(cardOf(key)) || State.ui.searchQuery) resetFilters();
    goToTab(siOf(key));
    setCurrent(key, { reveal: true, flash: !o || o.flash !== false });
  }

  function startKey() {
    if (State.ui.searchQuery) { const l = cards(); return l.length ? keyOf(l[0]) : null; }
    const si = State.ui.currentTab;
    if (si < 0) return firstPending() || (cards()[0] ? keyOf(cards()[0]) : null);
    return visiblePendingIn(si) || firstIn(si);
  }

  function move(dir) {
    const list = cards();
    if (!list.length) return;
    const i = cur ? list.findIndex(c => keyOf(c) === cur) : -1;
    if (i === -1) { setCurrent(startKey(), { reveal: true }); return; }
    const j = Math.max(0, Math.min(list.length - 1, i + dir));
    if (j !== i) setCurrent(keyOf(list[j]), { reveal: true });
  }

  /* "ir para o que falta": o item pendente do cursor; se ele já está à vista no modo
     teclado, pula para o pendente seguinte (repetir N percorre todos). */
  function next() {
    const pend = pendingKeys(false);
    if (!pend.length) { showToast('Todos os itens já foram avaliados.', 'success'); return; }
    let target = pend[0];
    if (cur && State.items[cur]) {
      const f = orderIndex(cur);
      const skip = !State.items[cur].status && document.body.classList.contains('kbd-nav') && inView(cardOf(cur), cur);
      target = pend.find(k => (skip ? orderIndex(k) > f : orderIndex(k) >= f)) || pend[0];
    }
    goTo(target);
  }

  /* ---------- marcação ---------- */
  const baseHandle = window.handleStatusClick;
  window.handleStatusClick = function (key, status) {
    const user = userMark; userMark = false;
    const r = baseHandle.apply(this, arguments);
    if (user) afterUserMark(key);
    return r;
  };
  /* toque/clique em um botão de status: marca como ação do usuário (a captura roda antes do botão) */
  document.addEventListener('click', e => {
    if (e.target.closest('.item-card .status-btn')) { userMark = true; setTimeout(() => { userMark = false; }, 0); }
  }, true);

  function afterUserMark(key) {
    const st = State.items[key];
    if (!st) return;
    setCurrent(key);
    if (!auto || (st.status !== 'ok' && st.status !== 'na')) return;
    const f = orderIndex(key);
    const nxt = pendingKeys(true, siOf(key)).find(k => orderIndex(k) > f);
    if (nxt) setCurrent(nxt, { reveal: true });
    else requestAnimationFrame(() => { const el = $('#foot-' + siOf(key)); if (el) el.scrollIntoView({ block: 'nearest', behavior: behavior() }); });
  }

  function mark(status) {
    if (!cur || !cardOf(cur)) return;
    userMark = true;
    window.handleStatusClick(cur, status);
    userMark = false;
  }

  function focusNote() {
    const key = cur && cardOf(cur) ? cur : startKey();
    if (!key) return;
    setCurrent(key, { reveal: true });
    const det = $('#det-' + key), obs = $('#obs-' + key);
    if (det) det.classList.add('open');
    if (obs) setTimeout(() => obs.focus(), 80);
  }

  /* ---------- teclado ---------- */
  function wake() {
    const was = document.body.classList.contains('kbd-nav');
    document.body.classList.add('kbd-nav');
    return was;
  }
  /* a primeira tecla depois do mouse só mostra o cursor */
  function showCursor() {
    setCurrent(cur && cardOf(cur) ? cur : startKey(), { reveal: true });
  }

  function section(dir) {
    const t = State.ui.currentTab, n = Math.max(-1, Math.min(SECTIONS.length - 1, t + dir));
    if (n !== t) goToTab(n);
  }

  const arrowOK = e => !e.shiftKey && State.ui.currentTab !== -1 &&
    (document.activeElement === document.body || !!document.activeElement.closest('.slides-viewport'));

  document.addEventListener('keydown', e => {
    if (e.defaultPrevented || e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (!appActive()) return;
    const t = e.target;
    const typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    if (typing) {
      if (e.key === 'Escape' && t.closest && t.closest('.item-card')) t.blur();
      return;
    }
    if (overlayOpen()) return;

    const k = e.key, lower = k.length === 1 ? k.toLowerCase() : k;
    if (STATUS_KEYS[k]) {
      e.preventDefault();
      if (!wake() || !cur || !cardOf(cur)) showCursor(); else mark(STATUS_KEYS[k]);
    } else if (lower === 'j' || (k === 'ArrowDown' && arrowOK(e))) {
      e.preventDefault(); if (!wake()) showCursor(); else move(1);
    } else if (lower === 'k' || (k === 'ArrowUp' && arrowOK(e))) {
      e.preventDefault(); if (!wake()) showCursor(); else move(-1);
    } else if (lower === 'n') { e.preventDefault(); wake(); next();
    } else if (lower === 'o') { e.preventDefault(); wake(); focusNote();
    } else if (k === ']') { e.preventDefault(); section(1);
    } else if (k === '[') { e.preventDefault(); section(-1);
    } else if (lower === 'd') { e.preventDefault(); toggleDashboard();
    } else if (k === '/') {
      e.preventDefault();
      if (!State.ui.searchOpen) toggleSearch(); else { const i = $('#searchInput'); if (i) i.focus(); }
    } else if (k === '?') { e.preventDefault(); openModal('shortcutsModal'); }
  });

  /* teclado/mouse alternam o modo; foco dentro de um cartão posiciona o cursor nele */
  document.addEventListener('pointerdown', e => {
    document.body.classList.remove('kbd-nav');
    const c = e.target.closest && e.target.closest('.item-card');
    if (c) setCurrent(keyOf(c));
  }, true);
  document.addEventListener('focusin', e => {
    const c = e.target.closest && e.target.closest('.item-card');
    if (c && keyOf(c) !== cur) setCurrent(keyOf(c));
  });

  /* ao trocar de seção, o cursor vai para o primeiro pendente dela */
  document.addEventListener('ti:tab', e => {
    const si = e.detail.si;
    if (si < 0) { setCurrent(null); return; }
    setCurrent(cur && siOf(cur) === si ? cur : (visiblePendingIn(si) || firstIn(si)));
  });

  /* ---------- rodapé da seção e estado vazio dos filtros ---------- */
  document.addEventListener('click', e => {
    const f = e.target.closest('[data-foot]');
    if (f) {
      const si = +f.closest('.section-foot').dataset.si;
      switch (f.dataset.foot) {
        case 'next': { goToTab(si + 1); const k = visiblePendingIn(si + 1) || firstIn(si + 1); if (k) setCurrent(k, { reveal: true }); break; }
        case 'pending': { const k = visiblePendingIn(si); if (k) setCurrent(k, { reveal: true, flash: true }); break; }
        case 'overview': goToTab(-1); break;
        case 'save': doSave(); break;
      }
      return;
    }
    if (e.target.closest('[data-clear-filter]')) resetFilters();
  });

  /* ---------- abas: setas, Home e End movem o foco entre as seções ---------- */
  const tabs = $('#sectionTabs');
  if (tabs) {
    tabs.addEventListener('keydown', e => {
      const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (step === undefined && e.key !== 'Home' && e.key !== 'End') return;
      const list = $$('.tab-btn', tabs), i = list.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      const j = e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : Math.max(0, Math.min(list.length - 1, i + step));
      list[j].focus();
    });
  }

  /* ---------- configuração ---------- */
  function setAuto(on) {
    auto = !!on;
    try { localStorage.setItem(KEY_AUTO, auto ? '1' : '0'); } catch (e) {}
    const t = $('#autoAdvanceToggle'); if (t) t.checked = auto;
  }
  const toggle = $('#autoAdvanceToggle');
  if (toggle) toggle.checked = auto;

  window.Flow = { goTo, next, firstPending, setCurrent, current: () => cur, setAuto, isAuto: () => auto };

  /* cursor inicial na seção aberta (a montagem da tela acontece antes deste arquivo) */
  if (State.ui.currentTab >= 0) setCurrent(visiblePendingIn(State.ui.currentTab) || firstIn(State.ui.currentTab));
})();

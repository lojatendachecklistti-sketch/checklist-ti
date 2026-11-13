/* Casca da aplicação: menu lateral recolhível, resumo do contexto no mobile e tema. */
(function () {
  'use strict';
  const app = document.getElementById('app');
  const root = document.documentElement;

  /* ---- Menu lateral recolhível (desktop) ---- */
  const SB_KEY = 'ti-sidebar-collapsed';
  const sbBtn = document.getElementById('sbCollapse');
  function setCollapsed(on) {
    app.classList.toggle('sb-collapsed', on);
    if (sbBtn) {
      sbBtn.setAttribute('aria-expanded', on ? 'false' : 'true');
      sbBtn.setAttribute('aria-label', on ? 'Expandir menu lateral' : 'Recolher menu lateral');
      sbBtn.title = on ? 'Expandir menu' : 'Recolher menu';
    }
    try { localStorage.setItem(SB_KEY, on ? '1' : '0'); } catch (e) {}
  }
  try { if (localStorage.getItem(SB_KEY) === '1') setCollapsed(true); } catch (e) {}
  if (sbBtn) sbBtn.addEventListener('click', () => setCollapsed(!app.classList.contains('sb-collapsed')));

  /* ---- Largura real da barra de rolagem: mantém topo, filtros e lista na mesma coluna ---- */
  function measureScrollbar() {
    let w = 0;
    const sl = document.querySelector('.slide');
    if (sl && sl.offsetWidth) w = sl.offsetWidth - sl.clientWidth;          // o que o layout reservou de fato
    else {
      const d = document.createElement('div');
      d.style.cssText = 'position:absolute;top:-9999px;width:100px;height:100px;overflow:scroll;visibility:hidden';
      document.body.appendChild(d); w = d.offsetWidth - d.clientWidth; d.remove();
    }
    if (root.style.getPropertyValue('--sbw') !== w + 'px') root.style.setProperty('--sbw', w + 'px');
  }
  measureScrollbar();
  window.addEventListener('resize', measureScrollbar);
  document.addEventListener('ti:tab', measureScrollbar);
  window.addEventListener('load', () => setTimeout(measureScrollbar, 800));

  /* ---- Painel de contexto: no celular vira um botão no topo (loja · data) e abre sozinho enquanto falta a loja ---- */
  const ctx = document.getElementById('ctxPanel');
  const summary = document.getElementById('ctxSummary');
  const ctxBtn = document.getElementById('ctxToggle');
  const ctxText = document.getElementById('ctxToggleText');
  const mq = window.matchMedia('(max-width: 719px)');
  function syncCtxMode() {
    if (!ctx) return;
    if (!mq.matches) ctx.setAttribute('open', '');
  }
  function refreshSummary() {
    const loja = document.getElementById('fLoja')?.value || '';
    const data = document.getElementById('fData')?.value || '';
    const d = data ? data.split('-').reverse().join('/') : '';
    const text = [loja ? loja.split(' - ')[0] : 'Selecione a loja', d].filter(Boolean).join(' · ');
    if (summary) { summary.textContent = text; summary.style.marginLeft = '8px'; }
    if (ctxText) ctxText.textContent = loja ? text : 'Selecionar loja';
    if (ctxBtn) ctxBtn.classList.toggle('needs', !loja);
    /* loja escolhida (ou rascunho restaurado): recolhe o painel que foi aberto automaticamente */
    if (ctx && loja && ctx.dataset.auto === '1' && mq.matches) { ctx.open = false; delete ctx.dataset.auto; }
  }
  window.refreshCtxSummary = refreshSummary;
  if (ctxBtn && ctx) {
    ctxBtn.addEventListener('click', () => { ctx.open = !ctx.open; delete ctx.dataset.auto; });
    ctx.addEventListener('toggle', () => ctxBtn.setAttribute('aria-expanded', ctx.open ? 'true' : 'false'));
  }
  if (ctx && mq.matches) {
    if (document.getElementById('fLoja')?.value) ctx.removeAttribute('open');
    else { ctx.open = true; ctx.dataset.auto = '1'; }
  }
  if (ctxBtn && ctx) ctxBtn.setAttribute('aria-expanded', ctx.open ? 'true' : 'false');
  mq.addEventListener && mq.addEventListener('change', syncCtxMode);
  ['fLoja', 'fData', 'fResp', 'fReg'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', refreshSummary);
    el.addEventListener('input', refreshSummary);
  });
  const lojaEl = document.getElementById('fLoja');
  if (lojaEl) lojaEl.addEventListener('change', () => { if (typeof updatePageHead === 'function') updatePageHead(State.ui.currentTab); });
  refreshSummary();
  /* o restore de rascunho altera valores via código: atualiza o resumo depois */
  window.addEventListener('load', () => setTimeout(() => { refreshSummary(); if (typeof updatePageHead === 'function') updatePageHead(State.ui.currentTab); }, 600));

  /* ---- Tema (automático / claro / escuro) ---- */
  const THEME_KEY = 'ti-theme-pref';
  const meta = document.getElementById('themeColorMeta');
  function applyThemeMeta() {
    if (!meta) return;
    const dark = root.getAttribute('data-theme') === 'dark' ||
      (!root.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    meta.setAttribute('content', dark ? '#0A0B0C' : '#151719');
  }
  window.setTheme = function (value) {
    if (value === 'light' || value === 'dark') root.setAttribute('data-theme', value);
    else root.removeAttribute('data-theme');
    try { value === 'auto' ? localStorage.removeItem(THEME_KEY) : localStorage.setItem(THEME_KEY, value); } catch (e) {}
    applyThemeMeta();
  };
  const sel = document.getElementById('themeSelect');
  if (sel) { let v = 'auto'; try { v = localStorage.getItem(THEME_KEY) || 'auto'; } catch (e) {} sel.value = v; }
  applyThemeMeta();
  if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyThemeMeta);
})();

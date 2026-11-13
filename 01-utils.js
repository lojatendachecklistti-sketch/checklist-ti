/* Utilitários compartilhados (carregado primeiro) */
function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/* Ícones de status (SVG, sem emojis) + rótulos — usados por itens e impressoras */
const STATUS_ICON = {
  ok:   '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
  warn: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
  crit: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  na:   '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>'
};
const STATUS_TEXT = { ok: 'OK', warn: 'Atenção', crit: 'Crítico', na: 'N/A' };
const STATUS_TITLE = { ok: 'OK', warn: 'Atenção', crit: 'Crítico', na: 'Não se aplica' };
function statusButtonsHtml(btnClass, extraAttrs, selected) {
  return ['ok', 'warn', 'crit', 'na'].map(s =>
    `<button type="button" class="${btnClass} btn-${s}${selected === s ? ' sel' : ''}" ${extraAttrs(s)} aria-pressed="${selected === s}" aria-label="${STATUS_TITLE[s]}" title="${STATUS_TITLE[s]}">${STATUS_ICON[s]}<span>${STATUS_TEXT[s]}</span></button>`
  ).join('');
}
const ICON_CHECK_SM = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
const ICON_CLOSE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

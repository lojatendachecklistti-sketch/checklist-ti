/* PWA, offline, háptico, steppers de quantidade, atalhos de rolagem */
/* ENHANCED MODULE — PWA, OFFLINE, HAPTICS, ADVANCED UX */

/* PWA / INSTALL PROMPT */
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const dismissed = localStorage.getItem('pwa-dismissed');
  if (!dismissed) {
    setTimeout(() => {
      document.getElementById('pwaBanner').classList.add('show');
    }, 4000);
  }
});

document.getElementById('pwaInstallBtn').addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  if (outcome === 'accepted') {
    showToast('App instalado com sucesso!', 'success');
  }
  deferredInstallPrompt = null;
  document.getElementById('pwaBanner').classList.remove('show');
});

function dismissPWA() {
  document.getElementById('pwaBanner').classList.remove('show');
  localStorage.setItem('pwa-dismissed', '1');
}

window.addEventListener('appinstalled', () => {
  document.getElementById('pwaBanner').classList.remove('show');
  showToast('Aplicativo instalado', 'success');
});

/* OFFLINE DETECTION */
function updateOnlineStatus() {
  const bar = document.getElementById('offlineBar');
  if (bar) bar.classList.toggle('show', !navigator.onLine);
  if (!navigator.onLine) {
    showToast('Modo offline ativo — dados salvos localmente', 'info');
  }
}

window.addEventListener('online',  updateOnlineStatus);
window.addEventListener('online',  () => setTimeout(() => {
  if (typeof loadPendingQueue === 'function' && loadPendingQueue().length) retryPendingSaves();
}, 1200));
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

/* SERVICE WORKER REGISTRATION */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW:', err));
  });
}

/* HAPTIC FEEDBACK */
function haptic(style = 'light') {
  if ('vibrate' in navigator) {
    const patterns = { light: [10], medium: [20], heavy: [30, 10, 30], success: [10, 50, 10] };
    navigator.vibrate(patterns[style] || patterns.light);
  }
}

/* Enhance status buttons with haptics */
document.addEventListener('click', e => {
  const btn = e.target.closest('.status-btn');
  if (!btn) return;
  const s = btn.dataset.s;
  if (s === 'crit') haptic('heavy');
  else if (s === 'warn') haptic('medium');
  else haptic('light');
  btn.classList.add('haptic');
  setTimeout(() => btn.classList.remove('haptic'), 400);
}, true);

/* QUANTITY STEPPERS */
function upgradeQtyInputs() {
  document.querySelectorAll('.qty-input').forEach(input => {
    if (input.dataset.upgraded) return;
    input.dataset.upgraded = '1';

    const wrap = document.createElement('div');
    wrap.className = 'qty-stepper';
    input.parentNode.insertBefore(wrap, input);

    const dec = document.createElement('button');
    dec.className = 'qty-stepper-btn';
    dec.type = 'button';
    dec.textContent = '−'; dec.setAttribute('aria-label', 'Diminuir quantidade');
    dec.addEventListener('click', () => {
      const cur = parseInt(input.value) || 0;
      if (cur > 0) { input.value = cur - 1; input.dispatchEvent(new Event('input')); haptic('light'); }
    });

    const inc = document.createElement('button');
    inc.className = 'qty-stepper-btn';
    inc.type = 'button';
    inc.textContent = '+'; inc.setAttribute('aria-label', 'Aumentar quantidade');
    inc.addEventListener('click', () => {
      const cur = parseInt(input.value) || 0;
      input.value = cur + 1; input.dispatchEvent(new Event('input')); haptic('light');
    });

    wrap.appendChild(dec);
    wrap.appendChild(input);
    wrap.appendChild(inc);
  });
}

/* Call after a brief delay to let DOM settle */
setTimeout(upgradeQtyInputs, 500);

/* SCROLL-TO-TOP FAB */
const fabHtml = `<button class="fab-top" id="fabTop" onclick="scrollToTop()" aria-label="Voltar ao topo">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
</button>`;
document.querySelector('.slides-viewport').insertAdjacentHTML('beforeend', fabHtml);

/* Elemento que rola na tela atual: a seção ativa, a visão geral ou (na busca global) a própria trilha. */
function activeScroller() {
  if (State.ui.searchQuery) return DOM.slidesTrack;
  return document.getElementById(State.ui.currentTab === -1 ? 'slide-dashboard' : `slide-${State.ui.currentTab}`);
}

function updateFab() {
  const fab = document.getElementById('fabTop');
  const sc = activeScroller();
  if (fab) fab.classList.toggle('visible', !!sc && sc.scrollTop > 200);
}

let fabTicking = false;
document.getElementById('slidesTrack').addEventListener('scroll', () => {
  if (fabTicking) return;
  fabTicking = true;
  requestAnimationFrame(() => { updateFab(); fabTicking = false; });
}, { passive: true, capture: true });
document.addEventListener('ti:tab', () => requestAnimationFrame(updateFab));

function scrollToTop() {
  const sc = activeScroller();
  if (sc) sc.scrollTo({ top: 0, behavior: 'smooth' });
  haptic('light');
}

/* Smart auto-scroll: only when the changed card is outside the viewport. */
const origHandle = handleStatusClick;
window.handleStatusClick = function(key, status) {
  origHandle(key, status);
  requestAnimationFrame(() => {
    const card = document.getElementById(`card-${key}`);
    const vp = document.querySelector('.slides-viewport');
    if (!card || !vp) return;
    const r = card.getBoundingClientRect(), v = vp.getBoundingClientRect();
    if (r.top < v.top || r.bottom > v.bottom) card.scrollIntoView({behavior:'auto', block:'nearest'});
  });
};

/* COMPLETION CELEBRATION */
let wasComplete = false;
function checkCompletion() {
  const done  = State.doneItems();
  const total = State.totalItems();
  const isNow = done === total && total > 0;
  if (isNow && !wasComplete) {
    wasComplete = true;
    haptic('success');
    showToast('Vistoria 100% concluída! Salve o relatório.', 'success');
    const scoreCard = document.getElementById('dashScoreCard');
    if (scoreCard) scoreCard.classList.add('completion-pulse');
    setTimeout(() => scoreCard && scoreCard.classList.remove('completion-pulse'), 600);
  } else if (!isNow) {
    wasComplete = false;
  }
}

/* Patch updateProgress to also check completion */
const origUpdateProgress = updateProgress;
window.updateProgress = function() {
  origUpdateProgress();
  checkCompletion();
};

/* LONG-PRESS QUICK NOTE ON ITEM */
let pressTimer = null;
document.addEventListener('touchstart', e => {
  const card = e.target.closest('.item-card');
  if (!card) return;
  pressTimer = setTimeout(() => {
    haptic('medium');
    const key = card.id.replace('card-', '');
    const obs  = document.getElementById(`obs-${key}`);
    if (obs) {
      const det = document.getElementById(`det-${key}`);
      if (det && !det.classList.contains('open')) {
        det.classList.add('open');
      }
      obs.focus();
    }
  }, 500);
}, { passive: true });
document.addEventListener('touchend',   () => clearTimeout(pressTimer), { passive: true });
document.addEventListener('touchmove',  () => clearTimeout(pressTimer), { passive: true });
document.addEventListener('touchcancel',() => clearTimeout(pressTimer), { passive: true });

/* SMART DATE */
(function updateClock() {
  const now = new Date();
  const h   = now.getHours();
  const greet = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const user = document.getElementById('brandUser');
  if (user && State.user.name) {
    const name = State.user.name.split(' ')[0];
    user.innerHTML = `${greet}, ${name}`;
  }
})();

/* VISIBILITY CHANGE — RESTORE IF NEEDED */
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    const dateEl = document.getElementById('fData');
    if (dateEl && !dateEl.value) {
      dateEl.value = new Date().toISOString().split('T')[0];
    }
  }
});

/* ACESSIBILIDADE: foco preso em janelas abertas (modais, visualizador, telas cheias).
   Vale também para janelas criadas dinamicamente; ao abrir leva o foco para dentro,
   ao fechar devolve para quem abriu. */
(function () {
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const LAYERS = '.modal-backdrop.open .modal-sheet, .pro-full, .printers-screen.open, .cmdk.open .cmdk-box';
  const hostOf = el => el.closest('.modal-backdrop, .pro-full, .printers-screen, .cmdk') || el;
  const zOf = el => parseInt(getComputedStyle(hostOf(el)).zIndex, 10) || 0;

  function topLayer() {
    const all = Array.from(document.querySelectorAll(LAYERS));
    return all.length ? all.reduce((best, el) => (zOf(el) >= zOf(best) ? el : best)) : null;
  }
  const visible = el => el.getClientRects().length > 0;

  document.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const layer = topLayer();
    if (!layer) return;
    const items = Array.from(layer.querySelectorAll(FOCUSABLE)).filter(visible);
    if (!items.length) { e.preventDefault(); layer.focus && layer.focus(); return; }
    const first = items[0], last = items[items.length - 1], active = document.activeElement;
    if (!layer.contains(active)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); return; }
    if (e.shiftKey && (active === first || active === layer)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
  });

  const openers = new WeakMap();
  function watch(bd) {
    if (bd._watched) return;
    bd._watched = true;
    let was = bd.classList.contains('open');
    new MutationObserver(() => {
      const now = bd.classList.contains('open');
      if (now === was) return;
      was = now;
      if (now) {
        const prev = document.activeElement;
        if (prev && prev !== document.body && !bd.contains(prev)) openers.set(bd, prev);
        const sheet = bd.querySelector('.modal-sheet');
        if (sheet) { if (!sheet.hasAttribute('tabindex')) sheet.setAttribute('tabindex', '-1'); sheet.focus({ preventScroll: true }); }
      } else {
        const back = openers.get(bd);
        openers.delete(bd);
        if (back && document.contains(back) && typeof back.focus === 'function') back.focus({ preventScroll: true });
      }
    }).observe(bd, { attributes: true, attributeFilter: ['class'] });
  }
  document.querySelectorAll('.modal-backdrop').forEach(watch);
  new MutationObserver(muts => muts.forEach(m => m.addedNodes.forEach(n => {
    if (n.nodeType === 1 && n.classList.contains('modal-backdrop')) watch(n);
  }))).observe(document.body, { childList: true });
})();

/* COPY SHARE */
window.shareReport = async function() {
  const loja = document.getElementById('fLoja').value || 'Loja';
  const score = State.overallScore();
  if (navigator.share) {
    try {
      await navigator.share({
        title: `Vistoria TI — ${loja}`,
        text: `Score: ${score}/100 | ${State.doneItems()}/${State.totalItems()} itens avaliados`,
      });
    } catch(e) {}
  } else {
    copyReport();
  }
};


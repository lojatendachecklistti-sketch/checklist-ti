/* Feedback de processamento: bloqueia ações duplicadas durante operações longas
   (salvar, enviar e-mail, enviar planilha) e mostra um indicador discreto. */
(function () {
  'use strict';
  let busyEl = null, busyCount = 0, busyShowT = 0, busyHideT = 0, busySince = 0;

  function ensureBusy() {
    if (busyEl) return busyEl;
    busyEl = document.createElement('div');
    busyEl.id = 'fxBusy';
    busyEl.setAttribute('role', 'status');
    busyEl.setAttribute('aria-live', 'polite');
    busyEl.innerHTML = '<div class="fx-busy-card"><div class="fx-busy-orbit"></div><div class="fx-busy-title"></div><div class="fx-busy-sub">Aguarde um instante…</div></div>';
    document.body.appendChild(busyEl);
    return busyEl;
  }

  function busy(msg) {
    const el = ensureBusy(), token = { done: false };
    el.querySelector('.fx-busy-title').textContent = msg || 'Processando…';
    clearTimeout(busyHideT);
    busyCount++;
    if (busyCount === 1) busyShowT = setTimeout(() => { busySince = performance.now(); el.classList.add('show'); }, 280);
    function done() {
      if (token.done) return;
      token.done = true;
      busyCount = Math.max(0, busyCount - 1);
      if (busyCount > 0) return;
      clearTimeout(busyShowT);
      if (!el.classList.contains('show')) return;
      busyHideT = setTimeout(() => el.classList.remove('show'), Math.max(0, 400 - (performance.now() - busySince)));
    }
    setTimeout(done, 30000); /* segurança: nunca deixa a tela travada */
    return done;
  }

  function wrapBusy(name, msg) {
    const fn = window[name];
    if (typeof fn !== 'function') return;
    window[name] = function () {
      const done = busy(msg);
      let r;
      try { r = fn.apply(this, arguments); } catch (e) { done(); throw e; }
      if (r && typeof r.then === 'function') return r.then(v => { done(); return v; }, err => { done(); throw err; });
      done();
      return r;
    };
  }
  wrapBusy('doSave', 'Sincronizando vistoria…');
  wrapBusy('sendEmailReport', 'Enviando relatório…');
  wrapBusy('sendCurrentChecklistExcel', 'Gerando e enviando a planilha…');

  window.MotionFX = { enterApp() {}, busy, moveIndicator() {} };
})();

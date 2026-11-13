/* Visão geral (dashboard) e faixa de progresso.
   Tudo é calculado a partir do estado real da vistoria (State), do plano de ação e do
   histórico de visitas (Pro). Nada aqui é dado fictício. */

const SCORE_RING_R = 44;
const SCORE_RING_C = 2 * Math.PI * SCORE_RING_R;

/* ---------- dados auxiliares ---------- */
function dashPro() {
  try { return window.Pro && window.Pro._P ? window.Pro._P : null; } catch (e) { return null; }
}

function dashLabel(key) {
  const [si, ii] = key.split('-').map(Number);
  return { si, ii, section: SECTIONS[si] ? SECTIONS[si].title : '', label: SECTIONS[si] ? SECTIONS[si].items[ii] : '' };
}

function dashFormatDuration(ms) {
  const min = Math.floor(ms / 6e4);
  if (min < 1) return 'agora';
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;
}

function dashFormatDate(iso) {
  return iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '';
}

/* Última visita salva na mesma loja (para comparar a nota). */
function dashPreviousVisit() {
  const P = dashPro();
  const loja = (document.getElementById('fLoja') || {}).value || '';
  if (!P || !loja || !Array.isArray(P.visits)) return null;
  const list = P.visits.filter(v => v.loja === loja && v.id !== (P.meta && P.meta.visitId));
  list.sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
  return list[0] || null;
}

/* ---------- construção ---------- */
function buildDashboardSlide() {
  const slide = document.createElement('div');
  slide.className = 'slide-dashboard';
  slide.id = 'slide-dashboard';
  slide.setAttribute('role', 'tabpanel');
  slide.setAttribute('aria-labelledby', 'tab-dashboard');

  const pill = (cls, id, label) =>
    `<div class="dash-pill ${cls}"><span class="dash-pill-val" id="${id}">0</span><span class="dash-pill-lbl">${label}</span></div>`;

  slide.innerHTML = `
    <ul class="dash-meta" id="dashMeta" aria-label="Dados da vistoria"></ul>

    <section class="dash-hero" id="dashScoreCard" aria-label="Nota da vistoria">
      <div class="dash-ring" id="dashRing" data-grade="none" role="img" aria-label="Sem nota ainda">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle class="ring-track" cx="50" cy="50" r="${SCORE_RING_R}"/>
          <circle class="ring-fill" id="dashRingFill" cx="50" cy="50" r="${SCORE_RING_R}" transform="rotate(-90 50 50)" style="stroke-dasharray:${SCORE_RING_C.toFixed(2)};stroke-dashoffset:${SCORE_RING_C.toFixed(2)}"/>
        </svg>
        <div class="ring-center"><span class="dash-score-num" id="dashScore">—</span><span class="ring-unit">de 100</span></div>
      </div>
      <div class="dash-hero-info">
        <div class="dash-hero-head">
          <span class="dash-hero-label">Nota da vistoria</span>
          <span class="score-grade" id="dashGrade">—</span>
        </div>
        <div class="dash-hero-sub" id="dashScoreSub">Nenhum item avaliado ainda.</div>
        <div class="dash-delta" id="dashDelta" hidden></div>
        <div class="dash-prog">
          <div class="dash-prog-line"><span>Progresso</span><b id="dashProgressPct">0%</b></div>
          <div class="dash-prog-track"><div class="dash-prog-fill" id="dashProgressFill"></div></div>
          <div class="dash-prog-sub" id="dashProgressSub">0 de 0 itens avaliados</div>
        </div>
      </div>
      <div class="dash-counts" aria-label="Itens por status">
        ${pill('ok', 'dOk', 'OK')}${pill('warn', 'dWarn', 'Atenção')}${pill('crit', 'dCrit', 'Crítico')}${pill('na', 'dNa', 'N/A')}
      </div>
    </section>

    <div class="dash-cols">
      <div class="dash-col">
        <section class="dash-card dash-next" id="dashNext" aria-label="Próximo passo"></section>
        <section class="dash-card" aria-labelledby="dashAttnTitle">
          <div class="dash-card-head">
            <h2 class="dash-card-title" id="dashAttnTitle">Requer atenção</h2>
            <span class="dash-card-sub" id="dashAttnCount"></span>
          </div>
          <div class="dash-list dash-attn-list" id="dashAttn"></div>
        </section>
      </div>
      <div class="dash-col">
        <section class="dash-card" aria-labelledby="dashSecTitle">
          <div class="dash-card-head">
            <h2 class="dash-card-title" id="dashSecTitle">Seções</h2>
            <span class="dash-legend" aria-hidden="true"><i class="lg-ok"></i>OK<i class="lg-warn"></i>Atenção<i class="lg-crit"></i>Crítico<i class="lg-na"></i>N/A</span>
          </div>
          <div class="dash-list" id="dashSections"></div>
        </section>
        <section class="dash-card" aria-labelledby="dashActTitle">
          <div class="dash-card-head">
            <h2 class="dash-card-title" id="dashActTitle">Atividade recente</h2>
          </div>
          <div class="dash-list" id="dashActivity"></div>
        </section>
      </div>
    </div>`;

  DOM.slidesTrack.appendChild(slide);

  slide.addEventListener('click', e => {
    const go = e.target.closest('[data-goto]');
    if (go) { dashGoTo(go.dataset.goto); return; }
    const sec = e.target.closest('[data-sec]');
    if (sec) { goToTab(+sec.dataset.sec); return; }
    const act = e.target.closest('[data-dash]');
    if (!act) return;
    switch (act.dataset.dash) {
      case 'next':  if (window.Flow) Flow.goTo(Flow.firstPending()); break;
      case 'save':  doSave(); break;
      case 'email': openEmailModal(); break;
      case 'store': dashFocusStore(); break;
    }
  });
}

function dashGoTo(key) {
  if (window.Flow) Flow.goTo(key, { flash: true });
  else goToTab(+key.split('-')[0]);
}

function dashFocusStore() {
  const ctx = document.getElementById('ctxPanel');
  if (ctx && !ctx.open) ctx.open = true;
  const sel = document.getElementById('fLoja');
  if (sel) sel.focus();
}

/* ---------- atualização ---------- */
function updateDashboard() {
  const slide = document.getElementById('slide-dashboard');
  if (!slide) return;
  const $ = id => document.getElementById(id);
  const total = State.totalItems(), done = State.doneItems(), pct = State.pct();
  const okC = State.countBy('ok'), warnC = State.countBy('warn'), critC = State.countBy('crit'), naC = State.countBy('na');
  const has = done > 0;
  const score = State.overallScore(), grade = State.grade();

  /* nota (anel) */
  $('dashScore').textContent = has ? score : '—';
  const ring = $('dashRing');
  ring.dataset.grade = has ? grade : 'none';
  ring.setAttribute('aria-label', has ? `Nota ${score} de 100, conceito ${grade}` : 'Sem nota ainda');
  $('dashRingFill').style.strokeDashoffset = (SCORE_RING_C * (1 - (has ? score : 0) / 100)).toFixed(2);
  const g = $('dashGrade');
  g.textContent = has ? grade : '—';
  g.className = 'score-grade' + (has ? ` grade-${grade.toLowerCase()}` : '');

  const sub = $('dashScoreSub');
  sub.textContent = !has ? 'Nenhum item avaliado ainda.'
    : critC ? `${critC} ponto${critC > 1 ? 's' : ''} crítico${critC > 1 ? 's' : ''} exigem ação`.replace('exigem', critC > 1 ? 'exigem' : 'exige')
    : warnC ? `${warnC} ponto${warnC > 1 ? 's' : ''} em atenção`
    : 'Nenhum ponto crítico ou em atenção.';
  sub.dataset.tone = !has ? 'muted' : critC ? 'crit' : warnC ? 'warn' : 'ok';

  /* comparação com a última visita da mesma loja */
  const delta = $('dashDelta');
  const prev = has ? dashPreviousVisit() : null;
  if (prev && typeof prev.score === 'number') {
    const d = score - prev.score;
    delta.hidden = false;
    delta.dataset.dir = d > 0 ? 'up' : d < 0 ? 'down' : 'eq';
    delta.textContent = `${d > 0 ? '+' : ''}${d} pts vs. visita de ${dashFormatDate(prev.data) || dashFormatDate(prev.savedAt)} (nota ${prev.score})`;
  } else {
    delta.hidden = true;
  }

  /* progresso e contagens */
  $('dashProgressPct').textContent = pct + '%';
  $('dashProgressFill').style.width = pct + '%';
  $('dashProgressSub').textContent = `${done} de ${total} itens avaliados`;
  $('dOk').textContent = okC; $('dWarn').textContent = warnC; $('dCrit').textContent = critC; $('dNa').textContent = naC;

  updateDashMeta();
  updateDashNext(total, done);
  updateDashAttention();
  updateDashSections();
  updateDashActivity();
}

/* Dados da vistoria: só aparece o que de fato tem valor. */
function updateDashMeta() {
  const el = document.getElementById('dashMeta');
  if (!el) return;
  const v = id => ((document.getElementById(id) || {}).value || '').trim();
  const loja = v('fLoja'), data = v('fData'), resp = v('fResp');
  const P = dashPro();
  const items = [];
  if (loja) items.push(['Loja', loja]);
  if (data) items.push(['Data', dashFormatDate(data)]);
  if (resp) items.push(['Responsável', resp]);
  if (P && P.meta && P.meta.startedAt) items.push(['Em andamento há', dashFormatDuration(Date.now() - P.meta.startedAt)]);
  if (P && P.photos) { const n = Object.values(P.photos).reduce((a, l) => a + (l ? l.length : 0), 0); if (n) items.push(['Fotos', String(n)]); }
  if (P && Array.isArray(P.actions)) {
    const n = P.actions.filter(a => a.status !== 'concluida' && (!loja || a.loja === loja)).length;
    if (n) items.push(['Ações em aberto', String(n)]);
  }
  const html = items.map(([k, val]) => `<li><span>${escapeHtml(k)}</span><b title="${escapeHtml(val)}">${escapeHtml(val)}</b></li>`).join('');
  if (el._html !== html) { el._html = html; el.innerHTML = html; }
  el.hidden = !items.length;
}

/* Próximo passo: a ação mais útil agora. */
function updateDashNext(total, done) {
  const el = document.getElementById('dashNext');
  if (!el) return;
  const loja = ((document.getElementById('fLoja') || {}).value || '').trim();
  const pending = total - done;
  let html;
  if (!loja) {
    html = `<div class="dash-next-kicker">Primeiro passo</div>
      <div class="dash-next-title">Selecione a loja da vistoria</div>
      <p class="dash-next-text">A loja identifica o relatório, carrega as impressoras cadastradas e permite comparar com a última visita.</p>
      <div class="dash-next-actions"><button type="button" class="btn btn-primary" data-dash="store">Selecionar loja</button></div>`;
  } else if (pending === 0 && total > 0) {
    html = `<div class="dash-next-kicker">Vistoria completa</div>
      <div class="dash-next-title">Todos os ${total} itens foram avaliados</div>
      <p class="dash-next-text">Revise os pontos críticos, confira as evidências e salve a vistoria.</p>
      <div class="dash-next-actions"><button type="button" class="btn btn-primary" data-dash="save">Revisar e salvar</button><button type="button" class="btn" data-dash="email">Enviar por e-mail</button></div>`;
  } else {
    const key = window.Flow ? Flow.firstPending() : null;
    const info = key ? dashLabel(key) : null;
    const secsLeft = SECTIONS.filter((_, si) => State.sectionStats(si).pending > 0).length;
    const started = done > 0;
    html = `<div class="dash-next-kicker">${started ? 'Próximo pendente' : 'Comece por aqui'}</div>
      <div class="dash-next-title">${info ? escapeHtml(info.label) : 'Continuar a vistoria'}</div>
      <p class="dash-next-text">${info ? escapeHtml(info.section) + ' · ' : ''}${pending} ${pending === 1 ? 'item pendente' : 'itens pendentes'} em ${secsLeft} ${secsLeft === 1 ? 'seção' : 'seções'}.</p>
      <div class="dash-next-actions"><button type="button" class="btn btn-primary" data-dash="next">${started ? 'Continuar' : 'Começar'}<kbd class="kbd-hint" aria-hidden="true">N</kbd></button></div>`;
  }
  if (el._html !== html) { el._html = html; el.innerHTML = html; }
}

function dashRow(key, trailing) {
  const info = dashLabel(key);
  const st = State.items[key].status;
  return `<button type="button" class="dash-row" data-goto="${key}">
    <span class="dash-row-ic st-${st}" aria-label="${STATUS_TEXT[st]}">${STATUS_ICON[st]}</span>
    <span class="dash-row-main"><span class="dash-row-label">${escapeHtml(info.label)}</span><span class="dash-row-meta">${escapeHtml(info.section)}</span></span>
    ${trailing || ''}
  </button>`;
}

function updateDashAttention() {
  const list = document.getElementById('dashAttn');
  const count = document.getElementById('dashAttnCount');
  if (!list) return;
  const crit = [], warn = [];
  SECTIONS.forEach((sec, si) => sec.items.forEach((_, ii) => {
    const k = `${si}-${ii}`, st = State.items[k] && State.items[k].status;
    if (st === 'crit') crit.push(k); else if (st === 'warn') warn.push(k);
  }));
  if (count) count.textContent = (crit.length || warn.length)
    ? [crit.length ? `${crit.length} crítico${crit.length > 1 ? 's' : ''}` : '', warn.length ? `${warn.length} em atenção` : ''].filter(Boolean).join(' · ')
    : '';
  let html;
  if (!crit.length && !warn.length) {
    html = `<div class="dash-empty">${State.doneItems()
      ? 'Nenhum item crítico ou em atenção até agora.'
      : 'Itens críticos e em atenção aparecem aqui conforme você avalia.'}</div>`;
  } else {
    html = crit.concat(warn).map(k => dashRow(k)).join('');
  }
  if (list._html !== html) { list._html = html; list.innerHTML = html; }
}

function updateDashSections() {
  const list = document.getElementById('dashSections');
  if (!list) return;
  const html = SECTIONS.map((sec, si) => {
    const s = State.sectionStats(si);
    const seg = (cls, n) => n ? `<i class="${cls}" style="flex:${n} 0 0"></i>` : '';
    const tip = `OK ${s.ok} · Atenção ${s.warn} · Crítico ${s.crit} · N/A ${s.na} · Pendentes ${s.pending}`;
    return `<button type="button" class="dash-sec" data-sec="${si}" title="${tip}" aria-label="${escapeHtml(sec.title)}: ${s.done} de ${s.total} avaliados. ${tip}">
      <span class="dash-sec-name">${escapeHtml(sec.title)}</span>
      <span class="dash-stack" aria-hidden="true">${seg('s-ok', s.ok)}${seg('s-warn', s.warn)}${seg('s-crit', s.crit)}${seg('s-na', s.na)}${seg('s-pending', s.pending)}</span>
      <span class="dash-sec-count">${s.done}/${s.total}</span>
    </button>`;
  }).join('');
  if (list._html !== html) { list._html = html; list.innerHTML = html; }
}

function updateDashActivity() {
  const list = document.getElementById('dashActivity');
  if (!list) return;
  const rows = [];
  Object.keys(State.items).forEach(k => { const it = State.items[k]; if (it.status && it.ts) rows.push([k, it]); });
  rows.sort((a, b) => String(b[1].ts).localeCompare(String(a[1].ts)));
  const html = rows.length
    ? rows.slice(0, 6).map(([k, it]) => {
        const time = new Date(it.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return dashRow(k, `<span class="dash-row-time">${STATUS_TEXT[it.status]} · ${time}</span>`);
      }).join('')
    : '<div class="dash-empty">As marcações mais recentes aparecem aqui.</div>';
  if (list._html !== html) { list._html = html; list.innerHTML = html; }
}

/* ---------- faixa de progresso: nota e atalho para o próximo passo ---------- */
function updateStrip() {
  const done = State.doneItems(), total = State.totalItems();
  const chip = document.getElementById('stripScore');
  if (chip) {
    const b = chip.querySelector('b'), g = chip.querySelector('.score-grade');
    if (b) b.textContent = done ? State.overallScore() : '—';
    if (g) { g.textContent = done ? State.grade() : '—'; g.className = 'score-grade' + (done ? ` grade-${State.grade().toLowerCase()}` : ''); }
    chip.hidden = !done;
    chip.title = done ? `Nota geral ${State.overallScore()} de 100 (conceito ${State.grade()})` : 'A nota aparece quando houver itens avaliados';
  }
  const btn = document.getElementById('stripNext');
  if (btn) {
    const pending = total - done;
    btn.dataset.mode = pending ? 'next' : 'save';
    btn.hidden = total === 0;
    const lg = btn.querySelector('.sn-long'), sh = btn.querySelector('.sn-short');
    if (lg) lg.textContent = pending ? 'Próximo pendente' : 'Revisar e salvar';
    if (sh) sh.textContent = pending ? 'Próximo' : 'Salvar';
    const kbd = btn.querySelector('kbd'); if (kbd) kbd.hidden = !pending;
  }
}

let dashRaf = 0;
document.addEventListener('ti:progress', () => {
  updateStrip();
  if (State.ui.currentTab !== -1 || dashRaf) return;
  dashRaf = requestAnimationFrame(() => { dashRaf = 0; updateDashboard(); });
});
document.addEventListener('click', e => {
  const b = e.target.closest('#stripNext');
  if (!b) return;
  if (b.dataset.mode === 'save') doSave(); else if (window.Flow) Flow.next();
});

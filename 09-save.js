/* Envio ao backend, salvamento automático e rascunho */

/* ESTADO DE SALVAMENTO — indicador discreto no topo do app.
   idle → dirty (editando) → draft (rascunho gravado neste aparelho)
   → syncing → synced (enviado) | queued (sem conexão, fica na fila) | error */
const SaveStatus = (() => {
  const LABEL = {
    idle: 'Sem alterações', dirty: 'Editando…', draft: 'Rascunho salvo',
    syncing: 'Sincronizando…', synced: 'Sincronizado', queued: 'Na fila de envio', error: 'Falha ao salvar'
  };
  const HINT = {
    idle: 'Nenhuma alteração nesta vistoria.',
    dirty: 'Alterações ainda não gravadas neste aparelho.',
    draft: 'Rascunho gravado neste aparelho. Use "Salvar vistoria" para enviar à planilha.',
    syncing: 'Enviando a vistoria para a planilha.',
    synced: 'Vistoria enviada para a planilha.',
    queued: 'Sem conexão com o servidor: o envio será refeito automaticamente quando a rede voltar.',
    error: 'Não foi possível gravar o rascunho neste aparelho (armazenamento cheio ou bloqueado).'
  };
  let state = 'idle', at = null;
  const hhmm = d => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  function render() {
    const el = document.getElementById('saveStatus'); if (!el) return;
    el.dataset.state = state;
    let label = LABEL[state];
    if (state === 'queued' && typeof loadPendingQueue === 'function') {
      const n = loadPendingQueue().length; if (n > 1) label += ` (${n})`;
    }
    const txt = el.querySelector('.ss-text'); if (txt) txt.textContent = label;
    const showTime = at && (state === 'draft' || state === 'synced');
    const tm = el.querySelector('.ss-time'); if (tm) tm.textContent = showTime ? hhmm(at) : '';
    el.title = HINT[state];
    el.setAttribute('aria-label', label + (showTime ? ' às ' + hhmm(at) : ''));
  }
  return {
    set(s) { if (!LABEL[s]) return; state = s; if (s === 'draft' || s === 'synced') at = new Date(); render(); },
    get() { return state; },
    render
  };
})();
/* SAVE TO POWER AUTOMATE / EXCEL */
function buildPayload() {
  const loja = document.getElementById('fLoja').value;
  const data = document.getElementById('fData').value;
  const resp = document.getElementById('fResp').value;
  const reg  = document.getElementById('fReg').value;
  const itens = [];
  const progresso = `${State.doneItems()}/${State.totalItems()}`;
  const score = State.overallScore();
  const salvoEm = new Date().toLocaleString('pt-BR');

  SECTIONS.forEach((sec, si) => {
    sec.items.forEach((item, ii) => {
      const st = State.items[`${si}-${ii}`];
      if (!st || !st.status) return;
      itens.push({
        loja: loja || '', data: data || '', responsavel: resp || '', regional: reg || '',
        secao: sec.title, item,
        status: st.status || '', quantidade: st.qty || '', observacao: st.obs || '',
        horario: st.ts ? new Date(st.ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : '',
        score, progresso, salvoEm
      });
    });
  });

  const impressoras = buildPrinterExportRows();

  return { itens, impressoras, score, progresso, salvoEm };
}


const OperationLock = (() => {
  const active = new Set();
  return {
    acquire(key) { if (active.has(key)) return false; active.add(key); return true; },
    release(key) { active.delete(key); },
    has(key) { return active.has(key); }
  };
})();

async function doSave() {
  if (!OperationLock.acquire('save')) return;
  const btn = document.getElementById('saveBtn');
  if (!btn) { OperationLock.release('save'); return; }
  const original = btn.innerHTML;
  btn.classList.add('loading');
  btn.innerHTML = `<svg class="save-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 0.8s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Salvando...`;

  const payload = buildPayload();
  try {
    localStorage.setItem('checklist-data', JSON.stringify(payload));
    persistSavedSubmission(payload, 'Salvo localmente');
  } catch (e) { console.warn('[Checklist TI] Cópia local indisponível:', e); }
  writeDraftNow();
  autoSavePrinters();

  if (!payload.itens.length && !payload.impressoras.length) {
    showToast('Nenhum item ou impressora preenchido para salvar.', 'error');
    btn.classList.remove('loading'); btn.innerHTML = original; OperationLock.release('save'); return;
  }

  const request = {
    action: 'saveChecklist',
    sheetName: 'Checklist TI Lojas',
    headers: buildSpreadsheetHeaders(),
    rows: buildChecklistRows(payload),
    printerSheetName: 'Impressoras',
    printerHeaders: buildPrinterSheetHeaders(),
    printerRows: buildPrinterRowsForSheet(),
    itens: payload.itens,
    impressoras: payload.impressoras,
    summary: buildEmailReportData().summary,
    savedBy: State.user.email || '',
    extras: window.Pro ? Pro.exportExtras() : undefined
  };

  SaveStatus.set('syncing');
  try {
    showToast('Sincronizando com a planilha...', 'info');
    await postBackend(request);
    cancelDraftWrite();
    localStorage.removeItem('checklist-draft');
    SaveStatus.set('synced');
    showToast(`Vistoria sincronizada: ${payload.itens.length} itens + ${payload.impressoras.length} impressora(s).`, 'success');
    maybeAutoSendEmailFromSave();
  } catch (e) {
    enqueuePendingSave(request);
    SaveStatus.set('queued');
    showToast('Sem conexão com o servidor. Dados salvos localmente e colocados na fila de sincronização.', 'error');
  } finally {
    btn.classList.remove('loading'); btn.innerHTML = original;
    OperationLock.release('save');
  }
}

/* AUTO SAVE (RASCUNHO LOCAL)
   Cada alteração marca o estado como "editando" e grava o rascunho 900 ms depois.
   O indicador no topo (SaveStatus) mostra o que está acontecendo com os dados. */
let draftTimer = null;
function writeDraftNow() {
  clearTimeout(draftTimer); draftTimer = null;
  try {
    const stateSnapshot = {};
    for (const key in State.items) {
      const s = State.items[key];
      stateSnapshot[key] = {status:s.status ?? null, qty:s.qty ?? '', obs:s.obs ?? '', ts:s.ts ?? null};
    }
    localStorage.setItem('checklist-draft', JSON.stringify({
      state: stateSnapshot,
      loja: document.getElementById('fLoja')?.value || '',
      data: document.getElementById('fData')?.value || '',
      resp: document.getElementById('fResp')?.value || '',
      reg: document.getElementById('fReg')?.value || '',
      savedAt: new Date().toISOString()
    }));
    SaveStatus.set('draft');
  } catch(e) { SaveStatus.set('error'); }
}
function autoSave() {
  SaveStatus.set('dirty');
  clearTimeout(draftTimer);
  draftTimer = setTimeout(writeDraftNow, 900);
}
function cancelDraftWrite() { clearTimeout(draftTimer); draftTimer = null; }

function restoreSession() {
  try {
    const raw = localStorage.getItem('checklist-draft');
    if (!raw) return;
    const draft = JSON.parse(raw);

    if (draft.loja) document.getElementById('fLoja').value = draft.loja;
    if (draft.data) document.getElementById('fData').value = draft.data;
    if (draft.resp) document.getElementById('fResp').value = draft.resp;
    if (draft.reg)  document.getElementById('fReg').value  = draft.reg;

    Object.keys(draft.state).forEach(key => {
      if (!State.items[key]) return;
      const s = draft.state[key];
      State.items[key] = s;

      const card = document.getElementById(`card-${key}`);
      if (!card) return;

      card.className = 'item-card';
      card.querySelectorAll('.status-btn').forEach(b => b.classList.remove('sel'));

      if (s.status) {
        const btn = card.querySelector(`[data-s="${s.status}"]`);
        if (btn) btn.classList.add('sel');
        card.classList.add(`has-${s.status}`);
        const det = document.getElementById(`det-${key}`);
        if (det) det.classList.add('open');
      }

      const qty = document.getElementById(`qty-${key}`);
      const obs = document.getElementById(`obs-${key}`);
      if (qty) qty.value = s.qty || '';
      if (obs) obs.value = s.obs || '';

      const tsEl = document.getElementById(`ts-${key}`);
      if (tsEl && s.ts) {
        const d = new Date(s.ts);
        tsEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${d.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}`;
      }
    });

    updateProgress();
    updateTabBadges();
    renderPrintersForSelectedStore();
    if (typeof refreshCtxSummary === 'function') refreshCtxSummary();
    document.getElementById('resumeBanner').classList.remove('show');
    SaveStatus.set('draft');
    showToast('Checklist restaurado!', 'success');
  } catch(e) {
    showToast('Erro ao restaurar. Iniciando novo.', 'error');
    dismissResume();
  }
}

function dismissResume() {
  localStorage.removeItem('checklist-draft');
  document.getElementById('resumeBanner').classList.remove('show');
}


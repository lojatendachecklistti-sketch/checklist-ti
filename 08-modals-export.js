/* Modais, e-mail, salvamentos, PDF e exportações */
/* MODALS */
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}

function openSettings() {
  document.getElementById('cfgUrl').value = localStorage.getItem(BACKEND_URL_KEY) || DEFAULT_URL;
  document.getElementById('cfgEmail').value = localStorage.getItem('cfg-email') || 'guilherme.silva@tendaatacado.com.br';
  openModal('settingsModal');
}

function saveSettings() {
  if (!State.user.isAdmin) { closeModal('settingsModal'); return; }
  const url = (document.getElementById('cfgUrl').value || '').trim();
  if (url && !/^https?:\/\//i.test(url)) { showToast('Informe uma URL válida para o backend.', 'error'); return; }
  if (url) localStorage.setItem(BACKEND_URL_KEY, url);
  else localStorage.removeItem(BACKEND_URL_KEY);
  localStorage.setItem('cfg-email', document.getElementById('cfgEmail').value || '');
  showToast('Configurações salvas!', 'success');
  setTimeout(() => closeModal('settingsModal'), 800);
}

function showExport() { openModal('exportModal'); }

let selectedEmailAttachments = [];
const EMAIL_HISTORY_KEY = 'checklist-email-history';
const EMAIL_AUTO_KEY = 'email-auto-send';
const SAVED_SUBMISSIONS_KEY = 'checklist-saved-submissions';

function loadEmailHistory() {
  try {
    const raw = localStorage.getItem(EMAIL_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveEmailHistory(list) {
  try { localStorage.setItem(EMAIL_HISTORY_KEY, JSON.stringify(list)); } catch (e) {}
}

function renderEmailHistory() {
  const wrap = document.getElementById('emailHistoryList');
  if (!wrap) return;
  const history = loadEmailHistory().slice(0, 6);
  if (!history.length) {
    wrap.innerHTML = '<div class="history-item"><strong>Nenhum envio registrado ainda.</strong><span>Os relatórios enviados aparecerão aqui.</span></div>';
    return;
  }
  wrap.innerHTML = history.map(item => `
    <div class="history-item">
      <strong>${item.to}</strong>
      <span>${item.subject}</span>
      <span>${item.timestamp}</span>
    </div>
  `).join('');
}

function openEmailModal() {
  const recipientsInput = document.getElementById('emailRecipients');
  const subjectInput = document.getElementById('emailSubject');
  const bodyInput = document.getElementById('emailBody');
  const autoInput = document.getElementById('emailAutoSend');
  const suggestionsWrap = document.getElementById('emailSuggestions');
  const list = document.getElementById('emailRecipientsList');
  const store = loadEmailHistory();
  const recentRecipients = store.map(item => item.to).filter(Boolean);
  const suggested = Array.from(new Set([
    State.user.email,
    'guilherme.silva@tendaatacado.com.br',
    'gestor.loja@tendaatacado.com.br',
    'supervisor.regional@tendaatacado.com.br',
    ...recentRecipients
  ].filter(Boolean)));

  suggestionsWrap.innerHTML = suggested.slice(0, 6).map(value => `<button type="button" class="email-pill" onclick="selectEmailRecipient('${value}')">${value}</button>`).join('');
  list.innerHTML = suggested.map(value => `<option value="${value}"></option>`).join('');

  const loja = document.getElementById('fLoja').value || 'Loja';
  const data = document.getElementById('fData').value || new Date().toLocaleDateString('pt-BR');
  const subject = `Checklist TI – ${loja} – ${data}`;
  recipientsInput.value = recentRecipients[0] || '';
  subjectInput.value = subject;
  bodyInput.value = `Segue o relatório do checklist TI da loja ${loja}. O anexo em PDF contém o resumo completo da inspeção.`;
  autoInput.checked = localStorage.getItem(EMAIL_AUTO_KEY) === '1';
  selectedEmailAttachments = [];
  renderEmailAttachmentPreview();
  renderEmailHistory();
  openModal('emailModal');
}

function selectEmailRecipient(value) {
  const input = document.getElementById('emailRecipients');
  input.value = value;
}

function handleEmailAttachmentSelection(files) {
  Array.from(files || []).forEach(file => {
    if (file.size > 8 * 1024 * 1024) {
      showToast(`${file.name} excede 8 MB e não foi anexado.`, 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = function() {
      const item = { name: file.name, dataUrl: reader.result, type: file.type || 'application/octet-stream' };
      if ((file.type || '').startsWith('image/')) {
        const img = new Image();
        img.onload = () => { item.aspect = { w: img.naturalWidth || 160, h: img.naturalHeight || 105 }; selectedEmailAttachments.push(item); renderEmailAttachmentPreview(); };
        img.onerror = () => { selectedEmailAttachments.push(item); renderEmailAttachmentPreview(); };
        img.src = reader.result;
      } else {
        selectedEmailAttachments.push(item);
        renderEmailAttachmentPreview();
      }
    };
    reader.readAsDataURL(file);
  });
}

function clearEmailAttachments() {
  selectedEmailAttachments = [];
  renderEmailAttachmentPreview();
}

function renderEmailAttachmentPreview() {
  const wrap = document.getElementById('emailAttachPreview');
  if (!wrap) return;
  if (!selectedEmailAttachments.length) {
    wrap.innerHTML = '';
    return;
  }
  wrap.innerHTML = selectedEmailAttachments.map(item => `<div class="mini-chip">${item.name}</div>`).join('');
}

function dataUriToBlob(dataUri) {
  const parts = dataUri.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
  const binary = atob(parts[1]);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
  return new Blob([array], { type: mime });
}

function previewEmailPdf() {
  const btn = document.getElementById('emailPreviewBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Gerando PDF...';
  }
  try {
    const dataUri = buildPdfReport();
    const blob = dataUriToBlob(dataUri);
    const url = URL.createObjectURL(blob);
    const previewWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (previewWindow) {
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
    showToast('PDF aberto para visualização.', 'success');
  } catch (e) {
    showToast('Não foi possível gerar a pré-visualização do PDF.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Pré-visualizar PDF';
    }
  }
}

function loadSavedSubmissions() {
  try {
    const raw = localStorage.getItem(SAVED_SUBMISSIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveSavedSubmissions(list) {
  try { localStorage.setItem(SAVED_SUBMISSIONS_KEY, JSON.stringify(list)); } catch (e) {}
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, match => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match]));
}

function persistSavedSubmission(payload, status = 'Salvo') {
  const summary = buildEmailReportData().summary;
  const record = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    loja: summary.loja,
    data: summary.data,
    responsavel: summary.responsavel,
    regional: summary.regional,
    status,
    notes: '',
    from: State.user.email || 'sem-login',
    summary,
    itens: payload.itens || []
  };
  const list = loadSavedSubmissions();
  list.unshift(record);
  saveSavedSubmissions(list.slice(0, 200));
  return record;
}

function updateSavedSubmission(id, updates) {
  const list = loadSavedSubmissions();
  const item = list.find(entry => entry.id === id);
  if (!item) return;
  Object.assign(item, updates);
  saveSavedSubmissions(list);
}

function renderSavedSubmissions() {
  const wrap = document.getElementById('savedSubmissionsList');
  if (!wrap) return;
  const list = loadSavedSubmissions();
  if (!list.length) {
    wrap.innerHTML = '<div class="history-item"><strong>Nenhum salvamento encontrado.</strong><span>Os registros aparecerão aqui quando houver novas vistorias salvas.</span></div>';
    return;
  }
  wrap.innerHTML = list.map(item => `
    <div class="history-item">
      <strong>${escapeHtml(item.loja || 'Sem loja')} · ${escapeHtml(item.data || '')}</strong>
      <span>${escapeHtml(item.responsavel || 'Sem responsável')} · ${escapeHtml(item.regional || '')}</span>
      <span>${escapeHtml(item.summary?.loja || '')} · conformidade ${escapeHtml(item.summary?.conformidade || 0)}% · ${escapeHtml(item.status || 'Salvo')}</span>
      <textarea id="notes-${item.id}" class="email-textarea" style="min-height:70px">${escapeHtml(item.notes || '')}</textarea>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <select id="status-${item.id}" class="email-input" style="flex:1;min-width:140px">
          <option value="Salvo" ${item.status === 'Salvo' ? 'selected' : ''}>Salvo</option>
          <option value="Enviado" ${item.status === 'Enviado' ? 'selected' : ''}>Enviado</option>
          <option value="Pendente" ${item.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
          <option value="Falha no envio" ${item.status === 'Falha no envio' ? 'selected' : ''}>Falha no envio</option>
        </select>
        <button type="button" class="cfg-save-btn" style="width:auto;padding:0 12px" onclick="saveSubmissionRecord('${item.id}')">Salvar</button>
        <button type="button" class="cfg-save-btn" style="width:auto;padding:0 12px;background:#2A5FAF" onclick="deleteSubmissionRecord('${item.id}')">Excluir</button>
      </div>
    </div>
  `).join('');
}

function saveSubmissionRecord(id) {
  const notesEl = document.getElementById(`notes-${id}`);
  const statusEl = document.getElementById(`status-${id}`);
  const list = loadSavedSubmissions();
  const item = list.find(entry => entry.id === id);
  if (!item) return;
  item.notes = notesEl ? notesEl.value : item.notes;
  item.status = statusEl ? statusEl.value : item.status;
  saveSavedSubmissions(list);
  renderSavedSubmissions();
  showToast('Registro atualizado.', 'success');
}

function deleteSubmissionRecord(id) {
  const list = loadSavedSubmissions().filter(entry => entry.id !== id);
  saveSavedSubmissions(list);
  renderSavedSubmissions();
  showToast('Registro removido.', 'info');
}

function openSavedSubmissionsModal() {
  if (!State.user.isAdmin) {
    showToast('Acesso restrito a administradores.', 'error');
    return;
  }
  renderSavedSubmissions();
  openModal('savesModal');
}

function getBackendUrl() {
  return (localStorage.getItem(BACKEND_URL_KEY) || document.getElementById('cfgUrl')?.value || DEFAULT_URL || '').trim();
}

/* Assinaturas da vistoria (técnico + gerente da loja), lidas do módulo Pro */
function getSignatureInfo() {
  const sg = (window.Pro && Pro._P && Pro._P.meta && Pro._P.meta.sig) || {};
  const tec = sg.inspetor || {}, ger = sg.loja || {};
  const fmt = (s) => s.nome ? `${s.nome}${s.cargo ? ' (' + s.cargo + ')' : ''}${s.png ? ' - assinado' : ' - sem assinatura'}` : '';
  return { tecnico: fmt(tec), gerente: fmt(ger) };
}

/* A primeira linha de cada nova vistoria carrega as assinaturas; as demais ficam em branco */
function buildChecklistRows(payload) {
  const sig = getSignatureInfo();
  return (payload.itens || []).map((item, i) => [
    item.loja, item.data, item.responsavel, item.regional, item.secao,
    item.item, item.status, item.quantidade, item.observacao,
    item.horario || '', item.score ?? '', item.progresso ?? '', item.salvoEm || '',
    i === 0 ? sig.tecnico : '', i === 0 ? sig.gerente : ''
  ]);
}

function buildSpreadsheetHeaders() {
  return ['Loja','Data','Responsável','Regional','Seção','Item','Status','Quantidade','Observação','Horário','Score','Progresso','Salvo em','Assinatura Técnico','Assinatura Gerente da Loja'];
}

function buildPrinterRowsForSheet() {
  return buildPrinterExportRows().map(item => [
    item.loja, item.data, item.responsavel, item.regional, item.serie,
    item.modelo, item.departamento, item.fornecedor, item.quantidade,
    item.status, item.observacao, item.horario || ''
  ]);
}

function buildPrinterSheetHeaders() {
  return ['Loja','Data','Responsável','Regional','S/N','Modelo','Departamento','Fornecedor','Impressões','Status','Observação','Horário'];
}

function getReportFilename(prefix='checklist') {
  const loja = (document.getElementById('fLoja')?.value || 'ti').trim().replace(/[^a-zA-Z0-9_-]+/g, '-');
  const data = (document.getElementById('fData')?.value || 'sem-data').trim().replace(/[^a-zA-Z0-9_-]+/g, '-');
  return `${prefix}-${loja}-${data}`;
}

function downloadCurrentChecklistPdf() {
  try {
    const dataUri = buildPdfReport();
    const blob = dataUriToBlob(dataUri);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${getReportFilename('checklist')}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    closeModal('exportModal');
    showToast('PDF gerado com a logo Tenda.', 'success');
  } catch (e) {
    console.error(e);
    showToast('Não foi possível gerar o PDF.', 'error');
  }
}

function loadPendingQueue() {
  try {
    const raw = localStorage.getItem(PENDING_QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) { return []; }
}

function savePendingQueue(list) {
  try { localStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(list.slice(-50))); } catch (e) {}
}

function enqueuePendingSave(payload) {
  const queue = loadPendingQueue();
  queue.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`, createdAt: new Date().toISOString(), payload });
  savePendingQueue(queue);
}

async function postBackend(payload) {
  const url = getBackendUrl();
  if (!url) throw new Error('BACKEND_URL_NOT_CONFIGURED');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = await response.text();
  try { return text ? JSON.parse(text) : {}; } catch (_) { return {}; }
}

async function retryPendingSaves() {
  const queue = loadPendingQueue();
  if (!queue.length) {
    showToast('Não há pendências para reenviar.', 'info');
    return;
  }
  let ok = 0;
  const remaining = [];
  for (const entry of queue) {
    try { await postBackend(entry.payload); ok++; }
    catch (e) { remaining.push(entry); }
  }
  savePendingQueue(remaining);
  if (typeof SaveStatus !== 'undefined') {
    if (remaining.length) SaveStatus.set('queued');
    else if (ok) SaveStatus.set('synced');
  }
  showToast(remaining.length ? `${ok} pendência(s) enviada(s); ${remaining.length} ainda aguardando.` : `${ok} pendência(s) enviada(s) com sucesso.`, remaining.length ? 'info' : 'success');
}

function importChecklistBackup() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(reader.result);
        if (!payload || !Array.isArray(payload.itens)) throw new Error('Formato inválido');
        localStorage.setItem('checklist-data', JSON.stringify(payload));
        if (Array.isArray(payload.impressoras)) {
          State.printers = Object.fromEntries(payload.impressoras.map((item, idx) => [item.key || `imported-${idx}`, {
            status: item.status || null,
            obs: item.observacao || '',
            ts: item.ts || null
          }]));
          localStorage.setItem(PRINTERS_DRAFT_KEY, JSON.stringify(State.printers));
        }
        showToast('Backup importado. Recarregue a página para aplicar todos os campos.', 'success');
      } catch (e) {
        showToast('Backup inválido ou corrompido.', 'error');
      }
    };
    reader.readAsText(file, 'utf-8');
  };
  input.click();
}

function buildEmailReportData() {
  const loja = document.getElementById('fLoja').value || 'Loja';
  const data = document.getElementById('fData').value || new Date().toLocaleDateString('pt-BR');
  const resp = document.getElementById('fResp').value || 'Responsável';
  const reg = document.getElementById('fReg').value || 'Regional';
  const now = new Date();
  const total = State.totalItems();
  const done = State.doneItems();
  const crit = State.countBy('crit');
  const warn = State.countBy('warn');
  const ok = State.countBy('ok');
  const pct = total ? Math.round((done / total) * 100) : 0;
  const printerRows = buildPrinterExportRows();
  const summary = {
    loja,
    data,
    responsavel: resp,
    regional: reg,
    total,
    concluido: done,
    conformidade: pct,
    crit,
    warn,
    ok,
    impressorasAvaliadas: printerRows.length,
    impressorasOk: printerRows.filter(p => p.status === 'ok').length,
    impressorasAtencao: printerRows.filter(p => p.status === 'warn').length,
    impressorasCriticas: printerRows.filter(p => p.status === 'crit').length,
    geradoEm: now.toLocaleString('pt-BR')
  };
  return { summary, rows: buildPayload().itens, printers: printerRows };
}

function addPdfHeader(doc, report) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(25, 74, 137);
  doc.roundedRect(28, 24, pageWidth - 56, 76, 12, 12, 'F');
  doc.setFillColor(239, 68, 68);
  doc.roundedRect(28, 88, pageWidth - 56, 12, 0, 0, 'F');
  try { doc.addImage(TENDA_LOGO_DATA_URL, 'PNG', 42, 34, 94, 60, undefined, 'FAST'); }
  catch (e) {
    doc.setFillColor(255,255,255);
    doc.roundedRect(46, 36, 86, 54, 8, 8, 'F');
    doc.setTextColor(25,74,137);
    doc.setFont('helvetica','bold'); doc.setFontSize(22); doc.text('Tenda', 54, 66);
  }
  doc.setTextColor(255,255,255);
  doc.setFont('helvetica','bold'); doc.setFontSize(13);
  doc.text('CHECKLIST TI', 150, 49);
  doc.setFont('helvetica','normal'); doc.setFontSize(9);
  doc.text(`Loja: ${report.summary.loja}`, 150, 63);
  doc.text(`Data: ${report.summary.data}`, 150, 75);
  doc.text(`Responsável: ${report.summary.responsavel}`, 150, 87);
}

function buildPdfReport() {
  const { jsPDF } = window.jspdf;
  const report = buildEmailReportData();
  const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 124;
  const pdfCtx = { pageWidth, pageHeight, newPage: () => { doc.addPage(); addPdfHeader(doc, report); return 124; } };

  addPdfHeader(doc, report);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Resumo Executivo', 40, y);
  y += 20;
  const metricTexts = [
    `Itens avaliados: ${report.summary.concluido}/${report.summary.total}`,
    `Conformidade: ${report.summary.conformidade}%`,
    `OK: ${report.summary.ok}`,
    `Atenção: ${report.summary.warn}`,
    `Crítico: ${report.summary.crit}`,
    `Impressoras avaliadas: ${report.summary.impressorasAvaliadas}`
  ];
  doc.setFont('helvetica','normal'); doc.setFontSize(10);
  metricTexts.forEach(text => { doc.text(text, 40, y); y += 14; });
  y += 10;

  const groups = {};
  SECTIONS.forEach((sec, si) => {
    groups[sec.title] = sec.items.map((item, ii) => {
      const st = State.items[`${si}-${ii}`];
      return { item, key: `${si}-${ii}`, status: st?.status || 'pending', qty: st?.qty || '', obs: st?.obs || '' };
    });
  });

  Object.entries(groups).forEach(([sectionTitle, items]) => {
    if (y > pageHeight - 90) { doc.addPage(); addPdfHeader(doc, report); y = 124; }
    doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(30,41,69);
    doc.text(sectionTitle, 40, y); y += 14;
    doc.setDrawColor(220,224,232); doc.line(40, y, pageWidth - 40, y); y += 10;

    items.forEach(itemData => {
      if (y > pageHeight - 82) { doc.addPage(); addPdfHeader(doc, report); y = 124; }
      const pending = itemData.status === 'pending' || !itemData.status;
      const statusLabel = pending ? 'PENDENTE' : itemData.status === 'ok' ? 'OK' : itemData.status === 'warn' ? 'ATENÇÃO' : itemData.status === 'crit' ? 'CRÍTICO' : 'N/A';
      const statusColor = pending ? [107,114,128] : itemData.status === 'ok' ? [22,163,74] : itemData.status === 'warn' ? [217,119,6] : itemData.status === 'crit' ? [220,38,38] : [107,114,128];
      doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(...statusColor); doc.text(statusLabel, 40, y);
      doc.setTextColor(15,23,42); doc.setFont('helvetica','normal'); doc.setFontSize(9);
      const titleText = `${itemData.item}${itemData.qty ? ` · Qtd: ${itemData.qty}` : ''}`;
      const lines = doc.splitTextToSize(titleText, 435); doc.text(lines, 112, y); y += Math.max(11, lines.length * 11);
      if (itemData.obs) {
        const obsLines = doc.splitTextToSize(`Observação: ${itemData.obs}`, 435);
        doc.setFontSize(8); doc.setTextColor(80,89,110); doc.text(obsLines, 112, y); y += Math.max(10, obsLines.length * 10);
      }
      if (window.ProPdf) y = ProPdf.afterItem(doc, itemData.key, y + 2, pdfCtx);
      y += 4;
    });
    y += 8;
  });

  if (report.printers.length) {
    if (y > pageHeight - 130) { doc.addPage(); addPdfHeader(doc, report); y = 124; }
    doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(30,41,69);
    doc.text('Vistoria de Impressoras', 40, y); y += 14;
    doc.setDrawColor(220,224,232); doc.line(40, y, pageWidth - 40, y); y += 10;
    report.printers.forEach(printer => {
      if (y > pageHeight - 82) { doc.addPage(); addPdfHeader(doc, report); y = 124; }
      const status = printer.status || 'pending';
      const label = status === 'ok' ? 'OK' : status === 'warn' ? 'ATENÇÃO' : status === 'crit' ? 'CRÍTICO' : 'PENDENTE';
      const color = status === 'ok' ? [22,163,74] : status === 'warn' ? [217,119,6] : status === 'crit' ? [220,38,38] : [107,114,128];
      doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(...color); doc.text(label, 40, y);
      doc.setTextColor(15,23,42); doc.setFont('helvetica','bold'); doc.setFontSize(9);
      const line = `S/N ${printer.serie || 'não informado'} — ${printer.modelo || 'modelo não informado'}${printer.departamento ? ` — ${printer.departamento}` : ''}`;
      doc.text(doc.splitTextToSize(line, 435), 112, y);
      y += 12;
      if (printer.observacao) {
        doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(80,89,110);
        const obsLines = doc.splitTextToSize(`Observação: ${printer.observacao}`, 435);
        doc.text(obsLines, 112, y); y += Math.max(10, obsLines.length * 10);
      }
      y += 4;
    });
  }

  if (selectedEmailAttachments.length) {
    const imageAttachments = selectedEmailAttachments.filter(item => (item.type || '').startsWith('image/'));
    if (imageAttachments.length) {
      if (y > pageHeight - 180) { doc.addPage(); addPdfHeader(doc, report); y = 124; }
      doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(30,41,69);
      doc.text('Imagens anexadas', 40, y); y += 18;
      imageAttachments.forEach(item => {
        if (y > pageHeight - 190) { doc.addPage(); addPdfHeader(doc, report); y = 124; }
        doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(15,23,42);
        doc.text(item.name, 40, y); y += 8;
        try {
          const type = item.type.includes('png') ? 'PNG' : 'JPEG';
          const dims = item.aspect || { w: 160, h: 105 };
          const maxW = 220, maxH = 135;
          const ratio = Math.min(maxW / dims.w, maxH / dims.h, 1);
          doc.addImage(item.dataUrl, type, 40, y, dims.w * ratio, dims.h * ratio);
          y += dims.h * ratio + 18;
        } catch (e) { doc.text('Imagem não pôde ser incluída.', 40, y + 14); y += 30; }
      });
    }
  }

  if (window.ProPdf) y = ProPdf.appendix(doc, report, y, pdfCtx);

  const pageCount = doc.internal.getNumberOfPages();
  for (let i=1;i<=pageCount;i++) {
    doc.setPage(i);
    doc.setDrawColor(230,232,236); doc.line(40, pageHeight - 42, pageWidth - 40, pageHeight - 42);
    doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(93,103,120);
    doc.text(`Tenda Atacado · Checklist TI · Gerado em ${report.summary.geradoEm}`, 40, pageHeight - 26);
    doc.text(`Página ${i}/${pageCount}`, pageWidth - 78, pageHeight - 26);
  }

  return doc.output('datauristring');
}

async function sendEmailReport() {
  if (!OperationLock.acquire('email')) return;
  const recipientsInput = document.getElementById('emailRecipients');
  const subjectInput = document.getElementById('emailSubject');
  const bodyInput = document.getElementById('emailBody');
  const autoInput = document.getElementById('emailAutoSend');
  const recipients = (recipientsInput.value || '').split(/[,;]+/).map(v => v.trim()).filter(Boolean);
  const subject = subjectInput.value || 'Checklist TI';
  const body = bodyInput.value || 'Segue o relatório do checklist TI.';

  if (!recipients.length) {
    showToast('Informe ao menos um destinatário.', 'error');
    return;
  }
  if (recipients.some(v => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))) {
    showToast('Revise os endereços de e-mail informados.', 'error');
    return;
  }

  const btn = document.getElementById('emailSendBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

  try {
    const dataUri = buildPdfReport();
    const attachments = selectedEmailAttachments.map(item => ({
      name: item.name,
      mimeType: item.type || 'application/octet-stream',
      base64: String(item.dataUrl || '').split(',')[1] || ''
    })).filter(item => item.base64);

    const payload = {
      action: 'sendEmailPdf',
      to: recipients,
      subject,
      body,
      pdfName: `${getReportFilename('checklist')}.pdf`,
      pdfBase64: dataUri.split(',')[1],
      summary: buildEmailReportData().summary,
      checklist: buildPayload(),
      attachments,
      sentBy: State.user.email || '',
      powerAutomateUrl: getBackendUrl()
    };

    const submission = persistSavedSubmission(buildPayload(), 'Enviando...');
    await postBackend(payload);

    updateSavedSubmission(submission.id, { status: 'Enviado' });
    const history = loadEmailHistory();
    history.unshift({
      to: recipients.join(', '),
      subject,
      timestamp: new Date().toLocaleString('pt-BR')
    });
    saveEmailHistory(history.slice(0, 12));
    renderEmailHistory();
    localStorage.setItem(EMAIL_AUTO_KEY, autoInput.checked ? '1' : '0');
    showToast('E-mail enviado com PDF e anexos.', 'success');
    closeModal('emailModal');
  } catch (e) {
    console.error(e);
    try { enqueuePendingSave({ action: 'sendEmailPdf', to: recipients, subject, body, pdfName: `${getReportFilename('checklist')}.pdf`, pdfBase64: buildPdfReport().split(',')[1], summary: buildEmailReportData().summary, checklist: buildPayload(), attachments: selectedEmailAttachments.map(item => ({ name: item.name, mimeType: item.type || 'application/octet-stream', base64: String(item.dataUrl || '').split(',')[1] || '' })).filter(item => item.base64), sentBy: State.user.email || '' }); } catch (_) {}
    showToast('Envio não concluído. O e-mail ficou em pendências para nova tentativa.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Enviar por E-mail'; }
    OperationLock.release('email');
  }
}

function maybeAutoSendEmailFromSave() {
  if (localStorage.getItem(EMAIL_AUTO_KEY) !== '1') return;
  const hasReproval = State.countBy('crit') + State.countBy('warn') > 0;
  if (!hasReproval) return;
  const recipientsInput = document.getElementById('emailRecipients');
  const subjectInput = document.getElementById('emailSubject');
  const bodyInput = document.getElementById('emailBody');
  if (!recipientsInput || !subjectInput || !bodyInput) return;
  recipientsInput.value = recipientsInput.value || State.user.email || 'guilherme.silva@tendaatacado.com.br';
  subjectInput.value = subjectInput.value || `Checklist TI – ${document.getElementById('fLoja').value || 'Loja'} – ${document.getElementById('fData').value || new Date().toLocaleDateString('pt-BR')}`;
  bodyInput.value = bodyInput.value || `Checklist com reprovações registrado. O PDF com o relatório completo segue em anexo.`;
  sendEmailReport();
}

/* IA removida da interface */
function openAI() {
  // IA removida da interface.
}

/* EXPORT */
function exportCSV() {
  const payload = buildPayload();
  const header = buildSpreadsheetHeaders();
  const rows = [header, ...buildChecklistRows(payload)];
  const printerRows = buildPrinterRowsForSheet();
  if (printerRows.length) {
    rows.push([]);
    rows.push(['VISTORIA DE IMPRESSORAS']);
    rows.push(buildPrinterSheetHeaders());
    rows.push(...printerRows);
  }
  const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a  = document.createElement('a');
  a.href = url; a.download = `${getReportFilename('vistoria')}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  closeModal('exportModal');
  showToast('CSV exportado com checklist e impressoras.', 'success');
}

function downloadCurrentChecklistExcel() {
  const payload = buildPayload();
  if (!payload.itens.length && !payload.impressoras.length) {
    showToast('Nenhum item preenchido para exportar.', 'error');
    return;
  }
  try {
    const wb = buildChecklistWorkbook(payload);
    const binary = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([binary], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${getReportFilename('vistoria')}.xlsx`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Excel gerado com abas Checklist e Impressoras.', 'success');
  } catch (err) {
    console.error(err);
    showToast('Erro ao gerar o arquivo Excel.', 'error');
  }
}

function buildChecklistWorkbook(payload) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([buildSpreadsheetHeaders(), ...buildChecklistRows(payload)]);
  ws['!cols'] = [12,12,24,18,22,48,12,14,55,12,10,14,20,30,34].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, 'Checklist');

  const printerData = [buildPrinterSheetHeaders(), ...buildPrinterRowsForSheet()];
  const printerWs = XLSX.utils.aoa_to_sheet(printerData);
  printerWs['!cols'] = [12,12,24,18,20,25,22,22,14,12,55,12].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, printerWs, 'Impressoras');
  return wb;
}

function buildChecklistExcelBase64(payload) {
  const wb = buildChecklistWorkbook(payload);
  return XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
}

async function sendCurrentChecklistExcel() {
  if (!OperationLock.acquire('excel-email')) return;
  const payload = buildPayload();
  const loja = document.getElementById('fLoja').value || 'Loja';
  const data = document.getElementById('fData').value || new Date().toLocaleDateString('pt-BR');
  if (!payload.itens.length && !payload.impressoras.length) {
    showToast('Nenhum dado preenchido para enviar.', 'error');
    OperationLock.release('excel-email'); return;
  }
  let excelBase64;
  try { excelBase64 = buildChecklistExcelBase64(payload); }
  catch (err) { showToast('Erro ao gerar a planilha Excel.', 'error'); OperationLock.release('excel-email'); return; }

  const request = {
    action: 'sendChecklistExcel',
    subject: `Checklist TI – ${loja} – ${data}`,
    body: `Segue a planilha Excel completa da vistoria de ${loja} em ${data}, com as abas Checklist e Impressoras.`,
    excelName: `${getReportFilename('vistoria')}.xlsx`,
    excelBase64,
    checklist: payload,
    loja, data,
    to: [localStorage.getItem('cfg-email') || document.getElementById('cfgEmail')?.value || 'guilherme.silva@tendaatacado.com.br']
  };
  try {
    showToast(`Enviando planilha para ${request.to[0]}...`, 'info');
    await postBackend(request);
    showToast('Planilha enviada com sucesso.', 'success');
    closeModal('exportModal');
  } catch (e) {
    enqueuePendingSave(request);
    showToast('Não foi possível enviar agora. A planilha ficou em pendências.', 'error');
  }
}

function exportJSON() {
  const payload = buildPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const loja = document.getElementById('fLoja').value || 'ti';
  const data = document.getElementById('fData').value || 'sem-data';
  a.href = url; a.download = `vistoria-${loja}-${data}.json`;
  a.click(); URL.revokeObjectURL(url);
  closeModal('exportModal');
  showToast('JSON exportado!', 'success');
}

function copyReport() {
  const loja  = document.getElementById('fLoja').value || 'N/A';
  const resp  = document.getElementById('fResp').value || 'N/A';
  const data  = document.getElementById('fData').value ? new Date(document.getElementById('fData').value + 'T12:00:00').toLocaleDateString('pt-BR') : 'N/A';
  const score = State.overallScore();
  const grade = State.grade();
  const done  = State.doneItems();
  const total = State.totalItems();
  const critC = State.countBy('crit');
  const warnC = State.countBy('warn');
  const okC   = State.countBy('ok');

  const critItems = [];
  SECTIONS.forEach((sec, si) => {
    sec.items.forEach((item, ii) => {
      if (State.items[`${si}-${ii}`]?.status === 'crit') critItems.push(`  • ${sec.title} → ${item}`);
    });
  });

  const text = `VISTORIA TI — TENDA ATACADO
==============================
Loja: ${loja}
Data: ${data}
Responsável: ${resp}

SCORE: ${score}/100 (${grade})
Progresso: ${done}/${total} itens (${State.pct()}%)

OK: ${okC}
Atenção: ${warnC}
Crítico: ${critC}

${critItems.length ? `ITENS CRÍTICOS:\n${critItems.join('\n')}` : 'Sem itens críticos.'}

Gerado em: ${new Date().toLocaleString('pt-BR')}`;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Resumo copiado!', 'success');
      closeModal('exportModal');
    });
  }
}


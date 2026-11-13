/* Catálogo e vistoria de impressoras */
const PRINTERS_FILE = 'impressoras 2026 1.xlsx';
let printersByStore = {};
let printersLoadState = 'loading';

function getStoreCode(storeName) {
  return String(storeName || '').trim().split(/\s+-\s+/)[0].toUpperCase();
}

function normalizePrinterRow(row) {
  const get = (...names) => {
    const key = Object.keys(row).find(k => names.includes(String(k).trim().toLowerCase()));
    const value = key ? row[key] : '';
    return value === 0 ? '' : String(value || '').trim(); 
  };
  return {
    serie: get('série', 'serie'), modelo: get('modelo'), loja: get('loja'),
    departamento: get('departamento'), fornecedor: get('fornecedor'),
    impressoes: get('impressões', 'impressoes'), obs: get('obs', 'observação', 'observacao')
  };
}

async function loadPrintersCatalog() {
  if (typeof XLSX === 'undefined') {
    printersLoadState = 'error'; renderPrintersForSelectedStore(); return;
  }
  try {
    const response = await fetch(encodeURI(PRINTERS_FILE), { cache: 'no-store' });
    if (!response.ok) throw new Error(`Arquivo não encontrado (${response.status})`);
    const workbook = XLSX.read(await response.arrayBuffer(), { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' }).map(normalizePrinterRow);
    printersByStore = rows.reduce((stores, printer) => {
      const code = getStoreCode(printer.loja);
      if (code) (stores[code] ||= []).push(printer);
      return stores;
    }, {});
    printersLoadState = 'ready';
  } catch (error) {
    console.error('Não foi possível carregar o cadastro de impressoras.', error);
    printersLoadState = 'error';
  }
  renderPrintersForSelectedStore();
}

function escapePrinterText(value) {
  return String(value || '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[char]);
}

function renderPrintersForSelectedStore() {
  const panel = document.getElementById('printersStorePanel');
  if (!panel) return;
  const store = document.getElementById('fLoja')?.value || '';
  const code = getStoreCode(store);
  const title = panel.querySelector('[data-printers-title]');
  const content = panel.querySelector('[data-printers-content]');
  const openBtn = document.getElementById('printersOpenBtn');
  if (openBtn) openBtn.disabled = !store;
  if (!store) {
    title.textContent = 'Selecione uma loja para consultar as impressoras';
    content.innerHTML = '<div class="printers-empty">Escolha a loja no topo do checklist.</div>';
    return;
  }
  title.textContent = `Impressoras cadastradas — ${code}`;
  if (printersLoadState === 'loading') {
    content.innerHTML = '<div class="printers-empty">Carregando cadastro de impressoras...</div>';
    return;
  }
  if (printersLoadState === 'error') {
    content.innerHTML = '<div class="printers-empty">Não foi possível carregar a planilha de impressoras.</div>';
    return;
  }
  
  
  const alternateCode = code.replace(/^TA/, 'CT');
  const printers = printersByStore[code] || printersByStore[alternateCode] || [];
  if (!printers.length) {
    content.innerHTML = `<div class="printers-empty">Nenhuma impressora cadastrada para ${escapePrinterText(code)}.</div>`;
    return;
  }
  content.innerHTML = `<div class="printers-count">${printers.length} equipamento${printers.length === 1 ? '' : 's'} encontrado${printers.length === 1 ? '' : 's'}</div>` + printers.map(printer => `
    <article class="printer-record">
      <div class="printer-record-main"><strong>S/N: ${escapePrinterText(printer.serie || 'não informado')}</strong><span>Obs: ${escapePrinterText(printer.obs || 'sem observação')}</span></div>
      <div class="printer-record-meta">${printer.departamento ? `<span>${escapePrinterText(printer.departamento)}</span>` : ''}${printer.modelo ? `<span>${escapePrinterText(printer.modelo)}</span>` : ''}${printer.fornecedor ? `<span>${escapePrinterText(printer.fornecedor)}</span>` : ''}${printer.impressoes ? `<span>${escapePrinterText(printer.impressoes)} impressões</span>` : ''}</div>
    </article>`).join('');
}

/* ================================================================
   TELA DE VISTORIA DE IMPRESSORAS (independente do checklist)
   ------------------------------------------------------------------
   Reaproveita: printersByStore / printersLoadState / getStoreCode /
   escapePrinterText / normalizePrinterRow / loadPrintersCatalog
   (nenhuma dessas funções é duplicada ou substituída).
   Organização: ESTADO → DADOS → RENDERIZAÇÃO → NAVEGAÇÃO →
   PERSISTÊNCIA → EXPORTAÇÃO.
   ================================================================ */

/* ---- ESTADO da tela ---- */
const PRINTERS_DRAFT_KEY = 'ti-printers-vistoria';
const printersScreenUi = { search: '', storeCode: '', printers: [] };

/* ---- DADOS: identificação/observação por impressora ---- */
// Usa o número de série como identificador; se a impressora não tiver
// série informada, usa um identificador estável baseado na loja +
// modelo + posição na lista, para nunca colidir com outra impressora.
function getPrinterKey(printer, index) {
  if (printer.serie) return printer.serie;
  return `${getStoreCode(printer.loja)}__${printer.modelo || 'sem-modelo'}__${index}`;
}

function getPrinterState(key) {
  if (!State.printers[key]) {
    State.printers[key] = { status: null, obs: '', ts: null };
  }
  return State.printers[key];
}

/* ---- NAVEGAÇÃO: Checklist ⇄ Tela de Impressoras ---- */
function openPrintersScreen() {
  const store = document.getElementById('fLoja')?.value || '';
  if (!store) {
    showToast('Selecione uma loja antes de abrir a vistoria de impressoras.', 'error');
    return;
  }
  const screen = document.getElementById('printersScreen');
  if (!screen) return;

  printersScreenUi.storeCode = getStoreCode(store);
  printersScreenUi.search = '';
  const searchInput = document.getElementById('printersScreenSearch');
  if (searchInput) searchInput.value = '';
  const clearBtn = document.getElementById('printersScreenSearchClear');
  if (clearBtn) clearBtn.style.display = 'none';

  const storeLabel = document.getElementById('printersScreenStoreLabel');
  if (storeLabel) storeLabel.textContent = `Loja: ${store}`;

  screen.classList.add('open');
  screen.setAttribute('aria-hidden', 'false');
  document.getElementById('app')?.setAttribute('inert', '');

  renderPrintersScreen();
}

function closePrintersScreen() {
  const screen = document.getElementById('printersScreen');
  if (!screen) return;
  screen.classList.remove('open');
  screen.setAttribute('aria-hidden', 'true');
  document.getElementById('app')?.removeAttribute('inert');
  // O estado do checklist (State.items, campos fLoja/fData/fResp/fReg,
  // aba atual, progresso) nunca é tocado por esta função — o checklist
  // continua exatamente como estava antes da navegação.
}

/* ---- RENDERIZAÇÃO ---- */
function filterPrinters(query) {
  printersScreenUi.search = String(query || '');
  const clearBtn = document.getElementById('printersScreenSearchClear');
  if (clearBtn) clearBtn.style.display = printersScreenUi.search ? 'flex' : 'none';
  renderPrintersScreen();
}

function clearPrintersSearch() {
  const searchInput = document.getElementById('printersScreenSearch');
  if (searchInput) searchInput.value = '';
  filterPrinters('');
}

function renderPrintersScreen() {
  const body = document.getElementById('printersScreenBody');
  const countEl = document.getElementById('printersScreenCount');
  if (!body) return;

  const code = printersScreenUi.storeCode;

  if (printersLoadState === 'loading') {
    body.innerHTML = '<div class="printers-grid" aria-busy="true" aria-label="Carregando impressoras">' +
    Array.from({ length: 6 }, () => '<div class="printer-skel"><div class="skeleton w55"></div><div class="skeleton w80"></div><div class="skeleton w100"></div></div>').join('') + '</div>';
    if (countEl) countEl.textContent = '';
    return;
  }
  if (printersLoadState === 'error') {
    body.innerHTML = '<div class="printers-screen-state"><p>Não foi possível carregar o cadastro de impressoras.</p><button type="button" class="btn btn-secondary" id="printersRetry">Tentar de novo</button></div>';
    document.getElementById('printersRetry')?.addEventListener('click', () => { printersLoadState = 'loading'; renderPrintersForSelectedStore(); loadPrintersCatalog(); });
    if (countEl) countEl.textContent = '';
    return;
  }

  const alternateCode = code.replace(/^TA/, 'CT');
  const allPrinters = printersByStore[code] || printersByStore[alternateCode] || [];
  printersScreenUi.printers = allPrinters;

  if (!allPrinters.length) {
    body.innerHTML = '<div class="printers-screen-state">Nenhuma impressora encontrada para esta loja.</div>';
    if (countEl) countEl.textContent = '0 impressoras encontradas';
    return;
  }

  const q = printersScreenUi.search.trim().toLowerCase();
  const filtered = !q ? allPrinters : allPrinters.filter(p =>
    (p.serie || '').toLowerCase().includes(q) ||
    (p.modelo || '').toLowerCase().includes(q) ||
    (p.departamento || '').toLowerCase().includes(q) ||
    (p.fornecedor || '').toLowerCase().includes(q)
  );

  if (countEl) {
    countEl.textContent = `${allPrinters.length} impressora${allPrinters.length === 1 ? '' : 's'} encontrada${allPrinters.length === 1 ? '' : 's'}`;
  }

  if (!filtered.length) {
    body.innerHTML = '<div class="printers-screen-state">Nenhuma impressora corresponde à pesquisa.</div>';
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'printers-grid';
  filtered.forEach((printer, idx) => {
    const key = getPrinterKey(printer, allPrinters.indexOf(printer) !== -1 ? allPrinters.indexOf(printer) : idx);
    grid.appendChild(renderPrinterCard(printer, key));
  });
  body.innerHTML = '';
  body.appendChild(grid);
}

function renderPrinterCard(printer, key) {
  const s = getPrinterState(key);
  const card = document.createElement('article');
  card.className = 'printer-card';
  if (s.status) card.classList.add(`has-${s.status}`);
  card.id = `printer-card-${escapePrinterText(key)}`;

  const chips = [
    printer.departamento,
    printer.modelo,
    printer.fornecedor,
    printer.impressoes ? `${printer.impressoes} impressões` : ''
  ].filter(Boolean);

  card.innerHTML = `
    <div class="printer-card-top">
      <div class="printer-card-serial">S/N: ${escapePrinterText(printer.serie || 'não informado')}</div>
      <div class="printer-card-status-group" role="group" aria-label="Status da impressora">
        ${statusButtonsHtml('printer-status-btn', s => `data-key="${escapePrinterText(key)}" data-s="${s}"`, s.status)}
      </div>
    </div>
    <div class="printer-card-chips">${chips.map(c => `<span class="printer-chip">${escapePrinterText(c)}</span>`).join('')}</div>
    <div>
      <label class="printer-card-obs-label">Observação</label>
      <textarea class="printer-obs-input" aria-label="Observação da impressora" placeholder="Digite aqui a observação desta impressora..."></textarea>
    </div>`;

  const textarea = card.querySelector('.printer-obs-input');
  textarea.value = s.obs || '';
  textarea.addEventListener('input', debounce(e => {
    updatePrinterObservation(key, e.target.value);
  }, 300));

  card.querySelectorAll('.printer-status-btn').forEach(btn => {
    btn.addEventListener('click', () => handlePrinterStatusClick(key, btn.dataset.s, card));
  });

  return card;
}

function handlePrinterStatusClick(key, newStatus, cardEl) {
  const s = getPrinterState(key);
  const same = s.status === newStatus;
  s.status = same ? null : newStatus;
  s.ts = s.status ? new Date().toISOString() : null;

  const card = cardEl || document.getElementById(`printer-card-${key}`);
  if (card) {
    card.classList.remove('has-ok', 'has-warn', 'has-crit', 'has-na');
    if (s.status) card.classList.add(`has-${s.status}`);
    card.querySelectorAll('.printer-status-btn').forEach(b => {
      b.classList.toggle('sel', b.dataset.s === s.status);
      b.setAttribute('aria-pressed', b.dataset.s === s.status ? 'true' : 'false');
    });
  }

  autoSavePrinters();
}

/* ---- PERSISTÊNCIA das observações/status da vistoria ----
   As observações NUNCA são gravadas de volta na planilha original —
   ela continua sendo somente a fonte de cadastro. O que o usuário
   digita fica em State.printers e é espelhado no localStorage para
   sobreviver a trocas de aba, volta ao checklist e atualizações da
   página, sem interferir no rascunho (checklist-draft) já existente. */
function updatePrinterObservation(key, value) {
  const s = getPrinterState(key);
  s.obs = value;
  s.ts = new Date().toISOString();
  autoSavePrinters();
}

const autoSavePrinters = debounce(() => {
  try {
    localStorage.setItem(PRINTERS_DRAFT_KEY, JSON.stringify(State.printers));
  } catch (e) {}
}, 400);

function restorePrintersDraft() {
  try {
    const raw = localStorage.getItem(PRINTERS_DRAFT_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved && typeof saved === 'object') {
      State.printers = saved;
    }
  } catch (e) {}
}

/* ---- EXPORTAÇÃO: integra a vistoria de impressoras ao relatório ----
   Gera linhas no MESMO formato usado pelo restante do checklist
   (loja, data, responsavel, regional, secao, item, status,
   quantidade, observacao), para que CSV/Excel/JSON/e-mail/PDF
   continuem funcionando sem qualquer alteração adicional. */
function buildPrinterExportRows() {
  const loja = document.getElementById('fLoja')?.value || '';
  const data = document.getElementById('fData')?.value || '';
  const resp = document.getElementById('fResp')?.value || '';
  const reg  = document.getElementById('fReg')?.value || '';
  const code = getStoreCode(loja);
  const alternateCode = code.replace(/^TA/, 'CT');
  const printers = printersByStore[code] || printersByStore[alternateCode] || [];

  return printers.map((printer, idx) => {
    const key = getPrinterKey(printer, idx);
    const s = State.printers[key] || {};
    if (!s.status && !s.obs) return null; // só inclui impressoras já avaliadas na vistoria
    return {
      loja: loja || '',
      data: data || '',
      responsavel: resp || '',
      regional: reg || '',
      secao: 'Impressoras',
      item: `S/N ${printer.serie || 'não informado'} — ${printer.modelo || ''}`.trim(),
      status: s.status || '',
      quantidade: printer.impressoes || '',
      observacao: s.obs || '',
      // campos extras usados no relatório detalhado de impressoras
      serie: printer.serie || '',
      modelo: printer.modelo || '',
      departamento: printer.departamento || '',
      fornecedor: printer.fornecedor || ''
    };
  }).filter(Boolean);
}


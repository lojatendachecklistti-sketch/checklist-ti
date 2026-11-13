/* Painel de administração das seções */
/* PAINEL DE ADMINISTRAÇÃO (edição de seções pela tela, sem tocar no código) */
function updateAdminUI() {
  const isAdmin = !!State.user.isAdmin;
  const btn = document.getElementById('adminBtn');
  const badge = document.getElementById('adminBadge');
  if (btn) btn.style.display = isAdmin ? '' : 'none';
  if (badge) badge.style.display = isAdmin ? '' : 'none';
  document.body.classList.toggle('is-admin', isAdmin);
}

function openAdminPanel() {
  if (!State.user.isAdmin) return;
  adminCancelEdit();
  renderAdminSectionsList();
  renderAdminExtraList();
  openModal('adminModal');
}

function renderAdminSectionsList() {
  const wrap = document.getElementById('adminSectionsList');
  if (!wrap) return;
  wrap.innerHTML = '';
  SECTIONS.forEach((sec, si) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--surface-2,rgba(255,255,255,0.04));border-radius:10px';
    row.innerHTML = `
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600">${sec.title}</div>
        <div style="font-size:11px;color:var(--text-muted)">${sec.items.length} itens</div>
      </div>
      <button type="button" class="icon-btn" title="Editar seção" aria-label="Editar seção ${sec.title}" onclick="adminEditSection(${si})">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button type="button" class="icon-btn" title="Excluir seção" aria-label="Excluir seção ${sec.title}" style="color:var(--crit)" onclick="adminDeleteSection(${si})">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
      </button>`;
    wrap.appendChild(row);
  });
}

/* Índice da seção em edição no formulário (null = modo "criar nova seção") */
let adminEditIndex = null;

function adminEditSection(si) {
  const sec = SECTIONS[si];
  if (!sec) return;
  adminEditIndex = si;

  document.getElementById('adminNewSectionTitle').value = sec.title;
  document.getElementById('adminNewSectionItems').value = sec.items.join('\n');
  document.getElementById('adminFormLabel').textContent = `Editando "${sec.title}"`;
  document.getElementById('adminFormSaveBtn').innerHTML = 'Salvar alterações';
  document.getElementById('adminFormCancelBtn').style.display = '';

  document.getElementById('adminNewSectionTitle').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function adminCancelEdit() {
  adminEditIndex = null;
  document.getElementById('adminNewSectionTitle').value = '';
  document.getElementById('adminNewSectionItems').value = '';
  document.getElementById('adminFormLabel').textContent = 'Nova seção';
  document.getElementById('adminFormSaveBtn').innerHTML = 'Adicionar Seção';
  document.getElementById('adminFormCancelBtn').style.display = 'none';
}

function adminSaveSection() {
  const titleEl = document.getElementById('adminNewSectionTitle');
  const itemsEl = document.getElementById('adminNewSectionItems');
  const title = (titleEl.value || '').trim();
  const items = (itemsEl.value || '').split('\n').map(s => s.trim()).filter(Boolean);

  if (!title) { showToast('Digite um nome para a seção', 'error'); return; }
  if (!items.length) { showToast('Adicione pelo menos um item', 'error'); return; }

  if (adminEditIndex !== null) {
    // Editando seção existente: mantém o id, atualiza título e itens
    const sec = SECTIONS[adminEditIndex];
    if (!confirm(`Salvar alterações em "${sec.title}"? O progresso da vistoria atual será reiniciado.`)) return;
    sec.title = title;
    sec.items = items;
    saveSections();
    adminCancelEdit();
    renderAdminSectionsList();
    rebuildApp();
    showToast(`Seção "${title}" atualizada`, 'success');
    return;
  }

  const id = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `sec-${Date.now()}`;
  SECTIONS.push({ id, title, items });
  saveSections();

  titleEl.value = '';
  itemsEl.value = '';
  renderAdminSectionsList();
  rebuildApp();
  showToast(`Seção "${title}" adicionada`, 'success');
}

function adminDeleteSection(si) {
  const sec = SECTIONS[si];
  if (!sec) return;
  if (!confirm(`Excluir a seção "${sec.title}"? O progresso da vistoria atual será reiniciado.`)) return;

  SECTIONS.splice(si, 1);
  saveSections();
  renderAdminSectionsList();
  rebuildApp();
  showToast(`Seção "${sec.title}" removida`, 'info');
}

function adminResetSections() {
  if (!confirm('Restaurar as seções padrão do sistema? Suas seções personalizadas serão perdidas e o progresso da vistoria atual será reiniciado.')) return;
  SECTIONS = JSON.parse(JSON.stringify(DEFAULT_SECTIONS));
  saveSections();
  renderAdminSectionsList();
  rebuildApp();
  showToast('Seções padrão restauradas', 'info');
}

function renderAdminExtraList() {
  const wrap = document.getElementById('adminExtraList');
  if (!wrap) return;
  wrap.innerHTML = '';
  const extras = loadExtraAdmins();
  if (!extras.length) {
    wrap.innerHTML = `<div class="cfg-hint">Nenhum administrador extra cadastrado.</div>`;
    return;
  }
  extras.forEach(email => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--surface-2,rgba(255,255,255,0.04));border-radius:10px';
    row.innerHTML = `
      <div style="flex:1;min-width:0;font-size:12px;word-break:break-all">${email}</div>
      <button type="button" class="icon-btn" title="Remover administrador" aria-label="Remover ${email}" style="color:var(--crit)" onclick="adminRemoveEmail('${email.replace(/'/g, "\\'")}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>`;
    wrap.appendChild(row);
  });
}

function adminAddEmail() {
  const el = document.getElementById('adminNewEmail');
  const email = (el.value || '').trim().toLowerCase();
  if (!email || !email.includes('@')) { showToast('Digite um e-mail válido', 'error'); return; }

  const extras = loadExtraAdmins();
  if (getAllAdminEmails().includes(email)) { showToast('Este e-mail já é administrador', 'info'); el.value = ''; return; }

  extras.push(email);
  saveExtraAdmins(extras);
  el.value = '';
  renderAdminExtraList();
  showToast(`${email} agora é administrador`, 'success');

  // Se for o usuário logado agora, atualiza a UI dele na hora
  if (State.user.email === email) {
    State.user.isAdmin = true;
    sessionStorage.setItem('ti-user', JSON.stringify(State.user));
    updateAdminUI();
  }
}

function adminRemoveEmail(email) {
  if (!confirm(`Remover ${email} da lista de administradores?`)) return;
  const extras = loadExtraAdmins().filter(e => e !== email);
  saveExtraAdmins(extras);
  renderAdminExtraList();
  showToast('Administrador removido', 'info');
}


/* Login/logout Microsoft, toast, atalhos de teclado e inicialização */
/* LOGIN / LOGOUT (Microsoft / Entra ID via MSAL) */
function doMsLogin() {
  const errEl = document.getElementById('loginError');
  const btn   = document.getElementById('loginBtn');
  errEl.textContent = '';

  if (!isMsalConfigured()) {
    errEl.textContent = 'Login Microsoft ainda não configurado. Veja as instruções no código (CLIENT_ID / TENANT_ID).';
    return;
  }

  const pca = getMsalInstance();
  if (!pca) {
    console.error('[MSAL] Biblioteca não carregada. typeof msal =', typeof msal, '| isMsalConfigured =', isMsalConfigured());
    errEl.textContent = 'Não foi possível carregar a biblioteca de login da Microsoft (msal.js). Recarregue a página (puxe para atualizar) e tente de novo. Se persistir, pode ser bloqueio de rede/extensão do navegador.';
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Conectando…';

  pca.loginRedirect({
    scopes: ["User.Read"],
    prompt: "select_account"
  }).catch(err => {
    btn.disabled = false;
    btn.innerHTML = 'Entrar com Microsoft';
    errEl.textContent = 'Não foi possível iniciar o login: ' + (err?.errorMessage || err?.message || 'erro desconhecido.');
  });
}

function applyMsAccount(account) {
  const email = (account.username || '').toLowerCase();
  const name  = account.name || email.split('@')[0];

  // Restringe aos domínios corporativos permitidos (ver MSAL_CONFIG.allowedDomains)
  const domains = MSAL_CONFIG.allowedDomains || [];
  const isAllowed = domains.length === 0 || domains.some(d => email.endsWith('@' + d.toLowerCase()));
  if (!isAllowed) {
    const errEl = document.getElementById('loginError');
    if (errEl) errEl.textContent = `Acesso restrito a contas @${domains.join(' ou @')}. Você entrou com ${email}.`;
    getMsalInstance()?.logoutRedirect({ postLogoutRedirectUri: MSAL_CONFIG.redirectUri });
    return false;
  }

  State.user = { email, name, isAdmin: isAdminEmail(email) };
  sessionStorage.setItem('ti-user', JSON.stringify(State.user));
  document.getElementById('loginPage').classList.add('hidden');
  openApp();
  return true;
}

function openApp() {
  const app = document.getElementById('app');
  app.style.display = 'grid';
  if (window.MotionFX) MotionFX.enterApp();
  requestAnimationFrame(() => app.classList.add('visible'));

  document.getElementById('brandUser').textContent = State.user.email;
  updateAdminUI();

  const nameVal = State.user.name || State.user.email.split('@')[0].replace(/\./g, ' ');
  const respEl  = document.getElementById('fResp');
  if (respEl && !respEl.value) {
    respEl.value = nameVal.replace(/(^|[\s.\-'])(\p{L})/gu, (m, sep, c) => sep + c.toUpperCase());
  }

  // Check for draft
  try {
    const raw = localStorage.getItem('checklist-draft');
    if (raw) {
      const draft = JSON.parse(raw);
      const d = new Date(draft.savedAt);
      const diffH = (Date.now() - d.getTime()) / 3600000;
      if (diffH < 24 && draft.loja) {
        const banner = document.getElementById('resumeBanner');
        const textEl = document.getElementById('resumeText');
        const time   = d.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
        textEl.textContent = `Checklist em andamento: ${draft.loja} · ${time}`;
        banner.classList.add('show');
      }
    }
  } catch(e) {}
}

function doLogout() {
  if (!confirm('Deseja sair? O rascunho local será mantido.')) return;
  sessionStorage.removeItem('ti-user');
  State.user = { email: '', name: '', isAdmin: false };
  updateAdminUI();

  const app = document.getElementById('app');
  app.classList.remove('visible');
  setTimeout(() => {
    app.style.display = 'none';
    const lp = document.getElementById('loginPage');
    lp.classList.remove('hidden');
    document.getElementById('loginError').textContent = '';
    const btn = document.getElementById('loginBtn');
    btn.disabled = false;
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg> Entrar com Microsoft`;
  }, 350);

  const pca = getMsalInstance();
  if (pca) {
    pca.logoutRedirect({ postLogoutRedirectUri: MSAL_CONFIG.redirectUri });
  }
}

/* TOAST */
function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const P = (d) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const icons = {
    success: P('<circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>'),
    error: P('<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>'),
    info: P('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>')
  };
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span class="toast-text">${msg}</span>`;

  container.insertBefore(toast, container.firstChild);
  setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 3600);
}


const emailAttachmentInput = document.getElementById('emailAttachments');
if (emailAttachmentInput) {
  emailAttachmentInput.addEventListener('change', function(e) {
    handleEmailAttachmentSelection(e.target.files);
    e.target.value = '';
  });
}

const emailOpenBtn = document.getElementById('openEmailModalBtn');
if (emailOpenBtn) {
  emailOpenBtn.addEventListener('click', openEmailModal);
}
const emailSendBtn = document.getElementById('emailSendBtn');
if (emailSendBtn) {
  emailSendBtn.addEventListener('click', sendEmailReport);
}
const emailPreviewBtn = document.getElementById('emailPreviewBtn');
if (emailPreviewBtn) {
  emailPreviewBtn.addEventListener('click', previewEmailPdf);
}

/* BACKDROP CLICK TO CLOSE */
document.querySelectorAll('.modal-backdrop').forEach(el => {
  el.addEventListener('click', function(e) {
    if (e.target === this) closeModal(this.id);
  });
});

/* KEYBOARD */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (window.Palette && Palette.isOpen()) return; // a paleta trata o próprio Esc
    document.querySelectorAll('.modal-backdrop.open').forEach(m => closeModal(m.id));
    if (State.ui.searchOpen) toggleSearch();
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if (window.Palette) Palette.toggle(); else toggleSearch();
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault(); doSave();
  }
});

/* BOOT */
(function boot() {
  // Set today's date
  const dateEl = document.getElementById('fData');
  if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];


  // URL do fluxo é fixa (DEFAULT_URL) — não há mais override por dispositivo

  // Build UI
  if (window.SplashFX) SplashFX.step(24, 'Preparando o checklist…');
  restorePrintersDraft();
  buildUI();
  if (window.SplashFX) SplashFX.step(52, 'Carregando impressoras…');
  Promise.resolve(loadPrintersCatalog()).catch(function(){}).then(function(){
    if (window.SplashFX) SplashFX.step(76, 'Verificando sessão…');
  });

  function finishBoot() {
    if (window.SplashFX && !finishBoot._go) { finishBoot._go = true; SplashFX.done(finishBoot); return; }
    const splash = document.getElementById('splash');
    splash.classList.add('hidden');

    // 1) Sessão já aberta nesta aba (sessionStorage)
    const saved = sessionStorage.getItem('ti-user');
    if (saved) {
      try {
        State.user = JSON.parse(saved);
        document.getElementById('loginPage').classList.add('hidden');
        openApp();
        return;
      } catch(e) { /* cai para verificar conta MSAL */ }
    }

    // 2) Conta Microsoft já autenticada no navegador (cache do MSAL)
    const pca = getMsalInstance();
    if (pca) {
      const accounts = pca.getAllAccounts();
      if (accounts.length > 0) {
        if (applyMsAccount(accounts[0])) return;
      }
    }

    showLoginPage();
  }

  function showLoginPage() {
    const lp = document.getElementById('loginPage');
    lp.classList.remove('hidden');
  }

  // Aguarda o MSAL processar o retorno do login (loginRedirect) antes de
  // decidir se mostra a tela de login ou já abre o app.
  {
    const pca = getMsalInstance();
    if (pca) {
      pca.handleRedirectPromise()
        .then(response => {
          if (response?.account) applyMsAccount(response.account);
        })
        .catch(err => {
          const errEl = document.getElementById('loginError');
          if (errEl) errEl.textContent = 'Falha no login Microsoft: ' + (err?.errorMessage || err?.message || 'erro desconhecido.');
        })
        .finally(finishBoot);
    } else {
      finishBoot();
    }
  }
})();

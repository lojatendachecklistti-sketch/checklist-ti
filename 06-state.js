/* Administradores e estado global (State) */
/* ADMINISTRADORES — guilherme.silva é admin fixo (definido no código).
   Outros e-mails podem ser adicionados pelo próprio app (ver ADMIN_EXTRA_KEY)
   por quem já é administrador, sem precisar editar o código. */
const ADMIN_EMAILS_BASE = ["guilherme.silva@tendaatacado.com.br"];
const ADMIN_EXTRA_KEY = 'ti-admin-extra';

function loadExtraAdmins() {
  try {
    const raw = localStorage.getItem(ADMIN_EXTRA_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch(e) { return []; }
}

function saveExtraAdmins(list) {
  try { localStorage.setItem(ADMIN_EXTRA_KEY, JSON.stringify(list)); } catch(e) {}
}

function getAllAdminEmails() {
  return [...ADMIN_EMAILS_BASE, ...loadExtraAdmins()];
}

function isAdminEmail(email) {
  return getAllAdminEmails().includes((email || '').toLowerCase());
}

/* STATE */
const State = {
  items: {},       // "si-ii" → { status, qty, obs, ts }
  printers: {},    // chave (serie ou fallback) → { status, obs, ts }
  ui: {
    currentTab: 0,
    searchQuery: '',
    activeFilter: 'all',
    dashboardOpen: false,
    searchOpen: false,
    initialized: false,
  },
  user: { email: '', name: '', isAdmin: false },
  draft: null,

  totalItems() { return Object.keys(this.items).length; },
  doneItems()  { return Object.values(this.items).filter(v => v.status !== null).length; },
  countBy(s)   { return Object.values(this.items).filter(v => v.status === s).length; },
  pct()        { const t = this.totalItems(); return t ? Math.round(this.doneItems() / t * 100) : 0; },

  /* Contagens de uma seção (usadas por abas, cabeçalho, rodapé, dashboard e paleta). */
  sectionStats(si) {
    const s = { total: 0, done: 0, ok: 0, warn: 0, crit: 0, na: 0, pending: 0, pct: 0 };
    const sec = SECTIONS[si];
    if (!sec) return s;
    sec.items.forEach((_, ii) => {
      const st = this.items[`${si}-${ii}`]?.status;
      s.total++;
      if (st) { s.done++; s[st]++; } else s.pending++;
    });
    s.pct = s.total ? Math.round(s.done / s.total * 100) : 0;
    return s;
  },

  scoreFor(si) {
    const keys = SECTIONS[si].items.map((_, ii) => `${si}-${ii}`);
    const done = keys.filter(k => this.items[k]?.status !== null && this.items[k]?.status !== 'na');
    const ok   = keys.filter(k => this.items[k]?.status === 'ok').length;
    const crit = keys.filter(k => this.items[k]?.status === 'crit').length;
    if (!done.length) return null;
    if (crit > 0) return Math.max(0, Math.round((ok / keys.length) * 100));
    return Math.round((ok / done.length) * 100);
  },

  overallScore() {
    const pct = this.pct();
    const critCount = this.countBy('crit');
    const okCount   = this.countBy('ok');
    const done      = this.doneItems();
    if (!done) return 0;
    const critPenalty = critCount * 8;
    const raw = Math.round((okCount / done) * 100) - critPenalty;
    return Math.max(0, Math.min(100, raw));
  },

  grade() {
    const s = this.overallScore();
    if (s >= 90) return 'A';
    if (s >= 75) return 'B';
    if (s >= 55) return 'C';
    return 'D';
  }
};

/* INIT */
SECTIONS.forEach((sec, si) => {
  sec.items.forEach((_, ii) => {
    State.items[`${si}-${ii}`] = { status: null, qty: '', obs: '', ts: null };
  });
});


/* Configuração (backend, MSAL) e modelo de dados das seções */
"use strict";
// Estado e lógica principal da aplicação

const DEFAULT_URL = "https://defaultd685b1be26d44fc289b26333f4469d.11.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/8d132a623ef64376b6392fd620b80610/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=m99ubwzbeHbjhPto-135KY1zl1x5q9PG67oJXPlYaJI";
const BACKEND_URL_KEY = 'ti-backend-url';
const PENDING_QUEUE_KEY = 'ti-pending-queue';


/* Login Microsoft (MSAL / Entra ID), configurado para o tenant Tenda Atacado.
   App registration: "Checklist TI Tenda" no Azure Entra ID (Single-page application).
   Acesso restrito às contas dos domínios listados em allowedDomains. */
const MSAL_CONFIG = {
  clientId: "583ecb85-0864-4f6d-85f3-9ce48b5ab9cd",
  tenantId: "d685b1be-26d4-4fc2-89b2-6333f4469d11",
  redirectUri: window.location.origin + window.location.pathname,
  allowedDomains: ["tendaatacado.com.br", "alimentaangola.co.ao"] // domínios permitidos para login
};

let msalInstance = null;
function isMsalConfigured() {
  return MSAL_CONFIG.clientId && !MSAL_CONFIG.clientId.startsWith("COLOQUE_AQUI")
      && MSAL_CONFIG.tenantId && !MSAL_CONFIG.tenantId.startsWith("COLOQUE_AQUI");
}
function getMsalInstance() {
  if (!msalInstance && typeof msal !== 'undefined' && isMsalConfigured()) {
    msalInstance = new msal.PublicClientApplication({
      auth: {
        clientId: MSAL_CONFIG.clientId,
        authority: `https://login.microsoftonline.com/${MSAL_CONFIG.tenantId}`,
        redirectUri: MSAL_CONFIG.redirectUri
      },
      cache: { cacheLocation: "localStorage", storeAuthStateInCookie: false }
    });
  }
  return msalInstance;
}

/* DATA MODEL */
const DEFAULT_SECTIONS = [
  { id: "geral",   title: "Geral",     items: [ "Gerente presente?", "Resp. TI presente", "PDVs padrão abertos", "Quantidade pdv", "PDVs self checkout abertos", "PDVs self checkout fila"] },   
  { id: "visao",   title: "Visão",     items: ["Loja segue padrão TI", "Equipamentos fora da área", "Não há acúmulo de sucata"] },
  { id: "PDVs",    title: "PDVs",      items: ["Quantidade de PDVs", "Scanner de Mão", "Scanner torre", "Monitor", "Teclado", "Leitor Biométrico", "Pinpad", "CPU", "Cancela"] },  
  { id: "comput",  title: "PCs",       items: ["Qtde de Notebooks na loja está controlada", "Notebooks no CPD", "Notebooks indevidos", "Desktop identificadas no CPD quando sem uso", "Equipamentos mapeados"] },
  { id: "impr",    title: "Impressoras", items: ["Quantidade condiz com o contrato?", "Impressoras existentes conferem?", "Impressoras PDV ativas funcionando", "Impressoras PDV armazenadas no CPD condferem", "Fora de uso ou sem controle?"] },
  { id: "cftv",    title: "CFTV",      items: ["Câmeras funcionando?", "Imagem adequada?", "Gravação ativa?", "Cobertura PDV?", "Cobertura estacionamento?", "Cobertura recebimento?", "Cobertura áreas criticas/gôndolas", "Qualidade adequadada?"] },
  { id: "audio",   title: "Áudio",     items: ["Caixas funcionando?", "Volume adequado?", "Sem ruídos ou interferências?", "Cobertura uniforme?"] },
  { id: "ant",     title: "Antenas",   items: ["Portal entrada ok?", "Portal saída ok?", "Teste RFID realizado?", "Portais ligados?"] },
  { id: "colet",   title: "Coletores", items: ["Quantidade correta", "Coletores no CPD", "Armazenamento adequado", "Equipamentos com bandoleira", "Estado físico"] },
  { id: "balanc",  title: "Balanças",  items: ["Balanças funcionando", "Sem avarias", "Quantidade correta", "Quantidade em reserva/CPD", "Integração funcionando", "Sinais de mau uso?"] },
  { id: "cell",    title: "Celulares", items: ["Quantidade controlada", "Todos ativos", "MDM aplicado", "Em uso operacional"] },
  { id: "scan",    title: "Scanners",  items: ["Quantidade correta", "Cabos bons", "Funcionando"] },
  { id: "self",    title: "Self CK",   items: ["Quantidade correta", "Funcionando", "Pesagem OK", "Ventilação adequada"] }, 
  { id: "cpd",     title: "CPD",       items: ["Impresora de Mesa", "Impressora PDV", "Scanner de Mão", "Scanner torre", "Balança de Mesa", "Desktop PDV", "Monitores Organizados", "Desktop Windows", "Gaveta", "Pinpad", "Telefone IP", "Coletor", "Celular", "Notebook", "Teclado", "Teclado PDV", "Headset", "Mouse", "Monitor", "Câmera",] },
  { id: "rede",    title: "Rede",      items: ["WiFi funcionando", "Rack organizado", "Cabeamento organizado", "Rede estável"] },
  { id: "proc",    title: "Processos", items: ["Abertura correta de chamados?", "Sem fluxo indevido", "Equipamentos quebrados não ficam retidos?"] },
  { id: "seg",     title: "Segurança", items: ["Equipamentos protegidos", "Sem risco furto", "Acesso CPD controlado"] }
];

/* SEÇÕES DO CHECKLIST — editáveis por administradores direto pelo app.
   Persistidas em localStorage neste navegador/dispositivo (ver ADMIN_SECTIONS_KEY). */
const ADMIN_SECTIONS_KEY = 'ti-sections-custom';

function loadSections() {
  try {
    const raw = localStorage.getItem(ADMIN_SECTIONS_KEY);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_SECTIONS));
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch(e) {}
  return JSON.parse(JSON.stringify(DEFAULT_SECTIONS));
}

function saveSections() {
  try { localStorage.setItem(ADMIN_SECTIONS_KEY, JSON.stringify(SECTIONS)); } catch(e) {}
}

let SECTIONS = loadSections();





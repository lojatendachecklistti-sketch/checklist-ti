/* Runtime: tratamento global de erros */
/* Runtime safety: prevent technical exceptions from becoming a white screen. */
window.addEventListener('error', function (event) {
  console.error('[Checklist TI] Erro de interface:', event.error || event.message);
  const splash = document.getElementById('splash');
  if (splash) splash.classList.add('hidden');
  const errorBox = document.getElementById('runtimeErrorBox');
  if (errorBox) { errorBox.hidden = false; errorBox.textContent = 'Ocorreu um erro ao carregar esta tela. Recarregue a página e tente novamente.'; }
});
window.addEventListener('unhandledrejection', function (event) {
  console.error('[Checklist TI] Operação não tratada:', event.reason);
  event.preventDefault();
});

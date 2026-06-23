'use strict';

try {
  document.documentElement.dataset.filterfoodBridgeActive = '1';
  console.log('[FilterFood Extension Bridge] active on', location.href);
} catch (_) {}

// Sem script inline: algumas páginas localhost têm CSP forte.
// O painel envia window.postMessage({ source: 'filterfood-admin-bridge', ... })
// e este content script repassa para o background da extensão.
window.addEventListener('message', event => {
  if (event.source !== window) return;
  const data = event.data || {};
  if (data.source !== 'filterfood-admin-bridge' || !data.requestId) return;
  try {
    chrome.runtime.sendMessage(data.message, response => {
      const error = chrome.runtime.lastError ? chrome.runtime.lastError.message : null;
      window.postMessage({
        source: 'filterfood-extension-bridge',
        requestId: data.requestId,
        response: response || null,
        error
      }, '*');
    });
  } catch (error) {
    window.postMessage({
      source: 'filterfood-extension-bridge',
      requestId: data.requestId,
      response: null,
      error: error.message
    }, '*');
  }
});

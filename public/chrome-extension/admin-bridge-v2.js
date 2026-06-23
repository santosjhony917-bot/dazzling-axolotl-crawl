'use strict';

try {
  document.documentElement.setAttribute('data-filterfood-bridge-v2', '1');
} catch (_) {}

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
      error: error && error.message ? error.message : String(error)
    }, '*');
  }
});

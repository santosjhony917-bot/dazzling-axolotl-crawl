'use strict';

(() => {
  if (window.__FILTERFOOD_NETWORK_CAPTURE_INSTALLED__) return;
  window.__FILTERFOOD_NETWORK_CAPTURE_INSTALLED__ = true;
  window.__FILTERFOOD_MENU_NETWORK__ = [];

  const relevant = url => /menu|cardap|product|categor|catalog|delivery|store|item/i.test(String(url || ''));
  const remember = (url, status, body) => {
    if (!relevant(url) || body == null) return;
    try {
      const serialized = JSON.stringify(body);
      if (serialized.length > 5_000_000) return;
      const entries = window.__FILTERFOOD_MENU_NETWORK__;
      entries.push({ url: String(url), status, body, capturedAt: Date.now() });
      if (entries.length > 24) entries.splice(0, entries.length - 24);
    } catch (_) {}
  };

  const nativeFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await nativeFetch.apply(this, args);
    try {
      const url = response.url || args[0]?.url || args[0];
      if (relevant(url)) {
        const clone = response.clone();
        const type = clone.headers.get('content-type') || '';
        const body = type.includes('json') ? await clone.json() : await clone.text();
        remember(url, clone.status, body);
      }
    } catch (_) {}
    return response;
  };

  const nativeOpen = XMLHttpRequest.prototype.open;
  const nativeSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__filterFoodUrl = url;
    return nativeOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener('load', function () {
      if (!relevant(this.responseURL || this.__filterFoodUrl)) return;
      try {
        const body = this.responseType === 'json' ? this.response : JSON.parse(this.responseText);
        remember(this.responseURL || this.__filterFoodUrl, this.status, body);
      } catch (_) {}
    }, { once: true });
    return nativeSend.apply(this, args);
  };
})();

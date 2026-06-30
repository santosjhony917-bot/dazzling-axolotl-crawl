'use strict';

// Development-only live reload client.
// It is loaded only when dev-reload-config.js exists and enables it.
(() => {
  const config = self.__FILTERFOOD_EXTENSION_DEV_RELOAD__;
  if (!config || config.enabled !== true || !config.url) return;

  const pollMs = Math.max(500, Number(config.pollMs || 1000));
  let lastVersion = null;
  let stopped = false;

  async function poll() {
    if (stopped) return;
    try {
      const url = `${config.url}${config.url.includes('?') ? '&' : '?'}t=${Date.now()}`;
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const nextVersion = String(payload && payload.version ? payload.version : '');
      if (!nextVersion) return;

      if (lastVersion === null) {
        lastVersion = nextVersion;
        return;
      }

      if (nextVersion !== lastVersion) {
        stopped = true;
        console.info('[FilterFood Extension] dev reload requested by local watcher.');
        chrome.runtime.reload();
      }
    } catch (error) {
      // The watcher is optional. Keep the extension quiet when it is not running.
    } finally {
      if (!stopped) setTimeout(poll, pollMs);
    }
  }

  setTimeout(poll, pollMs);
})();

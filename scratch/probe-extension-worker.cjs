const puppeteer = require('puppeteer');

const BROWSER_URL = process.env.FF_CDP_URL || 'http://127.0.0.1:9224';
const EXTENSION_ID = process.env.FF_EXTENSION_ID || 'kehbedmdplkodjgfiohgnebicblmhghe';

(async () => {
  const browser = await puppeteer.connect({ browserURL: BROWSER_URL, defaultViewport: null });
  try {
    let target = browser.targets().find((candidate) =>
      candidate.type() === 'service_worker'
      && candidate.url().startsWith(`chrome-extension://${EXTENSION_ID}/`)
    );
    if (!target) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      target = browser.targets().find((candidate) =>
        candidate.type() === 'service_worker'
        && candidate.url().startsWith(`chrome-extension://${EXTENSION_ID}/`)
      );
    }
    if (!target) throw new Error('Extension service worker not found.');
    const worker = await target.worker();
    const result = await worker.evaluate(async () => {
      const out = {
        href: globalThis.location?.href || null,
        manifestVersion: chrome.runtime.getManifest().version,
        hasPoll: typeof pollExtensionCommands,
        hasStart: typeof startExtensionCommandPolling,
        inFlight: typeof ffCommandInFlight === 'undefined' ? 'undefined' : ffCommandInFlight,
        pollingStarted: typeof ffCommandPollingStarted === 'undefined' ? 'undefined' : ffCommandPollingStarted,
      };
      try {
        const response = await fetch('http://localhost:8080/api/local-collector/extension-command-result');
        out.localResultStatus = response.status;
        out.localResultText = (await response.text()).slice(0, 1000);
      } catch (error) {
        out.localResultError = error?.message || String(error);
      }
      try {
        if (typeof pollExtensionCommands === 'function') {
          await pollExtensionCommands();
          out.calledPoll = true;
        }
      } catch (error) {
        out.pollError = error?.message || String(error);
      }
      return out;
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.disconnect();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

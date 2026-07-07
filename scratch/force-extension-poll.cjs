const puppeteer = require('puppeteer');

const BROWSER_URL = process.env.FF_CDP_URL || 'http://127.0.0.1:9224';
const EXTENSION_ID = process.env.FF_EXTENSION_ID || 'kehbedmdplkodjgfiohgnebicblmhghe';

(async () => {
  const browser = await puppeteer.connect({ browserURL: BROWSER_URL, defaultViewport: null });
  try {
    const target = browser.targets().find((candidate) =>
      candidate.type() === 'service_worker'
      && candidate.url().startsWith(`chrome-extension://${EXTENSION_ID}/`)
    );
    if (!target) throw new Error('Extension service worker not found.');
    const worker = await target.worker();
    const result = await worker.evaluate(async () => {
      const before = {
        inFlight: typeof ffCommandInFlight === 'undefined' ? 'undefined' : ffCommandInFlight,
        pollingStarted: typeof ffCommandPollingStarted === 'undefined' ? 'undefined' : ffCommandPollingStarted,
      };
      if (typeof ffCommandInFlight !== 'undefined') ffCommandInFlight = false;
      if (typeof pollExtensionCommands === 'function') await pollExtensionCommands();
      return {
        before,
        after: {
          inFlight: typeof ffCommandInFlight === 'undefined' ? 'undefined' : ffCommandInFlight,
          pollingStarted: typeof ffCommandPollingStarted === 'undefined' ? 'undefined' : ffCommandPollingStarted,
        },
      };
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.disconnect();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

const puppeteer = require('puppeteer');

const args = process.argv.slice(2);
const argValue = (name, fallback = '') => {
  const entry = args.find((arg) => arg.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : fallback;
};
const hasFlag = (name) => args.includes(name);

const laneId = argValue('--lane', process.env.FF_LANE_ID || 'default');
const port = Number(argValue('--port', process.env.FF_CDP_PORT || '9224')) || 9224;
const browserURL = process.env.FF_CDP_URL || argValue('--browser-url', `http://127.0.0.1:${port}`);
const timeoutMinutes = Math.max(1, Number(argValue('--timeout-min', '20')) || 20);
const requireGoogle = !hasFlag('--skip-google');
const requireInstagram = !hasFlag('--skip-instagram');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function cookieNames(cookies) {
  return new Set((cookies || []).map((cookie) => cookie.name));
}

async function isGoogleLoggedIn(browser) {
  const names = cookieNames(await browser.cookies('https://accounts.google.com/', 'https://www.google.com/'));
  return [
    'SID',
    'HSID',
    'SSID',
    'APISID',
    'SAPISID',
    '__Secure-1PSID',
    '__Secure-3PSID',
  ].some((name) => names.has(name));
}

async function isInstagramLoggedIn(browser) {
  const names = cookieNames(await browser.cookies('https://www.instagram.com/'));
  return names.has('sessionid') && (names.has('ds_user_id') || names.has('csrftoken'));
}

async function openOrReusePage(browser, url, titleHint) {
  const pages = await browser.pages();
  const existing = pages.find((page) => page.url().includes(titleHint));
  const page = existing || await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
  await page.bringToFront().catch(() => {});
  return page;
}

(async () => {
  const browser = await puppeteer.connect({ browserURL, defaultViewport: null });
  try {
    const pages = {};
    if (requireGoogle) {
      pages.google = await openOrReusePage(browser, 'https://accounts.google.com/', 'accounts.google.com');
    }
    if (requireInstagram) {
      pages.instagram = await openOrReusePage(browser, 'https://www.instagram.com/', 'instagram.com');
    }

    const deadline = Date.now() + timeoutMinutes * 60 * 1000;
    let lastStatus = '';
    while (Date.now() < deadline) {
      const googleOk = !requireGoogle || await isGoogleLoggedIn(browser).catch(() => false);
      const instagramOk = !requireInstagram || await isInstagramLoggedIn(browser).catch(() => false);
      const status = `lane=${laneId} google=${googleOk ? 'ok' : 'aguardando'} instagram=${instagramOk ? 'ok' : 'aguardando'}`;
      if (status !== lastStatus) {
        console.log(`[wait-lane-logins] ${status}`);
        lastStatus = status;
      }
      if (googleOk && instagramOk) {
        console.log(JSON.stringify({
          success: true,
          laneId,
          browserURL,
          google: googleOk,
          instagram: instagramOk,
          message: 'Lane pronta: Google e Instagram logados neste perfil.',
        }, null, 2));
        return;
      }
      if (!googleOk && pages.google) await pages.google.bringToFront().catch(() => {});
      await sleep(2500);
      if (!instagramOk && pages.instagram) await pages.instagram.bringToFront().catch(() => {});
      await sleep(2500);
    }

    console.error(JSON.stringify({
      success: false,
      laneId,
      browserURL,
      google: !requireGoogle || await isGoogleLoggedIn(browser).catch(() => false),
      instagram: !requireInstagram || await isInstagramLoggedIn(browser).catch(() => false),
      error: `Timeout aguardando login manual (${timeoutMinutes} min).`,
    }, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.disconnect();
  }
})().catch((error) => {
  console.error(JSON.stringify({
    success: false,
    laneId,
    browserURL,
    error: error.message || String(error),
  }, null, 2));
  process.exitCode = 1;
});

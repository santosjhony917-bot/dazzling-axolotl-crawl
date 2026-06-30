import { existsSync, mkdirSync } from 'node:fs';
import { execFile, spawn } from 'node:child_process';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (!arg.startsWith('--')) continue;
  const key = arg.slice(2);
  const next = process.argv[i + 1];
  if (next && !next.startsWith('--')) {
    args.set(key, next);
    i += 1;
  } else {
    args.set(key, true);
  }
}

const rootDir = resolve(process.cwd());
const extensionDir = resolve(rootDir, String(args.get('extension-dir') || 'public/chrome-extension'));
const profileDir = resolve(String(args.get('profile-dir') || 'C:/tmp/filterfood-real-chrome-profile'));
const debugPort = Number(args.get('debug-port') || 9224);
const appUrl = String(args.get('url') || 'http://localhost:8080/admin/login');
const mode = String(args.get('mode') || 'launch');

function log(message) {
  console.log(`[chrome-harness] ${message}`);
}

function fail(message) {
  console.error(`[chrome-harness] ${message}`);
  process.exitCode = 1;
}

function normalizePath(path) {
  return path.replace(/\\/g, '/');
}

function getChromeCandidates() {
  const candidates = [];
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);

  const programFiles = process.env.PROGRAMFILES || 'C:/Program Files';
  const programFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:/Program Files (x86)';
  const localAppData = process.env.LOCALAPPDATA || '';
  candidates.push(
    join(programFiles, 'Google/Chrome/Application/chrome.exe'),
    join(programFilesX86, 'Google/Chrome/Application/chrome.exe')
  );
  if (localAppData) candidates.push(join(localAppData, 'Google/Chrome/Application/chrome.exe'));

  const home = process.env.USERPROFILE || '';
  if (home) {
    candidates.push(
      join(home, '.cache/puppeteer/chrome/win64-149.0.7827.22/chrome-win64/chrome.exe'),
      join(home, '.cache/puppeteer/chrome/win64-138.0.7204.168/chrome-win64/chrome.exe')
    );
  }

  return candidates;
}

function findChrome() {
  const requested = args.get('chrome');
  if (requested) {
    const chromePath = resolve(String(requested));
    if (!existsSync(chromePath)) fail(`Chrome informado nao existe: ${chromePath}`);
    return chromePath;
  }

  const found = getChromeCandidates().find(candidate => existsSync(candidate));
  if (!found) {
    fail('Chrome nao encontrado. Passe --chrome "C:/caminho/chrome.exe" ou defina CHROME_PATH.');
    return null;
  }
  return found;
}

function requestJson(url, timeoutMs = 2500) {
  return new Promise((resolvePromise, rejectPromise) => {
    const request = fetch(url, { signal: AbortSignal.timeout(timeoutMs), cache: 'no-store' });
    request
      .then(async response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        resolvePromise(await response.json());
      })
      .catch(rejectPromise);
  });
}

function requestText(url, timeoutMs = 2500) {
  return new Promise((resolvePromise, rejectPromise) => {
    const request = fetch(url, { signal: AbortSignal.timeout(timeoutMs), cache: 'no-store' });
    request
      .then(async response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        resolvePromise(await response.text());
      })
      .catch(rejectPromise);
  });
}

function startChrome() {
  if (!existsSync(extensionDir)) {
    fail(`Pasta da extensao nao encontrada: ${extensionDir}`);
    return;
  }
  if (!existsSync(join(extensionDir, 'manifest.json'))) {
    fail(`manifest.json nao encontrado em: ${extensionDir}`);
    return;
  }

  const chromePath = findChrome();
  if (!chromePath) return;
  mkdirSync(profileDir, { recursive: true });

  const chromeArgs = [
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`,
    `--load-extension=${extensionDir}`,
    `--disable-extensions-except=${extensionDir}`,
    '--enable-extensions',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1540,960',
    '--window-position=40,30',
    appUrl
  ];

  log(`Chrome: ${chromePath}`);
  log(`Perfil persistente: ${profileDir}`);
  log(`Extensao unpacked: ${extensionDir}`);
  log(`Debug: http://127.0.0.1:${debugPort}`);
  log(`URL inicial: ${appUrl}`);

  const child = spawn(chromePath, chromeArgs, {
    detached: true,
    stdio: 'ignore',
    windowsHide: false
  });
  child.unref();
}

async function checkHarness() {
  log(`Verificando app em ${appUrl}`);
  try {
    await requestText(appUrl, 3000);
    log('OK app respondeu.');
  } catch (error) {
    fail(`App nao respondeu. Rode npm run dev -- --host 0.0.0.0 --port 8080. Detalhe: ${error.message}`);
  }

  log(`Verificando Chrome DevTools em http://127.0.0.1:${debugPort}`);
  let targets = [];
  try {
    await requestJson(`http://127.0.0.1:${debugPort}/json/version`, 2500);
    targets = await requestJson(`http://127.0.0.1:${debugPort}/json/list`, 2500);
    log(`OK DevTools respondeu com ${targets.length} target(s).`);
  } catch (error) {
    fail(`Chrome nao respondeu na porta ${debugPort}. Abra com npm run dev:chrome. Detalhe: ${error.message}`);
    return;
  }

  const extensionTargets = targets.filter(target => String(target.url || '').startsWith('chrome-extension://'));
  if (extensionTargets.length === 0) {
    fail('Nenhum service worker/pagina chrome-extension:// apareceu nos targets. A extensao pode nao estar carregada.');
  } else {
    for (const target of extensionTargets.slice(0, 8)) {
      log(`Extensao target: ${target.type || 'unknown'} ${target.url}`);
    }
  }

  const appTargets = targets.filter(target => String(target.url || '').includes('localhost:8080'));
  if (appTargets.length === 0) {
    fail('Nenhuma aba do app localhost:8080 apareceu nos targets. Abra o painel no Chrome de teste.');
  } else {
    log(`OK aba(s) do app detectada(s): ${appTargets.length}.`);
  }

  log('Diagnostico concluido.');
}

function printInfo() {
  console.log(JSON.stringify({
    extensionDir: normalizePath(extensionDir),
    profileDir: normalizePath(profileDir),
    debugPort,
    appUrl,
    chromeCandidates: getChromeCandidates().filter(candidate => existsSync(candidate)).map(normalizePath),
    script: pathToFileURL(process.argv[1]).href
  }, null, 2));
}

if (mode === 'launch') {
  startChrome();
} else if (mode === 'check') {
  await checkHarness();
} else if (mode === 'info') {
  printInfo();
} else {
  fail(`Modo desconhecido: ${mode}. Use launch, check ou info.`);
}

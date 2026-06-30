import { execFile } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const args = new Set(process.argv.slice(2));
const shouldWatch = args.has('--watch');
const intervalMs = Number(process.env.CODEX_CHROME_GUARD_INTERVAL_MS || 15000);

const userProfile = process.env.USERPROFILE || '';
const localAppData = process.env.LOCALAPPDATA || join(userProfile, 'AppData', 'Local');
const pluginRoot = join(userProfile, '.codex', 'plugins', 'cache', 'openai-bundled', 'chrome');
const latestRoot = join(pluginRoot, 'latest');
const codexExtensionId = 'hehggadaopoacecdllhhajmbjkdcmajg';
const collectorExtensionId = 'kehbedmdplkodjgfiohgnebicblmhghe';
const nativeHostName = 'com.openai.codexextension';
const nativeManifestPath = join(localAppData, 'OpenAI', 'extension', `${nativeHostName}.json`);
const collectorManifestPath = join(process.cwd(), 'public', 'chrome-extension', 'manifest.json');

const expectedFiles = [
  join(latestRoot, 'extension-host', 'windows', 'x64', 'extension-host.exe'),
  join(latestRoot, 'scripts', 'extension-id.json'),
  join(latestRoot, 'scripts', 'installManifest.mjs'),
  join(latestRoot, 'scripts', 'check-native-host-manifest.js'),
  join(latestRoot, 'scripts', 'check-extension-installed.js'),
  join(latestRoot, 'skills', 'control-chrome', 'SKILL.md')
];

function log(message = '') {
  console.log(`[codex-chrome-guard] ${message}`);
}

function readJson(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function runPowerShell(command) {
  return new Promise((resolve, reject) => {
    execFile(
      'C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command],
      { windowsHide: true, maxBuffer: 1024 * 1024 * 8 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(String(stderr || stdout || error.message).trim()));
          return;
        }
        resolve(String(stdout || '').trim());
      }
    );
  });
}

async function readProcesses() {
  const command = `
$selfPid=$PID
Get-CimInstance Win32_Process |
  Where-Object {
    $_.ProcessId -ne $selfPid -and (
      $_.Name -in @('extension-host.exe','cmd.exe','chrome.exe','node.exe') -or
      $_.CommandLine -like '*extension-host*' -or
      $_.CommandLine -like '*chrome-extension://${codexExtensionId}*'
    )
  } |
  Select-Object ProcessId,Name,CommandLine,WorkingSetSize |
  ConvertTo-Json -Depth 4
`;

  const output = await runPowerShell(command);
  if (!output) return [];
  try {
    const parsed = JSON.parse(output);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

async function readRegistryDefault() {
  const key = `HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${nativeHostName}`;
  const command = `
try {
  $item = Get-Item -LiteralPath 'Registry::${key}' -ErrorAction Stop
  $value = $item.GetValue('')
  if ($null -ne $value) { Write-Output $value }
} catch {
  exit 1
}
`;

  try {
    return await runPowerShell(command);
  } catch {
    return '';
  }
}

function hasCodexHost(process) {
  const name = String(process.Name || '').toLowerCase();
  const commandLine = String(process.CommandLine || '').toLowerCase();
  return name === 'extension-host.exe' || (name === 'cmd.exe' && commandLine.includes('extension-host'));
}

function hasCodexDebugTab(process) {
  return String(process.CommandLine || '').toLowerCase().includes(`chrome-extension://${codexExtensionId}`);
}

function isVite(process) {
  const commandLine = String(process.CommandLine || '').toLowerCase();
  return commandLine.includes('vite') && commandLine.includes('--port 8080');
}

function isCollectorWatcher(process) {
  const commandLine = String(process.CommandLine || '').toLowerCase();
  return (
    commandLine.includes('watch-extension.mjs') ||
    commandLine.includes('dev-reload-server.mjs') ||
    commandLine.includes('dev:extension') ||
    commandLine.includes('watch:extension')
  );
}

function isValidatorWorker(process) {
  const commandLine = String(process.CommandLine || '').toLowerCase();
  return (
    commandLine.includes('hybrid_restaurant_validator') ||
    commandLine.includes('gallery_enricher') ||
    commandLine.includes('validate_instagram') ||
    commandLine.includes('universal-agent') ||
    commandLine.includes('scratch')
  );
}

function mb(value) {
  return Math.round((Number(value || 0) / 1024 / 1024) * 10) / 10;
}

function summarizeProcess(process) {
  const commandLine = String(process.CommandLine || '').replace(/\s+/g, ' ').trim();
  return `PID ${process.ProcessId} ${process.Name} ${commandLine.slice(0, 170)}${commandLine.length > 170 ? '...' : ''}`;
}

async function collectState() {
  const nativeManifest = readJson(nativeManifestPath);
  const extensionConfig = readJson(join(latestRoot, 'scripts', 'extension-id.json'));
  const collectorManifest = readJson(collectorManifestPath);
  const registryValue = await readRegistryDefault();
  const processes = await readProcesses();

  const missingFiles = expectedFiles.filter(filePath => !existsSync(filePath));
  const hostProcesses = processes.filter(hasCodexHost);
  const debugProcesses = processes.filter(hasCodexDebugTab);
  const chromeProcesses = processes.filter(process => String(process.Name || '').toLowerCase() === 'chrome.exe');
  const nodeProcesses = processes.filter(process => String(process.Name || '').toLowerCase() === 'node.exe');
  const viteProcesses = processes.filter(isVite);
  const collectorWatchers = processes.filter(isCollectorWatcher);
  const validatorWorkers = processes.filter(isValidatorWorker);
  const chromeMemoryMb = chromeProcesses.reduce((sum, process) => sum + mb(process.WorkingSetSize), 0);
  const nodeMemoryMb = nodeProcesses.reduce((sum, process) => sum + mb(process.WorkingSetSize), 0);

  const nativeOk =
    nativeManifest?.name === nativeHostName &&
    Array.isArray(nativeManifest.allowed_origins) &&
    nativeManifest.allowed_origins.includes(`chrome-extension://${codexExtensionId}/`) &&
    typeof nativeManifest.path === 'string' &&
    existsSync(nativeManifest.path);

  const registryOk =
    typeof registryValue === 'string' &&
    registryValue.toLowerCase() === nativeManifestPath.toLowerCase();

  const extensionIdOk = extensionConfig?.extensionId === codexExtensionId;
  const cacheOk = existsSync(latestRoot) && missingFiles.length === 0 && extensionIdOk;
  const collectorOk =
    collectorManifest?.manifest_version === 3 &&
    collectorManifest?.background?.service_worker &&
    existsSync(join(process.cwd(), 'public', 'chrome-extension', collectorManifest.background.service_worker));

  let status = 'BLOCKED';
  if (cacheOk && nativeOk && registryOk && hostProcesses.length > 0) status = 'CONNECTED';
  else if (cacheOk && nativeOk && registryOk) status = 'READY_TO_CONNECT';
  else if (!cacheOk || !nativeOk || !registryOk) status = 'BROKEN_INSTALL';

  return {
    status,
    cacheOk,
    nativeOk,
    registryOk,
    extensionIdOk,
    collectorOk,
    collectorVersion: collectorManifest?.version || '(unknown)',
    collectorWorker: collectorManifest?.background?.service_worker || '(unknown)',
    missingFiles,
    hostProcesses,
    debugProcesses,
    chromeProcesses,
    nodeProcesses,
    viteProcesses,
    collectorWatchers,
    validatorWorkers,
    chromeMemoryMb,
    nodeMemoryMb,
    registryValue
  };
}

function printState(state) {
  log(`STATUS: ${state.status}`);
  log(`Codex plugin cache: ${state.cacheOk ? 'OK' : 'BROKEN'}`);
  log(`Native Messaging manifest: ${state.nativeOk ? 'OK' : 'BROKEN'}`);
  log(`Native Messaging registry: ${state.registryOk ? 'OK' : 'BROKEN'}`);
  log(`Codex extension id: ${codexExtensionId}`);
  log(`Coletor extension id: ${collectorExtensionId}`);
  log(`Coletor project extension: ${state.collectorOk ? 'OK' : 'BROKEN'} v${state.collectorVersion} worker=${state.collectorWorker}`);
  log(`Chrome processes: ${state.chromeProcesses.length}, approx memory ${state.chromeMemoryMb.toFixed(1)} MB`);
  log(`Node processes seen: ${state.nodeProcesses.length}, approx memory ${state.nodeMemoryMb.toFixed(1)} MB`);
  log(`Vite 8080: ${state.viteProcesses.length > 0 ? 'running' : 'not detected'}`);
  log(`Coletor dev watchers: ${state.collectorWatchers.length}`);
  log(`Validator/collector workers: ${state.validatorWorkers.length}`);

  if (state.missingFiles.length > 0) {
    log('Missing plugin files:');
    for (const filePath of state.missingFiles) log(`  - ${filePath}`);
  }

  if (state.hostProcesses.length > 0) {
    log('Codex native host is active. This is good for visual control, but blocks plugin uninstall/reinstall.');
    for (const process of state.hostProcesses.slice(0, 5)) log(`  - ${summarizeProcess(process)}`);
  } else {
    log('Codex native host is not active. If you need visual control, connect/debug Chrome from Codex first.');
  }

  if (state.debugProcesses.length > 0) {
    log('Codex extension/debug tab process detected.');
  }

  log('');
  if (state.status === 'CONNECTED') {
    log('Decision: use the connection. Do not uninstall or reinstall the Codex Chrome plugin now.');
  } else if (state.status === 'READY_TO_CONNECT') {
    log('Decision: install is healthy, but visual host is not active. Open/connect the Codex Chrome plugin.');
  } else {
    log('Decision: install is broken or incomplete. Repair first, then reinstall from Codex.');
    log('Recommended order: npm run fix:codex-chrome-lock, then reinstall plugin in Codex, then npm run guard:codex-chrome');
  }

  if (state.chromeMemoryMb > 4500) {
    log('Warning: Chrome memory is high. Close non-test tabs before running Validar IA.');
  }
  if (state.chromeProcesses.length > 35) {
    log('Warning: many Chrome processes are open. Use fewer tabs for Validar IA or the page may appear disconnected.');
  }
  if (state.nodeProcesses.length > 40) {
    log('Warning: many Node processes are running. Stop duplicate watchers/old validators before long tests.');
  }
  if (state.collectorWatchers.length > 1) {
    log('Warning: more than one extension dev watcher was detected. Keep only one dev:extension/watch:extension session active.');
  }
  if (state.validatorWorkers.length > 0) {
    log('Warning: validator/collector worker processes are already running. Avoid starting another Validar IA test until they finish.');
  }
}

async function runOnce() {
  const state = await collectState();
  printState(state);
  return state.status;
}

async function runWatch() {
  let lastSignature = '';
  log(`Watch mode active. Interval: ${intervalMs}ms`);
  log('Stop with Ctrl+C.');
  while (true) {
    const state = await collectState();
    const signature = JSON.stringify({
      status: state.status,
      host: state.hostProcesses.length,
      cacheOk: state.cacheOk,
      nativeOk: state.nativeOk,
      registryOk: state.registryOk,
      chromeProcesses: state.chromeProcesses.length,
      chromeMemoryMb: Math.round(state.chromeMemoryMb / 250) * 250,
      nodeProcesses: state.nodeProcesses.length,
      collectorWatchers: state.collectorWatchers.length,
      validatorWorkers: state.validatorWorkers.length
    });
    if (signature !== lastSignature) {
      log('--- state changed ---');
      printState(state);
      lastSignature = signature;
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
}

if (shouldWatch) {
  runWatch().catch(error => {
    log(`Unexpected error: ${error.stack || error.message}`);
    process.exit(1);
  });
} else {
  runOnce().catch(error => {
    log(`Unexpected error: ${error.stack || error.message}`);
    process.exit(1);
  });
}

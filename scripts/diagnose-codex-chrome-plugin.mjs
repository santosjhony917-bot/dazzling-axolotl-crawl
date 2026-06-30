import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, renameSync, cpSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const args = new Set(process.argv.slice(2));
const shouldFix = args.has('--fix');
const shouldCheckPreinstall = args.has('--preinstall');
const shouldPreflight = args.has('--preflight');
const shouldRepairCorruptCache = args.has('--repair-corrupt');
const shouldSnapshotGoodInstall = args.has('--snapshot-good');

const userProfile = process.env.USERPROFILE || '';
const localAppData = process.env.LOCALAPPDATA || join(userProfile, 'AppData', 'Local');
const pluginRoot = join(userProfile, '.codex', 'plugins', 'cache', 'openai-bundled', 'chrome');
const latestRoot = join(pluginRoot, 'latest');
const extensionId = 'hehggadaopoacecdllhhajmbjkdcmajg';
const collectorExtensionId = 'kehbedmdplkodjgfiohgnebicblmhghe';
const collectorExtensionDir = join(process.cwd(), 'public', 'chrome-extension');
const nativeHostName = 'com.openai.codexextension';
const nativeManifestPath = join(localAppData, 'OpenAI', 'extension', `${nativeHostName}.json`);
const nativeRegistryKey = `HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${nativeHostName}`;

function log(message = '') {
  console.log(`[codex-chrome-diag] ${message}`);
}

function status(ok, message) {
  log(`${ok ? 'OK' : 'ERRO'}: ${message}`);
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

function readJsonIfExists(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function safeRealPathLabel(filePath) {
  try {
    return realpathSync(filePath);
  } catch {
    return filePath;
  }
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function isPathInside(parentPath, childPath) {
  const parent = safeRealPathLabel(parentPath).toLowerCase();
  const child = safeRealPathLabel(childPath).toLowerCase();
  return child === parent || child.startsWith(`${parent}\\`);
}

function samePath(leftPath, rightPath) {
  if (!leftPath || !rightPath) return false;
  return safeRealPathLabel(leftPath).toLowerCase() === safeRealPathLabel(rightPath).toLowerCase();
}

function expectedHostPath() {
  return join(latestRoot, 'extension-host', 'windows', 'x64', 'extension-host.exe');
}

async function readRegistryDefaultValue(keyPath) {
  const command = `
$key='Registry::${keyPath}'
try {
  $item = Get-Item -LiteralPath $key -ErrorAction Stop
  $value = $item.GetValue('')
  if ($null -ne $value) { Write-Output $value }
} catch {
  exit 1
}
`;
  return runPowerShell(command);
}

async function readProcesses() {
  const detailedCommand = `
$pattern1='*.codex*plugins*chrome*'
$pattern2='*openai-bundled*chrome*'
$pattern3='*extension-host*'
$pattern4='*chrome-extension://${extensionId}*'
$selfPid=$PID
Get-CimInstance Win32_Process |
  Where-Object {
    $_.ProcessId -ne $selfPid -and (
      $_.CommandLine -like $pattern1 -or
      $_.CommandLine -like $pattern2 -or
      $_.CommandLine -like $pattern3 -or
      $_.CommandLine -like $pattern4
    )
  } |
  Select-Object ProcessId,Name,CommandLine |
  ConvertTo-Json -Depth 4
`;

  const fallbackCommand = `
Get-Process -Name extension-host,cmd,chrome -ErrorAction SilentlyContinue |
  Select-Object @{Name='ProcessId';Expression={$_.Id}}, @{Name='Name';Expression={$_.ProcessName + '.exe'}}, @{Name='CommandLine';Expression={
    if ($_.ProcessName -eq 'extension-host') { 'extension-host' }
    elseif ($_.ProcessName -eq 'cmd') { 'cmd.exe command line unavailable' }
    else { 'chrome.exe command line unavailable' }
  }} |
  ConvertTo-Json -Depth 4
`;

  let output = '';
  try {
    output = await runPowerShell(detailedCommand);
  } catch (error) {
    log(`AVISO: leitura detalhada de processos falhou: ${error.message}`);
    log('Tentando leitura simples por nome de processo para detectar host preso.');
    try {
      output = await runPowerShell(fallbackCommand);
    } catch (fallbackError) {
      log(`AVISO: fallback de processos tambem falhou: ${fallbackError.message}`);
      return [];
    }
  }

  if (!output) return [];
  try {
    const parsed = JSON.parse(output);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    log(`AVISO: nao consegui interpretar lista de processos: ${error.message}`);
    return [];
  }
}

function filterRelevantProcesses(processes) {
  return processes.filter(process => {
    const commandLine = String(process.CommandLine || '');
    const lowerCommandLine = commandLine.toLowerCase();
    const name = String(process.Name || '').toLowerCase();
    if (commandLine.includes('diagnose-codex-chrome-plugin.mjs')) return false;
    if (name === 'extension-host.exe') return true;
    if (name === 'cmd.exe') return lowerCommandLine.includes('extension-host');
    if (name === 'chrome.exe') return lowerCommandLine.includes(`chrome-extension://${extensionId}`);
    return false;
  });
}

async function killRelevantHostProcesses(relevant) {
  const killable = relevant.filter(process => {
    const name = String(process.Name || '').toLowerCase();
    const commandLine = String(process.CommandLine || '').toLowerCase();
    return name === 'extension-host.exe' || (name === 'cmd.exe' && commandLine.includes('extension-host'));
  });

  if (killable.length === 0) {
    log('Nada seguro para encerrar automaticamente. Se for reinstalar, feche Chrome/Codex ou use hold:codex-chrome-reinstall.');
    return false;
  }

  const ids = killable.map(process => Number(process.ProcessId)).filter(Number.isFinite);
  const command = `$ids=@(${ids.join(',')}); foreach ($id in $ids) { try { Stop-Process -Id $id -Force -ErrorAction Stop; Write-Output "STOPPED=$id" } catch { Write-Output "FAILED=$id $($_.Exception.Message)" } }`;
  const output = await runPowerShell(command);
  log(output || 'Processos encerrados.');
  return true;
}

function expectedFiles() {
  return [
    expectedHostPath(),
    join(latestRoot, 'scripts', 'extension-id.json'),
    join(latestRoot, 'scripts', 'installManifest.mjs'),
    join(latestRoot, 'scripts', 'check-native-host-manifest.js'),
    join(latestRoot, 'scripts', 'check-extension-installed.js'),
    join(latestRoot, 'skills', 'control-chrome', 'SKILL.md')
  ];
}

function findLatestTarget() {
  if (!existsSync(latestRoot)) return null;
  return safeRealPathLabel(latestRoot);
}

async function main() {
  log('Diagnostico da conexao visual Codex <-> Chrome');
  log('');
  log('Mapa das pecas envolvidas');
  log(`  1. Plugin Chrome do Codex: cache local em ${pluginRoot}`);
  log(`  2. Extensao Codex no Chrome: id ${extensionId}, controla a conexao visual`);
  log(`  3. Extensao Coletor Auxiliar: id ${collectorExtensionId}, pasta ${collectorExtensionDir}`);
  log('     Observacao: erro no Coletor Auxiliar nao significa plugin Codex quebrado, e host Codex ativo nao significa Coletor quebrado.');
  log('');

  if (!existsSync(pluginRoot)) {
    log(`ERRO: pasta do plugin Chrome nao existe: ${pluginRoot}`);
    process.exit(1);
  }

  log('Estrutura do plugin');
  const latestPresent = existsSync(latestRoot);
  status(latestPresent, latestPresent ? `latest em ${safeRealPathLabel(latestRoot)}` : `latest ausente em ${latestRoot}`);
  const latestTarget = findLatestTarget();
  const latestTargetSafe = Boolean(latestTarget && isPathInside(pluginRoot, latestTarget));
  if (latestPresent) {
    status(latestTargetSafe, `latest aponta para alvo seguro dentro do cache: ${latestTarget || '(ausente)'}`);
  }

  const missingExpectedFiles = [];
  const integrationProblems = [];
  for (const filePath of expectedFiles()) {
    const ok = existsSync(filePath);
    if (!ok) missingExpectedFiles.push(filePath);
    status(ok, `${basename(filePath)} ${ok ? 'encontrado' : `ausente em ${filePath}`}`);
  }

  const extensionConfig = readJsonIfExists(join(latestRoot, 'scripts', 'extension-id.json'));
  if (extensionConfig?.extensionId) {
    status(extensionConfig.extensionId === extensionId, `extension-id.json aponta para ${extensionConfig.extensionId}`);
  } else {
    status(false, 'nao consegui ler scripts/extension-id.json');
    missingExpectedFiles.push(join(latestRoot, 'scripts', 'extension-id.json'));
  }

  log('');
  log(shouldCheckPreinstall ? 'Native Messaging (informativo no modo reinstalacao)' : 'Native Messaging');
  const nativeManifestExists = existsSync(nativeManifestPath);
  if (shouldCheckPreinstall && !nativeManifestExists) {
    log(`AVISO: manifesto nativo nao encontrado em ${nativeManifestPath}. Isso pode acontecer apos uma desinstalacao parcial; reinstale o plugin no Codex.`);
  } else {
    status(nativeManifestExists, `manifesto nativo em ${nativeManifestPath}`);
  }
  const nativeManifest = readJsonIfExists(nativeManifestPath);
  if (nativeManifest) {
    status(nativeManifest.name === nativeHostName, `manifesto name ${nativeManifest.name || '(ilegivel)'}`);
    status(
      Array.isArray(nativeManifest.allowed_origins) && nativeManifest.allowed_origins.includes(`chrome-extension://${extensionId}/`),
      `manifesto permite chrome-extension://${extensionId}/`
    );
    const manifestPathExists = typeof nativeManifest.path === 'string' && existsSync(nativeManifest.path);
    status(manifestPathExists, `manifesto path ${nativeManifest.path || '(ausente)'}`);
    if (typeof nativeManifest.path === 'string' && !manifestPathExists) missingExpectedFiles.push(nativeManifest.path);
    const manifestPathMatchesLatest =
      typeof nativeManifest.path === 'string' &&
      samePath(nativeManifest.path, expectedHostPath()) &&
      isPathInside(latestRoot, nativeManifest.path);
    status(manifestPathMatchesLatest, `manifesto aponta para o extension-host.exe da versao latest atual`);
    if (!manifestPathMatchesLatest) {
      integrationProblems.push(`manifesto nativo aponta para ${nativeManifest.path || '(ausente)'}, esperado ${expectedHostPath()}`);
    }
  } else if (nativeManifestExists) {
    status(false, `manifesto nativo existe mas nao foi lido como JSON valido`);
    integrationProblems.push(`manifesto nativo invalido: ${nativeManifestPath}`);
  }

  try {
    const registryValue = await readRegistryDefaultValue(nativeRegistryKey);
    status(Boolean(registryValue), `registro existe em ${nativeRegistryKey}`);
    const registryMatchesManifest = samePath(registryValue, nativeManifestPath);
    status(registryMatchesManifest, `registro aponta exatamente para ${nativeManifestPath}`);
    if (!registryMatchesManifest) integrationProblems.push(`registro ${nativeRegistryKey} aponta para ${registryValue || '(vazio)'}`);
  } catch {
    if (shouldCheckPreinstall) {
      log(`AVISO: registro ausente ou inacessivel em ${nativeRegistryKey}. Se voce acabou de desinstalar, reinstale o plugin no Codex.`);
    } else {
      status(false, `registro ausente em ${nativeRegistryKey}`);
      integrationProblems.push(`registro ausente: ${nativeRegistryKey}`);
    }
  }

  log('');
  log('Processos que podem segurar a pasta do plugin');
  const relevant = filterRelevantProcesses(await readProcesses());
  const cacheIncomplete = latestPresent && (!latestTargetSafe || missingExpectedFiles.length > 0);
  const installInconsistent = cacheIncomplete || integrationProblems.length > 0;

  if (cacheIncomplete) {
    log('ERRO: cache incompleto do plugin Chrome detectado. Isso pode causar Falha ao desinstalar plugin.');
  }
  if (integrationProblems.length > 0) {
    log('ERRO: integracao Native Messaging/registro inconsistente detectada.');
    for (const problem of integrationProblems) log(`  - ${problem}`);
  }

  if (relevant.length === 0) {
    log('OK: nenhum processo do host Chrome/Codex segurando o cache foi encontrado.');
  } else {
    log(`Processos relacionados encontrados: ${relevant.length}`);
    for (const process of relevant) {
      const commandLine = String(process.CommandLine || '').replace(/\s+/g, ' ').trim();
      log(`PID ${process.ProcessId} - ${process.Name}`);
      log(`  ${commandLine.slice(0, 260)}${commandLine.length > 260 ? '...' : ''}`);
    }
  }

  if (shouldCheckPreinstall || shouldPreflight) {
    log('');
    if (shouldPreflight && installInconsistent) {
      log('PREFLIGHT FALHOU: cache/manifesto/registro do plugin Chrome esta inconsistente.');
      log('Acao: rode npm run repair:codex-chrome, reinstale o plugin Chrome no Codex e rode este preflight de novo.');
      process.exit(2);
    }
    if (shouldPreflight) {
      log('PREFLIGHT OK: instalacao do plugin Chrome parece integra.');
      if (relevant.length > 0) {
        log('Host nativo ativo detectado. Isso e esperado se a conexao visual ja estiver ligada.');
        log('Nao reinstale/desinstale o plugin Chrome enquanto esse host estiver ativo.');
      } else {
        log('Nenhum host nativo ativo. Abra/conecte a extensao Codex Chrome antes de testar Validar IA visualmente.');
      }
      process.exit(0);
    }

    if (installInconsistent) {
      if (cacheIncomplete) {
        log('PREINSTALL BLOQUEADO: cache do plugin Chrome esta incompleto. Rode: npm run repair:codex-chrome');
      } else {
        log('PREINSTALL BLOQUEADO: manifesto/registro esta inconsistente. Rode npm run fix:codex-chrome-lock e reinstale o plugin pelo Codex.');
      }
      process.exit(2);
    }
    if (relevant.length > 0) {
      log('PREINSTALL BLOQUEADO: o Chrome/Codex ainda esta com o host nativo ativo.');
      log('Isso e normal quando a conexao visual esta funcionando, mas causa Falha ao desinstalar plugin durante reinstalacao.');
      log('Rode: npm run hold:codex-chrome-reinstall e reinstale/desinstale no Codex durante a janela do comando.');
      process.exit(2);
    }
    log('PREINSTALL OK: nenhum host/lock detectado. Pode reinstalar/desinstalar o plugin Chrome no Codex.');
    process.exit(0);
  }

  if (shouldSnapshotGoodInstall) {
    if (installInconsistent) {
      log('ERRO: nao vou criar snapshot porque a instalacao atual esta incompleta ou inconsistente.');
      process.exit(1);
    }
    const latestTarget = findLatestTarget();
    if (!latestTarget || !isPathInside(pluginRoot, latestTarget)) {
      log(`ERRO: alvo do latest inseguro ou ausente: ${latestTarget || '(ausente)'}`);
      process.exit(1);
    }
    const backupRoot = join('C:\\tmp', 'codex-chrome-plugin-backups');
    const backupPath = join(backupRoot, basename(latestTarget));
    mkdirSync(dirname(backupPath), { recursive: true });
    if (!existsSync(backupPath)) cpSync(latestTarget, backupPath, { recursive: true, force: true });
    log(`OK: snapshot saudavel disponivel em ${backupPath}`);
    process.exit(0);
  }

  if (shouldFix) {
    await killRelevantHostProcesses(relevant);
    if (shouldRepairCorruptCache && cacheIncomplete) {
      const latestTarget = findLatestTarget();
      if (!latestTarget || !isPathInside(pluginRoot, latestTarget)) {
        log(`ERRO: alvo do latest inseguro ou ausente: ${latestTarget || '(ausente)'}`);
        process.exit(1);
      }
      const quarantineRoot = join('C:\\tmp', 'codex-chrome-plugin-broken', timestamp());
      const quarantinePath = join(quarantineRoot, basename(latestTarget));
      mkdirSync(quarantineRoot, { recursive: true });
      renameSync(latestTarget, quarantinePath);
      log(`OK: cache quebrado isolado em ${quarantinePath}. Reinstale o plugin Chrome pelo Codex.`);
    } else if (shouldRepairCorruptCache && integrationProblems.length > 0) {
      log('AVISO: nao isolei o cache porque os arquivos parecem existir; o problema esta no manifesto/registro.');
      log('Acao: reinstale o plugin Chrome pelo Codex depois que o host estiver parado.');
    }
    process.exit(0);
  }

  log('');
  if (relevant.length > 0) {
    log('Interpretacao: host nativo ativo detectado.');
    log('  - Para USAR o Chrome conectado ao Codex, isso pode ser normal.');
    log('  - Para DESINSTALAR/REINSTALAR o plugin Chrome, isso bloqueia o cache e causa Falha ao desinstalar plugin.');
  }
  log('Comandos recomendados:');
  log('  npm run preflight:codex-chrome       # antes de testar Validar IA com a extensao Codex Chrome');
  log('  npm run check:codex-chrome           # diagnostico normal');
  log('  npm run check:codex-chrome-reinstall # verifica se pode reinstalar/desinstalar agora');
  log('  npm run hold:codex-chrome-reinstall  # segura o host desligado enquanto voce reinstala no Codex');
  log('  npm run repair:codex-chrome          # isola cache incompleto/quebrado');
  log('  npm run fix:codex-chrome-lock        # mata host/cmd preso; use quando for recuperar ou reinstalar');
}

main().catch(error => {
  log(`ERRO inesperado: ${error.stack || error.message}`);
  process.exit(1);
});


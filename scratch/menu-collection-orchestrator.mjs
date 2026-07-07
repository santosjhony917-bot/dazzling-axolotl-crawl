import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const argValue = (name, fallback = '') => {
  const entry = args.find((arg) => arg.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : fallback;
};
const hasFlag = (name) => args.includes(name);

const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const ORCH_ROOT = path.join('scratch', 'menu-orchestrator');
const RUN_ROOT = path.join(ORCH_ROOT, 'runs', RUN_ID);
const LEASE_FILE = path.join(ORCH_ROOT, 'leases.json');
const QUEUE_ROOT = path.join('scratch', 'menu-collection-queue');
const DEFAULT_LIMIT_PER_LANE = 12;
const DEFAULT_TTL_HOURS = 18;

const queueFileArg = argValue('--queue-file', '');
const refreshQueue = hasFlag('--refresh-queue');
const resetLocalLeases = hasFlag('--reset-local-leases');
const dryRun = hasFlag('--dry-run');
const limitPerLane = Number(argValue('--limit-per-lane', '')) || DEFAULT_LIMIT_PER_LANE;
const ttlHours = Number(argValue('--ttl-hours', '')) || DEFAULT_TTL_HOURS;
const globalPlatforms = parseList(argValue('--platforms', ''));
const globalTiers = parseList(argValue('--tiers', 'green,yellow'));
const laneSpecArg = argValue('--lanes', '');
const singleLane = argValue('--lane', process.env.FF_LANE_ID || '');
const singlePort = argValue('--port', process.env.FF_CDP_PORT || '');
const allowReassignExpired = !hasFlag('--keep-expired-leases');
const applyMode = !hasFlag('--no-apply');

function parseList(value) {
  return String(value || '')
    .split(/[,\s]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function safeFileName(value) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9_.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || 'lane';
}

function parseLaneSpec(spec) {
  if (!spec && singleLane) {
    return [{
      laneId: singleLane,
      port: singlePort || '',
      platforms: globalPlatforms,
      browserURL: singlePort ? `http://127.0.0.1:${singlePort}` : '',
    }];
  }
  const lanes = String(spec || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [laneId, port = '', platformSpec = ''] = part.split(':').map((piece) => piece.trim());
      const platforms = parseList(platformSpec.replace(/[|]/g, ','));
      return {
        laneId,
        port,
        platforms: platforms.length ? platforms : globalPlatforms,
        browserURL: port ? `http://127.0.0.1:${port}` : '',
      };
    })
    .filter((lane) => lane.laneId);
  if (!lanes.length) {
    throw new Error('Informe --lanes=\"cardapioweb-1:9331:cardapioweb;anotaai-1:9332:anota_ai\" ou --lane=... --port=...');
  }
  return lanes;
}

function findLatestQueueFile() {
  if (queueFileArg) return path.resolve(queueFileArg);
  if (refreshQueue) {
    const output = execFileSync(process.execPath, [path.join('scratch', 'menu-collection-queue-report.mjs')], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    try {
      const parsed = JSON.parse(output);
      if (parsed.jsonPath && fs.existsSync(parsed.jsonPath)) return path.resolve(parsed.jsonPath);
    } catch (_) {}
  }
  if (!fs.existsSync(QUEUE_ROOT)) {
    throw new Error(`Fila nao encontrada em ${QUEUE_ROOT}. Rode com --refresh-queue.`);
  }
  const candidates = fs.readdirSync(QUEUE_ROOT)
    .map((name) => path.join(QUEUE_ROOT, name, 'queue.json'))
    .filter((file) => fs.existsSync(file))
    .map((file) => ({ file, mtimeMs: fs.statSync(file).mtimeMs }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  if (!candidates.length) {
    throw new Error(`Nenhum queue.json encontrado em ${QUEUE_ROOT}. Rode com --refresh-queue.`);
  }
  return path.resolve(candidates[0].file);
}

function loadQueue(queueFile) {
  const report = JSON.parse(fs.readFileSync(queueFile, 'utf8'));
  const queue = Array.isArray(report.queue) ? report.queue : [];
  return {
    report,
    queue: queue.map((row, index) => ({
      ...row,
      rank: row.rank || index + 1,
      restaurant_id: row.restaurant_id || row.id,
      name: clean(row.name || row.google_maps_name),
      platform: clean(row.platform || 'unknown'),
      tier: clean(row.tier || 'yellow'),
      source_url: clean(row.source_url || row.other_url || row.external_url),
      reviews_count: Number(row.reviews_count || 0),
      rating: row.rating == null ? null : Number(row.rating),
    })),
  };
}

function loadLeases() {
  if (resetLocalLeases && fs.existsSync(LEASE_FILE)) {
    fs.rmSync(LEASE_FILE, { force: true });
  }
  if (!fs.existsSync(LEASE_FILE)) {
    return { version: 1, updatedAt: null, leases: {} };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(LEASE_FILE, 'utf8'));
    return {
      version: 1,
      updatedAt: parsed.updatedAt || null,
      leases: parsed.leases && typeof parsed.leases === 'object' ? parsed.leases : {},
    };
  } catch {
    return { version: 1, updatedAt: null, leases: {} };
  }
}

function saveLeases(state) {
  fs.mkdirSync(path.dirname(LEASE_FILE), { recursive: true });
  fs.writeFileSync(LEASE_FILE, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2));
}

function isLeaseActive(lease, now = Date.now()) {
  if (!lease || lease.status === 'released' || lease.status === 'done') return false;
  if (!lease.expiresAt) return true;
  return new Date(lease.expiresAt).getTime() > now;
}

function rowAllowedForLane(row, lane) {
  if (globalTiers.length && !globalTiers.includes(row.tier)) return false;
  if (globalPlatforms.length && !globalPlatforms.includes(row.platform)) return false;
  if (lane.platforms.length && !lane.platforms.includes(row.platform)) return false;
  if (!row.source_url || /ifood\.com\.br/i.test(row.source_url)) return false;
  return true;
}

function sortCandidates(a, b) {
  return Number(a.priority_score || 999) - Number(b.priority_score || 999)
    || Number(b.reviews_count || 0) - Number(a.reviews_count || 0)
    || Number(b.rating || 0) - Number(a.rating || 0)
    || a.name.localeCompare(b.name);
}

function assignBatches(queue, lanes, leaseState) {
  const now = Date.now();
  const activeLeasedIds = new Set(
    Object.entries(leaseState.leases)
      .filter(([, lease]) => isLeaseActive(lease, now) || (!allowReassignExpired && lease))
      .map(([id]) => id)
  );
  const selectedThisRun = new Set();
  const expiresAt = new Date(now + ttlHours * 60 * 60 * 1000).toISOString();
  const sorted = queue.slice().sort(sortCandidates);
  const batches = lanes.map((lane) => ({ ...lane, items: [] }));

  for (const batch of batches) {
    for (const row of sorted) {
      const id = row.restaurant_id;
      if (!id || selectedThisRun.has(id) || activeLeasedIds.has(id)) continue;
      if (!rowAllowedForLane(row, batch)) continue;
      batch.items.push(row);
      selectedThisRun.add(id);
      if (!dryRun) {
        leaseState.leases[id] = {
          restaurant_id: id,
          name: row.name,
          platform: row.platform,
          tier: row.tier,
          source_url: row.source_url,
          laneId: batch.laneId,
          port: batch.port || null,
          runId: RUN_ID,
          status: 'leased',
          assignedAt: new Date(now).toISOString(),
          expiresAt,
        };
      }
      if (batch.items.length >= limitPerLane) break;
    }
  }
  return batches;
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join('|') : String(value ?? '');
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows) {
  const headers = ['rank', 'restaurant_id', 'name', 'platform', 'tier', 'rating', 'reviews_count', 'source_url', 'risk_flags'];
  return [
    headers.join(';'),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(';')),
  ].join('\n');
}

function writeLaneFiles(batch) {
  const laneDir = path.join(RUN_ROOT, safeFileName(batch.laneId));
  fs.mkdirSync(laneDir, { recursive: true });
  const idsPath = path.join(laneDir, 'ids.txt');
  const queuePath = path.join(laneDir, 'queue.json');
  const csvPath = path.join(laneDir, 'queue.csv');
  const promptPath = path.join(laneDir, 'prompt.md');
  const commandsPath = path.join(laneDir, 'commands.ps1');
  const ids = batch.items.map((row) => row.restaurant_id);

  fs.writeFileSync(idsPath, ids.join('\n') + (ids.length ? '\n' : ''));
  fs.writeFileSync(queuePath, JSON.stringify({ lane: batch, items: batch.items }, null, 2));
  fs.writeFileSync(csvPath, toCsv(batch.items));
  fs.writeFileSync(promptPath, buildWorkerPrompt(batch, idsPath));
  fs.writeFileSync(commandsPath, buildPowerShellCommands(batch, idsPath));

  return { laneDir, idsPath, queuePath, csvPath, promptPath, commandsPath };
}

function buildPowerShellCommands(batch, idsPath) {
  const browserURL = batch.browserURL || (batch.port ? `http://127.0.0.1:${batch.port}` : 'http://127.0.0.1:9224');
  const applyFlag = applyMode ? ' --apply' : '';
  return [
    `$env:FF_CDP_URL="${browserURL}"`,
    `$env:FF_LANE_ID="${batch.laneId}"`,
    `node scratch\\wait-lane-logins.cjs --lane=${batch.laneId}${batch.port ? ` --port=${batch.port}` : ''} --timeout-min=1`,
    `node scratch\\set-extension-lane.cjs --lane=${batch.laneId}${batch.port ? ` --port=${batch.port}` : ''}`,
    `node scratch\\collect-menu-with-extension-verification.mjs --ids-file="${path.resolve(idsPath)}" --lane=${batch.laneId} --limit=${batch.items.length}${applyFlag}`,
    '',
  ].join('\n');
}

function buildWorkerPrompt(batch, idsPath) {
  const browserURL = batch.browserURL || (batch.port ? `http://127.0.0.1:${batch.port}` : 'http://127.0.0.1:9224');
  const applyFlag = applyMode ? ' --apply' : '';
  return `Voce e um worker de coleta de cardapios do FilterFood.

Missao desta lane:
- Lane: ${batch.laneId}
- CDP: ${browserURL}
- Restaurantes no lote: ${batch.items.length}
- Arquivo de IDs: ${path.resolve(idsPath)}

Regras obrigatorias:
- Use apenas esta lane/perfil. Nao use outro Chrome.
- Primeiro confirme login em Google e Instagram nesta lane. Se faltar login, pare e peça ao usuario para logar nessa janela.
- Nao importar iFood.
- Rejeite cidade/unidade errada, pagina quebrada, login obrigatorio, cardapio sem preco, shell vazia ou fonte sem evidencia.
- Extraia dados estruturados por DOM/JSON/HTML primeiro; use prints da extensao apenas para evidencia visual.
- Prints/evidencias visuais precisam mostrar itens e precos, nao apenas banner/topo.
- Preserve adicionais reais: sabores, bordas, tamanhos, acompanhamentos, obrigatorios/opcionais e variacao de preco.
- Remova lixo operacional: ketchup/catchup, talheres, guardanapos, sacola, embalagem, descartaveis, CPF, troco.
- Ao terminar, reporte: processados, importados, amarelos, vermelhos, erros e caminho da pasta gerada.

Comandos:
\`\`\`powershell
$env:FF_CDP_URL="${browserURL}"
$env:FF_LANE_ID="${batch.laneId}"
node scratch\\wait-lane-logins.cjs --lane=${batch.laneId}${batch.port ? ` --port=${batch.port}` : ''} --timeout-min=1
node scratch\\set-extension-lane.cjs --lane=${batch.laneId}${batch.port ? ` --port=${batch.port}` : ''}
node scratch\\collect-menu-with-extension-verification.mjs --ids-file="${path.resolve(idsPath)}" --lane=${batch.laneId} --limit=${batch.items.length}${applyFlag}
\`\`\`
`;
}

function summarize(batches, queue, leaseState) {
  const activeLeaseCount = Object.values(leaseState.leases).filter((lease) => isLeaseActive(lease)).length;
  const assignedCount = batches.reduce((sum, batch) => sum + batch.items.length, 0);
  const byLane = Object.fromEntries(batches.map((batch) => [batch.laneId, {
    port: batch.port || null,
    platforms: batch.platforms,
    count: batch.items.length,
    items: batch.items.slice(0, 10).map((row) => ({
      id: row.restaurant_id,
      name: row.name,
      platform: row.platform,
      tier: row.tier,
      reviews_count: row.reviews_count,
    })),
  }]));
  return {
    runId: RUN_ID,
    queueCount: queue.length,
    lanes: batches.length,
    assignedCount,
    activeLeaseCount,
    dryRun,
    ttlHours,
    limitPerLane,
    globalPlatforms,
    globalTiers,
    byLane,
  };
}

function main() {
  fs.mkdirSync(RUN_ROOT, { recursive: true });
  const lanes = parseLaneSpec(laneSpecArg);
  const queueFile = findLatestQueueFile();
  const { report, queue } = loadQueue(queueFile);
  const leaseState = loadLeases();
  const batches = assignBatches(queue, lanes, leaseState);
  if (!dryRun) saveLeases(leaseState);

  const laneOutputs = batches.map((batch) => ({
    laneId: batch.laneId,
    port: batch.port || null,
    platforms: batch.platforms,
    count: batch.items.length,
    ...writeLaneFiles(batch),
  }));
  const summary = summarize(batches, queue, leaseState);
  const manifest = {
    generatedAt: new Date().toISOString(),
    queueFile,
    sourceQueueGeneratedAt: report.generated_at || null,
    summary,
    laneOutputs,
  };
  fs.writeFileSync(path.join(RUN_ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(RUN_ROOT, 'README.md'), buildRunReadme(manifest));

  console.log(JSON.stringify({
    success: true,
    runRoot: path.resolve(RUN_ROOT),
    manifestPath: path.resolve(path.join(RUN_ROOT, 'manifest.json')),
    leaseFile: path.resolve(LEASE_FILE),
    summary,
    prompts: laneOutputs.map((lane) => ({ laneId: lane.laneId, promptPath: path.resolve(lane.promptPath), idsPath: path.resolve(lane.idsPath) })),
  }, null, 2));
}

function buildRunReadme(manifest) {
  const lines = [
    '# Menu Collection Orchestrator Run',
    '',
    `Generated: ${manifest.generatedAt}`,
    `Queue: ${manifest.queueFile}`,
    '',
    '## Lanes',
    '',
  ];
  for (const lane of manifest.laneOutputs) {
    lines.push(`- ${lane.laneId}: ${lane.count} restaurantes, prompt em ${path.basename(lane.promptPath)}, comandos em ${path.basename(lane.commandsPath)}`);
  }
  lines.push('');
  lines.push('Use os prompts de cada pasta em chats separados. O chat-mae acompanha o manifest e o arquivo de leases.');
  return lines.join('\n');
}

main();

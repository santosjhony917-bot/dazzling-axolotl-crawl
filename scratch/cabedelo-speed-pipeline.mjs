import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const argValue = (name, fallback = '') => {
  const entry = args.find((arg) => arg.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : fallback;
};
const hasFlag = (name) => args.includes(name);

const CITY = argValue('--city', 'Cabedelo');
const STATE = argValue('--state', 'PB');
const APPLY = !hasFlag('--dry-run');
const STATUS = argValue('--status', 'any');
const LIMIT = Math.max(1, Number(argValue('--limit', '40')) || 40);
const PLATFORM_CONCURRENCY = Math.max(1, Math.min(8, Number(argValue('--platform-concurrency', '5')) || 5));
const COLLECTOR_CONCURRENCY = Math.max(1, Math.min(8, Number(argValue('--collector-concurrency', '4')) || 4));
const TIMEOUT_MS = Math.max(60000, Number(argValue('--timeout-ms', '180000')) || 180000);
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join('scratch', 'cabedelo-speed-pipeline', RUN_ID);

const IMPLEMENTED_PLATFORMS = new Set([
  'cardapioweb',
  'anota_ai',
  'restaurantlogin',
  'whatsmenu',
  'instadelivery',
  'brendi',
  'cardapiodigital',
  'meucarrinho',
  'yooga',
]);

function ensureOutDir() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function writeJson(name, value) {
  ensureOutDir();
  fs.writeFileSync(path.join(OUT_DIR, name), JSON.stringify(value, null, 2));
}

function runNode(script, scriptArgs, options = {}) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(process.execPath, [script, ...scriptArgs], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...options.env },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      if (options.live) process.stdout.write(text);
    });
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      if (options.live) process.stderr.write(text);
    });
    child.on('close', (code) => {
      resolve({
        script,
        args: scriptArgs,
        code,
        durationMs: Date.now() - startedAt,
        stdout,
        stderr,
      });
    });
  });
}

function parseLastJson(stdout) {
  const text = String(stdout || '').trim();
  const start = text.lastIndexOf('\n{');
  const jsonText = start >= 0 ? text.slice(start + 1) : text;
  return JSON.parse(jsonText);
}

function isAlreadyReady(row) {
  return row.menu_status === 'found' && row.ai_validated === true;
}

function eligibleStructured(row) {
  if (!row?.restaurant_id || !row.source_url) return false;
  if (!IMPLEMENTED_PLATFORMS.has(row.platform)) return false;
  if (row.tier === 'red') return false;
  if (/ifood\.com/i.test(row.source_url)) return false;
  return !isAlreadyReady(row);
}

function groupBy(rows, key) {
  const map = new Map();
  for (const row of rows) {
    const value = row[key] || 'unknown';
    if (!map.has(value)) map.set(value, []);
    map.get(value).push(row);
  }
  return map;
}

async function runLimited(items, concurrency, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function loop() {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, loop));
  return results;
}

function queuePayloadForRows(rows) {
  return {
    generated_at: new Date().toISOString(),
    source: 'cabedelo-speed-pipeline',
    queue: rows,
  };
}

async function main() {
  ensureOutDir();
  console.log(JSON.stringify({ step: 'queue_refresh', city: CITY, state: STATE, status: STATUS }));
  const queueRun = await runNode('scratch/menu-collection-queue-report.mjs', [
    `--city=${CITY}`,
    `--state=${STATE}`,
    `--status=${STATUS}`,
  ]);
  fs.writeFileSync(path.join(OUT_DIR, 'queue-report.stdout.txt'), queueRun.stdout);
  fs.writeFileSync(path.join(OUT_DIR, 'queue-report.stderr.txt'), queueRun.stderr);
  if (queueRun.code !== 0) throw new Error(`queue_report_failed: ${queueRun.stderr || queueRun.stdout}`);
  const queueResult = parseLastJson(queueRun.stdout);
  const queueReport = JSON.parse(fs.readFileSync(queueResult.jsonPath, 'utf8'));
  const candidates = (queueReport.queue || []).filter(eligibleStructured).slice(0, LIMIT);
  const grouped = [...groupBy(candidates, 'platform').entries()]
    .map(([platform, rows]) => ({ platform, rows }))
    .sort((a, b) => b.rows.length - a.rows.length);

  writeJson('selected-structured-candidates.json', {
    queuePath: queueResult.jsonPath,
    summary: queueResult.summary,
    selectedCount: candidates.length,
    selectedByPlatform: Object.fromEntries(grouped.map((group) => [group.platform, group.rows.length])),
    candidates,
  });

  console.log(JSON.stringify({
    step: 'structured_collection_start',
    selectedCount: candidates.length,
    selectedByPlatform: Object.fromEntries(grouped.map((group) => [group.platform, group.rows.length])),
    apply: APPLY,
  }));

  const platformResults = await runLimited(grouped, PLATFORM_CONCURRENCY, async (group) => {
    const platformDir = path.join(OUT_DIR, group.platform);
    fs.mkdirSync(platformDir, { recursive: true });
    const queueFile = path.join(platformDir, 'queue.json');
    fs.writeFileSync(queueFile, JSON.stringify(queuePayloadForRows(group.rows), null, 2));
    const collectorArgs = [
      `--platform=${group.platform}`,
      `--queue-file=${queueFile}`,
      `--limit=${group.rows.length}`,
      `--concurrency=${COLLECTOR_CONCURRENCY}`,
      `--timeout-ms=${TIMEOUT_MS}`,
    ];
    if (APPLY) collectorArgs.push('--apply');
    const result = await runNode('scratch/structured-menu-collector.mjs', collectorArgs, { live: true });
    fs.writeFileSync(path.join(platformDir, 'collector.stdout.txt'), result.stdout);
    fs.writeFileSync(path.join(platformDir, 'collector.stderr.txt'), result.stderr);
    let parsed = null;
    try {
      parsed = parseLastJson(result.stdout);
    } catch {}
    return {
      platform: group.platform,
      count: group.rows.length,
      code: result.code,
      durationMs: result.durationMs,
      parsed,
      stderrTail: result.stderr.slice(-1200),
    };
  });
  writeJson('structured-platform-results.json', platformResults);

  const affectedIds = [...new Set(candidates.map((row) => row.restaurant_id))];
  fs.writeFileSync(path.join(OUT_DIR, 'affected-ids.txt'), `${affectedIds.join('\n')}\n`);

  const auditArgs = [
    `--ids=${affectedIds.join(',')}`,
    '--include-without-menu',
    '--apply-blockers',
  ];
  console.log(JSON.stringify({ step: 'structural_audit', ids: affectedIds.length }));
  const audit = affectedIds.length
    ? await runNode('scratch/restaurant-ready-structural-auditor.mjs', auditArgs)
    : { code: 0, stdout: '{}', stderr: '' };
  fs.writeFileSync(path.join(OUT_DIR, 'audit.stdout.txt'), audit.stdout);
  fs.writeFileSync(path.join(OUT_DIR, 'audit.stderr.txt'), audit.stderr);

  let auditParsed = null;
  try {
    auditParsed = parseLastJson(audit.stdout);
  } catch {}

  const summary = {
    success: platformResults.every((item) => item.code === 0) && audit.code === 0,
    runId: RUN_ID,
    outDir: OUT_DIR,
    city: CITY,
    state: STATE,
    apply: APPLY,
    queuePath: queueResult.jsonPath,
    queueSummary: queueResult.summary,
    selectedCount: candidates.length,
    selectedByPlatform: Object.fromEntries(grouped.map((group) => [group.platform, group.rows.length])),
    platformResults,
    audit: auditParsed,
  };
  writeJson('summary.json', summary);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  ensureOutDir();
  const payload = { success: false, runId: RUN_ID, outDir: OUT_DIR, error: error.message || String(error) };
  writeJson('summary.json', payload);
  console.error(JSON.stringify(payload, null, 2));
  process.exitCode = 1;
});

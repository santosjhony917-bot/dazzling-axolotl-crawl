import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const argValue = (name, fallback = '') => {
  const entry = args.find((arg) => arg.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : fallback;
};

const ORCH_ROOT = path.join('scratch', 'menu-orchestrator');
const LEASE_FILE = path.join(ORCH_ROOT, 'leases.json');
const RUNS_ROOT = path.join('scratch', 'menu-extraction-verification');
const limitRuns = Number(argValue('--runs', '12')) || 12;

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function isActiveLease(lease, now = Date.now()) {
  if (!lease || lease.status === 'released' || lease.status === 'done') return false;
  if (!lease.expiresAt) return true;
  return new Date(lease.expiresAt).getTime() > now;
}

function listSummaryFiles() {
  if (!fs.existsSync(RUNS_ROOT)) return [];
  return fs.readdirSync(RUNS_ROOT)
    .map((name) => path.join(RUNS_ROOT, name, 'summary.json'))
    .filter((file) => fs.existsSync(file))
    .map((file) => ({ file, mtimeMs: fs.statSync(file).mtimeMs }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .slice(0, limitRuns)
    .map(({ file }) => file);
}

function summarizeRun(file) {
  const summary = readJson(file, {});
  const processed = Array.isArray(summary.processed) ? summary.processed : [];
  const reviewCounts = summary.reviewCounts || {};
  const committed = processed.filter((entry) => entry.committed || entry.review?.committed).length;
  const errors = processed.filter((entry) => entry.error || entry.review?.error).length;
  const laneIds = [...new Set(processed.map((entry) => entry.laneId || entry.queue?.laneId).filter(Boolean))];
  return {
    runId: summary.runId || path.basename(path.dirname(file)),
    file,
    apply: Boolean(summary.apply),
    laneIds,
    targetCount: Number(summary.targetCount || 0),
    processed: processed.length,
    committed,
    errors,
    reviewCounts: {
      green: Number(reviewCounts.green || 0),
      yellow: Number(reviewCounts.yellow || 0),
      red: Number(reviewCounts.red || 0),
    },
    sample: processed.slice(0, 6).map((entry) => ({
      id: entry.restaurantId,
      name: entry.restaurantName,
      platform: entry.platform,
      tier: entry.review?.tier || null,
      committed: Boolean(entry.committed || entry.review?.committed),
      flags: entry.review?.flags || [],
    })),
  };
}

function main() {
  const leaseState = readJson(LEASE_FILE, { leases: {} });
  const leases = Object.values(leaseState.leases || {});
  const activeLeases = leases.filter((lease) => isActiveLease(lease));
  const activeByLane = activeLeases.reduce((acc, lease) => {
    acc[lease.laneId || 'unknown'] ||= { count: 0, platforms: {}, sample: [] };
    acc[lease.laneId || 'unknown'].count += 1;
    acc[lease.laneId || 'unknown'].platforms[lease.platform || 'unknown'] = (acc[lease.laneId || 'unknown'].platforms[lease.platform || 'unknown'] || 0) + 1;
    if (acc[lease.laneId || 'unknown'].sample.length < 8) {
      acc[lease.laneId || 'unknown'].sample.push({
        id: lease.restaurant_id,
        name: lease.name,
        platform: lease.platform,
        tier: lease.tier,
        expiresAt: lease.expiresAt,
      });
    }
    return acc;
  }, {});

  const runs = listSummaryFiles().map(summarizeRun);
  const totals = runs.reduce((acc, run) => {
    acc.targetCount += run.targetCount;
    acc.processed += run.processed;
    acc.committed += run.committed;
    acc.errors += run.errors;
    acc.green += run.reviewCounts.green;
    acc.yellow += run.reviewCounts.yellow;
    acc.red += run.reviewCounts.red;
    return acc;
  }, { targetCount: 0, processed: 0, committed: 0, errors: 0, green: 0, yellow: 0, red: 0 });

  console.log(JSON.stringify({
    success: true,
    leaseFile: path.resolve(LEASE_FILE),
    activeLeaseCount: activeLeases.length,
    activeByLane,
    recentRunCount: runs.length,
    recentTotals: totals,
    recentRuns: runs,
  }, null, 2));
}

main();

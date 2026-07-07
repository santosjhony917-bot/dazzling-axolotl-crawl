import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
  const index = trimmed.indexOf('=');
  env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
}

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_SERVICE_ROLE_KEY
    || env.SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_ANON_KEY,
);

const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const decodeLoose = (value) => {
  try {
    return decodeURIComponent(String(value || '').replace(/\+/g, ' '));
  } catch {
    return String(value || '').replace(/\+/g, ' ');
  }
};

const parseLogs = (value) => {
  if (value && typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return {};
};

const rows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id,name,city,state,address,rating,reviews_count,opening_hours,location_issue_reason,google_maps_url,google_maps_name,coleta_logs')
    .not('google_maps_url', 'is', null)
    .range(from, from + 999);
  if (error) throw error;
  rows.push(...(data || []));
  if (!data || data.length < 1000) break;
}

const targets = rows.filter((row) =>
  !normalize(`${row.city} ${row.state} ${row.address} ${row.location_issue_reason}`).includes('campina grande do sul')
  && normalize(row.state) !== 'pr'
  && (
    normalize(row.city).includes('campina grande')
    || normalize(decodeLoose(row.google_maps_url)).includes('campina grande')
    || normalize(row.google_maps_name).includes('campina grande')
    || normalize(row.name).includes('campina grande')
  )
);

const stats = {
  totalTargets: targets.length,
  googleBaseSuccess: 0,
  googleBaseReviewOrFailed: 0,
  withAddress: 0,
  withRating: 0,
  withReviewsCount: 0,
  withWeeklyHours: 0,
  permanentlyClosed: 0,
  temporarilyClosed: 0,
  maybeClosed: 0,
  outOfScope: 0,
};

for (const row of targets) {
  const googleBase = parseLogs(row.coleta_logs).google_maps_base;
  if (googleBase?.success === true) stats.googleBaseSuccess += 1;
  if (googleBase?.success === false) stats.googleBaseReviewOrFailed += 1;
  if (row.address) stats.withAddress += 1;
  if (row.rating != null) stats.withRating += 1;
  if (row.reviews_count != null) stats.withReviewsCount += 1;
  if (row.opening_hours && typeof row.opening_hours === 'object' && Object.keys(row.opening_hours).length === 7) stats.withWeeklyHours += 1;
  if (googleBase?.isPermanentlyClosed || /permanentemente fechado|permanently closed/i.test(googleBase?.statusText || '')) stats.permanentlyClosed += 1;
  if (googleBase?.isTemporarilyClosed || /temporariamente fechado|temporarily closed/i.test(googleBase?.statusText || '')) stats.temporarilyClosed += 1;
  if (/pode estar fechado/i.test(`${row.location_issue_reason || ''} ${googleBase?.statusText || ''}`)) stats.maybeClosed += 1;
  if (/fora do escopo/i.test(`${row.location_issue_reason || ''} ${googleBase?.error || ''}`)) stats.outOfScope += 1;
}

const nextPendingIndex = targets.findIndex((row) => {
  const googleBase = parseLogs(row.coleta_logs).google_maps_base;
  return googleBase?.success !== true && !/fora do escopo/i.test(row.location_issue_reason || '');
});

console.log(JSON.stringify({
  ...stats,
  nextPendingIndex,
  nextPending: nextPendingIndex >= 0 ? {
    id: targets[nextPendingIndex].id,
    name: targets[nextPendingIndex].name,
    issue: targets[nextPendingIndex].location_issue_reason,
  } : null,
}, null, 2));

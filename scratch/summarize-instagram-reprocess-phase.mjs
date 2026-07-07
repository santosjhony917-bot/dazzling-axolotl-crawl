import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const cutoff = process.argv.find((arg) => arg.startsWith('--since='))?.split('=')[1]
  || '2026-07-06T00:00:00.000Z';
const cutoffTime = Date.parse(cutoff);
const compact = process.argv.includes('--compact');

const env = {};
for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
  const index = trimmed.indexOf('=');
  env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
}

const supabase = createClient(
  env.VITE_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_SERVICE_ROLE_KEY
    || env.SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

const parseJson = (value) => {
  if (value && typeof value === 'object') return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch {}
  }
  return {};
};

const hasInstagram = (row) => Boolean(row.instagram)
  || (Array.isArray(row.social_networks)
    && row.social_networks.some((entry) =>
      String(entry?.platform || '').toLowerCase() === 'instagram'
      && String(entry?.url || '').includes('instagram.com')));

const rows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id,name,google_maps_name,category,city,state,phone,instagram,social_networks,coleta_logs,is_deleted,reviews_count,rating,menu_status,location_issue_reason')
    .eq('city', 'Campina Grande')
    .eq('state', 'PB')
    .or('is_deleted.eq.false,is_deleted.is.null')
    .range(from, from + 999);
  if (error) throw error;
  rows.push(...(data || []));
  if (!data || data.length < 1000) break;
}

const processed = rows
  .map((row) => {
    const log = parseJson(row.coleta_logs)?.campina_instagram_search_v1 || {};
    const checkedAt = Date.parse(log.checkedAt || '');
    return { row, log, checkedAt };
  })
  .filter((entry) => Number.isFinite(entry.checkedAt) && entry.checkedAt >= cutoffTime);

const counts = {};
for (const entry of processed) {
  const status = entry.log.status || 'unknown';
  counts[status] = (counts[status] || 0) + 1;
}

const found = processed
  .filter((entry) => entry.log.status === 'found')
  .map((entry) => ({
    name: entry.row.name,
    instagram: entry.row.instagram || entry.log.selectedUrl || null,
    confidence: entry.log.confidence || 0,
    reviews_count: entry.row.reviews_count || 0,
    checkedAt: entry.log.checkedAt,
  }))
  .sort((a, b) => String(a.name).localeCompare(String(b.name)));

const lowConfidenceFound = found
  .filter((entry) => Number(entry.confidence || 0) < 0.8)
  .sort((a, b) => Number(a.confidence || 0) - Number(b.confidence || 0));

const removableRegex = /\b(?:praca de alimentacao|rodoviaria|terminal rodoviario|pousada|hotel|abrigo|semas|cras|cadastro unico|cozinha solidaria|restaurante popular|restaurante universitario|cabeleireir[ao]|salao de beleza|barbearia|igreja|paroquia|capela|santuario|shopping|mercado publico|feira|acai$|^acai$)\b/i;
const removableCandidates = processed
  .filter((entry) => {
    const text = [
      entry.row.name,
      entry.row.google_maps_name,
      entry.row.category,
      entry.log.reason,
    ].filter(Boolean).join(' ');
    return removableRegex.test(text);
  })
  .map((entry) => ({
    id: entry.row.id,
    name: entry.row.name,
    category: entry.row.category,
    reason: entry.log.reason || null,
  }))
  .sort((a, b) => String(a.name).localeCompare(String(b.name)));

const current = {
  withInstagram: rows.filter(hasInstagram).length,
  withoutInstagram: rows.filter((row) => !hasInstagram(row)).length,
};

const summary = {
  cutoff,
  activeCampinaRows: rows.length,
  current,
  processedSinceCutoff: processed.length,
  counts,
  foundCount: found.length,
  lowConfidenceFound,
  removableCandidateCount: removableCandidates.length,
  removableCandidates,
};

if (!compact) summary.found = found;

console.log(JSON.stringify(summary, null, 2));

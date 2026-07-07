import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const REPORT_ITEMS = 'scratch/cabedelo-instagram-validation-report/2026-07-07T14-04-52-526Z/items.json';
const CITY = 'Cabedelo';
const STATE = 'PB';
const EXPECTED_IDS = new Set([
  '10f71936-a4b9-4c9b-b2c4-d1c709081a93',
  'fd64e520-194c-4a69-a6e7-1ea6f8213889',
  'b91f652e-112d-4dcf-921c-4df6c2d1700f',
]);
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join('scratch', 'cabedelo-instagram-safe-apply', RUN_ID);

function readEnv() {
  const env = { ...process.env };
  if (!fs.existsSync('.env')) return env;
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!env[key]) env[key] = value;
  }
  return env;
}

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function parseArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {}
  }
  return [];
}

function mergeSocialNetworks(current, item) {
  const list = parseArray(current).filter((entry) => String(entry?.platform || '').toLowerCase() !== 'instagram');
  list.push({
    platform: 'instagram',
    url: item.instagram,
    followers: Number(item.followers || 0) || null,
    biography: clean(item.bio).slice(0, 1000) || null,
    bio_phone: item.bioPhone || null,
    bio_whatsapp_url: item.bioLink || null,
    bio_opening_hours_text: item.bioOpeningHoursText || null,
    opening_hours_from_bio: item.opening_hours || null,
    source: 'serpapi_google_plus_apify_safe_validation',
    confidence: Number(item.confidence || 0) / 100,
    verifiedAt: new Date().toISOString(),
  });
  return list;
}

function logPatch(item) {
  const recantoNoDays = item.id === 'b91f652e-112d-4dcf-921c-4df6c2d1700f';
  return {
    instagram_safe_apply_2026_07_07: {
      appliedAt: new Date().toISOString(),
      sourceReport: REPORT_ITEMS,
      status: item.status,
      confidence: item.confidence,
      instagram: item.instagram,
      followers: Number(item.followers || 0) || null,
      biography: clean(item.bio) || null,
      bio_phone: item.bioPhone || null,
      bio_whatsapp_url: item.bioLink || null,
      bio_opening_hours_text: item.bioOpeningHoursText || null,
      opening_hours_applied: Boolean(item.opening_hours),
      opening_hours: item.opening_hours || null,
      observation: recantoNoDays
        ? 'Bio menciona "das 17 as 23horas", mas nao informa dias; opening_hours nao foi alterado.'
        : null,
      appliedFields: [
        'instagram',
        'followers_override',
        'social_networks',
        ...(item.bioPhone ? ['phone'] : []),
        ...(item.bioLink ? ['whatsapp_url'] : []),
        ...(item.opening_hours ? ['opening_hours'] : []),
        'coleta_logs',
      ],
    },
  };
}

async function fetchRows(supabase, ids) {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id,name,city,state,phone,whatsapp_url,instagram,followers_override,social_networks,opening_hours,coleta_logs,is_deleted')
    .in('id', ids);
  if (error) throw error;
  return data || [];
}

const env = readEnv();
const supabase = createClient(
  env.VITE_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_SERVICE_ROLE_KEY
    || env.SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

const allItems = JSON.parse(fs.readFileSync(REPORT_ITEMS, 'utf8'));
const items = allItems.filter((item) => item.status === 'secure' && EXPECTED_IDS.has(item.id));
if (items.length !== 3) {
  throw new Error(`Esperava exatamente 3 itens seguros, encontrei ${items.length}.`);
}

const beforeRows = await fetchRows(supabase, [...EXPECTED_IDS]);
const beforeById = new Map(beforeRows.map((row) => [row.id, row]));
for (const item of items) {
  const row = beforeById.get(item.id);
  if (!row) throw new Error(`Restaurante nao encontrado: ${item.id}`);
  if (row.city !== CITY || row.state !== STATE || row.is_deleted) {
    throw new Error(`Restaurante fora do escopo seguro: ${item.id} ${row.name}`);
  }
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'before.json'), JSON.stringify(beforeRows, null, 2), 'utf8');

const updates = [];
for (const item of items) {
  const row = beforeById.get(item.id);
  const logs = {
    ...parseJson(row.coleta_logs),
    ...logPatch(item),
  };
  const update = {
    instagram: item.instagram,
    followers_override: Number(item.followers || 0) || null,
    social_networks: mergeSocialNetworks(row.social_networks, item),
    coleta_logs: JSON.stringify(logs),
  };
  if (item.bioPhone) update.phone = item.bioPhone;
  if (item.bioLink) update.whatsapp_url = item.bioLink;
  if (item.opening_hours) update.opening_hours = item.opening_hours;

  const { data, error } = await supabase
    .from('restaurants')
    .update(update)
    .eq('id', item.id)
    .eq('city', CITY)
    .eq('state', STATE)
    .select('id,name,phone,whatsapp_url,instagram,followers_override,social_networks,opening_hours,coleta_logs')
    .single();
  if (error) throw error;
  updates.push({
    id: item.id,
    name: item.name,
    appliedUpdate: update,
    saved: data,
  });
}

const afterRows = await fetchRows(supabase, [...EXPECTED_IDS]);
const summary = {
  runId: RUN_ID,
  appliedAt: new Date().toISOString(),
  updatedIds: updates.map((item) => item.id),
  updates: updates.map((item) => ({
    id: item.id,
    name: item.name,
    instagram: item.saved.instagram,
    followers_override: item.saved.followers_override,
    phone: item.saved.phone,
    whatsapp_url: item.saved.whatsapp_url,
    opening_hours_changed: Boolean(item.appliedUpdate.opening_hours),
    social_networks_instagram: parseArray(item.saved.social_networks).find((entry) => entry?.platform === 'instagram') || null,
    log_key: 'instagram_safe_apply_2026_07_07',
  })),
  outDir: OUT_DIR,
};

fs.writeFileSync(path.join(OUT_DIR, 'after.json'), JSON.stringify(afterRows, null, 2), 'utf8');
fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
console.log(JSON.stringify(summary, null, 2));

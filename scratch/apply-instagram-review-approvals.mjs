import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const argValue = (name, fallback = '') => {
  const entry = args.find((arg) => arg.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : fallback;
};

const REVIEW = argValue('--review', '');
const CITY = argValue('--city', 'Cabedelo');
const STATE = argValue('--state', 'PB');
if (!REVIEW) throw new Error('Use --review=path/to/review.json');

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function readEnv() {
  const env = { ...process.env };
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return env;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!env[key]) env[key] = value;
  }
  return env;
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

function mergeLogs(value, patch) {
  return JSON.stringify({ ...parseJson(value), ...patch });
}

function socialNetworksWithInstagram(current, url, metadata) {
  const list = Array.isArray(current) ? current : [];
  return [
    ...list.filter((item) => item?.platform !== 'instagram'),
    {
      platform: 'instagram',
      url,
      source: 'serpapi_unsafe_review_fast_apply',
      confidence: metadata.score,
      collected_at: new Date().toISOString(),
      title: metadata.title,
    },
  ];
}

const payload = JSON.parse(fs.readFileSync(REVIEW, 'utf8'));
const approved = (payload.items || []).filter((item) => item.status === 'approve' && item.best?.url);
const env = readEnv();
const supabase = createClient(
  env.VITE_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_SERVICE_ROLE_KEY
    || env.SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

const applied = [];
const skipped = [];
const failures = [];

for (const item of approved) {
  const { data: row, error: selectError } = await supabase
    .from('restaurants')
    .select('id,name,city,state,instagram,social_networks,coleta_logs,is_deleted')
    .eq('id', item.id)
    .maybeSingle();
  if (selectError) {
    failures.push({ id: item.id, name: item.name, error: selectError.message });
    continue;
  }
  if (!row || row.is_deleted || row.city !== CITY || row.state !== STATE) {
    skipped.push({ id: item.id, name: item.name, reason: 'not_active_city_row' });
    continue;
  }
  if (clean(row.instagram)) {
    skipped.push({ id: item.id, name: row.name, reason: 'already_has_instagram', instagram: row.instagram });
    continue;
  }
  const update = {
    instagram: item.best.url,
    social_networks: socialNetworksWithInstagram(row.social_networks, item.best.url, {
      score: item.best.score,
      title: item.best.title,
    }),
    coleta_logs: mergeLogs(row.coleta_logs, {
      serpapi_instagram_unsafe_review_fast_apply: {
        appliedAt: new Date().toISOString(),
        sourceReview: REVIEW,
        source: 'google_serpapi_targeted_unsafe_review',
        instagram: item.best.url,
        score: item.best.score,
        title: item.best.title,
        evidenceSample: item.best.evidenceSample,
        previousReason: item.previousReason || null,
        previousScore: item.previousScore || null,
      },
    }),
  };
  const { error } = await supabase
    .from('restaurants')
    .update(update)
    .eq('id', row.id)
    .eq('city', CITY)
    .eq('state', STATE);
  if (error) failures.push({ id: row.id, name: row.name, error: error.message });
  else applied.push({ id: row.id, name: row.name, instagram: item.best.url, score: item.best.score });
}

const summary = {
  review: REVIEW,
  city: CITY,
  state: STATE,
  approvedInReview: approved.length,
  applied: applied.length,
  skipped,
  failures,
  appliedRows: applied,
};

console.log(JSON.stringify(summary, null, 2));

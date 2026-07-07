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
  env.VITE_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_SERVICE_ROLE_KEY
    || env.SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

const hasInstagram = (row) => Boolean(row.instagram)
  || (Array.isArray(row.social_networks)
    && row.social_networks.some((item) => String(item?.platform || '').toLowerCase() === 'instagram' && item?.url));

const nonIfood = (url) => url && !/ifood\.com\.br/i.test(String(url));

const rows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id,name,google_maps_name,instagram,social_networks,menu_status,other_url,external_url,ifood_url,coleta_logs,is_deleted,city,state')
    .eq('city', 'Campina Grande')
    .eq('state', 'PB')
    .eq('is_deleted', false)
    .range(from, from + 999);
  if (error) throw error;
  rows.push(...(data || []));
  if (!data || data.length < 1000) break;
}

const statuses = {};
for (const row of rows) statuses[row.menu_status || 'null'] = (statuses[row.menu_status || 'null'] || 0) + 1;

const withInstagram = rows.filter(hasInstagram);
const withNonIfoodMenuSource = withInstagram.filter((row) => nonIfood(row.other_url) || nonIfood(row.external_url));
const targetNoMenuSource = withInstagram.filter((row) =>
  !nonIfood(row.other_url)
  && !nonIfood(row.external_url)
  && row.menu_status !== 'found'
);
const bioLogStatuses = {};
const googleLogStatuses = {};
for (const row of withInstagram) {
  const logs = row.coleta_logs && typeof row.coleta_logs === 'object'
    ? row.coleta_logs
    : (() => {
        try { return JSON.parse(row.coleta_logs || '{}'); } catch { return {}; }
      })();
  const status = logs?.campina_instagram_bio_menu_v1?.status;
  if (status) bioLogStatuses[status] = (bioLogStatuses[status] || 0) + 1;
  const googleStatus = logs?.campina_google_menu_search_v1?.status;
  if (googleStatus) googleLogStatuses[googleStatus] = (googleLogStatuses[googleStatus] || 0) + 1;
}
const bioProcessed = Object.values(bioLogStatuses).reduce((sum, value) => sum + value, 0);
const googleProcessed = Object.values(googleLogStatuses).reduce((sum, value) => sum + value, 0);

console.log(JSON.stringify({
  active: rows.length,
  withInstagram: withInstagram.length,
  withNonIfoodMenuSource: withNonIfoodMenuSource.length,
  targetNoMenuSource: targetNoMenuSource.length,
  bioProcessed,
  bioRemaining: withInstagram.length - bioProcessed,
  bioLogStatuses,
  googleProcessed,
  googleRemainingAmongInstagram: withInstagram.length - googleProcessed,
  googleLogStatuses,
  statuses,
  sample: targetNoMenuSource.slice(0, 15).map((row) => ({
    id: row.id,
    name: row.google_maps_name || row.name,
    instagram: row.instagram || '',
    menu_status: row.menu_status || null,
  })),
}, null, 2));

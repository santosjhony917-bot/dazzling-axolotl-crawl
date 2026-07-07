import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const INCLUDE_WITH_INSTAGRAM = process.argv.includes('--include-instagram');
const LIMIT = Number(process.argv.find(arg => arg.startsWith('--limit='))?.split('=')[1] || 0) || null;
const LOG_KEY = 'campina_menu_whatsapp_queue_v1';
const MENU_MESSAGES = [
  'Ol\u00e1! Tudo bem? Pode me enviar o card\u00e1pio atualizado, por favor?',
  'Oi, tudo bem? Pode me mandar o card\u00e1pio atualizado, por favor?',
  'Ol\u00e1, tudo bem? Voc\u00eas podem me enviar o card\u00e1pio atualizado, por favor?',
  'Oi! Tudo bem? Consegue me mandar o card\u00e1pio atualizado, por favor?',
  'Ol\u00e1! Poderia me mandar o card\u00e1pio atualizado, por favor?',
  'Oi, boa! Pode me enviar o card\u00e1pio atualizado, por favor?',
  'Ol\u00e1, tudo certo? Pode me mandar o card\u00e1pio atualizado, por favor?',
  'Bom dia! Pode me enviar o card\u00e1pio atualizado, por favor?',
];

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

const digits = value => String(value || '').replace(/\D/g, '');
const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
const parseJson = value => {
  if (value && typeof value === 'object') return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return {}; }
  }
  return {};
};

const hasInstagram = row => Boolean(row.instagram)
  || (Array.isArray(row.social_networks)
    && row.social_networks.some(item => String(item?.platform || '').toLowerCase() === 'instagram' && item?.url));

const normalizePhone = row => {
  const raw = digits(row.whatsapp_url) || digits(row.phone);
  if (!raw) return '';
  if (raw.startsWith('55') && raw.length >= 12) return raw;
  if (raw.length >= 10 && raw.length <= 11) return `55${raw}`;
  return raw;
};

const whatsappUrl = phone => phone ? `https://wa.me/${phone}` : '';

async function fetchAllRestaurants() {
  const rows = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id,name,google_maps_name,category,address,neighborhood,city,state,phone,whatsapp_url,instagram,social_networks,rating,reviews_count,menu_status,menu_status_reason,coleta_logs,is_deleted')
      .eq('city', 'Campina Grande')
      .eq('state', 'PB')
      .eq('is_deleted', false)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

function buildMessage(row) {
  const seed = String(row.id || row.name || '');
  let hash = 0;
  for (const char of seed) hash = ((hash * 31) + char.charCodeAt(0)) >>> 0;
  return MENU_MESSAGES[hash % MENU_MESSAGES.length];
}

function reasonFor(row) {
  const logs = parseJson(row.coleta_logs);
  const menuLog = logs.campina_menu_collection_v1 || {};
  if (menuLog.status === 'whatsapp_menu_request_needed') return menuLog.reason || 'public_menu_not_found';
  if (!hasInstagram(row)) return 'no_instagram_with_google_phone';
  if (menuLog.onlyIfood) return 'only_ifood_public_link';
  if (menuLog.status === 'not_found') return menuLog.reason || 'instagram_without_public_menu';
  return 'fallback_after_public_menu_attempt';
}

function toQueueEntry(row) {
  const phone = normalizePhone(row);
  return {
    restaurant_id: row.id,
    name: clean(row.google_maps_name || row.name),
    category: clean(row.category),
    neighborhood: clean(row.neighborhood),
    address: clean(row.address),
    phone: clean(row.phone),
    normalized_phone: phone,
    whatsapp_url: whatsappUrl(phone),
    instagram: row.instagram || '',
    rating: row.rating ?? null,
    reviews_count: row.reviews_count ?? null,
    menu_status: row.menu_status || 'unknown',
    reason: reasonFor(row),
    suggested_message: buildMessage(row),
  };
}

async function markQueued(row, entry) {
  const previousLogs = parseJson(row.coleta_logs);
  const checkedAt = new Date().toISOString();
  const payload = {
    coleta_logs: {
      ...previousLogs,
      [LOG_KEY]: {
        queuedAt: checkedAt,
        status: 'queued',
        reason: entry.reason,
        normalizedPhone: entry.normalized_phone,
        whatsappUrl: entry.whatsapp_url,
        source: hasInstagram(row) ? 'instagram_fallback_or_google_phone' : 'google_phone_no_instagram',
      },
    },
    menu_status: 'manual_required',
    menu_status_reason: `Aguardando pedido de cardapio via WhatsApp: ${entry.reason}.`,
    menu_last_checked_at: checkedAt,
  };
  const { error } = await supabase.from('restaurants').update(payload).eq('id', row.id);
  if (error) throw error;
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function main() {
  const rows = await fetchAllRestaurants();
  const candidates = rows
    .filter(row => (row.menu_status || 'unknown') !== 'found')
    .filter(row => normalizePhone(row).length >= 12)
    .filter(row => INCLUDE_WITH_INSTAGRAM || !hasInstagram(row))
    .map(toQueueEntry)
    .sort((a, b) => Number(b.reviews_count || 0) - Number(a.reviews_count || 0));

  const selected = LIMIT ? candidates.slice(0, LIMIT) : candidates;
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.join('scratch', 'campina-menu-whatsapp-queue');
  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, `${runId}.json`);
  const csvPath = path.join(outDir, `${runId}.csv`);
  fs.writeFileSync(jsonPath, JSON.stringify(selected, null, 2));
  const headers = Object.keys(selected[0] || {
    restaurant_id: '', name: '', category: '', neighborhood: '', address: '', phone: '',
    normalized_phone: '', whatsapp_url: '', instagram: '', rating: '', reviews_count: '',
    menu_status: '', reason: '', suggested_message: '',
  });
  fs.writeFileSync(csvPath, [
    headers.join(';'),
    ...selected.map(row => headers.map(header => csvEscape(row[header])).join(';')),
  ].join('\n'));

  if (APPLY) {
    const byId = new Map(rows.map(row => [row.id, row]));
    for (const entry of selected) {
      await markQueued(byId.get(entry.restaurant_id), entry);
      console.log(`[queue] ${entry.name} -> ${entry.reason}`);
    }
  }

  console.log(JSON.stringify({
    success: true,
    apply: APPLY,
    includeWithInstagram: INCLUDE_WITH_INSTAGRAM,
    totalActiveCampina: rows.length,
    queueCount: candidates.length,
    selectedCount: selected.length,
    jsonPath,
    csvPath,
    topReasons: selected.reduce((acc, row) => {
      acc[row.reason] = (acc[row.reason] || 0) + 1;
      return acc;
    }, {}),
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

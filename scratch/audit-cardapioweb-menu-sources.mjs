import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const LOG_KEY = 'campina_instagram_bio_menu_v1';
const MENU_COLLECTION_LOG_KEY = 'campina_menu_collection_v1';

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

const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9\s._-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
const compact = (value) => normalize(value).replace(/[^a-z0-9]+/g, '');
const digits = (value) => String(value || '').replace(/\D/g, '');
const inCampinaScopeCity = (city, state) => {
  const normalizedCity = normalize(city || '');
  const normalizedState = normalize(state || '');
  const allowedCities = new Set(['campina grande', 'galante', 'sao jose da mata', 'catole de boa vista']);
  return normalizedState === 'pb' && allowedCities.has(normalizedCity);
};
const nameStopwords = new Set([
  'restaurante', 'bar', 'lanchonete', 'pizzaria', 'pizza', 'hamburgueria', 'hamburguer',
  'burger', 'burguer', 'lanche', 'lanches', 'delivery', 'campina', 'grande', 'pb',
  'acai', 'acaiteria', 'sorveteria', 'doceria', 'confeitaria', 'pastelaria', 'pastel',
  'salgado', 'salgados', 'marmitaria', 'marmita', 'quentinha', 'quentinhas', 'grill',
  'self', 'service', 'unidade', 'und', 'loja', 'centro', 'casa', 'dona', 'seu', 'sua',
  'do', 'da', 'de', 'dos', 'das', 'e', 'a', 'o', 'as', 'os', 'cg', 'cafeteria', 'cafe',
  'petiscaria', 'pesticaria', 'concept', 'conceito', 'nostra',
]);

const parseJson = (value) => {
  if (value && typeof value === 'object') return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return {}; }
  }
  return {};
};

const getSlug = (url) => {
  try {
    const parsed = new URL(url);
    if (!/^app\.cardapioweb\.com$/i.test(parsed.hostname)) return '';
    return parsed.pathname.split('/').filter(Boolean)[0] || '';
  } catch {
    return '';
  }
};

const getDistinctiveTokens = (row) => normalize(row.google_maps_name || row.name || '')
  .split(/\s+/)
  .map((token) => token.replace(/^[._-]+|[._-]+$/g, ''))
  .filter((token) => token.length >= 3 && !nameStopwords.has(token))
  .slice(0, 8);

const identityCheck = (row, url, profile) => {
  const tokens = getDistinctiveTokens(row);
  const profileText = [
    url,
    profile?.slug,
    profile?.name,
    profile?.address,
    profile?.phone,
  ].filter(Boolean).join(' ');
  const normalizedProfileText = normalize(profileText);
  const compactProfileText = compact(normalizedProfileText);
  const rowNumber = normalize(row.number || '').replace(/[^a-z0-9/-]/g, '');
  const rowStreetTokens = normalize(row.address || '')
    .split(/\s+/)
    .filter((token) => token.length >= 4 && !['rua', 'avenida', 'travessa', 'rodovia', 'br'].includes(token))
    .slice(0, 4);
  const rowNeighborhood = normalize(row.neighborhood || '');
  const addressMatch = Boolean(
    rowNumber
      && normalizedProfileText.includes(rowNumber)
      && rowStreetTokens.some((token) => normalizedProfileText.includes(token)),
  );
  const neighborhoodMatch = Boolean(
    rowNeighborhood
      && rowNeighborhood.length >= 4
      && normalizedProfileText.includes(rowNeighborhood),
  );
  const rowPhone = digits(row.phone || row.whatsapp_url || '').slice(-8);
  const phoneMatch = Boolean(rowPhone && rowPhone.length >= 8 && digits(profileText).includes(rowPhone));
  if (addressMatch || phoneMatch) {
    return { ok: true, tokens, hits: [], reason: addressMatch ? 'address_matches_row' : 'phone_matches_row', addressMatch, neighborhoodMatch, phoneMatch };
  }
  const rowName = normalize(row.google_maps_name || row.name || '');
  if (/\bchina\b/.test(rowName) && !/\bchinatown\b/.test(rowName) && compactProfileText.includes('chinatown')) {
    return { ok: false, tokens, hits: [], reason: 'china_is_weak_token_without_address_or_phone_match', addressMatch, neighborhoodMatch, phoneMatch };
  }
  if (!tokens.length) return { ok: true, tokens, hits: [], reason: 'no_distinctive_tokens', addressMatch, neighborhoodMatch, phoneMatch };
  const hits = tokens.filter((token) => compactProfileText.includes(compact(token)));
  if (neighborhoodMatch && hits.length >= 1) {
    return { ok: true, tokens, hits, reason: 'neighborhood_and_name_token_match', addressMatch, neighborhoodMatch, phoneMatch };
  }
  const required = Math.min(2, tokens.length);
  return {
    ok: hits.length >= required,
    tokens,
    hits,
    required,
    addressMatch,
    neighborhoodMatch,
    phoneMatch,
    reason: hits.length >= required ? 'distinctive_tokens_match' : 'profile_name_slug_do_not_match_row',
  };
};

async function fetchProfile(url) {
  const slug = getSlug(url);
  if (!slug) return null;
  const apiUrl = `https://integracao.cardapioweb.com/api/menu/company/profile?company=${encodeURIComponent(slug)}&hostname=app.cardapioweb.com`;
  const response = await fetch(apiUrl, {
    headers: {
      accept: 'application/json, text/plain, */*',
      origin: 'https://app.cardapioweb.com',
      referer: `https://app.cardapioweb.com/${encodeURIComponent(slug)}`,
      'user-agent': 'Mozilla/5.0',
    },
  });
  if (!response.ok) return { ok: false, status: response.status, apiUrl, slug };
  const data = await response.json();
  return {
    ok: true,
    apiUrl,
    slug,
    name: data.name || null,
    city: data.city || null,
    state: data.state || null,
    phone: data.order_whatsapp || data.phone_number || null,
    address: [data.street, data.address_number, data.neighborhood, data.city, data.state].filter(Boolean).join(', '),
  };
}

const rows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id,name,google_maps_name,address,number,neighborhood,phone,whatsapp_url,city,state,menu_status,menu_status_reason,other_url,external_url,other_url_label,coleta_logs')
    .eq('city', 'Campina Grande')
    .eq('state', 'PB')
    .or('other_url.ilike.%app.cardapioweb.com%,external_url.ilike.%app.cardapioweb.com%')
    .range(from, from + 999);
  if (error) throw error;
  rows.push(...(data || []));
  if (!data || data.length < 1000) break;
}

const targets = [];
const checked = [];
for (const row of rows) {
  const url = row.other_url || row.external_url;
  const profile = await fetchProfile(url);
  const identity = profile?.ok ? identityCheck(row, url, profile) : null;
  checked.push({ id: row.id, name: row.google_maps_name || row.name, url, profile, identity });
  if (!profile?.ok) continue;
  const city = normalize(profile.city);
  const state = normalize(profile.state);
  if ((city || state) && !inCampinaScopeCity(profile.city, profile.state)) {
    targets.push({ row, url, profile, identity, reason: 'location_conflict' });
    continue;
  }
  if (identity && !identity.ok) {
    targets.push({ row, url, profile, identity, reason: 'identity_mismatch' });
  }
}

console.log(JSON.stringify({
  apply: APPLY,
  checked: checked.length,
  conflicts: targets.map(({ row, url, profile, identity, reason }) => ({
    id: row.id,
    name: row.google_maps_name || row.name,
    url,
    profileName: profile.name,
    city: profile.city,
    state: profile.state,
    address: profile.address,
    reason,
    identity,
  })),
}, null, 2));

if (!APPLY) process.exit(0);

for (const { row, url, profile, identity, reason } of targets) {
  const logs = parseJson(row.coleta_logs);
  const now = new Date().toISOString();
  const readableReason = reason === 'identity_mismatch'
    ? `perfil publico (${profile.name || profile.slug || url}) nao bate os tokens do lead (${(identity?.tokens || []).join(', ') || '?'})`
    : `perfil publico aponta para ${profile.city || '?'}-${profile.state || '?'}, nao Campina Grande-PB`;
  const update = {
    other_url: null,
    external_url: null,
    other_url_label: null,
    menu_status: row.menu_status === 'needs_recollection' ? 'unknown' : row.menu_status,
    menu_status_reason: row.menu_status === 'needs_recollection'
      ? `Cardapio Web removido: ${readableReason}.`
      : row.menu_status_reason,
    coleta_logs: {
      ...logs,
      [LOG_KEY]: {
        ...(logs?.[LOG_KEY] || {}),
        status: reason === 'identity_mismatch'
          ? 'bio_cardapioweb_identity_conflict_corrected'
          : 'bio_cardapioweb_location_conflict_corrected',
        correctedAt: now,
        invalidUrl: url,
        profile,
        identity,
      },
      [MENU_COLLECTION_LOG_KEY]: {
        ...(logs?.[MENU_COLLECTION_LOG_KEY] || {}),
        status: reason === 'identity_mismatch'
          ? 'bio_cardapioweb_identity_conflict_corrected'
          : 'bio_cardapioweb_location_conflict_corrected',
        source: 'instagram_bio',
        checkedAt: now,
        reason: readableReason,
      },
    },
  };
  const { error } = await supabase
    .from('restaurants')
    .update(update)
    .eq('id', row.id);
  if (error) throw error;
}

console.log(`Corrected ${targets.length} Cardapio Web location conflicts.`);

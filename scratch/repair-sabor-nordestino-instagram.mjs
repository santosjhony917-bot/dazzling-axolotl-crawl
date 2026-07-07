import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const RESTAURANT_ID = 'b5759814-ff91-4ca0-90b2-8621bb87654f';
const INSTAGRAM_URL = 'https://www.instagram.com/sabor.nordestino.cg/';

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

const parseJson = value => {
  if (value && typeof value === 'object') return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch {}
  }
  return {};
};

const parseArray = value => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {}
  }
  return [];
};

const { data: row, error } = await supabase
  .from('restaurants')
  .select('id,name,google_maps_name,phone,social_networks,contact_candidates,coleta_logs')
  .eq('id', RESTAURANT_ID)
  .single();

if (error) throw error;

const now = new Date().toISOString();
const logs = parseJson(row.coleta_logs);
const socialNetworks = parseArray(row.social_networks)
  .filter(item => String(item?.platform || '').toLowerCase() !== 'instagram');
socialNetworks.push({
  platform: 'instagram',
  url: INSTAGRAM_URL,
  followers: 7320,
  confidence: 0.99,
  source: 'manual_visible_chrome_repair',
  verifiedAt: now,
});

const contactCandidates = parseArray(row.contact_candidates)
  .filter(item => item?.url !== INSTAGRAM_URL);
contactCandidates.unshift({
  platform: 'instagram',
  url: INSTAGRAM_URL,
  confidence: 0.99,
  source: 'manual_visible_chrome_repair',
  reason: 'Perfil sabor.nordestino.cg confirma Sabor Nordestino, Restaurant, Campina Grande - PB, self-service/quentinhas/carne na brasa e WhatsApp 5583993624228 igual ao Maps.',
  checkedAt: now,
});

logs.campina_instagram_search_v1 = {
  ...(logs.campina_instagram_search_v1 || {}),
  checkedAt: now,
  status: 'found',
  selectedUrl: INSTAGRAM_URL,
  confidence: 0.99,
  reason: 'Reparo manual Codex: candidato correto tem handle local .cg, cidade Campina Grande/PB e WhatsApp exatamente igual ao Google Maps.',
  candidates: [
    {
      url: INSTAGRAM_URL,
      googleScore: 120,
      profileScore: 240,
      accepted: true,
      phoneSignal: true,
      citySignal: true,
      addressSignal: false,
      evidenceMatchedTokens: 2,
      tokenCount: 2,
      exactNameInEvidence: true,
      exactNameInHandle: true,
      rejectReason: null,
      profileTitle: 'sabor.nordestino.cg',
      profileMeta: 'Sabor Nordestino. Restaurant. Campina Grande - PB. Self-service, quentinhas, carne na brasa. WhatsApp 5583993624228.',
    },
  ],
};

const { error: updateError } = await supabase
  .from('restaurants')
  .update({
    instagram: INSTAGRAM_URL,
    social_networks: socialNetworks,
    contact_candidates: contactCandidates,
    primary_contact_source: 'manual_visible_chrome_repair',
    contacts_last_checked_at: now,
    coleta_logs: logs,
  })
  .eq('id', RESTAURANT_ID);

if (updateError) throw updateError;

console.log(JSON.stringify({
  success: true,
  id: row.id,
  name: row.name,
  instagram: INSTAGRAM_URL,
}, null, 2));

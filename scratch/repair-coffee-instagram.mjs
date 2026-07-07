import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const RESTAURANT_ID = 'a95db76d-30a1-4ccc-b3a4-6204cb9f08b3';
const INSTAGRAM_URL = 'https://www.instagram.com/co.ffeepb/';

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
  .select('id,name,google_maps_name,address,neighborhood,city,state,phone,instagram,social_networks,contact_candidates,coleta_logs')
  .eq('id', RESTAURANT_ID)
  .single();

if (error) throw error;

const logs = parseJson(row.coleta_logs);
const socialNetworks = parseArray(row.social_networks)
  .filter(item => String(item?.platform || '').toLowerCase() !== 'instagram');
socialNetworks.push({
  platform: 'instagram',
  url: INSTAGRAM_URL,
  followers: 47000,
  confidence: 0.99,
  source: 'manual_visible_chrome_repair',
  verifiedAt: new Date().toISOString(),
});

const contactCandidates = parseArray(row.contact_candidates)
  .filter(item => item?.url !== INSTAGRAM_URL);
contactCandidates.unshift({
  platform: 'instagram',
  url: INSTAGRAM_URL,
  confidence: 0.99,
  source: 'manual_visible_chrome_repair',
  reason: 'Perfil co.ffeepb confirma CO.FFEE, restaurante, Av. Elpidio de Almeida 320, Campina Grande, site coffeepb.com.br e destaque cardapio.',
  checkedAt: new Date().toISOString(),
});

const now = new Date().toISOString();
logs.campina_instagram_search_v1 = {
  ...(logs.campina_instagram_search_v1 || {}),
  checkedAt: now,
  status: 'found',
  selectedUrl: INSTAGRAM_URL,
  confidence: 0.99,
  reason: 'Reparo manual Codex: candidato foi encontrado anteriormente, mas rejeitado por regra rígida demais. Perfil confirma marca, cidade, endereço e site oficial.',
  candidates: [
    {
      url: INSTAGRAM_URL,
      googleScore: 50,
      profileScore: 180,
      accepted: true,
      addressSignal: true,
      evidenceMatchedTokens: 1,
      tokenCount: 3,
      exactNameInEvidence: false,
      exactNameInHandle: false,
      rejectReason: null,
      profileTitle: 'co.ffeepb',
      profileMeta: 'CO.FFEE Restaurante casual contemporaneo. Av. Elpidio de Almeida, 320, Campina Grande. coffeepb.com.br',
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

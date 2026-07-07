import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const RESTAURANT_ID = 'f819055d-464a-4f54-a026-aaf72f9c1e94';

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

const parseArray = (value) => {
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
  .select('id,name,instagram,social_networks,contact_candidates,coleta_logs')
  .eq('id', RESTAURANT_ID)
  .single();

if (error) throw error;

const now = new Date().toISOString();
const logs = parseJson(row.coleta_logs);
logs.campina_instagram_search_v1 = {
  ...(logs.campina_instagram_search_v1 || {}),
  checkedAt: now,
  status: 'not_found',
  selectedUrl: null,
  confidence: 0,
  reason: 'Revisao Codex: resultado anterior por endereco-only foi revertido. @sorvemixcatolecg e @_divina_browneria tinham endereco parecido, mas nenhum token de SucAcai; @sucacai tem nome exato, porem sem prova local/telefone/endereco.',
  candidates: [
    {
      url: 'https://www.instagram.com/sucacai/',
      accepted: false,
      rejectReason: 'nome exato de uma palavra sem prova local por Campina/telefone/endereco',
    },
    {
      url: 'https://www.instagram.com/sorvemixcatolecg/',
      accepted: false,
      addressSignal: true,
      rejectReason: 'endereco confere, mas nenhum token do nome SucAcai aparece; possivel outro negocio no mesmo endereco',
    },
  ],
  learnedRule: 'matching_address_requires_some_name_or_phone_evidence',
};

const socialNetworks = parseArray(row.social_networks)
  .filter((entry) => String(entry?.platform || '').toLowerCase() !== 'instagram'
    && !String(entry?.url || '').includes('instagram.com'));
const contactCandidates = parseArray(row.contact_candidates)
  .filter((entry) => String(entry?.platform || '').toLowerCase() !== 'instagram'
    && !String(entry?.url || '').includes('instagram.com'));

const { error: updateError } = await supabase
  .from('restaurants')
  .update({
    instagram: null,
    social_networks: socialNetworks,
    contact_candidates: contactCandidates,
    primary_contact_source: null,
    followers_override: null,
    contacts_last_checked_at: now,
    coleta_logs: logs,
  })
  .eq('id', RESTAURANT_ID);

if (updateError) throw updateError;

console.log(JSON.stringify({
  success: true,
  id: row.id,
  name: row.name,
  reverted_instagram: row.instagram,
}, null, 2));

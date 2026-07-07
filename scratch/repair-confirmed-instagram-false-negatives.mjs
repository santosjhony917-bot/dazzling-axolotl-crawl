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

const normalizePhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55')) return digits;
  return digits.length >= 10 ? `55${digits}` : digits;
};

const formatPhone = (value) => {
  const phone = normalizePhone(value);
  const local = phone.startsWith('55') ? phone.slice(2) : phone;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return value;
};

const cases = [
  {
    id: '07f489f0-88a8-4688-9c26-3acc55c63f74',
    instagram: 'https://www.instagram.com/china_recife/',
    followers: 12300,
    confidence: 0.99,
    officialPhone: '5583999854943',
    reason: 'Perfil @china_recife confirma China Recife, Restaurant, comida japonesa/chinesa, Campina Grande, horario e WhatsApp de delivery 5583999854943. Corrige falso negativo e evita falso positivo @chinatowncampinagrande, que so casava china+Campina.',
    profileMeta: 'China Recife. Restaurant. Comida Japonesa e Chinesa. Delivery: 83 99854943. Campina Grande. wa.me/5583999854943.',
  },
  {
    id: '95bcd6f4-f48a-45b8-8760-f7d3c6a13ba6',
    instagram: 'https://www.instagram.com/bodaorestauranteebar/',
    followers: 12100,
    confidence: 0.99,
    menuUrl: 'https://app.cardapioweb.com/bo_delivery',
    menuLabel: 'Cardapio Web',
    reason: 'Perfil @bodaorestauranteebar confirma Bodao Restaurante e Bar, Rua Otavio Amorim 150, Cruzeiro, horarios e link oficial de Cardapio Web. Corrige falso negativo causado por ausencia de Campina Grande na bio apesar do endereco exato.',
    profileMeta: 'Bodao - Restaurante e Bar. O melhor bode da cidade. Rua Otavio Amorim, 150, Cruzeiro. Terca a quinta 10h as 16h; sexta e sabados 10h as 17h; domingos 10h as 16h. app.cardapioweb.com/bo_delivery.',
  },
];

const repaired = [];

for (const item of cases) {
  const { data: row, error } = await supabase
    .from('restaurants')
    .select('id,name,google_maps_name,address,neighborhood,city,state,phone,whatsapp_url,instagram,external_url,other_url,menu_status,social_networks,contact_candidates,coleta_logs')
    .eq('id', item.id)
    .single();
  if (error) throw error;

  const now = new Date().toISOString();
  const oldPhone = row.phone || null;
  const oldWhatsapp = row.whatsapp_url || null;
  const logs = parseJson(row.coleta_logs);
  const socialNetworks = parseArray(row.social_networks)
    .filter((entry) => String(entry?.platform || '').toLowerCase() !== 'instagram');
  socialNetworks.push({
    platform: 'instagram',
    url: item.instagram,
    followers: item.followers,
    confidence: item.confidence,
    source: 'manual_visible_chrome_repair',
    verifiedAt: now,
  });

  const contactCandidates = parseArray(row.contact_candidates)
    .filter((entry) => entry?.url !== item.instagram);
  contactCandidates.unshift({
    platform: 'instagram',
    url: item.instagram,
    confidence: item.confidence,
    source: 'manual_visible_chrome_repair',
    reason: item.reason,
    checkedAt: now,
  });
  if (item.officialPhone) {
    contactCandidates.unshift({
      platform: 'whatsapp',
      phone: formatPhone(item.officialPhone),
      url: `https://wa.me/${normalizePhone(item.officialPhone)}`,
      confidence: item.confidence,
      source: 'manual_visible_chrome_repair_instagram_bio',
      reason: `Telefone oficial visto na bio do Instagram. Telefone antigo do Google: ${oldPhone || 'vazio'}.`,
      checkedAt: now,
    });
  }

  logs.campina_instagram_search_v1 = {
    ...(logs.campina_instagram_search_v1 || {}),
    checkedAt: now,
    status: 'found',
    selectedUrl: item.instagram,
    confidence: item.confidence,
    reason: `Reparo manual Codex: ${item.reason}`,
    candidates: [
      {
        url: item.instagram,
        googleScore: 150,
        profileScore: 260,
        accepted: true,
        phoneSignal: Boolean(item.officialPhone && normalizePhone(item.officialPhone).slice(-8) === normalizePhone(row.phone).slice(-8)),
        addressSignal: item.id === '95bcd6f4-f48a-45b8-8760-f7d3c6a13ba6',
        citySignal: item.id === '07f489f0-88a8-4688-9c26-3acc55c63f74',
        exactNameInEvidence: true,
        exactNameInHandle: true,
        rejectReason: null,
        profileTitle: item.instagram.replace('https://www.instagram.com/', '').replace('/', ''),
        profileMeta: item.profileMeta,
      },
    ],
    oldPhone,
    oldWhatsapp,
    learnedRule: item.id === '95bcd6f4-f48a-45b8-8760-f7d3c6a13ba6'
      ? 'matching_street_number_can_validate_without_city_text'
      : 'exact_brand_handle_beats_local_partial_token_profile_and_can_update_official_local_phone',
  };

  const update = {
    instagram: item.instagram,
    social_networks: socialNetworks,
    contact_candidates: contactCandidates,
    primary_contact_source: 'manual_visible_chrome_repair',
    contacts_last_checked_at: now,
    coleta_logs: logs,
  };

  if (item.officialPhone) {
    update.phone = formatPhone(item.officialPhone);
    update.whatsapp_url = `https://wa.me/${normalizePhone(item.officialPhone)}`;
  }

  if (item.menuUrl) {
    update.other_url = item.menuUrl;
    update.external_url = item.menuUrl;
    update.other_url_label = item.menuLabel || 'Cardapio digital';
    update.menu_status = row.menu_status === 'found' ? row.menu_status : 'needs_recollection';
    update.menu_status_reason = 'Link publico de cardapio encontrado no Instagram; aguardando coleta estruturada.';
  }

  const { error: updateError } = await supabase
    .from('restaurants')
    .update(update)
    .eq('id', item.id);
  if (updateError) throw updateError;

  repaired.push({
    id: row.id,
    name: row.name,
    instagram: item.instagram,
    phone_before: oldPhone,
    phone_after: update.phone || row.phone || null,
    menu_url: item.menuUrl || null,
  });
}

console.log(JSON.stringify({ success: true, repaired }, null, 2));

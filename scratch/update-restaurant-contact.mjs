import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const [restaurantId, rawPhone, sourceUrl] = process.argv.slice(2);
if (!restaurantId || !rawPhone) {
  throw new Error('Use: node scratch/update-restaurant-contact.mjs <restaurant_id> <phone_digits> [source_url]');
}

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

function formatBrazilPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  const withoutCountry = digits.startsWith('55') ? digits.slice(2) : digits;
  if (withoutCountry.length === 11) {
    return `+55 (${withoutCountry.slice(0, 2)}) ${withoutCountry.slice(2, 7)}-${withoutCountry.slice(7)}`;
  }
  if (withoutCountry.length === 10) {
    return `+55 (${withoutCountry.slice(0, 2)}) ${withoutCountry.slice(2, 6)}-${withoutCountry.slice(6)}`;
  }
  if (withoutCountry.length === 9) {
    return `+55 ${withoutCountry.slice(0, 5)}-${withoutCountry.slice(5)}`;
  }
  return `+${digits}`;
}

function parseJson(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return {};
  }
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

const { data: row, error: readError } = await supabase
  .from('restaurants')
  .select('id,name,phone,whatsapp_url,coleta_logs')
  .eq('id', restaurantId)
  .single();
if (readError) throw readError;

const digits = String(rawPhone || '').replace(/\D/g, '');
const whatsappUrl = digits ? `https://wa.me/${digits}` : null;
const phone = formatBrazilPhone(digits);
const logs = parseJson(row.coleta_logs);
logs.contact_repair_v1 = {
  repairedAt: new Date().toISOString(),
  source: 'menu_page_whatsapp_link',
  sourceUrl: sourceUrl || null,
  previousPhone: row.phone || null,
  previousWhatsappUrl: row.whatsapp_url || null,
  phone,
  whatsappUrl,
};

const { error: updateError } = await supabase
  .from('restaurants')
  .update({
    phone,
    whatsapp_url: whatsappUrl,
    coleta_logs: JSON.stringify(logs),
  })
  .eq('id', restaurantId);
if (updateError) throw updateError;

console.log(JSON.stringify({ id: row.id, name: row.name, phone, whatsappUrl }, null, 2));

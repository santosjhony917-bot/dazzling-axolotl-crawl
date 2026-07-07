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

const parseJson = value => {
  if (value && typeof value === 'object') return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch {}
  }
  return {};
};

async function getRow(id) {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id,name,coleta_logs')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

const responseKey = 'campina_menu_whatsapp_response_v1';

const coffeeId = 'a95db76d-30a1-4ccc-b3a4-6204cb9f08b3';
const outbackId = '4bd8b7b6-3cb8-46da-947f-faa2c50b5455';

const coffee = await getRow(coffeeId);
const coffeeLogs = parseJson(coffee.coleta_logs);
coffeeLogs[responseKey] = {
  ...(coffeeLogs[responseKey] || {}),
  checkedAt: new Date().toISOString(),
  source: 'visible_whatsapp_web_repaired',
  conversationTitle: 'COFFEE - Bistro e Cafeteria',
  status: 'link_menu_received',
  menuLinks: [
    'https://www.vucafood.com.br/coffee/1747/cardapio-digital',
    'https://www.vucafood.com.br/coffee/1747/delivery',
  ],
  newPhones: ['558330652020'],
  redirectSignals: true,
  mediaEvidence: coffeeLogs[responseKey]?.mediaEvidence || [],
  linkCount: 2,
  excerpt: 'Resposta automatica do CO.FFEE enviou cardapio digital e link de delivery em vucafood.com.br/coffee/1747.',
};

const { error: coffeeError } = await supabase
  .from('restaurants')
  .update({
    phone: '(83) 3065-2020',
    whatsapp_url: 'https://wa.me/558330652020',
    other_url: 'https://www.vucafood.com.br/coffee/1747/cardapio-digital',
    external_url: 'https://www.vucafood.com.br/coffee/1747/cardapio-digital',
    other_url_label: 'Cardapio recebido via WhatsApp',
    menu_status: 'needs_recollection',
    menu_status_reason: 'Link de cardapio recebido via WhatsApp; aguardando coleta estruturada.',
    coleta_logs: coffeeLogs,
  })
  .eq('id', coffeeId);
if (coffeeError) throw coffeeError;

const outback = await getRow(outbackId);
const outbackLogs = parseJson(outback.coleta_logs);
delete outbackLogs[responseKey];

const { error: outbackError } = await supabase
  .from('restaurants')
  .update({
    phone: '(83) 3330-0670',
    whatsapp_url: 'https://wa.me/558333300670',
    other_url: null,
    external_url: null,
    other_url_label: null,
    menu_status: 'manual_required',
    menu_status_reason: 'Mensagem enviada solicitando cardapio via WhatsApp.',
    coleta_logs: outbackLogs,
  })
  .eq('id', outbackId);
if (outbackError) throw outbackError;

console.log(JSON.stringify({
  success: true,
  repaired: [
    { id: coffeeId, name: coffee.name, action: 'cleaned_response_log' },
    { id: outbackId, name: outback.name, action: 'restored_phone_and_removed_wrong_menu_link' },
  ],
}, null, 2));

import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const id = '2c9bcb16-3a30-4d3e-8bda-014296022c62';
const env = {};
for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
  const index = trimmed.indexOf('=');
  env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
}

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_SERVICE_ROLE_KEY
    || env.SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_ANON_KEY,
);

const { data: current, error: readError } = await supabase
  .from('restaurants')
  .select('coleta_logs')
  .eq('id', id)
  .single();
if (readError) throw readError;

let previousLogs = {};
if (current?.coleta_logs && typeof current.coleta_logs === 'object') {
  previousLogs = current.coleta_logs;
} else if (typeof current?.coleta_logs === 'string') {
  try {
    previousLogs = JSON.parse(current.coleta_logs);
  } catch {
    previousLogs = {};
  }
}

const now = new Date().toISOString();
const update = {
  name: 'Pizzaria Esfiharia Paraíso',
  google_maps_name: 'Pizzaria Esfiharia Paraíso',
  address: null,
  number: null,
  neighborhood: null,
  city: 'Campina Grande do Sul',
  state: 'PR',
  cep: null,
  phone: null,
  category: null,
  rating: null,
  reviews_count: null,
  opening_hours: null,
  location_issue_reason: 'Fora do escopo: painel do Google Maps aponta para Campina Grande do Sul/PR, nao Campina Grande/PB.',
  coleta_logs: {
    ...previousLogs,
    google_maps_base: {
      collectedAt: previousLogs.google_maps_base?.collectedAt || now,
      repairedAt: now,
      success: false,
      source: 'visible_chrome_google_maps_panel_repair',
      name: 'Pizzaria Esfiharia Paraíso',
      address: 'Rua Lucídio Florêncio Ribeiro, 285 - Jardim Graciosa, Campina Grande do Sul - PR, 83430-000',
      rating: null,
      reviews_count: null,
      scheduleIsWeekly: false,
      error: 'Fora de Campina Grande/PB.',
    },
  },
};

const { error } = await supabase.from('restaurants').update(update).eq('id', id);
if (error) throw error;
console.log(JSON.stringify({ repaired: true, id, update }, null, 2));

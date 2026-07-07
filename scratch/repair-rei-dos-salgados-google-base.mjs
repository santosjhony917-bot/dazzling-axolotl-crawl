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
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_SERVICE_ROLE_KEY
    || env.SERVICE_ROLE_KEY
    || env.VITE_SUPABASE_ANON_KEY,
);

const id = '8e0594d8-b72c-43a7-8797-c68cc7476056';
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
  name: 'Rei dos Salgados',
  google_maps_name: 'Rei dos Salgados',
  address: null,
  number: null,
  neighborhood: null,
  city: 'Campina Grande',
  state: 'PB',
  cep: null,
  phone: null,
  rating: null,
  reviews_count: null,
  opening_hours: null,
  location_issue_reason: 'Google Maps/Search retornou painel generico; dados exigem revisao manual.',
  coleta_logs: {
    ...previousLogs,
    google_maps_base: {
      collectedAt: previousLogs.google_maps_base?.collectedAt || now,
      repairedAt: now,
      success: false,
      source: 'chrome_extension_google_maps_place_info_repair',
      name: 'Rei dos Salgados',
      address: null,
      rating: null,
      reviews_count: null,
      scheduleIsWeekly: false,
      googleSearchFallbackUsed: true,
      repairReason: 'Coleta anterior salvou painel generico do Google Maps com 0 avaliacoes e endereco de rodape.',
    },
  },
};

const { error } = await supabase.from('restaurants').update(update).eq('id', id);
if (error) throw error;

console.log(JSON.stringify({ repaired: true, id, update }, null, 2));

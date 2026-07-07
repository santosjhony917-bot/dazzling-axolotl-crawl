import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const RESTAURANT_ID = '3efd7101-b736-4135-9e5e-9787a854ec0e';
const YOOGA_STORE_FILE = 'scratch/structured-menu-collection/2026-07-07T07-26-44-792Z-25884/003-espaco-do-sushi/raw-yooga-store.json';

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

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function timeFromIso(value) {
  const match = String(value || '').match(/T(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : null;
}

function emptyOpeningWeek() {
  return {
    monday: { isOpen: false, slots: [] },
    tuesday: { isOpen: false, slots: [] },
    wednesday: { isOpen: false, slots: [] },
    thursday: { isOpen: false, slots: [] },
    friday: { isOpen: false, slots: [] },
    saturday: { isOpen: false, slots: [] },
    sunday: { isOpen: false, slots: [] },
  };
}

function yoogaScheduleToOpeningHours(scheduleJson) {
  const rows = parseJson(scheduleJson, []);
  const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const openingHours = emptyOpeningWeek();
  for (const row of rows || []) {
    const day = dayMap[Number(row.day_of_week)];
    if (!day) continue;
    const slots = [];
    for (const hour of row.hours || []) {
      const start = timeFromIso(hour.start);
      const end = timeFromIso(hour.end);
      if (start && end) slots.push({ open: start, close: end });
    }
    openingHours[day] = { isOpen: slots.length > 0, slots };
  }
  return openingHours;
}

const env = readEnv();
const supabase = createClient(
  env.VITE_SUPABASE_URL || env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

const { data: restaurant, error: readError } = await supabase
  .from('restaurants')
  .select('id,name,number,phone,whatsapp_url,opening_hours,coleta_logs')
  .eq('id', RESTAURANT_ID)
  .maybeSingle();
if (readError) throw readError;
if (!restaurant) throw new Error(`Restaurante ${RESTAURANT_ID} nao encontrado.`);

const rawStore = JSON.parse(fs.readFileSync(YOOGA_STORE_FILE, 'utf8')).payload;
const openingHours = yoogaScheduleToOpeningHours(rawStore.schedule_json);
const logs = parseJson(restaurant.coleta_logs, {});
logs.yooga_identity_hours_phone_repair_v1 = {
  repairedAt: new Date().toISOString(),
  yoogaStoreEvidence: YOOGA_STORE_FILE,
  phoneEvidence: 'Google result for Instagram profile: "83 988385605 (Whatsapp)"',
  phoneSource: 'google_search_instagram_snippet',
  numberSource: 'yooga_native_store_address.number',
  openingHoursSource: 'yooga_native_store.schedule_json',
};

const patch = {
  number: restaurant.number || '227',
  phone: restaurant.phone || '(83) 98838-5605',
  whatsapp_url: restaurant.whatsapp_url || 'https://wa.me/5583988385605',
  opening_hours: restaurant.opening_hours || openingHours,
  coleta_logs: logs,
};

const { data: updated, error: updateError } = await supabase
  .from('restaurants')
  .update(patch)
  .eq('id', RESTAURANT_ID)
  .select('id,name,number,phone,whatsapp_url,opening_hours')
  .single();
if (updateError) throw updateError;

console.log(JSON.stringify({
  updated: true,
  id: updated.id,
  name: updated.name,
  number: updated.number,
  phone: updated.phone,
  whatsapp_url: updated.whatsapp_url,
  hasOpeningHours: Boolean(updated.opening_hours),
}, null, 2));

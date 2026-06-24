'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2] || '';
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}

const args = process.argv.slice(2);
const getArg = flag => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : null; };
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function tokens(value) {
  const ignored = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'restaurante', 'bar', 'lanchonete']);
  return new Set(normalize(value).split(' ').filter(token => token.length > 1 && !ignored.has(token)));
}

function similarity(left, right) {
  const a = tokens(left), b = tokens(right);
  if (!a.size || !b.size) return 0;
  return [...a].filter(token => b.has(token)).length / Math.max(a.size, b.size);
}

function phone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 8 ? digits.slice(-11) : '';
}

function readJson(flag) {
  const file = getArg(flag);
  if (!file || !fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return null; }
}

function runAiFallback() {
  return new Promise(resolve => {
    console.log('[Hybrid Validator] Evidência insuficiente ou divergente; acionando auditoria por IA.');
    const child = spawn(process.execPath, [path.join(__dirname, 'phase5_ai_validation.cjs'), ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', chunk => process.stdout.write(chunk));
    child.stderr.on('data', chunk => process.stderr.write(chunk));
    child.on('close', code => resolve(code || 0));
  });
}

async function main() {
  const restaurantId = getArg('--id');
  const maps = readJson('--maps-data-file');
  const googleResults = readJson('--google-context-file') || [];
  if (!restaurantId || !maps) { process.exitCode = await runAiFallback(); return; }

  const supabase = createClient(process.env.VITE_SUPABASE_URL || 'https://gaawiewmlhorzbaixoqo.supabase.co', process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3');
  const { data: restaurant, error } = await supabase.from('restaurants').select('*').eq('id', restaurantId).single();
  if (error || !restaurant) throw error || new Error('Restaurante não encontrado.');

  const statusText = normalize(`${maps.businessStatus || ''} ${maps.statusText || ''}`);
  if (maps.isPermanentlyClosed === true || statusText.includes('permanently closed') || statusText.includes('permanentemente fechado') || statusText.includes('fechado permanentemente')) {
    const audit = {
      pipeline: 'hybrid-local-v1',
      status: 'ineligible_removed',
      reason: 'Google Maps indica estabelecimento permanentemente fechado.',
      mapsStatus: maps.businessStatus || maps.statusText || '',
      removedAt: new Date().toISOString(),
    };
    const { error: updateError } = await supabase
      .from('restaurants')
      .update({ is_deleted: true, is_published: false, ai_validated: false, ai_log: JSON.stringify(audit) })
      .eq('id', restaurantId);
    if (updateError) throw updateError;
    console.log('[Hybrid Validator] Estabelecimento removido: permanentemente fechado no Google Maps.');
    console.log(`RESULT:${JSON.stringify({ success: true, removed: true, reason: audit.reason, audit })}`);
    return;
  }

  const addressSimilarity = similarity(restaurant.address, maps.address);
  const phoneMatches = Boolean(phone(restaurant.phone) && phone(maps.phone) && phone(restaurant.phone) === phone(maps.phone));
  const nameSimilarity = similarity(restaurant.name, JSON.stringify(googleResults).slice(0, 50000));
  let websiteMatches = false;
  try {
    const currentWebsite = restaurant.other_url || restaurant.external_url;
    if (currentWebsite && maps.website) websiteMatches = new URL(currentWebsite).hostname.replace(/^www\./, '') === new URL(maps.website).hostname.replace(/^www\./, '');
  } catch (_) {}

  let score = 0;
  if (addressSimilarity >= 0.72) score += 0.4;
  if (phoneMatches) score += 0.35;
  if (nameSimilarity >= 0.55) score += 0.2;
  if (websiteMatches) score += 0.05;
  const approved = score >= 0.75 && addressSimilarity >= 0.72 && (phoneMatches || nameSimilarity >= 0.7);
  const audit = { score, addressSimilarity, phoneMatches, nameSimilarity, websiteMatches, approved };
  console.log(`[Hybrid Validator] Auditoria local: ${JSON.stringify(audit)}`);
  if (!approved) { process.exitCode = await runAiFallback(); return; }

  const update = { ai_validated: true, ai_log: JSON.stringify({ pipeline: 'hybrid-local-v1', audit, validatedAt: new Date().toISOString() }) };
  if (!restaurant.phone && maps.phone) update.phone = maps.phone;
  if (!restaurant.address && maps.address) update.address = maps.address;
  const { error: updateError } = await supabase.from('restaurants').update(update).eq('id', restaurantId);
  if (updateError) throw updateError;
  console.log('[Hybrid Validator] Fontes concordam; chamada de IA evitada.');
  console.log(`RESULT:${JSON.stringify({ success: true, message: 'Validado localmente com alta confiança.', audit, fallbackUsed: false })}`);
}

main().catch(error => {
  console.error(`[Hybrid Validator] ${error.stack || error.message}`);
  console.log(`RESULT:${JSON.stringify({ success: false, error: error.message })}`);
  process.exitCode = 1;
});

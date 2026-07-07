import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const ids = [
  {
    id: '66efb477-eaa9-4e15-899a-fffcf4969a1f',
    reason: 'Removido antes de continuar Instagram: Abrigo/instituicao social, nao restaurante/cardapio.',
  },
  {
    id: '19143652-e7ba-437e-8ded-1035b3a951b9',
    reason: 'Removido antes de continuar Instagram: pousada/hospedagem fora do escopo do app.',
  },
  {
    id: '3699dde5-5739-4978-9553-cd37fe52c689',
    reason: 'Removido antes de continuar Instagram: praca de alimentacao/lugar publico, nao restaurante individual.',
  },
  {
    id: 'd65b4d86-c48b-48c1-88d1-e825513c7634',
    reason: 'Removido antes de continuar Instagram: restaurante popular/cozinha solidaria, servico social fora do escopo do app.',
  },
  {
    id: 'a0a7ff25-e588-4ae8-bd22-4d39300f1678',
    reason: 'Removido antes de continuar Instagram: cabeleireiro/salao de beleza, nao restaurante/cardapio.',
  },
  {
    id: 'a9d283af-26b4-41f1-91d9-59d5c779a1e5',
    reason: 'Removido antes de continuar Instagram: restaurante universitario/institucional, nao lead comercial do app.',
  },
  {
    id: '2fa098a1-f9f1-47df-a714-09087552d61a',
    reason: 'Removido antes de continuar Instagram: rodoviaria/terminal/lugar publico, nao restaurante individual.',
  },
];

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

const removed = [];
for (const entry of ids) {
  const { data: row, error } = await supabase
    .from('restaurants')
    .select('id,name,category,coleta_logs,ai_log')
    .eq('id', entry.id)
    .single();
  if (error) throw error;

  const now = new Date().toISOString();
  const logs = parseJson(row.coleta_logs);
  logs.campina_pre_menu_hygiene_v2 = {
    checkedAt: now,
    status: 'removed_before_instagram_reprocess',
    reason: entry.reason,
    source: 'codex_instagram_reprocess_cleanup',
  };

  const aiLog = parseJson(row.ai_log);
  aiLog.campina_pre_menu_hygiene_v2 = {
    checkedAt: now,
    reason: entry.reason,
  };

  const { error: updateError } = await supabase
    .from('restaurants')
    .update({
      is_deleted: true,
      is_published: false,
      ai_validated: false,
      menu_status: 'unavailable',
      menu_status_reason: entry.reason,
      location_issue_reason: entry.reason,
      coleta_logs: logs,
      ai_log: aiLog,
    })
    .eq('id', entry.id);
  if (updateError) throw updateError;

  removed.push({
    id: row.id,
    name: row.name,
    category: row.category,
    reason: entry.reason,
  });
}

console.log(JSON.stringify({ success: true, removed }, null, 2));

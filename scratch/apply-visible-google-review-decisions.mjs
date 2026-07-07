import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const REPORT_PATH = process.argv.find((arg) => arg.startsWith('--report='))?.split('=')[1]
  || 'scratch/campina-visible-google-review.json';

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
);

const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

const compact = (value) => normalize(value).replace(/[^a-z0-9]+/g, '');
const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasTerm = (text, terms) => terms.some((term) => {
  const normalizedTerm = normalize(term);
  return normalizedTerm && new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedTerm)}([^a-z0-9]|$)`).test(text);
});
const hasFragment = (text, fragments) => {
  const packed = compact(text);
  return fragments.some((fragment) => packed.includes(compact(fragment)));
};

const parseReviews = (value) => Number(String(value || '').replace(/[^\d]/g, '')) || 0;

const foodTerms = [
  'restaurante', 'lanchonete', 'pizzaria', 'hamburgueria', 'pastelaria', 'churrascaria',
  'sorveteria', 'doceria', 'confeitaria', 'petiscaria', 'sushi', 'japanese', 'chinese',
  'delivery de comida', 'delivery de pizza', 'bistro', 'bistrô', 'bar', 'cafeteria',
  'pizz', 'burguer', 'burger', 'lanche', 'coxinha', 'salgado', 'espet', 'grill',
  'brasa', 'costelaria', 'sanduiche', 'sandwich', 'acai', 'sorvete', 'waffle',
  'cafe', 'cafes', 'cozinha', 'forno', 'chef', 'buchada', 'feijao', 'caldinho',
  'trailer', 'quiosque',
];

const foodFragments = [
  'crispizzacg', 'tkoxinha', 'rosasalgados', 'cocolokolanches', 'dlburguer',
  'qtalspetos', 'spetos', 'fornodchef', 'pasteky', 'petisq', 'barzim', 'grills',
  'cucina', 'sadywich', 'feiju', 'iburgue', 'costelaria',
];

const excludedTerms = [
  'padaria', 'panificadora', 'acougue', 'carnes', 'frigotil', 'peixaria',
  'loja de conveniencia', 'conveniencia', 'buffet', 'catering', 'loja de bolos',
  'cake shop', 'local para eventos', 'salao de festas', 'salao de eventos',
  'lovecake',
];

const nonAppTerms = [
  'fazenda', 'sitio', 'hotel', 'pousada', 'supermercado', 'atacadao',
  'copiadora', 'beauty', 'ubsf', 'postinho', 'unidade de saude',
  'vila do artesao', 'casa de cumpade', 'spazzio', 'seu evento',
  'quinta da colina', 'salao de festas', 'local para eventos', 'shopping',
  'cinema', 'clube', 'atracao turistica', 'resort', 'pet shop', 'lavanderia',
  'sinagoga', 'igreja', 'posto de combustivel', 'fabricante', 'fornecedor',
  'embalagens', 'descartaveis',
];

const nonAppFragments = [
  'fazendasantana', 'viladoartesao', 'casadecumpade', 'vanessaferreirabeauty',
  'rscopiadoracg', 'ubsfdoaraxa', 'idealsupermercados', 'spazzio',
  'seuevento', 'quintadacolina',
];

const exactLocationNames = new Set([
  'bela vista', 'itapemirim', 'cruzeiro', 'sao jose', 'ramadinha', 'nova brasilia',
  'centro', 'malvinas', 'catole', 'prata', 'jeremias', 'campina grande',
]);

const hasFoodSignal = (text) => hasTerm(normalize(text), foodTerms) || hasFragment(text, foodFragments);
const hasExcludedSignal = (text) => hasTerm(normalize(text), excludedTerms) || hasFragment(text, ['lovecake', 'frigotil']);
const hasNonAppSignal = (text) => hasTerm(normalize(text), nonAppTerms) || hasFragment(text, nonAppFragments);

const classify = (record, row) => {
  const context = `${record.name || ''} ${record.googleName || ''} ${record.category || ''} ${row?.category || ''}`;
  const nameContext = `${record.name || ''} ${record.googleName || ''}`;
  const normalizedName = normalize(record.name || record.googleName || row?.name || '');
  const address = String(record.address || '');
  const reason = normalize(record.reason || '');
  const reviews = parseReviews(record.reviews_count);
  const closed = /fechado|permanently closed|temporarily closed/.test(reason);
  const outsideCampina = /(?:Cuité|Lagoa Seca|Massaranduba|Fagundes|Queimadas|Patos|João Pessoa|Catolé do Rocha)\s*-\s*PB/i.test(address)
    && !/Campina Grande\s*-\s*PB/i.test(address);
  const pureLocation = exactLocationNames.has(normalizedName);
  const food = hasFoodSignal(context);
  const excluded = hasExcludedSignal(context);
  const nonApp = hasNonAppSignal(nameContext) || hasNonAppSignal(`${record.category || ''} ${row?.category || ''}`);

  if (closed) return { action: 'remove', confidence: 0.99, reason: 'Fechado temporaria/permanentemente no Google.' };
  if (outsideCampina) return { action: 'remove', confidence: 0.98, reason: `Fora de Campina Grande/PB (${address}).` };
  if (excluded) return { action: 'remove', confidence: 0.98, reason: 'Categoria/nome vetado pelo app antes do Instagram.' };
  if (pureLocation) return { action: 'remove', confidence: 0.97, reason: 'Nome e marcador de bairro/cidade/localizacao, nao restaurante.' };
  if (nonApp && !hasFragment(nameContext, foodFragments)) return { action: 'remove', confidence: 0.97, reason: 'Nome indica local/servico/evento, nao estabelecimento de comida vendavel.' };
  if (food) return { action: 'keep', confidence: 0.88, reason: 'Nome/categoria indica comida vendavel.' };
  if (record.action === 'keep') return { action: 'keep', confidence: 0.74, reason: 'Google anterior indicou comida; mantido por cautela.' };
  if (reviews >= 100 && !nonApp) return { action: 'keep_low_priority', confidence: 0.62, reason: 'Muitas avaliacoes e sem sinal non-app; nao remover por nome fraco.' };
  return { action: 'remove', confidence: 0.72, reason: 'Sem sinal forte de cardapio/restaurante apos revisao por nome.' };
};

const fetchRows = async (ids) => {
  const rows = [];
  for (let index = 0; index < ids.length; index += 100) {
    const slice = ids.slice(index, index + 100);
    const { data, error } = await supabase
      .from('restaurants')
      .select('id,name,google_maps_name,category,coleta_logs,ai_log,is_deleted')
      .in('id', slice);
    if (error) throw error;
    rows.push(...(data || []));
  }
  return new Map(rows.map((row) => [row.id, row]));
};

const parseJson = (value) => {
  if (value && typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return {};
};

const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
const records = report.rows || [];
const rowsById = await fetchRows(records.map((record) => record.id));
const decisions = records.map((record) => {
  const row = rowsById.get(record.id);
  const decision = classify(record, row);
  return { ...record, finalAction: decision.action, finalConfidence: decision.confidence, finalReason: decision.reason };
});

const removals = decisions.filter((decision) => decision.finalAction === 'remove' && rowsById.get(decision.id)?.is_deleted !== true);
const kept = decisions.filter((decision) => decision.finalAction !== 'remove');

if (APPLY) {
  const now = new Date().toISOString();
  for (const decision of removals) {
    const row = rowsById.get(decision.id);
    const previousLogs = parseJson(row?.coleta_logs);
    const previousAiLog = parseJson(row?.ai_log);
    const { error } = await supabase
      .from('restaurants')
      .update({
        is_deleted: true,
        is_published: false,
        ai_validated: false,
        menu_status: 'unavailable',
        location_issue_reason: `Revisao Google/Codex antes do Instagram: ${decision.finalReason}`,
        menu_status_reason: `Revisao Google/Codex antes do Instagram: ${decision.finalReason}`,
        coleta_logs: {
          ...previousLogs,
          google_visible_review_applied: {
            appliedAt: now,
            sourceReport: REPORT_PATH,
            action: decision.finalAction,
            confidence: decision.finalConfidence,
            reason: decision.finalReason,
            googleName: decision.googleName || null,
            category: decision.category || null,
            address: decision.address || null,
            rating: decision.rating || null,
            reviews_count: decision.reviews_count || null,
          },
        },
        ai_log: JSON.stringify({
          ...previousAiLog,
          pipeline: 'campina-visible-google-review',
          status: 'removed_before_instagram',
          removedAt: now,
          decision: {
            confidence: decision.finalConfidence,
            reason: decision.finalReason,
          },
        }),
      })
      .eq('id', decision.id);
    if (error) throw error;
  }
}

const summary = {
  mode: APPLY ? 'apply' : 'dry-run',
  reportPath: REPORT_PATH,
  scanned: decisions.length,
  remove: removals.length,
  keep: kept.length,
  removals: removals.map((row) => ({
    name: row.name,
    googleName: row.googleName,
    category: row.category,
    reviews_count: row.reviews_count,
    reason: row.finalReason,
  })),
  kept: kept.map((row) => ({
    name: row.name,
    googleName: row.googleName,
    category: row.category,
    reviews_count: row.reviews_count,
    action: row.finalAction,
    reason: row.finalReason,
  })),
};

fs.writeFileSync('scratch/campina-visible-google-review-apply-plan.json', `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify({
  mode: summary.mode,
  scanned: summary.scanned,
  remove: summary.remove,
  keep: summary.keep,
  planPath: 'scratch/campina-visible-google-review-apply-plan.json',
  firstRemovals: summary.removals.slice(0, 20),
}, null, 2));

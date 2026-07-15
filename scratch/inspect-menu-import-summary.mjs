import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const city = 'João Pessoa';
const state = 'PB';
const { data: runs, error: runsError } = await supabase
  .from('menu_import_runs')
  .select('id,status,item_count,priced_item_count,unresolved_item_count,issues,evidence,created_at,committed_at,restaurants!inner(city,state,name)')
  .eq('restaurants.city', city)
  .eq('restaurants.state', state);
if (runsError) throw runsError;
const runIds = (runs || []).map(r => r.id);
const { data: staging, error: stagingError } = runIds.length
  ? await supabase.from('menu_import_staging_items').select('id,run_id').in('run_id', runIds)
  : { data: [], error: null };
if (stagingError) throw stagingError;
const counts = runs.reduce((acc, r) => {
  acc[r.status] = (acc[r.status] || 0) + 1;
  return acc;
}, {});
const gaps = (runs || []).filter(r => {
  const issues = Array.isArray(r.issues) ? r.issues : [];
  const evidence = r.evidence || {};
  const snapshot = evidence.source_snapshot || [];
  const hasOptionGroups = JSON.stringify(snapshot).includes('"option_groups"');
  const hasCombos = JSON.stringify(snapshot).includes('"combo_components"');
  const hasSizes = JSON.stringify(snapshot).includes('"size"') || JSON.stringify(snapshot).includes('"tamanho"');
  const hasNonFixedPrice = JSON.stringify(snapshot).includes('"price_type":"range"') || JSON.stringify(snapshot).includes('"price_type":"option_only"') || JSON.stringify(snapshot).includes('"price_type":"unknown"');
  return issues.some(x => ['precos_para_revisao','delta_de_sabor_parece_preco_cheio','coleta_generica_fraca','baixa_densidade_cardapio'].includes(x)) || hasOptionGroups || hasCombos || hasSizes || hasNonFixedPrice;
});
const examples = gaps.slice(0, 3).map(r => ({
  id: r.id,
  status: r.status,
  item_count: r.item_count,
  priced_item_count: r.priced_item_count,
  unresolved_item_count: r.unresolved_item_count,
  issues: r.issues,
  source_url: r.evidence?.sourceUrl || r.source_url || null,
  platform: r.evidence?.platform || r.platform || null,
  evidence_keys: Object.keys(r.evidence || {}).slice(0, 10),
}));
console.log(JSON.stringify({ total_runs: runs.length, status_counts: counts, total_staging_items: staging.length, gap_runs: gaps.length, examples }, null, 2));

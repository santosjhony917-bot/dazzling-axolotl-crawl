import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const city = 'João Pessoa';
const state = 'PB';
async function fetchAll(table, select, filterFn) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    let query = supabase.from(table).select(select).range(from, from + 999);
    if (filterFn) query = filterFn(query);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}
const runs = await fetchAll('menu_import_runs', 'id,status,item_count,priced_item_count,unresolved_item_count,issues,evidence,created_at,committed_at,restaurants!inner(city,state,name)', q => q.eq('restaurants.city', city).eq('restaurants.state', state));
const staging = await fetchAll('menu_import_staging_items', 'id,run_id,category_name,item_order,category_order', q => q.in('run_id', runs.map(r => r.id)));
const gaps = runs.filter(r => {
  const issues = Array.isArray(r.issues) ? r.issues : [];
  const snapshot = r.evidence?.source_snapshot || [];
  const snapshotText = JSON.stringify(snapshot);
  const hasModelingFeatures = /"option_groups"|"combo_components"|"price_type":"range"|"price_type":"option_only"|"price_type":"unknown"|"price_type":"inherited"|"price_type":"included"/.test(snapshotText) || /"min_quantity"|"max_quantity"|"semantic_type":"addon"|"semantic_type":"required_choice"/.test(snapshotText);
  const hasGapIssue = issues.some(x => ['precos_para_revisao','delta_de_sabor_parece_preco_cheio','coleta_generica_fraca','baixa_densidade_cardapio'].includes(x));
  return hasGapIssue || hasModelingFeatures;
});
const gapExamples = gaps.slice(0, 3).map(r => {
  const snapshotText = JSON.stringify(r.evidence?.source_snapshot || []);
  const examples = [];
  if (snapshotText.includes('combo_components')) examples.push('combo_components');
  if (snapshotText.includes('option_groups')) examples.push('option_groups');
  if (snapshotText.includes('price_type":"range"')) examples.push('range_price');
  if (snapshotText.includes('price_type":"option_only"')) examples.push('option_only');
  if (snapshotText.includes('semantic_type":"addon"')) examples.push('addon_option');
  if (snapshotText.includes('semantic_type":"required_choice"')) examples.push('required_choice');
  return {
    id: r.id,
    status: r.status,
    item_count: r.item_count,
    priced_item_count: r.priced_item_count,
    unresolved_item_count: r.unresolved_item_count,
    issues: r.issues,
    structure_signals: examples,
    source_url: r.evidence?.sourceUrl || r.source_url || null,
    platform: r.evidence?.platform || r.platform || null,
  };
});
const counts = runs.reduce((acc,r)=>{acc[r.status]=(acc[r.status]||0)+1;return acc;},{});
console.log(JSON.stringify({ total_runs:runs.length, status_counts:counts, total_staging_items:staging.length, gap_runs:gaps.length, gap_examples:gapExamples }, null, 2));

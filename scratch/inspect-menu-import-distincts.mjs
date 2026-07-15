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
const runs = await fetchAll('menu_import_runs', 'id,restaurant_id,status,item_count,priced_item_count,unresolved_item_count,issues,evidence,created_at,committed_at,restaurants!inner(city,state,name)', q => q.eq('restaurants.city', city).eq('restaurants.state', state));
const committed = runs.filter(r => r.status === 'committed');
const gapRuns = committed.filter(r => {
  const issues = Array.isArray(r.issues) ? r.issues : [];
  const snapshotText = JSON.stringify(r.evidence?.source_snapshot || []);
  return /"option_groups"|"combo_components"|"price_type":"range"|"price_type":"option_only"|"price_type":"unknown"|"price_type":"inherited"|"price_type":"included"|"min_quantity"|"max_quantity"|"semantic_type":"addon"|"semantic_type":"required_choice"/.test(snapshotText)
    && (issues.length === 0 || issues.some(x => ['precos_para_revisao','delta_de_sabor_parece_preco_cheio','coleta_generica_fraca','baixa_densidade_cardapio'].includes(x)));
});
const distinctCommittedRestaurants = new Set(committed.map(r => r.restaurant_id));
const distinctGapRestaurants = new Set(gapRuns.map(r => r.restaurant_id));
console.log(JSON.stringify({
  total_runs: runs.length,
  committed_runs: committed.length,
  distinct_committed_restaurants: distinctCommittedRestaurants.size,
  gap_runs: gapRuns.length,
  distinct_gap_restaurants: distinctGapRestaurants.size,
  gap_run_ids: gapRuns.slice(0,5).map(r => ({ id: r.id, restaurant_id: r.restaurant_id, name: r.restaurants?.name, item_count: r.item_count, issues: r.issues }))
}, null, 2));

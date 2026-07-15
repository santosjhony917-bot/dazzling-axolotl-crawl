import { createClient } from '@supabase/supabase-js';

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const index = arg.indexOf('=');
  if (index === -1) return [arg.replace(/^--/, ''), true];
  return [arg.slice(2, index), arg.slice(index + 1)];
}));

const city = args.city || 'João Pessoa';
const state = args.state || 'PB';
const sourceContext = args['source-context'] || 'joao_pessoa_national_pipeline_v1';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function withRetry(fn, attempts = 3) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 250 * (i + 1)));
    }
  }
  throw lastError;
}

async function fetchAll(table, columns, filters = (q) => q) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await withRetry(() =>
      filters(supabase.from(table).select(columns)).range(from, from + 999)
    );
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

function countBy(rows, key) {
  return rows.reduce((acc, row) => {
    const value = row[key];
    const label = typeof value === 'boolean' ? String(value) : String(value ?? 'null');
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
}

function uniqueCount(rows, key) {
  return new Set(rows.map((row) => row[key]).filter(Boolean)).size;
}

function runSnapshotText(run) {
  const evidence = run?.evidence || {};
  return JSON.stringify(
    evidence.source_snapshot
      || evidence.snapshot
      || evidence.transactional_counts
      || evidence.post_commit_verification
      || [],
  );
}

function schemaGapSignals(run) {
  const text = runSnapshotText(run);
  const signals = [];

  if (/\"combo_components\"\s*:/.test(text)) signals.push('combo_components');
  if (/\"option_groups\"\s*:/.test(text)) signals.push('option_groups');
  if (/\"price_type\":\"(range|option_only|unknown|inherited|included)\"/.test(text)) signals.push('non_fixed_price_type');
  if (/\"min_quantity\"|\"max_quantity\"/.test(text)) signals.push('quantity_rules');
  if (/\"semantic_type\":\"(addon|required_choice)\"/.test(text)) signals.push('variant_or_addon_semantics');
  if (/\"size\"|\"tamanho\"|\"tamanhos\"/.test(text)) signals.push('size_variants');

  return [...new Set(signals)];
}

async function main() {
  const restaurants = await fetchAll(
    'restaurants',
    'id,name,city,state,is_deleted,is_published,ai_validated,created_at,menu_last_checked_at',
    (q) => q.eq('city', city).eq('state', state),
  );
  const activeRestaurants = restaurants.filter((row) => row.is_deleted !== true);
  const categories = await fetchAll(
    'menu_categories',
    'id,restaurant_id,is_active,created_at',
    (q) => q.order('created_at', { ascending: true }),
  );
  const activeRestaurantIds = new Set(activeRestaurants.map((row) => row.id));
  const activeCategories = categories.filter((row) => row.is_active !== false && activeRestaurantIds.has(row.restaurant_id));
  const categoryLookup = new Map(activeCategories.map((row) => [row.id, row.restaurant_id]));
  const items = await fetchAll(
    'menu_items',
    'id,category_id,is_active,created_at',
    (q) => q.order('created_at', { ascending: true }),
  );
  const activeItems = items.filter((row) => row.is_active !== false);
  const activeItemRestaurantIds = new Set(
    activeItems
      .map((item) => categoryLookup.get(item.category_id) || null)
      .filter(Boolean),
  );
  const activeMenuRestaurants = activeRestaurants.filter((row) => activeItemRestaurantIds.has(row.id));
  const activeMenuRestaurantIds = new Set(activeMenuRestaurants.map((row) => row.id));
  const scopedCategories = activeCategories.filter((row) => activeMenuRestaurantIds.has(row.restaurant_id));
  const scopedCategoryLookup = new Map(scopedCategories.map((row) => [row.id, row.restaurant_id]));
  const scopedItems = activeItems.filter((row) => scopedCategoryLookup.has(row.category_id));

  const { data: semanticJobs, error: semanticError } = await withRetry(() =>
    supabase
      .from('operation_jobs')
      .select('id,stage,status,city,locked_by,last_error,result_summary,payload,source_platform,source_url,updated_at')
      .eq('city', city)
      .eq('state', state)
      .eq('stage', 'semantic_menu_qa')
  );
  if (semanticError) throw semanticError;

  const semantic = {
    done: (semanticJobs || []).filter((row) => row.status === 'done').length,
    blocked: (semanticJobs || []).filter((row) => row.status === 'blocked').length,
    pending: (semanticJobs || []).filter((row) => ['pending', 'locked'].includes(row.status)).length,
  };

  const { data: cityRuns, error: cityRunsError } = await withRetry(() =>
    supabase
      .from('city_operation_runs')
      .select('id,run_key,source_context,city,state,status,created_at,updated_at')
      .eq('city', city)
      .eq('state', state)
      .eq('source_context', sourceContext)
      .order('created_at', { ascending: false })
      .limit(20)
  );
  if (cityRunsError) throw cityRunsError;

  const latestRun = cityRuns?.[0] || null;
  const { data: runMetrics, error: runMetricsError } = latestRun
    ? await withRetry(() => supabase.rpc('city_run_metrics', { p_city_run_id: latestRun.id }))
    : { data: null, error: null };
  if (runMetricsError) throw runMetricsError;

  const importRuns = await fetchAll(
    'menu_import_runs',
    'id,restaurant_id,status,item_count,priced_item_count,unresolved_item_count,issues,evidence,source_url,platform,created_at,committed_at,restaurants!inner(name,city,state,is_deleted)',
    (q) => q.eq('restaurants.city', city).eq('restaurants.state', state),
  );
  const importRunIds = importRuns.map((row) => row.id);
  const stagingItems = importRunIds.length
    ? await fetchAll(
      'menu_import_staging_items',
      'id,run_id,category_name,category_order,item_order',
      (q) => q.in('run_id', importRunIds),
    )
    : [];
  const committedImportRuns = importRuns.filter((row) => row.status === 'committed');
  const schemaGapRuns = committedImportRuns.filter((row) => schemaGapSignals(row).length > 0);
  const schemaGapExamples = schemaGapRuns.slice(0, 3).map((row) => ({
    restaurant: row.restaurants?.name || null,
    run_id: row.id,
    status: row.status,
    item_count: row.item_count,
    signals: schemaGapSignals(row),
  }));

  const activeLocks = await fetchAll(
    'operation_jobs',
    'id,stage,status,city,locked_by,locked_until,attempts,max_attempts,last_error,result_summary,updated_at',
    (q) => q.eq('city', city).eq('state', state).eq('status', 'locked'),
  );

  const blockedJobs = await fetchAll(
    'operation_jobs',
    'id,stage,status,city,locked_by,last_error,result_summary,payload,source_platform,source_url,updated_at',
    (q) => q.eq('city', city).eq('state', state).in('status', ['blocked', 'rejected', 'error']),
  );

  const blockerCategory = (row) => {
    const summary = row.result_summary || {};
    const text = [
      row.last_error,
      summary.reason,
      summary.last_error,
      summary.blocking_reason,
      ...(Array.isArray(summary.blocking_reasons) ? summary.blocking_reasons : []),
      JSON.stringify(row.payload || {}),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (row.stage === 'menu_extraction_site_pdf' || row.stage === 'menu_extraction_yooga') return 'handler_ausente';
    if (row.stage === 'semantic_menu_qa' || row.stage === 'menu_extraction_cardapioweb' || row.stage === 'menu_extraction_anotaai') return 'fidelidade_corrigivel';
    if (row.stage === 'entity_resolution') return /source_rejected|sem fonte|fonte vazia|empty source|missing source/.test(text) ? 'fonte_vazia' : 'identidade_ambigua';
    if (/handler|not implemented|autonomous_dispatch_disabled|stage_not_registered|no handler|sem handler/.test(text)) return 'handler_ausente';
    if (/identity|identidade|city|unidade|confirma|ambiguous|homonym|homonim|weak/.test(text)) return 'identidade_ambigua';
    if (/fidelity|fidelidade|price|preco|preço|semantic|qa|structural|correction|corrig/i.test(text)) return 'fidelidade_corrigivel';
    if (/source empty|fonte vazia|no source|sem fonte|missing source|empty source|source_rejected/.test(text)) return 'fonte_vazia';
    return 'other';
  };

  const output = {
    generated_at: new Date().toISOString(),
    city,
    state,
    source_context: sourceContext,
    baseline: {
      active_menu_restaurants: 74,
      active_categories: 545,
      active_items: 3959,
      semantic_done: 39,
      semantic_blocked: 32,
      semantic_pending: 0,
    },
    live: {
      active_menu_restaurants: activeMenuRestaurants.length,
      active_categories: scopedCategories.length,
      active_items: scopedItems.length,
      restaurants_total: restaurants.length,
      restaurants_active: activeRestaurants.length,
      restaurants_deleted: restaurants.filter((row) => row.is_deleted === true).length,
      menu_status_counts: countBy(activeRestaurants, 'menu_status'),
      semantic,
      city_completion_rate: runMetrics?.city_completion_rate ?? null,
      throughput_per_minute: runMetrics?.throughput_per_minute ?? null,
      active_locks: activeLocks.length,
      blockers: {
        total: blockedJobs.length,
        by_stage: countBy(blockedJobs, 'stage'),
        by_category: countBy(blockedJobs.map((row) => ({ ...row, category: blockerCategory(row) })), 'category'),
      },
    },
    pipeline: {
      captured_staging: {
        runs: importRuns.length,
        restaurants: uniqueCount(importRuns, 'restaurant_id'),
        staging_items: stagingItems.length,
        committed_runs: committedImportRuns.length,
      },
      blocked_schema_gap_modeling_gap: {
        runs: schemaGapRuns.length,
        restaurants: uniqueCount(schemaGapRuns, 'restaurant_id'),
        examples: schemaGapExamples,
        required_capacity: 'preservar snapshot bruto, staging completo e adaptador com suporte a combo_components, option_groups, price_type nao-fixo e semantica de variantes/adicionais',
      },
      promoted_canonical: {
        restaurants: activeMenuRestaurants.length,
        runs: uniqueCount(committedImportRuns, 'restaurant_id'),
      },
      qa_approved: {
        done: semantic.done,
        blocked: semantic.blocked,
        pending: semantic.pending,
      },
    },
    delta: {
      active_menu_restaurants: activeMenuRestaurants.length - 74,
      active_categories: scopedCategories.length - 545,
      active_items: scopedItems.length - 3959,
      semantic_done: semantic.done - 39,
      semantic_blocked: semantic.blocked - 32,
      semantic_pending: semantic.pending - 0,
    },
    city_runs: cityRuns || [],
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ error: error.message, stack: error.stack }, null, 2));
  process.exit(1);
});

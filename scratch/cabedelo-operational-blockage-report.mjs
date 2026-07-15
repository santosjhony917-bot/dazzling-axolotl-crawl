import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const CITY = 'Cabedelo';
const STATE = 'PB';
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = path.join('scratch', 'cabedelo-operational-blockage-report', RUN_ID);

const STAGES = [
  'google_phase1',
  'instagram_discovery',
  'instagram_enrichment',
  'menu_source_discovery',
  'menu_extraction_anotaai',
  'menu_extraction_cardapioweb',
  'menu_extraction_yooga',
  'menu_extraction_site_pdf',
  'semantic_menu_qa',
  'media_collection',
  'media_qa',
  'structural_audit',
  'ready_publish',
];

const NON_TERMINAL_STATUSES = new Set(['pending', 'locked', 'error']);
const REJECTED_MENU_STATUSES = new Set(['unavailable', 'blocked', 'invalid_source', 'not_found']);

function readEnv() {
  const env = { ...process.env };
  const envPath = path.resolve('.env');
  if (!fs.existsSync(envPath)) return env;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!env[key]) env[key] = value;
  }
  return env;
}

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalize(value) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function parseJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

async function selectAll(queryFactory, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await queryFactory().range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

async function selectInChunks(supabase, table, columns, column, values) {
  const unique = [...new Set(values.filter(Boolean))];
  const rows = [];
  for (let index = 0; index < unique.length; index += 75) {
    const chunk = unique.slice(index, index + 75);
    rows.push(...await selectAll(() => supabase
      .from(table)
      .select(columns)
      .in(column, chunk)));
  }
  return rows;
}

function byId(rows) {
  return new Map(rows.map((row) => [row.id, row]));
}

function increment(map, key, amount = 1) {
  map.set(key, (map.get(key) || 0) + amount);
}

function pushMap(map, key, value) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

function hasImage(value) {
  const text = clean(value);
  return Boolean(text && !/placeholder|default|sem[-_ ]?imagem/i.test(text));
}

function reasonFromObject(value) {
  const object = parseJson(value);
  if (!object) return [];
  return [
    object.reason,
    object.last_error,
    object.error,
    object.menu_status_reason,
    object.status_reason,
    object.block_reason,
    ...asArray(object.qa_blockers),
    ...asArray(object.blocking_reasons),
    ...asArray(object.blockers),
    ...asArray(object.errors),
  ].map(clean).filter(Boolean);
}

function reasonFromJob(job) {
  const result = parseJson(job.result_summary) || {};
  const payload = parseJson(job.payload) || {};
  const reasons = [
    job.last_error,
    result.reason,
    result.last_error,
    result.error,
    result.message,
    ...asArray(result.qa_blockers),
    ...asArray(result.blocking_reasons),
    ...asArray(result.blockers),
    payload.reason,
    payload.menu_status_reason,
  ].map(clean).filter(Boolean);

  if (!reasons.length) {
    if (job.status === 'locked') return ['job_locked'];
    if (job.status === 'pending') return ['job_pending'];
    if (job.status === 'error') return ['job_error_sem_last_error'];
    if (job.status === 'blocked') return ['job_blocked_sem_motivo'];
  }

  return [...new Set(reasons)];
}

function canonicalReason(reason) {
  const text = clean(reason);
  const n = normalize(text);

  if (/identidade|outro restaurante|wrong restaurant|fonte.*inconsistente|source.*mismatch/.test(n)) {
    return 'fonte_identidade_inconsistente';
  }
  if (/403|forbidden|bloqueado.*anota|anota.*bloque/.test(n)) return 'anotaai_403_ou_bloqueio_de_acesso';
  if (/max attempts|tentativas|attempts/.test(n)) return 'max_attempts_esgotado';
  if (/lock expirado|expired lock/.test(n)) return 'lock_expirado';
  if (/sem cardapio|menu.*not.*found|not_found|cardapio.*ausente/.test(n)) return 'sem_cardapio_estruturado';
  if (/fonte.*ausente|source.*missing|sem fonte/.test(n)) return 'sem_fonte_de_cardapio';
  if (/invalid_source|fonte invalida|fonte rejeitada/.test(n)) return 'fonte_rejeitada_ou_invalida';
  if (/instagram/.test(n) && /ausente|missing|inseguro|unsafe|invalid/.test(n)) return 'instagram_ausente_ou_inseguro';
  if (/galeria|foto|midia|media|logo|capa/.test(n)) return 'midia_insuficiente_ou_suspeita';
  if (/telefone|whatsapp|numero/.test(n)) return 'telefone_ausente_ou_invalido';
  if (/endereco|address|cep|bairro|lat|lng|coordenada/.test(n)) return 'dados_google_ou_endereco_incompletos';
  if (/semantic|semant|opcao|adicional|combo|preco|grupo|guardanapo|talher|ketchup|embalagem|clique|monte|transforme/.test(n)) {
    return 'semantic_menu_qa_bloqueio_ou_reparo';
  }
  if (/job_pending/.test(n)) return 'job_pending';
  if (/job_locked/.test(n)) return 'job_locked';
  if (/job_error/.test(n)) return 'job_error_sem_last_error';
  if (/job_blocked/.test(n)) return 'job_blocked_sem_motivo';

  return text.slice(0, 180) || 'motivo_desconhecido';
}

function severityFor(reason, status) {
  const n = normalize(reason);
  if (status === 'error' || /max_attempts|identidade|inconsistente|fonte_rejeitada|invalida/.test(n)) return 'alta';
  if (/semantic|midia|sem_cardapio|sem_fonte|anotaai_403/.test(n)) return 'media';
  if (/pending|locked/.test(n)) return 'operacional';
  return 'baixa';
}

function actionFor(reason, stages) {
  const n = normalize(reason);
  const stageSet = new Set(stages);
  if (n.includes('fonte_identidade_inconsistente')) return 'Rejeitar/bloquear a fonte para o restaurante e procurar fonte alternativa confiavel.';
  if (n.includes('anotaai_403')) return 'Nao depender de AnotaAI por HTTP simples; usar Browserbase/perfil autenticado ou priorizar restaurantes com menu ja estruturado.';
  if (n.includes('semantic_menu_qa')) return 'Rodar semantic_menu_qa em dry-run, revisar regras, aplicar reparos apenas quando seguros.';
  if (n.includes('midia')) return 'Criar worker media_qa/media_collection com regras de foto, logo, capa e galeria.';
  if (n.includes('sem_cardapio')) return 'Enviar para menu_source_discovery ou rejeicao rapida se fonte confiavel nao existir.';
  if (n.includes('sem_fonte')) return 'Criar lote pequeno de descoberta de fonte, sem iFood como fonte de cardapio.';
  if (n.includes('instagram')) return 'Enviar para instagram_discovery/enrichment com validacao de identidade.';
  if (n.includes('dados_google')) return 'Enviar para google_phase1 ou reparo local de endereco/horario se ja houver evidencia.';
  if (n.includes('job_locked')) return 'Verificar locked_until e rodar release_expired_operation_jobs se estiver vencido.';
  if (n.includes('job_pending')) {
    if (stageSet.has('structural_audit')) return 'Rodar structural_audit em batch pequeno com concurrency controlada.';
    return 'Rodar worker da etapa com limite pequeno e medir throughput.';
  }
  if (n.includes('max_attempts')) return 'Revisar erro recorrente antes de liberar retry; provavel bloqueio manual ou ajuste de handler.';
  return 'Revisar amostra e transformar em regra operacional se aparecer com frequencia.';
}

function summarizeStages(jobs) {
  const stages = {};
  for (const stage of STAGES) {
    stages[stage] = {
      stage,
      total: 0,
      pending: 0,
      done: 0,
      blocked: 0,
      error: 0,
      locked: 0,
      rejected: 0,
      cancelled: 0,
      affected_restaurants: [],
    };
  }

  for (const job of jobs) {
    const row = stages[job.stage] || {
      stage: job.stage,
      total: 0,
      pending: 0,
      done: 0,
      blocked: 0,
      error: 0,
      locked: 0,
      rejected: 0,
      cancelled: 0,
      affected_restaurants: [],
    };
    row.total += 1;
    row[job.status] = (row[job.status] || 0) + 1;
    if (job.restaurant_id) row.affected_restaurants.push(job.restaurant_id);
    stages[job.stage] = row;
  }

  for (const row of Object.values(stages)) {
    row.affected_restaurants = [...new Set(row.affected_restaurants)];
  }
  return stages;
}

function buildLegacyBlockers(restaurants, menuCounts, mediaCounts) {
  const blockers = [];
  for (const restaurant of restaurants) {
    const aiReasons = reasonFromObject(restaurant.ai_log);
    const hasStructuredMenu = (menuCounts.get(restaurant.id)?.items || 0) > 0;
    const galleries = mediaCounts.gallery.get(restaurant.id) || 0;
    const mediaMinimum = hasImage(restaurant.image_url) && hasImage(restaurant.cover_image_url) && galleries >= 3;

    if (restaurant.menu_status && restaurant.menu_status !== 'found') {
      blockers.push({
        restaurant_id: restaurant.id,
        restaurant_name: restaurant.name,
        stage: 'legacy_menu_status',
        reason: canonicalReason(restaurant.menu_status_reason || restaurant.menu_status),
        raw_reason: restaurant.menu_status_reason || restaurant.menu_status,
        status: restaurant.menu_status,
      });
    }
    for (const reason of aiReasons) {
      blockers.push({
        restaurant_id: restaurant.id,
        restaurant_name: restaurant.name,
        stage: 'legacy_ai_log',
        reason: canonicalReason(reason),
        raw_reason: reason,
        status: 'legacy',
      });
    }
    if (!hasStructuredMenu) {
      blockers.push({
        restaurant_id: restaurant.id,
        restaurant_name: restaurant.name,
        stage: 'menu_inventory',
        reason: 'sem_cardapio_estruturado',
        raw_reason: 'Restaurante ativo sem itens ativos no cardapio estruturado.',
        status: 'missing',
      });
    }
    if (hasStructuredMenu && !mediaMinimum) {
      blockers.push({
        restaurant_id: restaurant.id,
        restaurant_name: restaurant.name,
        stage: 'media_qa',
        reason: 'midia_insuficiente_ou_suspeita',
        raw_reason: `Media minima ausente: logo=${hasImage(restaurant.image_url)}, capa=${hasImage(restaurant.cover_image_url)}, galeria=${galleries}.`,
        status: 'missing',
      });
    }
  }
  return blockers;
}

function recommendedNextStage(restaurant, jobs, menuCounts, mediaCounts) {
  const openJobs = jobs.filter((job) => NON_TERMINAL_STATUSES.has(job.status));
  if (openJobs.length) return openJobs[0].stage;

  const hasStructuredMenu = (menuCounts.get(restaurant.id)?.items || 0) > 0;
  const galleries = mediaCounts.gallery.get(restaurant.id) || 0;
  const mediaMinimum = hasImage(restaurant.image_url) && hasImage(restaurant.cover_image_url) && galleries >= 3;

  if (!hasStructuredMenu) return 'menu_source_discovery';
  if (hasStructuredMenu && restaurant.menu_status !== 'found') return 'semantic_menu_qa';
  if (hasStructuredMenu && !mediaMinimum) return 'media_qa';
  if (hasStructuredMenu) return 'semantic_menu_qa';
  return null;
}

async function main() {
  const env = readEnv();
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.SERVICE_ROLE_KEY;
  const allowAnon = process.argv.includes('--allow-anon');
  const supabaseKey = serviceRoleKey || (allowAnon ? env.VITE_SUPABASE_ANON_KEY : null);
  if (!supabaseUrl || !supabaseKey) throw new Error('Supabase URL/key ausentes.');
  if (!serviceRoleKey && !allowAnon) {
    throw new Error('Relatorio operacional exige service role para ler operation_jobs/events. Use o conector Supabase ou rode com SUPABASE_SERVICE_ROLE_KEY.');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  const restaurants = await selectAll(() => supabase
    .from('restaurants')
    .select('id,name,city,state,is_deleted,is_published,ai_validated,menu_status,menu_status_reason,ai_log,image_url,cover_image_url,phone,whatsapp_url,instagram,address,neighborhood,latitude,longitude,opening_hours')
    .ilike('city', CITY)
    .eq('state', STATE)
    .order('name'));

  const activeRestaurants = restaurants.filter((row) => row.is_deleted !== true);
  const activeIds = activeRestaurants.map((row) => row.id);
  const restaurantMap = byId(activeRestaurants);

  const jobsByCity = await selectAll(() => supabase
    .from('operation_jobs')
    .select('id,restaurant_id,city,state,stage,status,source_context,priority,locked_by,locked_until,attempts,max_attempts,last_error,payload,result_summary,source_url,source_platform,created_at,updated_at,started_at,finished_at')
    .ilike('city', CITY)
    .order('created_at', { ascending: true }));
  const jobsByRestaurant = await selectInChunks(
    supabase,
    'operation_jobs',
    'id,restaurant_id,city,state,stage,status,source_context,priority,locked_by,locked_until,attempts,max_attempts,last_error,payload,result_summary,source_url,source_platform,created_at,updated_at,started_at,finished_at',
    'restaurant_id',
    activeIds,
  );
  const jobMap = new Map();
  for (const job of [...jobsByCity, ...jobsByRestaurant]) jobMap.set(job.id, job);
  const jobs = [...jobMap.values()].filter((job) => !job.restaurant_id || restaurantMap.has(job.restaurant_id) || normalize(job.city) === normalize(CITY));
  const jobIds = jobs.map((job) => job.id);

  const events = await selectInChunks(
    supabase,
    'operation_job_events',
    'id,job_id,event_type,worker_id,stage,status,details,created_at',
    'job_id',
    jobIds,
  );

  const categories = await selectInChunks(supabase, 'menu_categories', 'id,restaurant_id,is_active', 'restaurant_id', activeIds);
  const activeCategories = categories.filter((row) => row.is_active !== false);
  const categoryIds = activeCategories.map((row) => row.id);
  const items = await selectInChunks(supabase, 'menu_items', 'id,category_id,is_active', 'category_id', categoryIds);
  const activeItems = items.filter((row) => row.is_active !== false);
  const gallery = await selectInChunks(supabase, 'restaurant_gallery', 'id,restaurant_id,image_url', 'restaurant_id', activeIds);

  const categoryToRestaurant = new Map(activeCategories.map((row) => [row.id, row.restaurant_id]));
  const menuCounts = new Map();
  for (const category of activeCategories) {
    const count = menuCounts.get(category.restaurant_id) || { categories: 0, items: 0 };
    count.categories += 1;
    menuCounts.set(category.restaurant_id, count);
  }
  for (const item of activeItems) {
    const restaurantId = categoryToRestaurant.get(item.category_id);
    if (!restaurantId) continue;
    const count = menuCounts.get(restaurantId) || { categories: 0, items: 0 };
    count.items += 1;
    menuCounts.set(restaurantId, count);
  }

  const mediaCounts = { gallery: new Map() };
  for (const image of gallery) increment(mediaCounts.gallery, image.restaurant_id);

  const jobsByRestaurantId = new Map();
  for (const job of jobs) pushMap(jobsByRestaurantId, job.restaurant_id, job);

  const statusCounts = {};
  for (const status of ['pending', 'done', 'blocked', 'error', 'locked', 'rejected', 'cancelled']) statusCounts[status] = 0;
  for (const job of jobs) statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;

  const restaurantsWithJobs = new Set(jobs.map((job) => job.restaurant_id).filter(Boolean));
  const stages = summarizeStages(jobs);

  const groupedReasons = new Map();
  for (const job of jobs) {
    if (!['pending', 'locked', 'blocked', 'error', 'rejected'].includes(job.status)) continue;
    const restaurant = restaurantMap.get(job.restaurant_id);
    for (const rawReason of reasonFromJob(job)) {
      const reason = canonicalReason(rawReason);
      const key = `${reason}::${job.stage}`;
      if (!groupedReasons.has(key)) {
        groupedReasons.set(key, {
          motivo: reason,
          stage: job.stage,
          severidade: severityFor(reason, job.status),
          quantidade: 0,
          raw_reasons: [],
          ids_restaurantes_afetados: [],
          restaurantes_afetados: [],
          job_ids: [],
          statuses: {},
          acao_recomendada: '',
        });
      }
      const group = groupedReasons.get(key);
      group.quantidade += 1;
      group.raw_reasons.push(rawReason);
      group.job_ids.push(job.id);
      group.statuses[job.status] = (group.statuses[job.status] || 0) + 1;
      if (job.restaurant_id) group.ids_restaurantes_afetados.push(job.restaurant_id);
      if (restaurant) group.restaurantes_afetados.push({ id: restaurant.id, name: restaurant.name });
    }
  }

  const legacyBlockers = buildLegacyBlockers(activeRestaurants, menuCounts, mediaCounts);
  for (const blocker of legacyBlockers) {
    const key = `${blocker.reason}::${blocker.stage}`;
    if (!groupedReasons.has(key)) {
      groupedReasons.set(key, {
        motivo: blocker.reason,
        stage: blocker.stage,
        severidade: severityFor(blocker.reason, blocker.status),
        quantidade: 0,
        raw_reasons: [],
        ids_restaurantes_afetados: [],
        restaurantes_afetados: [],
        job_ids: [],
        statuses: {},
        acao_recomendada: '',
      });
    }
    const group = groupedReasons.get(key);
    group.quantidade += 1;
    group.raw_reasons.push(blocker.raw_reason);
    group.statuses[blocker.status] = (group.statuses[blocker.status] || 0) + 1;
    group.ids_restaurantes_afetados.push(blocker.restaurant_id);
    group.restaurantes_afetados.push({ id: blocker.restaurant_id, name: blocker.restaurant_name });
  }

  const blockedByReason = [...groupedReasons.values()]
    .map((group) => ({
      ...group,
      raw_reasons: [...new Set(group.raw_reasons)].slice(0, 20),
      ids_restaurantes_afetados: [...new Set(group.ids_restaurantes_afetados)],
      restaurantes_afetados: [...new Map(group.restaurantes_afetados.map((row) => [row.id, row])).values()],
      job_ids: [...new Set(group.job_ids)],
      acao_recomendada: actionFor(group.motivo, [group.stage]),
    }))
    .sort((a, b) => b.quantidade - a.quantidade || a.stage.localeCompare(b.stage));

  const topBottlenecks = blockedByReason
    .slice(0, 10)
    .map((group, index) => ({
      rank: index + 1,
      motivo: group.motivo,
      quantidade: group.quantidade,
      stage: group.stage,
      severidade: group.severidade,
      acao_recomendada: group.acao_recomendada,
      amostra: group.restaurantes_afetados.slice(0, 10),
    }));

  const restaurantsWithoutNextStep = [];
  const restaurantsNoJobYet = [];
  const recommendedJobs = [];

  for (const restaurant of activeRestaurants) {
    const restaurantJobs = jobsByRestaurantId.get(restaurant.id) || [];
    if (!restaurantJobs.length) restaurantsNoJobYet.push({ id: restaurant.id, name: restaurant.name });

    const ready = restaurant.is_published === true && restaurant.menu_status === 'found'
      || restaurantJobs.some((job) => job.stage === 'ready_publish' && job.status === 'done');
    const rejected = REJECTED_MENU_STATUSES.has(restaurant.menu_status)
      || restaurantJobs.some((job) => ['rejected', 'cancelled'].includes(job.status));
    const nextStage = recommendedNextStage(restaurant, restaurantJobs, menuCounts, mediaCounts);

    if (!ready && !rejected && !restaurantJobs.some((job) => NON_TERMINAL_STATUSES.has(job.status)) && !nextStage) {
      restaurantsWithoutNextStep.push({
        id: restaurant.id,
        name: restaurant.name,
        menu_status: restaurant.menu_status,
        job_count: restaurantJobs.length,
        menu_counts: menuCounts.get(restaurant.id) || { categories: 0, items: 0 },
        gallery_count: mediaCounts.gallery.get(restaurant.id) || 0,
      });
    }

    if (!ready && !rejected && !restaurantJobs.some((job) => NON_TERMINAL_STATUSES.has(job.status)) && nextStage) {
      recommendedJobs.push({
        id: restaurant.id,
        name: restaurant.name,
        recommended_stage: nextStage,
        has_job_history: restaurantJobs.length > 0,
        menu_status: restaurant.menu_status,
        menu_counts: menuCounts.get(restaurant.id) || { categories: 0, items: 0 },
        gallery_count: mediaCounts.gallery.get(restaurant.id) || 0,
      });
    }
  }

  const summary = {
    run_id: RUN_ID,
    generated_at: new Date().toISOString(),
    scope: { city: CITY, state: STATE },
    total_restaurantes_ativos: activeRestaurants.length,
    total_com_jobs_na_fila: restaurantsWithJobs.size,
    restaurantes_sem_job_ainda: activeRestaurants.length - restaurantsWithJobs.size,
    jobs_total: jobs.length,
    jobs_pending: statusCounts.pending || 0,
    jobs_done: statusCounts.done || 0,
    jobs_blocked: statusCounts.blocked || 0,
    jobs_error: statusCounts.error || 0,
    jobs_locked: statusCounts.locked || 0,
    jobs_rejected: statusCounts.rejected || 0,
    jobs_cancelled: statusCounts.cancelled || 0,
    events_total: events.length,
    restaurantes_com_cardapio_estruturado: [...menuCounts.values()].filter((row) => row.items > 0).length,
    restaurantes_com_midia_minima: activeRestaurants.filter((row) => (
      hasImage(row.image_url) && hasImage(row.cover_image_url) && (mediaCounts.gallery.get(row.id) || 0) >= 3
    )).length,
    restaurantes_sem_proximo_passo: restaurantsWithoutNextStep.length,
    recomendacoes_de_jobs_para_sem_job_ou_sem_job_aberto: recommendedJobs.length,
  };

  const blockedByStage = Object.values(stages)
    .map((stage) => ({
      ...stage,
      affected_restaurants_count: stage.affected_restaurants.length,
      action_recommended: actionFor(
        stage.error ? 'job_error_sem_last_error' : stage.blocked ? 'job_blocked_sem_motivo' : stage.pending ? 'job_pending' : stage.locked ? 'job_locked' : 'done',
        [stage.stage],
      ),
    }));

  const index = {
    summary: 'summary.json',
    blocked_by_reason: 'blocked-by-reason.json',
    blocked_by_stage: 'blocked-by-stage.json',
    top_bottlenecks: 'top-bottlenecks.json',
    restaurants_without_next_step: 'restaurants-without-next-step.json',
    restaurants_no_job_yet: 'restaurants-no-job-yet.json',
    recommended_next_jobs: 'recommended-next-jobs.json',
    operation_jobs: 'operation-jobs.json',
    operation_job_events: 'operation-job-events.json',
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, index.summary), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, index.blocked_by_reason), JSON.stringify(blockedByReason, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, index.blocked_by_stage), JSON.stringify(blockedByStage, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, index.top_bottlenecks), JSON.stringify(topBottlenecks, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, index.restaurants_without_next_step), JSON.stringify(restaurantsWithoutNextStep, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, index.restaurants_no_job_yet), JSON.stringify(restaurantsNoJobYet, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, index.recommended_next_jobs), JSON.stringify(recommendedJobs, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, index.operation_jobs), JSON.stringify(jobs, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, index.operation_job_events), JSON.stringify(events, null, 2));

  console.log(JSON.stringify({
    out_dir: path.resolve(OUT_DIR),
    summary,
    top_bottlenecks: topBottlenecks,
    files: index,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

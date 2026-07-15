import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  CityOperationRun,
  CityOperationState,
  CityRunCandidate,
  CodexActionRecommendation,
  CurrentBottleneck,
  JobHealth,
  MacroPhaseKey,
  MacroPhaseSummary,
  MenuOutreachRequest,
  OperationJob,
  OperationJobEvent,
  OperationRestaurant,
  OperationRunLane,
  OPERATION_PIPELINE_STAGES,
  PipelineStage,
  ReadyPublishState,
  RestaurantOperationRow,
  StageFilter,
} from './types';
import { assessCompleteness, isMenuSourceCandidateUrl, toRecord, truthyFlag } from './completeness';

const RESTAURANT_SELECT = [
  'id',
  'name',
  'category',
  'address',
  'neighborhood',
  'city',
  'state',
  'latitude',
  'longitude',
  'phone',
  'whatsapp_url',
  'instagram',
  'social_networks',
  'google_maps_url',
  'google_place_id',
  'other_url',
  'external_url',
  'ifood_url',
  'image_url',
  'cover_image_url',
  'menu_status',
  'menu_status_reason',
  'ai_validated',
  'is_deleted',
  'is_published',
  'ai_log',
  'created_at',
].join(',');

const JOB_SELECT = [
  'id',
  'restaurant_id',
  'city',
  'state',
  'stage',
  'status',
  'source_context',
  'priority',
  'locked_by',
  'locked_until',
  'attempts',
  'max_attempts',
  'last_error',
  'payload',
  'result_summary',
  'source_url',
  'source_platform',
  'created_at',
  'updated_at',
  'started_at',
  'finished_at',
].join(',');

const EVENT_SELECT = 'id,job_id,event_type,worker_id,stage,status,details,created_at';

const STAGE_LABELS: Record<string, string> = {
  all: 'Todos',
  no_job: 'Nao reconciliado',
  candidate_discovery: 'Descobrir candidatos',
  google_phase1: 'Google legado',
  google_enrichment: 'Google e localizacao',
  entity_resolution: 'Resolver identidade',
  restaurant_upsert: 'Criar/atualizar cadastro',
  channel_enrichment: 'Enriquecer canais',
  instagram_discovery: 'Descobrir Instagram',
  instagram_enrichment: 'Enriquecer Instagram',
  menu_source_discovery: 'Descobrir cardapio',
  menu_outreach_whatsapp: 'Solicitar via WhatsApp',
  menu_extraction_anotaai: 'Extrair Anota AI',
  menu_extraction_cardapioweb: 'Extrair CardapioWeb',
  menu_extraction_yooga: 'Extrair Yooga',
  menu_extraction_site_pdf: 'Site/PDF',
  semantic_menu_qa: 'QA semantico',
  media_collection: 'Coletar midia',
  media_qa: 'QA de metadados',
  media_visual_qa: 'QA visual real',
  structural_audit: 'Auditoria estrutural',
  completeness_scoring: 'Score de completude',
  operational_decision: 'Decisao operacional',
  publication_gate: 'Gate de publicacao',
  ready_publish: 'Gate tecnico legado',
  final_ready: 'Completo para aprovacao',
};

const MACRO_PHASES: { key: MacroPhaseKey; label: string; stages: StageFilter[] }[] = [
  {
    key: 'base',
    label: 'Censo e identidade',
    stages: ['candidate_discovery', 'entity_resolution', 'restaurant_upsert'],
  },
  {
    key: 'google',
    label: 'Google e localizacao',
    stages: ['google_phase1', 'google_enrichment'],
  },
  {
    key: 'channels',
    label: 'Canais',
    stages: ['channel_enrichment', 'instagram_discovery', 'instagram_enrichment'],
  },
  {
    key: 'menu',
    label: 'Cardapio',
    stages: ['menu_source_discovery', 'menu_outreach_whatsapp', 'menu_extraction_anotaai', 'menu_extraction_cardapioweb', 'menu_extraction_yooga', 'menu_extraction_site_pdf', 'semantic_menu_qa'],
  },
  {
    key: 'media',
    label: 'Midia',
    stages: ['media_collection', 'media_qa', 'media_visual_qa'],
  },
  {
    key: 'quality',
    label: 'Auditoria',
    stages: ['structural_audit', 'completeness_scoring'],
  },
  {
    key: 'publication',
    label: 'Decisao final',
    stages: ['operational_decision', 'publication_gate', 'ready_publish', 'final_ready'],
  },
];

const EMPTY_SCOREBOARD = {
  activeRestaurants: 0,
  jobsProcessed: 0,
  restaurantsWithJobs: 0,
  restaurantsWithoutJobs: 0,
  jobsPending: 0,
  jobsDone: 0,
  jobsBlocked: 0,
  jobsError: 0,
  jobsRejected: 0,
  activeLocks: 0,
  activeWorkers: 0,
  cityProcessed: 0,
  cityRemaining: 0,
  cityCompletionRate: 0,
  proposedTerminal: 0,
  acceptedIncomplete: 0,
  sourceRejected: 0,
  notFound: 0,
  duplicate: 0,
  inactive: 0,
  needsHumanReview: 0,
  rejectedRestaurants: 0,
  level0: 0,
  level1: 0,
  level2: 0,
  level3: 0,
  level4: 0,
  level5: 0,
  level6: 0,
  readyPublishTechnical: 0,
  readyPublishFinal: 0,
  mediaVisualQualityNotVerified: 0,
  published: 0,
  candidatesDiscovered: 0,
  candidatesUnresolved: 0,
  totalAttempts: 0,
  totalExternalCostCents: 0,
  throughputPerMinute: 0,
};

const classifyStatus = (status?: string | null): JobHealth => {
  const value = String(status || '').toLowerCase();
  if (['done', 'completed', 'succeeded', 'success'].includes(value)) return 'done';
  if (['blocked', 'manual_required', 'needs_human', 'waiting_human'].includes(value)) return 'blocked';
  if (['error', 'failed', 'failure'].includes(value)) return 'error';
  if (value === 'rejected') return 'rejected';
  if (value === 'cancelled') return 'cancelled';
  if (['running', 'processing', 'locked'].includes(value)) return 'running';
  if (['pending', 'queued', 'scheduled', 'retrying'].includes(value)) return 'pending';
  return 'other';
};

const isPipelineStage = (stage?: string | null): stage is PipelineStage => (
  Boolean(stage && OPERATION_PIPELINE_STAGES.includes(stage as PipelineStage))
);

const stageLabel = (stage: StageFilter) => STAGE_LABELS[stage] || stage;

const isLockedNow = (job: OperationJob) => {
  if (!job.locked_until) return false;
  const lockedUntil = new Date(job.locked_until).getTime();
  return Number.isFinite(lockedUntil) && lockedUntil > Date.now() && classifyStatus(job.status) !== 'done';
};

const chunkValues = <T,>(values: T[], size = 75) => {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) chunks.push(values.slice(index, index + size));
  return chunks;
};

const fetchRowsInChunks = async (
  table: 'menu_categories' | 'menu_items' | 'restaurant_gallery',
  select: string,
  column: string,
  values: string[],
) => {
  if (values.length === 0) return [] as any[];
  const responses = await Promise.all(chunkValues(values).map(chunk => (
    supabase.from(table).select(select).in(column, chunk).limit(5000)
  )));
  const failed = responses.find(response => response.error);
  if (failed?.error) throw failed.error;
  return responses.flatMap(response => response.data || []) as any[];
};

const enrichRestaurantEvidence = async (restaurants: OperationRestaurant[]) => {
  const activeIds = restaurants.filter(restaurant => restaurant.is_deleted !== true).map(restaurant => restaurant.id);
  const [categories, gallery] = await Promise.all([
    fetchRowsInChunks('menu_categories', 'id,restaurant_id,is_active', 'restaurant_id', activeIds),
    fetchRowsInChunks('restaurant_gallery', 'restaurant_id,image_url', 'restaurant_id', activeIds),
  ]);
  const activeCategories = categories.filter(category => category.is_active !== false);
  const categoryIds = activeCategories.map(category => category.id).filter(Boolean);
  const items = await fetchRowsInChunks('menu_items', 'id,category_id,is_active', 'category_id', categoryIds);
  const restaurantByCategory = new Map(activeCategories.map(category => [category.id, category.restaurant_id]));
  const categoryCounts = new Map<string, number>();
  const itemCounts = new Map<string, number>();
  const galleryCounts = new Map<string, number>();

  activeCategories.forEach(category => {
    categoryCounts.set(category.restaurant_id, (categoryCounts.get(category.restaurant_id) || 0) + 1);
  });
  items.filter(item => item.is_active !== false).forEach(item => {
    const restaurantId = restaurantByCategory.get(item.category_id);
    if (restaurantId) itemCounts.set(restaurantId, (itemCounts.get(restaurantId) || 0) + 1);
  });
  gallery.filter(item => typeof item.image_url === 'string' && item.image_url.trim()).forEach(item => {
    galleryCounts.set(item.restaurant_id, (galleryCounts.get(item.restaurant_id) || 0) + 1);
  });

  return restaurants.map(restaurant => ({
    ...restaurant,
    menu_category_count: categoryCounts.get(restaurant.id) || 0,
    menu_item_count: itemCounts.get(restaurant.id) || 0,
    gallery_count: galleryCounts.get(restaurant.id) || 0,
    evidence_is_partial: false,
  }));
};

const getReadyPublishState = (jobs: OperationJob[]): ReadyPublishState => {
  const readyJobs = jobs.filter(job => job.stage === 'ready_publish');
  const readySummaries = readyJobs.map(job => toRecord(job.result_summary));
  const allSummaries = jobs.map(job => toRecord(job.result_summary));
  const finalReady = readySummaries.some(summary => (
    truthyFlag(summary, 'ready_publish_final') &&
    truthyFlag(summary, 'publish_allowed') &&
    truthyFlag(summary, 'media_visual_quality_verified')
  ));
  const publishAllowed = readySummaries.some(summary => truthyFlag(summary, 'publish_allowed'));
  const mediaVisualQualityVerified = allSummaries.some(summary => truthyFlag(summary, 'media_visual_quality_verified'));
  const technicalGateOnly = readySummaries.some(summary => truthyFlag(summary, 'technical_gate_only'))
    || (readyJobs.some(job => classifyStatus(job.status) === 'done') && !finalReady);
  const mediaVisualQualityNotVerified = allSummaries.some(summary => truthyFlag(summary, 'media_visual_quality_not_verified'))
    || (technicalGateOnly && !mediaVisualQualityVerified);

  return {
    technicalGateOnly,
    finalReady,
    publishAllowed,
    mediaVisualQualityVerified,
    mediaVisualQualityNotVerified,
  };
};

const getJobAgeLabel = (job: OperationJob | null) => {
  if (!job?.updated_at && !job?.created_at) return 'sem idade';
  const timestamp = new Date(job.updated_at || job.created_at || '').getTime();
  if (!Number.isFinite(timestamp)) return 'sem idade';
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
};

const getMenuSource = (restaurant: OperationRestaurant, jobs: OperationJob[]) => {
  const direct = [restaurant.other_url, restaurant.external_url].find(isMenuSourceCandidateUrl);
  if (direct) return direct;
  const jobSource = jobs.find(job => isMenuSourceCandidateUrl(job.source_url))?.source_url;
  if (jobSource) return jobSource;
  const aiLog = toRecord(restaurant.ai_log);
  const evidence = toRecord(aiLog.evidence);
  const menuEvidence = toRecord(evidence.menu);
  return [menuEvidence.sourceUrl, menuEvidence.source_url, evidence.sourceUrl, evidence.source_url]
    .find(isMenuSourceCandidateUrl) || '';
};

const getBlockReason = (
  job: OperationJob | null,
  completeness: RestaurantOperationRow['completeness'],
) => {
  if (completeness.decision === 'complete') return '';
  if (completeness.decision === 'accepted_incomplete') {
    return completeness.missing.length > 0
      ? `Lacunas aceitas: ${completeness.missing.join(', ')}`
      : completeness.decisionReason;
  }
  if (['source_rejected', 'not_found', 'duplicate', 'inactive'].includes(completeness.decision)) {
    return completeness.decisionReason;
  }
  if (!job) return completeness.decisionReason;
  const summary = toRecord(job.result_summary);
  const payload = toRecord(job.payload);
  return String(
    job.last_error ||
    summary.block_reason ||
    summary.blocked_reason ||
    summary.reason ||
    summary.error ||
    payload.block_reason ||
    payload.reason ||
    ''
  ).trim() || completeness.decisionReason;
};

const getRisk = (
  stage: StageFilter,
  status: JobHealth,
  completeness: RestaurantOperationRow['completeness'],
  hasMenuSource: boolean,
) => {
  if (status === 'error') return 'critical';
  if (completeness.decision === 'needs_human_review') return 'high';
  if (completeness.canFinishCity) return completeness.decision === 'accepted_incomplete' ? 'low' : 'none';
  if (stage === 'no_job' || !hasMenuSource) return 'medium';
  if (status === 'pending' || status === 'running') return 'low';
  return 'medium';
};

const getRecommendedAction = (
  stage: StageFilter,
  status: JobHealth,
  reason: string,
  completeness: RestaurantOperationRow['completeness'],
) => {
  if (completeness.decision === 'complete') return 'Completude maxima comprovada. Publicar somente pelo gate final autorizado.';
  if (completeness.decision === 'source_rejected') return completeness.decisionRecorded
    ? 'Fonte rejeitada com decisao registrada; nao importar e preservar a evidencia.'
    : 'Proposta: rejeitar a fonte depois de registrar a evidencia no City Run.';
  if (completeness.decision === 'not_found') return completeness.decisionRecorded
    ? 'Busca encerrada dentro do orcamento; enriquecer somente em uma nova campanha.'
    : 'Proposta: encerrar como not_found depois de reconciliar e registrar a decisao.';
  if (['duplicate', 'inactive'].includes(completeness.decision)) return 'Nenhum novo worker necessario; manter evidencia do encerramento.';
  if (completeness.decision === 'accepted_incomplete') {
    return completeness.decisionRecorded
      ? `Cidade concluida neste perfil como Nivel ${completeness.level}. Enriquecimento futuro opcional: ${stageLabel(completeness.nextStage)}.`
      : `Proposta: aceitar no Nivel ${completeness.level} depois de registrar a decisao operacional.`;
  }
  if (status === 'error') return 'Investigar last_error, corrigir causa e refileirar via worker/RPC apropriado fora desta tela.';
  if (completeness.decision === 'needs_human_review') return `Revisar bloqueio: ${reason || 'motivo nao informado'}.`;
  if (stage === 'no_job') return 'Criar job operacional pela fila apropriada; esta tela nao cria nem roda jobs.';
  if (['candidate_discovery', 'entity_resolution', 'restaurant_upsert'].includes(stage)) return 'Descobrir, resolver identidade e criar o restaurante canonico.';
  if (['google_phase1', 'google_enrichment'].includes(stage)) return 'Enriquecer Google e localizacao dentro do orcamento da lane.';
  if (['channel_enrichment', 'instagram_discovery', 'instagram_enrichment'].includes(stage)) return 'Verificar o Instagram para N2; preservar telefone, site e WhatsApp sem usa-los como substitutos.';
  if (stage === 'menu_source_discovery') return 'Encontrar fonte publica de cardapio antes de extrair.';
  if (stage === 'menu_outreach_whatsapp') return 'Solicitar o cardapio pelo contato verificado e registrar resposta ou nao sucesso.';
  if (String(stage).startsWith('menu_extraction')) return 'Extrair cardapio e gravar result_summary auditavel.';
  if (stage === 'semantic_menu_qa') return 'Validar estrutura semantica do menu e bloquear inconsistencias.';
  if (stage === 'media_collection' || stage === 'media_qa') return 'Organizar midia minima e encaminhar imagens para QA visual real.';
  if (stage === 'media_visual_qa') return 'Validar qualidade visual para subir ao Nivel 5; a lacuna nao impede encerrar a cidade.';
  if (stage === 'structural_audit') return 'Executar a auditoria estrutural final para subir ao Nivel 6.';
  if (stage === 'completeness_scoring') return 'Registrar o melhor nivel comprovado e encerrar a decisao da cidade.';
  if (stage === 'operational_decision') return 'Encerrar como complete, accepted_incomplete, not_found, source_rejected ou revisao humana.';
  if (stage === 'publication_gate' || stage === 'ready_publish') return 'Separar completude operacional de autorizacao final de publicacao.';
  return 'Revisar lote no worker responsavel.';
};

const getCurrentJob = (jobs: OperationJob[]) => {
  const ordered = [...jobs].sort((a, b) => (
    new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime()
  ));
  return ordered.find(job => ['pending', 'running'].includes(classifyStatus(job.status)))
    || ordered.find(job => ['error', 'blocked'].includes(classifyStatus(job.status)))
    || ordered[0]
    || null;
};

const buildRows = (
  restaurants: OperationRestaurant[],
  jobs: OperationJob[],
  events: OperationJobEvent[],
  menuOutreachRequests: MenuOutreachRequest[],
): RestaurantOperationRow[] => {
  const jobsByRestaurant = new Map<string, OperationJob[]>();
  jobs.forEach(job => {
    if (!job.restaurant_id) return;
    const current = jobsByRestaurant.get(job.restaurant_id) || [];
    current.push(job);
    jobsByRestaurant.set(job.restaurant_id, current);
  });

  const eventsByJob = new Map<string, OperationJobEvent[]>();
  events.forEach(event => {
    if (!event.job_id) return;
    const current = eventsByJob.get(event.job_id) || [];
    current.push(event);
    eventsByJob.set(event.job_id, current);
  });

  const outreachByRestaurant = new Map<string, MenuOutreachRequest>();
  [...menuOutreachRequests]
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
    .forEach(request => {
      if (!outreachByRestaurant.has(request.restaurant_id)) outreachByRestaurant.set(request.restaurant_id, request);
    });

  return restaurants
    .filter(restaurant => restaurant.is_deleted !== true)
    .map(restaurant => {
      const restaurantJobs = jobsByRestaurant.get(restaurant.id) || [];
      const currentJob = getCurrentJob(restaurantJobs);
      const readyPublish = getReadyPublishState(restaurantJobs);
      const completeness = assessCompleteness(restaurant, restaurantJobs, readyPublish);
      const stage: StageFilter = completeness.canFinishCity && completeness.decision === 'complete'
        ? 'final_ready'
        : completeness.canFinishCity
          ? 'operational_decision'
        : currentJob
        ? (isPipelineStage(currentJob.stage) ? currentJob.stage : 'no_job')
        : 'no_job';
      const status = currentJob ? classifyStatus(currentJob.status) : 'other';
      const blockReason = getBlockReason(currentJob, completeness);
      const menuSource = getMenuSource(restaurant, restaurantJobs);
      const hasMenuSource = Boolean(menuSource);
      const menuOutreach = outreachByRestaurant.get(restaurant.id) || null;
      const rowEvents = restaurantJobs.flatMap(job => eventsByJob.get(job.id) || []);
      const canPublish = readyPublish.finalReady && completeness.level === 6;
      const risk = getRisk(stage, status, completeness, hasMenuSource);

      return {
        restaurant,
        jobs: restaurantJobs,
        events: rowEvents.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()),
        currentJob,
        stage,
        status,
        blockReason,
        nextAction: getRecommendedAction(stage, status, blockReason, completeness),
        shortEvidence: [
          `nivel: ${completeness.level}`,
          `decisao: ${completeness.decision}`,
          restaurant.menu_item_count !== undefined ? `itens: ${restaurant.menu_item_count}` : '',
          menuSource ? `fonte: ${menuSource}` : '',
          currentJob?.source_platform ? `plataforma: ${currentJob.source_platform}` : '',
          currentJob?.updated_at ? `job: ${new Date(currentJob.updated_at).toLocaleString()}` : '',
        ].filter(Boolean).join(' | ') || 'Sem evidencia operacional curta',
        jobAgeLabel: getJobAgeLabel(currentJob),
        risk,
        canPublish,
        hasMenuSource,
        menuOutreach,
        readyPublish,
        completeness,
      };
    });
};

const stageAction = (stage: StageFilter) => {
  if (stage === 'menu_source_discovery') return 'Descobrir fonte confiavel ou rejeitar rapido nomes fracos.';
  if (stage === 'menu_outreach_whatsapp') return 'Pedir cardapio sem repetir contatos e registrar fonte recebida ou nao sucesso.';
  if (stage === 'media_qa' || stage === 'media_visual_qa') return 'Subir apenas os melhores candidatos de midia; ausencia pode encerrar em nivel menor.';
  if (stage === 'semantic_menu_qa') return 'Separar bloqueios semanticamente corrigiveis dos irrecuperaveis.';
  if (stage === 'no_job') return 'Criar jobs para restaurantes sem proximo passo.';
  if (String(stage).startsWith('menu_extraction')) return 'Atacar extracao do conector/plataforma com maior volume.';
  if (stage === 'completeness_scoring') return 'Registrar nivel e decisao terminal sem exigir perfeicao.';
  if (stage === 'publication_gate' || stage === 'ready_publish') return 'Confirmar nivel e manter publicacao separada da coleta.';
  if (stage === 'final_ready') return 'Revisar lote final sem publicar por esta tela.';
  return `Atacar lote em ${stageLabel(stage)}.`;
};

const commandForStage = (stage: StageFilter) => (
  `# read-only suggestion\n# Filtrar stage=${stage} e executar worker apropriado fora da UI, em dry-run quando disponivel.`
);

const promptForStage = (stage: StageFilter, reason: string) => (
  `Analise o gargalo ${stageLabel(stage)}. Motivo principal: ${reason || 'nao informado'}. Priorize lote pequeno, preserve dados, nao publique e reporte evidencias, bloqueios e proxima acao.`
);

const impactForStage = (stage: StageFilter, count: number) => {
  if (stage === 'no_job') return `${count} restaurante(s) nao entram no fluxo Codex enquanto nao tiverem job.`;
  if (stage === 'media_qa' || stage === 'media_visual_qa') return `${count} restaurante(s) podem encerrar em nivel menor, ou subir ao Nivel 5 apos QA visual.`;
  if (stage === 'menu_source_discovery') return `${count} restaurante(s) nao chegam a extracao sem fonte confiavel.`;
  if (stage === 'menu_outreach_whatsapp') return `${count} restaurante(s) podem fornecer cardapio por WhatsApp; falta de resposta encerra em nivel menor.`;
  if (stage === 'ready_publish') return `${count} restaurante(s) exigem distinguir gate tecnico de pronto final real.`;
  return `${count} restaurante(s) concentrados neste stage.`;
};

export function useCityOperationState(cityId?: string): CityOperationState {
  const [city, setCity] = useState<CityOperationState['city']>(null);
  const [restaurants, setRestaurants] = useState<OperationRestaurant[]>([]);
  const [cityRuns, setCityRuns] = useState<CityOperationRun[]>([]);
  const [candidates, setCandidates] = useState<CityRunCandidate[]>([]);
  const [lanes, setLanes] = useState<OperationRunLane[]>([]);
  const [jobs, setJobs] = useState<OperationJob[]>([]);
  const [events, setEvents] = useState<OperationJobEvent[]>([]);
  const [menuOutreachRequests, setMenuOutreachRequests] = useState<MenuOutreachRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operationAccessError, setOperationAccessError] = useState<string | null>(null);
  const [menuOutreachAccessError, setMenuOutreachAccessError] = useState<string | null>(null);
  const [evidenceAccessWarning, setEvidenceAccessWarning] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!cityId) return;
    setLoading(true);
    setError(null);
    setOperationAccessError(null);
    setMenuOutreachAccessError(null);
    setEvidenceAccessWarning(null);

    try {
      const { data: cityData, error: cityError } = await supabase
        .from('expansion_projects')
        .select('id,name,state,slug')
        .eq('slug', cityId)
        .single();
      if (cityError) throw cityError;
      setCity(cityData);

      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select(RESTAURANT_SELECT)
        .eq('city', cityData.name)
        .eq('state', cityData.state)
        .order('created_at', { ascending: false })
        .limit(1500);
      if (restaurantError) throw restaurantError;

      let loadedRestaurants = (restaurantData || []) as unknown as OperationRestaurant[];
      try {
        loadedRestaurants = await enrichRestaurantEvidence(loadedRestaurants);
      } catch (evidenceError: any) {
        loadedRestaurants = loadedRestaurants.map(restaurant => ({ ...restaurant, evidence_is_partial: true }));
        setEvidenceAccessWarning(evidenceError?.message || String(evidenceError));
      }
      setRestaurants(loadedRestaurants);

      const activeIds = loadedRestaurants
        .filter(restaurant => restaurant.is_deleted !== true)
        .map(restaurant => restaurant.id)
        .filter(Boolean)
        .slice(0, 1000);

      try {
        const snapshotResponse = await supabase.rpc('admin_city_operation_snapshot', {
          p_city: cityData.name,
          p_state: cityData.state,
        });
        if (!snapshotResponse.error && snapshotResponse.data) {
          const snapshot = toRecord(snapshotResponse.data);
          setCityRuns(Array.isArray(snapshot.city_runs) ? snapshot.city_runs as CityOperationRun[] : []);
          setCandidates(Array.isArray(snapshot.candidates) ? snapshot.candidates as CityRunCandidate[] : []);
          setLanes(Array.isArray(snapshot.lanes) ? snapshot.lanes as OperationRunLane[] : []);
          const snapshotJobs = Array.isArray(snapshot.jobs) ? snapshot.jobs as OperationJob[] : [];
          const decisions = Array.isArray(snapshot.decisions) ? snapshot.decisions as Record<string, any>[] : [];
          const decisionJobs: OperationJob[] = decisions
            .filter(decision => decision.restaurant_id)
            .map(decision => ({
              id: `decision-${decision.id}`,
              restaurant_id: decision.restaurant_id,
              city: cityData.name,
              state: cityData.state,
              stage: 'operational_decision',
              status: decision.is_terminal === false ? 'blocked' : 'done',
              source_context: decision.source_context,
              result_summary: {
                city_completion_decision: decision.decision,
                operational_decision: decision.decision,
                completeness_level: decision.completeness_level,
                confidence_score: decision.confidence_score,
                city_completion_terminal: decision.is_terminal,
                reason: decision.reason,
                missing_capabilities: decision.missing_capabilities,
              },
              created_at: decision.created_at,
              updated_at: decision.decided_at || decision.created_at,
              finished_at: decision.is_terminal === false ? null : decision.decided_at,
            }));
          setJobs([...snapshotJobs, ...decisionJobs]);
          setEvents(Array.isArray(snapshot.events) ? snapshot.events as OperationJobEvent[] : []);
          setOperationAccessError(null);

          const outreachResponse = await supabase.rpc('admin_city_menu_outreach_snapshot', {
            p_city: cityData.name,
            p_state: cityData.state,
          });
          if (outreachResponse.error) {
            setMenuOutreachRequests([]);
            setMenuOutreachAccessError('Acompanhamento de WhatsApp aguardando a migration 0067. Nenhum contato e tratado como fonte de cardapio.');
          } else {
            const outreachSnapshot = toRecord(outreachResponse.data);
            setMenuOutreachRequests(Array.isArray(outreachSnapshot.requests)
              ? outreachSnapshot.requests as MenuOutreachRequest[]
              : []);
            setMenuOutreachAccessError(null);
          }
          return;
        }

        const snapshotWarning = snapshotResponse.error
          ? 'Leitura operacional protegida indisponivel. O painel mostra dados cadastrados, mas jobs, verificacoes e decisoes oficiais podem aparecer zerados ate a migration 0066 ser aplicada.'
          : null;

        const [jobsByCity, jobsByRestaurant] = await Promise.all([
          supabase
            .from('operation_jobs')
            .select(JOB_SELECT)
            .eq('city', cityData.name)
            .eq('state', cityData.state)
            .order('created_at', { ascending: false })
            .limit(1000),
          activeIds.length > 0
            ? supabase
              .from('operation_jobs')
              .select(JOB_SELECT)
              .in('restaurant_id', activeIds)
              .order('created_at', { ascending: false })
              .limit(1000)
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (jobsByCity.error) throw jobsByCity.error;
        if (jobsByRestaurant.error) throw jobsByRestaurant.error;

        const jobsById = new Map<string, OperationJob>();
        ([...(jobsByCity.data || []), ...(jobsByRestaurant.data || [])] as OperationJob[]).forEach(job => {
          if (job.id) jobsById.set(job.id, job);
        });
        const loadedJobs = [...jobsById.values()];
        setCityRuns([]);
        setCandidates([]);
        setLanes([]);
        setJobs(loadedJobs);
        setMenuOutreachRequests([]);
        setMenuOutreachAccessError('Acompanhamento de WhatsApp aguardando a migration 0067.');
        if (snapshotWarning) setOperationAccessError(snapshotWarning);

        const jobIds = loadedJobs.map(job => job.id).filter(Boolean).slice(0, 1000);
        if (jobIds.length === 0) {
          setEvents([]);
        } else {
          const { data: eventData, error: eventError } = await supabase
            .from('operation_job_events')
            .select(EVENT_SELECT)
            .in('job_id', jobIds)
            .order('created_at', { ascending: false })
            .limit(1500);
          if (eventError) throw eventError;
          setEvents((eventData || []) as OperationJobEvent[]);
        }
      } catch (operationError: any) {
        setCityRuns([]);
        setCandidates([]);
        setLanes([]);
        setJobs([]);
        setEvents([]);
        setMenuOutreachRequests([]);
        setOperationAccessError(operationError?.message || String(operationError));
      }
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [cityId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const rows = useMemo(
    () => buildRows(restaurants, jobs, events, menuOutreachRequests),
    [events, jobs, menuOutreachRequests, restaurants],
  );
  const currentRun = useMemo(() => (
    cityRuns.find(run => ['running', 'closing'].includes(String(run.status || '').toLowerCase()))
    || cityRuns[0]
    || null
  ), [cityRuns]);

  const scoreboard = useMemo(() => {
    const activeRestaurants = restaurants.filter(restaurant => restaurant.is_deleted !== true);
    const restaurantsWithJobs = new Set(jobs.map(job => job.restaurant_id).filter(Boolean));
    const readyRows = rows.filter(row => row.readyPublish.technicalGateOnly || row.readyPublish.finalReady);
    const activeLockedJobs = jobs.filter(isLockedNow);
    const processedStatuses: JobHealth[] = ['done', 'blocked', 'error', 'rejected', 'cancelled'];
    const cityProcessed = rows.filter(row => row.completeness.canFinishCity).length;
    const proposedTerminal = rows.filter(row => row.completeness.proposedTerminal && !row.completeness.canFinishCity).length;
    const cityRemaining = Math.max(0, activeRestaurants.length - cityProcessed);
    const runStartedAt = currentRun?.started_at || currentRun?.created_at;
    const elapsedMinutes = runStartedAt
      ? Math.max(1, (Date.now() - new Date(runStartedAt).getTime()) / 60_000)
      : 0;
    return {
      activeRestaurants: activeRestaurants.length,
      jobsProcessed: jobs.filter(job => processedStatuses.includes(classifyStatus(job.status))).length,
      restaurantsWithJobs: activeRestaurants.filter(restaurant => restaurantsWithJobs.has(restaurant.id)).length,
      restaurantsWithoutJobs: activeRestaurants.filter(restaurant => !restaurantsWithJobs.has(restaurant.id)).length,
      jobsPending: jobs.filter(job => ['pending', 'running'].includes(classifyStatus(job.status))).length,
      jobsDone: jobs.filter(job => classifyStatus(job.status) === 'done').length,
      jobsBlocked: jobs.filter(job => classifyStatus(job.status) === 'blocked').length,
      jobsError: jobs.filter(job => classifyStatus(job.status) === 'error').length,
      jobsRejected: jobs.filter(job => classifyStatus(job.status) === 'rejected').length,
      activeLocks: activeLockedJobs.length,
      activeWorkers: new Set(activeLockedJobs.map(job => job.locked_by).filter(Boolean)).size,
      cityProcessed,
      cityRemaining,
      cityCompletionRate: activeRestaurants.length > 0 ? Math.round((cityProcessed / activeRestaurants.length) * 100) : 0,
      proposedTerminal,
      acceptedIncomplete: rows.filter(row => row.completeness.canFinishCity && row.completeness.decision === 'accepted_incomplete').length,
      sourceRejected: rows.filter(row => row.completeness.canFinishCity && row.completeness.decision === 'source_rejected').length,
      notFound: rows.filter(row => row.completeness.canFinishCity && row.completeness.decision === 'not_found').length,
      duplicate: rows.filter(row => row.completeness.canFinishCity && row.completeness.decision === 'duplicate').length,
      inactive: rows.filter(row => row.completeness.canFinishCity && row.completeness.decision === 'inactive').length,
      needsHumanReview: rows.filter(row => row.completeness.decision === 'needs_human_review').length,
      rejectedRestaurants: rows.filter(row => row.completeness.canFinishCity && ['source_rejected', 'duplicate', 'inactive'].includes(row.completeness.decision)).length,
      level0: rows.filter(row => row.completeness.level === 0).length,
      level1: rows.filter(row => row.completeness.level === 1).length,
      level2: rows.filter(row => row.completeness.level === 2).length,
      level3: rows.filter(row => row.completeness.level === 3).length,
      level4: rows.filter(row => row.completeness.level === 4).length,
      level5: rows.filter(row => row.completeness.level === 5).length,
      level6: rows.filter(row => row.completeness.level === 6).length,
      readyPublishTechnical: readyRows.length,
      readyPublishFinal: readyRows.filter(row => row.readyPublish.finalReady).length,
      mediaVisualQualityNotVerified: readyRows.filter(row => row.readyPublish.mediaVisualQualityNotVerified).length,
      published: activeRestaurants.filter(restaurant => restaurant.is_published === true).length,
      candidatesDiscovered: candidates.length,
      candidatesUnresolved: candidates.filter(candidate => ['pending', 'needs_human_review'].includes(String(candidate.resolution_status || 'pending'))).length,
      totalAttempts: jobs.reduce((total, job) => total + Number(job.attempts || 0), 0),
      totalExternalCostCents: jobs.reduce((total, job) => total + Number(job.external_cost_cents || 0), 0),
      throughputPerMinute: elapsedMinutes > 0 ? Math.round((cityProcessed / elapsedMinutes) * 100) / 100 : 0,
    };
  }, [candidates, currentRun, jobs, restaurants, rows]);

  const stageSummaries = useMemo(() => {
    const stages: StageFilter[] = [...OPERATION_PIPELINE_STAGES, 'final_ready', 'no_job'];
    return stages.map(stage => {
      const stageRows = rows.filter(row => (
        stage === 'final_ready'
          ? row.readyPublish.finalReady
          : stage === 'ready_publish'
            ? row.stage === 'ready_publish' && !row.readyPublish.finalReady
            : row.stage === stage
      ));
      return {
        key: stage,
        label: stageLabel(stage),
        count: stageRows.length,
        pending: stageRows.filter(row => (
          !row.completeness.canFinishCity
          && row.completeness.decision === 'pending'
          && ['pending', 'running', 'other'].includes(row.status)
        )).length,
        done: stageRows.filter(row => row.completeness.canFinishCity || row.status === 'done').length,
        blocked: stageRows.filter(row => (
          row.completeness.decision === 'needs_human_review' && row.status !== 'error'
        )).length,
        error: stageRows.filter(row => (
          row.completeness.decision === 'needs_human_review' && row.status === 'error'
        )).length,
        rejected: stageRows.filter(row => ['source_rejected', 'duplicate', 'inactive'].includes(row.completeness.decision)).length,
      };
    });
  }, [rows]);

  const macroPhases = useMemo<MacroPhaseSummary[]>(() => (
    MACRO_PHASES.map(phase => {
      const stages = stageSummaries.filter(summary => phase.stages.includes(summary.key));
      const mainBottleneck = [...stages].sort((a, b) => (
        (b.pending + b.blocked + b.error) - (a.pending + a.blocked + a.error)
      ))[0] || null;
      return {
        key: phase.key,
        label: phase.label,
        stages,
        pending: stages.reduce((total, stage) => total + stage.pending, 0),
        blocked: stages.reduce((total, stage) => total + stage.blocked + stage.error, 0),
        rejected: stages.reduce((total, stage) => total + stage.rejected, 0),
        done: stages.reduce((total, stage) => total + stage.done, 0),
        total: stages.reduce((total, stage) => total + stage.count, 0),
        mainBottleneck,
      };
    })
  ), [stageSummaries]);

  const blockReasons = useMemo(() => {
    const map = new Map<string, { count: number; stage: StageFilter; action: string }>();
    rows
      .filter(row => (
        row.completeness.decision === 'needs_human_review'
        || (row.completeness.decision === 'pending' && row.stage === 'no_job')
      ))
      .forEach(row => {
        const reason = row.blockReason || 'Sem motivo informado';
        const current = map.get(reason) || { count: 0, stage: row.stage, action: row.nextAction };
        current.count += 1;
        map.set(reason, current);
      });
    return [...map.entries()]
      .map(([reason, value]) => ({ reason, ...value }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [rows]);

  const currentBottleneck = useMemo<CurrentBottleneck>(() => {
    const candidates = stageSummaries
      .filter(summary => summary.key !== 'final_ready')
      .map(summary => ({
        ...summary,
        score: summary.error * 4 + summary.blocked * 3 + summary.pending * 2 + (summary.key === 'no_job' ? summary.count : 0),
      }))
      .filter(summary => summary.score > 0)
      .sort((a, b) => b.score - a.score || b.count - a.count);
    const top = candidates[0] || {
      key: 'no_job' as StageFilter,
      label: 'Cidade decidida',
      count: 0,
      pending: 0,
      done: 0,
      blocked: 0,
      error: 0,
      rejected: 0,
    };
    const unresolvedCount = top.pending + top.blocked + top.error;
    const rowsInStage = rows.filter(row => (
      (row.stage === top.key || (top.key === 'no_job' && row.stage === 'no_job'))
      && !row.completeness.canFinishCity
    ));
    const reason = blockReasons.find(item => item.stage === top.key)?.reason || rowsInStage.find(row => row.blockReason)?.blockReason || 'Sem motivo principal informado';
    const stageJobs = jobs.filter(job => job.stage === top.key);
    const activeStageLocks = stageJobs.filter(isLockedNow);
    return {
      stage: top.key,
      label: unresolvedCount > 0 ? stageLabel(top.key) : 'Cidade decidida',
      count: unresolvedCount,
      pendingBlocked: unresolvedCount,
      activeLocks: activeStageLocks.length,
      activeWorkers: new Set(activeStageLocks.map(job => job.locked_by).filter(Boolean)).size,
      mainReason: reason,
      impact: unresolvedCount > 0
        ? impactForStage(top.key, unresolvedCount)
        : 'Todos os restaurantes carregados possuem uma decisao operacional terminal.',
      recommendedAction: unresolvedCount > 0
        ? stageAction(top.key)
        : 'Nenhum novo worker obrigatorio; enriquecimentos de nivel podem seguir por prioridade.',
      commandSuggestion: commandForStage(top.key),
      workerPrompt: promptForStage(top.key, reason),
    };
  }, [blockReasons, jobs, rows, stageSummaries]);

  const codexActions = useMemo<CodexActionRecommendation[]>(() => {
    const actionRows = [
      {
        title: 'Atacar o gargalo atual',
        filter: 'current_bottleneck' as const,
        stage: currentBottleneck.stage,
        count: currentBottleneck.pendingBlocked || currentBottleneck.count,
        risk: currentBottleneck.stage === 'no_job' ? 'medium' as const : 'high' as const,
        requiresHumanApproval: false,
        impact: currentBottleneck.impact,
        commandSuggestion: currentBottleneck.commandSuggestion,
        promptSuggestion: currentBottleneck.workerPrompt,
      },
      {
        title: 'Validar midia visual para o Nivel 5',
        filter: 'visual_qa_pending' as const,
        stage: 'media_visual_qa' as StageFilter,
        count: rows.filter(row => row.completeness.level === 4 && !row.completeness.gates.mediaVisualQualityVerified).length,
        risk: 'medium' as const,
        requiresHumanApproval: true,
        impact: `${rows.filter(row => row.completeness.level === 4 && !row.completeness.gates.mediaVisualQualityVerified).length} perfil(is) podem subir ao Nivel 5; a cidade nao depende disso para terminar.`,
        commandSuggestion: '# dry-run sugerido\n# media_visual_qa --city ' + (city?.slug || '<city>') + ' --dry-run --limit 10',
        promptSuggestion: 'Revise media_qa visual em lote pequeno. Nao publique. Classifique fotos reais, capa, galeria e duplicidades.',
      },
      {
        title: 'Criar jobs para restaurantes sem proximo passo',
        filter: 'no_job' as const,
        stage: 'no_job' as StageFilter,
        count: rows.filter(row => row.stage === 'no_job' && row.completeness.decision === 'pending').length,
        risk: 'medium' as const,
        requiresHumanApproval: false,
        impact: `${rows.filter(row => row.stage === 'no_job' && row.completeness.decision === 'pending').length} restaurante(s) ainda nao possuem decisao nem proximo job.`,
        commandSuggestion: '# sugestao read-only\n# gerar fila operacional para restaurantes sem job, sem executar nesta UI',
        promptSuggestion: 'Identifique restaurantes ativos sem operation_job e proponha stage inicial sem alterar banco.',
      },
      {
        title: 'Separar bloqueios corrigiveis',
        filter: 'blocked' as const,
        stage: 'all' as StageFilter,
        count: scoreboard.needsHumanReview,
        risk: 'high' as const,
        requiresHumanApproval: true,
        impact: `${scoreboard.needsHumanReview} restaurante(s) realmente exigem revisao humana para encerrar a decisao.`,
        commandSuggestion: '# revisar bloqueios por motivo antes de reprocessar',
        promptSuggestion: 'Agrupe bloqueios por motivo, separe corrigiveis de rejeicao final e recomende proximo worker sem publicar.',
      },
      {
        title: 'Revisar menu_source_discovery pendentes',
        filter: 'without_source' as const,
        stage: 'menu_source_discovery' as StageFilter,
        count: rows.filter(row => !row.hasMenuSource && !row.completeness.canFinishCity && row.stage !== 'no_job').length,
        risk: 'medium' as const,
        requiresHumanApproval: false,
        impact: 'Buscar dentro do orcamento; sem fonte confiavel, encerrar como not_found/accepted_incomplete.',
        commandSuggestion: '# menu_source_discovery --dry-run --limit 10',
        promptSuggestion: 'Encontre fonte de cardapio confiavel ou recomende rejeicao rapida para nomes fracos.',
      },
    ];

    return actionRows
      .filter(action => action.count > 0)
      .sort((a, b) => {
        const riskScore = { critical: 4, high: 3, medium: 2, low: 1, none: 0 };
        return riskScore[b.risk] - riskScore[a.risk] || b.count - a.count;
      })
      .slice(0, 5)
      .map((action, index) => ({ ...action, priority: index + 1 }));
  }, [city?.slug, currentBottleneck, rows, scoreboard]);

  return {
    city,
    loading,
    error,
    operationAccessError,
    menuOutreachAccessError,
    evidenceAccessWarning,
    restaurants,
    cityRuns,
    currentRun,
    candidates,
    lanes,
    jobs,
    events,
    menuOutreachRequests,
    rows,
    scoreboard: scoreboard || EMPTY_SCOREBOARD,
    stageSummaries,
    macroPhases,
    currentBottleneck,
    blockReasons,
    codexActions,
    refresh,
  };
}

export { stageLabel, classifyStatus, getReadyPublishState };

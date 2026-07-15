import {
  CityCompletionDecision,
  CompletenessLevel,
  OperationJob,
  OperationRestaurant,
  ReadyPublishState,
  RestaurantCompletenessState,
  StageFilter,
} from './types';

const ACTIVE_JOB_STATUSES = new Set(['pending', 'locked', 'running', 'processing', 'queued', 'scheduled', 'retrying']);
const ERROR_JOB_STATUSES = new Set(['error', 'failed', 'failure']);
const REJECTED_JOB_STATUSES = new Set(['rejected']);
const NO_MENU_STATUSES = new Set(['not_found', 'unavailable', 'invalid_source']);
const HUMAN_REVIEW_STAGES = new Set(['entity_resolution', 'semantic_menu_qa', 'structural_audit', 'operational_decision']);
const PUBLICATION_STAGES = new Set(['publication_gate', 'ready_publish']);
const ACCEPTED_GAP_STAGES = new Set([
  'menu_source_discovery',
  'menu_outreach_whatsapp',
  'menu_extraction_anotaai',
  'menu_extraction_cardapioweb',
  'menu_extraction_yooga',
  'menu_extraction_site_pdf',
  'media_collection',
  'media_qa',
  'media_visual_qa',
  'publication_gate',
  'ready_publish',
]);

const DECISION_LABELS: Record<CityCompletionDecision, string> = {
  pending: 'Pendente de decisao',
  accepted_incomplete: 'Aceito incompleto',
  complete: 'Completo',
  source_rejected: 'Fonte rejeitada',
  not_found: 'Nao encontrado',
  needs_human_review: 'Revisao humana',
  duplicate: 'Duplicado',
  inactive: 'Inativo',
};

const LEVEL_LABELS: Record<CompletenessLevel, string> = {
  0: 'Nao mapeado',
  1: 'Basico / Google',
  2: 'Instagram verificado',
  3: 'Fonte de cardapio validada',
  4: 'Cardapio coletado',
  5: 'Midia visual aprovada',
  6: 'Auditoria final aprovada',
};

export const toRecord = (value: unknown): Record<string, any> => {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (_) {
      return {};
    }
  }
  return {};
};

export const truthyFlag = (record: Record<string, any>, key: string) => (
  record[key] === true || record[key] === 'true'
);

const hasText = (value: unknown) => typeof value === 'string' && value.trim().length > 0;

const NON_MENU_SOURCE_URL = /(ifood|wa\.me|whatsapp(?:\.com)?|instagram\.com|instagr\.am|facebook\.com|fb\.com|linktr\.ee|beacons\.ai|bio\.site|msha\.ke|solo\.to)/i;

export const isMenuSourceCandidateUrl = (value: unknown) => (
  hasText(value) && /^https?:\/\//i.test(String(value).trim()) && !NON_MENU_SOURCE_URL.test(String(value))
);

const normalizedJobStatus = (job: OperationJob) => String(job.status || '').trim().toLowerCase();

const stageDone = (jobs: OperationJob[], stage: string) => jobs.some(job => (
  job.stage === stage && ['done', 'completed', 'succeeded', 'success'].includes(normalizedJobStatus(job))
));

const latestStageSummary = (jobs: OperationJob[], stage: string) => {
  const job = [...jobs]
    .filter(candidate => candidate.stage === stage)
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())[0];
  return toRecord(job?.result_summary);
};

const latestSummaryWithAssessment = (jobs: OperationJob[]) => (
  [...jobs]
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
    .map(job => toRecord(job.result_summary))
    .find(summary => Number.isFinite(Number(summary.completeness_level))) || null
);

const normalizeLevel = (value: unknown): CompletenessLevel | null => {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric >= 0 && numeric <= 6 ? numeric as CompletenessLevel : null;
};

const normalizeDecision = (value: unknown): CityCompletionDecision | null => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['accepted_incomplete', 'accepted-incomplete', 'incomplete_accepted'].includes(normalized)) return 'accepted_incomplete';
  if (['complete', 'completed', 'final_ready', 'ready'].includes(normalized)) return 'complete';
  if (['source_rejected', 'rejected', 'reject'].includes(normalized)) return 'source_rejected';
  if (['not_found', 'not-found'].includes(normalized)) return 'not_found';
  if (normalized === 'duplicate') return 'duplicate';
  if (normalized === 'inactive') return 'inactive';
  if (normalized === 'inactive_or_duplicate') return 'needs_human_review';
  if (['needs_human_review', 'human_review', 'manual_required', 'blocked'].includes(normalized)) return 'needs_human_review';
  if (['pending', 'in_progress', 'running'].includes(normalized)) return 'pending';
  return null;
};

const explicitDecisionFromJobs = (jobs: OperationJob[]) => {
  for (const job of [...jobs].sort((a, b) => (
    new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime()
  ))) {
    const summary = toRecord(job.result_summary);
    const decision = normalizeDecision(
      summary.city_completion_decision
      || summary.operational_decision
      || summary.completeness_decision
    );
    if (decision) return decision;
  }
  return null;
};

const getBaseIdentity = (restaurant: OperationRestaurant) => {
  const hasLocationText = hasText(restaurant.address)
    || hasText(restaurant.neighborhood)
    || hasText(restaurant.google_maps_url);
  const hasGeo = (
    restaurant.latitude !== null
    && restaurant.latitude !== undefined
    && restaurant.longitude !== null
    && restaurant.longitude !== undefined
  ) || hasText(restaurant.google_place_id) || hasText(restaurant.google_maps_url);

  return hasText(restaurant.name)
    && hasText(restaurant.city)
    && hasText(restaurant.state)
    && hasLocationText
    && hasGeo;
};

export const hasInstagramRecord = (restaurant: OperationRestaurant) => {
  if (hasText(restaurant.instagram)) return true;
  const socialText = JSON.stringify(restaurant.social_networks || {}).toLowerCase();
  return socialText.includes('instagram') || socialText.includes('instagr.am');
};

export const hasWhatsappContact = (restaurant: OperationRestaurant) => {
  const digits = String(restaurant.whatsapp_url || '').replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 13 && !/(\d)\1{7,}/.test(digits.slice(-9));
};

const menuSourceValidated = (jobs: OperationJob[]) => {
  if (jobs.some(job => String(job.stage || '').startsWith('menu_extraction_') && normalizedJobStatus(job) === 'done')) return true;
  const sourceJob = [...jobs]
    .filter(job => job.stage === 'menu_source_discovery' && normalizedJobStatus(job) === 'done')
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())[0];
  if (!sourceJob) return false;
  const summary = toRecord(sourceJob.result_summary);
  const sourceUrl = sourceJob.source_url || summary.source_url || summary.sourceUrl || summary.url;
  const platform = `${sourceJob.source_platform || summary.source_platform || summary.platform || ''} ${sourceUrl || ''}`.toLowerCase();
  const explicitlyValidated = truthyFlag(summary, 'source_validated') || truthyFlag(summary, 'identity_validated');
  return isMenuSourceCandidateUrl(sourceUrl)
    && (explicitlyValidated || /anota|cardapioweb|yooga|goomer|menudino|site|pdf|official_website/.test(platform));
};

const scoreFromGates = (gates: RestaurantCompletenessState['gates']) => {
  let score = 0;
  if (gates.baseIdentity) score += 20;
  if (gates.instagramVerified) score += 15;
  if (gates.menuSourceValidated) score += 5;
  if (gates.menuStructured) score += 10;
  if (gates.semanticMenuQaDone) score += 15;
  if (gates.mediaMetadataDone) score += 10;
  if (gates.mediaVisualQualityVerified) score += 15;
  if (gates.structuralAuditDone) score += 10;
  return Math.min(100, score);
};

const nextStageFromGates = (
  gates: RestaurantCompletenessState['gates'],
  jobs: OperationJob[],
  restaurant: OperationRestaurant,
): StageFilter => {
  if (!gates.baseIdentity) return 'google_enrichment';
  const menuSearchProcessed = jobs.some(job => job.stage === 'menu_source_discovery'
    && ['done', 'blocked', 'rejected', 'cancelled'].includes(normalizedJobStatus(job)));
  if (!gates.menuSourceValidated) {
    if (!menuSearchProcessed) return 'menu_source_discovery';
    const outreachSummary = latestStageSummary(jobs, 'menu_outreach_whatsapp');
    const outreachStatus = String(outreachSummary.outreach_status || '').toLowerCase();
    if (outreachStatus === 'source_received') return 'menu_source_discovery';
    if (hasWhatsappContact(restaurant)
      && !['not_success', 'opted_out', 'cancelled'].includes(outreachStatus)) {
      return 'menu_outreach_whatsapp';
    }
    return 'completeness_scoring';
  }
  if (gates.menuSourceValidated && !gates.menuStructured) {
    const sourceJob = [...jobs]
      .filter(job => job.stage === 'menu_source_discovery' || String(job.stage || '').startsWith('menu_extraction_'))
      .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())[0];
    const source = `${sourceJob?.source_platform || ''} ${sourceJob?.source_url || ''}`.toLowerCase();
    if (source.includes('anota')) return 'menu_extraction_anotaai';
    if (source.includes('yooga')) return 'menu_extraction_yooga';
    if (/(cardapio.?web|goomer|menudino)/.test(source)) return 'menu_extraction_cardapioweb';
    return 'menu_extraction_site_pdf';
  }
  if (!gates.semanticMenuQaDone) return 'semantic_menu_qa';
  if (!gates.mediaMetadataDone) return 'media_collection';
  if (!gates.mediaVisualQualityVerified) return 'media_visual_qa';
  if (!gates.structuralAuditDone) return 'structural_audit';
  return 'publication_gate';
};

export function assessCompleteness(
  restaurant: OperationRestaurant,
  jobs: OperationJob[],
  readyPublish: ReadyPublishState,
): RestaurantCompletenessState {
  const assessmentSummary = latestSummaryWithAssessment(jobs);
  const semanticMenuQaDone = stageDone(jobs, 'semantic_menu_qa');
  const instagramAuditDone = stageDone(jobs, 'instagram_enrichment') || stageDone(jobs, 'channel_enrichment');
  const structuralAuditDone = stageDone(jobs, 'structural_audit');
  const mediaMetadataJobDone = stageDone(jobs, 'media_qa');
  const mediaVisualSummary = latestStageSummary(jobs, 'media_visual_qa');
  const hasStructuredRows = (restaurant.menu_category_count || 0) > 0 && (restaurant.menu_item_count || 0) > 0;
  const legacyStructuredFallback = restaurant.evidence_is_partial === true
    && restaurant.menu_status === 'found'
    && (semanticMenuQaDone || jobs.some(job => String(job.stage || '').startsWith('menu_extraction_')));
  const mediaMetadataDone = mediaMetadataJobDone
    && hasText(restaurant.image_url)
    && hasText(restaurant.cover_image_url)
    && (restaurant.gallery_count || 0) >= 3;

  const gates: RestaurantCompletenessState['gates'] = {
    baseIdentity: getBaseIdentity(restaurant),
    instagramVerified: hasInstagramRecord(restaurant) && instagramAuditDone,
    menuSourceValidated: menuSourceValidated(jobs),
    menuStructured: hasStructuredRows || legacyStructuredFallback,
    semanticMenuQaDone,
    mediaMetadataDone,
    mediaVisualQualityVerified: readyPublish.mediaVisualQualityVerified
      || truthyFlag(mediaVisualSummary, 'media_visual_quality_verified'),
    structuralAuditDone,
  };

  let derivedLevel: CompletenessLevel = 0;
  if (gates.baseIdentity) derivedLevel = 1;
  if (derivedLevel >= 1 && gates.instagramVerified) derivedLevel = 2;
  if (derivedLevel >= 1 && gates.menuSourceValidated) derivedLevel = Math.max(derivedLevel, 3) as CompletenessLevel;
  if (derivedLevel >= 3 && gates.menuStructured && gates.semanticMenuQaDone) derivedLevel = 4;
  if (derivedLevel >= 4 && gates.mediaMetadataDone && gates.mediaVisualQualityVerified) derivedLevel = 5;
  if (derivedLevel >= 5 && gates.structuralAuditDone) derivedLevel = 6;

  const explicitLevel = normalizeLevel(assessmentSummary?.completeness_level);
  const usesCurrentLevelModel = Number(assessmentSummary?.assessment_version || 0) >= 2
    && assessmentSummary?.level_model === 'n0_n6_capabilities_v1';
  const level = usesCurrentLevelModel && explicitLevel !== null ? explicitLevel : derivedLevel;
  const collectionJobs = jobs.filter(job => !PUBLICATION_STAGES.has(String(job.stage || '')));
  const activeJobs = collectionJobs.filter(job => ACTIVE_JOB_STATUSES.has(normalizedJobStatus(job)));
  const errorJobs = collectionJobs.filter(job => ERROR_JOB_STATUSES.has(normalizedJobStatus(job)));
  const rejectedJobs = jobs.filter(job => REJECTED_JOB_STATUSES.has(normalizedJobStatus(job)));
  const blockedJobs = jobs.filter(job => normalizedJobStatus(job) === 'blocked');
  const humanReviewJobs = blockedJobs.filter(job => HUMAN_REVIEW_STAGES.has(String(job.stage || '')));
  const acceptedGapJobs = blockedJobs.filter(job => ACCEPTED_GAP_STAGES.has(String(job.stage || '')));
  const terminalMenuStatus = NO_MENU_STATUSES.has(String(restaurant.menu_status || '').toLowerCase());
  const technicalGate = readyPublish.technicalGateOnly && !readyPublish.finalReady;
  const hasTerminalAssessment = jobs.some(job => (
    ['completeness_scoring', 'publication_gate'].includes(String(job.stage || ''))
    && !ACTIVE_JOB_STATUSES.has(normalizedJobStatus(job))
  ));
  const explicitDecision = explicitDecisionFromJobs(jobs);

  let decision: CityCompletionDecision;
  let decisionReason: string;
  if (explicitDecision === 'complete' && level < 6) {
    decision = 'pending';
    decisionReason = 'A aprovacao legada precisa ser recalculada no modelo N0-N6 antes de continuar valida.';
  } else if (explicitDecision) {
    decision = explicitDecision;
    decisionReason = 'Decisao registrada pelo pipeline de completude.';
  } else if (level === 6) {
    decision = 'complete';
    decisionReason = 'Todos os gates de completude passaram; publicacao ainda exige autorizacao explicita.';
  } else if (rejectedJobs.length > 0) {
    decision = 'source_rejected';
    decisionReason = 'O pipeline registrou rejeicao operacional explicita.';
  } else if (errorJobs.length > 0 || humanReviewJobs.length > 0) {
    decision = 'needs_human_review';
    decisionReason = errorJobs.length > 0
      ? 'Existe erro tecnico sem decisao terminal.'
      : 'A auditoria semantica ou estrutural exige decisao humana.';
  } else if (activeJobs.length > 0) {
    decision = 'pending';
    decisionReason = 'Ha job pendente ou em execucao.';
  } else if (level > 0 && terminalMenuStatus) {
    decision = 'not_found';
    decisionReason = 'A busca terminou sem cardapio publico confiavel; o cadastro basico foi preservado.';
  } else if (
    level > 0
    && (technicalGate || hasTerminalAssessment || acceptedGapJobs.length > 0)
  ) {
    decision = 'accepted_incomplete';
    decisionReason = technicalGate
      ? 'Perfil tecnicamente auditado no nivel atual; faltam dados para o nivel completo.'
      : acceptedGapJobs.length > 0
        ? 'A busca terminou sem dados confiaveis para enriquecer mais; o cadastro basico foi preservado.'
        : 'A avaliacao encerrou o perfil no melhor nivel comprovado.';
  } else {
    decision = 'pending';
    decisionReason = jobs.length === 0
      ? 'Restaurante ativo ainda nao entrou na fila operacional.'
      : 'Nao ha decisao terminal; o proximo job precisa ser criado.';
  }

  const missing: string[] = [];
  if (!gates.baseIdentity) missing.push('identidade/localizacao basica');
  if (!gates.instagramVerified) missing.push('Instagram verificado');
  if (!gates.menuSourceValidated) missing.push('fonte de cardapio validada');
  if (!gates.menuStructured) missing.push('cardapio estruturado');
  if (gates.menuStructured && !gates.semanticMenuQaDone) missing.push('semantic_menu_qa');
  if (!gates.mediaMetadataDone) missing.push('midia minima');
  if (!gates.mediaVisualQualityVerified) missing.push('QA visual real');
  if (!gates.structuralAuditDone) missing.push('auditoria estrutural');

  const blockersForFinal = missing.filter(item => (
    ['identidade/localizacao basica', 'fonte de cardapio validada', 'cardapio estruturado', 'semantic_menu_qa', 'midia minima', 'QA visual real', 'auditoria estrutural'].includes(item)
  ));
  const proposedTerminal = ['accepted_incomplete', 'complete', 'source_rejected', 'not_found', 'duplicate', 'inactive'].includes(decision);
  const decisionRecorded = jobs.some(job => String(job.id || '').startsWith('decision-'));
  const canFinishCity = decisionRecorded && proposedTerminal;

  return {
    level,
    levelLabel: LEVEL_LABELS[level],
    status: assessmentSummary?.completeness_status || `level_${level}`,
    confidenceScore: Number(assessmentSummary?.confidence_score ?? scoreFromGates(gates)),
    decision,
    decisionLabel: DECISION_LABELS[decision],
    decisionReason,
    canFinishCity,
    proposedTerminal,
    decisionRecorded,
    acceptedIncomplete: decision === 'accepted_incomplete',
    source: assessmentSummary ? 'job_assessment' : 'derived',
    gates,
    missing,
    blockersForFinal,
    nextStage: nextStageFromGates(gates, jobs, restaurant),
  };
}

export const completenessLevelLabel = (level: CompletenessLevel) => LEVEL_LABELS[level];

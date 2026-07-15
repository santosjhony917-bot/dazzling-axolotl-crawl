export const OPERATION_PIPELINE_STAGES = [
  'candidate_discovery',
  'entity_resolution',
  'restaurant_upsert',
  'google_phase1',
  'google_enrichment',
  'channel_enrichment',
  'instagram_discovery',
  'instagram_enrichment',
  'menu_source_discovery',
  'menu_outreach_whatsapp',
  'menu_extraction_anotaai',
  'menu_extraction_cardapioweb',
  'menu_extraction_yooga',
  'menu_extraction_site_pdf',
  'semantic_menu_qa',
  'media_collection',
  'media_qa',
  'media_visual_qa',
  'structural_audit',
  'completeness_scoring',
  'operational_decision',
  'publication_gate',
  'ready_publish',
] as const;

export type PipelineStage = typeof OPERATION_PIPELINE_STAGES[number];
export type StageFilter = PipelineStage | 'all' | 'no_job' | 'final_ready';
export type MacroPhaseKey = 'base' | 'google' | 'channels' | 'menu' | 'media' | 'quality' | 'publication';
export type ListFilter =
  | 'current_bottleneck'
  | 'city_pending'
  | 'accepted_incomplete'
  | 'human_review'
  | 'blocked'
  | 'no_job'
  | 'technical_gate'
  | 'without_source'
  | 'whatsapp_outreach'
  | 'whatsapp_waiting'
  | 'whatsapp_success'
  | 'whatsapp_not_success'
  | 'visual_qa_pending'
  | 'level_3'
  | 'capability_basic'
  | 'capability_instagram'
  | 'capability_source'
  | 'capability_menu'
  | 'capability_media'
  | 'capability_audit'
  | 'all';
export type JobHealth = 'pending' | 'running' | 'done' | 'blocked' | 'error' | 'rejected' | 'cancelled' | 'other';
export type OperationalRisk = 'critical' | 'high' | 'medium' | 'low' | 'none';
export type CompletenessLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type CityCompletionDecision =
  | 'pending'
  | 'accepted_incomplete'
  | 'complete'
  | 'source_rejected'
  | 'not_found'
  | 'needs_human_review'
  | 'duplicate'
  | 'inactive';

export type CityOperationRun = {
  id: string;
  run_key?: string | null;
  source_context?: string | null;
  city?: string | null;
  state?: string | null;
  status?: 'planned' | 'running' | 'closing' | 'completed' | 'cancelled' | 'failed' | string | null;
  census_strategy?: string | null;
  target_scope?: unknown;
  budget_profile?: unknown;
  metrics_snapshot?: unknown;
  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CityRunCandidate = {
  id: string;
  city_run_id?: string | null;
  provider?: string | null;
  raw_name?: string | null;
  normalized_name?: string | null;
  resolution_status?: string | null;
  canonical_restaurant_id?: string | null;
  identity_confidence?: number | null;
  resolution_reason?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type OperationRunLane = {
  id: string;
  city_run_id?: string | null;
  restaurant_id?: string | null;
  lane?: 'google' | 'channels' | 'menu' | 'media' | string | null;
  status?: string | null;
  is_terminal?: boolean | null;
  current_job_id?: string | null;
  attempts?: number | null;
  external_cost_cents?: number | null;
  elapsed_ms?: number | null;
  last_error?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type OperationRestaurant = {
  id: string;
  name?: string | null;
  category?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  whatsapp_url?: string | null;
  instagram?: string | null;
  social_networks?: unknown;
  google_maps_url?: string | null;
  google_place_id?: string | null;
  other_url?: string | null;
  external_url?: string | null;
  ifood_url?: string | null;
  image_url?: string | null;
  cover_image_url?: string | null;
  menu_status?: string | null;
  menu_status_reason?: string | null;
  ai_validated?: boolean | null;
  is_deleted?: boolean | null;
  is_published?: boolean | null;
  ai_log?: unknown;
  created_at?: string | null;
  menu_category_count?: number;
  menu_item_count?: number;
  gallery_count?: number;
  evidence_is_partial?: boolean;
};

export type OperationJob = {
  id: string;
  restaurant_id?: string | null;
  candidate_id?: string | null;
  city_run_id?: string | null;
  parent_job_id?: string | null;
  city?: string | null;
  state?: string | null;
  stage?: string | null;
  status?: string | null;
  source_context?: string | null;
  lane?: string | null;
  priority?: number | null;
  locked_by?: string | null;
  locked_until?: string | null;
  attempts?: number | null;
  max_attempts?: number | null;
  last_error?: string | null;
  payload?: unknown;
  result_summary?: unknown;
  budget_profile?: unknown;
  external_cost_cents?: number | null;
  elapsed_ms?: number | null;
  deadline_at?: string | null;
  source_url?: string | null;
  source_platform?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
};

export type OperationJobEvent = {
  id: string;
  job_id?: string | null;
  event_type?: string | null;
  worker_id?: string | null;
  stage?: string | null;
  status?: string | null;
  details?: unknown;
  created_at?: string | null;
};

export type MenuOutreachStatus =
  | 'draft'
  | 'approved'
  | 'waiting_reply'
  | 'source_received'
  | 'not_success'
  | 'opted_out'
  | 'cancelled';

export type MenuOutreachRequest = {
  id: string;
  city_run_id?: string | null;
  restaurant_id: string;
  restaurant_name?: string | null;
  operation_job_id?: string | null;
  source_context?: string | null;
  channel?: 'whatsapp' | string | null;
  contact_last4?: string | null;
  status: MenuOutreachStatus;
  outcome_reason?: string | null;
  message_template_version?: string | null;
  attempt_count?: number | null;
  max_attempts?: number | null;
  next_action_at?: string | null;
  last_sent_at?: string | null;
  responded_at?: string | null;
  closed_at?: string | null;
  response_kind?: string | null;
  response_source_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ReadyPublishState = {
  technicalGateOnly: boolean;
  finalReady: boolean;
  publishAllowed: boolean;
  mediaVisualQualityVerified: boolean;
  mediaVisualQualityNotVerified: boolean;
};

export type RestaurantCompletenessState = {
  level: CompletenessLevel;
  levelLabel: string;
  status: string;
  confidenceScore: number;
  decision: CityCompletionDecision;
  decisionLabel: string;
  decisionReason: string;
  canFinishCity: boolean;
  proposedTerminal: boolean;
  decisionRecorded: boolean;
  acceptedIncomplete: boolean;
  source: 'job_assessment' | 'derived';
  gates: {
    baseIdentity: boolean;
    instagramVerified: boolean;
    menuSourceValidated: boolean;
    menuStructured: boolean;
    semanticMenuQaDone: boolean;
    mediaMetadataDone: boolean;
    mediaVisualQualityVerified: boolean;
    structuralAuditDone: boolean;
  };
  missing: string[];
  blockersForFinal: string[];
  nextStage: StageFilter;
};

export type RestaurantOperationRow = {
  restaurant: OperationRestaurant;
  jobs: OperationJob[];
  events: OperationJobEvent[];
  currentJob: OperationJob | null;
  stage: StageFilter;
  status: JobHealth;
  blockReason: string;
  nextAction: string;
  shortEvidence: string;
  jobAgeLabel: string;
  risk: OperationalRisk;
  canPublish: boolean;
  hasMenuSource: boolean;
  menuOutreach: MenuOutreachRequest | null;
  readyPublish: ReadyPublishState;
  completeness: RestaurantCompletenessState;
};

export type OperationScoreboardData = {
  activeRestaurants: number;
  jobsProcessed: number;
  restaurantsWithJobs: number;
  restaurantsWithoutJobs: number;
  jobsPending: number;
  jobsDone: number;
  jobsBlocked: number;
  jobsError: number;
  jobsRejected: number;
  activeLocks: number;
  activeWorkers: number;
  cityProcessed: number;
  cityRemaining: number;
  cityCompletionRate: number;
  proposedTerminal: number;
  acceptedIncomplete: number;
  sourceRejected: number;
  notFound: number;
  duplicate: number;
  inactive: number;
  needsHumanReview: number;
  rejectedRestaurants: number;
  level0: number;
  level1: number;
  level2: number;
  level3: number;
  level4: number;
  level5: number;
  level6: number;
  readyPublishTechnical: number;
  readyPublishFinal: number;
  mediaVisualQualityNotVerified: number;
  published: number;
  candidatesDiscovered: number;
  candidatesUnresolved: number;
  totalAttempts: number;
  totalExternalCostCents: number;
  throughputPerMinute: number;
};

export type StageSummary = {
  key: StageFilter;
  label: string;
  count: number;
  pending: number;
  done: number;
  blocked: number;
  error: number;
  rejected: number;
};

export type BlockReasonSummary = {
  reason: string;
  count: number;
  stage: StageFilter;
  action: string;
};

export type MacroPhaseSummary = {
  key: MacroPhaseKey;
  label: string;
  stages: StageSummary[];
  pending: number;
  blocked: number;
  rejected: number;
  done: number;
  total: number;
  mainBottleneck: StageSummary | null;
};

export type CurrentBottleneck = {
  stage: StageFilter;
  label: string;
  count: number;
  pendingBlocked: number;
  activeLocks: number;
  activeWorkers: number;
  mainReason: string;
  impact: string;
  recommendedAction: string;
  commandSuggestion: string;
  workerPrompt: string;
};

export type CodexActionRecommendation = {
  title: string;
  priority: number;
  risk: OperationalRisk;
  requiresHumanApproval: boolean;
  impact: string;
  commandSuggestion: string;
  promptSuggestion: string;
  filter: ListFilter;
  stage: StageFilter;
};

export type CityOperationState = {
  city: { id: string; name: string; state: string; slug: string } | null;
  loading: boolean;
  error: string | null;
  operationAccessError: string | null;
  menuOutreachAccessError: string | null;
  evidenceAccessWarning: string | null;
  restaurants: OperationRestaurant[];
  cityRuns: CityOperationRun[];
  currentRun: CityOperationRun | null;
  candidates: CityRunCandidate[];
  lanes: OperationRunLane[];
  jobs: OperationJob[];
  events: OperationJobEvent[];
  menuOutreachRequests: MenuOutreachRequest[];
  rows: RestaurantOperationRow[];
  scoreboard: OperationScoreboardData;
  stageSummaries: StageSummary[];
  macroPhases: MacroPhaseSummary[];
  currentBottleneck: CurrentBottleneck;
  blockReasons: BlockReasonSummary[];
  codexActions: CodexActionRecommendation[];
  refresh: () => Promise<void>;
};

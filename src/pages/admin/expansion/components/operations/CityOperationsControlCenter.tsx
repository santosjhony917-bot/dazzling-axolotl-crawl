import { useMemo, useRef, useState } from 'react';
import { AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CityRunOverview } from './CityRunOverview';
import { LaneStatusBoard } from './LaneStatusBoard';
import { OperationBottleneckList } from './OperationBottleneckList';
import { RestaurantOperationDrawer } from './RestaurantOperationDrawer';
import { WhatsAppOutreachPanel } from './WhatsAppOutreachPanel';
import { BlockReasonSummary, CityOperationState, ListFilter, RestaurantOperationRow, StageFilter } from './types';
import { hasInstagramRecord, hasWhatsappContact } from './completeness';

const matchesStage = (row: RestaurantOperationRow, stage: StageFilter) => {
  if (stage === 'all') return true;
  if (stage === 'final_ready') return row.readyPublish.finalReady;
  if (stage === 'ready_publish') return row.stage === 'ready_publish' && !row.readyPublish.finalReady;
  return row.stage === stage;
};

const matchesListFilter = (row: RestaurantOperationRow, filter: ListFilter, currentStage: StageFilter) => {
  if (filter === 'current_bottleneck') return matchesStage(row, currentStage) && !row.completeness.canFinishCity;
  if (filter === 'city_pending') return !row.completeness.canFinishCity;
  if (filter === 'accepted_incomplete') return row.completeness.canFinishCity && row.completeness.decision === 'accepted_incomplete';
  if (filter === 'human_review' || filter === 'blocked') return row.completeness.decision === 'needs_human_review';
  if (filter === 'no_job') return row.stage === 'no_job' && !row.completeness.canFinishCity;
  if (filter === 'technical_gate') return row.readyPublish.technicalGateOnly && !row.readyPublish.finalReady;
  if (filter === 'without_source') return !row.hasMenuSource && !row.completeness.canFinishCity;
  if (filter === 'whatsapp_outreach') return (
    hasWhatsappContact(row.restaurant)
    && !row.completeness.gates.menuStructured
    && !row.completeness.gates.menuSourceValidated
    && (!row.menuOutreach || ['draft', 'approved'].includes(row.menuOutreach.status))
  );
  if (filter === 'whatsapp_waiting') return row.menuOutreach?.status === 'waiting_reply';
  if (filter === 'whatsapp_success') return row.menuOutreach?.status === 'source_received';
  if (filter === 'whatsapp_not_success') return ['not_success', 'opted_out', 'cancelled'].includes(row.menuOutreach?.status || '');
  if (filter === 'visual_qa_pending') return row.completeness.level === 4 && !row.completeness.gates.mediaVisualQualityVerified;
  if (filter === 'level_3') return row.completeness.level === 3;
  if (filter === 'capability_basic') return row.completeness.gates.baseIdentity;
  if (filter === 'capability_instagram') return hasInstagramRecord(row.restaurant);
  if (filter === 'capability_source') return row.hasMenuSource || row.completeness.gates.menuSourceValidated;
  if (filter === 'capability_menu') return (row.restaurant.menu_category_count || 0) > 0 && (row.restaurant.menu_item_count || 0) > 0;
  if (filter === 'capability_media') return Boolean(row.restaurant.image_url && row.restaurant.cover_image_url && (row.restaurant.gallery_count || 0) >= 3);
  if (filter === 'capability_audit') return row.jobs.some(job => job.stage === 'structural_audit' && ['done', 'completed', 'succeeded', 'success'].includes(String(job.status || '').toLowerCase()));
  return true;
};

const buildBlockReasons = (rows: RestaurantOperationRow[]): BlockReasonSummary[] => {
  const map = new Map<string, { count: number; stage: StageFilter; action: string }>();
  rows
    .filter(row => row.completeness.decision === 'needs_human_review')
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
};

const decisionWeight = (row: RestaurantOperationRow) => {
  if (row.completeness.decision === 'needs_human_review') return 5;
  if (row.completeness.decision === 'pending') return 4;
  if (row.completeness.decision === 'accepted_incomplete') return 2;
  return 1;
};

export default function CityOperationsControlCenter({ state }: { state: CityOperationState }) {
  const [selectedStage, setSelectedStage] = useState<StageFilter>('all');
  const [activeFilter, setActiveFilter] = useState<ListFilter>('city_pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filterCounts = useMemo<Record<ListFilter, number>>(() => ({
    current_bottleneck: state.rows.filter(row => matchesListFilter(row, 'current_bottleneck', state.currentBottleneck.stage)).length,
    city_pending: state.rows.filter(row => matchesListFilter(row, 'city_pending', state.currentBottleneck.stage)).length,
    accepted_incomplete: state.rows.filter(row => matchesListFilter(row, 'accepted_incomplete', state.currentBottleneck.stage)).length,
    human_review: state.rows.filter(row => matchesListFilter(row, 'human_review', state.currentBottleneck.stage)).length,
    blocked: state.rows.filter(row => matchesListFilter(row, 'blocked', state.currentBottleneck.stage)).length,
    no_job: state.rows.filter(row => matchesListFilter(row, 'no_job', state.currentBottleneck.stage)).length,
    technical_gate: state.rows.filter(row => matchesListFilter(row, 'technical_gate', state.currentBottleneck.stage)).length,
    without_source: state.rows.filter(row => matchesListFilter(row, 'without_source', state.currentBottleneck.stage)).length,
    whatsapp_outreach: state.rows.filter(row => matchesListFilter(row, 'whatsapp_outreach', state.currentBottleneck.stage)).length,
    whatsapp_waiting: state.rows.filter(row => matchesListFilter(row, 'whatsapp_waiting', state.currentBottleneck.stage)).length,
    whatsapp_success: state.rows.filter(row => matchesListFilter(row, 'whatsapp_success', state.currentBottleneck.stage)).length,
    whatsapp_not_success: state.rows.filter(row => matchesListFilter(row, 'whatsapp_not_success', state.currentBottleneck.stage)).length,
    visual_qa_pending: state.rows.filter(row => matchesListFilter(row, 'visual_qa_pending', state.currentBottleneck.stage)).length,
    level_3: state.rows.filter(row => matchesListFilter(row, 'level_3', state.currentBottleneck.stage)).length,
    capability_basic: state.rows.filter(row => matchesListFilter(row, 'capability_basic', state.currentBottleneck.stage)).length,
    capability_instagram: state.rows.filter(row => matchesListFilter(row, 'capability_instagram', state.currentBottleneck.stage)).length,
    capability_source: state.rows.filter(row => matchesListFilter(row, 'capability_source', state.currentBottleneck.stage)).length,
    capability_menu: state.rows.filter(row => matchesListFilter(row, 'capability_menu', state.currentBottleneck.stage)).length,
    capability_media: state.rows.filter(row => matchesListFilter(row, 'capability_media', state.currentBottleneck.stage)).length,
    capability_audit: state.rows.filter(row => matchesListFilter(row, 'capability_audit', state.currentBottleneck.stage)).length,
    all: state.rows.length,
  }), [state.currentBottleneck.stage, state.rows]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const rows = [...state.rows]
      .sort((a, b) => decisionWeight(b) - decisionWeight(a))
      .filter(row => matchesListFilter(row, activeFilter, state.currentBottleneck.stage))
      .filter(row => matchesStage(row, selectedStage));
    if (!normalizedSearch) return rows;
    return rows.filter(row => [
      row.restaurant.name,
      row.restaurant.category,
      row.restaurant.address,
      row.stage,
      row.completeness.decision,
      row.blockReason,
      row.nextAction,
    ].filter(Boolean).join(' ').toLowerCase().includes(normalizedSearch));
  }, [activeFilter, searchTerm, selectedStage, state.currentBottleneck.stage, state.rows]);

  const selectedRow = useMemo(() => (
    state.rows.find(row => row.restaurant.id === selectedRowId) || filteredRows[0] || null
  ), [filteredRows, selectedRowId, state.rows]);

  const handleSelectStage = (stage: StageFilter) => {
    setSelectedStage(stage);
    setActiveFilter('all');
    setSelectedRowId(null);
  };

  const handleCapabilityFilter = (filter: ListFilter) => {
    setActiveFilter(filter);
    setSelectedStage('all');
    setSelectedRowId(null);
    window.requestAnimationFrame(() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  if (state.loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-slate-200 bg-white">
        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        <span className="ml-3 text-sm font-bold text-slate-600">Carregando operacao da cidade...</span>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" />
          <div>
            <h2 className="text-base font-black text-rose-950">Nao foi possivel carregar a cidade</h2>
            <p className="mt-1 text-sm font-semibold text-rose-800">{state.error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CityRunOverview state={state} activeFilter={activeFilter} onFilterChange={handleCapabilityFilter} />

      {state.operationAccessError && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div>
            <p className="text-xs font-black uppercase text-amber-900">Leitura operacional parcial</p>
            <p className="mt-0.5 text-xs font-semibold text-amber-800">{state.operationAccessError}</p>
          </div>
        </div>
      )}

      <WhatsAppOutreachPanel state={state} onFilterChange={handleCapabilityFilter} />

      {state.currentRun && <LaneStatusBoard state={state} onSelectStage={handleSelectStage} />}

      <div ref={listRef}>
        <OperationBottleneckList
          rows={filteredRows}
          blockReasons={buildBlockReasons(filteredRows)}
          selectedStage={selectedStage}
          activeFilter={activeFilter}
          filterCounts={filterCounts}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onFilterChange={(filter) => {
            setActiveFilter(filter);
            setSelectedStage(filter === 'current_bottleneck' ? state.currentBottleneck.stage : 'all');
            setSelectedRowId(null);
          }}
          onSelectRestaurant={(row) => setSelectedRowId(row.restaurant.id)}
        />
      </div>

      <Sheet open={Boolean(selectedRowId)} onOpenChange={(open) => !open && setSelectedRowId(null)}>
        <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-xl">
          <SheetHeader className="sr-only"><SheetTitle>Dossie operacional</SheetTitle></SheetHeader>
          <RestaurantOperationDrawer row={selectedRow} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

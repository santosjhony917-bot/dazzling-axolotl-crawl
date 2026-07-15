import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Database,
  RefreshCw,
  UsersRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CityOperationState, ListFilter } from './types';
import { hasInstagramRecord } from './completeness';

const runStatusLabel = (status?: string | null) => {
  if (status === 'running') return 'Em execucao';
  if (status === 'closing') return 'Fechando';
  if (status === 'completed') return 'Concluido';
  if (status === 'planned') return 'Planejado';
  if (status === 'failed') return 'Falhou';
  if (status === 'cancelled') return 'Cancelado';
  return 'Nao iniciado';
};

const runStatusTone = (status?: string | null) => {
  if (status === 'completed') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (status === 'running' || status === 'closing') return 'border-blue-200 bg-blue-50 text-blue-800';
  if (status === 'failed') return 'border-rose-200 bg-rose-50 text-rose-800';
  return 'border-slate-200 bg-slate-100 text-slate-700';
};

const formatMoney = (cents: number) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
}).format(cents / 100);

export function CityRunOverview({
  state,
  activeFilter,
  onFilterChange,
}: {
  state: CityOperationState;
  activeFilter: ListFilter;
  onFilterChange: (filter: ListFilter) => void;
}) {
  const { scoreboard, currentRun } = state;
  const operationAuditUnavailable = Boolean(state.operationAccessError);
  const platformMenuLinks = state.rows.filter(row => {
    const url = `${row.restaurant.other_url || ''} ${row.restaurant.external_url || ''}`.toLowerCase();
    return /(anota\.ai|cardapioweb|goomer|yooga|menudino)/.test(url);
  }).length;
  const hasDoneStage = (row: CityOperationState['rows'][number], stage: string) => row.jobs.some(job => (
    job.stage === stage && ['done', 'completed', 'succeeded', 'success'].includes(String(job.status || '').toLowerCase())
  ));
  const capabilities = [
    {
      level: 'N1', label: 'Basico / Google', found: state.rows.filter(row => row.completeness.gates.baseIdentity).length,
      foundLabel: 'bases cadastradas', verified: state.rows.filter(row => row.completeness.gates.baseIdentity).length,
      verifiedLabel: 'com identidade utilizavel', filter: 'capability_basic' as ListFilter, requiresAudit: false,
    },
    {
      level: 'N2', label: 'Instagram verificado', found: state.rows.filter(row => hasInstagramRecord(row.restaurant)).length,
      foundLabel: 'perfis cadastrados para verificar', verified: state.rows.filter(row => row.completeness.gates.instagramVerified).length,
      verifiedLabel: 'verificados (N2)', filter: 'capability_instagram' as ListFilter, requiresAudit: true,
    },
    {
      level: 'N3', label: 'Fonte validada', found: state.rows.filter(row => row.hasMenuSource).length,
      foundLabel: `sites/PDFs para investigar; ${platformMenuLinks} apontam para plataformas`, verified: state.rows.filter(row => row.completeness.gates.menuSourceValidated).length,
      verifiedLabel: 'fontes validadas (N3)', filter: 'capability_source' as ListFilter, requiresAudit: true,
    },
    {
      level: 'N4', label: 'Cardapio coletado', found: state.rows.filter(row => (row.restaurant.menu_category_count || 0) > 0 && (row.restaurant.menu_item_count || 0) > 0).length,
      foundLabel: 'cardapios no banco, incluindo legado', verified: state.rows.filter(row => row.completeness.gates.menuStructured && row.completeness.gates.semanticMenuQaDone).length,
      verifiedLabel: 'aprovados no QA (N4)', filter: 'capability_menu' as ListFilter, requiresAudit: true,
    },
    {
      level: 'N5', label: 'Midia visual', found: state.rows.filter(row => Boolean(row.restaurant.image_url && row.restaurant.cover_image_url && (row.restaurant.gallery_count || 0) >= 3)).length,
      foundLabel: 'com midia minima por metadados', verified: state.rows.filter(row => row.completeness.gates.mediaMetadataDone && row.completeness.gates.mediaVisualQualityVerified).length,
      verifiedLabel: 'aprovados visualmente (N5)', filter: 'capability_media' as ListFilter, requiresAudit: true,
    },
    {
      level: 'N6', label: 'Auditoria final', found: state.rows.filter(row => hasDoneStage(row, 'structural_audit')).length,
      foundLabel: 'auditorias executadas', verified: state.rows.filter(row => row.completeness.level === 6).length,
      verifiedLabel: 'com todos os gates (N6)', filter: 'capability_audit' as ListFilter, requiresAudit: true,
    },
  ];
  const metrics = [
    { label: currentRun ? 'Ativos reconciliados' : 'Base ativa legada', value: scoreboard.activeRestaurants, helper: currentRun ? 'denominador oficial' : 'aguardando reconciliacao', Icon: Database, tone: 'text-slate-900' },
    { label: currentRun ? 'Decisoes terminais' : 'Decisoes registradas', value: scoreboard.cityProcessed, helper: currentRun ? `${scoreboard.cityCompletionRate}% encerrados` : `${scoreboard.proposedTerminal} propostas aguardando registro`, Icon: CheckCircle2, tone: 'text-emerald-700' },
    { label: 'Para decidir', value: scoreboard.cityRemaining, helper: 'sem decisao terminal', Icon: Clock3, tone: 'text-blue-700' },
    { label: 'Revisao humana', value: scoreboard.needsHumanReview, helper: 'ambiguidade real', Icon: UsersRound, tone: 'text-rose-700' },
  ];
  const outcomes = [
    ['accepted_incomplete', scoreboard.acceptedIncomplete, 'bg-amber-50 text-amber-900'],
    ['not_found', scoreboard.notFound, 'bg-slate-100 text-slate-700'],
    ['source_rejected', scoreboard.sourceRejected, 'bg-slate-100 text-slate-700'],
    ['duplicate', scoreboard.duplicate, 'bg-slate-100 text-slate-700'],
    ['inactive', scoreboard.inactive, 'bg-slate-100 text-slate-700'],
  ] as const;

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-md border px-2 py-1 text-[11px] font-black uppercase ${runStatusTone(currentRun?.status)}`}>
              {runStatusLabel(currentRun?.status)}
            </span>
            <span className="text-xs font-bold text-slate-500">City Run / Censo</span>
            {currentRun?.source_context && (
              <span className="max-w-full truncate rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-600">
                {currentRun.source_context}
              </span>
            )}
          </div>
          <h1 className="mt-2 text-xl font-black text-slate-950">
            {state.city ? `${state.city.name}/${state.city.state}` : 'Operacao da cidade'}
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-600">
            A cidade termina quando todos os ativos reconciliados possuem decisao terminal. Completude e publicacao continuam separadas.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={state.refresh} className="h-9 rounded-md text-xs font-black">
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {!currentRun && (
        <div className="flex items-start gap-3 border-b border-blue-200 bg-blue-50 px-4 py-3 text-blue-950">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="text-sm font-black">Passo atual: reconciliar os {scoreboard.activeRestaurants} registros legados</p>
            <p className="mt-0.5 text-xs font-semibold text-blue-800">
              O dry-run classifica nivel, decisao proposta e proximo job. Nenhuma lane deve ser interpretada antes de o City Run existir.
            </p>
          </div>
        </div>
      )}

      <div className="border-b border-slate-200 bg-slate-50/70">
        <div className="flex items-center justify-between gap-3 px-4 pt-3">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-500">Cobertura por capacidade</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-600">Clique em uma capacidade para filtrar os restaurantes. Encontrado nao significa auditado.</p>
          </div>
        </div>
        <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {capabilities.map(capability => (
            <button
              key={capability.level}
              type="button"
              onClick={() => onFilterChange(capability.filter)}
              aria-pressed={activeFilter === capability.filter}
              className={`min-h-[112px] border-t border-r px-3 py-3 text-left transition-colors last:border-r-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 ${activeFilter === capability.filter ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white hover:bg-slate-100'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-black ${activeFilter === capability.filter ? 'bg-white text-slate-950' : 'bg-slate-900 text-white'}`}>{capability.level}</span>
                <span className={`text-lg font-black tabular-nums ${activeFilter === capability.filter ? 'text-white' : 'text-slate-950'}`}>
                  {operationAuditUnavailable && capability.requiresAudit ? '--' : capability.verified}
                </span>
              </div>
              <p className={`mt-2 text-xs font-black ${activeFilter === capability.filter ? 'text-white' : 'text-slate-900'}`}>{capability.label}</p>
              <p className={`mt-0.5 text-[10px] font-semibold ${activeFilter === capability.filter ? 'text-slate-300' : 'text-slate-500'}`}>{capability.found} {capability.foundLabel}</p>
              <p className={`mt-1 text-[10px] font-black ${operationAuditUnavailable && capability.requiresAudit ? 'text-amber-600' : activeFilter === capability.filter ? 'text-emerald-300' : 'text-emerald-700'}`}>
                {operationAuditUnavailable && capability.requiresAudit ? 'Auditoria protegida indisponivel' : `${capability.verified} ${capability.verifiedLabel}`}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid border-b border-slate-200 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, helper, Icon, tone }) => (
          <div key={label} className="min-h-[92px] border-b border-r border-slate-200 p-3 xl:border-b-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-black uppercase text-slate-500">{label}</p>
              <Icon className={`h-4 w-4 ${tone}`} />
            </div>
            <p className={`mt-2 text-2xl font-black tabular-nums ${tone}`}>{value}</p>
            <p className="mt-1 text-[11px] font-semibold text-slate-500">{helper}</p>
          </div>
        ))}
      </div>

      <div className={`grid gap-4 p-4 ${currentRun ? 'lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center' : ''}`}>
        <div>
          <div className="flex items-center justify-between gap-3 text-xs font-black text-slate-700">
            <span>{currentRun ? 'Conclusao oficial do City Run' : 'Previa de conclusao sobre a base legada'}</span>
            <span className="tabular-nums">{scoreboard.cityProcessed}/{scoreboard.activeRestaurants}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={scoreboard.cityCompletionRate}>
            <div className="h-full bg-emerald-500" style={{ width: `${scoreboard.cityCompletionRate}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black">
            {outcomes.filter(([, value]) => value > 0).map(([label, value, tone]) => (
              <span key={label} className={`rounded-md px-2 py-1 ${tone}`}>{value} {label}</span>
            ))}
            {!currentRun && scoreboard.proposedTerminal > 0 && (
              <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-800">{scoreboard.proposedTerminal} propostas nao registradas</span>
            )}
            {operationAuditUnavailable ? (
              <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-900">Niveis auditados aguardam a leitura segura da migration 0066</span>
            ) : (
              <>
                <span className="rounded-md bg-violet-50 px-2 py-1 text-violet-800">{scoreboard.level4} em N4</span>
                <span className="rounded-md bg-fuchsia-50 px-2 py-1 text-fuchsia-800">{scoreboard.level5} em N5</span>
                <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-800">{scoreboard.level6} em N6</span>
              </>
            )}
            <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-800">{scoreboard.published} publicados</span>
          </div>
        </div>

        {currentRun && (
        <div className="grid grid-cols-3 divide-x divide-slate-200 rounded-md border border-slate-200 bg-slate-50 text-center">
          <div className="min-w-[92px] px-3 py-2">
            <p className="text-[10px] font-black uppercase text-slate-500">Throughput</p>
            <p className="mt-1 text-sm font-black tabular-nums text-slate-900">{scoreboard.throughputPerMinute}/min</p>
          </div>
          <div className="min-w-[92px] px-3 py-2">
            <p className="text-[10px] font-black uppercase text-slate-500">Tentativas</p>
            <p className="mt-1 text-sm font-black tabular-nums text-slate-900">{scoreboard.totalAttempts}</p>
          </div>
          <div className="min-w-[108px] px-3 py-2">
            <p className="flex items-center justify-center gap-1 text-[10px] font-black uppercase text-slate-500"><CircleDollarSign className="h-3 w-3" /> Custo</p>
            <p className="mt-1 text-sm font-black tabular-nums text-slate-900">{formatMoney(scoreboard.totalExternalCostCents)}</p>
          </div>
        </div>
        )}
      </div>
    </section>
  );
}

import { AlertCircle, Check, Eye, Minus, Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BlockReasonSummary, ListFilter, RestaurantOperationRow, StageFilter } from './types';
import { stageLabel } from './useCityOperationState';

type Props = {
  rows: RestaurantOperationRow[];
  blockReasons: BlockReasonSummary[];
  selectedStage: StageFilter;
  activeFilter: ListFilter;
  filterCounts: Record<ListFilter, number>;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onFilterChange: (filter: ListFilter) => void;
  onSelectRestaurant: (row: RestaurantOperationRow) => void;
};

const FILTERS: { key: ListFilter; label: string }[] = [
  { key: 'city_pending', label: 'Para decidir' },
  { key: 'no_job', label: 'Nao reconciliados' },
  { key: 'human_review', label: 'Revisao humana' },
  { key: 'accepted_incomplete', label: 'Encerrados incompletos' },
  { key: 'level_3', label: 'Fonte validada (N3)' },
  { key: 'visual_qa_pending', label: 'Aguardando midia (N5)' },
  { key: 'all', label: 'Todos' },
];

const CAPABILITY_FILTER_LABELS: Partial<Record<ListFilter, string>> = {
  capability_basic: 'N1 - Basico / Google',
  capability_instagram: 'N2 - Instagram cadastrado',
  capability_source: 'N3 - Sites/fontes candidatos',
  capability_menu: 'N4 - Cardapio no banco',
  capability_media: 'N5 - Midia minima',
  capability_audit: 'N6 - Auditoria executada',
  whatsapp_outreach: 'WhatsApp - disponivel/a enviar',
  whatsapp_waiting: 'WhatsApp - aguardando resposta',
  whatsapp_success: 'WhatsApp - fonte recebida',
  whatsapp_not_success: 'WhatsApp - nao sucesso',
};

const outreachLabel = (status?: string | null) => {
  if (status === 'waiting_reply') return 'aguardando resposta';
  if (status === 'source_received') return 'fonte recebida';
  if (['not_success', 'opted_out', 'cancelled'].includes(status || '')) return 'nao sucesso';
  if (['draft', 'approved'].includes(status || '')) return 'a enviar';
  return null;
};

const decisionClassName = (decision: string) => {
  if (decision === 'complete') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (decision === 'accepted_incomplete' || decision === 'not_found') return 'border-amber-200 bg-amber-50 text-amber-900';
  if (['source_rejected', 'duplicate', 'inactive'].includes(decision)) return 'border-slate-300 bg-slate-100 text-slate-800';
  if (decision === 'needs_human_review') return 'border-rose-200 bg-rose-50 text-rose-800';
  return 'border-blue-200 bg-blue-50 text-blue-800';
};

const levelClassName = (level: number) => {
  if (level === 6) return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (level === 5) return 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800';
  if (level === 4) return 'border-violet-200 bg-violet-50 text-violet-800';
  if (level === 3) return 'border-amber-200 bg-amber-50 text-amber-900';
  if (level === 2) return 'border-sky-200 bg-sky-50 text-sky-800';
  if (level === 1) return 'border-slate-200 bg-slate-100 text-slate-800';
  return 'border-slate-200 bg-white text-slate-500';
};

export function OperationBottleneckList({
  rows,
  blockReasons,
  selectedStage,
  activeFilter,
  filterCounts,
  searchTerm,
  onSearchTermChange,
  onFilterChange,
  onSelectRestaurant,
}: Props) {
  const visibleRows = rows.slice(0, activeFilter === 'all' ? 80 : 20);
  const activeCapabilityLabel = CAPABILITY_FILTER_LABELS[activeFilter];

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-500">Restaurantes que exigem acao</p>
            <h2 className="text-base font-black text-slate-950">
              {selectedStage === 'all' ? 'Fila de decisao da cidade' : stageLabel(selectedStage)}
            </h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">{rows.length} no filtro; exibindo {visibleRows.length}.</p>
          </div>
          <div className="relative w-full xl:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input value={searchTerm} onChange={(event) => onSearchTermChange(event.target.value)} placeholder="Buscar restaurante ou motivo" className="h-9 bg-white pl-9" />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {activeCapabilityLabel && (
            <button
              type="button"
              onClick={() => onFilterChange('all')}
              className="inline-flex items-center gap-1.5 rounded-md border border-blue-700 bg-blue-50 px-2.5 py-1.5 text-xs font-black text-blue-900"
            >
              {activeCapabilityLabel}
              <X className="h-3.5 w-3.5" aria-label="Limpar filtro de capacidade" />
            </button>
          )}
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => onFilterChange(filter.key)}
              className={`rounded-md border px-2.5 py-1.5 text-xs font-black transition ${
                activeFilter === filter.key
                  ? 'border-slate-950 bg-slate-950 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              {filter.label}
              <span className={`ml-1.5 rounded px-1.5 py-0.5 tabular-nums ${activeFilter === filter.key ? 'bg-white/15' : 'bg-slate-100 text-slate-600'}`}>
                {filterCounts[filter.key] || 0}
              </span>
            </button>
          ))}
        </div>

        {blockReasons.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {blockReasons.slice(0, 4).map((item) => (
              <span key={`${item.stage}-${item.reason}`} className="rounded-md border border-rose-100 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-800">
                {item.count}x {item.reason}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="divide-y divide-slate-100">
        {visibleRows.length === 0 ? (
          <div className="py-12 text-center">
            <AlertCircle className="mx-auto h-7 w-7 text-slate-300" />
            <p className="mt-2 text-sm font-bold text-slate-700">Nenhum restaurante neste filtro.</p>
          </div>
        ) : visibleRows.map((row) => {
          const capabilities = [
            ['Google', row.completeness.gates.baseIdentity],
            ['Instagram', row.completeness.gates.instagramVerified],
            ['Fonte', row.completeness.gates.menuSourceValidated],
            ['Cardapio', row.completeness.gates.menuStructured && row.completeness.gates.semanticMenuQaDone],
            ['Midia', row.completeness.gates.mediaMetadataDone && row.completeness.gates.mediaVisualQualityVerified],
            ['Auditoria', row.completeness.gates.structuralAuditDone && row.completeness.level === 6],
          ] as const;
          return (
          <div key={row.restaurant.id} className="grid gap-3 px-4 py-3 xl:grid-cols-[minmax(180px,0.9fr)_minmax(280px,1.4fr)_170px_minmax(210px,1.1fr)_minmax(160px,0.8fr)_86px] xl:items-center">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-950">{row.restaurant.name || 'Restaurante sem nome'}</p>
              <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">{row.restaurant.category || row.restaurant.address || 'Sem categoria/endereco'}</p>
              <Badge variant="outline" className={`${levelClassName(row.completeness.level)} mt-1.5 max-w-full font-black`}>
                N{row.completeness.level} - {row.completeness.levelLabel}
              </Badge>
              {outreachLabel(row.menuOutreach?.status) && (
                <p className="mt-1 text-[10px] font-bold text-emerald-700">
                  WhatsApp: {outreachLabel(row.menuOutreach?.status)}
                </p>
              )}
            </div>

            <div>
              <p className="text-[9px] font-black uppercase text-slate-400">Capacidades comprovadas</p>
              <div className="mt-1.5 grid grid-cols-3 gap-1">
                {capabilities.map(([label, ok]) => (
                  <span key={label} className={`inline-flex min-w-0 items-center gap-1 rounded border px-1.5 py-1 text-[10px] font-bold ${ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
                    {ok ? <Check className="h-3 w-3 shrink-0" /> : <Minus className="h-3 w-3 shrink-0" />}
                    <span className="truncate">{label}</span>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[9px] font-black uppercase text-slate-400">{row.completeness.decisionRecorded ? 'Decisao da cidade' : 'Proposta nao registrada'}</p>
              <Badge variant="outline" className={`${decisionClassName(row.completeness.decision)} mt-1 font-black`}>
                {row.completeness.decisionRecorded ? row.completeness.decisionLabel : `Proposta: ${row.completeness.decisionLabel}`}
              </Badge>
            </div>

            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase text-slate-400">Proximo passo obrigatorio</p>
              <p className="mt-1 truncate text-xs font-black text-slate-800">{stageLabel(row.completeness.nextStage)}</p>
              <p className="mt-0.5 truncate text-[11px] text-slate-500" title={row.nextAction}>{row.nextAction}</p>
            </div>

            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase text-slate-400">Lacunas</p>
              <p className="mt-1 line-clamp-2 text-[11px] font-semibold text-slate-600">
                {row.completeness.missing.length > 0 ? row.completeness.missing.join(', ') : 'Nenhuma lacuna de completude'}
              </p>
            </div>

            <Button type="button" variant="outline" size="sm" onClick={() => onSelectRestaurant(row)} className="h-8 rounded-md text-xs font-bold">
              <Eye className="mr-1.5 h-3.5 w-3.5" /> Dossie
            </Button>
          </div>
          );
        })}
      </div>
    </section>
  );
}

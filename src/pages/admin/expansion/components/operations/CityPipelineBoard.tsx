import { AlertCircle, Ban, CheckCircle2, Circle, Clock } from 'lucide-react';
import { MacroPhaseSummary, StageFilter, StageSummary } from './types';

type Props = {
  macroPhases: MacroPhaseSummary[];
  selectedStage: StageFilter;
  onSelectStage: (stage: StageFilter) => void;
};

const stageTone = (summary: StageSummary, active: boolean) => {
  if (active) return 'border-indigo-400 bg-indigo-50 text-indigo-950 ring-2 ring-indigo-100';
  if (summary.error > 0 || summary.blocked > 0) return 'border-rose-200 bg-rose-50 text-rose-950 hover:border-rose-300';
  if (summary.pending > 0) return 'border-blue-200 bg-blue-50 text-blue-950 hover:border-blue-300';
  if (summary.done > 0) return 'border-emerald-200 bg-emerald-50 text-emerald-950 hover:border-emerald-300';
  if (summary.rejected > 0) return 'border-slate-300 bg-slate-100 text-slate-800 hover:border-slate-400';
  return 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300';
};

export function CityPipelineBoard({ macroPhases, selectedStage, onSelectStage }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">City Run / Censo</p>
          <h2 className="text-lg font-black text-slate-950">Do candidato ao restaurante canonico e suas trilhas de enriquecimento</h2>
        </div>
        <button
          type="button"
          onClick={() => onSelectStage('all')}
          className={`h-9 rounded-lg border px-3 text-xs font-black transition ${
            selectedStage === 'all'
              ? 'border-slate-950 bg-slate-950 text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          Todos os stages
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {macroPhases.map((phase) => (
          <article key={phase.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-950">{phase.label}</h3>
                <p className="mt-1 text-[11px] font-semibold text-slate-500">
                  Gargalo: {phase.mainBottleneck?.count ? phase.mainBottleneck.label : 'sem volume'}
                </p>
              </div>
              <span className="rounded-lg bg-white px-2 py-1 text-sm font-black tabular-nums text-slate-900">{phase.total}</span>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-1.5 text-[11px] font-black">
              <span className="flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-blue-700">
                <Clock className="h-3 w-3" /> {phase.pending}
              </span>
              <span className="flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-rose-700">
                <AlertCircle className="h-3 w-3" /> {phase.blocked}
              </span>
              <span className="flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-emerald-700">
                <CheckCircle2 className="h-3 w-3" /> {phase.done}
              </span>
              <span className="flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-slate-600">
                <Ban className="h-3 w-3" /> {phase.rejected}
              </span>
            </div>

            <div className="mt-3 grid gap-2">
              {phase.stages.map((summary) => {
                const active = selectedStage === summary.key;
                const problemCount = summary.pending + summary.blocked + summary.error;
                return (
                  <button
                    key={summary.key}
                    type="button"
                    onClick={() => onSelectStage(active ? 'all' : summary.key)}
                    className={`rounded-lg border p-2 text-left transition ${stageTone(summary, active)}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-black">{summary.label}</p>
                      <span className="rounded-md bg-white/80 px-2 py-0.5 text-[11px] font-black tabular-nums text-slate-800">{summary.count}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                      <Circle className={`h-2.5 w-2.5 ${problemCount > 0 ? 'fill-current' : ''}`} />
                      {problemCount > 0
                        ? `${problemCount} precisa acao`
                        : summary.done > 0
                          ? `${summary.done} decidido(s)`
                          : summary.rejected > 0
                            ? `${summary.rejected} rejeitado(s)`
                            : 'sem evidencia'}
                    </div>
                  </button>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

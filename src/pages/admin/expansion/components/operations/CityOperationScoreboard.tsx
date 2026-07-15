import {
  AlertCircle,
  Ban,
  CheckCircle2,
  CircleDashed,
  Database,
  Layers3,
  UserRoundCheck,
} from 'lucide-react';
import { OperationScoreboardData } from './types';

type Metric = {
  label: string;
  value: number;
  helper: string;
  tone: string;
  Icon: typeof Database;
};

const levelTones = [
  'bg-slate-300',
  'bg-sky-500',
  'bg-cyan-500',
  'bg-amber-500',
  'bg-violet-500',
  'bg-fuchsia-500',
  'bg-emerald-500',
];

export function CityOperationScoreboard({ data }: { data: OperationScoreboardData }) {
  const metrics: Metric[] = [
    { label: 'Restaurantes ativos', value: data.activeRestaurants, helper: 'universo da cidade', tone: 'text-slate-950', Icon: Database },
    { label: 'Cidade decidida', value: data.cityProcessed, helper: `${data.cityCompletionRate}% com decisao terminal`, tone: 'text-emerald-700', Icon: CheckCircle2 },
    { label: 'Ainda pendentes', value: data.cityRemaining, helper: 'unicos que impedem concluir', tone: 'text-blue-700', Icon: CircleDashed },
    { label: 'Aceitos incompletos', value: data.acceptedIncomplete, helper: 'dados confiaveis preservados', tone: 'text-amber-700', Icon: Layers3 },
    { label: 'Revisao humana', value: data.needsHumanReview, helper: 'ambiguidade real', tone: 'text-rose-700', Icon: UserRoundCheck },
    { label: 'Rejeitados', value: data.rejectedRestaurants, helper: 'decisao terminal rastreada', tone: 'text-slate-700', Icon: Ban },
  ];
  const levels = [data.level0, data.level1, data.level2, data.level3, data.level4, data.level5, data.level6];

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Conclusao operacional da cidade</p>
            <h2 className="text-lg font-black text-slate-950">Cada restaurante termina com uma decisao, nao com perfeicao obrigatoria</h2>
          </div>
          <div className="min-w-[220px]">
            <div className="flex items-center justify-between text-xs font-black text-slate-700">
              <span>Cobertura decidida</span>
              <span className="tabular-nums">{data.cityProcessed}/{data.activeRestaurants}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Cobertura operacional decidida" aria-valuemin={0} aria-valuemax={100} aria-valuenow={data.cityCompletionRate}>
              <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-300" style={{ width: `${data.cityCompletionRate}%` }} />
            </div>
          </div>
        </div>

        {data.cityRemaining > 0 ? (
          <div className="mt-3 flex items-start gap-2 border-l-4 border-blue-500 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-950">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{data.cityRemaining} restaurante(s) ainda precisam de job ou decisao terminal para a cidade encerrar.</span>
          </div>
        ) : data.activeRestaurants > 0 ? (
          <div className="mt-3 border-l-4 border-emerald-500 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-950">
            Cidade operacionalmente concluida. Enriquecimentos futuros podem continuar sem reabrir o censo.
          </div>
        ) : null}
      </div>

      <div className="grid border-y border-slate-200 bg-slate-50 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {metrics.map(({ label, value, helper, tone, Icon }) => (
          <div key={label} className="min-h-[104px] border-b border-r border-slate-200 p-3 last:border-r-0 sm:[&:nth-last-child(-n+2)]:border-b-0 lg:[&:nth-last-child(-n+3)]:border-b-0 2xl:border-b-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[10px] font-black uppercase leading-tight tracking-wide text-slate-500">{label}</p>
              <Icon className={`h-4 w-4 shrink-0 ${tone}`} />
            </div>
            <p className={`mt-2 text-3xl font-black tabular-nums ${tone}`}>{value}</p>
            <p className="mt-1 text-[11px] font-semibold text-slate-500">{helper}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Distribuicao por completude</p>
            <p className="text-xs font-bold text-slate-500">Nem o Nivel 6 publica automaticamente</p>
          </div>
          <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-slate-100" aria-label="Distribuicao dos niveis de completude">
            {levels.map((value, level) => (
              value > 0 && data.activeRestaurants > 0 ? (
                <div
                  key={level}
                  className={levelTones[level]}
                  style={{ width: `${(value / data.activeRestaurants) * 100}%` }}
                  title={`Nivel ${level}: ${value}`}
                />
              ) : null
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-slate-700">
            {levels.map((value, level) => (
              <span key={level} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-sm ${levelTones[level]}`} />
                Nivel {level}: <strong className="tabular-nums">{value}</strong>
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-black xl:max-w-[420px] xl:justify-end">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{data.jobsProcessed} jobs terminais</span>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-800">{data.jobsPending} jobs pendentes</span>
          <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-800">{data.jobsBlocked + data.jobsError} jobs travados</span>
          <span className="rounded-full bg-violet-50 px-3 py-1 text-violet-800">{data.activeWorkers} workers / {data.activeLocks} locks</span>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-900">{data.notFound} not_found</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-800">{data.sourceRejected} fontes rejeitadas</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-800">{data.inactive} inativos / {data.duplicate} duplicados</span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">{data.level6} Nivel 6 / {data.published} publicados</span>
        </div>
      </div>
    </section>
  );
}

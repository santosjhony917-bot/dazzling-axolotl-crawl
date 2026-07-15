import { Clipboard, FileSearch, FileText, ListFilter, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CurrentBottleneck, RestaurantOperationRow } from './types';

type Props = {
  bottleneck: CurrentBottleneck;
  rows: RestaurantOperationRow[];
  onShowRestaurants: () => void;
  onShowEvidence: () => void;
};

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch (_) {
    // Clipboard can be blocked by browser permissions; buttons remain read-only.
  }
};

const impactTone = (count: number) => (
  count > 0 ? 'border-amber-200 bg-amber-50 text-amber-950' : 'border-emerald-200 bg-emerald-50 text-emerald-950'
);

export function CurrentBottleneckPanel({ bottleneck, rows, onShowRestaurants, onShowEvidence }: Props) {
  const hasBottleneck = bottleneck.pendingBlocked > 0;
  const sampleNames = rows.slice(0, 8).map(row => row.restaurant.name || row.restaurant.id).join('\n');
  const commandText = `${bottleneck.commandSuggestion}\n\nstage=${bottleneck.stage}\ncount=${bottleneck.count}\nreason=${bottleneck.mainReason}`;
  const promptText = `${bottleneck.workerPrompt}\n\nRestaurantes exemplo:\n${sampleNames || 'Sem amostra carregada'}`;

  return (
    <section className={`rounded-2xl border p-5 shadow-sm ${impactTone(bottleneck.pendingBlocked)}`}>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-white">
              {hasBottleneck ? 'Gargalo atual' : 'Sem gargalo obrigatorio'}
            </span>
            <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-black text-slate-800">
              {bottleneck.label}
            </span>
          </div>

          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
            {hasBottleneck
              ? `${bottleneck.count} restaurante(s) ainda dependem de ${bottleneck.label}`
              : 'Todos os restaurantes carregados possuem decisao terminal'}
          </h2>
          <p className="mt-2 text-sm font-semibold text-slate-700">
            {hasBottleneck
              ? `${bottleneck.pendingBlocked} pendentes/bloqueados - ${bottleneck.activeWorkers} worker(s) ativo(s) - ${bottleneck.activeLocks} lock(s)`
              : 'Enriquecimentos podem continuar por nivel, sem reabrir o encerramento da cidade.'}
          </p>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <div className="rounded-xl bg-white/80 p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Motivo principal</p>
              <p className="mt-1 line-clamp-3 text-sm font-bold text-slate-900">{bottleneck.mainReason}</p>
            </div>
            <div className="rounded-xl bg-white/80 p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Impacto</p>
              <p className="mt-1 line-clamp-3 text-sm font-bold text-slate-900">{bottleneck.impact}</p>
            </div>
            <div className="rounded-xl bg-white/80 p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Proxima acao recomendada</p>
              <p className="mt-1 line-clamp-3 text-sm font-bold text-slate-900">{bottleneck.recommendedAction}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Acoes seguras</p>
          <div className="mt-3 grid gap-2">
            <Button type="button" onClick={onShowRestaurants} className="h-10 justify-start rounded-lg bg-slate-950 text-xs font-black text-white hover:bg-slate-800">
              <ListFilter className="mr-2 h-4 w-4" />
              Ver restaurantes
            </Button>
            <Button type="button" variant="outline" onClick={onShowEvidence} className="h-10 justify-start rounded-lg bg-white text-xs font-black">
              <FileSearch className="mr-2 h-4 w-4" />
              Ver evidencias
            </Button>
            <Button type="button" variant="outline" onClick={() => copyText(commandText)} className="h-10 justify-start rounded-lg bg-white text-xs font-black">
              <Clipboard className="mr-2 h-4 w-4" />
              Copiar comando sugerido
            </Button>
            <Button type="button" variant="outline" onClick={() => copyText(promptText)} className="h-10 justify-start rounded-lg bg-white text-xs font-black">
              <FileText className="mr-2 h-4 w-4" />
              Gerar prompt para worker
            </Button>
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-600">
            <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Read-only: nenhum botao roda scraping, worker, publicacao ou escrita no banco.</span>
          </div>
        </div>
      </div>
    </section>
  );
}

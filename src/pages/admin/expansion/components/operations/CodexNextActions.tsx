import { Clipboard, FileText, ShieldAlert, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CodexActionRecommendation } from './types';

type Props = {
  actions: CodexActionRecommendation[];
  onSelectAction: (action: CodexActionRecommendation) => void;
};

const riskClassName = (risk: string) => {
  if (risk === 'critical') return 'border-rose-200 bg-rose-50 text-rose-800';
  if (risk === 'high') return 'border-orange-200 bg-orange-50 text-orange-800';
  if (risk === 'medium') return 'border-amber-200 bg-amber-50 text-amber-800';
  if (risk === 'low') return 'border-blue-200 bg-blue-50 text-blue-800';
  return 'border-slate-200 bg-slate-50 text-slate-700';
};

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch (_) {
    // Clipboard permissions can fail without changing the read-only behavior.
  }
};

export function CodexNextActions({ actions, onSelectAction }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Proximas acoes Codex</p>
          <h2 className="text-lg font-black text-slate-950">Lotes recomendados por prioridade</h2>
        </div>
        <span className="rounded-full bg-indigo-950 px-3 py-1 text-xs font-black text-white">decisao principal</span>
      </div>

      {actions.length === 0 ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
          Nenhum lote prioritario com dado operacional suficiente nesta leitura.
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
          {actions.map((action) => (
            <article key={`${action.priority}-${action.title}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">
                      {action.priority}
                    </span>
                    <h3 className="line-clamp-2 text-sm font-black text-slate-950">{action.title}</h3>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs font-semibold text-slate-600">{action.impact}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${riskClassName(action.risk)}`}>
                  {action.risk}
                </span>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg bg-white p-2">
                  <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
                    <ShieldAlert className="h-3 w-3" />
                    Aprovacao humana
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-800">{action.requiresHumanApproval ? 'Sim, antes de executar' : 'Nao para triagem/dry-run'}</p>
                </div>
                <div className="rounded-lg bg-white p-2">
                  <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
                    <Target className="h-3 w-3" />
                    Impacto esperado
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-800">{action.stage}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => onSelectAction(action)} className="h-8 rounded-lg bg-slate-950 text-xs font-black text-white hover:bg-slate-800">
                  Ver lote
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => copyText(action.commandSuggestion)} className="h-8 rounded-lg bg-white text-xs font-black">
                  <Clipboard className="mr-1.5 h-3.5 w-3.5" />
                  Comando
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => copyText(action.promptSuggestion)} className="h-8 rounded-lg bg-white text-xs font-black">
                  <FileText className="mr-1.5 h-3.5 w-3.5" />
                  Prompt
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

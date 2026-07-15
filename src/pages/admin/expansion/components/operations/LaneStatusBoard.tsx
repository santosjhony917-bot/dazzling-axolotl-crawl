import { AlertCircle, CheckCircle2, Clock3, LockKeyhole } from 'lucide-react';
import { CityOperationState, PipelineStage, StageFilter } from './types';
import { stageLabel } from './useCityOperationState';

type LaneDefinition = {
  key: string;
  label: string;
  purpose: string;
  lane?: string;
  stages: PipelineStage[];
  publication?: boolean;
};

const LANE_DEFINITIONS: LaneDefinition[] = [
  { key: 'identity', label: 'Censo e identidade', purpose: 'candidato para canonico', stages: ['candidate_discovery', 'entity_resolution', 'restaurant_upsert'] },
  { key: 'google', label: 'Google e localizacao', purpose: 'identidade basica', lane: 'google', stages: ['google_phase1', 'google_enrichment'] },
  { key: 'channels', label: 'Instagram e canais', purpose: 'Instagram define N2; demais canais sao preservados', lane: 'channels', stages: ['channel_enrichment', 'instagram_discovery', 'instagram_enrichment'] },
  { key: 'menu', label: 'Cardapio', purpose: 'fonte, solicitacao, extracao e QA semantico', lane: 'menu', stages: ['menu_source_discovery', 'menu_outreach_whatsapp', 'menu_extraction_anotaai', 'menu_extraction_cardapioweb', 'menu_extraction_yooga', 'menu_extraction_site_pdf', 'semantic_menu_qa'] },
  { key: 'media', label: 'Midia', purpose: 'coleta e QA visual', lane: 'media', stages: ['media_collection', 'media_qa', 'media_visual_qa'] },
  { key: 'decision', label: 'Auditoria e decisao', purpose: 'score e encerramento', stages: ['structural_audit', 'completeness_scoring', 'operational_decision'] },
  { key: 'publication', label: 'Publicacao', purpose: 'gate separado da cidade', stages: ['publication_gate', 'ready_publish'], publication: true },
];

const statusOf = (status?: string | null) => {
  const value = String(status || '').toLowerCase();
  if (value === 'locked') return 'locked';
  if (value === 'pending' || value === 'error') return value;
  if (['done', 'blocked', 'rejected', 'cancelled'].includes(value)) return 'terminal';
  return 'other';
};

export function LaneStatusBoard({
  state,
  onSelectStage,
}: {
  state: CityOperationState;
  onSelectStage: (stage: StageFilter) => void;
}) {
  const rows = LANE_DEFINITIONS.map((definition) => {
    const jobs = state.jobs.filter(job => definition.stages.includes(job.stage as PipelineStage));
    const laneRows = definition.lane
      ? state.lanes.filter(lane => lane.lane === definition.lane && (!state.currentRun || lane.city_run_id === state.currentRun.id))
      : [];
    const pending = jobs.filter(job => statusOf(job.status) === 'pending').length;
    const locked = jobs.filter(job => statusOf(job.status) === 'locked').length;
    const errors = jobs.filter(job => statusOf(job.status) === 'error').length;
    const terminal = laneRows.length
      ? laneRows.filter(lane => lane.is_terminal === true).length
      : jobs.filter(job => statusOf(job.status) === 'terminal').length;
    const total = laneRows.length || jobs.length;
    const bottleneck = state.stageSummaries
      .filter(summary => definition.stages.includes(summary.key as PipelineStage))
      .sort((a, b) => (b.pending + b.blocked + b.error) - (a.pending + a.blocked + a.error))[0];
    return {
      ...definition,
      pending,
      locked,
      errors,
      terminal,
      total,
      attempts: jobs.reduce((sum, job) => sum + Number(job.attempts || 0), 0),
      cost: jobs.reduce((sum, job) => sum + Number(job.external_cost_cents || 0), 0),
      bottleneck,
    };
  });

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <p className="text-[10px] font-black uppercase text-slate-500">Workers executaveis</p>
        <div className="mt-1 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <h2 className="text-base font-black text-slate-950">Lanes independentes e convergencia operacional</h2>
          <p className="text-xs font-semibold text-slate-500">Midia e publicacao nao bloqueiam o encerramento em nivel menor.</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-xs">
          <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Lane</th>
              <th className="px-3 py-2 text-center">Cobertura</th>
              <th className="px-3 py-2 text-center">Pendente</th>
              <th className="px-3 py-2 text-center">Locks</th>
              <th className="px-3 py-2 text-center">Erros</th>
              <th className="px-3 py-2 text-center">Tentativas</th>
              <th className="px-3 py-2">Gargalo atual</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(row => {
              const coverage = row.total ? Math.round((row.terminal / row.total) * 100) : 0;
              const targetStage = row.bottleneck?.key || row.stages[0];
              return (
                <tr key={row.key} className={row.publication ? 'bg-slate-50/70' : 'bg-white'}>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => onSelectStage(targetStage)} className="text-left">
                      <span className="font-black text-slate-900">{row.label}</span>
                      <span className="mt-0.5 block text-[11px] font-medium text-slate-500">{row.purpose}</span>
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-emerald-500" style={{ width: `${coverage}%` }} /></div>
                      <span className="w-9 text-right font-black tabular-nums text-slate-700">{coverage}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center font-black tabular-nums text-blue-700"><Clock3 className="mr-1 inline h-3.5 w-3.5" />{row.pending}</td>
                  <td className="px-3 py-3 text-center font-black tabular-nums text-violet-700"><LockKeyhole className="mr-1 inline h-3.5 w-3.5" />{row.locked}</td>
                  <td className="px-3 py-3 text-center font-black tabular-nums text-rose-700"><AlertCircle className="mr-1 inline h-3.5 w-3.5" />{row.errors}</td>
                  <td className="px-3 py-3 text-center font-black tabular-nums text-slate-700">{row.attempts}</td>
                  <td className="px-3 py-3">
                    {row.bottleneck && (row.bottleneck.pending + row.bottleneck.blocked + row.bottleneck.error) > 0 ? (
                      <button type="button" onClick={() => onSelectStage(row.bottleneck!.key)} className="font-bold text-slate-800 hover:text-blue-700">
                        {stageLabel(row.bottleneck.key)}: {row.bottleneck.pending + row.bottleneck.blocked + row.bottleneck.error}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Sem fila critica</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

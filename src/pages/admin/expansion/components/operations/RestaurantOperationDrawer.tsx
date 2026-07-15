import { AlertCircle, CheckCircle2, ExternalLink, FileText, ImageOff, Layers3, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RestaurantOperationRow } from './types';
import { stageLabel } from './useCityOperationState';
import { isMenuSourceCandidateUrl } from './completeness';

const toRecord = (value: unknown): Record<string, any> => {
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

const compactJson = (value: unknown) => {
  const record = toRecord(value);
  const keys = Object.keys(record);
  if (keys.length === 0) return 'Sem result_summary estruturado.';
  return JSON.stringify(record, null, 2);
};

const fieldValue = (value?: string | null) => value && value.trim() ? value : 'Nao informado';

const LEVEL_EXPLANATIONS = {
  0: 'Identidade ainda insuficiente.',
  1: 'Nome e localizacao basica/Google confiaveis.',
  2: 'Instagram verificado. Telefone, site ou WhatsApp nao substituem este nivel.',
  3: 'Fonte de cardapio confiavel e identidade da fonte validadas.',
  4: 'Cardapio coletado, estruturado e aprovado no QA semantico.',
  5: 'Midia minima aprovada por analise visual real.',
  6: 'Auditoria estrutural final aprovada. A publicacao continua separada.',
} as const;

const decisionTone = (risk: string, decision: string) => {
  if (decision === 'complete') return 'border-emerald-200 bg-emerald-50 text-emerald-950';
  if (decision === 'accepted_incomplete') return 'border-amber-200 bg-amber-50 text-amber-950';
  if (['source_rejected', 'duplicate', 'inactive'].includes(decision)) return 'border-slate-300 bg-slate-100 text-slate-900';
  if (decision === 'not_found') return 'border-amber-200 bg-amber-50 text-amber-950';
  if (risk === 'critical') return 'border-rose-300 bg-rose-100 text-rose-950';
  if (risk === 'high') return 'border-orange-200 bg-orange-50 text-orange-950';
  if (risk === 'medium') return 'border-amber-200 bg-amber-50 text-amber-950';
  if (risk === 'low') return 'border-blue-200 bg-blue-50 text-blue-950';
  return 'border-emerald-200 bg-emerald-50 text-emerald-950';
};

export function RestaurantOperationDrawer({ row }: { row: RestaurantOperationRow | null }) {
  if (!row) {
    return (
      <aside className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <AlertCircle className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-2 text-sm font-bold text-slate-700">Selecione um restaurante.</p>
        <p className="mt-1 text-xs text-slate-500">O dossie operacional aparece aqui.</p>
      </aside>
    );
  }

  const { restaurant, currentJob, readyPublish } = row;
  const hasMediaMetadata = Boolean(restaurant.image_url || restaurant.cover_image_url);
  const semanticOk = row.jobs.some(job => job.stage === 'semantic_menu_qa' && ['done', 'completed', 'succeeded'].includes(String(job.status || '').toLowerCase()));
  const structuralOk = row.jobs.some(job => job.stage === 'structural_audit' && ['done', 'completed', 'succeeded'].includes(String(job.status || '').toLowerCase()));
  const menuSourceJob = row.jobs.find(job => isMenuSourceCandidateUrl(job.source_url) && (job.stage === 'menu_source_discovery' || String(job.stage || '').startsWith('menu_extraction_')));
  const menuSource = [menuSourceJob?.source_url, restaurant.other_url, restaurant.external_url].find(isMenuSourceCandidateUrl) || '';
  const operationalStatus = row.completeness.decisionLabel;
  const canPublishText = row.canPublish
    ? 'Sim, aguardando autorizacao explicita'
    : 'Nao pelo gate atual';

  return (
    <aside className="min-h-full bg-white">
      <div className="border-b border-slate-100 bg-slate-950 p-4 text-white">
        <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Dossie operacional</p>
        <h2 className="mt-1 truncate text-lg font-black">{restaurant.name || 'Restaurante sem nome'}</h2>
        <p className="mt-1 truncate text-xs font-semibold text-slate-400">{restaurant.category || restaurant.address || 'Sem categoria/endereco'}</p>
      </div>

      <div className="space-y-3 p-4">
        <section className={`rounded-xl border p-3 ${decisionTone(row.risk, row.completeness.decision)}`}>
          <p className="text-[10px] font-black uppercase tracking-wide opacity-70">{row.completeness.decisionRecorded ? 'Decisao operacional registrada' : 'Proposta operacional'}</p>
          <h3 className="mt-1 text-base font-black">{row.completeness.decisionRecorded ? operationalStatus : `Proposta: ${operationalStatus}`}</h3>
          <div className="mt-3 space-y-2 text-xs font-bold">
            <p><span className="font-black">Motivo:</span> {row.completeness.decisionReason}</p>
            <p><span className="font-black">Nivel comprovado:</span> {row.completeness.level} - {row.completeness.levelLabel}</p>
            <p><span className="font-black">Encerra a cidade?</span> {row.completeness.canFinishCity ? 'Sim' : row.completeness.proposedTerminal ? 'Ainda nao; falta registrar a decisao' : 'Nao'}</p>
            <p><span className="font-black">Decisao sugerida:</span> {row.nextAction}</p>
            <p><span className="font-black">Pode publicar?</span> {canPublishText}</p>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Completude</p>
              <p className="mt-1 text-sm font-black text-slate-950">{row.completeness.levelLabel} (N{row.completeness.level})</p>
            </div>
            <Layers3 className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="mt-3 grid grid-cols-6 gap-1" aria-label={`Nivel de completude ${row.completeness.level} de 6`}>
            {[1, 2, 3, 4, 5, 6].map(level => (
              <span key={level} className={`h-2 rounded-sm ${level <= row.completeness.level ? 'bg-indigo-600' : 'bg-slate-200'}`} />
            ))}
          </div>
          <p className="mt-2 text-xs font-bold text-slate-800">{LEVEL_EXPLANATIONS[row.completeness.level]}</p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">N2 e independente: a falta de Instagram nao impede a evolucao do cardapio para N3-N6.</p>
          <p className="mt-2 text-xs font-semibold text-slate-600">
            {row.completeness.missing.length > 0
              ? `Lacunas para subir de nivel: ${row.completeness.missing.join(', ')}.`
              : 'Nenhuma lacuna de completude detectada.'}
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Dados basicos</p>
          <div className="mt-2 space-y-1 text-xs font-semibold text-slate-700">
            <p>Google: {fieldValue(restaurant.google_place_id || restaurant.google_maps_url)}</p>
            <p>Instagram: {fieldValue(restaurant.instagram)}</p>
            <p>Telefone: {fieldValue(restaurant.phone)}</p>
            <p>Endereco: {fieldValue(restaurant.address)}</p>
            <p>Cardapio: {restaurant.menu_category_count || 0} categorias / {restaurant.menu_item_count || 0} itens</p>
            <p>Galeria: {restaurant.gallery_count || 0} imagens</p>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Estado atual</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline" className="border-slate-200 bg-white font-black text-slate-700">{stageLabel(row.stage)}</Badge>
            <Badge variant="outline" className="border-slate-200 bg-white font-black text-slate-700">{currentJob?.status || row.status}</Badge>
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-700">{row.nextAction}</p>
        </section>

        <section className={`rounded-xl border p-3 ${readyPublish.finalReady ? 'border-emerald-200 bg-emerald-50' : readyPublish.mediaVisualQualityNotVerified ? 'border-fuchsia-200 bg-fuchsia-50' : 'border-slate-200 bg-slate-50'}`}>
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Gate de publicacao</p>
          {readyPublish.finalReady ? (
            <div className="mt-2 flex items-start gap-2 text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-xs font-bold">Pronto final: ready_publish_final, publish_allowed e media_visual_quality_verified.</p>
            </div>
          ) : readyPublish.mediaVisualQualityNotVerified ? (
            <div className="mt-2 flex items-start gap-2 text-fuchsia-800">
              <ImageOff className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-xs font-bold">Pode encerrar a cidade no nivel atual, mas falta QA visual do Nivel 5 e auditoria do Nivel 6 para o gate final.</p>
            </div>
          ) : (
            <p className="mt-2 text-xs font-semibold text-slate-700">Sem ready_publish final confirmado.</p>
          )}
        </section>

        <section className="grid grid-cols-2 gap-2">
          {[
            { label: 'N1 Basico/Google', ok: row.completeness.gates.baseIdentity, bad: false, fallback: 'Pendente/sem evidencia' },
            { label: 'N2 Instagram', ok: row.completeness.gates.instagramVerified, bad: false, fallback: 'Ausente/nao verificado' },
            { label: 'N3 Fonte', ok: row.completeness.gates.menuSourceValidated, bad: false, fallback: 'Pendente/sem fonte valida' },
            { label: 'N4 Cardapio', ok: row.completeness.gates.menuStructured && semanticOk, bad: false, fallback: 'Pendente/sem QA semantico' },
            { label: 'N5 Midia visual', ok: readyPublish.mediaVisualQualityVerified, bad: readyPublish.mediaVisualQualityNotVerified, fallback: hasMediaMetadata ? 'Tem midia, sem QA visual' : 'Pendente/sem evidencia' },
            { label: 'N6 Auditoria', ok: structuralOk && row.completeness.level === 6, bad: false, fallback: 'Pendente/sem evidencia' },
          ].map(item => (
            <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{item.label}</p>
              <p className={`mt-1 text-xs font-black ${item.ok ? 'text-emerald-700' : item.bad ? 'text-fuchsia-700' : 'text-slate-500'}`}>
                {item.ok ? 'OK' : item.bad ? 'Nao verificado' : item.fallback || 'Pendente/sem evidencia'}
              </p>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Fonte de cardapio</p>
          {menuSource ? (
            <a href={menuSource} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1 break-all text-xs font-bold text-indigo-700 hover:underline">
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              {menuSource}
            </a>
          ) : (
            <p className="mt-1 text-xs font-semibold text-slate-500">Nao informada.</p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Solicitacao via WhatsApp</p>
          {row.menuOutreach ? (
            <div className="mt-2 space-y-1 text-xs font-semibold text-slate-700">
              <p>Status: <span className="font-black">{row.menuOutreach.status}</span></p>
              <p>Tentativas: {row.menuOutreach.attempt_count || 0}/{row.menuOutreach.max_attempts || 1}</p>
              {row.menuOutreach.outcome_reason && <p>Motivo: {row.menuOutreach.outcome_reason}</p>}
              {row.menuOutreach.response_source_url && (
                <a href={row.menuOutreach.response_source_url} target="_blank" rel="noreferrer" className="block break-all font-bold text-indigo-700 hover:underline">
                  Fonte recebida: {row.menuOutreach.response_source_url}
                </a>
              )}
            </div>
          ) : (
            <p className="mt-2 text-xs font-semibold text-slate-600">Nenhuma solicitacao rastreada.</p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-slate-500" />
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Jobs do restaurante</p>
          </div>
          <div className="space-y-2">
            {row.jobs.length === 0 ? (
              <p className="text-xs font-semibold text-slate-500">Sem operation_jobs acessiveis.</p>
            ) : row.jobs.slice(0, 8).map(job => (
              <div key={job.id} className="rounded-lg bg-white p-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-black text-slate-800">{job.stage || 'stage ausente'}</p>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{job.status || 'sem status'}</span>
                </div>
                {job.last_error && <p className="mt-1 line-clamp-2 text-[11px] font-semibold text-rose-700">{job.last_error}</p>}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-500" />
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">result_summary atual</p>
          </div>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-2 text-[11px] font-semibold text-slate-700">
            {compactJson(currentJob?.result_summary)}
          </pre>
        </section>

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Eventos recentes</p>
          <div className="mt-2 space-y-2">
            {row.events.length === 0 ? (
              <p className="text-xs font-semibold text-slate-500">Sem operation_job_events acessiveis.</p>
            ) : row.events.slice(0, 8).map(event => (
              <div key={event.id} className="rounded-lg bg-white p-2">
                <p className="truncate text-xs font-black text-slate-800">{event.event_type || event.stage || event.status || 'evento'}</p>
                <p className="mt-0.5 text-[10px] font-semibold text-slate-500">{event.created_at ? new Date(event.created_at).toLocaleString() : 'sem data'}</p>
              </div>
            ))}
          </div>
        </section>

        <Button type="button" variant="outline" className="w-full bg-white text-xs font-black" disabled>
          Read-only nesta versao
        </Button>
      </div>
    </aside>
  );
}

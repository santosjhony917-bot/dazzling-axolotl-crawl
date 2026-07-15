import { CircleX, Clock3, Link2, MessageCircle, Send } from 'lucide-react';
import { hasWhatsappContact } from './completeness';
import { CityOperationState, ListFilter } from './types';

const STATUS_LABELS: Record<string, string> = {
  draft: 'A enviar',
  approved: 'A enviar',
  waiting_reply: 'Aguardando resposta',
  source_received: 'Fonte recebida',
  not_success: 'Nao sucesso',
  opted_out: 'Nao sucesso',
  cancelled: 'Nao sucesso',
};

export function WhatsAppOutreachPanel({
  state,
  onFilterChange,
}: {
  state: CityOperationState;
  onFilterChange: (filter: ListFilter) => void;
}) {
  const candidates = state.rows.filter(row => (
    hasWhatsappContact(row.restaurant)
    && !row.completeness.gates.menuStructured
    && !row.completeness.gates.menuSourceValidated
    && !['complete', 'duplicate', 'inactive'].includes(row.completeness.decision)
  ));
  const requests = state.menuOutreachRequests;
  const queued = requests.filter(request => ['draft', 'approved'].includes(request.status)).length;
  const waiting = requests.filter(request => request.status === 'waiting_reply').length;
  const received = requests.filter(request => request.status === 'source_received').length;
  const notSuccess = requests.filter(request => ['not_success', 'opted_out', 'cancelled'].includes(request.status)).length;
  const trackedIds = new Set(requests.map(request => request.restaurant_id));
  const available = candidates.filter(row => !trackedIds.has(row.restaurant.id)).length;
  const metrics = [
    { label: 'Disponiveis', value: available, helper: 'sem menu e com WhatsApp', filter: 'whatsapp_outreach' as ListFilter, Icon: MessageCircle, tone: 'text-emerald-700' },
    { label: 'A enviar', value: queued, helper: 'rascunhos aprovados', filter: 'whatsapp_outreach' as ListFilter, Icon: Send, tone: 'text-blue-700' },
    { label: 'Aguardando', value: waiting, helper: 'pedido ja enviado', filter: 'whatsapp_waiting' as ListFilter, Icon: Clock3, tone: 'text-amber-700' },
    { label: 'Recebidos', value: received, helper: 'aguardam validar a fonte', filter: 'whatsapp_success' as ListFilter, Icon: Link2, tone: 'text-violet-700' },
    { label: 'Nao sucesso', value: notSuccess, helper: 'motivo registrado', filter: 'whatsapp_not_success' as ListFilter, Icon: CircleX, tone: 'text-slate-700' },
  ];

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-1 border-b border-slate-200 px-4 py-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase text-slate-500">Aquisicao assistida</p>
          <h2 className="mt-1 text-base font-black text-slate-950">Solicitacoes de cardapio por WhatsApp</h2>
        </div>
        <p className="text-xs font-semibold text-slate-500">WhatsApp e canal; N3 exige validar a fonte recebida.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map(({ label, value, helper, filter, Icon, tone }) => (
          <button
            key={label}
            type="button"
            onClick={() => onFilterChange(filter)}
            className="min-h-[88px] border-b border-r border-slate-200 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 lg:border-b-0"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase text-slate-500">{label}</span>
              <Icon className={`h-4 w-4 ${tone}`} />
            </div>
            <p className={`mt-1 text-2xl font-black tabular-nums ${tone}`}>{value}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-500">{helper}</p>
          </button>
        ))}
      </div>

      {state.menuOutreachAccessError && (
        <p className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900">
          {state.menuOutreachAccessError}
        </p>
      )}

      {requests.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2">
          {requests.slice(0, 8).map(request => (
            <span key={request.id} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700">
              {request.restaurant_name || request.restaurant_id}: {STATUS_LABELS[request.status] || request.status}
              {request.outcome_reason ? ` - ${request.outcome_reason}` : ''}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

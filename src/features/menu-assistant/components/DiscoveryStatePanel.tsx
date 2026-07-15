import React from 'react';
import { AlertCircle, BrainCircuit, CloudOff, MapPinOff, RefreshCw, SearchX } from 'lucide-react';
import type { MenuCoverage, MenuDiscoveryError, MenuDiscoveryStatus } from '../types';

interface DiscoveryStatePanelProps {
  status: MenuDiscoveryStatus;
  error: MenuDiscoveryError | null;
  coverage: MenuCoverage | null;
  onRetry: () => void;
  onSetLocation: () => void;
}

const progressLabels: Partial<Record<MenuDiscoveryStatus, string>> = {
  checking_coverage: 'Verificando os cardápios disponíveis nesta região…',
  parsing: 'Entendendo sua pergunta…',
  searching: 'Consultando cardápios publicados…',
  rewriting: 'Ampliando a busca sem alterar seus critérios…',
};

export function DiscoveryStatePanel({ status, error, coverage, onRetry, onSetLocation }: DiscoveryStatePanelProps) {
  const progress = progressLabels[status];
  if (progress) {
    return (
      <div role="status" aria-live="polite" className="relative isolate min-h-28 overflow-hidden rounded-[24px] border border-[#3B3031] bg-[#211A1B] p-5 text-white shadow-[0_16px_34px_rgba(24,17,17,0.14)]">
        <div className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:20px_20px]" />
        <div className="pointer-events-none absolute -right-8 -top-10 -z-10 h-32 w-32 rounded-full border border-cyan-300/20 shadow-[0_0_40px_rgba(74,224,215,0.12)]" />
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border border-cyan-200/25 bg-cyan-300/10 text-[#64EFE5] shadow-[0_0_20px_rgba(100,239,229,0.12)]">
            <BrainCircuit className="h-5 w-5 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#64EFE5]">Processamento fundamentado</p>
            <p className="mt-1 bg-[linear-gradient(90deg,#FFFFFF_0%,#A8B0B5_35%,#FFFFFF_70%)] bg-[length:200%_100%] bg-clip-text text-sm font-bold text-transparent animate-[pulse_1.5s_ease-in-out_infinite] motion-reduce:animate-none">{progress}</p>
          </div>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
          <span className="block h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-[#F45A31] via-[#64EFE5] to-[#F45A31] motion-reduce:animate-none" />
        </div>
      </div>
    );
  }

  if (status === 'no_coverage') {
    return <State icon={MapPinOff} title="Ainda não há cobertura publicada aqui" text={coverage?.reason || 'Escolha outra região para consultar os cardápios disponíveis.'} action="Alterar localização" onAction={onSetLocation} />;
  }
  if (status === 'no_result') {
    return <State icon={SearchX} title="Nenhuma opção correspondeu ao pedido" text="Edite a pergunta ou remova um filtro. Não mostraremos resultados de outra intenção sem avisar." action="Tentar novamente" onAction={onRetry} />;
  }
  if (status === 'offline') {
    return <State icon={CloudOff} title="Você está offline" text="Reconecte-se para consultar dados atuais. Resultados salvos só aparecem quando podem ser rotulados com data e origem." action="Tentar novamente" onAction={onRetry} />;
  }
  if (status === 'error') {
    return <State icon={AlertCircle} title="Não foi possível consultar os cardápios" text={error?.message || 'A busca falhou sem substituir o resultado por dados fictícios.'} action={error?.retryable === false ? undefined : 'Tentar novamente'} onAction={onRetry} />;
  }

  return null;
}

function State({ icon: Icon, title, text, action, onAction }: { icon: React.ElementType; title: string; text: string; action?: string; onAction: () => void }) {
  return (
    <div role="status" className="rounded-[24px] border border-[var(--ff-border-soft)] bg-white p-6 text-center shadow-[var(--ff-shadow-card)]">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--ff-orange-soft)] text-[var(--ff-primary)]">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-lg font-extrabold text-[var(--ff-text-primary)]">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--ff-text-secondary)]">{text}</p>
      {action && (
        <button type="button" onClick={onAction} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--ff-border-warm)] px-4 text-sm font-bold text-[var(--ff-primary)] hover:bg-[var(--ff-orange-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ff-primary)]">
          <RefreshCw className="h-4 w-4" aria-hidden="true" /> {action}
        </button>
      )}
    </div>
  );
}

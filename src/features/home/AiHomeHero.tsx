import React from 'react';
import { Radio, Sparkles } from 'lucide-react';
import { AiIntentComposer } from '@/features/menu-assistant/components';
import type { MenuDiscoveryStatus } from '@/features/menu-assistant';

interface AiHomeHeroProps {
  value: string;
  status: MenuDiscoveryStatus;
  statusLabel: string;
  autoFocus?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onSuggestion: (value: string) => void;
}

const SUGGESTIONS = [
  'Marmita até R$ 30',
  'Pizza para 2 pessoas',
  'Hambúrguer sem lactose',
  'Sushi até R$ 60',
];

export function AiHomeHero({
  value,
  status,
  statusLabel,
  autoFocus = false,
  onChange,
  onSubmit,
  onSuggestion,
}: AiHomeHeroProps) {
  const isBusy = ['checking_coverage', 'parsing', 'searching', 'rewriting'].includes(status);

  return (
    <section
      id="tour-search-bar"
      className="relative isolate overflow-hidden rounded-[28px] border border-[#FF8A65] bg-[#F34C21] p-4 text-white shadow-[0_20px_46px_rgba(223,75,28,0.22)]"
      aria-labelledby="assistant-title"
    >
      <div className="pointer-events-none absolute inset-0 -z-30 bg-[radial-gradient(circle_at_88%_5%,rgba(91,239,228,0.34),transparent_24%),linear-gradient(132deg,#E84017_0%,#F65327_55%,#FF7650_100%)]" />
      <div className="pointer-events-none absolute inset-0 -z-20 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(to_left,black,transparent_75%)]" />
      <div className="pointer-events-none absolute -right-16 -top-20 -z-10 h-56 w-56 rounded-full border border-white/25" />
      <div className="pointer-events-none absolute right-4 top-8 -z-10 h-24 w-24 rounded-full border border-cyan-100/30 shadow-[0_0_34px_rgba(79,235,224,0.2)]" />

      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex min-h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/35 bg-[#21191A]/20 px-2.5 text-[9px] font-extrabold uppercase tracking-[0.07em] backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          IA dos cardápios
        </span>
        <span className="inline-flex min-h-7 min-w-0 items-center gap-1.5 rounded-full border border-cyan-100/30 bg-[#171313]/35 px-2.5 text-[8px] font-extrabold uppercase tracking-[0.08em] text-cyan-50 backdrop-blur-md">
          <span
            className={`${isBusy ? 'animate-pulse motion-reduce:animate-none' : ''} h-1.5 w-1.5 shrink-0 rounded-full bg-[#63F2E7] shadow-[0_0_9px_rgba(99,242,231,0.95)]`}
            aria-hidden="true"
          />
          <span className="truncate">{statusLabel}</span>
        </span>
      </div>

      <div className="relative mt-4 pr-14">
        <h1 id="assistant-title" className="max-w-[285px] text-[25px] font-extrabold leading-[1.03] tracking-[-0.035em]">
          O que você quer comer?
        </h1>
        <p className="mt-2 text-[12px] font-medium leading-5 text-white/82">
          Diga o prato, orçamento, ocasião ou restrição.
        </p>
        <span className="absolute -right-1 -top-1 flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-100/30 bg-[#21191A]/25 text-[#6CF5EA] shadow-[0_0_24px_rgba(80,235,224,0.2)] backdrop-blur-md">
          <Radio className={`${isBusy ? 'animate-pulse motion-reduce:animate-none' : ''} h-5 w-5`} aria-hidden="true" />
        </span>
      </div>

      <div className="relative mt-3">
        <AiIntentComposer
          value={value}
          status={status}
          onChange={onChange}
          onSubmit={onSubmit}
          onSuggestion={onSuggestion}
          suggestions={SUGGESTIONS}
          autoFocus={autoFocus}
          variant="command"
          placeholder="Pizza até R$ 50"
        />
      </div>
    </section>
  );
}

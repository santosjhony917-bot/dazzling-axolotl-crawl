import React, { useId } from 'react';
import { Loader2, Send, Sparkles } from 'lucide-react';
import type { MenuDiscoveryStatus } from '../types';

const BUSY_STATUSES: MenuDiscoveryStatus[] = [
  'checking_coverage',
  'parsing',
  'searching',
  'rewriting',
];

interface AiIntentComposerProps {
  value: string;
  status: MenuDiscoveryStatus;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onSuggestion: (value: string) => void;
  suggestions?: string[];
  disabledReason?: string | null;
  autoFocus?: boolean;
  variant?: 'default' | 'compact' | 'command';
  placeholder?: string;
}

export function AiIntentComposer({
  value,
  status,
  onChange,
  onSubmit,
  onSuggestion,
  suggestions = [],
  disabledReason,
  autoFocus = false,
  variant = 'default',
  placeholder = 'Ex.: jantar para 2 até R$ 100',
}: AiIntentComposerProps) {
  const inputId = useId();
  const helperId = useId();
  const isBusy = BUSY_STATUSES.includes(status);
  const canSubmit = value.trim().length >= 2 && !isBusy && !disabledReason;
  const isCommand = variant === 'command';
  const isCompact = variant === 'compact' || isCommand;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (canSubmit) onSubmit();
  };

  return (
    <div>
      <form onSubmit={handleSubmit} aria-busy={isBusy}>
        <label
          htmlFor={inputId}
          className={isCompact ? 'sr-only' : 'block text-sm font-bold text-[var(--ff-text-primary)]'}
        >
          O que você quer comer?
        </label>
        <p
          id={helperId}
          className={isCompact ? 'sr-only' : 'mt-1 text-sm leading-5 text-[var(--ff-text-secondary)]'}
        >
          Inclua orçamento, pessoas, bairro ou uma restrição se isso ajudar.
        </p>

        <div className={isCommand ? 'rounded-[22px] bg-[linear-gradient(105deg,rgba(255,255,255,0.92),rgba(79,227,218,0.92),rgba(255,179,135,0.96))] p-[1.5px] shadow-[0_16px_34px_rgba(77,25,10,0.24),0_0_24px_rgba(49,214,204,0.16)]' : ''}>
          <div className={`${isCompact ? 'mt-0 items-center rounded-[20px] p-1.5 pl-2' : 'mt-3 items-end rounded-[24px] p-2 pl-3'} ${isCommand ? 'border-0 bg-white/95 shadow-none focus-within:ring-cyan-300/35' : 'border border-[var(--ff-border-soft)] bg-white shadow-[var(--ff-shadow-card)] focus-within:border-[var(--ff-border-warm)] focus-within:ring-[var(--ff-primary)]/15'} flex gap-2 focus-within:ring-2`}>
          <span className={`${isCompact ? 'h-9 w-9 rounded-xl' : 'mb-1.5 h-10 w-10 rounded-2xl'} ${isCommand ? 'bg-gradient-to-br from-[#FC4B22] via-[#F8663E] to-[#1DBDB7] text-white shadow-[0_6px_14px_rgba(223,75,28,0.24)]' : 'bg-[var(--ff-orange-soft)] text-[var(--ff-primary)]'} flex shrink-0 items-center justify-center`}>
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <textarea
            id={inputId}
            data-menu-composer="true"
            value={value}
            onChange={(event) => onChange(event.target.value.slice(0, 500))}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                if (canSubmit) onSubmit();
              }
            }}
            autoFocus={autoFocus}
            rows={isCompact ? 1 : 2}
            aria-describedby={helperId}
            placeholder={placeholder}
            className={`${isCompact ? 'min-h-11 py-2.5 text-base' : 'min-h-[52px] py-2 text-base'} min-w-0 flex-1 resize-none bg-transparent font-medium leading-6 text-slate-900 outline-none placeholder:text-slate-400`}
          />
          <button
            type="submit"
            disabled={!canSubmit}
            className={`${isCompact ? 'h-11 w-11 rounded-[16px]' : 'h-12 w-12 rounded-2xl'} ${isCommand ? 'bg-[#241C1C] shadow-[0_8px_20px_rgba(30,20,20,0.2)] hover:bg-[#0E7774] focus-visible:ring-cyan-500' : 'bg-[var(--ff-primary)] shadow-[var(--ff-shadow-button)] hover:bg-[var(--ff-primary-dark)] focus-visible:ring-[var(--ff-primary)]'} flex shrink-0 items-center justify-center text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45`}
            aria-label={isBusy ? 'Buscando nos cardápios' : 'Perguntar à IA'}
          >
            {isBusy ? <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" /> : <Send className="h-5 w-5" />}
          </button>
          </div>
        </div>

        {disabledReason && (
          <p role="status" className="mt-2 rounded-2xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
            {disabledReason}
          </p>
        )}
      </form>

      {suggestions.length > 0 && (
        <div
          className={isCommand
            ? 'mt-2.5 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
            : isCompact
              ? 'mt-2.5 grid grid-cols-2 gap-2'
              : 'mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'}
          aria-label="Exemplos de perguntas"
        >
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onSuggestion(suggestion)}
              disabled={isBusy}
              className={`${isCommand ? 'shrink-0 px-3 text-[11px]' : isCompact ? 'min-w-0 truncate px-3 text-xs' : 'shrink-0 px-4 text-sm'} ${isCommand ? 'border-white/25 bg-[#251B1B]/45 text-white shadow-none backdrop-blur-md hover:border-cyan-200/70 hover:bg-[#251B1B]/65 focus-visible:ring-cyan-200' : 'border-[var(--ff-border-soft)] bg-white text-slate-600 shadow-[var(--ff-shadow-card)] hover:border-[var(--ff-border-warm)] hover:bg-[var(--ff-surface-warm)] hover:text-[var(--ff-primary)] focus-visible:ring-[var(--ff-primary)]'} min-h-11 rounded-full border font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50`}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

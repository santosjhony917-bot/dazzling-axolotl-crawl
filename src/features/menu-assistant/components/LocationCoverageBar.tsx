import React from 'react';
import { AlertCircle, CheckCircle2, ChevronRight, Loader2, MapPin } from 'lucide-react';
import type { MenuCoverage } from '../types';
import type { UserSearchLocationStatus } from '@/context/UserSearchLocationContext';

interface LocationCoverageBarProps {
  locationStatus: UserSearchLocationStatus;
  locationLabel: string | null;
  coverage: MenuCoverage | null;
  onChange: () => void;
}

export function LocationCoverageBar({ locationStatus, locationLabel, coverage, onChange }: LocationCoverageBarProps) {
  const isLoading = locationStatus === 'loading' || (locationStatus === 'ready' && coverage === null);
  const hasProblem = locationStatus === 'error' || coverage?.status === 'unavailable';
  const Icon = isLoading ? Loader2 : hasProblem ? AlertCircle : coverage?.status === 'covered' ? CheckCircle2 : MapPin;

  let supportingText = 'Defina a região que a IA deve consultar';
  if (locationStatus === 'loading') supportingText = 'Carregando sua localização';
  else if (coverage?.status === 'covered') {
    supportingText = `${coverage.eligibleRestaurantCount ?? 0} cardápios elegíveis nesta área`;
  } else if (coverage?.status === 'limited') supportingText = 'Cobertura limitada — os resultados podem ser parciais';
  else if (coverage?.status === 'unavailable') supportingText = coverage.reason || 'Ainda não há cobertura publicada nesta área';
  else if (locationStatus === 'ready') supportingText = 'A cobertura será verificada ao perguntar';

  return (
    <button
      type="button"
      onClick={onChange}
      className="flex min-h-[60px] w-full items-center gap-3 rounded-[22px] border border-[var(--ff-border-soft)] bg-white px-4 py-3 text-left shadow-[var(--ff-shadow-card)] transition-colors hover:border-[var(--ff-border-warm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ff-primary)]"
      aria-label={`${locationLabel || 'Localização não definida'}. ${supportingText}. Alterar localização.`}
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${hasProblem ? 'bg-amber-50 text-amber-700' : 'bg-[var(--ff-orange-soft)] text-[var(--ff-primary)]'}`}>
        <Icon className={`h-5 w-5 ${isLoading ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-[var(--ff-text-primary)]">
          {locationLabel || 'Escolher localização'}
        </span>
        <span className="mt-0.5 block text-xs leading-5 text-[var(--ff-text-secondary)]">{supportingText}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
    </button>
  );
}


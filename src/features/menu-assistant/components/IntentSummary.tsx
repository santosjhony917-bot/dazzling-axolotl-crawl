import React from 'react';
import { MapPin, Users, WalletCards, X } from 'lucide-react';
import type { MenuSearchIntent, MenuSearchIntentPatch } from '../types';

interface IntentSummaryProps {
  intent: MenuSearchIntent;
  onPatch: (patch: MenuSearchIntentPatch) => void;
}

const restrictionLabels: Record<string, string> = {
  vegetarian: 'Vegetariano',
  vegan: 'Vegano',
  gluten_free: 'Sem glúten',
  lactose_free: 'Sem lactose',
  sugar_free: 'Sem açúcar',
};

function Chip({ label, icon, onRemove }: { label: string; icon?: React.ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[var(--ff-border-warm)] bg-white py-0 pl-3 pr-1 text-xs font-semibold text-slate-700">
      {icon}
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ff-primary)]"
        aria-label={`Remover filtro ${label}`}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </span>
  );
}

export function IntentSummary({ intent, onPatch }: IntentSummaryProps) {
  const hasCriteria = intent.priceMax !== null
    || intent.people !== null
    || intent.location?.neighborhood
    || intent.restrictions.length > 0
    || intent.excludedIngredients.length > 0;

  if (!hasCriteria) return null;

  return (
    <section aria-labelledby="intent-summary-title">
      <h3 id="intent-summary-title" className="text-sm font-bold text-[var(--ff-text-primary)]">Entendi assim</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {intent.priceMax !== null && (
          <Chip
            label={`Até ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(intent.priceMax)}`}
            icon={<WalletCards className="h-3.5 w-3.5" aria-hidden="true" />}
            onRemove={() => onPatch({ priceMax: null })}
          />
        )}
        {intent.people !== null && (
          <Chip label={`${intent.people} pessoa${intent.people === 1 ? '' : 's'}`} icon={<Users className="h-3.5 w-3.5" aria-hidden="true" />} onRemove={() => onPatch({ people: null })} />
        )}
        {intent.location?.neighborhood && (
          <Chip label={intent.location.neighborhood} icon={<MapPin className="h-3.5 w-3.5" aria-hidden="true" />} onRemove={() => onPatch({ location: { ...intent.location!, neighborhood: null } })} />
        )}
        {intent.restrictions.map((restriction) => (
          <Chip key={restriction} label={restrictionLabels[restriction] || restriction} onRemove={() => onPatch({ restrictions: intent.restrictions.filter((item) => item !== restriction) })} />
        ))}
        {intent.excludedIngredients.map((ingredient) => (
          <Chip key={ingredient} label={`Sem ${ingredient}`} onRemove={() => onPatch({ excludedIngredients: intent.excludedIngredients.filter((item) => item !== ingredient) })} />
        ))}
      </div>
    </section>
  );
}

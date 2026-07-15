import React from 'react';
import { ArrowUpRight, BookOpenText, CheckCircle2, MapPin, Utensils } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MenuDiscoveryResult } from '../types';
import type { MenuAssistantSurface } from '../types';
import { trackGroundedResultOpened } from '../telemetry';
import { createPageUrl } from '@/utils/url';

interface GroundedResultCardProps {
  result: MenuDiscoveryResult;
  surface?: MenuAssistantSurface;
  onOpen?: (result: MenuDiscoveryResult) => void;
}

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function formatPrice(result: MenuDiscoveryResult) {
  const { min, max, type, value } = result.price;
  if (min !== null && max !== null && min !== max) return `${currency.format(min)} – ${currency.format(max)}`;
  const formatted = currency.format(min ?? value);
  return type === 'starting_at' || type === 'from' ? `A partir de ${formatted}` : formatted;
}

export function GroundedResultCard({ result, surface = 'home', onOpen }: GroundedResultCardProps) {
  const verifiedDate = result.evidence.verifiedAt
    ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(result.evidence.verifiedAt))
    : null;

  return (
    <article className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.065)]">
      <div className="flex gap-3 p-4">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-slate-100 bg-[var(--ff-surface-warm)] shadow-sm">
          {result.itemImageUrl ? (
            <img src={result.itemImageUrl} alt="" loading="lazy" width={96} height={96} className="h-full w-full object-cover" />
          ) : (
            <Utensils className="h-7 w-7 text-[var(--ff-primary)]" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--ff-primary)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#16A9A2] shadow-[0_0_7px_rgba(22,169,162,0.6)]" />
            {result.itemCategoryName}
          </p>
          <h3 className="mt-1 text-base font-extrabold leading-5 text-[var(--ff-text-primary)]">{result.itemName}</h3>
          <p className="mt-1 text-base font-bold tabular-nums text-[var(--ff-primary)]">{formatPrice(result)}</p>
          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-[var(--ff-text-secondary)]">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {result.restaurantName}
              {result.restaurantNeighborhood ? ` · ${result.restaurantNeighborhood}` : ''}
              {result.distanceKm !== null ? ` · ${result.distanceKm.toFixed(1)} km` : ''}
            </span>
          </p>
        </div>
      </div>

      <div className="relative overflow-hidden border-t border-[#3B3031] bg-[#211A1B] px-4 py-3 text-white">
        <div className="pointer-events-none absolute -right-7 -top-9 h-24 w-24 rounded-full border border-cyan-300/15" />
        <p className="relative flex items-start gap-2 text-sm leading-5 text-white/82">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#64EFE5]" aria-hidden="true" />
          {result.matchReason}
        </p>
        <div className="relative mt-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-white/55">
            {verifiedDate ? `Fonte verificada em ${verifiedDate}` : 'Registro do catálogo publicado'}
          </span>
          <div className="flex gap-2">
            {result.evidence.sourceUrl && (
              <a
                href={result.evidence.sourceUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackGroundedResultOpened({ result, surface, destination: 'published_source' })}
                className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-xs font-bold text-white/70 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#64EFE5]"
              >
                Fonte <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            )}
            <Link
              to={createPageUrl('menuItemDetails', { itemId: result.itemId })}
              onClick={() => {
                trackGroundedResultOpened({ result, surface, destination: 'catalog_item' });
                onOpen?.(result);
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--ff-primary)] px-4 text-xs font-bold text-white hover:bg-[var(--ff-primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ff-primary)] focus-visible:ring-offset-2"
            >
              <BookOpenText className="h-4 w-4" aria-hidden="true" /> Ver no cardápio
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

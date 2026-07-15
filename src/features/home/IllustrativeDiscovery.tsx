import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Clock3,
  MapPin,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  ILLUSTRATIVE_CONTENT_LABEL,
  ILLUSTRATIVE_CONTENT_NOTICE,
  illustrativeDiscoverySections,
  type IllustrativeDiscoverySectionId,
  type IllustrativeMenuItem,
} from './illustrativeCatalog';

interface IllustrativeDiscoveryProps {
  onUsePrompt: (prompt: string) => void;
  onSetLocation: () => void;
  onRetryRealData?: () => void;
  locationLabel?: string | null;
  realDataState?: 'location_required' | 'coverage_limited' | 'catalog_unverified' | 'technical_error';
}

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function promptFor(item: IllustrativeMenuItem) {
  return `${item.category} até ${currency.format(item.example.priceBRL)}`;
}

export function IllustrativeDiscovery({
  onUsePrompt,
  onSetLocation,
  onRetryRealData,
  locationLabel,
  realDataState = 'location_required',
}: IllustrativeDiscoveryProps) {
  const [activeSectionId, setActiveSectionId] = useState<IllustrativeDiscoverySectionId>('under_30');
  const activeSection = useMemo(
    () => illustrativeDiscoverySections.find((section) => section.id === activeSectionId)
      ?? illustrativeDiscoverySections[0],
    [activeSectionId],
  );

  return (
    <div className="space-y-5">
      <section aria-labelledby="illustrative-discovery-title">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8FAF8] px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#087F7F]">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              {ILLUSTRATIVE_CONTENT_LABEL} interativa
            </span>
            <h2 id="illustrative-discovery-title" className="mt-2 text-[20px] font-extrabold leading-tight tracking-[-0.025em] text-[#2C2323]">
              Veja como a IA organiza sua escolha.
            </h2>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#C8EEEB] bg-white text-[#0E8D87] shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
            <ScanSearch className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>

        <p className="mt-2 text-[11px] leading-[1.55] text-slate-500">
          {ILLUSTRATIVE_CONTENT_NOTICE}
        </p>

        <div
          className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Filtros da demonstração"
        >
          {illustrativeDiscoverySections.map((section) => {
            const selected = section.id === activeSection.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSectionId(section.id)}
                aria-pressed={selected}
                className={`${selected
                  ? 'border-[#2A2020] bg-[#2A2020] text-white shadow-[0_8px_18px_rgba(37,27,27,0.16)]'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-[#F3C9BC] hover:text-[var(--ff-primary)]'} min-h-11 shrink-0 rounded-full border px-3.5 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ff-primary)]`}
              >
                {section.title}
              </button>
            );
          })}
        </div>

        <p className="mt-2 text-[11px] leading-5 text-slate-500">{activeSection.subtitle}</p>

        <div className="-mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {activeSection.items.map((item, index) => (
            <article
              key={item.id}
              className="w-[76%] min-w-[250px] max-w-[286px] shrink-0 snap-start overflow-hidden rounded-[24px] border border-slate-200/90 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.07)]"
            >
              <div className="relative h-[138px] overflow-hidden bg-slate-100">
                <img
                  src={item.image.src}
                  alt={item.image.alt}
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.02] motion-reduce:transition-none"
                  loading={index < 2 ? 'eager' : 'lazy'}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#211A1B]/72 via-transparent to-black/10" />
                <span className="absolute left-3 top-3 rounded-full border border-white/35 bg-[#211A1B]/60 px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-[0.12em] text-white backdrop-blur-md">
                  Exemplo
                </span>
                <span className="absolute bottom-3 left-3 rounded-full bg-white/94 px-2.5 py-1 text-[10px] font-extrabold text-[var(--ff-primary)] shadow-sm">
                  {item.category}
                </span>
                <span className="absolute bottom-3 right-3 text-[17px] font-extrabold text-white drop-shadow">
                  {currency.format(item.example.priceBRL)}
                </span>
              </div>

              <div className="p-3.5">
                <h3 className="truncate text-[15px] font-extrabold tracking-[-0.015em] text-[#2C2323]">{item.name}</h3>
                <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-500">{item.restaurant.name}</p>

                <div className="mt-3 flex items-center gap-2 text-[9px] font-bold text-slate-600">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1.5">
                    <MapPin className="h-3 w-3 text-[var(--ff-primary)]" aria-hidden="true" />
                    Exemplo: {item.example.distanceKm.toFixed(1)} km
                  </span>
                  <span className="inline-flex min-w-0 items-center gap-1 rounded-full bg-[#E8FAF8] px-2 py-1.5 text-[#087F7F]">
                    <Clock3 className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.example.availability.isOpenNow ? 'Aberto' : 'Fechado'}</span>
                  </span>
                </div>
              </div>

              <div className="border-t border-white/10 bg-[#241D1E] px-3.5 py-3 text-white">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-cyan-200/20 bg-cyan-300/10 text-[#63F2E7]">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[8px] font-extrabold uppercase tracking-[0.12em] text-[#63F2E7]">Por que apareceu</p>
                    <p className="mt-1 text-[10px] leading-4 text-white/76">{item.matchReason.replace('Exemplo de combinação: ', '')}</p>
                  </div>
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-[8px] font-semibold text-white/52">
                  <ShieldCheck className="h-3 w-3 text-[#63F2E7]" aria-hidden="true" />
                  Fonte ilustrativa · item não publicado
                </p>
                <button
                  type="button"
                  onClick={() => onUsePrompt(promptFor(item))}
                  className="mt-3 flex min-h-11 w-full items-center justify-between rounded-2xl border border-white/12 bg-white/7 px-3 text-[10px] font-bold text-white transition-colors hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#63F2E7]"
                >
                  Perguntar algo parecido
                  <ArrowUpRight className="h-4 w-4 text-[#63F2E7]" aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="flex items-start gap-3 rounded-[22px] border border-[#F3C9BC] bg-[#FFF7F3] p-3.5" aria-label="Ativar resultados reais">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--ff-primary)] shadow-sm">
          {realDataState === 'location_required'
            ? <MapPin className="h-5 w-5" aria-hidden="true" />
            : <ShieldAlert className="h-5 w-5" aria-hidden="true" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-extrabold text-[#2C2323]">
            {realDataState === 'technical_error'
              ? `Não foi possível verificar ${locationLabel || 'sua região'} agora`
              : realDataState === 'catalog_unverified'
                ? 'A distância real ainda não pôde ser comprovada'
              : realDataState === 'coverage_limited'
                ? `Cobertura real limitada em ${locationLabel || 'sua região'}`
                : 'Quer ver opções realmente disponíveis?'}
          </p>
          <p className="mt-1 text-[10px] leading-4 text-slate-600">
            {realDataState === 'technical_error'
              ? 'A prévia acima continua sendo apenas demonstrativa. Você pode tentar a consulta real novamente.'
              : realDataState === 'catalog_unverified'
                ? 'A prévia permanece separada do catálogo até a consulta pública confirmar o raio da busca.'
              : realDataState === 'coverage_limited'
                ? 'Troque a região ou amplie a busca quando houver mais cardápios publicados.'
                : 'Defina sua região para a IA consultar somente cardápios publicados perto de você.'}
          </p>
          <button
            type="button"
            onClick={realDataState === 'technical_error' && onRetryRealData ? onRetryRealData : onSetLocation}
            className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[var(--ff-primary)] px-3 text-[10px] font-extrabold text-white shadow-[var(--ff-shadow-button)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ff-primary)] focus-visible:ring-offset-2"
          >
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {realDataState === 'technical_error'
              ? 'Tentar dados reais'
              : realDataState === 'catalog_unverified'
                ? 'Consultar outra região'
              : realDataState === 'coverage_limited'
                ? 'Trocar região'
                : 'Ativar resultados reais'}
          </button>
        </div>
      </aside>
    </div>
  );
}

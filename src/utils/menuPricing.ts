import { formatPrice } from './formatters';

export type MenuPriceType = 'fixed' | 'starting_at' | 'range' | 'option_only' | 'inherited' | 'included' | 'free' | 'unknown';

export interface MenuPriceLike {
  price?: number | null;
  display_price?: number | null;
  price_min?: number | null;
  price_max?: number | null;
  price_type?: MenuPriceType | string | null;
  commercial_type?: string | null;
  is_configurable?: boolean | null;
}

export function formatMenuPrice(item: MenuPriceLike): string {
  const displayPrice = item.display_price ?? null;
  const type = item.price_type || (item.is_configurable || item.commercial_type ? 'starting_at' : (item.price != null ? 'fixed' : 'unknown'));
  if (type === 'free') return 'Grátis';
  if (type === 'included') return 'Incluído no menu';
  if (type === 'unknown') return 'Preço sob consulta';
  if (type === 'starting_at' || type === 'option_only') {
    const minimum = displayPrice ?? item.price_min ?? item.price;
    return minimum != null ? `A partir de ${formatPrice(minimum)}` : 'Escolha uma opção';
  }
  if (type === 'range') {
    if (displayPrice != null) return `A partir de ${formatPrice(displayPrice)}`;
    if (item.price_min != null && item.price_max != null && item.price_min !== item.price_max) {
      return `${formatPrice(item.price_min)} – ${formatPrice(item.price_max)}`;
    }
    return formatPrice(item.price_min ?? item.price);
  }
  if (type === 'inherited') {
    return item.price_min != null ? `${formatPrice(item.price_min)} no menu` : 'Preço definido pelo menu';
  }
  if (item.is_configurable || item.commercial_type) {
    const minimum = displayPrice ?? item.price_min ?? item.price;
    return minimum != null ? `A partir de ${formatPrice(minimum)}` : 'Escolha uma opÃ§Ã£o';
  }
  return formatPrice(displayPrice ?? item.price ?? item.price_min);
}

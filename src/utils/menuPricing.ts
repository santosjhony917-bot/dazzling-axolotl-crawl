import { formatPrice } from './formatters';
import { getMenuOptionGroups } from './menuCombos';

export type MenuPriceType = 'fixed' | 'starting_at' | 'range' | 'option_only' | 'inherited' | 'included' | 'free' | 'unknown';

export interface MenuPriceLike {
  price?: number | null;
  display_price?: number | null;
  price_min?: number | null;
  price_max?: number | null;
  price_type?: MenuPriceType | string | null;
  commercial_type?: string | null;
  is_configurable?: boolean | null;
  menu_option_groups?: any[] | null;
  menuOptionGroups?: any[] | null;
  option_groups?: any[] | null;
  optionGroups?: any[] | null;
  options?: any[] | null;
  description?: string | null;
}

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(/[^\d.,-]/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const getBasePrice = (item: MenuPriceLike): number | null => (
  toNumberOrNull(item.display_price)
  ?? toNumberOrNull(item.price)
  ?? toNumberOrNull(item.price_min)
);

const getRequiredSelectionCount = (group: any): number => {
  const min = toNumberOrNull(group?.min_quantity ?? group?.min) || 0;
  if (min > 0) return min;
  return group?.is_required ? 1 : 0;
};

export const getAdditiveOptionPrice = (option: any, group: any): number => {
  const behavior = String(option?.price_behavior || group?.price_behavior || '').trim();
  if (behavior === 'included') return 0;

  const delta = toNumberOrNull(option?.price_delta ?? option?.delta);
  if (delta !== null) return Math.max(0, delta);

  const price = toNumberOrNull(option?.price);
  if (behavior === 'absolute_price' || behavior === 'option_price' || behavior === 'option_only') {
    return Math.max(0, price || 0);
  }
  if (behavior === 'price_delta' || behavior === 'addon') {
    return Math.max(0, price || 0);
  }

  return 0;
};

export interface MenuPriceSummary {
  basePrice: number | null;
  requiredMinimumAdd: number;
  minimumPrice: number | null;
  hasRequiredPriceImpact: boolean;
  hasRequiredPriceRange: boolean;
  shouldShowStartingAt: boolean;
  label: string;
}

export function getMenuPriceSummary(item: MenuPriceLike): MenuPriceSummary {
  const displayPrice = item.display_price ?? null;
  const basePrice = getBasePrice(item);
  const hasFixedPrice = displayPrice != null || item.price != null || item.price_min != null;
  const type = item.price_type || (
    item.is_configurable || item.commercial_type
      ? (hasFixedPrice ? 'fixed' : 'starting_at')
      : (hasFixedPrice ? 'fixed' : 'unknown')
  );
  const optionGroups = getMenuOptionGroups(item);
  const requiredAdds = optionGroups
    .map((group) => {
      const requiredCount = getRequiredSelectionCount(group);
      if (requiredCount <= 0) return null;

      const items = Array.isArray(group?.items)
        ? group.items
        : Array.isArray(group?.itens)
          ? group.itens
          : [];
      if (items.length === 0) return null;

      const additivePrices = items
        .map((option: any) => getAdditiveOptionPrice(option, group))
        .sort((a: number, b: number) => a - b);
      const minimumAdd = additivePrices
        .slice(0, Math.min(requiredCount, additivePrices.length))
        .reduce((sum: number, value: number) => sum + value, 0);
      const uniquePrices = new Set(additivePrices.map((value: number) => value.toFixed(2)));

      return {
        minimumAdd,
        hasPriceImpact: additivePrices.some((value: number) => value > 0),
        hasPriceRange: uniquePrices.size > 1,
      };
    })
    .filter(Boolean) as Array<{ minimumAdd: number; hasPriceImpact: boolean; hasPriceRange: boolean }>;

  const requiredMinimumAdd = requiredAdds.reduce((sum, group) => sum + group.minimumAdd, 0);
  const hasRequiredPriceImpact = requiredAdds.some((group) => group.hasPriceImpact);
  const hasRequiredPriceRange = requiredAdds.some((group) => group.hasPriceRange);
  const effectiveMinimum = basePrice != null ? basePrice + requiredMinimumAdd : null;
  const minimumPrice = effectiveMinimum ?? toNumberOrNull(displayPrice) ?? toNumberOrNull(item.price) ?? toNumberOrNull(item.price_min);

  const makeSummary = (label: string, shouldShowStartingAt = false): MenuPriceSummary => ({
    basePrice,
    requiredMinimumAdd,
    minimumPrice,
    hasRequiredPriceImpact,
    hasRequiredPriceRange,
    shouldShowStartingAt,
    label,
  });

  if (type === 'free') return makeSummary('Grátis');
  if (type === 'included') return makeSummary('Incluído no menu');
  if (type === 'unknown') return makeSummary('Preço sob consulta');

  if (type === 'fixed') {
    if (hasRequiredPriceImpact && minimumPrice != null) {
      return makeSummary(formatPrice(minimumPrice));
    }
    return makeSummary(formatPrice(displayPrice ?? item.price ?? item.price_min));
  }

  if (type === 'starting_at' || type === 'option_only') {
    if (minimumPrice == null) return makeSummary('Escolha uma opção');
    if (hasRequiredPriceImpact && basePrice != null) {
      return makeSummary(formatPrice(minimumPrice));
    }
    if (hasRequiredPriceImpact || hasRequiredPriceRange || !hasFixedPrice) {
      return makeSummary(`A partir de ${formatPrice(minimumPrice)}`, true);
    }
    return makeSummary(formatPrice(minimumPrice));
  }

  if (type === 'range') {
    if (hasRequiredPriceImpact && minimumPrice != null) {
      return makeSummary(`A partir de ${formatPrice(minimumPrice)}`, true);
    }
    if (displayPrice != null) return makeSummary(`A partir de ${formatPrice(displayPrice)}`, true);
    if (item.price_min != null && item.price_max != null && item.price_min !== item.price_max) {
      return makeSummary(`${formatPrice(item.price_min)} - ${formatPrice(item.price_max)}`, true);
    }
    return makeSummary(formatPrice(item.price_min ?? item.price));
  }

  if (type === 'inherited') {
    return makeSummary(item.price_min != null ? `${formatPrice(item.price_min)} no menu` : 'Preço definido pelo menu');
  }

  if (hasRequiredPriceImpact && minimumPrice != null && basePrice != null) {
    return makeSummary(formatPrice(minimumPrice));
  }

  if (hasRequiredPriceImpact && minimumPrice != null) {
    return makeSummary(`A partir de ${formatPrice(minimumPrice)}`, true);
  }

  return makeSummary(formatPrice(displayPrice ?? item.price ?? item.price_min));
}


export interface RequiredOptionRelativePricePreview {
  label: string;
  tone: 'included' | 'delta';
}

export function getRequiredOptionRelativePricePreview(
  item: MenuPriceLike,
  group: any,
  option: any,
): RequiredOptionRelativePricePreview | null {
  const summary = getMenuPriceSummary(item);
  const requiredCount = getRequiredSelectionCount(group);
  if (requiredCount !== 1 || !summary.hasRequiredPriceImpact || summary.basePrice === null) return null;

  const groupItems = getGroupItems(group);
  const groupPrices = groupItems.map((itemOption: any) => getAdditiveOptionPrice(itemOption, group));
  const groupHasPriceImpact = groupPrices.some((value: number) => value > 0);
  const groupHasPriceRange = new Set(groupPrices.map((value: number) => value.toFixed(2))).size > 1;
  if (!groupHasPriceImpact || !groupHasPriceRange) return null;

  const groupMinimumAdd = getGroupMinimumAdd(group);
  const optionAdd = getAdditiveOptionPrice(option, group);
  const differenceFromMinimum = Number((optionAdd - groupMinimumAdd).toFixed(2));

  if (!Number.isFinite(differenceFromMinimum) || differenceFromMinimum <= 0) {
    return { label: 'Sem acréscimo', tone: 'included' };
  }

  return { label: `+${formatPrice(differenceFromMinimum)}`, tone: 'delta' };
}
export interface RequiredOptionTotalPreview {
  total: number;
  label: string;
}

const getGroupItems = (group: any): any[] => {
  if (Array.isArray(group?.items)) return group.items;
  if (Array.isArray(group?.itens)) return group.itens;
  if (Array.isArray(group?.menu_item_options)) return group.menu_item_options;
  return [];
};

const getGroupMinimumAdd = (group: any): number => {
  const requiredCount = getRequiredSelectionCount(group);
  if (requiredCount <= 0) return 0;
  const prices = getGroupItems(group)
    .map((option: any) => getAdditiveOptionPrice(option, group))
    .sort((a: number, b: number) => a - b);
  return prices
    .slice(0, Math.min(requiredCount, prices.length))
    .reduce((sum: number, value: number) => sum + value, 0);
};

export function getRequiredOptionTotalPreview(
  item: MenuPriceLike,
  group: any,
  option: any,
): RequiredOptionTotalPreview | null {
  const summary = getMenuPriceSummary(item);
  const requiredCount = getRequiredSelectionCount(group);
  if (requiredCount !== 1 || !summary.hasRequiredPriceImpact || summary.basePrice === null) return null;

  const groupItems = getGroupItems(group);
  const groupPrices = groupItems.map((itemOption: any) => getAdditiveOptionPrice(itemOption, group));
  const groupHasPriceImpact = groupPrices.some((value: number) => value > 0);
  const groupHasPriceRange = new Set(groupPrices.map((value: number) => value.toFixed(2))).size > 1;
  if (!groupHasPriceImpact || !groupHasPriceRange) return null;

  const groupMinimumAdd = getGroupMinimumAdd(group);
  const optionAdd = getAdditiveOptionPrice(option, group);
  const total = summary.basePrice + (summary.requiredMinimumAdd - groupMinimumAdd) + optionAdd;
  if (!Number.isFinite(total)) return null;

  return {
    total,
    label: `Total mínimo com esta escolha: ${formatPrice(total)}`,
  };
}
export function formatMenuPrice(item: MenuPriceLike): string {
  return getMenuPriceSummary(item).label;
}

/**
 * Formats a number with locale-specific separators.
 * @param num The number to format.
 * @returns The formatted string.
 */
export const formatNumber = (num: number): string => {
  if (num === undefined || num === null) return '0';
  return num.toLocaleString('pt-BR');
};

/**
 * Formats a price number into currency format (R$).
 * @param price The price to format.
 * @returns The formatted currency string.
 */
export const formatPrice = (price: number | null | undefined): string => {
  if (price === undefined || price === null) return 'Preço sob consulta';
  return price.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

export type RestaurantNameCleanupContext = {
  city?: string | null;
  state?: string | null;
  neighborhood?: string | null;
};

export type RestaurantNameCleanupResult = {
  rawName: string;
  displayName: string;
  removedSuffixes: string[];
  cleanupReason: string | null;
  changed: boolean;
};

const normalizeLooseText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const KNOWN_LOCATION_SUFFIXES = new Set([
  'jose americo', 'cristo redentor', 'cruz das armas', 'portal do sol',
  'jardim cidade universitaria', 'ernani satiro', 'mangabeira', 'gramame',
  'sao jose', 'cuia', 'roger', 'bancarios', 'anatolia', 'manaira',
  'aeroclube', 'centro', 'bairro dos estados', 'torre', 'agua fria',
  'geisel', 'tambau', 'miramar', 'cabo branco', 'joao pessoa', 'estados',
  'bessa', 'altiplano', 'valentina', 'castelo branco', 'jardim oceania',
  'jaguaribe', 'mandacaru', 'padre ze', 'varadouro', 'alto do mateus',
  'ilha do bispo', 'oitizeiro', 'bairro das industrias', 'mussumago',
  'colinas do sul', 'paratibe', 'planalto da boa esperanca', 'cidade verde',
  'penha', 'seixas', 'ponte de terra', 'grotas', 'jacare', 'intermares',
  'tambauzinho', 'expedicionarios', 'ipes', 'treze de maio',
  'distrito industrial', 'campina grande', 'catole', 'bodocongo',
  'malvinas', 'liberdade', 'alto branco', 'sao jose da mata',
  'recife', 'boa viagem', 'santo amaro', 'sao paulo', 'rio de janeiro',
]);

const BUSINESS_SUFFIX_PATTERNS = [
  /\b(o melhor|a melhor|os melhores|as melhores|melhor)\b/,
  /\b(delivery|entrega|tele entrega|disk entrega|pedido online|peca online|peça online)\b/,
  /\b(cardapio|cardápio|menu|whatsapp|ifood)\b/,
  /\b(rodizio|rodízio|self service|buffet|comida caseira)\b/,
  /\b(em|na|no|de)\s+[a-z0-9\s]{3,}\b/,
];

const GENERIC_GOOGLE_SUFFIX_PATTERNS = [
  /^delivery\s+de\s+/,
  /^o\s+melhor\s+/,
  /^a\s+melhor\s+/,
  /^melhor\s+/,
  /^restaurante\s+em\s+/,
  /^pizzaria\s+em\s+/,
  /^hamburgueria\s+em\s+/,
  /^lanchonete\s+em\s+/,
  /^comida\s+/,
];

const contextTokens = (context?: RestaurantNameCleanupContext) =>
  [context?.city, context?.state, context?.neighborhood]
    .map(value => normalizeLooseText(String(value || '')))
    .filter(value => value.length >= 2);

const isGoogleBusinessSuffix = (
  suffix: string,
  context?: RestaurantNameCleanupContext,
): boolean => {
  const normalized = normalizeLooseText(suffix);
  if (!normalized) return true;

  const tokens = contextTokens(context);
  if (tokens.some(token => normalized === token || normalized.includes(token))) return true;
  if (KNOWN_LOCATION_SUFFIXES.has(normalized)) return true;
  if (GENERIC_GOOGLE_SUFFIX_PATTERNS.some(pattern => pattern.test(normalized))) return true;

  const hasMarketingSignal = BUSINESS_SUFFIX_PATTERNS.some(pattern => pattern.test(normalized));
  const hasLocationSignal = /\b(em|na|no|de)\s+[a-z0-9\s]{3,}\b/.test(normalized)
    || [...KNOWN_LOCATION_SUFFIXES].some(location => normalized.includes(location));

  return hasMarketingSignal && hasLocationSignal;
};

/**
 * Normalizes Google Maps/SEO restaurant names for public display while keeping
 * the raw Maps name available for audit.
 *
 * Examples:
 * - "La Migliore - O melhor rodízio de Campina Grande" -> "La Migliore"
 * - "Brazile Pizzaria - Delivery de Pizza em Campina Grande" -> "Brazile Pizzaria"
 * - "Domino's Pizza - Campina Grande" -> "Domino's Pizza"
 */
export const normalizeRestaurantDisplayName = (
  name: string,
  context?: RestaurantNameCleanupContext,
): RestaurantNameCleanupResult => {
  const rawName = String(name || '').replace(/\s+/g, ' ').trim();
  if (!rawName) {
    return {
      rawName: '',
      displayName: 'Sem Nome',
      removedSuffixes: [],
      cleanupReason: null,
      changed: false,
    };
  }

  const normalizedDashName = rawName
    .replace(/\s*[–—]\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();

  const parts = normalizedDashName.split(/\s+-\s+/).map(part => part.trim()).filter(Boolean);
  const removedSuffixes: string[] = [];
  let displayName = normalizedDashName;

  if (parts.length >= 2) {
    let keepUntil = parts.length;
    while (keepUntil > 1 && isGoogleBusinessSuffix(parts[keepUntil - 1], context)) {
      removedSuffixes.unshift(parts[keepUntil - 1]);
      keepUntil -= 1;
    }
    displayName = parts.slice(0, keepUntil).join(' - ').trim();
  }

  const cityTokens = contextTokens(context).filter(token => token.length > 2);
  if (cityTokens.length && removedSuffixes.length === 0) {
    const locationTail = new RegExp(`\\s+(em|na|no)\\s+(${cityTokens.map(token => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\s*$`, 'i');
    const withoutLocationTail = displayName.replace(locationTail, '').trim();
    if (withoutLocationTail.length >= 3 && withoutLocationTail !== displayName) {
      removedSuffixes.push(displayName.slice(withoutLocationTail.length).trim());
      displayName = withoutLocationTail;
    }
  }

  if (displayName.length < 3) displayName = rawName;

  const changed = normalizeLooseText(displayName) !== normalizeLooseText(rawName);

  return {
    rawName,
    displayName,
    removedSuffixes,
    cleanupReason: removedSuffixes.length ? `Removido complemento do Google Maps: ${removedSuffixes.join(' | ')}` : null,
    changed,
  };
};

/**
 * Sanitizes a restaurant name by removing trailing Google Maps/SEO complements.
 * @param name The restaurant name to sanitize.
 * @returns The sanitized restaurant name.
 */
export const cleanRestaurantName = (
  name: string,
  context?: RestaurantNameCleanupContext,
): string => normalizeRestaurantDisplayName(name, context).displayName;

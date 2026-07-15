import { MenuSearchIntentSchema } from './schema.ts';
import type {
  MenuSearchIntent,
  MenuSearchIntentPatch,
  MenuSearchLocation,
  MenuSearchOccasion,
  MenuSearchRestriction,
  MenuSearchSort,
} from './types.ts';

const STOP_WORDS = new Set([
  'a',
  'ao',
  'aos',
  'as',
  'ate',
  'com',
  'da',
  'das',
  'de',
  'do',
  'dos',
  'e',
  'em',
  'eu',
  'me',
  'na',
  'nas',
  'no',
  'nos',
  'o',
  'os',
  'ou',
  'para',
  'por',
  'pra',
  'pro',
  'quero',
  'queria',
  'que',
  'comer',
  'pedir',
  'achar',
  'encontrar',
  'uma',
  'um',
]);

const CATEGORY_ALIASES: Array<[string, string]> = [
  ['hamburgueria', 'Hamburgueria'],
  ['hamburguer', 'Hamburgueria'],
  ['sanduiche', 'Hamburgueria'],
  ['x burguer', 'Hamburgueria'],
  ['x-burguer', 'Hamburgueria'],
  ['x burger', 'Hamburgueria'],
  ['xburger', 'Hamburgueria'],
  ['burger', 'Hamburgueria'],
  ['lanche', 'Hamburgueria'],
  ['pizzaria', 'Pizzaria'],
  ['pizza', 'Pizzaria'],
  ['japonesa', 'Japonesa'],
  ['temaki', 'Japonesa'],
  ['sushi', 'Japonesa'],
  ['japa', 'Japonesa'],
  ['cafeteria', 'Cafeteria'],
  ['cafe', 'Cafeteria'],
  ['churrascaria', 'Churrascaria'],
  ['churrasco', 'Churrascaria'],
  ['doceria', 'Doceria / Sobremesas'],
  ['sobremesa', 'Doceria / Sobremesas'],
  ['sorveteria', 'Açaí / Sorveteria'],
  ['sorvete', 'Açaí / Sorveteria'],
  ['acai', 'Açaí / Sorveteria'],
  ['saudavel', 'Saudável / Fit'],
  ['vegetariano', 'Saudável / Fit'],
  ['vegano', 'Saudável / Fit'],
  ['salada', 'Saudável / Fit'],
  ['fit', 'Saudável / Fit'],
  ['italiana', 'Italiana'],
  ['massa', 'Italiana'],
  ['macarrao', 'Italiana'],
  ['brasileira', 'Brasileira'],
  ['marmita', 'Brasileira'],
  ['restaurante', 'Restaurante'],
];

const NEIGHBORHOOD_ALIASES: Array<[string, string]> = [
  ['bairro dos estados', 'Bairro dos Estados'],
  ['cidade universitaria', 'Cidade Universitária'],
  ['jardim oceania', 'Jardim Oceania'],
  ['cabo branco', 'Cabo Branco'],
  ['castelo branco', 'Castelo Branco'],
  ['portal do sol', 'Portal do Sol'],
  ['jose americo', 'José Américo'],
  ['ernesto geisel', 'Geisel'],
  ['padre ze', 'Padre Zé'],
  ['expedicionarios', 'Expedicionários'],
  ['tambauzinho', 'Tambauzinho'],
  ['mangabeira', 'Mangabeira'],
  ['mandacaru', 'Mandacaru'],
  ['bancarios', 'Bancários'],
  ['altiplano', 'Altiplano'],
  ['aeroclube', 'Aeroclube'],
  ['jaguaribe', 'Jaguaribe'],
  ['valentina', 'Valentina'],
  ['manaira', 'Manaíra'],
  ['miramar', 'Miramar'],
  ['tambau', 'Tambaú'],
  ['tambia', 'Tambiá'],
  ['bessa', 'Bessa'],
  ['geisel', 'Geisel'],
  ['roger', 'Roger'],
  ['torre', 'Torre'],
  ['centro', 'Centro'],
];

const REGION_ALIASES: Array<[string, string]> = [
  ['zona sul', 'zona_sul'],
  ['centro norte', 'centro_norte'],
  ['zona norte', 'centro_norte'],
  ['orla', 'orla'],
  ['praia', 'orla'],
];

const CITY_ALIASES: Array<[string, string]> = [
  ['campina grande', 'Campina Grande'],
  ['joao pessoa', 'João Pessoa'],
  ['cabedelo', 'Cabedelo'],
  ['bayeux', 'Bayeux'],
];

const NUMBER_WORDS: Record<string, number> = {
  uma: 1,
  um: 1,
  duas: 2,
  dois: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
};

export function normalizeMenuSearchText(value: string): string {
  return value
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s.,$-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeToken(value: string): string {
  return normalizeMenuSearchText(value)
    .replace(/[.,$]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function parseMoney(value: string): number | null {
  const compact = value.replace(/\s/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
  const parsed = Number(compact);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function blankMatch(source: string, match: RegExpMatchArray): string {
  if (match.index === undefined) return source;
  return `${source.slice(0, match.index)} ${source.slice(match.index + match[0].length)}`;
}

function findContextualLocationAlias(
  source: string,
  aliases: Array<[string, string]>,
): [string, string] | null {
  const locationCue = '(?:em|no|na|nos|nas|perto de|proximo a|proximo de|na cidade de|em cidade de)';
  return (
    aliases
      .slice()
      .sort((a, b) => b[0].length - a[0].length)
      .find(([alias]) =>
        new RegExp(`\\b${locationCue}\\s+(?:o|a|os|as)?\\s*${escapeRegExp(alias)}\\b`, 'i').test(
          source,
        ),
      ) ?? null
  );
}

function removeAlias(source: string, alias: string): string {
  return source.replace(new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'gi'), ' ');
}

function extractPrices(source: string): {
  source: string;
  priceMin: number | null;
  priceMax: number | null;
} {
  let working = source;
  let priceMin: number | null = null;
  let priceMax: number | null = null;
  const amount = '(\\d{1,3}(?:\\.\\d{3})+(?:,\\d{1,2})?|\\d{1,5}(?:[.,]\\d{1,2})?)';
  const currencySuffix = '\\s*(?:reais?|r\\$)?';

  const rangePattern = new RegExp(
    `\\b(?:entre|de)\\s*(?:r\\$\\s*)?${amount}\\s*(?:e|a|ate)\\s*(?:r\\$\\s*)?${amount}${currencySuffix}\\b`,
    'i',
  );
  const range = working.match(rangePattern);
  if (range) {
    priceMin = parseMoney(range[1]);
    priceMax = parseMoney(range[2]);
    working = blankMatch(working, range);
  }

  // Mínimos precisam ser extraídos antes do fallback "N reais"; caso
  // contrário, "a partir de 35 reais" seria interpretado como teto de 35.
  if (priceMin === null) {
    const minPattern = new RegExp(
      `\\b(?:a partir de|acima de|mais de)\\s*(?:r\\$\\s*)?${amount}${currencySuffix}`,
      'i',
    );
    const minMatch = working.match(minPattern);
    if (minMatch) {
      priceMin = parseMoney(minMatch[1]);
      working = blankMatch(working, minMatch);
    }
  }

  if (priceMax === null) {
    const maxPatterns = [
      new RegExp(
        `\\b(?:ate|no maximo|maximo de|limite de|orcamento(?:\\s+de)?|(?:gastar|gastando|pagar)(?:\\s+(?:ate|no maximo))?)\\s*(?:r\\$\\s*)?${amount}${currencySuffix}`,
        'i',
      ),
      new RegExp(`\\b(?:por menos de|abaixo de)\\s*(?:r\\$\\s*)?${amount}${currencySuffix}`, 'i'),
      new RegExp(`(?:r\\$\\s*)${amount}`, 'i'),
      new RegExp(`${amount}\\s*(?:reais|real)\\b`, 'i'),
    ];
    for (const pattern of maxPatterns) {
      const match = working.match(pattern);
      if (!match) continue;
      priceMax = parseMoney(match[1]);
      working = blankMatch(working, match);
      break;
    }
  }

  if (priceMin !== null && priceMax !== null && priceMin > priceMax) {
    [priceMin, priceMax] = [priceMax, priceMin];
  }

  return { source: working, priceMin, priceMax };
}

function extractPeople(source: string): { source: string; people: number | null } {
  let working = source;
  let people: number | null = null;

  const numericMatch = working.match(
    /\b(?:(?:para|pra)\s+)?(\d{1,3})\s*(?:pessoas?|convidados?)\b/i,
  );
  if (numericMatch) {
    const parsed = Number(numericMatch[1]);
    people = parsed > 0 && parsed <= 100 ? parsed : null;
    working = blankMatch(working, numericMatch);
  }

  if (people === null) {
    const collectiveMatch = working.match(
      /\b(?:somos|(?:para|pra)\s+(?:um\s+)?grupo\s+de|grupo\s+de)\s*(\d{1,3})\b/i,
    );
    if (collectiveMatch) {
      const parsed = Number(collectiveMatch[1]);
      people = parsed > 0 && parsed <= 100 ? parsed : null;
      working = blankMatch(working, collectiveMatch);
    }
  }

  if (people === null) {
    const bareNumericMatch = working.match(
      /\b(?:para|pra|pro)\s+(\d{1,3})(?=\s*(?:$|[,.;]|ate\b|com\b|sem\b|vegano\b|vegetariano\b|no\b|na\b|em\b|perto\b|proximo\b|barato\b|economico\b))/i,
    );
    if (bareNumericMatch) {
      const parsed = Number(bareNumericMatch[1]);
      people = parsed > 0 && parsed <= 100 ? parsed : null;
      working = blankMatch(working, bareNumericMatch);
    }
  }

  if (people === null) {
    const wordMatch = working.match(
      /\b(?:(?:para|pra)\s+)?(uma|um|duas|dois|tres|quatro|cinco|seis|sete|oito|nove|dez)\s+pessoas?\b/i,
    );
    if (wordMatch) {
      people = NUMBER_WORDS[wordMatch[1].toLowerCase()] ?? null;
      working = blankMatch(working, wordMatch);
    }
  }

  const semanticPeople: Array<[RegExp, number]> = [
    [/\b(?:sozinho|so eu|individual)\b/i, 1],
    [/\b(?:casal|dupla|com minha esposa|com meu marido|com meu namorado|com minha namorada)\b/i, 2],
  ];
  if (people === null) {
    const semantic = semanticPeople.find(([pattern]) => pattern.test(working));
    if (semantic) {
      const match = working.match(semantic[0]);
      people = semantic[1];
      if (match) working = blankMatch(working, match);
    }
  }

  return { source: working, people };
}

function extractRestrictions(source: string): {
  source: string;
  restrictions: MenuSearchRestriction[];
  excludedIngredients: string[];
} {
  let working = source;
  const restrictions: MenuSearchRestriction[] = [];
  const excludedIngredients: string[] = [];
  const known: Array<[RegExp, MenuSearchRestriction, string | null]> = [
    [/\b(?:sem gluten|gluten free)\b/gi, 'gluten_free', 'gluten'],
    [/\b(?:sem lactose|zero lactose)\b/gi, 'lactose_free', 'lactose'],
    [/\b(?:sem acucar|zero acucar)\b/gi, 'sugar_free', 'acucar'],
    [/\b(?:vegano|vegana)\b/gi, 'vegan', null],
    [/\b(?:vegetariano|vegetariana)\b/gi, 'vegetarian', null],
  ];

  for (const [pattern, restriction, excluded] of known) {
    if (!pattern.test(working)) continue;
    restrictions.push(restriction);
    if (excluded) excludedIngredients.push(excluded);
    pattern.lastIndex = 0;
    working = working.replace(pattern, ' ');
  }

  // O parser registra a exclusão pedida, mas o motor não conclui que um item é
  // seguro apenas porque a descrição não menciona o ingrediente.
  const ingredientPhrase = '[a-z]{3,}(?:(?:\\s+(?:do|da|de)\\s+[a-z]{3,})|(?:\\s+[a-z]{3,})){0,2}';
  const withoutList = new RegExp(
    `\\bsem\\s+(${ingredientPhrase})\\s+e\\s+(?!sem\\b)(${ingredientPhrase})(?=\\s*(?:[,;]|$|\\bcom\\b|\\bate\\b|\\bpara\\b|\\bpor\\b))`,
    'gi',
  );
  working = working.replace(withoutList, (_full, first: string, second: string) => {
    const normalizedFirst = normalizeToken(first);
    const normalizedSecond = normalizeToken(second);
    if (normalizedFirst) excludedIngredients.push(normalizedFirst);
    if (normalizedSecond) excludedIngredients.push(normalizedSecond);
    return ' ';
  });

  const genericWithout = new RegExp(
    `\\bsem\\s+(${ingredientPhrase})(?=\\s*(?:[,;]|$|\\be\\s+sem\\b|\\bsem\\b|\\bcom\\b|\\bate\\b|\\bpara\\b|\\bpor\\b|\\bno\\b|\\bna\\b|\\bem\\b))`,
    'gi',
  );
  working = working.replace(genericWithout, (_full, ingredient: string) => {
    const normalized = normalizeToken(ingredient);
    if (normalized) excludedIngredients.push(normalized);
    return ' ';
  });

  const explicitNegation = new RegExp(
    `\\b(?:nao\\s+quero|nao\\s+pode\\s+ter|tirar|retirar)\\s+(${ingredientPhrase})(?=\\s*(?:[,;]|$|\\bcom\\b|\\bate\\b|\\bpara\\b|\\bpor\\b|\\bno\\b|\\bna\\b|\\bem\\b))`,
    'gi',
  );
  working = working.replace(explicitNegation, (_full, ingredient: string) => {
    const normalized = normalizeToken(ingredient);
    if (normalized) excludedIngredients.push(normalized);
    return ' ';
  });

  return {
    source: working,
    restrictions: unique(restrictions),
    excludedIngredients: unique(excludedIngredients),
  };
}

function extractOccasion(source: string): { source: string; occasion: MenuSearchOccasion | null } {
  // Contextos sociais têm precedência quando a frase também contém a refeição:
  // "jantar em família" descreve melhor family do que apenas dinner.
  const aliases: Array<[RegExp, MenuSearchOccasion]> = [
    [/\b(?:reuniao de trabalho|trabalho)\b/i, 'work'],
    [/\b(?:festa|aniversario|comemoracao)\b/i, 'party'],
    [/\b(?:encontro(?:\s+romantico)?|date|romantico)\b/i, 'date'],
    [/\b(?:em familia|familia)\b/i, 'family'],
    [/\b(?:com amigos|galera)\b/i, 'friends'],
    [/\b(?:cafe da manha|cafe matinal)\b/i, 'breakfast'],
    [/\b(?:almoco|almocar)\b/i, 'lunch'],
    [/\b(?:jantar|janta)\b/i, 'dinner'],
  ];
  const found = aliases.find(([pattern]) => pattern.test(source));
  if (!found) return { source, occasion: null };
  const cleanedSource = aliases.reduce((working, [pattern]) => working.replace(pattern, ' '), source);
  return { source: cleanedSource, occasion: found[1] };
}

function extractSort(source: string): { source: string; sort: MenuSearchSort } {
  const aliases: Array<[RegExp, MenuSearchSort]> = [
    [/\b(?:mais barato|mais barata|menor preco|preco menor)\b/i, 'price_asc'],
    [/\b(?:mais caro|mais cara|maior preco|preco maior)\b/i, 'price_desc'],
    [/\b(?:mais perto|mais proximo|proximo de mim|perto de mim)\b/i, 'distance'],
  ];
  const found = aliases.find(([pattern]) => pattern.test(source));
  if (!found) return { source, sort: 'relevance' };
  return { source: source.replace(found[0], ' '), sort: found[1] };
}

function extractLocation(source: string): { source: string; location: MenuSearchLocation | null } {
  let working = source;
  const neighborhoodAlias = findContextualLocationAlias(working, NEIGHBORHOOD_ALIASES);
  const cityAlias = findContextualLocationAlias(working, CITY_ALIASES);
  const regionAlias = findContextualLocationAlias(working, REGION_ALIASES);

  if (neighborhoodAlias) working = removeAlias(working, neighborhoodAlias[0]);
  if (cityAlias) working = removeAlias(working, cityAlias[0]);
  if (regionAlias) working = removeAlias(working, regionAlias[0]);
  if (!neighborhoodAlias && !cityAlias && !regionAlias) return { source: working, location: null };

  return {
    source: working.replace(
      /\b(?:no bairro|na cidade de|em cidade de|na praia|perto de|proximo a|proximo de|em|nos|nas|no|na)\b/gi,
      ' ',
    ),
    location: {
      latitude: null,
      longitude: null,
      // Preserve the most specific human label while retaining the city as a
      // separate structured field (for example, "Bessa em João Pessoa").
      label: neighborhoodAlias?.[1] ?? regionAlias?.[1] ?? cityAlias?.[1] ?? null,
      neighborhood: neighborhoodAlias?.[1] ?? null,
      regionId: regionAlias?.[1] ?? null,
      city: cityAlias?.[1] ?? null,
      state: null,
      radiusKm: null,
      source: 'manual',
    },
  };
}

function extractCategories(source: string): { source: string; categories: string[] } {
  let working = source;
  const categories: string[] = [];
  for (const [alias, category] of CATEGORY_ALIASES.slice().sort((a, b) => b[0].length - a[0].length)) {
    if (!new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'i').test(working)) continue;
    categories.push(category);
    working = removeAlias(working, alias);
  }
  return { source: working, categories: unique(categories) };
}

function extractIngredients(source: string): { source: string; ingredients: string[] } {
  const ingredients: string[] = [];
  const ingredientPhrase = '[a-z]{3,}(?:(?:\\s+(?:do|da|de)\\s+[a-z]{3,})|(?:\\s+[a-z]{3,})){0,2}';
  const withIngredientList = new RegExp(
    `\\bcom\\s+(${ingredientPhrase})\\s+e\\s+(${ingredientPhrase})(?=\\s*(?:[,;]|$|\\bsem\\b|\\bate\\b|\\bpara\\b|\\bpor\\b|\\bno\\b|\\bna\\b|\\bem\\b))`,
    'gi',
  );
  let working = source.replace(withIngredientList, (_full, first: string, second: string) => {
    const normalizedFirst = normalizeToken(first);
    const normalizedSecond = normalizeToken(second);
    if (normalizedFirst) ingredients.push(normalizedFirst);
    if (normalizedSecond) ingredients.push(normalizedSecond);
    return ' ';
  });

  const withIngredient = new RegExp(
    `\\bcom\\s+(${ingredientPhrase})(?=\\s*(?:[,;]|$|\\bsem\\b|\\bate\\b|\\bpara\\b|\\bpor\\b|\\bno\\b|\\bna\\b|\\bem\\b))`,
    'gi',
  );
  working = working.replace(withIngredient, (_full, ingredient: string) => {
    const normalized = normalizeToken(ingredient);
    if (normalized) ingredients.push(normalized);
    return ' ';
  });
  return { source: working, ingredients: unique(ingredients) };
}

function cleanDishTerms(source: string): string[] {
  return unique(
    normalizeToken(source)
      .split(' ')
      .map((token) => token.trim())
      .filter((token) => token.length >= 2 && !STOP_WORDS.has(token) && !/^\d+$/.test(token)),
  ).slice(0, 16);
}

function mergeLocation(
  parsed: MenuSearchLocation | null,
  patch: MenuSearchIntentPatch['location'] | undefined,
): MenuSearchLocation | null {
  if (patch === undefined) return parsed;
  return patch;
}

export function parseMenuSearchIntent(
  input: string,
  patch: MenuSearchIntentPatch = {},
): MenuSearchIntent {
  const rawText = String(input ?? '').trim().slice(0, 500);
  const normalizedText = normalizeMenuSearchText(rawText);
  let working = normalizedText;

  const prices = extractPrices(working);
  working = prices.source;
  const people = extractPeople(working);
  working = people.source;
  const restrictions = extractRestrictions(working);
  working = restrictions.source;
  const occasion = extractOccasion(working);
  working = occasion.source;
  const sort = extractSort(working);
  working = sort.source;
  const location = extractLocation(working);
  working = location.source;
  const categories = extractCategories(working);
  working = categories.source;
  const ingredients = extractIngredients(working);
  working = ingredients.source;

  const dishTerms = cleanDishTerms(working);
  const searchTerms = unique([...dishTerms, ...ingredients.ingredients]);
  const fallbackCategoryTerm = categories.categories[0]?.split(/\s|\//)[0] ?? '';
  const searchText = searchTerms.join(' ') || normalizeToken(fallbackCategoryTerm);

  const parsed: MenuSearchIntent = {
    version: 1,
    rawText,
    normalizedText,
    searchText,
    dishTerms,
    ingredients: ingredients.ingredients,
    excludedIngredients: restrictions.excludedIngredients,
    priceMin: prices.priceMin,
    priceMax: prices.priceMax,
    people: people.people,
    categories: categories.categories,
    restrictions: restrictions.restrictions,
    occasion: occasion.occasion,
    location: location.location,
    sort: sort.sort,
  };

  return MenuSearchIntentSchema.parse({
    ...parsed,
    ...patch,
    version: 1,
    rawText,
    normalizedText,
    location: mergeLocation(parsed.location, patch.location),
  }) as MenuSearchIntent;
}

export function applyMenuSearchIntentPatch(
  intent: MenuSearchIntent,
  patch: MenuSearchIntentPatch,
): MenuSearchIntent {
  return MenuSearchIntentSchema.parse({ ...intent, ...patch, version: 1 }) as MenuSearchIntent;
}

export function buildDeterministicQueryVariants(intent: MenuSearchIntent): string[] {
  const normalizedPrimary = normalizeToken(intent.searchText);
  const dish = normalizeToken(intent.dishTerms.join(' '));
  const ingredients = normalizeToken(intent.ingredients.join(' '));
  const categoryTokens = intent.categories
    .flatMap((category) => normalizeToken(category).split(/\s+/))
    .filter((token) => token.length >= 3 && !['sobremesas', 'saudavel'].includes(token));

  return unique(
    [
      normalizedPrimary,
      normalizeToken([dish, ingredients].filter(Boolean).join(' ')),
      normalizeToken([categoryTokens[0], dish].filter(Boolean).join(' ')),
      dish,
      ingredients,
    ].filter((query) => query.length >= 2),
  ).slice(0, 5);
}

export function menuIntentCacheKey(intent: MenuSearchIntent): string {
  const stable = {
    searchText: intent.searchText,
    ingredients: intent.ingredients,
    excludedIngredients: intent.excludedIngredients,
    priceMin: intent.priceMin,
    priceMax: intent.priceMax,
    people: intent.people,
    categories: intent.categories,
    restrictions: intent.restrictions,
    occasion: intent.occasion,
    location: intent.location,
    sort: intent.sort,
  };
  return JSON.stringify(stable);
}

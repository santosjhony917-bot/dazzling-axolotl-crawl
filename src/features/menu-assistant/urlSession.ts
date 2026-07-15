import { z } from 'zod';

import { parseMenuSearchIntent } from './parser.ts';
import {
  MenuCoverageSchema,
  MenuDiscoveryResultSchema,
  MenuSearchIntentSchema,
} from './schema.ts';
import type {
  MenuCoverage,
  MenuDiscoveryResult,
  MenuSearchIntent,
  MenuSearchIntentPatch,
} from './types.ts';

export const MENU_DISCOVERY_SESSION_KEY = 'filterfood:menu-discovery:v1';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface StoredMenuDiscoverySnapshot {
  version: 1;
  savedAt: string;
  intent: MenuSearchIntent;
  results: MenuDiscoveryResult[];
  coverage: MenuCoverage | null;
  usedAI: boolean;
  queriesUsed: string[];
  hasMore: boolean;
}

const StoredMenuDiscoverySnapshotSchema = z
  .object({
    version: z.literal(1),
    savedAt: z.string().datetime({ offset: true }),
    intent: MenuSearchIntentSchema,
    results: z.array(MenuDiscoveryResultSchema).max(50),
    coverage: MenuCoverageSchema.nullable(),
    usedAI: z.boolean(),
    queriesUsed: z.array(z.string().trim().min(1).max(120)).max(6),
    hasMore: z.boolean(),
  })
  .strict();

function finiteParam(params: URLSearchParams, key: string): number | null | undefined {
  if (!params.has(key)) return undefined;
  const raw = params.get(key);
  if (raw === null || raw.trim() === '') return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function listParams(params: URLSearchParams, key: string): string[] | undefined {
  if (!params.has(key)) return undefined;
  const values = params
    .getAll(key)
    .map((value) => value.trim())
    .filter(Boolean);
  return [...new Set(values)];
}

/** Converte a intenção em parâmetros legíveis e compartilháveis, sem resultados. */
export function menuIntentToSearchParams(intent: MenuSearchIntent): URLSearchParams {
  const params = new URLSearchParams();
  const parsedFromRawText = parseMenuSearchIntent(intent.rawText);
  if (intent.rawText) params.set('q', intent.rawText);

  const setNullableNumber = (
    key: 'min' | 'max' | 'people',
    value: number | null,
    parsedValue: number | null,
  ) => {
    if (value !== null) params.set(key, String(value));
    else if (parsedValue !== null) params.set(key, '');
  };
  const setList = (key: 'cat' | 'restriction' | 'without', values: string[], parsedValues: string[]) => {
    if (values.length > 0) values.forEach((value) => params.append(key, value));
    else if (parsedValues.length > 0) params.set(key, '');
  };

  setNullableNumber('min', intent.priceMin, parsedFromRawText.priceMin);
  setNullableNumber('max', intent.priceMax, parsedFromRawText.priceMax);
  setNullableNumber('people', intent.people, parsedFromRawText.people);
  setList('cat', intent.categories, parsedFromRawText.categories);
  setList('restriction', intent.restrictions, parsedFromRawText.restrictions);
  setList('without', intent.excludedIngredients, parsedFromRawText.excludedIngredients);

  if (intent.occasion) params.set('occasion', intent.occasion);
  else if (parsedFromRawText.occasion) params.set('occasion', '');
  if (intent.sort !== 'relevance' || parsedFromRawText.sort !== 'relevance') {
    params.set('sort', intent.sort);
  }

  const location = intent.location;
  if (location) {
    if (location.latitude !== null && location.longitude !== null) {
      params.set('lat', String(location.latitude));
      params.set('lng', String(location.longitude));
    }
    if (location.label) params.set('location', location.label);
    if (location.neighborhood) params.set('neighborhood', location.neighborhood);
    if (location.regionId) params.set('region', location.regionId);
    if (location.city) params.set('city', location.city);
    if (location.state) params.set('state', location.state);
    if (location.radiusKm !== null) params.set('radius', String(location.radiusKm));
    if (location.source) params.set('locationSource', location.source);
  } else if (parsedFromRawText.location) {
    // Sem esse marcador, o bairro/região removido voltaria ao reprocessar `q`.
    params.set('locationCleared', '1');
  }
  return params;
}

export function menuIntentFromSearchParams(
  input: URLSearchParams | string,
): MenuSearchIntent | null {
  const params = typeof input === 'string' ? new URLSearchParams(input.replace(/^\?/, '')) : input;
  const rawText = params.get('q')?.trim() ?? '';
  if (!rawText && !params.has('cat')) return null;

  const base = parseMenuSearchIntent(rawText);
  const patch: MenuSearchIntentPatch = {};
  const priceMin = finiteParam(params, 'min');
  const priceMax = finiteParam(params, 'max');
  const people = finiteParam(params, 'people');
  const categories = listParams(params, 'cat');
  const restrictions = listParams(params, 'restriction');
  const excludedIngredients = listParams(params, 'without');

  if (priceMin !== undefined) patch.priceMin = priceMin;
  if (priceMax !== undefined) patch.priceMax = priceMax;
  if (people !== undefined) patch.people = people;
  if (categories !== undefined) patch.categories = categories;
  if (excludedIngredients !== undefined) patch.excludedIngredients = excludedIngredients;
  if (restrictions !== undefined) patch.restrictions = restrictions as MenuSearchIntent['restrictions'];
  if (params.has('occasion')) {
    patch.occasion = (params.get('occasion')?.trim() || null) as MenuSearchIntent['occasion'];
  }
  if (params.has('sort')) patch.sort = params.get('sort') as MenuSearchIntent['sort'];

  const hasLocation = ['lat', 'lng', 'location', 'neighborhood', 'region', 'city', 'state', 'radius', 'locationSource'].some((key) =>
    params.has(key),
  );
  if (params.get('locationCleared') === '1') {
    patch.location = null;
  } else if (hasLocation) {
    patch.location = {
      latitude: finiteParam(params, 'lat') ?? null,
      longitude: finiteParam(params, 'lng') ?? null,
      label: params.get('location')?.trim() || null,
      neighborhood: params.get('neighborhood')?.trim() || null,
      regionId: params.get('region')?.trim() || null,
      city: params.get('city')?.trim() || null,
      state: params.get('state')?.trim() || null,
      radiusKm: finiteParam(params, 'radius') ?? null,
      source: (params.get('locationSource') as NonNullable<MenuSearchIntent['location']>['source']) || 'url',
    };
  }

  const candidate = { ...base, ...patch };
  const parsed = MenuSearchIntentSchema.safeParse(candidate);
  return parsed.success ? (parsed.data as MenuSearchIntent) : null;
}

export function buildMenuAssistantHref(pathname: string, intent: MenuSearchIntent): string {
  const query = menuIntentToSearchParams(intent).toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function saveMenuDiscoverySnapshot(
  storage: StorageLike | null | undefined,
  snapshot: StoredMenuDiscoverySnapshot,
): boolean {
  if (!storage) return false;
  const parsed = StoredMenuDiscoverySnapshotSchema.safeParse(snapshot);
  if (!parsed.success) return false;
  try {
    storage.setItem(MENU_DISCOVERY_SESSION_KEY, JSON.stringify(parsed.data));
    return true;
  } catch {
    return false;
  }
}

export function loadMenuDiscoverySnapshot(
  storage: StorageLike | null | undefined,
): StoredMenuDiscoverySnapshot | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(MENU_DISCOVERY_SESSION_KEY);
    if (!raw) return null;
    const parsedJson: unknown = JSON.parse(raw);
    const parsed = StoredMenuDiscoverySnapshotSchema.safeParse(parsedJson);
    return parsed.success ? (parsed.data as StoredMenuDiscoverySnapshot) : null;
  } catch {
    return null;
  }
}

export function clearMenuDiscoverySnapshot(storage: StorageLike | null | undefined): void {
  if (!storage) return;
  try {
    storage.removeItem(MENU_DISCOVERY_SESSION_KEY);
  } catch {
    // Storage pode estar indisponível em navegação privada; reset local continua.
  }
}

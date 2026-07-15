import { z } from 'zod';

import { MENU_DISCOVERY_STATUSES } from './types.ts';

const nullableFiniteNumber = z.number().finite().nullable();

export const MenuSearchLocationSchema = z
  .object({
    latitude: z.number().finite().min(-90).max(90).nullable(),
    longitude: z.number().finite().min(-180).max(180).nullable(),
    label: z.string().trim().max(180).nullable(),
    neighborhood: z.string().trim().max(100).nullable(),
    regionId: z.string().trim().max(100).nullable(),
    city: z.string().trim().max(100).nullable(),
    state: z.string().trim().max(80).nullable(),
    radiusKm: z.number().finite().positive().max(100).nullable(),
    source: z.enum(['gps', 'manual', 'profile', 'url']).nullable(),
  })
  .strict()
  .superRefine((location, context) => {
    const hasLatitude = location.latitude !== null;
    const hasLongitude = location.longitude !== null;

    if (hasLatitude !== hasLongitude) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Latitude e longitude precisam ser informadas juntas.',
        path: hasLatitude ? ['longitude'] : ['latitude'],
      });
    }
  });

export const MenuSearchIntentSchema = z
  .object({
    version: z.literal(1),
    rawText: z.string().trim().max(500),
    normalizedText: z.string().max(500),
    searchText: z.string().trim().max(240),
    dishTerms: z.array(z.string().trim().min(1).max(80)).max(16),
    ingredients: z.array(z.string().trim().min(1).max(80)).max(12),
    excludedIngredients: z.array(z.string().trim().min(1).max(80)).max(12),
    priceMin: z.number().finite().nonnegative().max(100_000).nullable(),
    priceMax: z.number().finite().nonnegative().max(100_000).nullable(),
    people: z.number().int().positive().max(100).nullable(),
    categories: z.array(z.string().trim().min(1).max(80)).max(12),
    restrictions: z
      .array(z.enum(['vegetarian', 'vegan', 'gluten_free', 'lactose_free', 'sugar_free']))
      .max(8),
    occasion: z
      .enum(['breakfast', 'lunch', 'dinner', 'date', 'family', 'friends', 'party', 'work'])
      .nullable(),
    location: MenuSearchLocationSchema.nullable(),
    sort: z.enum(['relevance', 'price_asc', 'price_desc', 'distance']),
  })
  .strict()
  .superRefine((intent, context) => {
    if (intent.priceMin !== null && intent.priceMax !== null && intent.priceMin > intent.priceMax) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'O preço mínimo não pode ser maior que o preço máximo.',
        path: ['priceMin'],
      });
    }
  });

export const GroundingEvidenceSchema = z
  .object({
    kind: z.literal('published_catalog'),
    itemId: z.string().uuid(),
    restaurantId: z.string().uuid(),
    sourceUrl: z.string().url().nullable(),
    verifiedAt: z.string().datetime({ offset: true }).nullable(),
    grounding: z.enum(['catalog_record', 'source_verified']),
  })
  .strict();

export const MenuDiscoveryResultSchema = z
  .object({
    id: z.string().min(1).max(600),
    itemId: z.string().uuid(),
    itemName: z.string().trim().min(1).max(300),
    itemDescription: z.string().max(2_000).nullable(),
    itemImageUrl: z.string().url().nullable(),
    itemCategoryId: z.string().uuid(),
    itemCategoryName: z.string().trim().min(1).max(200),
    restaurantId: z.string().uuid(),
    restaurantName: z.string().trim().min(1).max(300),
    restaurantCategory: z.string().max(200).nullable(),
    restaurantNeighborhood: z.string().max(200).nullable(),
    restaurantCity: z.string().max(200).nullable(),
    restaurantState: z.string().max(80).nullable(),
    distanceKm: z.number().finite().nonnegative().nullable(),
    restaurantOpeningHours: z.unknown().nullable(),
    price: z
      .object({
        currency: z.literal('BRL'),
        value: z.number().finite().nonnegative(),
        min: nullableFiniteNumber,
        max: nullableFiniteNumber,
        type: z.string().max(80).nullable(),
      })
      .strict(),
    matchReason: z.string().trim().min(1).max(240),
    evidence: GroundingEvidenceSchema,
  })
  .strict()
  .superRefine((result, context) => {
    if (result.itemId !== result.evidence.itemId) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Item sem evidência correspondente.' });
    }
    if (result.restaurantId !== result.evidence.restaurantId) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Restaurante sem evidência correspondente.' });
    }
    if (result.price.min !== null && result.price.max !== null && result.price.min > result.price.max) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Faixa de preço inválida.' });
    }
  });

export const MenuCoverageSchema = z
  .object({
    status: z.enum(['covered', 'limited', 'unavailable', 'unknown']),
    regionLabel: z.string().max(180).nullable(),
    eligibleRestaurantCount: z.number().int().nonnegative().nullable(),
    searchableItemCount: z.number().int().nonnegative().nullable(),
    checkedAt: z.string().datetime({ offset: true }),
    reason: z.string().max(240).nullable(),
  })
  .strict();

export const QueryRewriteResponseSchema = z
  .object({
    expandedQueries: z.array(z.string().trim().min(3).max(120)).max(6),
    usedAI: z.boolean(),
  })
  .strict();

export const MenuDiscoveryErrorSchema = z
  .object({
    code: z.enum(['invalid_intent', 'network', 'catalog', 'unknown']),
    message: z.string().max(500),
    retryable: z.boolean(),
  })
  .strict();

export const MenuDiscoveryStatusSchema = z.enum(MENU_DISCOVERY_STATUSES);

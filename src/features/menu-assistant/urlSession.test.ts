import assert from 'node:assert/strict';
import test from 'node:test';

import { applyMenuSearchIntentPatch, menuIntentCacheKey, parseMenuSearchIntent } from './parser.ts';
import { menuIntentFromSearchParams, menuIntentToSearchParams } from './urlSession.ts';

test('mantém critérios removidos fora da intenção ao serializar e hidratar', () => {
  const parsed = parseMenuSearchIntent(
    'jantar vegano para 2 pessoas até R$ 100 em Tambaú mais barato',
  );
  const refined = applyMenuSearchIntentPatch(parsed, {
    priceMax: null,
    people: null,
    restrictions: [],
    location: null,
    sort: 'relevance',
  });

  const params = menuIntentToSearchParams(refined);
  assert.equal(params.has('max'), true);
  assert.equal(params.get('max'), '');
  assert.equal(params.has('people'), true);
  assert.deepEqual(params.getAll('restriction'), ['']);
  assert.equal(params.get('locationCleared'), '1');
  assert.equal(params.get('sort'), 'relevance');

  const hydrated = menuIntentFromSearchParams(params);
  assert.ok(hydrated);
  assert.equal(menuIntentCacheKey(hydrated), menuIntentCacheKey(refined));
});

test('diferencia lista vazia de parâmetro ausente', () => {
  const parsed = parseMenuSearchIntent('pizza até R$ 50');
  const refined = applyMenuSearchIntentPatch(parsed, {
    categories: [],
    priceMax: null,
  });

  const hydrated = menuIntentFromSearchParams(menuIntentToSearchParams(refined));
  assert.ok(hydrated);
  assert.deepEqual(hydrated.categories, []);
  assert.equal(hydrated.priceMax, null);
});

test('mantém URLs simples compactas quando nenhum critério foi removido', () => {
  const intent = parseMenuSearchIntent('lasanha bolonhesa');
  const params = menuIntentToSearchParams(intent);

  assert.equal(params.toString(), 'q=lasanha+bolonhesa');
  assert.equal(
    menuIntentCacheKey(menuIntentFromSearchParams(params)!),
    menuIntentCacheKey(intent),
  );
});

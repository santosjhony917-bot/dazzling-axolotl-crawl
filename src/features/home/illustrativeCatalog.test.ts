import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ILLUSTRATIVE_CONTENT_LABEL,
  createIllustrativeDiscoverySections,
  getIllustrativeItemsUnder,
  getMostSavedIllustrativeItems,
  getNewIllustrativeItems,
  getOpenIllustrativeItems,
  illustrativeDiscoverySections,
  illustrativeMenuItems,
} from './illustrativeCatalog.ts';
import type { IllustrativeMenuItem } from './illustrativeCatalog.ts';

test('mantém o catálogo ilustrativo explicitamente separado de resultados aterrados', () => {
  assert.equal(illustrativeMenuItems.length, 8);
  assert.equal(new Set(illustrativeMenuItems.map((item) => item.id)).size, 8);

  illustrativeMenuItems.forEach((item) => {
    assert.equal(item.contentKind, 'illustrative_menu_item');
    assert.equal(item.isIllustrative, true);
    assert.equal(item.source.kind, 'illustrative_fixture');
    assert.equal(item.source.replacementTarget, 'public_menu_catalog');
    assert.match(item.restaurant.name, /^\[DEMO\] /);
    assert.match(item.example.availability.label, /^Exemplo: /);
    assert.match(item.matchReason, /^Exemplo de combinação: /);
    assert.match(item.image.src, /^https:\/\/images\.unsplash\.com\/photo-/);
    assert.equal('evidence' in item, false);
  });
});

test('filtra as coleções ilustrativas sem alterar a fonte', () => {
  const sourceOrder = illustrativeMenuItems.map((item) => item.id);
  const underThirty = getIllustrativeItemsUnder(30);
  const open = getOpenIllustrativeItems();
  const newest = getNewIllustrativeItems();
  const mostSaved = getMostSavedIllustrativeItems(3);

  assert.ok(underThirty.length >= 3);
  assert.ok(underThirty.every((item) => item.example.priceBRL <= 30));
  assert.ok(open.every((item) => item.example.availability.isOpenNow));
  assert.ok(newest.every((item) => item.example.isNew));
  assert.equal(mostSaved.length, 3);
  assert.ok(
    mostSaved.every(
      (item, index) => index === 0 || mostSaved[index - 1].example.savedCount >= item.example.savedCount,
    ),
  );
  assert.deepEqual(illustrativeMenuItems.map((item) => item.id), sourceOrder);
});

test('expõe as quatro seções esperadas com aviso de demonstração', () => {
  assert.deepEqual(
    illustrativeDiscoverySections.map((section) => section.id),
    ['under_30', 'open_now', 'most_saved', 'new_arrivals'],
  );
  assert.ok(illustrativeDiscoverySections.every((section) => section.demoLabel === ILLUSTRATIVE_CONTENT_LABEL));
  assert.ok(illustrativeDiscoverySections.every((section) => section.disclaimer.includes('exemplos visuais')));
});

test('permite montar seções a partir de outra fixture sem consultar catálogo remoto', () => {
  const subset: readonly IllustrativeMenuItem[] = illustrativeMenuItems.slice(0, 2);
  const sections = createIllustrativeDiscoverySections(subset);

  assert.equal(sections.length, 4);
  assert.ok(sections.every((section) => section.items.every((item) => subset.includes(item))));
});

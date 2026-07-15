import test from 'node:test';
import assert from 'node:assert/strict';
import { extractGoomerSourceIdentity, normalizeGoomerMenu, summarizeGoomerMenu } from './goomer-extractor.mjs';

test('normalizes Goomer absolute variants as separate sellable items', () => {
  const categories = normalizeGoomerMenu({
    products: [{
      id: 12,
      group_name: 'Cuscuz',
      name: 'Cuscuz',
      prices: [
        { name: 'Queijo', price: 10 },
        { name: 'Frango', price: 15 }
      ]
    }]
  });

  assert.deepEqual(categories, [{
    name: 'Cuscuz',
    items: [
      { name: 'Cuscuz - Queijo', description: '', price: 10, price_min: 10, image_url: null, source_product_id: 12, source_price_variant: 'Queijo', source_variant_mode: 'expanded_absolute_price_variant' },
      { name: 'Cuscuz - Frango', description: '', price: 15, price_min: 15, image_url: null, source_product_id: 12, source_price_variant: 'Frango', source_variant_mode: 'expanded_absolute_price_variant' }
    ]
  }]);
  assert.equal(summarizeGoomerMenu(categories).expanded_absolute_price_variants, 2);
});

test('uses only the public Goomer webmenu endpoint embedded by the source page', () => {
  const identity = extractGoomerSourceIdentity({
    props: { pageProps: { settings: {
      name: 'Tia Graça doces e salgados',
      slug: 'tia-graa-doces-e-salgados',
      menu_url: 'https://www.goomer.app/webmenu/tia-graa-doces-e-salgados/menu/123',
      address: { city: 'Cabedelo', state: 'PB' }
    } } }
  });
  assert.equal(identity.name, 'Tia Graça doces e salgados');
  assert.equal(identity.city, 'Cabedelo');
  assert.equal(identity.menu_url, 'https://www.goomer.app/webmenu/tia-graa-doces-e-salgados/menu/123');
});

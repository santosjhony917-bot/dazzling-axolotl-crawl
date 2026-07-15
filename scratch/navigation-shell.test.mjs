import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const projectRoot = new URL('../', import.meta.url);

async function source(relativePath) {
  return readFile(new URL(relativePath, projectRoot), 'utf8');
}

test('cliente e restaurante usam a mesma estrutura visual de navegação', async () => {
  const [client, restaurant, shared] = await Promise.all([
    source('src/components/ClientBottomNav.tsx'),
    source('src/components/restaurant/RestaurantBottomNav.tsx'),
    source('src/components/navigation/CurvedBottomNav.tsx'),
  ]);

  assert.match(client, /<CurvedBottomNav\b/);
  assert.match(restaurant, /<CurvedBottomNav\b/);
  assert.match(shared, /grid-cols-5/);
  assert.match(shared, /centerAction/);
  assert.match(shared, /item\.shortLabel \|\| item\.label/);
});

test('os cinco destinos principais permanecem nomeados e visíveis', async () => {
  const [client, restaurant] = await Promise.all([
    source('src/components/ClientBottomNav.tsx'),
    source('src/components/restaurant/RestaurantBottomNav.tsx'),
  ]);

  for (const label of ['Início', 'Explorar', 'Favoritos', 'Perfil']) {
    assert.ok(client.includes(label), `Navegação do cliente sem o rótulo ${label}.`);
    assert.ok(restaurant.includes(label), `Navegação do restaurante sem o rótulo ${label}.`);
  }

  assert.match(client, />\s*Perguntar\s*</);
  assert.match(restaurant, />\s*(?:Perguntar|Premium)\s*</);
});


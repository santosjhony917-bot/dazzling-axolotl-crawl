import assert from 'node:assert/strict';
import test from 'node:test';

import { parseMenuSearchIntent } from './parser.ts';

test('interpreta quantidade sem a palavra pessoas junto do orçamento', () => {
  const intent = parseMenuSearchIntent('pizza para 3 até R$100');

  assert.equal(intent.people, 3);
  assert.equal(intent.priceMax, 100);
  assert.deepEqual(intent.categories, ['Pizzaria']);
});

test('mantém a forma explícita para N pessoas', () => {
  const intent = parseMenuSearchIntent('pizza para 3 pessoas até R$100');

  assert.equal(intent.people, 3);
  assert.equal(intent.priceMax, 100);
  assert.deepEqual(intent.categories, ['Pizzaria']);
});

test('remove a unidade monetária do texto usado na busca', () => {
  const intent = parseMenuSearchIntent('jantar vegano sem lactose até 80 reais');

  assert.equal(intent.priceMax, 80);
  assert.equal(intent.searchText, '');
  assert.deepEqual([...intent.restrictions].sort(), ['lactose_free', 'vegan']);
  assert.deepEqual(intent.excludedIngredients, ['lactose']);
});

test('distingue orçamento mínimo, máximo e milhar brasileiro', () => {
  const minimum = parseMenuSearchIntent('pizza a partir de 35 reais');
  const maximum = parseMenuSearchIntent('quero pagar até 55 no jantar');
  const thousands = parseMenuSearchIntent('buffet até R$ 1.200');

  assert.deepEqual([minimum.priceMin, minimum.priceMax], [35, null]);
  assert.deepEqual([maximum.priceMin, maximum.priceMax], [null, 55]);
  assert.equal(thousands.priceMax, 1200);
});

test('interpreta formas coloquiais e coletivas de quantidade', () => {
  assert.equal(parseMenuSearchIntent('almoço pra 2').people, 2);
  assert.equal(parseMenuSearchIntent('somos 5 para o almoço').people, 5);
  assert.equal(parseMenuSearchIntent('comida para um grupo de 6').people, 6);
  assert.equal(parseMenuSearchIntent('festa para 20 convidados').people, 20);
});

test('separa listas de inclusões e exclusões sem fabricar restrição', () => {
  const exclusions = parseMenuSearchIntent('pizza sem cebola e sem picles');
  const compoundExclusion = parseMenuSearchIntent('pizza sem frutos do mar');
  const negation = parseMenuSearchIntent('pizza, não quero cebola');
  const inclusions = parseMenuSearchIntent('pizza com calabresa e queijo');

  assert.deepEqual(exclusions.excludedIngredients, ['cebola', 'picles']);
  assert.deepEqual(compoundExclusion.excludedIngredients, ['frutos do mar']);
  assert.deepEqual(negation.excludedIngredients, ['cebola']);
  assert.deepEqual(inclusions.ingredients, ['calabresa', 'queijo']);
});

test('prioriza o contexto social quando a frase também contém uma refeição', () => {
  assert.equal(parseMenuSearchIntent('jantar em família').occasion, 'family');
  assert.equal(parseMenuSearchIntent('jantar de comemoração').occasion, 'party');
  assert.equal(parseMenuSearchIntent('almoço para reunião de trabalho').occasion, 'work');
  assert.equal(parseMenuSearchIntent('encontro romântico').searchText, '');
});

test('reconhece cidades explícitas sem confundir nomes de pratos com bairros', () => {
  const city = parseMenuSearchIntent('jantar em João Pessoa');
  const dish = parseMenuSearchIntent('torre de batata');

  assert.equal(city.location?.city, 'João Pessoa');
  assert.equal(city.location?.label, 'João Pessoa');
  assert.equal(dish.location, null);
  assert.equal(dish.searchText, 'torre batata');
});

test('preserva bairro e cidade quando ambos aparecem na pergunta', () => {
  const intent = parseMenuSearchIntent('pizza no Bessa em João Pessoa até R$ 70');

  assert.equal(intent.location?.label, 'Bessa');
  assert.equal(intent.location?.neighborhood, 'Bessa');
  assert.equal(intent.location?.city, 'João Pessoa');
  assert.equal(intent.priceMax, 70);
});

test('aceita flexão de gênero na ordenação por preço', () => {
  assert.equal(parseMenuSearchIntent('pizza mais barata').sort, 'price_asc');
  assert.equal(parseMenuSearchIntent('sobremesa mais cara').sort, 'price_desc');
});

test('normaliza conectivos e a grafia hifenizada de x-búrguer', () => {
  const alternative = parseMenuSearchIntent('pizza ou sushi');
  const burger = parseMenuSearchIntent('x-búrguer com bacon');

  assert.equal(alternative.searchText, 'pizzaria');
  assert.deepEqual(alternative.categories, ['Pizzaria', 'Japonesa']);
  assert.deepEqual(burger.categories, ['Hamburgueria']);
  assert.deepEqual(burger.ingredients, ['bacon']);
});

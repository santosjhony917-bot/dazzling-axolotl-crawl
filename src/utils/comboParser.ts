import { MenuItem, RestaurantWithDistance } from '@/types/supabase';
import { DEMO_LABEL, IS_DEMO_MODE } from '@/lib/runtimeMode';
import { fetchPublicCatalogMenuEntriesByRestaurantIds } from '@/integrations/supabase/publicCatalog';

export interface ParsedQuery {
  maxBudget: number;
  numPeople: number;
  category: string;
  maxDistance: number;
  queryText: string;
}

export interface ComboItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

export interface MealCombo {
  restaurant: RestaurantWithDistance;
  items: MenuItem[];
  totalPrice: number;
  numPeople: number;
  category: string;
  explanation: string;
  economy: number;
}

// Fixtures are reachable only when VITE_DEMO_MODE=true and are visibly labelled.
const DEMO_ITEMS: Record<string, MenuItem[]> = {
  'demo-premium-restaurant-id': [
    { id: 'demo-item-main-1', category_id: 'demo-category-main', name: `${DEMO_LABEL} Hambúrguer ilustrativo`, price: 38, description: `${DEMO_LABEL} Item fictício para demonstração.`, image_url: null },
    { id: 'demo-item-side-1', category_id: 'demo-category-side', name: `${DEMO_LABEL} Batata ilustrativa`, price: 18, description: `${DEMO_LABEL} Acompanhamento fictício para demonstração.`, image_url: null },
    { id: 'demo-item-drink-1', category_id: 'demo-category-drink', name: `${DEMO_LABEL} Suco ilustrativo`, price: 9, description: `${DEMO_LABEL} Bebida fictícia para demonstração.`, image_url: null },
  ],
  'demo-casual-restaurant-id': [
    { id: 'demo-item-main-2', category_id: 'demo-category-main-2', name: `${DEMO_LABEL} Sanduíche ilustrativo`, price: 24, description: `${DEMO_LABEL} Item fictício para demonstração.`, image_url: null },
    { id: 'demo-item-drink-2', category_id: 'demo-category-drink-2', name: `${DEMO_LABEL} Refrigerante ilustrativo`, price: 7, description: `${DEMO_LABEL} Bebida fictícia para demonstração.`, image_url: null },
  ],
};

/**
 * Função principal que faz o parse da query natural do usuário.
 */
export function parseNaturalQuery(query: string): ParsedQuery {
  const cleanQuery = query.toLowerCase().trim();
  
  // 1. Parse de Orçamento (Budget)
  let maxBudget = 100; // Valor default
  const budgetRegexes = [
    /(?:gastar|ate|até|limite|valor|orcamento|orçamento|pagar)\s*(?:de|R\$)?\s*(\d+)/i,
    /(\d+)\s*(?:reais|real|\$)/i,
    /R\$\s*(\d+)/i
  ];
  
  for (const regex of budgetRegexes) {
    const match = cleanQuery.match(regex);
    if (match && match[1]) {
      maxBudget = parseInt(match[1], 10);
      break;
    }
  }

  // 2. Parse do número de pessoas
  let numPeople = 2; // Padrão: 2 pessoas (casal)
  if (
    cleanQuery.includes('esposa') || 
    cleanQuery.includes('namorada') || 
    cleanQuery.includes('namorado') || 
    cleanQuery.includes('marido') ||
    cleanQuery.includes('casal') ||
    cleanQuery.includes('noivo') ||
    cleanQuery.includes('noiva') ||
    cleanQuery.includes('dupla') ||
    cleanQuery.includes('dois') ||
    cleanQuery.includes('duas') ||
    cleanQuery.includes('2 pessoas')
  ) {
    numPeople = 2;
  } else if (
    cleanQuery.includes('sozinho') ||
    cleanQuery.includes('individual') ||
    cleanQuery.includes('só eu') ||
    cleanQuery.includes('eu mesmo') ||
    cleanQuery.includes('1 pessoa')
  ) {
    numPeople = 1;
  } else if (
    cleanQuery.includes('familia') ||
    cleanQuery.includes('família') ||
    cleanQuery.includes('grupo') ||
    cleanQuery.includes('galera') ||
    cleanQuery.includes('3 pessoas') ||
    cleanQuery.includes('4 pessoas')
  ) {
    numPeople = 4;
  }

  // 3. Categoria de comida
  let category = 'geral';
  if (cleanQuery.includes('lanche') || cleanQuery.includes('hamburguer') || cleanQuery.includes('burger') || cleanQuery.includes('sanduiche')) {
    category = 'lanche';
  } else if (cleanQuery.includes('pizza') || cleanQuery.includes('pizzaria')) {
    category = 'pizza';
  } else if (cleanQuery.includes('sushi') || cleanQuery.includes('japa') || cleanQuery.includes('japonesa')) {
    category = 'japonesa';
  } else if (cleanQuery.includes('massa') || cleanQuery.includes('macarrao') || cleanQuery.includes('italiana') || cleanQuery.includes('lasanha')) {
    category = 'italiana';
  } else if (cleanQuery.includes('churrasco') || cleanQuery.includes('carne') || cleanQuery.includes('picanha') || cleanQuery.includes('espetinho')) {
    category = 'churrasco';
  } else if (cleanQuery.includes('doce') || cleanQuery.includes('sobremesa') || cleanQuery.includes('acai') || cleanQuery.includes('açai') || cleanQuery.includes('sorvete')) {
    category = 'sobremesa';
  }

  // 4. Raio de distância
  let maxDistance = 5; // Padrão 5km
  const distMatch = cleanQuery.match(/(\d+)\s*(?:km|quilometros|quilômetros)/i);
  if (distMatch && distMatch[1]) {
    maxDistance = parseInt(distMatch[1], 10);
  }

  return {
    maxBudget,
    numPeople,
    category,
    maxDistance,
    queryText: query
  };
}

/**
 * Heurística de montagem de combos baseados no menu de um restaurante
 */
export function buildRestaurantCombos(
  restaurant: RestaurantWithDistance,
  menuItems: MenuItem[],
  parsed: ParsedQuery
): MealCombo[] {
  const { maxBudget, numPeople, category } = parsed;

  // Filtragem de itens por tipo de prato
  const mains: MenuItem[] = [];
  const sides: MenuItem[] = [];
  const drinks: MenuItem[] = [];

  // Mapeia palavras-chave para classificação inteligente sem DB rígido
  menuItems.forEach(item => {
    const numericPrice = Number(item.price);
    if (!Number.isFinite(numericPrice) || numericPrice < 0 || item.is_illustrative === true || item.needs_review === true) {
      return;
    }

    const pricedItem: MenuItem = { ...item, price: numericPrice };
    const name = item.name.toLowerCase();
    const desc = (item.description || '').toLowerCase();

    if (
      name.includes('suco') || 
      name.includes('refrigerante') || 
      name.includes('coca') || 
      name.includes('guaraná') || 
      name.includes('lata') || 
      name.includes('água') || 
      name.includes('bebida') ||
      name.includes('shake')
    ) {
      drinks.push(pricedItem);
    } else if (
      name.includes('frita') || 
      name.includes('batata') || 
      name.includes('anel') || 
      name.includes('cebola') || 
      name.includes('pão de alho') ||
      name.includes('hot roll') ||
      desc.includes('porção') ||
      desc.includes('acompanhamento')
    ) {
      sides.push(pricedItem);
    } else {
      mains.push(pricedItem);
    }
  });

  const combos: MealCombo[] = [];

  // Se não houver itens suficientes, não monta combos
  if (mains.length === 0) return [];

  // Algoritmo de Combinações Heurísticas por contagem de pessoas
  if (numPeople === 1) {
    // Usa apenas bebidas realmente cadastradas; quando não existem, sugere o prato sem inventar itens.
    mains.forEach(main => {
      const availableDrinks: Array<MenuItem | null> = drinks.length > 0 ? drinks : [null];
      
      availableDrinks.forEach(drink => {
        const costOption1 = Number(main.price) + (drink ? Number(drink.price) : 0);
        if (costOption1 <= maxBudget) {
          combos.push({
            restaurant,
            items: drink ? [main, drink] : [main],
            totalPrice: costOption1,
            numPeople: 1,
            category,
            economy: maxBudget - costOption1,
            explanation: drink
              ? `Combinação individual no ${restaurant.name}: ${main.name} com ${drink.name}, ambos disponíveis no cardápio.`
              : `Opção individual no ${restaurant.name}: ${main.name}, disponível no cardápio. O cardápio consultado não informou uma bebida para esta combinação.`,
          });
        }

        // Tenta adicionar um acompanhamento se couber no orçamento
        sides.forEach(side => {
          const costOption2 = Number(main.price) + Number(side.price) + (drink ? Number(drink.price) : 0);
          if (costOption2 <= maxBudget) {
            combos.push({
              restaurant,
              items: drink ? [main, side, drink] : [main, side],
              totalPrice: costOption2,
              numPeople: 1,
              category,
              economy: maxBudget - costOption2,
              explanation: drink
                ? `Combinação individual no ${restaurant.name}: ${main.name}, ${side.name} e ${drink.name}, todos disponíveis no cardápio.`
                : `Combinação individual no ${restaurant.name}: ${main.name} e ${side.name}, ambos disponíveis no cardápio. Nenhuma bebida foi adicionada porque o cardápio consultado não informou uma opção.`,
            });
          }
        });
      });
    });
  } else if (numPeople === 2) {
    // 2 Pessoas (Casal):
    // Opção A: 2 Principais + 1 Acompanhamento + 2 Bebidas
    // Opção B: 1 Principal grande (compartilhável) + 2 Bebidas
    // Opção C: 2 Principais + 2 Bebidas
    
    // Tenta Opção A (Lanche completo)
    for (let i = 0; i < mains.length; i++) {
      for (let j = i; j < mains.length; j++) {
        const m1 = mains[i];
        const m2 = mains[j];

        const availableDrinks: Array<MenuItem | null> = drinks.length > 0 ? drinks : [null];
        
        for (let di = 0; di < availableDrinks.length; di++) {
          for (let dj = di; dj < availableDrinks.length; dj++) {
            const d1 = availableDrinks[di];
            const d2 = availableDrinks[dj];

            // A: Com Acompanhamento
            sides.forEach(side => {
              const cost = Number(m1.price) + Number(m2.price) + Number(side.price) + (d1 ? Number(d1.price) : 0) + (d2 ? Number(d2.price) : 0);
              if (cost <= maxBudget) {
                combos.push({
                  restaurant,
                  items: [m1, m2, side, d1, d2].filter(Boolean) as MenuItem[],
                  totalPrice: cost,
                  numPeople: 2,
                  category,
                  economy: maxBudget - cost,
                  explanation: d1 && d2
                    ? `Combinação para 2 no ${restaurant.name}: ${m1.name}, ${m2.name}, ${side.name}, ${d1.name} e ${d2.name}, conforme o cardápio.`
                    : `Combinação para 2 no ${restaurant.name}: ${m1.name}, ${m2.name} e ${side.name}, conforme o cardápio. Nenhuma bebida foi adicionada porque o cardápio consultado não informou uma opção.`,
                });
              }
            });

            // C: Apenas prato e bebida
            const costNoSide = Number(m1.price) + Number(m2.price) + (d1 ? Number(d1.price) : 0) + (d2 ? Number(d2.price) : 0);
            if (costNoSide <= maxBudget) {
              combos.push({
                restaurant,
                items: [m1, m2, d1, d2].filter(Boolean) as MenuItem[],
                totalPrice: costNoSide,
                numPeople: 2,
                category,
                economy: maxBudget - costNoSide,
                explanation: d1 && d2
                  ? `Combinação para 2 no ${restaurant.name}: ${m1.name}, ${m2.name}, ${d1.name} e ${d2.name}, conforme o cardápio.`
                  : `Combinação para 2 no ${restaurant.name}: ${m1.name} e ${m2.name}, conforme o cardápio. Nenhuma bebida foi adicionada porque o cardápio consultado não informou uma opção.`,
              });
            }
          }
        }
      }
    }

    // Tenta Opção B (Pizza ou Prato Grande compartilhável se for o caso)
    mains.forEach(main => {
      const isSharing = main.name.toLowerCase().includes('grande') || 
                        main.name.toLowerCase().includes('combinado') ||
                        main.name.toLowerCase().includes('tábua') ||
                        main.name.toLowerCase().includes('porção') ||
                        Number(main.price) > 45.00;

      if (isSharing) {
        const availableDrinks: Array<MenuItem | null> = drinks.length > 0 ? drinks : [null];
        
        for (let di = 0; di < availableDrinks.length; di++) {
          for (let dj = di; dj < availableDrinks.length; dj++) {
            const d1 = availableDrinks[di];
            const d2 = availableDrinks[dj];

            const cost = Number(main.price) + (d1 ? Number(d1.price) : 0) + (d2 ? Number(d2.price) : 0);
            if (cost <= maxBudget) {
              combos.push({
                restaurant,
                items: [main, d1, d2].filter(Boolean) as MenuItem[],
                totalPrice: cost,
                numPeople: 2,
                category,
                economy: maxBudget - cost,
                explanation: d1 && d2
                  ? `Opção compartilhável para 2 no ${restaurant.name}: ${main.name}, ${d1.name} e ${d2.name}, conforme o cardápio.`
                  : `Opção compartilhável para 2 no ${restaurant.name}: ${main.name}, conforme o cardápio. Nenhuma bebida foi adicionada porque o cardápio consultado não informou uma opção.`,
              });
            }
          }
        }
      }
    });
  } else {
    // 3 ou mais Pessoas (Grupo): N Principais + N Bebidas (Opcional: + Acompanhamentos)
    // Para simplificar a geração, fazemos uma média de prato por pessoa
    const peopleCount = numPeople;
    // Tenta montar um super combo
    const items: MenuItem[] = [];
    for (let p = 0; p < peopleCount; p++) {
      // Distribui os principais de forma alternada se houver mais de um
      const mIdx = p % mains.length;
      items.push(mains[mIdx]);
      if (drinks.length > 0) {
        const dIdx = p % drinks.length;
        items.push(drinks[dIdx]);
      }
    }
    
    // Adiciona 2 acompanhamentos para o grupo se houver
    if (sides.length > 0) {
      items.push(sides[0]);
      if (sides.length > 1) items.push(sides[1]);
    }

    const totalCost = items.reduce((sum, item) => sum + Number(item.price), 0);
    if (totalCost <= maxBudget) {
      combos.push({
        restaurant,
        items,
        totalPrice: totalCost,
        numPeople: peopleCount,
        category,
        economy: maxBudget - totalCost,
        explanation: drinks.length > 0
          ? `Combinação para ${peopleCount} pessoas no ${restaurant.name}, formada somente por pratos, bebidas e acompanhamentos disponíveis no cardápio. Total de R$ ${totalCost.toFixed(2)}.`
          : `Combinação para ${peopleCount} pessoas no ${restaurant.name}, formada somente por pratos e acompanhamentos disponíveis no cardápio. Nenhuma bebida foi adicionada porque o cardápio consultado não informou uma opção. Total de R$ ${totalCost.toFixed(2)}.`,
      });
    }
  }

  // Ordena os combos para dar prioridade àqueles que chegam mais perto do orçamento (sem estourar) ou que economizam
  // Neste caso, ordenamos pela melhor economia mas mantendo combos robustos (por total de itens no combo desc, depois por preço desc)
  return combos.sort((a, b) => {
    if (b.items.length !== a.items.length) {
      return b.items.length - a.items.length; // Dá preferência a combos mais fartos (mais itens)
    }
    return b.totalPrice - a.totalPrice; // Depois pelos que aproveitam melhor o orçamento
  });
}

/**
 * Busca itens reais e auditáveis. Fixtures só existem no modo de demonstração explícito.
 */
export async function getItemsForComboSearch(
  restaurantIds: string[]
): Promise<Record<string, MenuItem[]>> {
  const uniqueRestaurantIds = [...new Set(restaurantIds.filter(Boolean))];
  if (uniqueRestaurantIds.length === 0) return {};

  const hasFixtureIds = uniqueRestaurantIds.some(id => id.startsWith('demo-') || id.startsWith('mock-'));
  if (hasFixtureIds) {
    if (!IS_DEMO_MODE) {
      throw new Error('Dados de demonstração não estão habilitados neste ambiente.');
    }

    const demoResult: Record<string, MenuItem[]> = {};
    uniqueRestaurantIds.forEach(id => {
      if (DEMO_ITEMS[id]) demoResult[id] = DEMO_ITEMS[id];
    });
    return demoResult;
  }

  try {
    const items = await fetchPublicCatalogMenuEntriesByRestaurantIds(uniqueRestaurantIds);

    const groupedItems: Record<string, MenuItem[]> = {};
    items
      .map((item) => ({
        ...item,
        price: item.promotional_price ?? item.display_price ?? item.price_min ?? item.price,
      }))
      .filter(item => Number.isFinite(Number(item.price)) && Number(item.price) >= 0)
      .forEach(item => {
      const restId = item.restaurant_id;
      if (restId) {
        if (!groupedItems[restId]) {
          groupedItems[restId] = [];
        }
        groupedItems[restId].push({ ...item, price: Number(item.price) });
      }
    });

    return groupedItems;
  } catch (e) {
    console.error('Error fetching items for combo search:', e);
    throw new Error('Não foi possível consultar os itens dos cardápios agora.');
  }
}

import { Profile, Restaurant, MenuItem, RestaurantWithDistance } from '@/types/supabase';
import { supabase } from '@/integrations/supabase/client';

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

// Repositório mockado de pratos para restaurantes no modo offline
const MOCK_ITEMS: Record<string, MenuItem[]> = {
  'mock-premium-restaurant-id': [
    { id: 'item-p1', category_id: 'cat-1', name: 'Hamburguer Blend Gourmet', price: 38.00, description: 'Hambúrguer artesanal de 180g, queijo cheddar, bacon crocante e molho da casa.', image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500' },
    { id: 'item-p2', category_id: 'cat-1', name: 'Cheeseburger Clássico', price: 32.00, description: 'Hambúrguer de 150g com muito queijo prato no pão brioche.', image_url: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=500' },
    { id: 'item-p3', category_id: 'cat-2', name: 'Batata Frita Tradicional Grande', price: 22.00, description: 'Batatas fritas super crocantes acompanhadas de maionese verde.', image_url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500' },
    { id: 'item-p4', category_id: 'cat-2', name: 'Anéis de Cebola Empanados', price: 24.00, description: 'Anéis de cebola crocantes acompanhados de molho barbecue.', image_url: 'https://images.unsplash.com/photo-1639024471283-2bc7b3c6a267?w=500' },
    { id: 'item-p5', category_id: 'cat-3', name: 'Suco Natural de Laranja 500ml', price: 10.00, description: 'Suco espremido na hora 100% natural.', image_url: 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=500' },
    { id: 'item-p6', category_id: 'cat-3', name: 'Refrigerante Coca-Cola Lata', price: 7.00, description: 'Coca-cola original de 350ml bem gelada.', image_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500' },
    { id: 'item-p7', category_id: 'cat-3', name: 'Milkshake de Chocolate Belga', price: 18.00, description: 'Milkshake cremoso de chocolate premium.', image_url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500' }
  ],
  'mock-free-restaurant-id': [
    { id: 'item-f1', category_id: 'cat-f1', name: 'X-Burguer Tradicional', price: 18.00, description: 'Hambúrguer tradicional de carne, queijo e presunto no pão com gergelim.', image_url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=500' },
    { id: 'item-f2', category_id: 'cat-f1', name: 'X-Salada Especial', price: 20.00, description: 'Hambúrguer, queijo, alface, tomate, maionese e milho.', image_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=500' },
    { id: 'item-f3', category_id: 'cat-f1', name: 'X-Tudo Monstro', price: 28.00, description: 'Hambúrguer, ovo, bacon, salsicha, queijo, presunto, alface e tomate.', image_url: 'https://images.unsplash.com/photo-1549611016-3a70d82b5040?w=500' },
    { id: 'item-f4', category_id: 'cat-f2', name: 'Batata Frita Simples Média', price: 15.00, description: 'Porção média de batata frita.', image_url: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=500' },
    { id: 'item-f5', category_id: 'cat-f3', name: 'Refrigerante Guaraná Lata', price: 6.00, description: 'Lata de Guaraná Antarctica bem fria.', image_url: 'https://images.unsplash.com/photo-1527960656306-fffe3a612317?w=500' },
    { id: 'item-f6', category_id: 'cat-f3', name: 'Suco de Uva Copo', price: 6.00, description: 'Suco de uva integral gelado.', image_url: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=500' }
  ]
};

// Adiciona alguns itens adicionais simulando outros tipos de comida
const OTHER_FOOD_ITEMS: Record<string, MenuItem[]> = {
  'mock-pizza-items': [
    { id: 'item-pi1', category_id: 'cat-pi', name: 'Pizza Calabresa Grande (8 fatias)', price: 58.00, description: 'Molho de tomate artesanal, muçarela, calabresa fatiada, cebola e azeitonas.', image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500' },
    { id: 'item-pi2', category_id: 'cat-pi', name: 'Pizza Quatro Queijos Grande (8 fatias)', price: 65.00, description: 'Muçarela, provolone, gorgonzola e catupiry original.', image_url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500' },
    { id: 'item-pi3', category_id: 'cat-pi-side', name: 'Pão de Alho Especial Recheado', price: 18.00, description: 'Pão recheado com pasta de alho e muçarela gratinada.', image_url: 'https://images.unsplash.com/photo-1544982503-9f984c14501a?w=500' }
  ],
  'mock-japa-items': [
    { id: 'item-ja1', category_id: 'cat-ja', name: 'Combinado Sushi & Sashimi (20 peças)', price: 79.00, description: 'Sashimis de salmão, niguiris, hossomakis e uramakis variados.', image_url: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500' },
    { id: 'item-ja2', category_id: 'cat-ja', name: 'Yakisoba de Carne Individual', price: 38.00, description: 'Macarrão oriental com carnes selecionadas e legumes ao molho shoyu.', image_url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500' },
    { id: 'item-ja3', category_id: 'cat-ja-side', name: 'Porção de Hot Roll (8 peças)', price: 24.00, description: 'Sushi frito com recheio de salmão e cream cheese, molho tarê.', image_url: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=500' }
  ]
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
    const name = item.name.toLowerCase();
    const desc = (item.description || '').toLowerCase();
    const price = item.price;

    if (
      name.includes('suco') || 
      name.includes('refrigerante') || 
      name.includes('coca') || 
      name.includes('guaraná') || 
      name.includes('lata') || 
      name.includes('água') || 
      name.includes('bebida') ||
      name.includes('shake') ||
      price < 12.00
    ) {
      drinks.push(item);
    } else if (
      name.includes('frita') || 
      name.includes('batata') || 
      name.includes('anel') || 
      name.includes('cebola') || 
      name.includes('pão de alho') ||
      name.includes('hot roll') ||
      desc.includes('porção') ||
      desc.includes('acompanhamento') ||
      (price >= 12.00 && price <= 25.00)
    ) {
      sides.push(item);
    } else {
      mains.push(item);
    }
  });

  const combos: MealCombo[] = [];

  // Se não houver itens suficientes, não monta combos
  if (mains.length === 0) return [];

  // Algoritmo de Combinações Heurísticas por contagem de pessoas
  if (numPeople === 1) {
    // 1 Pessoa: 1 Principal + 1 Bebida (Opcional: + 1 Acompanhamento)
    mains.forEach(main => {
      const availableDrinks = drinks.length > 0 ? drinks : [{ id: 'd-1', name: 'Refrigerante Lata', price: 6.00 } as MenuItem];
      
      availableDrinks.forEach(drink => {
        const costOption1 = main.price + drink.price;
        if (costOption1 <= maxBudget) {
          combos.push({
            restaurant,
            items: [main, drink],
            totalPrice: costOption1,
            numPeople: 1,
            category,
            economy: maxBudget - costOption1,
            explanation: `Combinação individual ideal no ${restaurant.name}: 1 Prato Principal (${main.name}) e 1 Bebida refrescante (${drink.name}).`,
          });
        }

        // Tenta adicionar um acompanhamento se couber no orçamento
        sides.forEach(side => {
          const costOption2 = main.price + side.price + drink.price;
          if (costOption2 <= maxBudget) {
            combos.push({
              restaurant,
              items: [main, side, drink],
              totalPrice: costOption2,
              numPeople: 1,
              category,
              economy: maxBudget - costOption2,
              explanation: `Combo individual completo no ${restaurant.name}: 1 Prato Principal (${main.name}) + 1 Acompanhamento crocante (${side.name}) + 1 Bebida (${drink.name}).`,
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

        const availableDrinks = drinks.length > 0 ? drinks : [{ id: 'd-1', name: 'Refrigerante Lata', price: 6.00 } as MenuItem];
        
        for (let di = 0; di < availableDrinks.length; di++) {
          for (let dj = di; dj < availableDrinks.length; dj++) {
            const d1 = availableDrinks[di];
            const d2 = availableDrinks[dj];

            // A: Com Acompanhamento
            sides.forEach(side => {
              const cost = m1.price + m2.price + side.price + d1.price + d2.price;
              if (cost <= maxBudget) {
                combos.push({
                  restaurant,
                  items: [m1, m2, side, d1, d2],
                  totalPrice: cost,
                  numPeople: 2,
                  category,
                  economy: maxBudget - cost,
                  explanation: `Sugestão de Combo para Casal no ${restaurant.name}: Inclui 2 pratos principais (${m1.name} e ${m2.name}) + 1 Acompanhamento para dividir (${side.name}) + 2 Bebidas geladas. Perfeito para vocês dois!`,
                });
              }
            });

            // C: Apenas prato e bebida
            const costNoSide = m1.price + m2.price + d1.price + d2.price;
            if (costNoSide <= maxBudget) {
              combos.push({
                restaurant,
                items: [m1, m2, d1, d2],
                totalPrice: costNoSide,
                numPeople: 2,
                category,
                economy: maxBudget - costNoSide,
                explanation: `Combo Duplo Simples no ${restaurant.name}: 2 pratos principais (${m1.name} e ${m2.name}) + 2 Bebidas (${d1.name} e ${d2.name}). Cabe perfeitamente no seu orçamento!`,
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
                        main.price > 45.00;

      if (isSharing) {
        const availableDrinks = drinks.length > 0 ? drinks : [{ id: 'd-1', name: 'Refrigerante Lata', price: 6.00 } as MenuItem];
        
        for (let di = 0; di < availableDrinks.length; di++) {
          for (let dj = di; dj < availableDrinks.length; dj++) {
            const d1 = availableDrinks[di];
            const d2 = availableDrinks[dj];

            const cost = main.price + d1.price + d2.price;
            if (cost <= maxBudget) {
              combos.push({
                restaurant,
                items: [main, d1, d2],
                totalPrice: cost,
                numPeople: 2,
                category,
                economy: maxBudget - cost,
                explanation: `Opção compartilhável para 2 pessoas no ${restaurant.name}: 1 Prato Especial para dividir (${main.name}) + 2 Bebidas (${d1.name} e ${d2.name}). Prático e econômico.`,
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
    const bestMain = mains[0]; // Pega o principal de melhor custo/benefício
    const bestDrink = drinks[0] || { id: 'd-1', name: 'Refrigerante Lata', price: 6.00 } as MenuItem;
    
    // Tenta montar um super combo
    const items: MenuItem[] = [];
    for (let p = 0; p < peopleCount; p++) {
      // Distribui os principais de forma alternada se houver mais de um
      const mIdx = p % mains.length;
      const dIdx = p % (drinks.length || 1);
      items.push(mains[mIdx]);
      items.push(drinks.length > 0 ? drinks[dIdx] : bestDrink);
    }
    
    // Adiciona 2 acompanhamentos para o grupo se houver
    if (sides.length > 0) {
      items.push(sides[0]);
      if (sides.length > 1) items.push(sides[1]);
    }

    const totalCost = items.reduce((sum, item) => sum + item.price, 0);
    if (totalCost <= maxBudget) {
      combos.push({
        restaurant,
        items,
        totalPrice: totalCost,
        numPeople: peopleCount,
        category,
        economy: maxBudget - totalCost,
        explanation: `Super Combo de Grupo (${peopleCount} pessoas) no ${restaurant.name}: Selecionamos pratos principais e bebidas individuais para todos do grupo, mais acompanhamentos para dividir no centro da mesa. Tudo por R$ ${totalCost.toFixed(2)}!`,
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
 * Pega todos os itens cadastrados (Supabase real ou simulado localmente no mock).
 */
export async function getItemsForComboSearch(
  restaurantIds: string[]
): Promise<Record<string, MenuItem[]>> {
  // 1. Se estivermos testando com IDs mock, retorna dados simulados imediatamente
  const hasMockIds = restaurantIds.some(id => id.startsWith('mock-'));
  if (hasMockIds) {
    const res: Record<string, MenuItem[]> = {};
    restaurantIds.forEach(id => {
      if (MOCK_ITEMS[id]) {
        res[id] = MOCK_ITEMS[id];
      } else {
        // Gera itens mockados aleatórios se o ID do restaurante não estiver mapeado
        // Para simular categorias diversas (Pizza, Japonesa)
        if (id.includes('pizza') || id.includes('italiana')) {
          res[id] = OTHER_FOOD_ITEMS['mock-pizza-items'];
        } else if (id.includes('sushi') || id.includes('japa') || id.includes('japonesa')) {
          res[id] = OTHER_FOOD_ITEMS['mock-japa-items'];
        } else {
          // Fallback para lanches premium
          res[id] = MOCK_ITEMS['mock-premium-restaurant-id'];
        }
      }
    });
    return res;
  }

  // 2. Consulta real no Supabase
  try {
    // Busca todas as categorias dos restaurantes indicados
    const { data: categories, error: catError } = await supabase
      .from('menu_categories')
      .select('id, restaurant_id')
      .in('restaurant_id', restaurantIds);

    if (catError) throw catError;
    if (!categories || categories.length === 0) return {};

    const categoryIds = categories.map(c => c.id);

    // Busca os itens do cardápio dessas categorias
    const { data: items, error: itemsError } = await supabase
      .from('menu_items')
      .select('*')
      .in('category_id', categoryIds)
      .eq('is_active', true);

    if (itemsError) throw itemsError;
    if (!items) return {};

    // Agrupa os itens de volta por restaurant_id usando o mapeamento das categorias
    const catToRestMap: Record<string, string> = {};
    categories.forEach(c => {
      catToRestMap[c.id] = c.restaurant_id;
    });

    const groupedItems: Record<string, MenuItem[]> = {};
    items.forEach(item => {
      const restId = catToRestMap[item.category_id];
      if (restId) {
        if (!groupedItems[restId]) {
          groupedItems[restId] = [];
        }
        groupedItems[restId].push(item);
      }
    });

    return groupedItems;
  } catch (e) {
    console.error('Error fetching items for combo search:', e);
    return {};
  }
}

/**
 * Conteúdo estritamente ilustrativo para prototipar a Home.
 *
 * Este módulo não implementa fallback de catálogo e, de propósito, não usa o
 * contrato `MenuDiscoveryResult`: itens reais exigem evidência de um cardápio
 * publicado, enquanto estes registros existem apenas para validar a interface.
 */

export const ILLUSTRATIVE_CONTENT_LABEL = 'DEMONSTRAÇÃO' as const;

export const ILLUSTRATIVE_CONTENT_NOTICE =
  'Itens, preços, distâncias, horários e sinais sociais abaixo são exemplos visuais. Não representam cardápios publicados.' as const;

export type IllustrativeDiscoverySectionId =
  | 'under_30'
  | 'open_now'
  | 'most_saved'
  | 'new_arrivals';

export interface IllustrativeMenuItem {
  readonly contentKind: 'illustrative_menu_item';
  readonly isIllustrative: true;
  readonly id: `illustrative-item-${string}`;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly image: {
    readonly src: string;
    readonly alt: string;
    readonly creditLabel: 'Imagem ilustrativa · Unsplash';
  };
  readonly restaurant: {
    readonly id: `illustrative-restaurant-${string}`;
    readonly name: `[DEMO] ${string}`;
    readonly category: string;
  };
  readonly example: {
    readonly priceBRL: number;
    readonly distanceKm: number;
    readonly availability: {
      readonly isOpenNow: boolean;
      readonly label: `Exemplo: ${string}`;
    };
    readonly savedCount: number;
    readonly isNew: boolean;
  };
  readonly matchReason: `Exemplo de combinação: ${string}`;
  readonly source: {
    readonly kind: 'illustrative_fixture';
    readonly label: 'Conteúdo fictício para demonstração';
    readonly replacementTarget: 'public_menu_catalog';
  };
}

export interface IllustrativeDiscoverySection {
  readonly id: IllustrativeDiscoverySectionId;
  readonly title: string;
  readonly subtitle: string;
  readonly demoLabel: typeof ILLUSTRATIVE_CONTENT_LABEL;
  readonly disclaimer: typeof ILLUSTRATIVE_CONTENT_NOTICE;
  readonly items: readonly IllustrativeMenuItem[];
}

const illustrativeSource = {
  kind: 'illustrative_fixture',
  label: 'Conteúdo fictício para demonstração',
  replacementTarget: 'public_menu_catalog',
} as const;

const unsplashImage = (photoId: string, alt: string): IllustrativeMenuItem['image'] => ({
  src: `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=900&q=82`,
  alt,
  creditLabel: 'Imagem ilustrativa · Unsplash',
});

/**
 * Fixture visual isolada. Os oito IDs de imagem já eram usados no projeto,
 * evitando introduzir um novo provedor ou uma segunda política de imagens.
 */
export const illustrativeMenuItems = [
  {
    contentKind: 'illustrative_menu_item',
    isIllustrative: true,
    id: 'illustrative-item-burger-orbita',
    name: 'Burger Órbita',
    description: 'Pão brioche, carne grelhada, queijo e molho da casa.',
    category: 'Hambúrguer',
    image: unsplashImage(
      'photo-1568901346375-23c9450c58cd',
      'Imagem ilustrativa de hambúrguer artesanal',
    ),
    restaurant: {
      id: 'illustrative-restaurant-cozinha-orbita',
      name: '[DEMO] Cozinha Órbita',
      category: 'Lanches',
    },
    example: {
      priceBRL: 27.9,
      distanceKm: 1.2,
      availability: { isOpenNow: true, label: 'Exemplo: aberto até 23h' },
      savedCount: 184,
      isNew: false,
    },
    matchReason: 'Exemplo de combinação: opção rápida por menos de R$ 30',
    source: illustrativeSource,
  },
  {
    contentKind: 'illustrative_menu_item',
    isIllustrative: true,
    id: 'illustrative-item-pizza-prisma',
    name: 'Pizza Prisma',
    description: 'Massa de longa fermentação, tomate, queijo e manjericão.',
    category: 'Pizza',
    image: unsplashImage(
      'photo-1513104890138-7c749659a591',
      'Imagem ilustrativa de pizza artesanal',
    ),
    restaurant: {
      id: 'illustrative-restaurant-forno-prisma',
      name: '[DEMO] Forno Prisma',
      category: 'Pizzaria',
    },
    example: {
      priceBRL: 46,
      distanceKm: 2.4,
      availability: { isOpenNow: true, label: 'Exemplo: aberto até 00h' },
      savedCount: 263,
      isNew: false,
    },
    matchReason: 'Exemplo de combinação: boa para dividir em um jantar a dois',
    source: illustrativeSource,
  },
  {
    contentKind: 'illustrative_menu_item',
    isIllustrative: true,
    id: 'illustrative-item-sushi-pixel',
    name: 'Combinado Pixel',
    description: 'Seleção ilustrativa de sushis e sashimis variados.',
    category: 'Japonesa',
    image: unsplashImage(
      'photo-1579871494447-9811cf80d66c',
      'Imagem ilustrativa de combinado japonês',
    ),
    restaurant: {
      id: 'illustrative-restaurant-nori-pixel',
      name: '[DEMO] Nori Pixel',
      category: 'Japonesa',
    },
    example: {
      priceBRL: 52,
      distanceKm: 3.1,
      availability: { isOpenNow: false, label: 'Exemplo: abre às 18h' },
      savedCount: 231,
      isNew: true,
    },
    matchReason: 'Exemplo de combinação: seleção variada para compartilhar',
    source: illustrativeSource,
  },
  {
    contentKind: 'illustrative_menu_item',
    isIllustrative: true,
    id: 'illustrative-item-massa-lunar',
    name: 'Massa Lunar',
    description: 'Massa ao molho de tomate assado, ervas e queijo curado.',
    category: 'Massas',
    image: unsplashImage(
      'photo-1551183053-bf91a1d81141',
      'Imagem ilustrativa de massa com molho',
    ),
    restaurant: {
      id: 'illustrative-restaurant-massa-lunar',
      name: '[DEMO] Massa Lunar',
      category: 'Italiana',
    },
    example: {
      priceBRL: 34.9,
      distanceKm: 1.8,
      availability: { isOpenNow: true, label: 'Exemplo: aberto até 22h30' },
      savedCount: 126,
      isNew: true,
    },
    matchReason: 'Exemplo de combinação: prato reconfortante perto de você',
    source: illustrativeSource,
  },
  {
    contentKind: 'illustrative_menu_item',
    isIllustrative: true,
    id: 'illustrative-item-panela-beta',
    name: 'Arroz da Panela Beta',
    description: 'Arroz aromático, legumes assados e especiarias suaves.',
    category: 'Brasileira',
    image: unsplashImage(
      'photo-1563379091339-03b21ab4a4f8',
      'Imagem ilustrativa de arroz temperado',
    ),
    restaurant: {
      id: 'illustrative-restaurant-panela-beta',
      name: '[DEMO] Panela Beta',
      category: 'Brasileira',
    },
    example: {
      priceBRL: 29.5,
      distanceKm: 2.7,
      availability: { isOpenNow: true, label: 'Exemplo: aberto até 21h' },
      savedCount: 94,
      isNew: false,
    },
    matchReason: 'Exemplo de combinação: refeição completa por até R$ 30',
    source: illustrativeSource,
  },
  {
    contentKind: 'illustrative_menu_item',
    isIllustrative: true,
    id: 'illustrative-item-salmao-cometa',
    name: 'Salmão Cometa',
    description: 'Filé grelhado, legumes tostados e molho cítrico.',
    category: 'Peixes',
    image: unsplashImage(
      'photo-1519708227418-c8fd9a32b7a2',
      'Imagem ilustrativa de salmão grelhado',
    ),
    restaurant: {
      id: 'illustrative-restaurant-verde-cometa',
      name: '[DEMO] Verde Cometa',
      category: 'Contemporânea',
    },
    example: {
      priceBRL: 49.9,
      distanceKm: 4.2,
      availability: { isOpenNow: false, label: 'Exemplo: abre amanhã às 11h30' },
      savedCount: 149,
      isNew: false,
    },
    matchReason: 'Exemplo de combinação: alternativa leve para o almoço',
    source: illustrativeSource,
  },
  {
    contentKind: 'illustrative_menu_item',
    isIllustrative: true,
    id: 'illustrative-item-brunch-aurora',
    name: 'Brunch Aurora',
    description: 'Torradas, frutas frescas, mel e acompanhamento cremoso.',
    category: 'Café da manhã',
    image: unsplashImage(
      'photo-1484723091739-30a097e8f929',
      'Imagem ilustrativa de brunch com frutas',
    ),
    restaurant: {
      id: 'illustrative-restaurant-cafe-aurora',
      name: '[DEMO] Café Aurora',
      category: 'Cafeteria',
    },
    example: {
      priceBRL: 24,
      distanceKm: 0.9,
      availability: { isOpenNow: true, label: 'Exemplo: aberto até 18h' },
      savedCount: 207,
      isNew: true,
    },
    matchReason: 'Exemplo de combinação: café da manhã perto e até R$ 30',
    source: illustrativeSource,
  },
  {
    contentKind: 'illustrative_menu_item',
    isIllustrative: true,
    id: 'illustrative-item-file-quasar',
    name: 'Filé Quasar',
    description: 'Corte grelhado com vegetais, ervas e acompanhamento rústico.',
    category: 'Carnes',
    image: unsplashImage(
      'photo-1544025162-d76694265947',
      'Imagem ilustrativa de filé grelhado com acompanhamentos',
    ),
    restaurant: {
      id: 'illustrative-restaurant-brasa-quasar',
      name: '[DEMO] Brasa Quasar',
      category: 'Grelhados',
    },
    example: {
      priceBRL: 59.9,
      distanceKm: 3.6,
      availability: { isOpenNow: true, label: 'Exemplo: aberto até 23h30' },
      savedCount: 288,
      isNew: false,
    },
    matchReason: 'Exemplo de combinação: um dos exemplos mais salvos',
    source: illustrativeSource,
  },
] as const satisfies readonly IllustrativeMenuItem[];

export function getIllustrativeItemsUnder(
  priceBRL: number,
  items: readonly IllustrativeMenuItem[] = illustrativeMenuItems,
): IllustrativeMenuItem[] {
  return items.filter((item) => item.example.priceBRL <= priceBRL);
}

export function getOpenIllustrativeItems(
  items: readonly IllustrativeMenuItem[] = illustrativeMenuItems,
): IllustrativeMenuItem[] {
  return items.filter((item) => item.example.availability.isOpenNow);
}

export function getMostSavedIllustrativeItems(
  limit = 4,
  items: readonly IllustrativeMenuItem[] = illustrativeMenuItems,
): IllustrativeMenuItem[] {
  return [...items]
    .sort((left, right) => right.example.savedCount - left.example.savedCount)
    .slice(0, Math.max(0, limit));
}

export function getNewIllustrativeItems(
  items: readonly IllustrativeMenuItem[] = illustrativeMenuItems,
): IllustrativeMenuItem[] {
  return items.filter((item) => item.example.isNew);
}

export function createIllustrativeDiscoverySections(
  items: readonly IllustrativeMenuItem[] = illustrativeMenuItems,
): readonly IllustrativeDiscoverySection[] {
  const shared = {
    demoLabel: ILLUSTRATIVE_CONTENT_LABEL,
    disclaimer: ILLUSTRATIVE_CONTENT_NOTICE,
  } as const;

  return [
    {
      id: 'under_30',
      title: 'Até R$ 30',
      subtitle: 'Exemplos de como a IA pode organizar opções por orçamento.',
      ...shared,
      items: getIllustrativeItemsUnder(30, items),
    },
    {
      id: 'open_now',
      title: 'Abertos agora',
      subtitle: 'Horários ilustrativos para demonstrar o filtro de disponibilidade.',
      ...shared,
      items: getOpenIllustrativeItems(items),
    },
    {
      id: 'most_saved',
      title: 'Mais salvos',
      subtitle: 'Sinais sociais fictícios usados somente para validar a interface.',
      ...shared,
      items: getMostSavedIllustrativeItems(4, items),
    },
    {
      id: 'new_arrivals',
      title: 'Novos por aqui',
      subtitle: 'Exemplos marcados como novidade na experiência demonstrativa.',
      ...shared,
      items: getNewIllustrativeItems(items),
    },
  ];
}

export const illustrativeDiscoverySections = createIllustrativeDiscoverySections();


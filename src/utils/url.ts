import { generatePath } from 'react-router-dom';

// Define as chaves de rota e seus tipos de parâmetros
export const PATH_MAP = {
  // Rotas Públicas
  index: '/',
  splash: '/splash',
  welcome: '/welcome',
  auth: '/auth', // Rota de login/cadastro (usa query params: ?mode=signup)
  onboarding: '/onboarding',
  legal: '/legal',
  menuItemDetails: '/menu-item/:itemId',
  helpCenter: '/help-center',
  forgotPassword: '/forgot-password',
  restaurantResults: '/restaurant-results',
  
  // NOVO: Rota para o cardápio completo
  fullMenuPage: '/restaurant/:restaurantId/menu-full',
  
  // Rotas de Cliente (Autenticadas ou Públicas)
  home: '/home',
  favorites: '/favorites',
  clientProfile: '/profile',
  'search-unified': '/search-unified',
  
  // Rotas de Proprietário de Restaurante (Autenticadas)
  'restaurant-area-hub': '/restaurant-area-hub',
  'restaurant-login': '/restaurant-area/login',
  'restaurant-signup': '/restaurant-area/signup',
  'claim-restaurant': '/restaurant-area/claim',
  'restaurant-area/upgrade': '/restaurant-area/upgrade',
  
  'restaurant-area/home': '/restaurant-area/home',
  'restaurant-area/profile-menu': '/restaurant-area/profile-menu',
  'restaurant-area/menu': '/restaurant-area/menu',
  'restaurant-area/category-details': '/restaurant-area/menu/:categoryId',
  'restaurant-area/gallery': '/restaurant-area/gallery',
  'restaurant-area/metrics': '/restaurant-area/metrics', // Adicionado
  'restaurant-area/search': '/restaurant-area/search', // NOVA ROTA
  'restaurant-area/favorites': '/restaurant-area/favorites', // NOVA ROTA
  
  // Rotas Admin
  adminLogin: '/admin/login',
  adminDashboard: '/admin/dashboard',
  adminRestaurants: '/admin/restaurants',
  adminPlans: '/admin/plans',
  adminUsers: '/admin/users',
  adminSettings: '/admin/settings',
  adminCategories: '/admin/categories', // Adicionado para consistência
  adminFiles: '/admin/files', // Adicionado para consistência
  adminImport: '/admin/import', // Adicionado para consistência
  adminBanners: '/admin/banners', // NOVO: Adicionado para a página de banners
  
  // Rotas com parâmetros complexos (mantidas)
  restaurantProfile: '/restaurant/:restaurantId',
} as const;

export type PathKey = keyof typeof PATH_MAP; // EXPORTED

// Tipos de parâmetros de rota
type PathParams<K extends PathKey> = 
  K extends 'restaurantProfile'
    ? { restaurantId: string }
  : K extends 'menuItemDetails'
    ? { itemId: string }
  : K extends 'restaurant-area/category-details'
    ? { categoryId: string }
  : K extends 'fullMenuPage' // NOVO
    ? { restaurantId: string }
  : undefined;

// Tipos de parâmetros de consulta (query params)
type QueryParams<K extends PathKey> = 
  K extends 'auth' 
    ? { mode: 'login' | 'signup' } 
    : Record<string, string> | undefined;

/**
 * Retorna uma lista de chaves de rota que podem ser usadas como links de botões,
 * excluindo rotas que exigem parâmetros ou são específicas de autenticação/admin.
 */
export function getSelectablePagePaths(): { key: PathKey; label: string }[] {
  const excludedKeys: PathKey[] = [
    'auth', 'onboarding', 'legal', 'menuItemDetails', 'forgotPassword', 'restaurantResults',
    'fullMenuPage', 'restaurantProfile', // Rotas com parâmetros
    // 'restaurant-area-hub', // Removido da exclusão
    'restaurant-login', 'restaurant-signup', 'claim-restaurant',
    // 'restaurant-area/upgrade', // Removido da exclusão
    // 'restaurant-area/home', // Removido da exclusão
    // 'restaurant-area/profile-menu', // Removido da exclusão
    // 'restaurant-area/menu', // Removido da exclusão
    'restaurant-area/category-details', // Mantido, pois exige parâmetro
    // 'restaurant-area/gallery', // Removido da exclusão
    // 'restaurant-area/metrics', // Removido da exclusão
    // 'restaurant-area/search', // Removido da exclusão
    // 'restaurant-area/favorites', // Removido da exclusão
    'adminLogin', 'adminDashboard', 'adminRestaurants', 'adminPlans', 'adminUsers',
    'adminSettings', 'adminCategories', 'adminFiles', 'adminImport', 'adminBanners', // Rotas de admin
  ];

  const selectablePaths: { key: PathKey; label: string }[] = [];
  for (const key in PATH_MAP) {
    if (Object.prototype.hasOwnProperty.call(PATH_MAP, key) && !excludedKeys.includes(key as PathKey)) {
      // Capitaliza a primeira letra e substitui hífens por espaços para um label mais amigável
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace(/-/g, ' ');
      selectablePaths.push({ key: key as PathKey, label });
    }
  }
  return selectablePaths;
}

/**
 * Cria uma URL completa com base na chave da página, parâmetros de rota e parâmetros de consulta.
 * @param key A chave da rota definida em PATH_MAP.
 * @param params Parâmetros de rota (ex: { restaurantId: '123' }).
 * @param queryParams Parâmetros de consulta (ex: { tab: 'info' }).
 * @returns A URL formatada.
 */
export function createPageUrl<K extends PathKey>(
  key: K, 
  params?: PathParams<K>, 
  queryParams?: QueryParams<K>
): string {
  const pathTemplate = PATH_MAP[key];
  
  if (!pathTemplate) {
    console.error(`Path template not found for key: ${key}`);
    return '/'; // Fallback seguro
  }
  
  // 1. Gerar o caminho base com parâmetros de rota
  let path: string;
  try {
    // Casting para 'any' para resolver o erro de compatibilidade estrutural profunda
    path = generatePath(pathTemplate, params as any);
  } catch (e) {
    console.error(`Error generating path for key ${key} with params:`, params, e);
    // Se a geração falhar (ex: parâmetro obrigatório faltando), retorna o template ou um fallback
    path = pathTemplate; 
  }

  // 2. Adicionar parâmetros de consulta (query params)
  const finalQueryParams = queryParams;
  
  if (finalQueryParams && Object.keys(finalQueryParams).length > 0) {
    const searchParams = new URLSearchParams(finalQueryParams as Record<string, string>);
    path += `?${searchParams.toString()}`;
  }

  return path;
}
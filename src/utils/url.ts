import { generatePath } from 'react-router-dom';

// Define as chaves de rota e seus tipos de parâmetros
export const PATH_MAP = {
  // Rotas Públicas
  index: '/',
  splash: '/splash',
  welcome: '/welcome',
  auth: '/auth', // Rota de login/cadastro (usa query params: ?mode=signup)
  onboarding: '/onboarding',
  
  // Rotas de Cliente (Autenticadas ou Públicas)
  home: '/home',
  favorites: '/favorites',
  clientProfile: '/profile',
  editProfile: '/profile/edit',
  'search-unified': '/search',
  'search-restaurants': '/search/restaurants',
  'search-menu-items': '/search/menu',
  restaurantProfile: '/restaurant/:restaurantId',
  
  // Rotas de Proprietário de Restaurante (Autenticadas)
  'restaurant-area/home': '/restaurant-area/:restaurantId/dashboard',
  'restaurant-area/profile-menu': '/restaurant-area/:restaurantId/settings',
  'restaurant-area/edit-info': '/restaurant-area/:restaurantId/settings/info',
  'restaurant-area/edit-hours': '/restaurant-area/:restaurantId/settings/hours',
  'restaurant-area/edit-links': '/restaurant-area/:restaurantId/settings/links',
  'restaurant-area/menu-management': '/restaurant-area/:restaurantId/menu',
  'restaurant-area/add-category': '/restaurant-area/:restaurantId/menu/add-category',
  'restaurant-area/edit-category': '/restaurant-area/:restaurantId/menu/edit-category/:categoryId',
  'restaurant-area/add-item': '/restaurant-area/:restaurantId/menu/add-item/:categoryId',
  'restaurant-area/edit-item': '/restaurant-area/:restaurantId/menu/edit-item/:itemId',
  'restaurant-area/gallery': '/restaurant-area/:restaurantId/gallery',
  
  // Rotas de Admin
  'admin/dashboard': '/admin/dashboard',
  'admin/restaurants': '/admin/restaurants',
  'admin/edit-restaurant': '/admin/restaurant/:restaurantId/edit',
} as const;

type PathKey = keyof typeof PATH_MAP;

// Tipos de parâmetros de rota
type PathParams<K extends PathKey> = 
  K extends 'restaurantProfile' | 'restaurant-area/home' | 'restaurant-area/profile-menu' | 'restaurant-area/edit-info' | 'restaurant-area/edit-hours' | 'restaurant-area/edit-links' | 'restaurant-area/menu-management' | 'restaurant-area/gallery' | 'restaurant-area/add-category' | 'admin/edit-restaurant'
    ? { restaurantId: string }
  : K extends 'restaurant-area/edit-category'
    ? { restaurantId: string, categoryId: string }
  : K extends 'restaurant-area/add-item'
    ? { restaurantId: string, categoryId: string }
  : K extends 'restaurant-area/edit-item'
    ? { restaurantId: string, itemId: string }
  : K extends 'auth'
    ? { mode: 'login' | 'signup' } // Adicionando parâmetros de consulta para 'auth'
  : undefined;

// Tipos de parâmetros de consulta (query params)
type QueryParams<K extends PathKey> = 
  K extends 'auth' 
    ? { mode: 'login' | 'signup' } 
    : Record<string, string> | undefined;

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
  
  // 1. Gerar o caminho base com parâmetros de rota
  let path = generatePath(pathTemplate, params as Record<string, string | number | boolean | undefined>);

  // 2. Adicionar parâmetros de consulta (query params)
  const finalQueryParams = queryParams || (key === 'auth' ? params : undefined);
  
  if (finalQueryParams && Object.keys(finalQueryParams).length > 0) {
    const searchParams = new URLSearchParams(finalQueryParams as Record<string, string>);
    path += `?${searchParams.toString()}`;
  }

  return path;
}
import { generatePath } from 'react-router-dom';

// Define as chaves de rota e seus tipos de parâmetros
export const PATH_MAP = {
  // Rotas Públicas
  index: '/',
  splash: '/splash',
  welcome: '/welcome',
  auth: '/auth', // Rota de login/cadastro (usa query params: ?mode=signup)
  onboarding: '/onboarding',
  legal: '/legal', // ADDED
  helpCenter: '/help-center', // ADDED
  menuItemDetails: '/menu-item/:itemId', // ADDED
  
  // Rotas de Cliente (Autenticadas ou Públicas)
  home: '/home',
  favorites: '/favorites',
  clientProfile: '/profile',
  editProfile: '/profile/edit',
  'search-unified': '/search-unified',
  'search-restaurants': '/search/restaurants',
  'search-menu-items': '/search/menu',
  restaurantProfile: '/restaurant/:restaurantId',
  
  // Rotas de Proprietário de Restaurante (Hub e Autenticadas)
  'restaurant-area': '/restaurant-area', // ADDED (Redirects to hub/login)
  'restaurant-area-hub': '/restaurant-area-hub', // ADDED
  'restaurant-login': '/restaurant-area/login', // ADDED
  'restaurant-signup': '/restaurant-area/signup', // ADDED
  'claim-restaurant': '/restaurant-area/claim', // ADDED
  'restaurant-area/home': '/restaurant-area/home',
  'restaurant-area/profile-menu': '/restaurant-area/profile-menu',
  'restaurant-area/menu': '/restaurant-area/menu',
  'restaurant-area/gallery': '/restaurant-area/gallery',
  'restaurant-area/upgrade': '/restaurant-area/upgrade', // ADDED
  
  // Rotas de Admin
  adminLogin: '/admin/login', // ADDED
  adminDashboard: '/admin/dashboard', // ADDED
  'admin/dashboard': '/admin/dashboard',
  'admin/restaurants': '/admin/restaurants',
  'admin/plans': '/admin/plans', // ADDED
  'admin/users': '/admin/users', // ADDED
  'admin/settings': '/admin/settings', // ADDED
  'admin/edit-restaurant': '/admin/restaurant/:restaurantId/edit',
} as const;

export type PathKey = keyof typeof PATH_MAP; // EXPORTED

// Tipos de parâmetros de rota
type PathParams<K extends PathKey> = 
  K extends 'restaurantProfile' | 'admin/edit-restaurant'
    ? { restaurantId: string }
  : K extends 'menuItemDetails'
    ? { itemId: string }
  : K extends 'auth'
    ? { mode: 'login' | 'signup' }
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
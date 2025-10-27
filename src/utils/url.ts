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
  menuItemDetails: '/menu-item/:itemId', // ADDED
  helpCenter: '/help-center', // ADDED
  forgotPassword: '/forgot-password', // ADDED
  restaurantResults: '/restaurant-results', // ADDED
  
  // Rotas de Cliente (Autenticadas ou Públicas)
  home: '/home',
  favorites: '/favorites',
  clientProfile: '/profile',
  editProfile: '/profile/edit',
  'search-unified': '/search-unified',
  'search-restaurants': '/search/restaurants',
  'search-menu-items': '/search/menu',
  restaurantProfile: '/restaurant/:restaurantId',
  
  // Rotas de Proprietário de Restaurante (Autenticadas)
  'restaurant-area': '/restaurant-area', // ADDED (for hub back button)
  'restaurant-area-hub': '/restaurant-area-hub', // ADDED
  'restaurant-login': '/restaurant-area/login', // ADDED
  'restaurant-signup': '/restaurant-area/signup', // ADDED
  'claim-restaurant': '/restaurant-area/claim', // ADDED
  'restaurant-area/upgrade': '/restaurant-area/upgrade', // ADDED
  
  'restaurant-area/home': '/restaurant-area/home', // Simplified path for dashboard entry
  'restaurant-area/profile-menu': '/restaurant-area/profile-menu', // Simplified path for settings entry
  'restaurant-area/menu': '/restaurant-area/menu', // Simplified path for menu management
  'restaurant-area/category-details': '/restaurant-area/menu/:categoryId', // ADDED
  'restaurant-area/gallery': '/restaurant-area/gallery', // Simplified path for gallery
  
  // Rotas Admin
  adminLogin: '/admin/login',
  adminDashboard: '/admin/dashboard',
  adminRestaurants: '/admin/restaurants', // ADDED
  adminPlans: '/admin/plans', // ADDED
  adminUsers: '/admin/users', // ADDED
  adminSettings: '/admin/settings', // ADDED
  
  // Rotas com parâmetros complexos (mantidas)
  'restaurant-area/edit-info': '/restaurant-area/:restaurantId/settings/info',
  'restaurant-area/edit-hours': '/restaurant-area/:restaurantId/settings/hours',
  'restaurant-area/edit-links': '/restaurant-area/:restaurantId/settings/links',
  'restaurant-area/menu-management': '/restaurant-area/:restaurantId/menu',
  'restaurant-area/add-category': '/restaurant-area/:restaurantId/menu/add-category',
  'restaurant-area/edit-category': '/restaurant-area/:restaurantId/menu/edit-category/:categoryId',
  'restaurant-area/add-item': '/restaurant-area/:restaurantId/menu/add-item/:categoryId',
  'restaurant-area/edit-item': '/restaurant-area/:restaurantId/menu/edit-item/:itemId',
  'admin/edit-restaurant': '/admin/restaurant/:restaurantId/edit',
} as const;

export type PathKey = keyof typeof PATH_MAP; // EXPORTED

// Tipos de parâmetros de rota
type PathParams<K extends PathKey> = 
  K extends 'restaurantProfile' | 'admin/edit-restaurant'
    ? { restaurantId: string }
  : K extends 'menuItemDetails' | 'restaurant-area/edit-item'
    ? { itemId: string }
  : K extends 'restaurant-area/edit-category' | 'restaurant-area/add-item' | 'restaurant-area/category-details'
    ? { categoryId: string }
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
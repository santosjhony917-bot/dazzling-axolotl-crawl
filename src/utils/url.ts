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
  'restaurant-area/social-networks': '/restaurant-area/social-networks', // ADICIONADO
  
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
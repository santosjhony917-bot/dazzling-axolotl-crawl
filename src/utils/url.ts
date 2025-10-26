import { generatePath } from 'react-router-dom';

// Define todas as chaves de rota possíveis na aplicação
export type PathKey = 
  | 'index'
  | 'home'
  | 'auth'
  | 'login'
  | 'register'
  | 'profile'
  | 'favorites'
  | 'onboarding'
  | 'welcome'
  | 'legal'
  | 'customer-login'
  | 'search-unified'
  | 'search-restaurants'
  | 'restaurantProfile'
  | 'menuItemDetails'
  | 'help-center'
  | 'restaurantResults' // Adicionado
  
  // Admin
  | 'admin' // Adicionado (para rotas aninhadas)
  | 'adminLogin'
  | 'adminDashboard' // Adicionado
  | 'admin/dashboard'
  | 'admin/users'
  | 'admin/restaurants'
  | 'admin/edit-restaurant'
  
  // Restaurant Area
  | 'restaurant-area' // Adicionado
  | 'restaurant-area-hub' // Adicionado
  | 'restaurant-login' // Adicionado
  | 'restaurant-signup' // Adicionado
  | 'claim-restaurant' // Adicionado
  | 'restaurant-area/home'
  | 'restaurant-area/profile-menu'
  | 'restaurant-area/menu'
  | 'restaurant-area/gallery'
  | 'restaurant-area/upgrade'
  | 'restaurant-area/menu/edit-category'
  | 'restaurant-area/menu/edit-item';

// Mapeamento de chaves para caminhos reais
const PATH_MAP: Record<PathKey, string> = {
  'index': '/',
  'home': '/home',
  'auth': '/auth',
  'login': '/auth?tab=login',
  'register': '/auth?tab=register',
  'profile': '/profile',
  'favorites': '/favorites',
  'onboarding': '/onboarding',
  'welcome': '/welcome',
  'legal': '/legal',
  'customer-login': '/customer-login',
  'search-unified': '/search-unified',
  'search-restaurants': '/search-unified?tab=restaurants',
  'restaurantProfile': '/restaurant/:restaurantId',
  'menuItemDetails': '/menu-item/:itemId',
  'help-center': '/help-center',
  'restaurantResults': '/search-unified/results', // Rota de resultados de busca
  
  // Admin
  'admin': '/admin', // Rota base
  'adminLogin': '/admin/login',
  'adminDashboard': '/admin/dashboard', // Rota principal
  'admin/dashboard': '/admin/dashboard',
  'admin/users': '/admin/dashboard/users',
  'admin/restaurants': '/admin/dashboard/restaurants',
  'admin/edit-restaurant': '/admin/dashboard/restaurants/:restaurantId',
  
  // Restaurant Area
  'restaurant-area': '/restaurant-area', // Rota base
  'restaurant-area-hub': '/restaurant-area-hub',
  'restaurant-login': '/restaurant-area/login',
  'restaurant-signup': '/restaurant-area/signup',
  'claim-restaurant': '/restaurant-area/claim',
  'restaurant-area/home': '/restaurant-area/home',
  'restaurant-area/profile-menu': '/restaurant-area/profile-menu',
  'restaurant-area/menu': '/restaurant-area/menu',
  'restaurant-area/gallery': '/restaurant-area/gallery',
  'restaurant-area/upgrade': '/restaurant-area/upgrade',
  'restaurant-area/menu/edit-category': '/restaurant-area/menu/edit-category/:categoryId?',
  'restaurant-area/menu/edit-item': '/restaurant-area/menu/edit-item/:itemId?',
};

/**
 * Cria uma URL baseada na chave da página e parâmetros opcionais.
 * @param key A chave da página (PathKey).
 * @param params Parâmetros de rota (ex: { restaurantId: '123' }).
 * @returns A URL formatada.
 */
export function createPageUrl(key: PathKey, params?: Record<string, string | number>): string {
  const path = PATH_MAP[key];
  if (!path) {
    console.error(`Path key not found: ${key}`);
    return '/';
  }
  return generatePath(path, params as Record<string, string>);
}
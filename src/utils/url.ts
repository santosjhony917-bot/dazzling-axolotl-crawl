// Define as rotas principais da aplicação
const routes = {
  home: '/home',
  welcome: '/',
  auth: '/auth',
  legal: '/legal',
  
  // Rotas de Cliente
  onboarding: '/onboarding',
  'search-unified': '/search', // Rota unificada de busca
  'search-restaurants': '/search/restaurants', // Rota de busca de restaurantes (usada no Upgrade)
  favorites: '/favorites',
  helpCenter: '/help',
  menuItemDetails: '/item/:itemId',
  index: '/', // Usado como fallback para o início (welcome)

  // Rotas de Restaurante (Área Logada)
  restaurantAreaHub: '/restaurant-area',
  'restaurant-area/home': '/restaurant-area/dashboard', // Dashboard principal
  'restaurant-area/dashboard': '/restaurant-area/dashboard', // Alias para o dashboard
  'restaurant-area/menu': '/restaurant-area/menu',
  'restaurant-area/profile-menu': '/restaurant-area/profile', // Menu de gerenciamento de perfil
  'restaurant-area/settings': '/restaurant-area/settings',
  'restaurant-area/gallery': '/restaurant-area/gallery',
  'restaurant-area/upgrade': '/restaurant-area/upgrade',
  restaurantProfile: '/restaurant/:restaurantId',
  
  // Rotas de Autenticação de Restaurante
  'restaurant-login': '/restaurant/login',
  'restaurant-signup': '/restaurant/signup',
  
  // Rotas de Administração
  adminLogin: '/admin/login',
  adminDashboard: '/admin/dashboard',
  adminRestaurants: '/admin/restaurants',
  adminUsers: '/admin/users',
  adminTransactions: '/admin/transactions',
  adminSettings: '/admin/settings',
  'admin/edit-restaurant': '/admin/restaurants/edit/:restaurantId', // Rota de edição de restaurante
};

/**
 * Cria uma URL baseada no nome da página.
 * @param pageName O nome da página (chave no objeto routes).
 * @param params Parâmetros de rota opcionais para substituição (ex: { restaurantId: '123' }).
 * @returns A URL completa.
 */
export function createPageUrl(pageName: keyof typeof routes, params?: Record<string, string | number>): string {
  let url = routes[pageName];

  if (!url) {
    console.error(`Route not found for pageName: ${pageName}`);
    return '/';
  }

  if (params) {
    for (const key in params) {
      url = url.replace(`:${key}`, String(params[key]));
    }
  }

  return url;
}
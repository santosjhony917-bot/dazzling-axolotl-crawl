import { generatePath } from 'react-router-dom';

// Define as chaves de rota e seus tipos de parâmetros
export const PATH_MAP = {
  // Public Routes
  index: '/',
  splash: '/splash',
  welcome: '/welcome',
  auth: '/auth',
  onboarding: '/onboarding',
  legal: '/legal',
  forgotPassword: '/forgot-password',
  helpCenter: '/help-center',
  unauthorized: '/unauthorized',
  notFound: '*',

  // Client-facing Public Routes (can be accessed by anyone, but might show different content if authenticated)
  restaurantProfile: '/restaurant/:restaurantId', // Public profile view
  fullMenuPage: '/restaurant/:restaurantId/menu-full', // Public full menu view
  menuItemDetails: '/menu-item/:itemId', // Public menu item details
  restaurantResults: '/restaurant-results', // Search results page
  searchUnified: '/search-unified', // Unified search page
  popularDishes: '/popular-dishes', // Popular dishes page

  // Authenticated Client Routes (requires login)
  home: '/home', // Main client home after login
  favorites: '/favorites',
  clientProfile: '/profile', // Client's own profile settings

  // Restaurant Owner Routes (requires restaurant owner role)
  restaurantAreaHub: '/restaurant-area-hub', // Hub for restaurant owners (login, signup, claim)
  restaurantLogin: '/restaurant-area/login',
  restaurantSignup: '/restaurant-area/signup',
  claimRestaurant: '/restaurant-area/claim',
  restaurantAreaHome: '/restaurant-area/home', // Restaurant owner dashboard/home
  restaurantAreaProfileMenu: '/restaurant-area/profile-menu', // Profile settings for restaurant
  restaurantAreaMenu: '/restaurant-area/menu', // Menu management overview
  restaurantAreaCategoryDetails: '/restaurant-area/menu/:categoryId', // Specific category details
  restaurantAreaGallery: '/restaurant-area/gallery', // Gallery management
  restaurantAreaMetrics: '/restaurant-area/metrics', // Metrics page
  restaurantAreaUpgrade: '/restaurant-area/upgrade', // Upgrade plan page
  restaurantAreaSearch: '/restaurant-area/search', // Restaurant-specific search (if any)
  restaurantAreaFavorites: '/restaurant-area/favorites', // Restaurant-specific favorites (if any)

  // Admin Routes (requires admin role)
  adminLogin: '/admin/login',
  adminDashboard: '/admin/dashboard',
  adminRestaurants: '/admin/restaurants',
  adminPlans: '/admin/plans',
  adminUsers: '/admin/users',
  adminSettings: '/admin/settings',
  adminCategories: '/admin/categories',
  adminFiles: '/admin/files',
  adminImport: '/admin/import',
  adminBanners: '/admin/banners',
  adminUploadInfo: '/admin/upload-info',
  adminEditRestaurant: '/admin/restaurants/:restaurantId/edit',
  adminManageAdmins: '/admin/manage-admins',
  adminPopularCategories: '/admin/popular-categories',
  adminInstantMetrics: '/admin/instant-metrics',
  adminManagePlans: '/admin/manage-plans',
  adminScheduledMetrics: '/admin/scheduled-metrics',
} as const;

export type PathKey = keyof typeof PATH_MAP; // EXPORTED

// Tipos de parâmetros de rota
type PathParams<K extends PathKey> = 
  K extends 'restaurantProfile'
    ? { restaurantId: string }
  : K extends 'menuItemDetails'
    ? { itemId: string }
  : K extends 'restaurantAreaCategoryDetails'
    ? { categoryId: string }
  : K extends 'fullMenuPage'
    ? { restaurantId: string }
  : K extends 'adminEditRestaurant'
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
    'restaurantAreaCategoryDetails', // Mantido, pois exige parâmetro
    'adminLogin', 'adminDashboard', 'adminRestaurants', 'adminPlans', 'adminUsers',
    'adminSettings', 'adminCategories', 'adminFiles', 'adminImport', 'adminBanners', // Rotas de admin
    'adminUploadInfo', 'adminEditRestaurant', 'adminManageAdmins', 'adminPopularCategories',
    'adminInstantMetrics', 'adminManagePlans', 'adminScheduledMetrics',
    'unauthorized', 'notFound', 'index', 'splash', // Rotas de sistema
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
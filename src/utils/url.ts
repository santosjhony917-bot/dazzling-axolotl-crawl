import { generatePath } from 'react-router-dom';

// Define all application paths here
const PATHS = {
  index: '/',
  // Customer Flow
  home: '/home',
  auth: '/auth', // Unified login/register for customers
  login: '/login', // Redirects to auth
  register: '/register', // Redirects to auth
  profile: '/profile',
  favorites: '/favorites',
  onboarding: '/onboarding',
  welcome: '/welcome',
  legal: '/legal',
  'customer-login': '/auth', // Alias for customer login
  'search-unified': '/search-unified', // Rota de busca unificada
  'search-restaurants': '/search-restaurants', // Rota de filtros (mantida)
  
  // Restaurant Flow
  'restaurant-area': '/restaurant-area',
  'restaurant-area-hub': '/restaurant-area-hub',
  'restaurant-login': '/restaurant-login',
  'restaurant-signup': '/restaurant-signup',
  'claim-restaurant': '/claim-restaurant',
  'restaurant-area/home': '/restaurant-area/home',
  // 'restaurant-area/stats': '/restaurant-area/stats', // REMOVIDO
  'restaurant-area/menu': '/restaurant-area/menu',
  'restaurant-area/categories': '/restaurant-area/categories',
  'restaurant-area/upgrade': '/restaurant-area/upgrade',
  'restaurant-area/profile-menu': '/restaurant-area/profile-menu',
  'restaurant-area/help': '/restaurant-area/help',
  'restaurant-area/gallery': '/restaurant-area/gallery',

  // Public Restaurant Profile
  restaurantProfile: '/restaurant/:restaurantId',
  restaurantResults: '/results',
  restaurantDashboard: '/restaurant/dashboard',
  restaurantMenu: '/restaurant/menu',
  restaurantGallery: '/restaurant/gallery',
  restaurantSettings: '/restaurant/settings',

  // Admin Flow
  adminLogin: '/admin/login',
  adminDashboard: '/admin/dashboard',
  admin: '/admin/:subPath', // Used for nested admin routes
  'admin/edit-restaurant': '/admin/edit-restaurant', // Specific admin page
};

export type PathKey = keyof typeof PATHS;
type PathParams = Record<string, string | number | undefined>;

/**
 * Generates a URL path based on a key and optional parameters.
 * @param pathKey The key of the path defined in PATHS.
 * @param params Optional parameters to replace in the path (e.g., { restaurantId: '123' }).
 * @returns The generated URL string.
 */
export const createPageUrl = (pathKey: PathKey, params?: PathParams): string => {
  const path = PATHS[pathKey];
  if (!path) {
    console.error(`Path key "${pathKey}" not found in PATHS.`);
    return '/';
  }
  
  // Filter out undefined params before passing to generatePath
  const definedParams = Object.entries(params || {}).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = String(value);
    }
    return acc;
  }, {} as Record<string, string>);

  try {
    return generatePath(path, definedParams);
  } catch (e) {
    console.error(`Error generating path for ${pathKey} with params:`, params, e);
    return path;
  }
};
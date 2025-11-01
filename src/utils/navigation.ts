// src/utils/navigation.ts

// Define um mapa de rotas com seus padrões de URL
const routePaths = {
  home: '/',
  auth: '/auth',
  profile: '/profile',
  restaurantProfile: '/restaurant/:restaurantId',
  searchResults: '/search-results',
  claimRestaurant: '/claim-restaurant',
  restaurantDashboard: '/restaurant/dashboard',
  restaurantMenu: '/restaurant/menu',
  restaurantGallery: '/restaurant/gallery',
  restaurantSettings: '/restaurant/settings',
  restaurantMetrics: '/restaurant/metrics',
  restaurantUpgrade: '/restaurant/upgrade',
  adminDashboard: '/admin/dashboard',
  adminLogin: '/admin/login',
  adminRestaurants: '/admin/restaurants',
  adminUsers: '/admin/users',
  adminPlans: '/admin/plans',
  adminBanners: '/admin/banners',
  adminSettings: '/admin/settings',
  categoryDetails: '/restaurant/menu/:categoryId',
  menuItemDetails: '/menu-item/:itemId',
  favorites: '/favorites',
  fullMenu: '/restaurant/:restaurantId/menu',
  // Adicione outras rotas conforme necessário
};

type RouteName = keyof typeof routePaths;

interface RouteParams {
  [key: string]: string | number;
}

export const createPageUrl = (routeName: RouteName, params?: RouteParams): string => {
  let path = routePaths[routeName];

  if (!path) {
    console.warn(`Route "${routeName}" not found in routePaths.`);
    return '/'; // Fallback to home
  }

  if (params) {
    for (const key in params) {
      path = path.replace(`:${key}`, String(params[key]));
    }
  }

  // Remove any remaining parameter placeholders if not provided
  path = path.replace(/\/:[a-zA-Z0-9_]+/g, '');

  return path;
};
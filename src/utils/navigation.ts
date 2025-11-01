// src/utils/navigation.ts

// Define um mapa de rotas com seus padrões de URL
const routePaths = {
  home: '/',
  auth: '/auth',
  profile: '/profile',
  restaurantProfile: '/restaurant/:restaurantId',
  searchResults: '/restaurant-results', // Corrected to match App.tsx
  claimRestaurant: '/claim-restaurant',
  restaurantDashboard: '/restaurant-area/home', // Corrected to match App.tsx
  restaurantMenu: '/restaurant-area/menu',
  restaurantGallery: '/restaurant-area/gallery',
  restaurantSettings: '/restaurant-area/profile-menu', // Corrected to match App.tsx
  restaurantMetrics: '/restaurant-area/metrics',
  restaurantUpgrade: '/restaurant-area/upgrade',
  adminDashboard: '/admin/dashboard',
  adminLogin: '/admin/login',
  adminRestaurants: '/admin/restaurants',
  adminUsers: '/admin/users',
  adminPlans: '/admin/plans',
  adminBanners: '/admin/banners',
  adminSettings: '/admin/settings',
  categoryDetails: '/restaurant-area/menu/:categoryId',
  menuItemDetails: '/menu-item/:itemId',
  favorites: '/favorites',
  fullMenu: '/restaurant/:restaurantId/menu-full', // Corrected to match App.tsx
  searchUnified: '/search', // Added for unified search page
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
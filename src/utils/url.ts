// Define the mapping of path keys to their actual URL paths
const PATH_MAP = {
  // Client/Public Routes
  home: '/',
  index: '/', // Alias for home
  login: '/login',
  auth: '/auth', // Main authentication page
  favorites: '/favorites',
  clientProfile: '/profile',
  restaurantProfile: '/restaurant/:restaurantId',
  editProfile: '/profile/edit',
  welcome: '/welcome',
  onboarding: '/onboarding',
  'search-unified': '/search',
  'search-restaurants': '/search/restaurants',
  legal: '/legal',
  forgotPassword: '/forgot-password',
  menuItemDetails: '/menu-item/:itemId',
  'help-center': '/help-center',

  // Restaurant Area Routes
  'restaurant-area-hub': '/restaurant-area',
  'restaurant-login': '/restaurant-area/login',
  'restaurant-signup': '/restaurant-area/signup',
  'claim-restaurant': '/restaurant-area/claim',
  'restaurant-area': '/restaurant-area', // General area route
  'restaurant-area/home': '/restaurant-area/dashboard', // Dashboard home
  'restaurant-area/menu': '/restaurant-area/menu',
  'restaurant-area/gallery': '/restaurant-area/gallery',
  'restaurant-area/profile-menu': '/restaurant-area/profile', // Profile management menu
  'restaurant-area/upgrade': '/restaurant-area/upgrade',

  // Admin Routes
  admin: '/admin',
  adminLogin: '/admin/login',
  adminDashboard: '/admin/dashboard',
  'admin/edit-restaurant': '/admin/restaurant/:restaurantId/edit',
};

// Define the type for all valid path keys
export type PathKey = keyof typeof PATH_MAP;

// Define the required parameters for paths that use dynamic segments
interface PathParams {
  restaurantProfile: { restaurantId: string };
  restaurantDashboard: { restaurantId: string };
  restaurantSettings: { restaurantId: string };
  menuItemDetails: { itemId: string };
  'admin/edit-restaurant': { restaurantId: string };
  admin: { subPath: string }; // Used for admin navigation links
}

// Generic function to create URLs safely
export function createPageUrl<K extends PathKey>(
  key: K,
  params?: K extends keyof PathParams ? PathParams[K] : undefined
): string {
  let path = PATH_MAP[key];

  if (params) {
    // Replace dynamic segments with provided parameters
    for (const [paramKey, paramValue] of Object.entries(params)) {
      path = path.replace(`:${paramKey}`, String(paramValue));
    }
  }

  return path;
}
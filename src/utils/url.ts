import { generatePath } from 'react-router-dom';

// Define all application paths here
const PATHS = {
  index: '/',
  login: '/login',
  register: '/register',
  profile: '/profile',
  favorites: '/favorites',
  restaurantProfile: '/restaurant/:restaurantId',
  restaurantResults: '/results',
  restaurantDashboard: '/restaurant/dashboard',
  restaurantMenu: '/restaurant/menu',
  restaurantGallery: '/restaurant/gallery',
  restaurantSettings: '/restaurant/settings',
  adminLogin: '/admin/login',
  adminDashboard: '/admin/dashboard',
  admin: '/admin/:subPath', // Used for nested admin routes
};

type PathKey = keyof typeof PATHS;
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
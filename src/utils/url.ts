type PageKey =
  | "index"
  | "splash"
  | "welcome"
  | "auth"
  | "onboarding"
  | "legal"
  | "menuItemDetails"
  | "helpCenter"
  | "forgotPassword"
  | "restaurantResults"
  | "fullMenuPage"
  | "home"
  | "favorites"
  | "profile"
  | "adminLogin"
  | "adminDashboard"
  | "adminRestaurants"
  | "adminUsers"
  | "adminBanners"
  | "adminMetrics"
  | "restaurantProfile"
  | "restaurant-area-home"
  | "restaurant-area-info"
  | "restaurant-area-menu"
  | "restaurant-area-gallery"
  | "restaurant-area-social-media"
  | "restaurant-area-opening-hours"
  | "restaurant-area-payment-methods"
  | "restaurant-area-metrics"
  | "restaurant-area-settings"
  | "restaurant-area-create"
  | "restaurant-area-hub"
  | "restaurant-area-upgrade" // Confirmado e explicitamente incluído
  | "restaurant-area-favorites"
  | "restaurant-area-search"
  | "restaurant-area-profile-menu"
  | "restaurant-area-category-details"
  | "restaurant-signup"
  | "restaurant-login"
  | "search-unified"
  | "adminPlans"
  | "adminCategories"
  | "adminFiles"
  | "adminImport"
  | "adminSettings";

type PageParams = {
  restaurantId?: string;
  menuItemId?: string;
  categoryId?: string;
  searchQuery?: string; // Adicionado para SearchUnifiedPage
  minPrice?: string;    // Adicionado para SearchUnifiedPage
  maxPrice?: string;    // Adicionado para SearchUnifiedPage
  maxDistance?: string; // Adicionado para SearchUnifiedPage
  category?: string;    // Adicionado para SearchUnifiedPage
  type?: string;        // Adicionado para SearchUnifiedPage
};

const pageRoutes: Record<PageKey, string> = {
  index: "/",
  splash: "/splash",
  welcome: "/welcome",
  auth: "/auth",
  onboarding: "/onboarding",
  legal: "/legal",
  menuItemDetails: "/menu-item/:menuItemId",
  helpCenter: "/help-center",
  forgotPassword: "/forgot-password",
  restaurantResults: "/restaurant-results",
  fullMenuPage: "/restaurant/:restaurantId/menu",
  home: "/home",
  favorites: "/favorites",
  profile: "/profile",
  adminLogin: "/admin/login",
  adminDashboard: "/admin/dashboard",
  adminRestaurants: "/admin/restaurants",
  adminUsers: "/admin/users",
  adminBanners: "/admin/banners",
  adminMetrics: "/admin/metrics",
  restaurantProfile: "/restaurant/:restaurantId",
  "restaurant-area-home": "/restaurant-area/home",
  "restaurant-area-info": "/restaurant-area/info",
  "restaurant-area-menu": "/restaurant-area/menu",
  "restaurant-area-gallery": "/restaurant-area/gallery",
  "restaurant-area-social-media": "/restaurant-area/social-media",
  "restaurant-area-opening-hours": "/restaurant-area/opening-hours",
  "restaurant-area-payment-methods": "/restaurant-area/payment-methods",
  "restaurant-area-metrics": "/restaurant-area/metrics",
  "restaurant-area-settings": "/restaurant-area/settings",
  "restaurant-area-create": "/restaurant-area/create",
  "restaurant-area-hub": "/restaurant-area/hub",
  "restaurant-area-upgrade": "/restaurant-area/upgrade", // Confirmado e explicitamente incluído
  "restaurant-area-favorites": "/restaurant-area/favorites",
  "restaurant-area-search": "/restaurant-area/search",
  "restaurant-area-profile-menu": "/restaurant-area/profile-menu",
  "restaurant-area-category-details": "/restaurant-area/menu/category/:categoryId",
  "restaurant-signup": "/restaurant-signup",
  "restaurant-login": "/restaurant-login",
  "search-unified": "/search-unified",
  "adminPlans": "/admin/plans",
  "adminCategories": "/admin/categories",
  "adminFiles": "/admin/files",
  "adminImport": "/admin/import",
  "adminSettings": "/admin/settings",
};

export const createPageUrl = (key: PageKey, params?: PageParams): string => {
  let url = pageRoutes[key];

  if (!url) {
    console.error(`Path template not found for key: ${key}`);
    return '/'; // Fallback seguro
  }

  // Substituir parâmetros de rota
  if (params?.restaurantId) {
    url = url.replace(":restaurantId", params.restaurantId);
  }
  if (params?.menuItemId) {
    url = url.replace(":menuItemId", params.menuItemId);
  }
  if (params?.categoryId) {
    url = url.replace(":categoryId", params.categoryId);
  }

  // Adicionar parâmetros de query
  const queryParams = new URLSearchParams();
  if (params?.searchQuery) queryParams.append('searchQuery', params.searchQuery);
  if (params?.minPrice) queryParams.append('minPrice', params.minPrice);
  if (params?.maxPrice) queryParams.append('maxPrice', params.maxPrice);
  if (params?.maxDistance) queryParams.append('maxDistance', params.maxDistance);
  if (params?.category) queryParams.append('category', params.category);
  if (params?.type) queryParams.append('type', params.type);

  if (queryParams.toString()) {
    url += `?${queryParams.toString()}`;
  }

  return url;
};

export const getSelectablePagePaths = (): { label: string; value: string }[] => {
  return Object.entries(pageRoutes)
    .filter(([key]) => !key.startsWith('admin') && !key.startsWith('restaurant-area') && !key.includes(':'))
    .map(([key, value]) => ({
      label: key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: value,
    }));
};
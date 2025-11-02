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
  | "restaurant-area-hub" // Adicionado
  | "restaurant-area-upgrade" // Adicionado
  | "restaurant-area-favorites" // Adicionado
  | "restaurant-area-search" // Adicionado
  | "restaurant-area-profile-menu" // Adicionado
  | "restaurant-area-category-details" // Adicionado
  | "restaurant-signup" // Adicionado
  | "restaurant-login" // Adicionado
  | "search-unified" // Adicionado
  | "adminPlans" // Adicionado
  | "adminCategories" // Adicionado
  | "adminFiles" // Adicionado
  | "adminImport" // Adicionado
  | "adminSettings"; // Adicionado

type PageParams = {
  restaurantId?: string;
  menuItemId?: string;
  categoryId?: string;
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
  "restaurant-area-upgrade": "/restaurant-area/upgrade",
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

  if (params?.restaurantId) {
    url = url.replace(":restaurantId", params.restaurantId);
  }
  if (params?.menuItemId) {
    url = url.replace(":menuItemId", params.menuItemId);
  }
  if (params?.categoryId) {
    url = url.replace(":categoryId", params.categoryId);
  }

  return url;
};

export const getSelectablePagePaths = (): { label: string; value: string }[] => {
  // Retorna um subconjunto de PageKeys que podem ser selecionadas, por exemplo, para links de banners
  return Object.entries(pageRoutes)
    .filter(([key]) => !key.startsWith('admin') && !key.startsWith('restaurant-area') && !key.includes(':')) // Exclui rotas admin, restaurant-area e com parâmetros
    .map(([key, value]) => ({
      label: key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), // Formata para leitura
      value: value,
    }));
};
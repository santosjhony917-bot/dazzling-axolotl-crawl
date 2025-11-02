export const createPageUrl = (pageName: string, params?: Record<string, string | number>): string => {
  switch (pageName) {
    case 'restaurantProfile':
      if (!params?.restaurantId) {
        console.error("Missing restaurantId for restaurantProfile page.");
        return '/';
      }
      return `/restaurant/${params.restaurantId}`;
    case 'restaurants':
      return '/restaurants';
    case 'favorites':
      return '/favorites';
    // Adicione outros casos conforme necessário para suas rotas
    default:
      console.warn(`Unknown pageName: ${pageName}`);
      return '/';
  }
};
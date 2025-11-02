export const createPageUrl = (pageName: string, params?: Record<string, string | number>): string => {
  let url = '';
  switch (pageName) {
    case 'restaurantProfile':
      url = `/restaurants/${params?.restaurantId}`;
      break;
    case 'menuItem':
      url = `/restaurants/${params?.restaurantId}/menu/${params?.menuItemId}`;
      break;
    case 'favorites':
      url = '/favorites';
      break;
    case 'home':
      url = '/';
      break;
    case 'restaurants':
      url = '/restaurants';
      break;
    // Add other page routes as needed
    default:
      url = '/'; // Fallback to home
  }

  // Append query parameters if any
  if (params) {
    const queryParams = new URLSearchParams();
    for (const key in params) {
      if (key !== 'restaurantId' && key !== 'menuItemId') { // Exclude path params
        queryParams.append(key, String(params[key]));
      }
    }
    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }
  }

  return url;
};
// src/utils/createPageUrl.ts
interface PageParams {
  [key: string]: string | number;
}

export const createPageUrl = (pageName: string, params?: PageParams): string => {
  let url = '';
  switch (pageName) {
    case 'login':
      url = '/login';
      break;
    case 'restaurantProfile':
      url = `/restaurant/${params?.restaurantId}`;
      break;
    case 'restaurant-area/menu':
      url = '/restaurant-area/menu';
      break;
    case 'restaurant-area/gallery':
      url = '/restaurant-area/gallery';
      break;
    case 'restaurant-area/external-links':
      url = '/restaurant-area/external-links';
      break;
    case 'help-center':
      url = '/help-center';
      break;
    case 'contact-support':
      url = '/contact-support';
      break;
    // Adicione outras rotas conforme necessário
    default:
      url = '/'; // Rota padrão
  }

  // Adicionar parâmetros de query se existirem e não forem parte da rota
  if (params) {
    const queryParams = new URLSearchParams();
    for (const key in params) {
      if (!url.includes(`:${key}`)) { // Evita adicionar params que já estão na rota
        queryParams.append(key, String(params[key]));
      }
    }
    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }
  }

  return url;
};
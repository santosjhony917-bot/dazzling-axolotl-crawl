/**
 * Cria uma URL de página, garantindo que ela comece com uma barra (/)
 * e lida com prefixos de área (como 'restaurant-area').
 * @param path O caminho da página (ex: 'home', 'profile', 'restaurant-area/home')
 * @returns A URL formatada (ex: '/home', '/profile', '/restaurant-area/home')
 */
export const createPageUrl = (path: string): string => {
  if (!path || path === 'index' || path === 'home') return '/home';
  
  // Remove barras iniciais e finais para padronização
  const cleanPath = path.replace(/^\/|\/$/g, '');
  
  // Se for uma rota de área de restaurante, mantém o prefixo
  if (cleanPath.startsWith('restaurant-area')) {
    return `/${cleanPath}`;
  }
  
  // Para rotas de cliente (profile, search, etc.)
  return `/${cleanPath}`;
};
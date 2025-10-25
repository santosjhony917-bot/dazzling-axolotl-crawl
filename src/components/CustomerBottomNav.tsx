import React, { memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, User, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils/url';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  key: string;
}

const navItems: NavItem[] = [
  { path: '/home', label: 'Home', icon: Home, key: 'home' },
  { path: '/search-client', label: 'Buscar', icon: Search, key: 'search' }, // Rota atualizada
  { path: '/favorites', label: 'Favoritos', icon: Heart, key: 'favorites' },
  { path: '/profile', label: 'Perfil', icon: User, key: 'perfil' },
];

interface CustomerBottomNavProps {
  selectedTab?: string;
}

const CustomerBottomNav: React.FC<CustomerBottomNavProps> = memo(({ selectedTab }) => {
  const location = useLocation();
  
  // Mapeia rotas para garantir que o item correto seja ativado
  const getActivePath = (path: string, key: string) => {
    // Prioriza a prop selectedTab se fornecida
    if (selectedTab) {
      return selectedTab === key;
    }
    // Fallback para a rota atual
    if (path === '/home' && location.pathname === '/') return true;
    
    // Lógica de ativação para rotas aninhadas ou específicas
    if (key === 'favorites') {
        // Rota de favoritos ainda não existe, mas podemos ativá-la se o path for exato
        return location.pathname === path;
    }
    
    // Verifica se a rota atual começa com o caminho do item
    return location.pathname.startsWith(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-background-dark border-t border-gray-200 dark:border-gray-800 z-30 max-w-md mx-auto rounded-t-xl shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = getActivePath(item.path, item.key);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              // FIX: Passa a string dinâmica para createPageUrl
              to={createPageUrl(item.path.substring(1))}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors duration-200 py-2",
                isActive ? "text-highlight" : "text-[#5f728c] dark:text-gray-400 hover:text-highlight"
              )}
            >
              <Icon 
                className={cn(
                  "w-6 h-6",
                  isActive && item.key === 'favorites' && "fill-highlight" // Favoritos preenchido quando ativo
                )} 
              />
              <span className="text-xs font-medium">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
});

export default CustomerBottomNav;
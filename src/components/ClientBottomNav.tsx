import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Heart, User, LucideIcon } from 'lucide-react';

type PathKey = '/' | '/search' | '/favorites' | '/profile';

interface NavItem {
  key: PathKey;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { key: '/', label: 'Início', icon: Home },
  { key: '/search', label: 'Busca', icon: Search },
  { key: '/favorites', label: 'Favoritos', icon: Heart },
  { key: '/profile', label: 'Perfil', icon: User },
];

const ClientBottomNav: React.FC = () => {
  const location = useLocation();

  const getActivePath = (pathKey: PathKey): boolean => {
    const currentPath = location.pathname;

    if (pathKey === '/') {
      // A rota de início só é ativa se for exatamente a raiz, 
      // ou se for a rota raiz seguida de um trailing slash (embora o React Router geralmente normalize isso)
      return currentPath === '/';
    }
    
    // Para outras rotas, verifica se o caminho atual começa com o pathKey
    // Isso permite que rotas aninhadas (ex: /profile/edit) ativem o item pai (/profile)
    return currentPath.startsWith(pathKey);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 frosted-glass shadow-soft-xl z-30 max-w-md mx-auto rounded-t-2xl border-t border-gray-200/50">
      <div className="flex justify-around items-center h-20">
        {navItems.map((item) => {
          const isActive = getActivePath(item.key);
          const Icon = item.icon;
          const colorClass = isActive ? 'text-[#E47948]' : 'text-gray-500';

          return (
            <Link
              key={item.key}
              to={item.key}
              className="flex flex-col items-center justify-center p-2 transition-colors duration-200"
            >
              <Icon className={`h-6 w-6 ${colorClass}`} />
              <span className={`text-xs font-medium mt-1 ${colorClass}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default ClientBottomNav;
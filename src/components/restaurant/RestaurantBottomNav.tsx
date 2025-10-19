import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, User, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils/url';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { path: '/home', label: 'Início', icon: Home },
  { path: '/search-restaurants', label: 'Buscar', icon: Search },
  { path: '/upgrade', label: 'Upgrade', icon: Crown },
  { path: '/profile', label: 'Perfil', icon: User },
];

const RestaurantBottomNav: React.FC = () => {
  const location = useLocation();
  
  // Mapeia rotas para garantir que o item correto seja ativado
  const getActivePath = (path: string) => {
    if (path === '/home' && location.pathname === '/') return true;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-30 max-w-md mx-auto rounded-t-2xl">
      <div className="flex justify-around items-center h-20 px-2">
        {navItems.map((item) => {
          const isActive = getActivePath(item.path);
          const Icon = item.icon;
          
          // Tratamento especial para o botão Upgrade (terceiro item)
          const isUpgradeButton = item.path === '/upgrade';

          return (
            <Link
              key={item.path}
              to={createPageUrl(item.path.substring(1))}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors duration-200",
                isActive ? "text-accent" : "text-primary/70 hover:text-primary",
                isUpgradeButton && isActive && "bg-accent/10 rounded-full px-4 py-2",
                isUpgradeButton && !isActive && "bg-transparent"
              )}
            >
              <Icon 
                className={cn(
                  "w-6 h-6",
                  isUpgradeButton && isActive && "text-accent fill-accent/10"
                )} 
              />
              <span className={cn(
                "text-sm font-medium",
                isUpgradeButton && isActive && "font-bold"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default RestaurantBottomNav;
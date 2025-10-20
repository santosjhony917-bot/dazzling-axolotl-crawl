import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, BarChart3, User, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils/url';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  key: string;
}

const navItems: NavItem[] = [
  { path: '/restaurant-area/home', label: 'Início', icon: Home, key: 'home' },
  { path: '/restaurant-area/stats', label: 'Estatísticas', icon: BarChart3, key: 'stats' },
  { path: '/restaurant-area/upgrade', label: 'Premium', icon: Crown, key: 'upgrade' }, // Corrigido para rota aninhada
  { path: '/restaurant-area/profile-menu', label: 'Perfil', icon: User, key: 'perfil' },
];

interface RestaurantBottomNavProps {
  selectedTab?: string;
}

const RestaurantBottomNav: React.FC<RestaurantBottomNavProps> = ({ selectedTab }) => {
  const location = useLocation();
  
  const getActivePath = (path: string, key: string) => {
    // Prioriza a prop selectedTab se fornecida
    if (selectedTab) {
      return selectedTab === key;
    }
    // Fallback para a rota atual
    // Verifica se a rota atual começa com o caminho do item
    return location.pathname.startsWith(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-30 max-w-md mx-auto rounded-t-2xl">
      <div className="flex justify-around items-center h-20 px-2">
        {navItems.map((item) => {
          const isActive = getActivePath(item.path, item.key);
          const Icon = item.icon;
          
          const isUpgradeButton = item.key === 'upgrade';

          return (
            <Link
              key={item.path}
              // Usamos createPageUrl para garantir o formato correto
              to={createPageUrl(item.path.substring(1))}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors duration-200",
                isActive ? "text-[#E47948]" : "text-[#022D68]/70 hover:text-[#022D68]",
                isUpgradeButton && isActive && "bg-[#E47948]/10 rounded-full px-4 py-2",
                isUpgradeButton && !isActive && "bg-transparent"
              )}
            >
              <Icon 
                className={cn(
                  "w-6 h-6",
                  isUpgradeButton && isActive && "text-[#E47948] fill-[#E47948]/10"
                )} 
              />
              <span className={cn(
                "text-sm font-medium",
                isUpgradeButton && isActive && "font-bold",
                // Garante que o perfil do restaurante use a cor primária do restaurante
                isActive && item.key === 'perfil' && "font-bold text-[#022D68] dark:text-white" 
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
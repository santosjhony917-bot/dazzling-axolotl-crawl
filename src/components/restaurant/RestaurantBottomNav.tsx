import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, User, Crown, Zap } from 'lucide-react'; // Importando Zap
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
  { path: '/restaurant-area/stats', label: 'Estatísticas', icon: Search, key: 'stats' }, // Reutilizando stats para a aba de busca
  { path: '/restaurant-area/upgrade', label: 'Upgrade', icon: Zap, key: 'upgrade' }, // Mudando o ícone para Zap
  { path: '/restaurant-area/profile-menu', label: 'Perfil', icon: User, key: 'perfil' },
];

interface RestaurantBottomNavProps {
  selectedTab?: string;
  isFree?: boolean; // Nova prop para indicar se o plano é Free
}

const RestaurantBottomNav: React.FC<RestaurantBottomNavProps> = ({ selectedTab, isFree = false }) => {
  const location = useLocation();
  
  const getActivePath = (path: string, key: string) => {
    if (selectedTab) {
      return selectedTab === key;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-800 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-30 max-w-md mx-auto rounded-t-xl">
      <div className="flex justify-around items-center h-20">
        {navItems.map((item) => {
          const isActive = getActivePath(item.path, item.key);
          const Icon = item.icon;
          
          const isUpgradeButton = item.key === 'upgrade';

          if (isUpgradeButton && isFree) {
            return (
              <Link
                key={item.path}
                to={createPageUrl(item.path.substring(1))}
                className="flex flex-col items-center justify-center -mt-6 transition-colors duration-200"
              >
                <div className="relative">
                  {/* Efeito de brilho/pulse */}
                  <div className="absolute inset-0 bg-[hsl(var(--orange-accent))] rounded-full blur-lg opacity-40 animate-pulse"></div>
                  
                  {/* Botão principal (círculo laranja) */}
                  <div className="relative bg-highlight hover:bg-highlight/90 rounded-full p-3 shadow-lg transition-all duration-300 hover:scale-105">
                    <Zap className="h-6 w-6 text-white" /> {/* Tamanho reduzido */}
                  </div>
                </div>
                <span className="text-sm font-semibold mt-1 text-highlight">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.path}
              to={createPageUrl(item.path.substring(1))}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors duration-200",
                isActive ? "text-accent" : "text-primary/70 dark:text-text-dark/70",
                isUpgradeButton && isActive && "bg-accent/10 dark:bg-accent/20 rounded-full px-4 py-2",
                isUpgradeButton && isActive && "text-accent font-bold",
                isUpgradeButton && !isActive && "text-primary/70 dark:text-text-dark/70"
              )}
            >
              <Icon 
                className={cn(
                  "w-6 h-6",
                  isUpgradeButton && isActive && "fill-accent"
                )} 
              />
              <span className="text-sm font-medium">
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
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, User, Crown, Zap } from 'lucide-react';
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
  { path: '/restaurant-area/stats', label: 'Estatísticas', icon: Search, key: 'stats' },
  { path: '/restaurant-area/upgrade', label: 'Upgrade', icon: Zap, key: 'upgrade' },
  { path: '/restaurant-area/profile-menu', label: 'Perfil', icon: User, key: 'perfil' },
];

interface RestaurantBottomNavProps {
  selectedTab?: string;
  isFree?: boolean;
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
                  {/* Usando highlight/50 para o glow */}
                  <div className="absolute inset-0 bg-highlight/50 rounded-full blur-lg opacity-40 animate-pulse"></div>
                  
                  {/* Botão principal (círculo com gradiente) */}
                  <div className={cn(
                    "relative rounded-full p-3 shadow-lg transition-all duration-300 hover:scale-105",
                    // Gradiente de laranja para um tom mais escuro de laranja/vermelho
                    "bg-gradient-to-br from-[#E47948] to-[#D06A3F] hover:from-[#D06A3F] hover:to-[#E47948]"
                  )}>
                    <Zap className="h-6 w-6 text-white" />
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
                isActive ? "text-primary dark:text-text-dark" : "text-primary/70 dark:text-text-dark/70",
              )}
            >
              <Icon 
                className={cn(
                  "w-6 h-6",
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
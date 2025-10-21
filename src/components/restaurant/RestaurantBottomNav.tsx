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
                className="flex flex-col items-center justify-center transition-colors duration-200"
              >
                <div className={cn(
                  "flex items-center justify-center rounded-full px-4 py-2 transition-all duration-300 hover:scale-[1.02]",
                  "bg-highlight/10 dark:bg-highlight/20 text-highlight"
                )}>
                  <Icon className="h-6 w-6 mr-1" />
                  <span className="text-sm font-bold">
                    {item.label}
                  </span>
                </div>
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
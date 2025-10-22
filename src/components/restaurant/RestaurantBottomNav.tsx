import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, User, Crown, Zap, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils/url';

const NavItem = ({ icon: Icon, label, path, isSelected }) => {
  return (
    <Link
      to={path}
      className={cn(
        "flex flex-col items-center justify-center gap-1 transition-colors duration-200",
        isSelected ? "text-primary dark:text-text-dark" : "text-primary/70 dark:text-text-dark/70",
      )}
    >
      <Icon 
        className={cn(
          "w-6 h-6",
        )} 
      />
      <span className="text-sm font-medium">
        {label}
      </span>
    </Link>
  );
};

const RestaurantBottomNav = ({ selectedTab, isFree }) => {
  const navItems = [
    { id: 'home', icon: Home, label: 'Início', path: createPageUrl('restaurant-area/home') },
    { id: 'stats', icon: Search, label: 'Buscar', path: createPageUrl('restaurant-area/stats') },
    { id: 'upgrade', icon: Rocket, label: 'Upgrade', path: createPageUrl('restaurant-area/upgrade') },
    { id: 'perfil', icon: User, label: 'Perfil', path: createPageUrl('restaurant-area/profile-menu') },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-800 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-30 max-w-md mx-auto rounded-t-xl">
      <div className="flex justify-around items-center h-20">
        {navItems.map((item) => {
          const isSelected = selectedTab === item.id;
          
          const isUpgradeButton = item.id === 'upgrade';

          if (isUpgradeButton && isFree) {
            const Icon = item.icon;
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
            <NavItem
              key={item.path}
              icon={item.icon}
              label={item.label}
              path={item.path}
              isSelected={isSelected}
            />
          );
        })}
      </div>
    </div>
  );
};

export default RestaurantBottomNav;
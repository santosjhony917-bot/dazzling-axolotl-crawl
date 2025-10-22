import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search, User, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils/url';

const NavItem = ({ icon: Icon, label, path, isSelected }) => {
  return (
    <Link
      to={path}
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 transition-colors duration-200 w-16",
        isSelected 
          ? "text-primary dark:text-highlight"
          : "text-text-secondary-light dark:text-text-secondary-dark"
      )}
    >
      <Icon className="w-6 h-6" />
      <span className={cn("text-xs", isSelected ? "font-bold" : "font-medium")}>
        {label}
      </span>
    </Link>
  );
};

const RestaurantBottomNav = ({ selectedTab, isFree }) => {
  const navItems = [
    { id: 'home', icon: Home, label: 'Início', path: createPageUrl('restaurant-area/home') },
    { id: 'search', icon: Search, label: 'Buscar', path: createPageUrl('restaurant-area/stats') },
    { id: 'upgrade', icon: Rocket, label: 'Upgrade', path: createPageUrl('restaurant-area/upgrade') },
    { id: 'perfil', icon: User, label: 'Perfil', path: createPageUrl('restaurant-area/profile-menu') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-lg border-t border-gray-200/80 dark:border-gray-700/80 z-30 max-w-md mx-auto">
      <div className="flex justify-around items-center h-20 px-2">
        {navItems.map((item) => {
          const isSelected = selectedTab === item.id;

          if (item.id === 'upgrade' && isFree) {
            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative -top-3 flex flex-col items-center gap-1.5 text-highlight w-16"
              >
                <div className="flex size-14 items-center justify-center rounded-full bg-highlight shadow-lg shadow-highlight/50">
                  <Rocket className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-bold">{item.label}</span>
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
    </nav>
  );
};

export default RestaurantBottomNav;
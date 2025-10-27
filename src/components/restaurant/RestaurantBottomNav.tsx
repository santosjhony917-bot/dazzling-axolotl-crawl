import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Heart, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Início', icon: Home, path: '/' },
  { name: 'Buscar', icon: Search, path: '/search' }, // Path corrected to /search
  { name: 'Favoritos', icon: Heart, path: '/favorites' },
  { name: 'Perfil', icon: User, path: '/profile' },
];

const RestaurantBottomNav: React.FC = () => {
  const location = useLocation();

  // Hide navigation on specific paths where it might interfere (e.g., login, specific restaurant pages if needed)
  // For simplicity, we assume it's visible everywhere except maybe auth pages.
  const hiddenPaths = ['/login', '/signup'];
  if (hiddenPaths.some(path => location.pathname.startsWith(path))) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg md:hidden">
      <nav className="flex justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors duration-200 py-2 flex-1",
                isActive ? "text-primary dark:text-highlight" : "text-gray-500 hover:text-primary dark:hover:text-highlight"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default RestaurantBottomNav;
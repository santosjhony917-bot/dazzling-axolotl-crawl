import React from 'react';
import { Home, Search, User, Star, Crown } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils/url';
import { motion } from 'framer-motion';
import { useAuthData } from '@/context/AuthContext';

const RestaurantBottomNav: React.FC = () => {
  const location = useLocation();
  const { restaurant } = useAuthData();

  const isPremium = restaurant?.plan === 'premium';

  const isActive = (path: string) => {
    const currentPath = location.pathname;
    const normalizedItemPath = path.split('?')[0]; // Remove query params for comparison
    return currentPath === normalizedItemPath || 
           (normalizedItemPath === createPageUrl('restaurant-area-profile-menu') && currentPath.startsWith(normalizedItemPath));
  };

  const centralItem = isPremium ? { 
    id: 'favorites', 
    icon: Star, 
    label: 'Favoritos', 
    path: createPageUrl('restaurant-area-favorites') 
  } : { 
    id: 'premium', 
    icon: Crown, 
    label: 'Premium', 
    path: createPageUrl('restaurant-area-upgrade') 
  };

  const navItems = [
    { id: 'home', icon: Home, label: 'Início', path: createPageUrl('restaurant-area-home') },
    { id: 'search', icon: Search, label: 'Busca', path: createPageUrl('restaurant-area-search') },
    centralItem, // Item central dinâmico
    { id: 'perfil', icon: User, label: 'Perfil', path: createPageUrl('restaurant-area-profile-menu') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 z-50 md:max-w-md md:mx-auto">
      <div className="flex justify-around h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive: navIsActive }) => cn(
              "flex flex-col items-center justify-center text-xs font-medium transition-colors duration-200",
              isActive(item.path) ? "text-highlight" : "text-gray-500 hover:text-gray-700"
            )}
          >
            {({ isActive: navIsActive }) => (
              <>
                <motion.div
                  className="relative"
                  initial={false}
                  animate={{ scale: isActive(item.path) ? 1.1 : 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <item.icon className="h-6 w-6" />
                </motion.div>
                <span className="mt-1">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default RestaurantBottomNav;
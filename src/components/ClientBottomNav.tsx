import React, { memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Heart, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

type PathKey = '/home' | '/search' | '/favorites' | '/profile';

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  path: PathKey;
  isSelected: boolean;
}

const NavItem = memo(({ icon: Icon, label, path, isSelected }: NavItemProps) => {
  return (
    <motion.div
      whileTap={{ scale: 0.95 }}
      className="flex flex-col items-center justify-center gap-1 transition-colors duration-200 py-2"
    >
      <Link
        to={path}
        className={cn(
          "flex flex-col items-center justify-center gap-1 transition-colors duration-200 py-2",
          isSelected ? "text-highlight dark:text-text-dark" : "text-primary/70 dark:text-text-dark/70 hover:text-highlight",
        )}
      >
        <Icon className="w-6 h-6" />
        <span className="text-sm font-medium">
          {label}
        </span>
      </Link>
    </motion.div>
  );
});

const navItems = [
  { key: '/home' as PathKey, label: 'Início', icon: Home },
  { key: '/search' as PathKey, label: 'Busca', icon: Search },
  { key: '/favorites' as PathKey, label: 'Favoritos', icon: Heart },
  { key: '/profile' as PathKey, label: 'Perfil', icon: User },
];

const ClientBottomNav: React.FC = () => {
  const location = useLocation();

  const getActivePath = (pathKey: string): boolean => {
    const currentPath = location.pathname;
    if (pathKey === '/home') {
      return currentPath === '/home';
    }
    return currentPath.startsWith(pathKey);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 frosted-glass shadow-soft-lg z-30 max-w-md mx-auto rounded-t-2xl border-t border-gray-200/50">
      <div className="flex justify-around items-center h-20">
        {navItems.map((item) => {
          const isSelected = getActivePath(item.key);
          return (
            <NavItem
              key={item.key}
              icon={item.icon}
              label={item.label}
              path={item.key}
              isSelected={isSelected}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ClientBottomNav;
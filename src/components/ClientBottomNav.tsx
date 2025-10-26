import React, { memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, User, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils/url';

interface ClientBottomNavProps {
  selectedTab: 'home' | 'search' | 'favorites' | 'profile';
}

const NavItem = memo(({ icon: Icon, label, path, isSelected }: { icon: React.ElementType, label: string, path: string, isSelected: boolean }) => {
  return (
    <Link
      to={path}
      className={cn(
        "flex flex-col items-center justify-center gap-1 transition-colors duration-200 py-2",
        isSelected ? "text-highlight" : "text-gray-500 hover:text-highlight",
      )}
    >
      <Icon 
        className={cn(
          "w-6 h-6",
          isSelected && "fill-highlight/10" // Adicionando um preenchimento sutil para o ícone ativo
        )} 
      />
      <span className="text-sm font-medium">
        {label}
      </span>
    </Link>
  );
});

const ClientBottomNav: React.FC<ClientBottomNavProps> = ({ selectedTab }) => {
  
  const navItems = [
    { id: 'home', icon: Home, label: 'Início', path: createPageUrl('home') },
    { id: 'search', icon: Search, label: 'Busca', path: createPageUrl('search-unified') }, 
    { id: 'favorites', icon: Heart, label: 'Favoritos', path: createPageUrl('favorites') },
    { id: 'profile', icon: User, label: 'Perfil', path: createPageUrl('profile') },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 frosted-glass shadow-soft-lg z-30 max-w-md mx-auto rounded-t-2xl border-t border-gray-200/50">
      <div className="flex justify-around items-center h-20">
        {navItems.map((item) => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            path={item.path}
            isSelected={selectedTab === item.id}
          />
        ))}
      </div>
    </div>
  );
};

export default ClientBottomNav;
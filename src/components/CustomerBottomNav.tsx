import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search, Heart, User } from 'lucide-react';
import { createPageUrl } from '@/utils/url';

interface CustomerBottomNavProps {
  selectedTab: 'home' | 'search' | 'favorites' | 'profile';
}

const CustomerBottomNav: React.FC<CustomerBottomNavProps> = ({ selectedTab }) => {
  const getIconClass = (tab: string) => 
    selectedTab === tab 
      ? "text-highlight" 
      : "text-gray-500 group-hover:text-highlight";

  const getLabelClass = (tab: string) => 
    selectedTab === tab 
      ? "text-highlight font-bold" 
      : "text-gray-500 group-hover:text-highlight";

  const navItems = [
    { name: 'home', icon: Home, label: 'Início', path: createPageUrl('home') },
    { name: 'search', icon: Search, label: 'Buscar', path: createPageUrl('search-client') },
    { name: 'favorites', icon: Heart, label: 'Favoritos', path: createPageUrl('favorites') },
    { name: 'profile', icon: User, label: 'Perfil', path: createPageUrl('profile') }, // Aponta para a rota unificada /profile
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 max-w-md mx-auto">
      <div className="flex justify-around h-16">
        {navItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className="flex flex-col items-center justify-center flex-1 group transition-colors duration-200"
          >
            <item.icon className={`w-6 h-6 transition-colors ${getIconClass(item.name)}`} />
            <span className={`text-xs mt-0.5 transition-colors ${getLabelClass(item.name)}`}>
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default CustomerBottomNav;
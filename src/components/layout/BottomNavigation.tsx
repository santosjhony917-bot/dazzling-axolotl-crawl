import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home as HomeIcon, Search, Heart, User } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assumindo que você tem um utilitário para classes Tailwind

const BottomNavigation: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { icon: HomeIcon, label: 'Início', path: '/' },
    { icon: Search, label: 'Buscar', path: '/search' },
    { icon: Heart, label: 'Favoritos', path: '/favorites' },
    { icon: User, label: 'Perfil', path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 max-w-md mx-auto">
      <div className="flex justify-around h-14">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.label}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center text-xs font-medium transition-colors",
                isActive ? "text-blue-600" : "text-gray-500 hover:text-blue-600"
              )}
            >
              <item.icon className="h-5 w-5 mb-1" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;
"use client";

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Heart, User } from 'lucide-react';

const navItems = [
  { key: '/home', label: 'Início', icon: Home },
  { key: '/search-unified', label: 'Busca', icon: Search },
  { key: '/favorites', label: 'Favoritos', icon: Heart },
  { key: '/profile', label: 'Perfil', icon: User },
];

const ClientBottomNav = () => {
  const location = useLocation();

  const isActive = (path) => {
    // Trata o caso da busca e das páginas de restaurante que devem manter o "Início" ativo
    if (path === '/home' && (location.pathname.startsWith('/restaurant/') || location.pathname.startsWith('/menu-item/'))) {
      return true;
    }
    // Trata o caso da busca unificada
    if (path === '/search-unified' && location.pathname.startsWith('/search-unified')) {
      return true;
    }
    return location.pathname === path;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 md:hidden">
      <div className="flex justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const active = isActive(item.key);
          return (
            <Link
              key={item.key}
              to={item.key}
              className="flex flex-col items-center justify-center p-2 transition-colors duration-200 w-1/4"
            >
              <item.icon className={`h-6 w-6 mb-1 ${active ? 'text-primary' : 'text-gray-500'}`} />
              <span className={`text-xs font-medium ${active ? 'text-primary' : 'text-gray-600'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default ClientBottomNav;
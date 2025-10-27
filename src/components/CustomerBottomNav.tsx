import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Heart, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils/url';
import { motion } from 'framer-motion';

interface NavItem {
  id: string;
  icon: React.ElementType;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { id: 'home', icon: Home, label: 'Início', path: createPageUrl('home') },
  { id: 'search', icon: Search, label: 'Busca', path: createPageUrl('search-unified') },
  { id: 'favorites', icon: Heart, label: 'Favoritos', path: createPageUrl('favorites') },
  { id: 'perfil', icon: User, label: 'Perfil', path: createPageUrl('auth') }, // Redireciona para auth/perfil
];

export default function ClientBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    // Lógica de ativação para rotas específicas
    if (path === createPageUrl('home') && location.pathname === createPageUrl('home')) return true;
    if (path === createPageUrl('search-unified') && location.pathname.startsWith(createPageUrl('search-unified'))) return true;
    if (path === createPageUrl('favorites') && location.pathname.startsWith(createPageUrl('favorites'))) return true;
    
    // Perfil: Ativa se estiver em /auth ou /profile
    if (path === createPageUrl('auth') && (location.pathname === createPageUrl('auth') || location.pathname.startsWith(createPageUrl('home')))) return true;

    return false;
  };

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-white shadow-2xl border-t border-gray-100"
    >
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className="flex flex-col items-center justify-center p-2 transition-colors duration-200"
          >
            <item.icon
              className={cn(
                'h-6 w-6',
                isActive(item.path) ? 'text-primary' : 'text-gray-400 group-hover:text-primary'
              )}
            />
            <span
              className={cn(
                'text-xs mt-0.5 font-medium',
                isActive(item.path) ? 'text-primary' : 'text-gray-400 group-hover:text-primary'
              )}
            >
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </motion.nav>
  );
}
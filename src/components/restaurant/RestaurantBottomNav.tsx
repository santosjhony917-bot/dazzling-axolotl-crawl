import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Utensils, User, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils/url';
import { motion } from 'framer-motion';

interface NavItem {
  id: string;
  icon: React.ElementType;
  label: string;
  path: string;
}

const getIsActive = (location: ReturnType<typeof useLocation>, path: string): boolean => {
    // Lógica de ativação para rotas específicas
    
    // Dashboard
    if (path === createPageUrl('restaurant-area/dashboard') && location.pathname === createPageUrl('restaurant-area/dashboard')) return true;

    // Busca (Busca Unificada)
    if (path === createPageUrl('search-unified')) {
        // Ativa se o path for /search-unified
        return location.pathname.startsWith(createPageUrl('search-unified'));
    }

    // Perfil/Gerenciamento (Menu, Galeria, Configurações)
    if (path === createPageUrl('restaurant-area/profile-menu')) {
        // Ativa se o path for /restaurant-area/profile-menu ou qualquer sub-rota de gerenciamento
        return location.pathname.startsWith(createPageUrl('restaurant-area/profile-menu')) || 
               location.pathname.startsWith(createPageUrl('restaurant-area/menu')) ||
               location.pathname.startsWith(createPageUrl('restaurant-area/gallery'));
    }

    // Fallback para a rota atual
    if (path === createPageUrl('restaurant-area/dashboard') && location.pathname === createPageUrl('restaurant-area/dashboard')) return true;

    return location.pathname === path;
};

export default function RestaurantBottomNav({ isPremium }: { isPremium: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Item central dinâmico (Menu ou Premium)
  let centralItem: NavItem;

  if (isPremium) {
    // Se for Premium, o item central é o Menu
    centralItem = { 
      id: 'menu', 
      icon: Utensils, 
      label: 'Cardápio', 
      path: createPageUrl('restaurant-area/menu') 
    };
  } else {
    // Se não for Premium, o item central é o Upgrade
    centralItem = { 
      id: 'premium', 
      icon: Zap, 
      label: 'Premium', 
      path: createPageUrl('restaurant-area/upgrade') 
    };
  }
  
  // Adiciona item de favoritos se for Premium (mock)
  // if (isPremium) {
  //   // Usuários de restaurante Premium podem ver os favoritos dos clientes (mock)
  //   // centralItem = { 
  //   //   id: 'favorites', 
  //   //   icon: Heart, 
  //   //   label: 'Favoritos', 
  //   //   path: createPageUrl('favorites') 
  //   // };
  // }

  const navItems: NavItem[] = [
    { id: 'home', icon: Home, label: 'Início', path: createPageUrl('restaurant-area/dashboard') },
    // CORRIGIDO: Busca deve levar para a tela de busca unificada
    { id: 'search', icon: Search, label: 'Busca', path: createPageUrl('search-unified') },
    centralItem, // Item central dinâmico
    // CORRIGIDO: Perfil deve levar para a área de gerenciamento do perfil
    { id: 'perfil', icon: User, label: 'Perfil', path: createPageUrl('restaurant-area/profile-menu') },
  ];

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-white shadow-2xl border-t border-gray-100"
    >
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const active = getIsActive(location, item.path);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center p-2 transition-colors duration-200 group"
            >
              <item.icon
                className={cn(
                  'h-6 w-6',
                  active ? 'text-primary' : 'text-gray-400 group-hover:text-primary'
                )}
              />
              <span
                className={cn(
                  'text-xs mt-0.5 font-medium',
                  active ? 'text-primary' : 'text-gray-400 group-hover:text-primary'
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
}
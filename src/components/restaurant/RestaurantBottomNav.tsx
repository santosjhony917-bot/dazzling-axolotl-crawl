import React, { memo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, User, Heart, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPageUrl, PathKey } from '@/utils/url';
import { motion } from 'framer-motion';

const NavItem = memo(({ icon: Icon, label, path, isSelected }: { icon: React.ElementType, label: string, path: string, isSelected: boolean }) => {
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
        <Icon 
          className={cn(
            "w-6 h-6",
          )} 
        />
        <span className="text-sm font-medium">
          {label}
        </span>
      </Link>
    </motion.div>
  );
});

const RestaurantBottomNav = memo(({ isFree }: { isFree: boolean }) => {
  const location = useLocation(); // Usando useLocation para obter a rota atual
  
  // Definindo o item central baseado no plano
  const centralItem = isFree 
    ? { 
        id: 'upgrade', 
        icon: Crown, 
        label: 'Premium', 
        path: createPageUrl('restaurant-area/upgrade') as string
      }
    : { 
        id: 'favorites', 
        icon: Heart, 
        label: 'Favoritos', 
        path: createPageUrl('favorites') as string
      };

  const navItems = [
    { id: 'home', icon: Home, label: 'Início', path: createPageUrl('restaurant-area/home') },
    { id: 'search', icon: Search, label: 'Busca', path: createPageUrl('search-unified') }, 
    centralItem, // Item central dinâmico
    { id: 'perfil', icon: User, label: 'Perfil', path: createPageUrl('restaurant-area/profile-menu') },
  ];
  
  // Função para verificar se o item está selecionado com base na rota
  const isPathActive = (itemPath: string) => {
    // Remove query params e trailing slash para comparação
    const currentPath = location.pathname.replace(/\/$/, '').split('?')[0];
    const normalizedItemPath = itemPath.replace(/\/$/, '').split('?')[0];
    
    // Verifica se o caminho atual começa com o caminho do item (útil para rotas aninhadas como /menu)
    return currentPath === normalizedItemPath || 
           (normalizedItemPath === createPageUrl('restaurant-area/profile-menu') && currentPath.startsWith(normalizedItemPath));
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 frosted-glass shadow-soft-lg z-30 max-w-md mx-auto rounded-t-2xl border-t border-gray-200/50">
      <div className="flex justify-around items-center h-20">
        {navItems.map((item) => {
          const isSelected = isPathActive(item.path);
          const isCentralButton = item.id === centralItem.id;
          
          // Se for o botão central E for o botão de Upgrade (isFree = true)
          if (isCentralButton && isFree) {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center justify-center transition-colors duration-200 -mt-6"
              >
                <motion.div // Adicionado motion.div
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "flex items-center justify-center rounded-full w-16 h-16 transition-all duration-300 hover:scale-[1.05] shadow-xl",
                    "bg-highlight text-white"
                  )}
                >
                  <Icon className={cn("h-7 w-7 fill-white")} />
                </motion.div>
                <span className="text-sm font-medium text-primary dark:text-text-dark mt-1">
                  {item.label}
                </span>
              </Link>
            );
          }
          
          // Caso contrário (Premium ou botões laterais), usa o NavItem padrão
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
    </div>
  );
});

export default RestaurantBottomNav;
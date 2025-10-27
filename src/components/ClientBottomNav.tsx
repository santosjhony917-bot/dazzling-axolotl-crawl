import React, { memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, User, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPageUrl, PathKey } from '@/utils/url';
import { motion } from 'framer-motion';

interface NavItemType {
  path: string;
  label: string;
  icon: React.ElementType;
  key: string;
}

const navItems: NavItemType[] = [
  { path: '/home', label: 'Início', icon: Home, key: 'home' },
  { path: '/search-unified', label: 'Busca', icon: Search, key: 'search' }, // Rota atualizada
  { path: '/favorites', label: 'Favoritos', icon: Heart, key: 'favorites' },
  { path: '/profile', label: 'Perfil', icon: User, key: 'perfil' },
];

interface CustomerBottomNavProps {
  selectedTab?: string;
}

const NavItem = memo(({ icon: Icon, label, path, isSelected }: { icon: React.ElementType, label: string, path: string, isSelected: boolean }) => {
  return (
    <motion.div
      whileTap={{ scale: 0.95 }}
      key={path}
      className="flex flex-col items-center justify-center gap-1 transition-colors duration-200 py-2"
    >
      <Link
        to={path}
        className={cn(
          "flex flex-col items-center justify-center gap-1 transition-colors duration-200 py-2",
          isSelected ? "text-highlight" : "text-gray-500 hover:text-highlight"
        )}
      >
        <Icon 
          className={cn(
            "w-6 h-6",
            isSelected && "fill-highlight/20"
          )} 
        />
        <span className="text-sm font-medium">
          {label}
        </span>
      </Link>
    </motion.div>
  );
});


const ClientBottomNav: React.FC<CustomerBottomNavProps> = memo(({ selectedTab }) => {
  const location = useLocation();
  
  // Mapeia rotas para garantir que o item correto seja ativado
  const getActivePath = (path: string, key: string) => {
    // Prioriza a prop selectedTab se fornecida
    if (selectedTab) {
      return selectedTab === key;
    }
    // Fallback para a rota atual
    if (path === '/home' && location.pathname === '/') return true;
    
    // Lógica de ativação para rotas aninhadas ou específicas
    if (key === 'favorites') {
        // Rota de favoritos ainda não existe, mas podemos ativá-la se o path for exato
        return location.pathname === path;
    }
    
    // Verifica se a rota atual começa com o caminho do item
    return location.pathname.startsWith(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 frosted-glass shadow-soft-xl z-30 max-w-md mx-auto rounded-t-2xl border-t border-gray-200/50">
      <div className="flex justify-around items-center h-20">
        {navItems.map((item) => {
          const isActive = getActivePath(item.path, item.key);
          const pathKey = item.path.substring(1) as PathKey;
          
          return (
            <NavItem
              key={item.path}
              icon={item.icon}
              label={item.label}
              path={createPageUrl(pathKey)}
              isSelected={isActive}
            />
          );
        })}
      </div>
    </div>
  );
});

export default ClientBottomNav;
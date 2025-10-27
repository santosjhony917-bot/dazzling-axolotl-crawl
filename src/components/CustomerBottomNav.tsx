import React, { memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, User, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPageUrl, PathKey } from '@/utils/url';
import { motion } from 'framer-motion';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  key: string;
}

const navItems: NavItem[] = [
  { path: '/home', label: 'Home', icon: Home, key: 'home' },
  { path: '/search-unified', label: 'Buscar', icon: Search, key: 'search' }, // Rota atualizada
  { path: '/favorites', label: 'Favoritos', icon: Heart, key: 'favorites' },
  { path: '/profile', label: 'Perfil', icon: User, key: 'perfil' },
];

interface CustomerBottomNavProps {
  selectedTab?: string;
}

const CustomerBottomNav: React.FC<CustomerBottomNavProps> = memo(({ selectedTab }) => {
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
            <motion.div
              whileTap={{ scale: 0.95 }}
              key={item.path}
              className="flex flex-col items-center justify-center gap-1 transition-colors duration-200 py-2"
            >
              <Link
                to={createPageUrl(pathKey)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 transition-colors duration-200 py-2",
                  isActive ? "text-highlight" : "text-gray-500 hover:text-highlight"
                )}
              >
                <Icon 
                  className={cn(
                    "w-6 h-6",
                    isActive && item.key === 'favorites' && "fill-highlight/20"
                  )} 
                />
                <span className="text-sm font-medium">
                  {item.label}
                </span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
});

export default ClientBottomNav;
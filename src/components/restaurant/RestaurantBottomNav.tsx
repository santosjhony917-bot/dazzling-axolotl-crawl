import React, { memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, User, Heart, Crown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils/url';
import { motion } from 'framer-motion';

const NavItem = memo(({ icon: Icon, path, label, isSelected }: { icon: React.ElementType, path: string, label: string, isSelected: boolean }) => {
  return (
    <Link
      to={path}
      aria-label={label}
      aria-current={isSelected ? "page" : undefined}
      className="flex flex-col items-center justify-center gap-1 w-10 h-10 relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Icon className={cn("w-5.5 h-5.5 transition-all", isSelected ? "text-highlight fill-highlight" : "text-slate-400 stroke-[2.5]")} />
      {isSelected && (
        <motion.div 
          layoutId="restaurant-nav-indicator"
          className="w-1 h-1 bg-highlight rounded-full absolute -bottom-0.5"
        />
      )}
    </Link>
  );
});

const RestaurantBottomNav = memo(({ isFree, isAiOpen, onToggleAi }: { isFree: boolean, isAiOpen?: boolean, onToggleAi?: () => void }) => {
  const location = useLocation();

  const isPathActive = (itemPath: string) => {
    const currentPath = location.pathname.replace(/\/$/, '').split('?')[0];
    const normalizedItemPath = itemPath.replace(/\/$/, '').split('?')[0];
    return currentPath === normalizedItemPath || 
           (normalizedItemPath === createPageUrl('restaurant-area/profile-menu') && currentPath.startsWith(normalizedItemPath));
  };

  return (
    <nav aria-label="Navegação principal do restaurante" className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none pb-0">
      <div className="w-full max-w-[448px] mx-auto h-[70px] pointer-events-auto bg-transparent relative">
        
        {/* SVG Background - Perfectly Symmetric and Clean */}
        <div className="absolute inset-0 z-0 pointer-events-none translate-y-2 backdrop-blur-md">
          <svg 
            width="100%" 
            height="70" 
            viewBox="0 0 450 70" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg" 
            preserveAspectRatio="none" 
            className="w-full h-full object-fill filter drop-shadow-[0px_-8px_22px_rgba(15,23,42,0.08)] overflow-visible"
          >
            <path 
              d="M 0 0 L 170 0 C 177 0, 183 4, 186 10 C 193 25, 207 35, 225 35 C 243 35, 257 25, 264 10 C 267 4, 273 0, 280 0 L 450 0 L 450 70 L 0 70 Z" 
              fill="rgba(255, 255, 255, 0.94)"
            />
          </svg>
        </div>

        {/* Nav Items Grid - Symmetrically Spaced */}
        <div className="absolute inset-0 z-10 grid grid-cols-5 h-full translate-y-2">
          {/* Home */}
          <div className="flex items-center justify-center">
            <NavItem icon={Home} path="/home" label="Início" isSelected={isPathActive('/home')} />
          </div>

          {/* Search */}
          <div className="flex items-center justify-center">
            <NavItem icon={Search} path="/search" label="Buscar" isSelected={isPathActive('/search')} />
          </div>

          {/* Spacer for Center Floating Button */}
          <div />

          {/* Favorites */}
          <div className="flex items-center justify-center">
            <NavItem icon={Heart} path="/favorites" label="Favoritos" isSelected={isPathActive('/favorites')} />
          </div>

          {/* Profile */}
          <div className="flex items-center justify-center">
            <NavItem icon={User} path={createPageUrl('restaurant-area/profile-menu')} label="Perfil do restaurante" isSelected={isPathActive(createPageUrl('restaurant-area/profile-menu'))} />
          </div>
        </div>

        {/* Central Floating Button - Perfectly Centered and Elevated */}
        <div className="absolute left-1/2 top-[0px] -translate-x-1/2 -translate-y-1/2 z-20">
          {isFree ? (
            <Link 
              to={createPageUrl('restaurant-area/upgrade') as string}
              aria-label="Ver planos premium"
              className="flex items-center justify-center w-[64px] h-[64px] bg-highlight rounded-full shadow-[0px_10px_24px_rgba(223,75,28,0.28)] hover:scale-105 transition-transform border border-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Crown className="w-7 h-7 text-white stroke-[3]" />
            </Link>
          ) : (
            <button 
              type="button"
              onClick={onToggleAi}
              aria-label={isAiOpen ? "Fechar assistente" : "Abrir assistente"}
              aria-pressed={isAiOpen}
              className={cn(
                "flex items-center justify-center w-[64px] h-[64px] bg-highlight rounded-full shadow-[0px_10px_24px_rgba(223,75,28,0.28)] hover:scale-105 transition-all duration-300 border border-white/70 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isAiOpen && "rotate-45 scale-95 bg-gradient-to-tr from-highlight to-[#FF7E40]"
              )}
            >
              <Sparkles className="w-7 h-7 text-white stroke-[3]" />
            </button>
          )}
        </div>

      </div>
    </nav>
  );
});

export default RestaurantBottomNav;

import React, { memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Heart, User, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

type PathKey = '/home' | '/profile' | '/combo-finder' | '/favorites' | '/search';

interface NavItemProps {
  icon: React.ElementType;
  path: PathKey;
  isSelected: boolean;
}

const NavItem = memo(({ icon: Icon, path, isSelected }: NavItemProps) => {
  return (
    <Link
      to={path}
      className="flex flex-col items-center justify-center gap-1 w-10 h-10 relative"
    >
      <Icon className={cn("w-5.5 h-5.5 transition-all", isSelected ? "text-white fill-white" : "text-white/70 stroke-[2.5]")} />
      {isSelected && (
        <motion.div 
          layoutId="nav-indicator"
          className="w-1 h-1 bg-white rounded-full absolute -bottom-0.5"
        />
      )}
    </Link>
  );
});

interface ClientBottomNavProps {
  isAiOpen?: boolean;
  onToggleAi?: () => void;
}

const ClientBottomNav: React.FC<ClientBottomNavProps> = ({ isAiOpen = false, onToggleAi }) => {
  const location = useLocation();
  const getActivePath = (pathKey: string): boolean => {
    const currentPath = location.pathname;
    if (pathKey === '/home') {
      return currentPath === '/home';
    }
    return currentPath.startsWith(pathKey);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none pb-0">
      <div className="w-full max-w-md mx-auto h-[70px] pointer-events-auto bg-transparent relative">
        
        {/* SVG Background - Perfectly Symmetric and Clean */}
        <div className="absolute inset-0 z-0 pointer-events-none translate-y-2">
          <svg 
            width="100%" 
            height="70" 
            viewBox="0 0 450 70" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg" 
            preserveAspectRatio="none" 
            className="w-full h-full object-fill filter drop-shadow-[0px_-4px_8px_rgba(239,42,57,0.12)] overflow-visible"
          >
            <path 
              d="M 0 0 L 170 0 C 177 0, 183 4, 186 10 C 193 25, 207 35, 225 35 C 243 35, 257 25, 264 10 C 267 4, 273 0, 280 0 L 450 0 L 450 70 L 0 70 Z" 
              fill="#EF2A39"
            />
          </svg>
        </div>

        {/* Nav Items Grid - Symmetrically Spaced */}
        <div className="absolute inset-0 z-10 grid grid-cols-5 h-full translate-y-2">
          {/* Home */}
          <div className="flex items-center justify-center">
            <NavItem icon={Home} path="/home" isSelected={getActivePath('/home')} />
          </div>

          {/* Search */}
          <div className="flex items-center justify-center">
            <NavItem icon={Search} path="/search" isSelected={getActivePath('/search')} />
          </div>

          {/* Spacer for Center Floating Button */}
          <div />

          {/* Favorites */}
          <div className="flex items-center justify-center">
            <NavItem icon={Heart} path="/favorites" isSelected={getActivePath('/favorites')} />
          </div>

          {/* Profile */}
          <div className="flex items-center justify-center">
            <NavItem icon={User} path="/profile" isSelected={getActivePath('/profile')} />
          </div>
        </div>

        {/* Central Floating Button - Perfectly Centered and Elevated */}
        <div className="absolute left-1/2 top-[0px] -translate-x-1/2 -translate-y-1/2 z-20">
          <button 
            id="tour-ai-button"
            type="button"
            onClick={onToggleAi}
            className={cn(
              "flex items-center justify-center w-[64px] h-[64px] rounded-full shadow-[0px_4px_12px_rgba(239,42,57,0.45)] hover:scale-105 transition-all duration-300 border-none cursor-pointer outline-none bg-gradient-to-tr from-[#FF7E40] to-[#EF2A39]",
              isAiOpen && "rotate-45 scale-95"
            )}
          >
            <Sparkles className="w-7 h-7 text-white stroke-[3]" />
          </button>
        </div>

      </div>
    </div>
  );
};

export default ClientBottomNav;
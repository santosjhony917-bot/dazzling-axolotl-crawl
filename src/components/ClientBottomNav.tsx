import React, { memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Heart, User, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

type PathKey = '/home' | '/profile' | '/combo-finder' | '/favorites' | '/search';

interface NavItemProps {
  icon: React.ElementType;
  path: PathKey;
  label: string;
  isSelected: boolean;
}

const NavItem = memo(({ icon: Icon, path, label, isSelected }: NavItemProps) => {
  return (
    <Link
      to={path}
      aria-label={label}
      aria-current={isSelected ? 'page' : undefined}
      className="relative flex h-10 w-10 flex-col items-center justify-center gap-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Icon className={cn('h-5 w-5 transition-all', isSelected ? 'fill-highlight text-highlight' : 'text-slate-400 stroke-[2.3]')} />
      {isSelected && (
        <motion.div
          layoutId="client-nav-indicator"
          className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-highlight"
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
    <nav aria-label="Navegação principal do cliente" className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-0">
      <div className="pointer-events-auto relative mx-auto h-16 w-full max-w-[448px] bg-transparent">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-16 border-t border-slate-100 bg-white/95 shadow-[0_-8px_22px_rgba(15,23,42,0.05)] backdrop-blur-md" />
        <div className="pointer-events-none absolute inset-0 z-0 translate-y-2 backdrop-blur-md">
          <svg
            width="100%"
            height="64"
            viewBox="0 0 450 70"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
            className="h-full w-full overflow-visible object-fill drop-shadow-[0px_-6px_18px_rgba(15,23,42,0.06)]"
          >
            <path
              d="M 0 0 L 170 0 C 177 0, 183 4, 186 10 C 193 25, 207 35, 225 35 C 243 35, 257 25, 264 10 C 267 4, 273 0, 280 0 L 450 0 L 450 70 L 0 70 Z"
              fill="rgba(255, 255, 255, 0.94)"
            />
          </svg>
        </div>

        <div className="absolute inset-0 z-10 grid h-full translate-y-2 grid-cols-5">
          <div className="flex items-center justify-center">
            <NavItem icon={Home} path="/home" label="Início" isSelected={getActivePath('/home')} />
          </div>
          <div className="flex items-center justify-center">
            <NavItem icon={Search} path="/search" label="Buscar" isSelected={getActivePath('/search')} />
          </div>
          <div />
          <div className="flex items-center justify-center">
            <NavItem icon={Heart} path="/favorites" label="Favoritos" isSelected={getActivePath('/favorites')} />
          </div>
          <div className="flex items-center justify-center">
            <NavItem icon={User} path="/profile" label="Perfil" isSelected={getActivePath('/profile')} />
          </div>
        </div>

        <div className="absolute left-1/2 top-6 z-20 -translate-x-1/2 -translate-y-1/2">
          <button
            id="tour-ai-button"
            type="button"
            onClick={onToggleAi}
            aria-label={isAiOpen ? 'Fechar assistente' : 'Abrir assistente'}
            aria-pressed={isAiOpen}
            className={cn(
              'flex h-[48px] w-[48px] cursor-pointer items-center justify-center rounded-full border border-white/80 bg-highlight shadow-[0px_6px_14px_rgba(223,75,28,0.16)] outline-none transition-all duration-300 hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              isAiOpen && 'rotate-45 scale-95'
            )}
          >
            <Sparkles className="h-5 w-5 text-white stroke-[2.5]" />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default ClientBottomNav;

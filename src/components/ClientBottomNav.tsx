import React from 'react';
import { Heart, Home, Search, Sparkles, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { CurvedBottomNav, curvedCenterActionClassName } from '@/components/navigation/CurvedBottomNav';

const ClientBottomNav: React.FC = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path || (path !== '/home' && location.pathname.startsWith(path));

  return (
    <CurvedBottomNav
      ariaLabel="Navegação principal do cliente"
      indicatorLayoutId="client-nav-indicator"
      items={[
        { icon: Home, path: '/home', label: 'Início', isSelected: isActive('/home') },
        { icon: Search, path: '/search', label: 'Explorar', isSelected: isActive('/search') },
        { icon: Heart, path: '/favorites', label: 'Favoritos', isSelected: isActive('/favorites') },
        { icon: User, path: '/profile', label: 'Perfil', isSelected: isActive('/profile') },
      ]}
      centerAction={(
        <Link
          id="tour-ai-button"
          to="/home?assistant=1"
          aria-label="Fazer uma pergunta à IA dos cardápios"
          className={curvedCenterActionClassName}
        >
          <Sparkles className="h-7 w-7 stroke-[3]" aria-hidden="true" />
          <span className="absolute -bottom-[19px] left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-extrabold text-highlight">
            Perguntar
          </span>
        </Link>
      )}
    />
  );
};

export default ClientBottomNav;

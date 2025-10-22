import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, User, Crown, Zap, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils/url';

const NavItem = ({ icon: Icon, label, path, isSelected }) => {
  return (
    <Link
      to={path}
      className={cn(
        "flex flex-col items-center justify-center gap-1 transition-colors duration-200 w-16",
        isSelected ? "text-primary" : "text-gray-500",
      )}
    >
      <Icon 
        className={cn("w-6 h-6")} 
      />
      <span className={cn("text-xs", isSelected && "font-bold")}>
        {label}
      </span>
    </Link>
  );
};

const RestaurantBottomNav = ({ selectedTab, isFree }) => {
  const navigate = useNavigate();
  
  const navItems = [
    { id: 'home', icon: Home, label: 'Início', path: createPageUrl('restaurant-area/home') },
    { id: 'stats', icon: Search, label: 'Buscar', path: createPageUrl('restaurant-area/stats') },
    { id: 'perfil', icon: User, label: 'Perfil', path: createPageUrl('restaurant-area/profile-menu') },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-30 max-w-md mx-auto">
      <div className="flex justify-around items-center h-16">
        <NavItem {...navItems[0]} isSelected={selectedTab === navItems[0].id} />
        <NavItem {...navItems[1]} isSelected={selectedTab === navItems[1].id} />
        
        {/* Botão de Upgrade Centralizado */}
        <div className="relative -mt-8">
          <button 
            onClick={() => navigate(createPageUrl('restaurant-area/upgrade'))}
            className="w-16 h-16 rounded-full bg-highlight text-white flex flex-col items-center justify-center shadow-lg shadow-highlight/50"
          >
            <div className="relative">
              <Zap className="w-7 h-7" />
              {isFree && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/75 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                </span>
              )}
            </div>
            <span className="text-xs font-bold mt-0.5">Upgrade</span>
          </button>
        </div>
        
        <NavItem {...navItems[2]} isSelected={selectedTab === navItems[2].id} />
      </div>
    </div>
  );
};

export default RestaurantBottomNav;
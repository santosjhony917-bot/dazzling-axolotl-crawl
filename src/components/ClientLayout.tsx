import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import ClientBottomNav from './ClientBottomNav';
import { createPageUrl } from '@/utils/url';

interface ClientLayoutProps {
  title?: string;
  children?: React.ReactNode;
  selectedTab?: 'home' | 'search' | 'favorites' | 'profile'; // Corrigido para 'profile'
  showBackButton?: boolean; // Adicionado para compatibilidade
}

const ClientLayout: React.FC<ClientLayoutProps> = () => {
  const location = useLocation();
  
  // Determina a aba selecionada com base na rota atual
  const getSelectedTab = (): 'home' | 'search' | 'favorites' | 'profile' => {
    if (location.pathname.startsWith(createPageUrl('profile'))) return 'profile';
    if (location.pathname.startsWith(createPageUrl('favorites'))) return 'favorites';
    if (location.pathname.startsWith(createPageUrl('search-unified'))) return 'search';
    // Default para home
    return 'home';
  };
  
  const selectedTab = getSelectedTab();

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      <Outlet />
      <ClientBottomNav selectedTab={selectedTab} />
    </div>
  );
};

export default ClientLayout;
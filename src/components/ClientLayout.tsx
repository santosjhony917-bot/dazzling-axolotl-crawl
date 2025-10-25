import React from 'react';
import { useAuthContext } from '../hooks/useAuthContext';
import { Loader2 } from 'lucide-react';
import CustomerBottomNav from './CustomerBottomNav';

interface ClientLayoutProps {
  children: React.ReactNode;
  selectedTab: 'home' | 'search' | 'favorites' | 'profile';
}

const ClientLayout: React.FC<ClientLayoutProps> = ({ children, selectedTab }) => {
  const { isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f5f7f8]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-2 text-primary">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7f8] flex flex-col">
      <div className="flex-1 w-full max-w-md mx-auto">
        {children}
      </div>
      
      {/* Navegação Inferior */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md z-30">
        <CustomerBottomNav selectedTab={selectedTab} />
      </div>
    </div>
  );
};

export default ClientLayout;
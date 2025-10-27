import React from 'react';
import ClientBottomNav from './ClientBottomNav';

interface ClientPageWrapperProps {
  children: React.ReactNode;
  selectedTab: 'home' | 'search' | 'favorites' | 'profile';
}

const ClientPageWrapper: React.FC<ClientPageWrapperProps> = ({ children, selectedTab }) => {
  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      {/* O conteúdo da página é renderizado aqui */}
      <main className="flex-1">
        {children}
      </main>
      <ClientBottomNav selectedTab={selectedTab} />
    </div>
  );
};

export default ClientPageWrapper;
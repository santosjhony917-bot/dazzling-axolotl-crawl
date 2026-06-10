import React from 'react';
import ClientBottomNav from './ClientBottomNav';

interface ClientPageWrapperProps {
  children: React.ReactNode;
  // Removendo selectedTab, pois a navegação ativa será determinada pela rota atual
}

const ClientPageWrapper: React.FC<ClientPageWrapperProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background-light pb-20 max-w-md mx-auto">
      {/* O conteúdo da página é renderizado aqui */}
      <main className="flex-1">
        {children}
      </main>
      <ClientBottomNav />
    </div>
  );
};

export default ClientPageWrapper;
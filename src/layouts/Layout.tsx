import React from 'react';
import { Outlet } from 'react-router-dom';
// Removendo importação de Toaster (sonner)

const Layout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* O Outlet renderiza o componente da rota atual */}
      <main className="flex-1">
        <Outlet />
      </main>
      {/* Toaster removido daqui, agora está em main.tsx */}
    </div>
  );
};

export default Layout;
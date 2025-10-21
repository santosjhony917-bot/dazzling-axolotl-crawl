import React from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';

const Layout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* O Outlet renderiza o componente da rota atual */}
      <main className="flex-1">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
};

export default Layout;
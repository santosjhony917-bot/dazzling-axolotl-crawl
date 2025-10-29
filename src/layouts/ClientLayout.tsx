import React from 'react';
import { Outlet } from 'react-router-dom';
import ClientBottomNav from '@/components/ClientBottomNav';
import { Toaster } from 'react-hot-toast'; // Usando o Toaster de react-hot-toast

const ClientLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      <main className="flex-1">
        <Outlet />
      </main>
      <ClientBottomNav />
      {/* O Toaster já está em main.tsx, mas mantemos a estrutura de layout limpa */}
    </div>
  );
};

export default ClientLayout;
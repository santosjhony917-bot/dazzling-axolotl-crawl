import React from 'react';
import { Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* O Outlet renderiza o componente da rota atual */}
      <main className="flex-1 w-full mx-auto max-w-screen-xl">
        <Outlet />
      </main>
      {/* Toaster removido daqui, agora está em main.tsx */}
    </div>
  );
}
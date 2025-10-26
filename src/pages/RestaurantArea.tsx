import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { RestaurantSidebar } from '@/components/restaurant/RestaurantSidebar';
import { Loader2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { Routes } from '@/router/routes';
import { useAuthContext } from '@/context/AuthContext';
import { useAuth } from '@/hooks/useAuth'; // Importando useAuth

export default function RestaurantArea() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthContext();
  const { restaurant, isLoading: isProfileLoading } = useAuth(); // Usando useAuth para obter restaurant
  const isLoading = isAuthLoading || isProfileLoading;
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={Routes.LOGIN} state={{ from: location }} replace />;
  }

  if (!restaurant) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-600">Acesso Negado</h1>
        <p className="text-gray-600">Você precisa ter um perfil de restaurante ativo para acessar esta área.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <RestaurantSidebar />
      <div className="flex-1 flex flex-col">
        <header className="p-4 border-b bg-white shadow-sm">
          <h1 className="text-2xl font-semibold">Área do Restaurante</h1>
        </header>
        <main className="flex-1 p-6">
          {/* The content of the nested route (MenuManagement or CategoryDetails) will render here */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
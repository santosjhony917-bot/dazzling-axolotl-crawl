import React from 'react';
import { Outlet } from 'react-router-dom';
import RestaurantAreaSidebar from '@/components/restaurant/RestaurantAreaSidebar';
import { useAuthData } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const RestaurantAreaLayout: React.FC = () => {
  const { session, isLoading } = useAuthData();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  );
  }

  if (!session) {
    // Redireciona para o login se não estiver autenticado
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-950">
      <RestaurantAreaSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default RestaurantAreaLayout;
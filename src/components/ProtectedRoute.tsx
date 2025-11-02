import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthData } from '@/context/AuthContext';
import { createPageUrl } from '@/utils/url';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: ('customer' | 'restaurant' | 'admin')[];
  redirectPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  redirectPath = createPageUrl('auth'),
}) => {
  const { user, isLoading, restaurant, isRestaurantLoading } = useAuthData();
  const location = useLocation();

  if (isLoading || isRestaurantLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // Se não estiver autenticado, redireciona para a página de login
    return <Navigate to={redirectPath} replace state={{ from: location }} />;
  }

  // Se o usuário estiver autenticado, mas não tiver um papel permitido
  if (allowedRoles && !allowedRoles.includes(user.user_role as any)) {
    // Se for um restaurante, deve ir para a área do restaurante.
    // Se for um cliente, deve ir para a home.
    const redirectPath = restaurant ? createPageUrl('restaurant-area-home') : createPageUrl('home');
    return <Navigate to={redirectPath} replace />;
  }

  // Se tudo estiver ok, renderiza o conteúdo da rota
  return <Outlet />;
};

export default ProtectedRoute;
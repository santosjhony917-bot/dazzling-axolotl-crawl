"use client";

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSession } from '@/integrations/supabase/session-provider';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  requiredRole?: 'authenticated' | 'restaurant_owner' | 'admin';
  layout?: React.ComponentType<{ children: React.ReactNode }>; // Layout component deve aceitar children
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole, layout: LayoutComponent }) => {
  const { session, isLoading: isLoadingSession } = useSession();
  const { isLoggedIn, isRestaurantOwner, isAdmin, isLoading: isLoadingAuth } = useAuth();

  if (isLoadingSession || isLoadingAuth) {
    return <div>Carregando autenticação...</div>; // Ou um spinner de carregamento
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  // Autorização baseada em role
  if (requiredRole === 'restaurant_owner' && !isRestaurantOwner) {
    return <Navigate to="/unauthorized" replace />;
  }
  if (requiredRole === 'admin' && !isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Se um LayoutComponent for fornecido, renderize-o e deixe-o lidar com o Outlet
  if (LayoutComponent) {
    return <LayoutComponent><Outlet /></LayoutComponent>;
  }

  // Caso contrário, apenas renderize o Outlet diretamente
  return <Outlet />;
};

export default ProtectedRoute;
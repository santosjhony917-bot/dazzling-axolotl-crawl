"use client";

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthData } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  requiredRole?: 'admin' | 'restaurant_owner' | 'authenticated';
  element: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole, element }) => {
  const { isAuthenticated, isProfileLoading, isAdmin, restaurant } = useAuthData();

  if (isProfileLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (requiredRole === 'admin' && !isAdmin) {
    return <Navigate to="/" replace />; // Redireciona para a home se não for admin
  }

  if (requiredRole === 'restaurant_owner' && !restaurant) {
    return <Navigate to="/restaurant-area/claim" replace />; // Redireciona para a página de reivindicação se não tiver restaurante
  }

  return <>{element}</>;
};

export default ProtectedRoute;
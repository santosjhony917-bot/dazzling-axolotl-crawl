import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthData } from '@/context/AuthContext';

interface ProtectedRouteProps {
  element: React.ReactElement;
  requiredRole?: 'admin' | 'restaurant_owner' | 'authenticated';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ element, requiredRole }) => {
  const { isAuthenticated, isAdmin, restaurant, isLoading, isRestaurantLoading } = useAuthData();

  const getRole = () => {
    if (isAdmin) return 'admin';
    if (restaurant) return 'restaurant_owner';
    if (isAuthenticated) return 'authenticated';
    return null;
  };

  const role = getRole();

  const isRouteLoading = isLoading || (requiredRole === 'restaurant_owner' && isRestaurantLoading);

  if (isRouteLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-gray-500 font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (requiredRole && role !== requiredRole) {
    // Special case: admin can access everything
    if (role === 'admin') {
       return React.cloneElement(element, { children: <Outlet /> });
    }
    // Permite que restaurant_owner acesse rotas gerais autenticadas (como /search, /home)
    if (requiredRole === 'authenticated' && role === 'restaurant_owner') {
       return React.cloneElement(element, { children: <Outlet /> });
    }
    // Redirect to a relevant page if the role doesn't match
    if (role === 'restaurant_owner') return <Navigate to="/home" replace />;
    return <Navigate to="/home" replace />;
  }

  // The element is the layout, and <Outlet /> renders the nested child routes
  return React.cloneElement(element, { children: <Outlet /> });
};

export default ProtectedRoute;
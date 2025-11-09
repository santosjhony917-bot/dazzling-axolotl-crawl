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

  if (isLoading || isRestaurantLoading) {
    return <div>Loading...</div>; // Or a proper loading spinner
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (requiredRole && role !== requiredRole) {
    // Special case: admin can access everything
    if (role === 'admin') {
       return React.cloneElement(element, { children: <Outlet /> });
    }
    // Redirect to a relevant page if the role doesn't match
    if (role === 'restaurant_owner') return <Navigate to="/restaurant-area/home" replace />;
    return <Navigate to="/home" replace />;
  }

  // The element is the layout, and <Outlet /> renders the nested child routes
  return React.cloneElement(element, { children: <Outlet /> });
};

export default ProtectedRoute;
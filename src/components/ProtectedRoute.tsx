import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { createPageUrl } from '@/utils/url';

interface ProtectedRouteProps {
  requiredRole: 'authenticated' | 'admin' | 'restaurant_owner';
  element?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole, element }) => {
  const { isAuthenticated, isLoading, isAdmin, restaurant } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // User is not authenticated, redirect to login page
    return <Navigate to={createPageUrl("auth")} replace />;
  }
  
  let isAuthorized = false;
  
  if (requiredRole === 'authenticated') {
    isAuthorized = true; // Already checked by isAuthenticated
  } else if (requiredRole === 'admin') {
    isAuthorized = isAdmin;
  } else if (requiredRole === 'restaurant_owner') {
    // Check if the user is associated with a restaurant
    isAuthorized = !!restaurant;
  }

  if (!isAuthorized) {
    // User is authenticated but does not have the required role, redirect to home
    return <Navigate to={createPageUrl("home")} replace />;
  }

  // If authorized, render the provided element (for layouts) or Outlet (for nested routes)
  return element ? <>{element}</> : <Outlet />;
};

export default ProtectedRoute;
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import { createPageUrl } from '@/utils/url';

interface ProtectedRouteProps {
  requiredRole?: 'admin' | 'restaurant_owner' | 'authenticated';
  element?: React.ReactElement; // Allows wrapping an element like <AdminLayout />
}

// Rotas consideradas 'de cliente' que devem redirecionar proprietários de restaurante
const CUSTOMER_ROUTES = ['/home', '/profile', '/favorites', '/search-client'];

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole = 'authenticated', element }) => {
  const { user, isLoading, isAdmin, restaurant } = useAuthContext();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // If not authenticated, redirect to login/auth page
    return <Navigate to={createPageUrl('auth')} state={{ from: location }} replace />;
  }
  
  // --- LÓGICA DE REDIRECIONAMENTO DE PROPRIETÁRIO DE RESTAURANTE ---
  const isRestaurantOwner = !!restaurant;
  const isCustomerRoute = CUSTOMER_ROUTES.some(route => location.pathname === route || location.pathname.startsWith(`${route}/`));

  if (isRestaurantOwner && isCustomerRoute) {
    // Se for proprietário de restaurante e estiver em uma rota de cliente, redireciona para o Dashboard do Restaurante.
    return <Navigate to={createPageUrl('restaurant-area/home')} replace />;
  }
  // ---------------------------------------------------------------------
  
  // Check roles
  let hasRequiredRole = false;
  
  if (requiredRole === 'authenticated') {
    hasRequiredRole = true;
  } else if (requiredRole === 'admin') {
    hasRequiredRole = isAdmin;
  } else if (requiredRole === 'restaurant_owner') {
    // A user is a restaurant owner if they are logged in AND have a restaurant linked
    hasRequiredRole = isRestaurantOwner;
  }

  if (!hasRequiredRole) {
    // Redirect to a generic unauthorized page or home
    console.warn(`Access denied: User ${user.email} does not have required role: ${requiredRole}`);
    
    // Specific redirect logic for common unauthorized attempts
    if (requiredRole === 'admin') {
        return <Navigate to={createPageUrl('adminLogin')} replace />;
    }
    
    return <Navigate to={createPageUrl('home')} replace />;
  }
  
  // If role is met, render the wrapped element or the Outlet for nested routes
  return element ? element : <Outlet />;
};

export default ProtectedRoute;
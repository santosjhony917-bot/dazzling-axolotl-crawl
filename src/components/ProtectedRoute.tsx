import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSession } from '@/integrations/supabase/session-context';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  requiredRole: string | 'authenticated';
  element?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole, element }) => {
  const { session, user, isLoading, checkRole } = useSession();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    // User is not authenticated, redirect to login page
    return <Navigate to="/auth" replace />; // Redirecting to /auth for general login
  }
  
  // Check if the user meets the role requirement
  let isAuthorized = false;
  
  if (requiredRole === 'authenticated') {
    isAuthorized = !!user;
  } else {
    // Check specific role using the checkRole function (which handles the mock logic)
    isAuthorized = checkRole([requiredRole]);
  }

  if (!isAuthorized) {
    // User is authenticated but does not have the required role, redirect to home
    return <Navigate to="/" replace />;
  }

  // If authorized, render the provided element (for layouts) or Outlet (for nested routes)
  return element ? <>{element}</> : <Outlet />;
};

export default ProtectedRoute;
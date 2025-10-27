import React from 'react';
import { Navigate, Outlet, RouteProps } from 'react-router-dom';
import { useSession } from '@/integrations/supabase/session-context';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps extends RouteProps {
  allowedRoles: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { session, isLoading, checkRole } = useSession();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    // User is not authenticated, redirect to login page
    return <Navigate to="/login" replace />;
  }

  if (!checkRole(allowedRoles)) {
    // User is authenticated but does not have the required role, redirect to home or unauthorized page
    // For simplicity, redirecting to home
    return <Navigate to="/" replace />;
  }

  // User is authenticated and has the required role
  return <Outlet />;
};

export default ProtectedRoute;
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import AdminLayout from './AdminLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface AdminRouteProps {
  children: React.ReactNode;
  title: string;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children, title }) => {
  const { isAdmin, isLoading, error } = useUserRole();

  if (isLoading) {
    // Simple full-screen loading skeleton
    return (
      <div className="h-screen w-full flex flex-col">
        <div className="h-16 bg-white border-b p-4 flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="flex flex-1">
          <Skeleton className="w-20 md:w-64 h-full" />
          <div className="flex-1 p-6">
            <Skeleton className="h-10 w-full mb-6" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-8 max-w-lg mx-auto mt-20">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro de Autenticação</AlertTitle>
          <AlertDescription>
            Não foi possível verificar suas permissões de administrador. Detalhes: {error.message}
          </AlertDescription>
        </Alert>
        <Navigate to="/auth" replace />
      </div>
    );
  }

  if (!isAdmin) {
    // Redirect unauthorized users to the main authentication page
    return <Navigate to="/auth" replace />;
  }

  return (
    <AdminLayout title={title}>
      {children}
    </AdminLayout>
  );
};

export default AdminRoute;
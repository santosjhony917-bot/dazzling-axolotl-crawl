import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthContext } from '@/context/AuthContext'; // Usando o contexto completo
import { Loader2 } from 'lucide-react';
import { createPageUrl } from '@/utils/url';

const ProtectedRoute: React.FC = () => {
  const { user, isLoading, isAdmin } = useAuthContext();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // Redireciona usuários não autenticados para a página de autenticação principal
    return <Navigate to="/auth" replace />;
  }
  
  // Se o usuário estiver logado E for administrador, redireciona para o painel de administração
  if (isAdmin) {
    // Nota: O AdminLayout já redireciona /admin para /admin/dashboard, mas vamos ser explícitos.
    return <Navigate to={createPageUrl('admin/dashboard')} replace />;
  }

  // Se o usuário estiver logado, mas não for administrador, permite o acesso às rotas filhas (cliente/restaurante)
  return <Outlet />;
};

export default ProtectedRoute;
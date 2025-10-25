import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../hooks/useAuthContext';
import { createPageUrl } from '@/utils/url';
import { Loader2 } from 'lucide-react';

const ProfileRedirect: React.FC = () => {
  const { session, isLoading, restaurant } = useAuthContext();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    // Se não estiver logado, redireciona para a tela de login/auth
    return <Navigate to={createPageUrl('auth')} replace />;
  }

  if (restaurant) {
    // Se for proprietário de restaurante, redireciona para o perfil de gerenciamento
    return <Navigate to={createPageUrl('restaurant-area/profile-menu')} replace />;
  }

  // Se for apenas um cliente logado, redireciona para a Home (já que removemos a tela de perfil do cliente)
  // Ou podemos criar uma tela de perfil de cliente simples se necessário no futuro. Por enquanto, Home.
  return <Navigate to={createPageUrl('home')} replace />;
};

export default ProfileRedirect;
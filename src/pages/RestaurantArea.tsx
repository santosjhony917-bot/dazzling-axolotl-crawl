import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/context/AuthContext';
import { useRestaurantContext } from '@/context/RestaurantContext';
import { createPageUrl } from '@/utils/url';
import { Loader2 } from 'lucide-react';

/**
 * Componente de Rota de Proteção e Redirecionamento para a Área do Restaurante.
 * Garante que o usuário esteja autenticado e tenha um restaurante associado.
 */
export default function RestaurantAreaRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, isLoading: isAuthLoading, profile } = useAuthContext();
  const { restaurant, isLoading: isRestaurantLoading } = useRestaurantContext();

  useEffect(() => {
    if (isAuthLoading || isRestaurantLoading) {
      return;
    }

    // CORRIGIDO: Acessando o role através do user.user_metadata
    const isRestaurantUser = session?.user?.user_metadata?.user_role === 'restaurant';

    if (!session || !isRestaurantUser) {
      // Não autenticado ou não é usuário de restaurante, redireciona para o login do restaurante
      navigate(createPageUrl('restaurant-login'), { state: { from: location }, replace: true });
    } else if (!restaurant) {
      // Autenticado como restaurante, mas sem restaurante associado (deve ir para o hub ou claim)
      navigate(createPageUrl('restaurantAreaHub'), { replace: true });
    } else {
      // Autenticado e com restaurante, vai para o dashboard
      navigate(createPageUrl('restaurant-area/dashboard'), { replace: true });
    }
  }, [session, isAuthLoading, profile, restaurant, isRestaurantLoading, navigate, location]);

  return (
    <div className="flex justify-center items-center h-screen bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
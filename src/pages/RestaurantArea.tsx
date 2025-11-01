import React, { useEffect } from 'react';
import { useAuthData } from '@/context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { Loader2 } from 'lucide-react';

export default function RestaurantArea() {
  const { user, isLoading, restaurant } = useAuthData(); // CORRIGIDO: Usando useAuthData
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      // Não autenticado, redireciona para o login do restaurante
      navigate(createPageUrl('restaurantLogin'), { state: { from: location }, replace: true });
    } else if (!restaurant) {
      // Autenticado, mas sem restaurante associado (deve ir para o hub ou claim)
      navigate(createPageUrl('restaurantAreaHub'), { replace: true });
    } else {
      // Autenticado e com restaurante, vai para o dashboard
      navigate(createPageUrl('restaurantAreaHome'), { replace: true });
    }
  }, [isLoading, user, restaurant, navigate, location]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Este componente deve sempre redirecionar, então não deve renderizar nada no final
  return null;
}
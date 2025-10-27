import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';

/**
 * Componente de redirecionamento temporário para a rota correta do dashboard.
 * Esta página deve ser removida se a rota /restaurant-area/home for removida do App.tsx.
 */
export default function RestaurantAreaHomeRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redireciona para o dashboard principal do restaurante
    navigate(createPageUrl('restaurant-area/dashboard'), { replace: true });
  }, [navigate]);

  return (
    <div className="p-4 text-center text-gray-500">
      Redirecionando para o Dashboard...
    </div>
  );
}
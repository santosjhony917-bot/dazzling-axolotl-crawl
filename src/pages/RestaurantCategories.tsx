import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';

export default function RestaurantCategories() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redireciona para a nova página de gerenciamento de cardápio
    navigate(createPageUrl('restaurant-area/menu'), { replace: true });
  }, [navigate]);

  return (
    <div className="p-4 text-center">
      <p className="text-gray-600">Redirecionando para o Gerenciamento de Cardápio...</p>
    </div>
  );
}
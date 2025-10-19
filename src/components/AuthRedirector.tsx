"use client";

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { createPageUrl } from '@/utils/url';
import { Skeleton } from '@/components/ui/skeleton';

const AuthRedirector = () => {
  const navigate = useNavigate();
  const { isPremiumRestaurant, isFreeRestaurant, isLoading } = useUserRole();

  useEffect(() => {
    if (!isLoading) {
      if (isPremiumRestaurant || isFreeRestaurant) {
        navigate(createPageUrl('restaurant-area/home'), { replace: true });
      } else {
        navigate(createPageUrl('home'), { replace: true });
      }
    }
  }, [isLoading, isPremiumRestaurant, isFreeRestaurant, navigate]);

  if (isLoading) {
    // Renderiza um skeleton ou tela de carregamento enquanto o role está sendo determinado
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Skeleton className="h-12 w-48" />
      </div>
    );
  }

  return null; // Não renderiza nada após o redirecionamento
};

export default AuthRedirector;
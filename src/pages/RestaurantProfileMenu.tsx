import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import FreeProfileLayout from '@/components/FreeProfileLayout';
import { createPageUrl } from '@/utils/url';
import { showError } from '@/utils/toast';

const RestaurantProfileMenu: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id || null;
  
  // Busca o restaurante pelo ID do usuário logado
  const { restaurant, loading: restaurantLoading, updateRestaurant, refetch } = useRestaurantProfile(userId);
  
  const { isPremium } = { isPremium: restaurant?.plan === 'premium' }; // Mocking isPremium based on fetched data

  // Lida com o redirecionamento para usuários não autenticados
  useEffect(() => {
    if (!authLoading && !user) {
      navigate(createPageUrl('restaurant-login'));
    }
  }, [authLoading, user, navigate]);

  if (authLoading || restaurantLoading) {
    return (
      <div className="p-4 md:p-8 space-y-8 max-w-md mx-auto">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-40 w-full rounded-xl mb-6" />
        <Skeleton className="h-6 w-3/4 mb-4" />
        <Skeleton className="h-64 w-full rounded-xl mb-6" />
      </div>
    );
  }

  if (!restaurant) {
    // Se o usuário está logado, mas não tem restaurante (deve ser raro após o signup)
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <h2 className="text-xl font-semibold text-[#022D68]">Nenhum restaurante encontrado.</h2>
        <p className="text-gray-500">Por favor, verifique se o cadastro foi concluído ou entre em contato com o suporte.</p>
        <Button onClick={() => navigate(createPageUrl('restaurant-signup'))} className="mt-4 bg-[#E47948] hover:bg-[#E47948]/90">
          Tentar Cadastrar Novamente
        </Button>
      </div>
    );
  }

  return (
    <FreeProfileLayout 
      restaurant={restaurant} 
      updateRestaurant={updateRestaurant} 
      refetch={refetch} 
      isPremium={isPremium} 
    />
  );
};

export default RestaurantProfileMenu;
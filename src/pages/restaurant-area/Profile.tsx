import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/context/AuthContext';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils/url';
import ProfileManagementLayout from '@/components/restaurant/ProfileManagementLayout'; // Importando o novo layout

export default function RestaurantProfilePage() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuthContext();

  const { 
    restaurant, 
    isLoading: restaurantLoading, 
    updateRestaurant, 
    refetchProfile,
  } = useRestaurantProfile(); 
  
  const { isPremium } = useAuthContext(); // Obtendo isPremium do contexto

  // Wrapper para adaptar o tipo de retorno da mutação
  const wrappedUpdateRestaurant = useCallback(async (updates: Partial<any>): Promise<{ error: string | null }> => {
    try {
      await updateRestaurant(updates);
      return { error: null };
    } catch (e) {
      return { error: (e as Error).message || "Erro desconhecido ao atualizar." };
    }
  }, [updateRestaurant]);

  if (authLoading || restaurantLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#f5f7f8]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Acesso Negado</h2>
        <p className="text-gray-600 mb-6">Você precisa ter um restaurante registrado para acessar esta página.</p>
        <Button onClick={() => navigate(createPageUrl('index'))}>
          Voltar para o Início
        </Button>
      </div>
    );
  }

  return (
    <ProfileManagementLayout 
      restaurant={restaurant} 
      updateRestaurant={wrappedUpdateRestaurant} 
      refetch={refetchProfile}
      isPremium={isPremium}
    />
  );
}
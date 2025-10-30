import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Utensils, ArrowLeft, AlertTriangle } from 'lucide-react';
import { PublicRestaurantData } from '@/types/restaurant';
import FreeProfileLayout from '@/components/public/FreeProfileLayout';
import PremiumProfileLayout from '@/components/public/PremiumProfileLayout';
import { showError } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import { usePublicRestaurant } from '@/hooks/usePublicRestaurant'; // Importando o hook

export default function RestaurantProfilePublic() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();
  
  // Usando o hook para buscar os dados
  const { restaurant, isLoading, error } = usePublicRestaurant(restaurantId);

  useEffect(() => {
    console.log(`[ProfilePublic] ID recebido: ${restaurantId}`);
    if (error) {
      console.error(`[ProfilePublic] Erro ao carregar dados: ${error}`); // Log detalhado do erro
      showError(error);
    }
  }, [error, restaurantId]);

  const handleBack = () => navigate(-1);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-background-light">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="p-8 text-center min-h-screen bg-background-light">
        <div className="fixed top-4 left-4 z-50">
          <Button variant="ghost" size="icon" onClick={handleBack} className="bg-white/80 backdrop-blur-sm shadow-soft-md hover:bg-white">
            <ArrowLeft className="h-5 w-5 text-primary" />
          </Button>
        </div>
        <div className="pt-20">
          <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <h1 className="text-xl font-semibold text-gray-700">Erro ao carregar perfil</h1>
          <p className="text-gray-500 mt-2">{error || "O perfil solicitado não existe."}</p>
          <Button onClick={handleBack} className="mt-6">
            Voltar
          </Button>
        </div>
      </div>
    );
  }
  
  console.log(`[ProfilePublic] Carregando layout para plano: ${restaurant.plan}`);

  // Envolve o layout em um contêiner de largura máxima para simular o layout de celular
  return (
    <div className="max-w-md mx-auto min-h-screen bg-background-light shadow-2xl relative">
      
      {/* Botão de Voltar ABSOLUTO dentro do contêiner max-w-md */}
      <div className="absolute top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="bg-white/80 backdrop-blur-sm shadow-soft-md hover:bg-white"
        >
          <ArrowLeft className="h-5 w-5 text-primary" />
        </Button>
      </div>
      
      {restaurant.plan === 'premium' || restaurant.plan === 'premium_gift' ? (
        <PremiumProfileLayout restaurant={restaurant} />
      ) : (
        <FreeProfileLayout restaurant={restaurant} />
      )}
    </div>
  );
}
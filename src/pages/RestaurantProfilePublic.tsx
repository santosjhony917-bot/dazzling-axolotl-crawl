import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Utensils, ArrowLeft, AlertTriangle } from 'lucide-react';
import { PublicRestaurantData } from '@/types/restaurant';
import FreeProfileLayout from '@/components/public/FreeProfileLayout';
import PremiumProfileLayout from '@/components/public/PremiumProfileLayout';
import { showError } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import { usePublicRestaurant } from '@/hooks/usePublicRestaurant';
import { useRestaurantFavorite } from '@/hooks/useRestaurantFavorite';

interface RestaurantProfilePublicProps {
  initialRestaurantId?: string; // Novo prop para passar o ID diretamente
  simulatedPlan?: 'free' | 'premium'; // Novo prop para simular o plano
  isCompact?: boolean; // NOVO: Prop para indicar modo compacto
}

export default function RestaurantProfilePublic({ initialRestaurantId, simulatedPlan }: RestaurantProfilePublicProps) {
  const { restaurantId: paramRestaurantId } = useParams<{ restaurantId: string }>();
  const restaurantId = initialRestaurantId || paramRestaurantId; // Prioriza o prop, senão usa o param da URL
  const navigate = useNavigate();
  
  // 1. Busca os dados públicos do restaurante (inclui a contagem de seguidores)
  const { restaurant, isLoading, error, refetch } = usePublicRestaurant(restaurantId);

  // Adiciona um efeito para chamar refetch quando o restaurantId muda ou na montagem
  useEffect(() => {
    if (restaurantId) {
      console.log(`[RestaurantProfilePublic] Forçando refetch para o ID: ${restaurantId}`);
      refetch(); // Força uma nova busca dos dados
    }
  }, [restaurantId, refetch]);

  // 2. Usa o hook de favorito para obter o estado reativo e a função de toggle
  // O estado inicial de isFavorite é lido do cache do useFavorites, que é atualizado otimisticamente.
  const { isFavorite, toggleFavorite, isLoading: isFavoriteMutating } = useRestaurantFavorite(restaurantId || '');

  useEffect(() => {
    console.log(`[ProfilePublic] ID recebido: ${restaurantId}`);
    if (error) {
      console.error(`[ProfilePublic] Erro ao carregar dados: ${error}`);
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
  
  // Determina o plano a ser usado para renderização (simulado ou real)
  const planToRender = simulatedPlan || restaurant.plan;

  // Criamos uma versão dos dados do restaurante que inclui o estado reativo de favorito E o plano a ser renderizado
  const reactiveRestaurantData: PublicRestaurantData = {
    ...restaurant,
    is_favorite: isFavorite, // Sobrescreve o valor estático com o valor reativo do hook
    plan: planToRender, // Sobrescreve o plano original com o plano simulado, se houver
  };

  // Props comuns para os layouts
  const layoutProps = {
    restaurant: reactiveRestaurantData,
    toggleFavorite: toggleFavorite,
    isFavoriteMutating: isFavoriteMutating,
    isCompact: true, // NOVO: Indica que este é um modo compacto para prévia
  };

  // Envolve o layout em um contêiner de largura máxima para simular o layout de celular
  return (
    <div className="max-w-md mx-auto min-h-screen bg-background-light shadow-2xl relative">
      
      {planToRender === 'premium' || planToRender === 'premium_gift' ? (
        <PremiumProfileLayout {...layoutProps} />
      ) : (
        <FreeProfileLayout {...layoutProps} />
      )}
    </div>
  );
}
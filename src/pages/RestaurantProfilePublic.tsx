import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Utensils, ArrowLeft } from 'lucide-react';
import { fetchPublicRestaurantById } from '@/integrations/supabase/restaurants';
import { PublicRestaurantData } from '@/types/restaurant';
import FreeProfileLayout from '@/components/public/FreeProfileLayout';
import PremiumProfileLayout from '@/components/public/PremiumProfileLayout';
import { showError } from '@/utils/toast';
import { Button } from '@/components/ui/button';

export default function RestaurantProfilePublic() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<PublicRestaurantData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!restaurantId) {
      setError("ID do restaurante não fornecido.");
      setIsLoading(false);
      return;
    }

    const fetchRestaurant = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await fetchPublicRestaurantById(restaurantId);

        if (data) {
          setRestaurant(data);
        } else {
          setError("Restaurante não encontrado.");
        }
      } catch (e) {
        console.error("Erro ao buscar restaurante:", e);
        showError("Não foi possível carregar o perfil do restaurante.");
        setError("Restaurante não encontrado ou erro de conexão.");
        setRestaurant(null);
      }
      setIsLoading(false);
    };

    fetchRestaurant();
  }, [restaurantId]);

  const handleBack = () => navigate(-1);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="p-8 text-center min-h-screen bg-background-light">
        <div className="fixed top-4 left-4 z-50">
          <Button variant="ghost" size="icon" onClick={handleBack} className="bg-white/80 backdrop-blur-sm shadow-md hover:bg-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
        <div className="pt-20">
          <Utensils className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h1 className="text-xl font-semibold text-gray-700">Erro ao carregar perfil</h1>
          <p className="text-gray-500 mt-2">{error || "O perfil solicitado não existe."}</p>
        </div>
      </div>
    );
  }

  // Envolve o layout em um contêiner de largura máxima para simular o layout de celular
  return (
    <div className="max-w-md mx-auto min-h-screen bg-background-light shadow-2xl relative"> {/* Adicionado relative aqui */}
      
      {/* Botão de Voltar ABSOLUTO dentro do contêiner max-w-md */}
      <div className="absolute top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="bg-white/80 backdrop-blur-sm shadow-md hover:bg-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>
      
      {restaurant.plan === 'premium' ? (
        <PremiumProfileLayout restaurant={restaurant} />
      ) : (
        <FreeProfileLayout restaurant={restaurant} />
      )}
    </div>
  );
}
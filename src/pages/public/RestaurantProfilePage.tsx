import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Utensils } from 'lucide-react';
import { fetchPublicRestaurantById } from '@/integrations/supabase/restaurants'; // Importando a função correta
import { PublicRestaurantData } from '@/types/restaurant'; // Importando o tipo correto
import FreeProfileLayout from '@/components/public/FreeProfileLayout';
import PremiumProfileLayout from '@/components/public/PremiumProfileLayout';
import { showError } from '@/utils/toast';

export default function RestaurantProfilePage() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="p-8 text-center">
        <Utensils className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h1 className="text-xl font-semibold text-gray-700">Erro ao carregar perfil</h1>
        <p className="text-gray-500 mt-2">{error || "O perfil solicitado não existe."}</p>
      </div>
    );
  }

  // Renderiza o layout apropriado baseado no plano
  if (restaurant.plan === 'premium') {
    return <PremiumProfileLayout restaurant={restaurant} />;
  }

  // Layout Free (Padrão)
  return <FreeProfileLayout restaurant={restaurant} />;
}
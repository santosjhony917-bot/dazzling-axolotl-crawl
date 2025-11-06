import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import RestaurantMenu from '../components/public/RestaurantMenu';
import RestaurantMainInfoCard from '../components/public/RestaurantMainInfoCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface Restaurant {
  id: string;
  name: string;
  image_url: string | null;
  cover_image_url: string | null;
  description: string | null;
  menu_categories: {
    id: string;
    name: string;
    order_index: number;
    is_active: boolean;
    menu_items: {
      id: string;
      name: string;
      description: string | null;
      price: number;
      image_url: string | null;
      order_index: number;
      is_active: boolean;
      created_at: string | null; // Adicionado
      category_id: string; // Adicionado
    }[];
    created_at: string | null; // Adicionado
    restaurant_id: string; // Adicionado
    is_popular: boolean | null; // Adicionado
  }[];
  is_favorite: boolean;
  followers_count: number;
  city: string;
  state: string;
  plan: 'free' | 'basic' | 'premium';
}

const FullMenuPage: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRestaurantAndMenu = async () => {
      if (!restaurantId) {
        setError("ID do restaurante não fornecido.");
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('restaurants')
        .select(`
          *,
          menu_categories (
            id,
            name,
            order_index,
            is_active,
            created_at,
            restaurant_id,
            is_popular,
            menu_items (
              id,
              name,
              description,
              price,
              image_url,
              order_index,
              is_active,
              created_at,
              category_id
            )
          )
        `)
        .eq('id', restaurantId)
        .single();

      if (error) {
        console.error("Erro ao buscar restaurante e menu:", error);
        setError("Não foi possível carregar o cardápio. Tente novamente mais tarde.");
      } else if (data) {
        setRestaurant(data as Restaurant);
      } else {
        setError("Restaurante não encontrado.");
      }
      setLoading(false);
    };

    fetchRestaurantAndMenu();
  }, [restaurantId]);

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <Skeleton className="h-48 w-full mb-4" />
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 text-center text-red-600">
        <p>{error}</p>
        <Button onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p>Restaurante não encontrado.</p>
        <Button onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>
    );
  }

  const mainInfoCardData = {
    id: restaurant.id,
    name: restaurant.name,
    logoUrl: restaurant.image_url,
    addressSummary: `${restaurant.city}, ${restaurant.state}`,
    followersCount: restaurant.followers_count || 0,
    isFavorite: restaurant.is_favorite || false,
    isOpen: true,
    statusText: "Aberto",
    plan: restaurant.plan,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative">
        <RestaurantMainInfoCard
          restaurant={mainInfoCardData}
          onFavoriteToggle={() => { /* Lógica de toggle de favorito pode ser adicionada aqui */ }}
          isFavoriteMutating={false} // Ajustar conforme a implementação real de favoritos
          isCompact={false}
        />
      </div>

      <div className="container mx-auto px-4 py-6">
        <Button onClick={() => navigate(-1)} variant="ghost" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Perfil
        </Button>
        <h1 className="text-3xl font-extrabold text-primary mb-6">Cardápio Completo de {restaurant.name}</h1>
        <RestaurantMenu
          menuCategories={restaurant.menu_categories}
          isFullMenuPage={true}
          restaurantId={restaurant.id}
        />
      </div>
    </div>
  );
};

export default FullMenuPage;
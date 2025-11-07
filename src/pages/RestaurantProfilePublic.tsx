import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { RestaurantPageHeader } from '../components/RestaurantPageHeader';

// Define a interface para um restaurante, baseada no esquema do Supabase
interface Restaurant {
  id: string;
  user_id: string;
  name: string;
  description: string;
  image_url: string | null;
  cover_image_url: string | null;
  plan: 'free' | 'basic' | 'premium';
  phone: string | null;
  email: string | null;
  cnpj: string | null;
  category: string | null;
  whatsapp_url: string | null;
  ifood_url: string | null;
  other_url: string | null;
  address: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
  latitude: number | null;
  longitude: number | null;
  opening_hours: any | null;
  created_at: string;
  external_url: string | null;
  followers_override: number | null;
  payment_methods: any | null;
  social_networks: any | null;
  other_url_label: string | null;
  claim_code: string | null;
  visit_status: string | null;
  visit_notes: string | null;
}

interface RestaurantProfilePublicProps {
  initialRestaurantId?: string; // Propriedade opcional para o ID do restaurante
  simulatedPlan?: 'free' | 'basic' | 'premium'; // Propriedade opcional para simular o plano
  isCompact?: boolean; // Propriedade opcional para modo compacto
}

const RestaurantProfilePublic: React.FC<RestaurantProfilePublicProps> = ({
  initialRestaurantId,
  simulatedPlan,
  isCompact = false,
}) => {
  const { id: paramId } = useParams<{ id: string }>();
  const restaurantId = initialRestaurantId || paramId; // Usa o ID da prop se disponível, senão o do parâmetro da URL

  const { data: restaurant, isLoading, error } = useQuery<Restaurant, Error>({
    queryKey: ['restaurant', restaurantId],
    queryFn: async () => {
      if (!restaurantId) throw new Error('Restaurant ID is missing');
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId, // Apenas executa a query se o ID estiver disponível
  });

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Carregando detalhes do restaurante...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center min-h-screen text-red-500">Erro ao carregar restaurante: {error.message}</div>;
  }

  if (!restaurant) {
    return <div className="flex justify-center items-center min-h-screen">Restaurante não encontrado.</div>;
  }

  // Cria um objeto de restaurante para exibição, aplicando o plano simulado se fornecido
  const displayRestaurant = {
    ...restaurant,
    plan: simulatedPlan || restaurant.plan,
  };

  return (
    <div className={`relative min-h-screen bg-background-light ${isCompact ? 'p-0' : ''}`}>
      {/* Seção da Imagem de Capa */}
      {displayRestaurant.cover_image_url && (
        <div
          className={`relative w-full bg-cover bg-center ${isCompact ? 'h-32' : 'h-64 md:h-80 lg:h-96'}`}
          style={{ backgroundImage: `url(${displayRestaurant.cover_image_url})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        </div>
      )}

      {/* Cabeçalho fixo no topo */}
      <RestaurantPageHeader restaurant={displayRestaurant} isCompact={isCompact} />

      {/* Área de conteúdo principal */}
      <div className={`container mx-auto px-4 py-8 ${isCompact ? 'pt-2' : ''}`}>
        <h1 className={`font-bold mb-4 ${isCompact ? 'text-xl' : 'text-3xl'}`}>{displayRestaurant.name}</h1>
        <p className={`text-gray-700 mb-4 ${isCompact ? 'text-sm' : ''}`}>{displayRestaurant.description}</p>
        {/* Adicione mais detalhes do restaurante aqui */}
        <p>Categoria: {displayRestaurant.category}</p>
        <p>Endereço: {displayRestaurant.address}, {displayRestaurant.number}, {displayRestaurant.neighborhood}, {displayRestaurant.city} - {displayRestaurant.state}</p>
        {displayRestaurant.phone && <p>Telefone: {displayRestaurant.phone}</p>}
        {displayRestaurant.whatsapp_url && <p>WhatsApp: <a href={displayRestaurant.whatsapp_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{displayRestaurant.whatsapp_url}</a></p>}
        {/* ... outros detalhes ... */}
      </div>
    </div>
  );
};

export default RestaurantProfilePublic;
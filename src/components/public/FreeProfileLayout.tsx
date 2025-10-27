import React from 'react';
import { Heart, Loader2, Share2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import RestaurantCoverImage from '../restaurant/RestaurantCoverImage';
import RestaurantPublicHeader from '../restaurant/RestaurantPublicHeader';
import MenuSection from './MenuSection';
import AdditionalInfo from './AdditionalInfo';
import { useFavoriteToggle } from '@/hooks/useFavoriteToggle';
import { useAuth } from '@/hooks/useAuth';
import { PublicRestaurantData } from '@/types/restaurant'; // Importando o tipo correto

interface FreeProfileLayoutProps {
  restaurant: PublicRestaurantData; // Usando o tipo estendido
}

const FreeProfileLayout: React.FC<FreeProfileLayoutProps> = ({ restaurant }) => {
  const { isAuthenticated } = useAuth();
  const { isFavorite, toggleFavorite, isMutating } = useFavoriteToggle(restaurant.id);

  // Dados para AdditionalInfo (usando snake_case do PublicRestaurantData)
  const additionalInfoData = {
    address: restaurant.address,
    number: restaurant.number,
    neighborhood: restaurant.neighborhood,
    city: restaurant.city,
    state: restaurant.state,
    cep: restaurant.cep,
    phone: restaurant.phone,
    email: restaurant.email,
    whatsappUrl: restaurant.whatsapp_url, // Usando snake_case
    ifoodUrl: restaurant.ifood_url,       // Usando snake_case
    otherUrl: restaurant.other_url,       // Usando snake_case
    openingHours: restaurant.opening_hours, // Usando snake_case
  };

  return (
    <div className="bg-white dark:bg-gray-900 min-h-screen pb-12 shadow-lg">
      
      {/* Imagem de Capa */}
      <RestaurantCoverImage coverImageUrl={restaurant.cover_image_url} />

      {/* Header (Logo, Nome, Endereço, Ações) */}
      <div className="relative z-10 -mt-12">
        <RestaurantPublicHeader 
          restaurant={{
            id: restaurant.id,
            name: restaurant.name,
            logoUrl: restaurant.logoUrl,
            addressSummary: restaurant.addressSummary,
            isFavorite: isFavorite,
            onFavoriteToggle: isAuthenticated ? toggleFavorite : undefined,
            isMutating: isMutating,
          }}
        />
      </div>

      {/* Descrição */}
      {restaurant.description && (
        <div className="px-4 mt-6">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{restaurant.description}</p>
        </div>
      )}

      {/* Seção de Menu */}
      <MenuSection restaurantId={restaurant.id} />

      {/* Informações Adicionais (Sempre visível) */}
      <AdditionalInfo restaurant={additionalInfoData} />
      
      {/* CTA para Favoritar (Flutuante) */}
      {!isAuthenticated && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-lg z-20 max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Faça login para favoritar este restaurante!</p>
            <Button size="sm" onClick={() => console.log('Redirect to login')}>
              Entrar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FreeProfileLayout;
import React from 'react';
import RestaurantPublicHeader from '../restaurant/RestaurantPublicHeader';
import RestaurantCoverImage from '../restaurant/RestaurantCoverImage';
import MenuSection from './MenuSection';
import AdditionalInfo from './AdditionalInfo';
import GallerySection from './GallerySection';
import { useFavoriteToggle } from '@/hooks/useFavoriteToggle';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { UserPlus, Share2 } from 'lucide-react';

interface PremiumProfileLayoutProps {
  restaurant: {
    id: string;
    name: string;
    logoUrl: string;
    coverImageUrl: string;
    addressSummary: string | null;
    description: string | null;
    followersCount: number;
    // Campos adicionais para AdditionalInfo
    address: string | null;
    number: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    cep: string | null;
    phone: string | null;
    email: string | null;
    whatsappUrl: string | null;
    ifoodUrl: string | null;
    otherUrl: string | null;
    openingHours: any;
  };
}

const PremiumProfileLayout: React.FC<PremiumProfileLayoutProps> = ({ restaurant }) => {
  const { user } = useAuth(); // CORRIGIDO: Usando 'user' em vez de 'session'
  // No modo Premium, o botão de Favoritar é substituído por Seguir/Compartilhar,
  // mas mantemos a estrutura para referência futura se necessário.
  const { isFavorite, toggleFavorite, isMutating } = useFavoriteToggle(restaurant.id);

  // Dados para AdditionalInfo
  const additionalInfoData = {
    address: restaurant.address,
    number: restaurant.number,
    neighborhood: restaurant.neighborhood,
    city: restaurant.city,
    state: restaurant.state,
    cep: restaurant.cep,
    phone: restaurant.phone,
    email: restaurant.email,
    whatsappUrl: restaurant.whatsappUrl,
    ifoodUrl: restaurant.ifoodUrl,
    otherUrl: restaurant.otherUrl,
    openingHours: restaurant.openingHours,
  };

  return (
    <div className="bg-white dark:bg-gray-900 min-h-screen pb-12 shadow-lg">
      
      {/* Imagem de Capa */}
      <RestaurantCoverImage coverImageUrl={restaurant.coverImageUrl} />

      {/* Header (Logo, Nome, Endereço, Ações) */}
      <div className="relative z-10 -mt-12">
        <RestaurantPublicHeader 
          restaurant={{
            id: restaurant.id,
            name: restaurant.name,
            logoUrl: restaurant.logoUrl,
            addressSummary: restaurant.addressSummary,
            // Premium specific props
            followersCount: restaurant.followersCount,
            onFollowToggle: () => console.log('Follow toggled'), // Placeholder
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

      {/* Galeria de Imagens */}
      <GallerySection restaurantId={restaurant.id} />

      {/* Informações Adicionais (Endereço, Contato, Horário) */}
      <AdditionalInfo restaurant={additionalInfoData} />
      
    </div>
  );
};

export default PremiumProfileLayout;
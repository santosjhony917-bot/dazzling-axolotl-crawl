import React from 'react';
import { Restaurant } from '@/types/supabase';
import RestaurantCoverImage from './RestaurantCoverImage';
import RestaurantLogo from './RestaurantLogo';
import RestaurantInfoCard from './RestaurantInfoCard';
import RestaurantMenuSection from './RestaurantMenuSection';
import RestaurantGallerySection from './RestaurantGallerySection';
import RestaurantContactSection from './RestaurantContactSection';
import { Separator } from '@/components/ui/separator';
import { MapPin, Clock, Phone, Menu, Image, Heart } from 'lucide-react';
import { formatScheduleForDisplay } from '@/utils/schedule';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { WeekSchedule } from '@/types/schedule';
import RestaurantPublicHeader from '../restaurant/RestaurantPublicHeader'; // Importando o header público
import { useRestaurantFavorite } from '@/hooks/useRestaurantFavorite'; // Importando useRestaurantFavorite
import AdditionalInfo from './AdditionalInfo'; // Importando o componente de informações adicionais
import { PublicRestaurantData } from '@/types/restaurant'; // Importando o tipo correto

interface FreeProfileLayoutProps {
  restaurant: PublicRestaurantData; // Alterado para PublicRestaurantData
}

const FreeProfileLayout: React.FC<FreeProfileLayoutProps> = ({ restaurant }) => {
  // Usando o hook específico para este restaurante
  const { isFavorite, toggleFavorite, isLoading: isMutating } = useRestaurantFavorite(restaurant.id);
  
  // Usando o cast para WeekSchedule
  const scheduleDisplay = formatScheduleForDisplay(restaurant.opening_hours as unknown as WeekSchedule);

  const fullAddress = [restaurant.address, restaurant.number, restaurant.neighborhood, restaurant.city, restaurant.state, restaurant.cep]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="bg-white dark:bg-gray-900 min-h-screen pb-20 shadow-lg">
      
      {/* Imagem de Capa */}
      <RestaurantCoverImage coverImageUrl={restaurant.cover_image_url} />

      <div className="relative -mt-16 px-4 sm:px-6 lg:px-8">
        
        {/* Logo e Header Público */}
        <RestaurantPublicHeader 
          restaurant={{
            id: restaurant.id,
            name: restaurant.name,
            logoUrl: restaurant.image_url,
            addressSummary: restaurant.addressSummary, // Usando o campo computado
            isFavorite: isFavorite,
            onFavoriteToggle: toggleFavorite,
            isMutating: isMutating,
          }}
        />

        {/* Descrição */}
        {restaurant.description && (
          <p className="text-gray-700 dark:text-gray-300 mt-4">{restaurant.description}</p>
        )}

        <Separator className="my-6" />

        {/* Navegação Rápida (Anchors) */}
        <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide">
          <Link to="#menu" className="flex items-center text-sm font-medium text-primary hover:text-primary/80">
            <Menu className="w-4 h-4 mr-1" /> Cardápio
          </Link>
          <Link to="#info" className="flex items-center text-sm font-medium text-primary hover:text-primary/80">
            <MapPin className="w-4 h-4 mr-1" /> Informações
          </Link>
          <Link to="#gallery" className="flex items-center text-sm font-medium text-primary hover:text-primary/80">
            <Image className="w-4 h-4 mr-1" /> Galeria
          </Link>
        </div>

        <Separator className="my-6" />

        {/* Seções de Informação */}
        <div className="space-y-8">
          
          {/* 1. Menu */}
          <RestaurantMenuSection 
            id="menu"
            restaurantId={restaurant.id}
            isPremium={false}
          />

          {/* 2. Informações Adicionais (Endereço, Contato, Horários) */}
          <AdditionalInfo 
            restaurant={{
              address: restaurant.address,
              number: restaurant.number,
              neighborhood: restaurant.neighborhood,
              city: restaurant.city,
              state: restaurant.state,
              cep: restaurant.cep,
              phone: restaurant.phone,
              email: restaurant.email,
              whatsappUrl: restaurant.whatsapp_url,
              ifoodUrl: restaurant.ifood_url,
              otherUrl: restaurant.other_url,
              openingHours: restaurant.opening_hours,
            }}
          />

          {/* 3. Galeria */}
          <RestaurantGallerySection 
            id="gallery"
            restaurantId={restaurant.id}
            isPremium={false}
          />
        </div>
      </div>
    </div>
  );
};

export default FreeProfileLayout;
import React from 'react';
import { PublicRestaurantData } from '@/types/restaurant';
import { WeekSchedule } from '@/types/schedule'; // Import WeekSchedule from schedule.ts
import RestaurantCoverImage from '@/components/public/RestaurantCoverImage';
import RestaurantPublicHeader from '@/components/public/RestaurantHeader'; // CORRIGIDO: Importando o nome correto
import RestaurantMenu from '@/components/public/RestaurantMenu';
import RestaurantInfo from '@/components/public/RestaurantInfo';
import RestaurantGallery from '@/components/public/RestaurantGallery';
import { useRestaurantFavorite } from '@/hooks/useRestaurantFavorite';
import { formatScheduleForDisplay } from '@/utils/schedule';
import { Separator } from '@/components/ui/separator';

interface FreeProfileLayoutProps {
  restaurant: PublicRestaurantData;
}

const FreeProfileLayout: React.FC<FreeProfileLayoutProps> = ({ restaurant }) => {
  // Usando o hook específico para este restaurante
  const { isFavorite, toggleFavorite, isLoading: isMutating } = useRestaurantFavorite(restaurant.id);

  // Usando o cast para WeekSchedule do types/schedule.ts
  const scheduleDisplay = formatScheduleForDisplay(restaurant.opening_hours as unknown as WeekSchedule);

  // Construindo o endereço completo para o componente RestaurantInfo
  const fullAddress = [restaurant.address, restaurant.number, restaurant.neighborhood, restaurant.city, restaurant.state, restaurant.cep]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Imagem de Capa */}
      <RestaurantCoverImage coverImageUrl={restaurant.cover_image_url} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
        {/* Header (Logo, Nome, Favorito) */}
        <RestaurantPublicHeader // CORRIGIDO: Usando o nome correto
          restaurant={{
            id: restaurant.id,
            name: restaurant.name,
            logoUrl: restaurant.image_url,
            addressSummary: restaurant.addressSummary, // Usando o campo computado
            isFavorite: isFavorite,
            followersCount: restaurant.followers_count, // Usando followers_count
            isMutating: isMutating, // Passando isMutating
          }}
          toggleFavorite={toggleFavorite} // CORRIGIDO: Passando a função de toggle
        />

        {/* Descrição */}
        {restaurant.description && (
          <p className="text-gray-700 dark:text-gray-300 mt-4">{restaurant.description}</p>
        )}

        <Separator className="my-6" />

        {/* Menu */}
        <RestaurantMenu
          id="menu"
          restaurantId={restaurant.id}
          isPremium={false}
          menuCategories={restaurant.menu_categories || []} {/* CORREÇÃO APLICADA AQUI */}
        />

        <Separator className="my-6" />

        {/* Informações de Contato e Horário */}
        <RestaurantInfo
          id="info"
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
          scheduleDisplay={scheduleDisplay}
          fullAddress={fullAddress}
        />

        <Separator className="my-6" />

        {/* Galeria */}
        <RestaurantGallery
          id="gallery"
          restaurantId={restaurant.id}
          plan={restaurant.plan} // Passando o plano
          galleryImages={restaurant.gallery_images || []} {/* CORREÇÃO APLICADA AQUI */}
        />

        <div className="h-12"></div>
      </div>
    </div>
  );
};

export default FreeProfileLayout;
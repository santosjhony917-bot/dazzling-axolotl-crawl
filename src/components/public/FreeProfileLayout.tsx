import React from 'react';
import { PublicRestaurantData } from '@/types/restaurant';
import RestaurantHeader from './RestaurantProfileHeader';
import RestaurantInfo from './RestaurantInfo';
import MenuSection from './MenuSection';
import RestaurantGallery from './RestaurantGallery';
import OrderChannelsSection from './OrderChannelsSection';
import { Separator } from '@/components/ui/separator';
import { MapPin } from 'lucide-react';

interface FreeProfileLayoutProps {
  restaurant: PublicRestaurantData;
  menuCategories: {
    id: string;
    name: string;
    order_index: number;
    menu_items: {
      id: string;
      name: string;
      description: string | null;
      price: number;
      image_url: string | null;
      order_index: number;
    }[];
  }[];
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

const FreeProfileLayout: React.FC<FreeProfileLayoutProps> = ({
  restaurant,
  menuCategories,
  isFavorite,
  onToggleFavorite,
}) => {
  const { name, description, address, number, neighborhood, city, state, cep, latitude, longitude } = restaurant;

  const fullAddress = [address, number, neighborhood, city, state, cep].filter(Boolean).join(', ');

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Header (Cover and Logo) */}
      <RestaurantHeader 
        restaurant={restaurant} 
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
      />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 -mt-16 pb-12">
        <div className="max-w-3xl mx-auto">
          
          {/* Restaurant Details Card */}
          <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{name}</h1>
            
            {description && (
              <p className="text-gray-600 mb-4">{description}</p>
            )}

            {/* Address */}
            {fullAddress && (
              <div className="flex items-start text-sm text-gray-500 mt-4">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5 mr-2" />
                <p>{fullAddress}</p>
              </div>
            )}
          </div>

          <div className="space-y-8">
            
            {/* Canais de Pedido */}
            <OrderChannelsSection id="order-channels" restaurant={restaurant} />

            {/* Menu */}
            <MenuSection 
              id="menu" 
              menuCategories={menuCategories} 
              restaurantId={restaurant.id}
            />

            {/* Galeria de Imagens */}
            <RestaurantGallery id="gallery" restaurantId={restaurant.id} />

            {/* Contato e Links */}
            <RestaurantInfo id="contact" restaurant={restaurant} />
            
          </div>
        </div>
      </main>
    </div>
  );
};

export default FreeProfileLayout;
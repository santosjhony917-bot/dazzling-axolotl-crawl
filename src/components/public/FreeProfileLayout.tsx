import React, { useMemo } from 'react';
import { MapPin, Clock, Utensils, MessageSquare, ShoppingCart, Globe, Heart, Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn, formatPrice } from '@/lib/utils';
import { Restaurant, MenuItem, MenuCategoryWithItems } from '@/types/supabase';
import RestaurantPublicHeader from '@/components/restaurant/RestaurantPublicHeader';
import DetailedHoursDisplay from './DetailedHoursDisplay';
import AdditionalInfo from './AdditionalInfo';
import { WeekSchedule } from '@/types/schedule';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuthContext } from '@/context/AuthContext';
import { showInfo } from '@/utils/toast';
import { useRestaurantMenu } from '@/hooks/useRestaurantMenu';
import { usePublicGallery } from '@/hooks/usePublicGallery';
import PhotoGalleryDisplay from '@/components/PhotoGalleryDisplay'; // Importando o componente de galeria

interface FreeProfileLayoutProps {
  restaurant: Restaurant;
}

// Componente de Card de Item de Menu
const FreeMenuItemCard: React.FC<{ item: MenuItem }> = ({ item }) => {
  return (
    <div className="flex gap-4 p-4 border-b last:border-b-0 dark:border-gray-700">
      <div className="flex-grow">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{item.name}</h3>
        {item.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.description}</p>
        )}
        <p className="text-base font-bold text-highlight dark:text-highlight-light mt-2">
          {formatPrice(item.price)}
        </p>
      </div>
      {item.image_url && (
        <img 
          src={item.image_url} 
          alt={item.name} 
          className="w-20 h-20 object-cover rounded-lg flex-shrink-0 shadow-soft-sm"
        />
      )}
    </div>
  );
};

// Componente de Menu Completo
const FreeFullMenuDisplay: React.FC<{ menu: MenuCategoryWithItems[], loading: boolean }> = ({ menu, loading }) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!menu || menu.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500 dark:text-gray-400">
        Nenhum item de menu encontrado.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {menu.map((category) => (
        <section key={category.id} className="scroll-mt-20" id={`category-${category.id}`}>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 sticky top-0 bg-white dark:bg-gray-900 py-2 z-10 border-b dark:border-gray-700">
            {category.name}
          </h2>
          <Card className={cn(
            "bg-white dark:bg-gray-800 shadow-soft-lg",
            category.items.length > 0 ? "divide-y divide-gray-100 dark:divide-gray-700" : ""
          )}>
            {category.items.length > 0 ? (
              category.items.map((item) => (
                <FreeMenuItemCard key={item.id} item={item} />
              ))
            ) : (
              <p className="p-4 text-gray-500 dark:text-gray-400 italic">Nenhum item nesta categoria.</p>
            )}
          </Card>
        </section>
      ))}
    </div>
  );
};

// Componente de Canais de Pedido
const OrderChannels: React.FC<{ restaurant: Restaurant }> = ({ restaurant }) => {
  const typedRestaurant = restaurant as unknown as { whatsapp_url: string | null, ifood_url: string | null, other_url: string | null } & Restaurant;
  
  const channels = useMemo(() => [
    { icon: MessageSquare, label: "WhatsApp", url: typedRestaurant.whatsapp_url },
    { icon: ShoppingCart, label: "iFood", url: typedRestaurant.ifood_url },
    { icon: Globe, label: "Outro Link", url: typedRestaurant.other_url },
  ].filter(c => c.url), [typedRestaurant]);

  if (channels.length === 0) return null;

  return (
    <div className="mt-6">
      <h2 className="text-lg font-bold text-primary mb-4">Peça agora</h2>
      <div className="grid grid-cols-3 gap-4">
        {channels.map((channel, index) => {
          const Icon = channel.icon;
          return (
            <a 
              key={index} 
              href={channel.url || '#'} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 rounded-xl bg-white p-4 shadow-soft-md border border-gray-200 cursor-pointer hover:shadow-soft-lg transition-shadow"
            >
              <Icon className="w-7 h-7 text-highlight" />
              <p className="text-xs font-semibold text-gray-700">{channel.label}</p>
            </a>
          );
        })}
      </div>
    </div>
  );
};


// Componente principal do layout Free
const FreeProfileLayout: React.FC<FreeProfileLayoutProps> = ({ restaurant }) => {
  const { isFavorite, toggleFavorite, isLoading: isMutating } = useFavorites(restaurant.id);
  const { user } = useAuthContext();
  const { menu, menuLoading } = useRestaurantMenu(restaurant.id);
  const { gallery, isLoading: galleryLoading } = usePublicGallery(restaurant.id); // Usando hook da galeria

  const handleToggleFavorite = () => {
    if (!user) {
      showInfo("Faça login para favoritar restaurantes!");
      return;
    }
    toggleFavorite();
  };

  const headerData = {
    id: restaurant.id,
    name: restaurant.name,
    logoUrl: restaurant.image_url || PLACEHOLDER_IMAGE_URL,
    isFavorite: isFavorite,
    onFavoriteToggle: handleToggleFavorite,
    isMutating: isMutating,
  };

  return (
    <div className="relative w-full bg-[#f5f7f8] min-h-screen">
      
      {/* Capa e Header Flutuante */}
      <div className="relative w-full">
        {/* Capa */}
        <div className="relative w-full h-48 bg-gray-300 dark:bg-gray-700">
          {restaurant.cover_image_url ? (
            <img className="w-full h-full object-cover" alt={`Capa de ${restaurant.name}`} src={restaurant.cover_image_url} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">Sem Capa</div>
          )}
          {/* Overlay Degradê Suave */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        </div>
        
        {/* Header Flutuante (Logo, Nome, Botões) */}
        <div className="absolute -bottom-16 left-0 right-0 z-10 bg-white dark:bg-gray-800 rounded-t-2xl shadow-soft-xl pt-4">
          <RestaurantPublicHeader restaurant={headerData} />
        </div>
      </div>
      
      {/* Conteúdo Principal (Abaixo do Header Flutuante) */}
      <div className="pt-20 px-4 pb-20 space-y-6">
        
        {/* Informações Adicionais (Sempre visível) */}
        <AdditionalInfo restaurant={restaurant} />
        
        {/* Horários Detalhados (Se houver) */}
        {restaurant.opening_hours && (
          <DetailedHoursDisplay schedule={restaurant.opening_hours as unknown as WeekSchedule} />
        )}
        
        {/* Descrição do Restaurante */}
        {restaurant.description && (
          <Card className="p-4 shadow-soft-md">
            <h3 className="text-lg font-bold text-primary mb-2">Sobre {restaurant.name}</h3>
            <p className="text-gray-700 whitespace-pre-wrap text-sm">{restaurant.description}</p>
          </Card>
        )}
        
        {/* Galeria de Fotos (Adicionado ao layout Free) */}
        <PhotoGalleryDisplay 
          gallery={gallery} 
          restaurantName={restaurant.name} 
          isLoading={galleryLoading} 
        />

        {/* Canais de Pedido */}
        <OrderChannels restaurant={restaurant} />
        
        {/* Menu */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-primary mb-4">Cardápio</h2>
          <FreeFullMenuDisplay menu={menu} loading={menuLoading} />
        </div>
        
      </div>
    </div>
  );
};

export default FreeProfileLayout;
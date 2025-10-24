import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Utensils, Loader2, Phone, MessageSquare, ExternalLink, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useRestaurantById } from '@/hooks/useRestaurantById';
import { useMenuCategories } from '@/hooks/useMenuCategories';
import { useMenuItems } from '@/hooks/useMenuItems';
import { MenuCategory } from '@/types/menu';
import { cn } from '@/lib/utils';

// Componente para renderizar um item do menu
interface MenuItemCardProps {
  item: {
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
  };
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ item }) => (
  <Card className="flex p-3 shadow-sm hover:shadow-md transition-shadow bg-white">
    <div className="flex-grow pr-3">
      <h4 className="font-semibold text-lg text-[#022D68]">{item.name}</h4>
      {item.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>}
      <p className="text-lg font-bold text-[#E47948] mt-2">R$ {item.price.toFixed(2).replace('.', ',')}</p>
    </div>
    {item.image_url && (
      <img 
        src={item.image_url} 
        alt={item.name} 
        className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
      />
    )}
  </Card>
);

const RestaurantProfileMenu: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();

  const { restaurant, isLoading: isRestaurantLoading, error: restaurantError } = useRestaurantById(restaurantId);
  const { categories, isLoading: isCategoriesLoading } = useMenuCategories(restaurantId);
  const { items, isLoading: isItemsLoading } = useMenuItems(categories.map(c => c.id));

  const isLoading = isRestaurantLoading || isCategoriesLoading || isItemsLoading;

  const groupedItems = useMemo(() => {
    const groups: Record<string, typeof items> = {};
    items.forEach(item => {
      if (!groups[item.category_id]) {
        groups[item.category_id] = [];
      }
      groups[item.category_id].push(item);
    });
    return groups;
  }, [items]);

  const handleGoBack = () => {
    navigate(-1);
  };

  if (isLoading) {
    return (
      <div className="p-4 max-w-md mx-auto space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (restaurantError || !restaurant) {
    return (
      <div className="p-4 text-center max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Erro</h1>
        <p className="text-gray-600">Restaurante não encontrado ou ID inválido.</p>
        <Button onClick={handleGoBack} className="mt-4 bg-[#022D68] hover:bg-[#022D68]/90">
          Voltar
        </Button>
      </div>
    );
  }

  // Helper function to create external links safely
  const createExternalLink = (url: string | null) => {
    if (!url) return null;
    // Ensure URL has protocol for external links
    return url.startsWith('http') ? url : `https://${url}`;
  };

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      {/* Header/Cover Image */}
      <div className="relative h-64 bg-gray-300">
        {restaurant.cover_image_url ? (
          <img 
            src={restaurant.cover_image_url} 
            alt={`Capa de ${restaurant.name}`} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#022D68]/10">
            <Utensils className="w-12 h-12 text-[#022D68]/50" />
          </div>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleGoBack} 
          className="absolute top-4 left-4 bg-white/80 hover:bg-white rounded-full"
        >
          <ArrowLeft className="h-6 w-6 text-[#022D68]" />
        </Button>
      </div>

      <main className="p-4 space-y-6">
        {/* Restaurant Info Card */}
        <Card className="p-4 -mt-16 relative bg-white shadow-lg rounded-xl">
          <h1 className="text-3xl font-extrabold text-[#022D68]">{restaurant.name}</h1>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
            <MapPin className="w-4 h-4 text-[#E47948]" />
            {restaurant.address}
          </p>
          <p className="text-sm text-gray-600 mt-2">{restaurant.description}</p>
          
          <Separator className="my-4" />

          {/* Contact Links */}
          <div className="flex flex-wrap gap-3 justify-center">
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone}`} className="flex items-center gap-1 text-sm text-[#022D68] hover:text-[#E47948] transition-colors">
                <Phone className="w-4 h-4" /> Ligar
              </a>
            )}
            {restaurant.whatsapp_url && (
              <a href={createExternalLink(restaurant.whatsapp_url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-[#022D68] hover:text-[#E47948] transition-colors">
                <MessageSquare className="w-4 h-4" /> WhatsApp
              </a>
            )}
            {restaurant.ifood_url && (
              <a href={createExternalLink(restaurant.ifood_url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-[#022D68] hover:text-[#E47948] transition-colors">
                <ShoppingBag className="w-4 h-4" /> iFood
              </a>
            )}
            {restaurant.other_url && (
              <a href={createExternalLink(restaurant.other_url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-[#022D68] hover:text-[#E47948] transition-colors">
                <ExternalLink className="w-4 h-4" /> Outro Link
              </a>
            )}
          </div>
        </Card>

        {/* Menu Sections */}
        <h2 className="text-2xl font-bold text-[#022D68] pt-4">Nosso Menu</h2>
        
        {categories.length === 0 && (
          <p className="text-center text-gray-500">Nenhum item de menu disponível no momento.</p>
        )}

        {categories.map((category: MenuCategory) => (
          <section key={category.id} className="space-y-3">
            <h3 className="text-xl font-extrabold text-[#E47948] border-b-2 border-[#E47948]/50 pb-1">
              {category.name}
            </h3>
            <div className="space-y-4">
              {groupedItems[category.id]?.map(item => (
                <MenuItemCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        ))}
      </main>

      {/* Fixed Bottom Navigation/Action Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 max-w-md mx-auto">
        <Button
          onClick={() => navigate(`/restaurant-profile/${restaurant.id}`)}
          className={cn(
            "w-full flex items-center justify-center gap-2 min-w-[84px] cursor-pointer overflow-hidden rounded-full h-12 px-4",
            "bg-[#E47948] text-white text-base font-bold leading-normal tracking-[0.015em]",
            "shadow-lg shadow-[#E47948]/40 hover:bg-[#E47948]/90"
          )}
        >
          Ver Perfil Completo
        </Button>
      </div>
    </div>
  );
};

export default RestaurantProfileMenu;
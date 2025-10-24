import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePublicRestaurantProfile } from '@/hooks/usePublicRestaurantProfile';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils/url';
import PublicRestaurantLayout from '@/components/PublicRestaurantLayout';
import { MapPin, Clock, Phone, Utensils, Crown, Check, Mail, FileText, Store, Building2, MessageSquare, Star } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WeekSchedule } from '@/types/schedule';
import { Restaurant } from '@/types/restaurant';
import { MenuCategory, MenuItem } from '@/types/menu';

// Mock Schedule (Fallback)
const mockSchedule: WeekSchedule = {
  monday: { isOpen: true, slots: [{ start: '09:00', end: '22:00' }] },
  tuesday: { isOpen: true, slots: [{ start: '09:00', end: '22:00' }] },
  wednesday: { isOpen: true, slots: [{ start: '09:00', end: '22:00' }] },
  thursday: { isOpen: true, slots: [{ start: '09:00', end: '22:00' }] },
  friday: { isOpen: true, slots: [{ start: '09:00', end: '23:00' }] },
  saturday: { isOpen: true, slots: [{ start: '11:00', end: '23:00' }] },
  sunday: { isOpen: false, slots: [] },
};

const formatScheduleSummary = (schedule: WeekSchedule): string | null => {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as (keyof WeekSchedule)[];
  const openDays = days.filter(day => schedule[day]?.isOpen);
  if (openDays.length === 0) return "Fechado";
  const firstSlot = schedule[openDays[0]].slots[0];
  if (!firstSlot) return "Horários definidos";
  return `${firstSlot.start} - ${firstSlot.end}`;
};

interface RestaurantProfilePublicProps {
  restaurant: Restaurant;
  menuCategories: (MenuCategory & { items: MenuItem[] })[];
}

const RestaurantProfileContent: React.FC<RestaurantProfilePublicProps> = ({ restaurant, menuCategories }) => {
  const navigate = useNavigate();
  const isPremium = restaurant.plan !== 'free';
  const currentSchedule = restaurant.opening_hours || mockSchedule;
  const scheduleSummary = formatScheduleSummary(currentSchedule);

  return (
    <div className="w-full space-y-4">
      
      {/* 1. Topo do Perfil (Capa e Logo) */}
      <div className="relative w-full h-56 bg-gray-300 dark:bg-gray-700">
        {restaurant.cover_image_url && (
            <img
                src={restaurant.cover_image_url}
                alt="Capa do Restaurante"
                className="w-full h-full object-cover"
            />
        )}
        
        {/* Card Principal Flutuante */}
        <Card className="absolute -bottom-12 left-4 right-4 shadow-xl border-none rounded-xl p-4 bg-white dark:bg-gray-800">
          <div className="flex items-start gap-4">
            {/* Logo */}
            <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden border-4 border-white dark:border-gray-800 flex-shrink-0">
              {restaurant.image_url ? (
                <img src={restaurant.image_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Store className="w-10 h-10 text-gray-500" />
              )}
            </div>
            
            {/* Info e Plano */}
            <div className="flex-1 pt-1">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-2xl text-[#022D68] leading-tight">
                    {restaurant.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{restaurant.category || "Estabelecimento Comercial"}</p>
                </div>
                <Badge 
                  variant="outline" 
                  className="text-xs font-semibold border-gray-400 text-gray-600 bg-white rounded-full px-3 py-1 mt-1 flex-shrink-0"
                >
                  Plano {isPremium ? "Premium" : "Free"}
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Botões de Ação */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex gap-2">
            <Button 
              onClick={() => navigate(createPageUrl(`public-menu/${restaurant.id}`))}
              className="flex-1 flex items-center justify-center gap-2 min-w-[84px] cursor-pointer overflow-hidden rounded-full h-12 px-4 bg-highlight text-white text-base font-bold leading-normal tracking-[0.015em] shadow-lg shadow-highlight/40 hover:bg-highlight/90"
            >
              <Utensils className="w-5 h-5" />
              Ver Cardápio
            </Button>
            <Button 
              variant="outline"
              className="w-12 h-12 rounded-full border-2 border-gray-300 text-gray-600 hover:bg-gray-100"
              onClick={() => alert('Favoritar em breve!')}
            >
              <Star className="w-5 h-5" />
            </Button>
          </div>
        </Card>
      </div>
      
      {/* Espaçamento para o Card Flutuante */}
      <div className="h-20"></div> 

      {/* 2. Detalhes do Estabelecimento (Card) */}
      <div className="px-4">
        <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-none p-4 space-y-4">
          <h3 className="text-primary dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Detalhes</h3>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            
            {/* Endereço */}
            <div className="py-3 flex items-center gap-4">
              <MapPin className="w-5 h-5 text-highlight flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{restaurant.address}, {restaurant.number} - {restaurant.neighborhood}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{restaurant.city} - {restaurant.state}</p>
              </div>
            </div>

            {/* Horários */}
            <div className="py-3 flex items-center gap-4">
              <Clock className="w-5 h-5 text-highlight flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Horário de Funcionamento</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{scheduleSummary}</p>
              </div>
            </div>

            {/* Contato */}
            {restaurant.phone && (
              <div className="py-3 flex items-center gap-4">
                <Phone className="w-5 h-5 text-highlight flex-shrink-0" />
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{restaurant.phone}</p>
              </div>
            )}
            
            {/* Canais de Pedido (Premium Feature Display) */}
            {isPremium && (restaurant.whatsapp_url || restaurant.ifood_url) && (
              <div className="py-3 space-y-2">
                <h4 className="text-sm font-semibold text-primary dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Canais de Pedido
                </h4>
                <div className="flex gap-3">
                  {restaurant.whatsapp_url && (
                    <a href={restaurant.whatsapp_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="h-10 px-4 border-green-500 text-green-600 hover:bg-green-50/50">WhatsApp</Button>
                    </a>
                  )}
                  {restaurant.ifood_url && (
                    <a href={restaurant.ifood_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="h-10 px-4 border-red-500 text-red-600 hover:bg-red-50/50">iFood</Button>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 3. Descrição (Card) */}
      {restaurant.description && (
        <div className="px-4">
          <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-none p-4 space-y-2">
            <h3 className="text-primary dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Sobre</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{restaurant.description}</p>
          </Card>
        </div>
      )}
      
      {/* 4. Menu Preview (Card) - Only show if categories exist */}
      {menuCategories.length > 0 && (
        <div className="px-4">
          <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-none p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-primary dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Destaques do Cardápio</h3>
              <Button 
                variant="link" 
                onClick={() => navigate(createPageUrl(`public-menu/${restaurant.id}`))}
                className="text-highlight p-0 h-auto text-sm font-semibold"
              >
                Ver Cardápio Completo
              </Button>
            </div>
            
            {/* Display first few items from the first category */}
            {menuCategories[0].items.slice(0, 3).map(item => (
              <div key={item.id} className="flex justify-between items-center border-b pb-2 last:border-b-0">
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{item.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{item.description}</p>
                </div>
                <p className="font-semibold text-highlight">R$ {item.price.toFixed(2).replace('.', ',')}</p>
              </div>
            ))}
            
          </Card>
        </div>
      )}
      
    </div>
  );
};


const RestaurantProfilePublic: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();
  
  const { data: profileData, isLoading, error } = usePublicRestaurantProfile(restaurantId);

  if (!restaurantId) {
    return (
      <PublicRestaurantLayout restaurant={null} title="Perfil">
        <div className="p-4 text-center text-red-500">ID do Restaurante não fornecido.</div>
      </PublicRestaurantLayout>
    );
  }

  if (isLoading) {
    return (
      <PublicRestaurantLayout restaurant={null} title="Perfil">
        <div className="p-4 space-y-6">
          <Skeleton className="h-40 w-full rounded-xl mb-6" />
          <Skeleton className="h-6 w-3/4 mb-4" />
          <Skeleton className="h-64 w-full rounded-xl mb-6" />
        </div>
      </PublicRestaurantLayout>
    );
  }

  if (error) {
    return (
      <PublicRestaurantLayout restaurant={null} title="Perfil">
        <div className="p-4 text-center text-red-500">Erro ao carregar o perfil.</div>
      </PublicRestaurantLayout>
    );
  }

  if (!profileData || !profileData.restaurant) {
    return (
      <PublicRestaurantLayout restaurant={null} title="Perfil">
        <div className="p-4 text-center text-gray-600">Restaurante não encontrado.</div>
      </PublicRestaurantLayout>
    );
  }
  
  const { restaurant, categories } = profileData;

  return (
    <PublicRestaurantLayout restaurant={restaurant} title={restaurant.name} backPath="home">
      <RestaurantProfileContent 
        restaurant={restaurant} 
        menuCategories={categories}
      />
    </PublicRestaurantLayout>
  );
};

export default RestaurantProfilePublic;
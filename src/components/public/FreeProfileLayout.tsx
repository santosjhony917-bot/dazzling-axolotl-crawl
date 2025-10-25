import React, { useMemo } from 'react';
import { MapPin, Clock, Utensils, MessageSquare, ShoppingCart, Globe, Heart, Lock, Share2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Restaurant } from '@/types/supabase';
import RestaurantPublicHeader from '@/components/restaurant/RestaurantPublicHeader';
import DetailedHoursDisplay from './DetailedHoursDisplay';
import { WeekSchedule } from '@/types/schedule';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuthContext } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { showError, showInfo } from '@/utils/toast';

interface FreeProfileLayoutProps {
  restaurant: Restaurant;
}

// Componente de Canais de Pedido
const OrderChannels: React.FC<{ restaurant: Restaurant }> = ({ restaurant }) => {
  const channels = useMemo(() => [
    { icon: MessageSquare, label: "WhatsApp", url: restaurant.whatsapp_url },
    { icon: ShoppingCart, label: "iFood", url: restaurant.ifood_url },
    { icon: Globe, label: "Outro Link", url: restaurant.other_url },
  ].filter(c => c.url), [restaurant]);

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
              className="flex flex-col items-center gap-2 rounded-xl bg-white p-4 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
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

const FreeProfileLayout: React.FC<FreeProfileLayoutProps> = ({ restaurant }) => {
  const { user } = useAuthContext(); // FIX 1: Usando 'user'
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite, isLoading: isFavoriteLoading } = useFavorites(restaurant.id); // FIX 2: useFavorites agora aceita restaurant.id

  const handleFollowToggle = () => {
    if (!user) { // Verificação contra 'user'
      showInfo("Faça login para favoritar este restaurante.");
      navigate(createPageUrl('login'));
      return;
    }
    toggleFavorite(); // FIX 3: toggleFavorite agora não aceita argumentos
  };

  const headerData = {
    id: restaurant.id,
    name: restaurant.name,
    followersCount: 0, // Mocked for free
    logoUrl: restaurant.image_url || PLACEHOLDER_IMAGE_URL,
    onFollowToggle: handleFollowToggle,
    isFavorite: isFavorite,
    isFavoriteLoading: isFavoriteLoading,
  };

  const address = restaurant.address && restaurant.number ? `${restaurant.address}, ${restaurant.number} - ${restaurant.neighborhood}, ${restaurant.city} - ${restaurant.state}` : null;

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
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
        </div>
        
        {/* Header Flutuante (Logo, Nome, Botões) */}
        <div className="absolute -bottom-16 left-0 right-0 z-10 bg-white dark:bg-gray-800 rounded-t-3xl shadow-xl pt-4">
          <RestaurantPublicHeader restaurant={headerData} />
        </div>
      </div>
      
      {/* Conteúdo Principal (Abaixo do Header Flutuante) */}
      <div className="pt-20 px-4 pb-20 space-y-6">
        
        {/* Canais de Pedido */}
        <OrderChannels restaurant={restaurant} />

        {/* Informações Básicas */}
        <Card className="p-4 shadow-sm border-none">
          <h2 className="text-lg font-bold text-primary mb-3">Informações</h2>
          
          {/* Endereço */}
          {address && (
            <div className="flex items-start gap-3 mb-3">
              <MapPin className="w-5 h-5 text-primary pt-1 shrink-0" />
              <p className="text-sm text-gray-700">{address}</p>
            </div>
          )}
          
          {/* Horário */}
          {restaurant.opening_hours && (
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-primary pt-1 shrink-0" />
              <p className="text-sm text-gray-700">
                Horário de Funcionamento: <span className="font-semibold text-green-600">Aberto agora</span>
              </p>
            </div>
          )}
        </Card>
        
        {/* Descrição do Restaurante */}
        {restaurant.description && (
          <Card className="p-4 shadow-sm border-none">
            <h3 className="text-lg font-bold text-primary mb-2">Sobre {restaurant.name}</h3>
            <p className="text-gray-700 whitespace-pre-wrap text-sm">{restaurant.description}</p>
          </Card>
        )}

        {/* Cardápio (Apenas link) */}
        <Card className="p-0 shadow-sm border-none overflow-hidden">
          <div className="p-4 flex justify-between items-center text-primary font-semibold">
            <span className="flex items-center gap-2 text-sm">
              <Utensils className="w-4 h-4" /> Cardápio
            </span>
            <span className="text-xs text-gray-500">Ver itens principais</span>
          </div>
          <div className="p-4 border-t border-gray-100 flex justify-between items-center text-highlight dark:text-highlight font-semibold cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50" onClick={() => showError("Recurso Premium")}>
            <span className="flex items-center gap-2 text-sm">
              <Lock className="w-4 h-4" /> Premium: Cardápio Completo
            </span>
            <span className="text-xs text-gray-500">Saiba mais</span>
          </div>
        </Card>

        {/* Horários Detalhados (Se houver) */}
        {restaurant.opening_hours && (
          <DetailedHoursDisplay schedule={restaurant.opening_hours as WeekSchedule} />
        )}
        
      </div>
    </div>
  );
};

export default FreeProfileLayout;
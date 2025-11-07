"use client";

import React from 'react';
import { Heart, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RestaurantLogo from './RestaurantLogo';
import { cn } from '@/lib/utils';
import { PublicRestaurantData, RestaurantPlan } from '@/types'; // Importar PublicRestaurantData e RestaurantPlan

interface RestaurantMainInfoCardProps {
  restaurant: {
    id: string;
    image_url: string | null; // logoUrl
    name: string;
    city: string | null;
    state: string | null;
    followers_count: number;
    is_favorite: boolean;
    plan: RestaurantPlan;
    category: string | null;
    description: string | null;
    whatsapp_url: string | null;
    ifood_url: string | null;
    other_url: string | null;
    other_url_label: string | null;
    opening_hours: PublicRestaurantData['opening_hours']; // Usar o tipo de PublicRestaurantData
  };
  onFavoriteToggle: () => void;
  isFavoriteMutating: boolean;
  isCompact: boolean;
}

const RestaurantMainInfoCard: React.FC<RestaurantMainInfoCardProps> = ({
  restaurant,
  onFavoriteToggle,
  isFavoriteMutating,
  isCompact,
}) => {
  const isPremium = restaurant.plan === 'premium';
  const h1SizeClass = isCompact ? "text-2xl" : "text-3xl";

  // Lógica para determinar se o restaurante está aberto e o texto de status
  const getOpeningStatus = () => {
    if (!restaurant.opening_hours || restaurant.opening_hours.length === 0) {
      return { isOpen: false, statusText: 'Horário não disponível' };
    }

    const now = new Date();
    const currentDay = now.toLocaleString('en-us', { weekday: 'long' }).toLowerCase();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutos desde a meia-noite

    const todayHours = restaurant.opening_hours.find(
      (oh) => oh.day.toLowerCase() === currentDay
    );

    if (!todayHours || todayHours.is_closed) {
      return { isOpen: false, statusText: 'Fechado hoje' };
    }

    const [openHour, openMinute] = todayHours.open_time.split(':').map(Number);
    const [closeHour, closeMinute] = todayHours.close_time.split(':').map(Number);

    const openTimeInMinutes = openHour * 60 + openMinute;
    const closeTimeInMinutes = closeHour * 60 + closeMinute;

    if (currentTime >= openTimeInMinutes && currentTime <= closeTimeInMinutes) {
      return { isOpen: true, statusText: `Aberto agora até ${todayHours.close_time}` };
    } else {
      return { isOpen: false, statusText: `Fechado. Abre às ${todayHours.open_time}` };
    }
  };

  const { isOpen, statusText } = getOpeningStatus();

  return (
    <div className="relative z-10 bg-white rounded-t-3xl shadow-lg -mt-24 pt-4 pb-6 px-4">
      <div className="flex flex-col items-center text-center">
        {/* Logo do Restaurante */}
        <div className="mb-4 -mt-16"> {/* Ajusta margin-top para a logo */}
          <RestaurantLogo logoUrl={restaurant.image_url} size="lg" />
        </div>

        {/* Nome do Restaurante */}
        <h1 className={cn("font-extrabold leading-tight text-primary", h1SizeClass, "mb-2")}>{restaurant.name}</h1>

        {/* Localização */}
        <div className="flex items-center text-gray-600 text-sm mb-2">
          <MapPin className="h-4 w-4 mr-1" />
          <span>{restaurant.city}, {restaurant.state}</span>
        </div>

        {/* Seguidores e Botão Seguir */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <Heart className="h-5 w-5 text-red-500" />
          <span className="text-lg font-bold text-gray-800">{restaurant.followers_count || 0}</span>
          <span className="text-gray-600">Seguidores</span>
          <Button
            variant={restaurant.is_favorite ? "outline" : "default"}
            size="sm"
            onClick={onFavoriteToggle}
            disabled={isFavoriteMutating}
            className="ml-2 px-4 py-2 rounded-full text-sm font-semibold"
          >
            {isFavoriteMutating ? "Carregando..." : (restaurant.is_favorite ? "Seguindo" : "Seguir")}
          </Button>
        </div>

        {/* Status de Abertura */}
        <p className={cn("text-sm font-medium mb-2", isOpen ? "text-green-600" : "text-red-600")}>
          {statusText}
        </p>
      </div>
    </div>
  );
};

export default RestaurantMainInfoCard;
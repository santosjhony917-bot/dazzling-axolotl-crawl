"use client";

import React from 'react';
import { PublicRestaurantData } from '@/types'; // Importando o tipo PublicRestaurantData
import { MapPin, Clock, Phone, Globe, Instagram, Facebook, Twitter, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RestaurantInfoProps {
  restaurant: PublicRestaurantData; // Agora aceita PublicRestaurantData
}

const RestaurantInfo: React.FC<RestaurantInfoProps> = ({ restaurant }) => {
  const renderSocialLink = (url: string | null, Icon: React.ElementType, label: string) => {
    if (!url) return null;
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900">
        <Icon size={20} aria-label={label} />
      </a>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <h2 className="text-2xl font-bold mb-2">{restaurant.name}</h2>
      {restaurant.description && <p className="text-gray-600 mb-4">{restaurant.description}</p>}

      <div className="space-y-2 text-gray-700">
        {restaurant.addressSummary && (
          <div className="flex items-center">
            <MapPin size={18} className="mr-2 text-gray-500" />
            <span>{restaurant.addressSummary}</span>
          </div>
        )}
        {/* Placeholder for opening hours summary, DetailedHoursDisplay is more detailed */}
        {restaurant.opening_hours && (
          <div className="flex items-center">
            <Clock size={18} className="mr-2 text-gray-500" />
            <span>Horário de funcionamento disponível</span> {/* Pode ser mais específico se houver um resumo */}
          </div>
        )}
        {restaurant.whatsapp_url && (
          <div className="flex items-center">
            <Phone size={18} className="mr-2 text-gray-500" />
            <a href={restaurant.whatsapp_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              WhatsApp
            </a>
          </div>
        )}
        {restaurant.ifood_url && (
          <div className="flex items-center">
            <Globe size={18} className="mr-2 text-gray-500" />
            <a href={restaurant.ifood_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              iFood
            </a>
          </div>
        )}
        {restaurant.other_url && (
          <div className="flex items-center">
            <LinkIcon size={18} className="mr-2 text-gray-500" />
            <a href={restaurant.other_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              {restaurant.other_url_label || 'Outro Link'}
            </a>
          </div>
        )}
      </div>

      {/* Social Networks (assuming social_networks is a JSON object with URLs) */}
      {restaurant.social_networks && (
        <div className="flex space-x-4 mt-4">
          {/* Exemplo: renderSocialLink(restaurant.social_networks.instagram, Instagram, 'Instagram') */}
          {/* Você precisará adaptar isso com base na estrutura real do seu JSON de redes sociais */}
        </div>
      )}

      {/* Payment Methods (assuming payment_methods is a JSON object or array) */}
      {restaurant.payment_methods && (
        <div className="mt-4">
          <h3 className="font-semibold mb-2">Formas de Pagamento</h3>
          {/* Renderizar formas de pagamento aqui */}
        </div>
      )}

      {/* Followers count */}
      <div className="mt-4 text-gray-600">
        <span className="font-semibold">{restaurant.followers_count}</span> Seguidores
      </div>
    </div>
  );
};

export default RestaurantInfo;
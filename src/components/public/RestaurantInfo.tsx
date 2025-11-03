import React from 'react';
import { Phone, Mail, Globe, ExternalLink } from 'lucide-react';
import { RestaurantProfile } from '@/types/restaurant'; // Corrigido para RestaurantProfile
import WhatsappIcon from './WhatsappIcon'; // Importando o ícone do WhatsApp
import { Card, CardContent } from '@/components/ui/card';

interface RestaurantInfoProps {
  restaurant: RestaurantProfile;
}

const RestaurantInfo: React.FC<RestaurantInfoProps> = ({ restaurant }) => {
  const hasContactInfo = restaurant.phone || restaurant.email || restaurant.external_url;

  if (!hasContactInfo) {
    return null;
  }

  return (
    <Card className="p-4 shadow-soft-md rounded-xl bg-white border border-gray-300">
      <h2 className="text-2xl font-bold text-primary mb-3">Contato</h2>
      <CardContent className="p-0 grid gap-3">
        {restaurant.phone && (
          <a
            href={`tel:${restaurant.phone}`}
            className="flex items-center gap-3 text-lg font-medium text-gray-700 hover:text-primary transition-colors"
          >
            <Phone className="w-6 h-6" />
            <span>{restaurant.phone}</span>
          </a>
        )}
        {restaurant.email && (
          <a
            href={`mailto:${restaurant.email}`}
            className="flex items-center gap-3 text-lg font-medium text-gray-700 hover:text-primary transition-colors"
          >
            <Mail className="w-6 h-6" />
            <span>{restaurant.email}</span>
          </a>
        )}
        {restaurant.external_url && (
          <a
            href={restaurant.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-lg font-medium text-gray-700 hover:text-primary transition-colors"
          >
            <Globe className="w-6 h-6" />
            <span>Website</span>
            <ExternalLink className="w-4 h-4 ml-auto" />
          </a>
        )}
      </CardContent>
    </Card>
  );
};

export default RestaurantInfo;
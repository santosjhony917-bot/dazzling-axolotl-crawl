import React from 'react';
import { MessageSquare, Utensils, Globe, ExternalLink } from 'lucide-react';
import { RestaurantProfile } from '@/types/restaurant'; // Corrigido para RestaurantProfile
import { Card, CardContent } from '@/components/ui/card';

interface OrderChannelsSectionProps {
  restaurant: RestaurantProfile;
}

const OrderChannelsSection: React.FC<OrderChannelsSectionProps> = ({ restaurant }) => {
  const hasChannels = restaurant.whatsapp_url || restaurant.ifood_url || restaurant.other_url;

  if (!hasChannels) {
    return null;
  }

  return (
    <Card className="p-4 shadow-soft-md rounded-xl bg-white border border-gray-300">
      <h2 className="text-2xl font-bold text-primary mb-3">Canais de Pedido</h2>
      <CardContent className="p-0 grid gap-3">
        {restaurant.whatsapp_url && (
          <a
            href={restaurant.whatsapp_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-lg font-medium text-green-600 hover:text-green-700 transition-colors"
          >
            <MessageSquare className="w-6 h-6" />
            <span>WhatsApp</span>
            <ExternalLink className="w-4 h-4 ml-auto" />
          </a>
        )}
        {restaurant.ifood_url && (
          <a
            href={restaurant.ifood_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-lg font-medium text-red-600 hover:text-red-700 transition-colors"
          >
            <Utensils className="w-6 h-6" />
            <span>iFood</span>
            <ExternalLink className="w-4 h-4 ml-auto" />
          </a>
        )}
        {restaurant.other_url && (
          <a
            href={restaurant.other_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-lg font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            <Globe className="w-6 h-6" />
            <span>{restaurant.other_url_label || 'Outro Link'}</span>
            <ExternalLink className="w-4 h-4 ml-auto" />
          </a>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderChannelsSection;
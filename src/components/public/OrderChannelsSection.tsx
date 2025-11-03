import React from 'react';
import { PublicRestaurantData } from '@/pages/RestaurantProfilePublic';
import { Button } from '@/components/ui/button';
import { ExternalLink, Phone, MessageCircle } from 'lucide-react';

interface OrderChannelsSectionProps {
  restaurant: PublicRestaurantData;
  isPremium: boolean;
}

const OrderChannelsSection: React.FC<OrderChannelsSectionProps> = ({ restaurant }) => {
  const hasChannels = restaurant.whatsapp_url || restaurant.ifood_url || restaurant.other_url || restaurant.phone;

  if (!hasChannels) {
    return null; // Don't render if no channels are available
  }

  return (
    <section className="py-6">
      <h2 className="text-2xl font-bold mb-4">Canais de Pedido</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {restaurant.whatsapp_url && (
          <Button asChild className="w-full bg-green-500 hover:bg-green-600 text-white">
            <a href={restaurant.whatsapp_url} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" /> Pedir via WhatsApp
            </a>
          </Button>
        )}
        {restaurant.ifood_url && (
          <Button asChild className="w-full bg-red-500 hover:bg-red-600 text-white">
            <a href={restaurant.ifood_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" /> Pedir via iFood
            </a>
          </Button>
        )}
        {restaurant.other_url && (
          <Button asChild className="w-full bg-blue-500 hover:bg-blue-600 text-white">
            <a href={restaurant.other_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" /> Outro Canal
            </a>
          </Button>
        )}
        {restaurant.phone && (
          <Button asChild className="w-full bg-gray-700 hover:bg-gray-800 text-white">
            <a href={`tel:${restaurant.phone}`}>
              <Phone className="mr-2 h-4 w-4" /> Ligar para o Restaurante
            </a>
          </Button>
        )}
      </div>
    </section>
  );
};

export default OrderChannelsSection;
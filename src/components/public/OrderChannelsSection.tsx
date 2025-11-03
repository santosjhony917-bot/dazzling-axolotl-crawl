"use client";

import React from 'react';
import { Restaurant } from '@/types/restaurant';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Utensils, Phone, Globe } from 'lucide-react';

interface OrderChannelsSectionProps {
  restaurant: Restaurant;
}

const OrderChannelsSection: React.FC<OrderChannelsSectionProps> = ({ restaurant }) => {
  // A seção de canais de pedido só deve ser exibida para planos Premium ou Premium Gift
  if (restaurant.plan !== 'premium' && restaurant.plan !== 'premium_gift') {
    return null;
  }

  const hasOrderChannels = restaurant.whatsapp_url || restaurant.ifood_url || restaurant.other_url;

  if (!hasOrderChannels) {
    return null;
  }

  return (
    <Card className="p-4 shadow-soft-md rounded-xl bg-white border border-gray-300">
      <h2 className="text-2xl font-bold text-primary mb-4">Canais de Pedido</h2>
      <div className="grid grid-cols-1 gap-3">
        {restaurant.whatsapp_url && (
          <Button asChild className="w-full bg-green-500 hover:bg-green-600 text-white">
            <a href={restaurant.whatsapp_url} target="_blank" rel="noopener noreferrer">
              <Phone className="w-5 h-5 mr-2" /> Pedir por WhatsApp
            </a>
          </Button>
        )}
        {restaurant.ifood_url && (
          <Button asChild className="w-full bg-red-500 hover:bg-red-600 text-white">
            <a href={restaurant.ifood_url} target="_blank" rel="noopener noreferrer">
              <Utensils className="w-5 h-5 mr-2" /> Pedir por iFood
            </a>
          </Button>
        )}
        {restaurant.other_url && (
          <Button asChild className="w-full bg-blue-500 hover:bg-blue-600 text-white">
            <a href={restaurant.other_url} target="_blank" rel="noopener noreferrer">
              <Globe className="w-5 h-5 mr-2" /> {restaurant.other_url_label || 'Outro Canal'}
            </a>
          </Button>
        )}
      </div>
    </Card>
  );
};

export default OrderChannelsSection;
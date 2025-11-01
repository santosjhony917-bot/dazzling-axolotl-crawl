"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Phone, Mail, Globe, ExternalLink, UtensilsCrossed } from 'lucide-react';
import { PublicRestaurantData } from '@/types/restaurant';

interface OrderChannelsSectionProps {
  restaurant: PublicRestaurantData;
}

const OrderChannelsSection: React.FC<OrderChannelsSectionProps> = ({ restaurant }) => {
  const channels = [
    { label: 'WhatsApp', url: restaurant.whatsapp_url, icon: MessageSquare, color: 'bg-green-500 hover:bg-green-600' },
    { label: 'Telefone', url: restaurant.phone ? `tel:${restaurant.phone}` : null, icon: Phone, color: 'bg-blue-500 hover:bg-blue-600' },
    { label: 'Email', url: restaurant.email ? `mailto:${restaurant.email}` : null, icon: Mail, color: 'bg-red-500 hover:bg-red-600' },
    { label: 'iFood', url: restaurant.ifood_url, icon: UtensilsCrossed, color: 'bg-red-600 hover:bg-red-700' },
    { label: 'Outro Link', url: restaurant.other_url, icon: ExternalLink, color: 'bg-gray-500 hover:bg-gray-600' },
    { label: 'Site Externo', url: restaurant.external_url, icon: Globe, color: 'bg-purple-500 hover:bg-purple-600' },
  ].filter(channel => channel.url); // Filter out channels without a URL

  if (channels.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">
        <p>Nenhum canal de pedido disponível.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {channels.map((channel, index) => (
        <Button key={index} asChild className={`w-full flex items-center justify-center ${channel.color} text-white`}>
          <a href={channel.url!} target="_blank" rel="noopener noreferrer">
            {channel.icon && <channel.icon className="h-5 w-5 mr-2" />}
            {channel.label}
          </a>
        </Button>
      ))}
    </div>
  );
};

export default OrderChannelsSection;
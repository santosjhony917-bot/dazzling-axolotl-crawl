"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Utensils, ExternalLink, MapPin, Phone, MessageSquare, Globe } from 'lucide-react';
import { PublicRestaurantData } from '@/types/restaurant';

interface OrderChannelsSectionProps {
  restaurant: PublicRestaurantData;
}

const OrderChannelsSection: React.FC<OrderChannelsSectionProps> = ({ restaurant }) => {
  const { whatsapp_url, ifood_url, other_url, external_url, phone, address, city, state } = restaurant;

  const channels = [
    {
      name: 'WhatsApp',
      url: whatsapp_url,
      icon: MessageSquare,
      color: 'bg-green-500 hover:bg-green-600',
      isIfood: false,
    },
    {
      name: 'iFood',
      url: ifood_url,
      icon: Utensils,
      color: 'bg-red-500 hover:bg-red-600',
      isIfood: true,
    },
    {
      name: 'Outro Link',
      url: other_url,
      icon: Globe,
      color: 'bg-gray-500 hover:bg-gray-600',
      isIfood: false,
    },
    {
      name: 'Link Externo',
      url: external_url,
      icon: ExternalLink,
      color: 'bg-blue-500 hover:bg-blue-600',
      isIfood: false,
    },
  ].filter(channel => channel.url);

  const contactInfo = [
    {
      label: 'Telefone',
      value: phone,
      icon: Phone,
      href: phone ? `tel:${phone}` : undefined,
    },
    {
      label: 'Endereço',
      value: address && city && state ? `${address}, ${city} - ${state}` : address,
      icon: MapPin,
      href: address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, ${city}, ${state}`)}` : undefined,
    },
  ].filter(info => info.value);

  if (channels.length === 0 && contactInfo.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6 p-4 border-t border-gray-200">
      {channels.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800">Canais de Pedido</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {channels.map((channel) => (
              <Button
                key={channel.name}
                asChild
                className={`flex items-center justify-center space-x-2 text-white ${channel.color} transition-transform transform hover:scale-[1.02]`}
              >
                <a href={channel.url} target="_blank" rel="noopener noreferrer">
                  {channel.isIfood ? (
                    <img
                      src="https://blog-parceiros.ifood.com.br/wp-content/uploads/2022/02/avatar-ifood-1-300x300.png" 
                      alt="iFood Logo" 
                      className="w-7 h-7 object-contain" 
                    />
                  ) : (
                    <channel.icon className="w-5 h-5" />
                  )}
                  <span className="hidden sm:inline">{channel.name}</span>
                </a>
              </Button>
            ))}
          </div>
        </div>
      )}

      {contactInfo.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800">Contato e Localização</h3>
          <div className="space-y-2">
            {contactInfo.map((info) => (
              <div key={info.label} className="flex items-start space-x-3 text-gray-600">
                <info.icon className="w-5 h-5 flex-shrink-0 mt-1 text-gray-500" />
                <div className="flex-1">
                  <p className="font-medium text-sm">{info.label}</p>
                  {info.href ? (
                    <a 
                      href={info.href} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-600 hover:text-blue-800 transition-colors flex items-center"
                    >
                      {info.value}
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  ) : (
                    <p className="text-base">{info.value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderChannelsSection;
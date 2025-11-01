import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Utensils, ShoppingCart, Link, Phone, Mail, ExternalLink, MessageSquare } from 'lucide-react';
import { PublicRestaurantData } from '@/types/restaurant';
import { cn } from '@/lib/utils';
import IfoodIcon from '../../icons/IfoodIcon'; // Corrigido o caminho de importação

interface OrderChannelsSectionProps {
  id: string;
  restaurant: PublicRestaurantData;
}

interface ChannelLink {
  platform: 'whatsapp' | 'ifood' | 'other';
  label: string;
  url: string;
  icon: React.ElementType | React.FC<any>;
  colorClass: string;
}

const getChannelLinks = (restaurant: PublicRestaurantData): ChannelLink[] => {
  const links: ChannelLink[] = [];
  
  if (restaurant.whatsapp_url) {
    links.push({
      platform: 'whatsapp',
      label: 'WhatsApp',
      url: restaurant.whatsapp_url,
      icon: MessageSquare,
      colorClass: 'text-green-500',
    });
  }

  if (restaurant.ifood_url) {
    links.push({
      platform: 'ifood',
      label: 'iFood',
      url: restaurant.ifood_url,
      icon: IfoodIcon, // Usando o componente IfoodIcon
      colorClass: 'text-red-600', // Cor de fallback, mas o IfoodIcon já tem a cor
    });
  }

  if (restaurant.other_url) {
    links.push({
      platform: 'other',
      label: 'Outro Link',
      url: restaurant.other_url,
      // Usamos Link para links genéricos de pedido
      icon: Link, 
      colorClass: 'text-blue-500',
    });
  }

  return links;
};

const OrderChannelsSection: React.FC<OrderChannelsSectionProps> = ({ id, restaurant }) => {
  const channelLinks = getChannelLinks(restaurant);

  if (channelLinks.length === 0) {
    return null;
  }

  return (
    <Card id={id} className="shadow-soft-md border-none rounded-xl p-0">
      <CardHeader className="flex flex-row items-center space-x-3 p-4 border-b border-gray-100">
        <Utensils className="w-6 h-6 text-primary" />
        <CardTitle className="text-2xl font-extrabold text-primary">Faça seu Pedido</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {channelLinks.map((link, index) => {
            const Icon = link.icon;
            
            // Ajuste de estilo para o iFood, garantindo que a imagem seja exibida corretamente
            const isIfood = link.platform === 'ifood';
            
            return (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 shadow-sm"
              >
                {isIfood ? (
                    <Icon className="w-10 h-10 mb-2" /> // Tamanho maior para a logo do iFood
                ) : (
                    <Icon className={cn("w-7 h-7 mb-2", link.colorClass)} />
                )}
                
                <p className="text-xs font-semibold text-gray-700 text-center">{link.label}</p>
                <ExternalLink className="w-3 h-3 text-gray-400 mt-1" />
              </a>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderChannelsSection;
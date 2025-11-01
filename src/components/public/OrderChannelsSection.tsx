import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Utensils, Globe, ExternalLink } from 'lucide-react';
import { PublicRestaurantData } from '@/types/restaurant';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface OrderChannelsSectionProps {
  restaurant: PublicRestaurantData;
}

const OrderChannelsSection: React.FC<OrderChannelsSectionProps> = ({ restaurant }) => {
  const orderLinks = [
    { 
      label: 'WhatsApp', 
      url: restaurant.whatsapp_url, 
      icon: MessageSquare, 
      colorClass: 'text-green-600',
      target: '_blank'
    },
    { 
      label: 'iFood', 
      url: restaurant.ifood_url, 
      icon: Utensils, 
      colorClass: 'text-red-600',
      target: '_blank'
    },
    { 
      label: 'Outro Link', 
      url: restaurant.other_url || restaurant.external_url, 
      icon: Globe, 
      colorClass: 'text-primary',
      target: '_blank'
    },
  ].filter(link => link.url);

  if (orderLinks.length === 0) {
    return null;
  }

  return (
    <Card className="p-4 shadow-soft-xl rounded-2xl bg-white border-none">
      <CardContent className="p-0">
        {/* Título da seção ajustado para 2xl */}
        <h2 className="text-2xl font-extrabold text-primary mb-4">Faça seu Pedido</h2>
        <div className="grid grid-cols-3 gap-4">
          {orderLinks.map((link) => {
            const Icon = link.icon;
            return (
              <a 
                key={link.label} 
                href={link.url!}
                target={link.target}
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 rounded-xl bg-gray-50 p-4 shadow-soft-sm border border-gray-200 cursor-pointer hover:shadow-soft-md transition-shadow"
              >
                <Icon className={cn("w-7 h-7", link.colorClass)} />
                <p className="text-xs font-semibold text-gray-700 text-center">{link.label}</p>
              </a>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderChannelsSection;
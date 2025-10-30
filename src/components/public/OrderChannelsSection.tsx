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
      colorClass: 'bg-green-600 hover:bg-green-700 text-white',
      target: '_blank'
    },
    { 
      label: 'iFood', 
      url: restaurant.ifood_url, 
      icon: Utensils, 
      colorClass: 'bg-red-600 hover:bg-red-700 text-white',
      target: '_blank'
    },
    { 
      label: 'Site Próprio / Outro Link', 
      url: restaurant.other_url || restaurant.external_url, 
      icon: Globe, 
      colorClass: 'bg-primary hover:bg-primary/90 text-white',
      target: '_blank'
    },
  ].filter(link => link.url);

  if (orderLinks.length === 0) {
    return null;
  }

  return (
    <Card className="p-4 shadow-soft-xl rounded-2xl bg-white border-2 border-highlight/20">
      <CardContent className="p-0">
        <h2 className="text-xl font-bold text-primary mb-4">Faça seu Pedido</h2>
        <div className="space-y-3">
          {orderLinks.map((link) => (
            <Button 
              key={link.label} 
              onClick={() => window.open(link.url!, link.target)}
              className={cn(
                "w-full h-12 rounded-xl text-base font-bold shadow-soft-md transition-transform transform hover:scale-[1.01]",
                link.colorClass
              )}
            >
              <link.icon className="w-5 h-5 mr-3" />
              {link.label}
              <ExternalLink className="w-4 h-4 ml-auto opacity-70" />
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderChannelsSection;
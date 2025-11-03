import React from 'react';
import { Button } from '@/components/ui/button';
import { Link as LinkIcon, MessageCircle, UtensilsCrossed } from "lucide-react";
import { PublicRestaurantData } from '@/types/restaurant';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import WhatsappIcon from './WhatsappIcon'; // Importando o novo componente

interface Restaurant {
  id: string;
  name: string;
  whatsapp_url?: string;
  ifood_url?: string;
  other_url?: string;
  other_url_label?: string;
}

interface OrderChannelsSectionProps {
  restaurant: Restaurant;
}

// Definindo a interface para os objetos de link
interface OrderLink {
  type: "whatsapp" | "ifood" | "other";
  label: string;
  url: string | undefined;
  icon: React.ReactNode; // O ícone é um ReactNode (JSX element)
}

const OrderChannelsSection = ({ restaurant }: OrderChannelsSectionProps) => {
  const orderLinks = ([
    {
      type: "whatsapp",
      label: "WhatsApp",
      url: restaurant.whatsapp_url,
      icon: <MessageCircle className="h-6 w-6" />,
    },
    {
      type: "ifood",
      label: "iFood",
      url: restaurant.ifood_url,
      icon: <UtensilsCrossed className="h-6 w-6" />,
    },
    {
      type: "other",
      label: restaurant.other_url_label || "Outro Link",
      url: restaurant.other_url,
      icon: <LinkIcon className="h-6 w-6" />,
    },
  ] as const) // Garante que 'type' seja inferido como literal
  .filter((link) => link.url) // Filtra links sem URL
  .map(link => ({ // Mapeia para o tipo OrderLink, garantindo que 'url' seja string
    type: link.type,
    label: link.label,
    url: link.url!, // Afirma que url não é undefined após a filtragem
    icon: link.icon,
  })) as OrderLink[]; // Garante que o array final seja OrderLink[]

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
            const isIfood = link.label === 'iFood';
            const isWhatsapp = link.label === 'WhatsApp';
            
            // Define o tamanho do ícone/imagem: agora w-8 h-8 para WhatsApp
            const iconSizeClass = "w-8 h-8";

            return (
              <Button asChild key={link.type} variant="outline" className="flex-1 min-w-[100px] h-auto py-3">
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center space-y-1">
                  {/* Envolve o ícone e o texto em um único div */}
                  <div>
                    {link.icon}
                    <p className={cn(
                      "text-xs font-semibold text-center",
                      // Texto na cor vermelha para iFood, verde para WhatsApp, e primária para outros
                      isIfood ? "text-red-600" : (isWhatsapp ? "text-green-600" : "text-primary")
                    )}>
                      {link.label}
                    </p>
                  </div>
                </a>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderChannelsSection;
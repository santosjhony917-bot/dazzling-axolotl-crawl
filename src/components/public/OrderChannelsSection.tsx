import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Utensils, Globe, ExternalLink } from 'lucide-react';
import { PublicRestaurantData } from '@/types/restaurant';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import WhatsappIcon from './WhatsappIcon'; // Importando o novo componente
import PriceDisclaimerDialog from './PriceDisclaimerDialog';

interface OrderChannelsSectionProps {
  restaurant: PublicRestaurantData;
}

// URLs PNGs fornecidas pelo usuário
const IFOOD_PNG_URL = "https://imagensfree.com.br/wp-content/uploads/2021/11/icone-ifood-sorriso-circulo-vermelho-png.png";
// Removida a constante WHATSAPP_PNG_URL

const OrderChannelsSection: React.FC<OrderChannelsSectionProps> = ({ restaurant }) => {
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string>('');
  const [pendingPlatform, setPendingPlatform] = useState<string>('');

  // A seção de canais de pedido só deve ser exibida para planos Premium
  if (restaurant.plan !== 'premium' && restaurant.plan !== 'premium_gift') {
    return null;
  }

  const orderLinks = [
    { 
      label: 'WhatsApp', 
      url: restaurant.whatsapp_url, 
      icon: MessageSquare, 
      colorClass: 'text-green-600',
      target: '_blank',
    },
    { 
      label: 'iFood', 
      url: restaurant.ifood_url, 
      icon: Utensils, 
      colorClass: 'text-red-600',
      target: '_blank',
    },
    { 
      label: 'Outro Link', 
      url: restaurant.other_url || restaurant.external_url, 
      icon: Globe, 
      colorClass: 'text-primary',
      target: '_blank',
    },
  ].filter(link => link.url);

  if (orderLinks.length === 0) {
    return null;
  }

  const handleOrderClick = (e: React.MouseEvent, url: string, platformName: string) => {
    e.preventDefault();
    setPendingUrl(url);
    setPendingPlatform(platformName);
    setIsDisclaimerOpen(true);
  };

  const handleConfirmOrder = () => {
    if (pendingUrl) {
      window.open(pendingUrl, '_blank', 'noopener,noreferrer');
    }
    setIsDisclaimerOpen(false);
    setPendingUrl('');
    setPendingPlatform('');
  };

  const handleCloseDisclaimer = () => {
    setIsDisclaimerOpen(false);
    setPendingUrl('');
    setPendingPlatform('');
  };

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
              <Button 
                key={link.label}
                onClick={(e) => handleOrderClick(e, link.url!, link.label)}
                // Todos os botões usam o variant 'channel' para fundo branco
                variant="channel" 
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl p-4 h-auto",
                  // Removido o estilo de destaque para WhatsApp
                  "border border-gray-200 hover:bg-gray-50 cursor-pointer" // Estilo genérico para todos os botões de canal
                )}
              >
                {isIfood ? (
                  <img 
                    src={IFOOD_PNG_URL} 
                    alt="iFood Logo" 
                    className={cn(iconSizeClass, "object-contain")} 
                  />
                ) : isWhatsapp ? (
                  // Ícone na cor primária para WhatsApp
                  <WhatsappIcon className={cn(iconSizeClass, "text-primary")} /> 
                ) : (
                  <Icon className={cn(iconSizeClass, "text-primary")} />
                )}
                <p className={cn(
                  "text-xs font-semibold text-center",
                  "text-gray-700" // Texto genérico text-gray-700 para todos
                )}>
                  {link.label}
                </p>
              </Button>
            );
          })}
        </div>
      </CardContent>

      <PriceDisclaimerDialog
        isOpen={isDisclaimerOpen}
        onClose={handleCloseDisclaimer}
        onConfirm={handleConfirmOrder}
        platformName={pendingPlatform}
      />
    </Card>
  );
};

export default OrderChannelsSection;
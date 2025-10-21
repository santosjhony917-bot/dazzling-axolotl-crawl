import React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import InfoCardItem from '@/components/InfoCardItem';
import { MessageSquare, UtensilsCrossed, Globe } from 'lucide-react';
import { z } from 'zod';

interface SalesChannelsSectionProps {
  restaurant: any;
  isPremium: boolean;
  handleEditField: (key: string, title: string, fieldName: string, icon: React.ReactNode, validationSchema: z.ZodType<string>, type?: "text" | "tel" | "email", mask?: (value: string) => string, placeholder?: string) => void;
  whatsappSchema: z.ZodType<string>;
  ifoodSchema: z.ZodType<string>;
  otherUrlSchema: z.ZodType<string>;
}

const SalesChannelsSection: React.FC<SalesChannelsSectionProps> = ({
  restaurant,
  isPremium,
  handleEditField,
  whatsappSchema,
  ifoodSchema,
  otherUrlSchema,
}) => {
  return (
    <div className="w-full space-y-3">
      <h2 className="text-lg font-bold text-[#022D68] px-1">Canais de Venda e Links</h2>
      <InfoCardItem 
        label="Link do WhatsApp" 
        value={restaurant?.whatsapp_url || ""} 
        icon={MessageSquare} 
        isPremium={isPremium}
        onClick={() => handleEditField('whatsapp_url', 'Editar WhatsApp', 'URL do WhatsApp', <MessageSquare className="h-6 w-6 text-primary" />, whatsappSchema, "text", undefined, "https://wa.me/5583999999999")}
      />
      <InfoCardItem 
        label="Link do iFood/Delivery App" 
        value={restaurant?.ifood_url || ""} 
        icon={UtensilsCrossed} 
        isPremiumFeature={true}
        isPremium={isPremium}
        onClick={() => handleEditField('ifood_url', 'Editar iFood', 'URL do iFood', <UtensilsCrossed className="h-6 w-6 text-primary" />, ifoodSchema, "text", undefined, "https://www.ifood.com.br/restaurante/exemplo")}
      />
      <InfoCardItem 
        label="Outro Link (Ex: Site Próprio)" 
        value={restaurant?.other_url || ""} 
        icon={Globe} 
        isPremiumFeature={true}
        isPremium={isPremium}
        onClick={() => handleEditField('other_url', 'Editar Outro Link', 'Outra URL', <Globe className="h-6 w-6 text-primary" />, otherUrlSchema, "text", undefined, "https://www.seusite.com.br")}
      />
    </div>
  );
};

export default SalesChannelsSection;
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Phone, Mail, Globe, Utensils, Clock, DollarSign, Instagram, Facebook, Link as LinkIcon, Whatsapp } from 'lucide-react';
import { Restaurant, SocialNetwork } from '@/types/restaurant'; // Importando tipos atualizados
import { formatCurrency } from '@/utils/formatters';
import OpeningHoursDisplay from '@/components/restaurant/OpeningHoursDisplay'; // Importando o novo componente
import { Button } from '@/components/ui/button';

interface RestaurantInfoProps {
  restaurant: Restaurant;
}

const RestaurantInfo: React.FC<RestaurantInfoProps> = ({ restaurant }) => {
  const addressParts = [
    restaurant.address,
    restaurant.number,
    restaurant.neighborhood,
    restaurant.city,
    restaurant.state,
    restaurant.cep,
  ].filter(Boolean);

  const contactItems = [
    restaurant.whatsapp_url && { icon: Whatsapp, label: 'WhatsApp', value: restaurant.whatsapp_url, type: 'link' },
    restaurant.ifood_url && { icon: Utensils, label: 'iFood', value: restaurant.ifood_url, type: 'link' },
    restaurant.other_url && { icon: LinkIcon, label: 'Outro Link', value: restaurant.other_url, type: 'link' },
    restaurant.phone && { icon: Phone, label: 'Telefone', value: restaurant.phone, type: 'phone' },
    restaurant.email && { icon: Mail, label: 'Email', value: restaurant.email, type: 'email' },
  ].filter(Boolean);

  // Garantir que social_networks seja um array para usar .map e .length
  const socialNetworks: SocialNetwork[] = (restaurant.social_networks || []) as SocialNetwork[];

  return (
    <Card className="w-full shadow-soft-md rounded-xl">
      <CardHeader className="p-4 pb-0">
        <CardTitle className="text-2xl font-extrabold text-[#022D68] tracking-tight">Informações</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-6">
        
        {/* Contato Direto */}
        {restaurant.plan === 'premium' && contactItems.length > 0 && (
          <div>
            <h3 className="text-lg font-bold text-[#022D68] mb-3">Contato e Links</h3>
            <div className="space-y-3">
              {contactItems.map((item, index) => (
                <div key={index} className="flex items-center gap-3 text-gray-700">
                  <item.icon className="w-5 h-5 text-highlight" />
                  {item.type === 'link' ? (
                    <a 
                      href={item.value} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-blue-600 hover:underline text-base"
                    >
                      {item.label}
                    </a>
                  ) : item.type === 'phone' ? (
                    <a href={`tel:${item.value}`} className="text-base">{item.value}</a>
                  ) : item.type === 'email' ? (
                    <a href={`mailto:${item.value}`} className="text-base">{item.value}</a>
                  ) : (
                    <span className="text-base">{item.value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Redes Sociais */}
        {restaurant.plan === 'premium' && socialNetworks.length > 0 && (
          <div>
            <h3 className="text-lg font-bold text-[#022D68] mb-3">Redes Sociais</h3>
            <div className="flex flex-wrap gap-3">
              {socialNetworks.map((social, index) => (
                <Button 
                  key={index} 
                  variant="outline" 
                  size="icon" 
                  asChild
                  className="rounded-full w-10 h-10 border-gray-300 hover:bg-gray-100"
                >
                  <a href={social.url} target="_blank" rel="noopener noreferrer">
                    {social.platform === 'instagram' && <Instagram className="w-5 h-5 text-gray-700" />}
                    {social.platform === 'facebook' && <Facebook className="w-5 h-5 text-gray-700" />}
                    {social.platform === 'website' && <Globe className="w-5 h-5 text-gray-700" />}
                    {/* Adicione outros ícones de redes sociais conforme necessário */}
                  </a>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Endereço */}
        {addressParts.length > 0 && (
          <div>
            <h3 className="text-lg font-bold text-[#022D68] mb-3">Endereço</h3>
            <div className="flex items-start gap-3 text-gray-700">
              <MapPin className="w-5 h-5 text-highlight mt-1" />
              <p className="text-base">{addressParts.join(', ')}</p>
            </div>
          </div>
        )}

        {/* Horário de Funcionamento */}
        {restaurant.opening_hours && Object.keys(restaurant.opening_hours).length > 0 && (
          <div>
            <h3 className="text-lg font-bold text-[#022D68] mb-3">Horário de Funcionamento</h3>
            <OpeningHoursDisplay openingHours={restaurant.opening_hours} />
          </div>
        )}

        {/* Categoria */}
        {restaurant.category && (
          <div>
            <h3 className="text-lg font-bold text-[#022D68] mb-3">Categoria</h3>
            <div className="flex items-center gap-3 text-gray-700">
              <Utensils className="w-5 h-5 text-highlight" />
              <p className="text-base">{restaurant.category}</p>
            </div>
          </div>
        )}

        {/* Preço Médio (se aplicável) */}
        {/* {restaurant.average_price && (
          <div>
            <h3 className="text-lg font-bold text-[#022D68] mb-3">Preço Médio</h3>
            <div className="flex items-center gap-3 text-gray-700">
              <DollarSign className="w-5 h-5 text-highlight" />
              <p className="text-base">{formatCurrency(restaurant.average_price)}</p>
            </div>
          </div>
        )} */}
      </CardContent>
    </Card>
  );
};

export default RestaurantInfo;
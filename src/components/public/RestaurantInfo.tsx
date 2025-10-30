import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Phone, Mail, Clock, ExternalLink } from 'lucide-react';
import { OpeningHoursDisplay } from './OpeningHoursDisplay';
import { WeekSchedule } from '@/types/schedule';

interface RestaurantInfoProps {
  id: string;
  restaurant: {
    address: string | null;
    number: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    cep: string | null;
    phone: string | null;
    email: string | null;
    whatsappUrl: string | null;
    ifoodUrl: string | null;
    otherUrl: string | null;
    openingHours: any; // JSONB structure
  };
  scheduleDisplay: string[];
  fullAddress: string;
}

const RestaurantInfo: React.FC<RestaurantInfoProps> = ({ id, restaurant, scheduleDisplay, fullAddress }) => {
  
  const infoItems = [
    {
      icon: MapPin,
      label: 'Endereço',
      value: fullAddress,
      link: fullAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}` : undefined,
      isExternal: true,
    },
    {
      icon: Phone,
      label: 'Telefone',
      value: restaurant.phone,
      link: restaurant.phone ? `tel:${restaurant.phone.replace(/\D/g, '')}` : undefined,
    },
    {
      icon: Mail,
      label: 'Email',
      value: restaurant.email,
      link: restaurant.email ? `mailto:${restaurant.email}` : undefined,
    },
  ].filter(item => item.value);

  return (
    <Card id={id} className="shadow-soft-md border-none rounded-xl p-0">
      <CardHeader className="flex flex-row items-center space-x-3 p-4 border-b border-gray-100">
        <MapPin className="w-6 h-6 text-primary" />
        <CardTitle className="text-xl font-semibold text-primary">Informações e Contato</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-6">
        
        {/* Endereço e Contato */}
        <div className="space-y-4">
          {infoItems.map((item, index) => (
            <div key={index} className="flex items-start">
              <item.icon className="w-5 h-5 text-highlight mt-1 flex-shrink-0" />
              <div className="ml-3 min-w-0">
                <p className="text-sm font-semibold text-gray-700">{item.label}</p>
                {item.link ? (
                  <a 
                    href={item.link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-base text-gray-900 hover:text-highlight transition-colors break-words flex items-center"
                  >
                    {item.value}
                    {item.isExternal && <ExternalLink className="w-4 h-4 ml-1 flex-shrink-0" />}
                  </a>
                ) : (
                  <p className="text-base text-gray-900 break-words">{item.value}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Horário de Funcionamento (Usando o componente OpeningHoursDisplay) */}
        {restaurant.openingHours && (
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-start">
              <Clock className="w-5 h-5 text-highlight mt-1 flex-shrink-0" />
              <div className="ml-3 min-w-0">
                <p className="text-sm font-semibold text-gray-700 mb-2">Horário de Funcionamento</p>
                {/* Usando o componente OpeningHoursDisplay que exporta a função */}
                <OpeningHoursDisplay openingHours={restaurant.openingHours} />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RestaurantInfo;
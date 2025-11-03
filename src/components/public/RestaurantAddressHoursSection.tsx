import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Clock, ExternalLink, CreditCard } from 'lucide-react';
import { OpeningHoursDisplay } from './OpeningHoursDisplay';
import { PublicRestaurantData } from '@/types/restaurant';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface RestaurantAddressHoursSectionProps {
  id: string;
  restaurant: PublicRestaurantData;
  fullAddress: string;
  paymentMethods: string[] | null;
}

const RestaurantAddressHoursSection: React.FC<RestaurantAddressHoursSectionProps> = ({ id, restaurant, fullAddress, paymentMethods }) => {
  const { opening_hours } = restaurant;

  const addressItem = {
    icon: MapPin,
    label: 'Endereço',
    value: fullAddress,
    link: fullAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}` : undefined,
    isExternal: true,
  };

  return (
    <Card id={id} className="shadow-soft-md border-none rounded-xl p-0">
      <CardHeader className="flex flex-row items-center space-x-3 p-4 border-b border-gray-100">
        <MapPin className="w-6 h-6 text-primary" />
        <CardTitle className="text-2xl font-extrabold text-primary">Localização e Horário</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-6">
        
        {/* Endereço */}
        <div className="space-y-4">
          <div className="flex items-start">
            <addressItem.icon className="w-5 h-5 text-highlight mt-1 flex-shrink-0" />
            <div className="ml-3 min-w-0">
              {addressItem.link ? (
                <a 
                  href={addressItem.link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-base font-bold text-highlight hover:text-highlight/90 transition-colors break-words flex items-center mt-2"
                >
                  {addressItem.value}
                  {addressItem.isExternal && <ExternalLink className="w-4 h-4 ml-1 flex-shrink-0" />}
                </a>
              ) : (
                <p className="text-base font-bold text-highlight break-words mt-2">{addressItem.value}</p>
              )}
            </div>
          </div>
        </div>

        {/* Horário de Funcionamento */}
        {opening_hours && (
          <div className="pt-4">
            <div className="flex items-start">
              <Clock className="w-5 h-5 text-highlight mt-1 flex-shrink-0" />
              <div className="ml-3 min-w-0">
                <p className="text-sm font-semibold text-gray-700 mb-2">Horário de Funcionamento</p>
                <OpeningHoursDisplay openingHours={opening_hours} />
              </div>
            </div>
          </div>
        )}

        {/* Separador e Formas de Pagamento */}
        {paymentMethods && paymentMethods.length > 0 && (
          <>
            <Separator className="my-6 bg-gray-200" />
            <div className="pt-4">
              <div className="flex items-start">
                <CreditCard className="w-5 h-5 text-highlight mt-1 flex-shrink-0" />
                <div className="ml-3 min-w-0">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Formas de Pagamento</p>
                  <div className="flex flex-wrap gap-2">
                    {paymentMethods.map((method, index) => (
                      <Badge 
                        key={index} 
                        variant={method.toLowerCase() === 'pix' ? 'highlight' : 'secondary'}
                        className={cn(
                          "px-3 py-1 text-sm font-medium rounded-full",
                          method.toLowerCase() === 'pix' ? "bg-highlight text-white" : "bg-gray-100 text-gray-700 border border-gray-200"
                        )}
                      >
                        {method}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default RestaurantAddressHoursSection;
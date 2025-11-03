"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Clock, CreditCard } from 'lucide-react';
import { PublicRestaurantData } from '@/types/restaurant';
import DetailedHoursDisplay from './DetailedHoursDisplay';
import { cn } from '@/lib/utils';

interface RestaurantAddressHoursSectionProps {
  id: string;
  restaurant: PublicRestaurantData;
  fullAddress: string;
  paymentMethods: string[];
}

const RestaurantAddressHoursSection: React.FC<RestaurantAddressHoursSectionProps> = ({
  id,
  restaurant,
  fullAddress,
  paymentMethods,
}) => {
  const { opening_hours } = restaurant;

  const hasAddress = !!fullAddress;
  const hasHours = opening_hours && Object.values(opening_hours).some(day => day.length > 0);
  const hasPaymentMethods = paymentMethods && paymentMethods.length > 0;

  if (!hasAddress && !hasHours && !hasPaymentMethods) {
    return null;
  }

  return (
    <Card id={id} className="shadow-sm border border-gray-200 rounded-lg p-0"> {/* Estilo de card mais simples */}
      <CardHeader className="flex flex-row items-center space-x-3 p-4 border-b border-gray-100">
        <MapPin className="w-5 h-5 text-gray-700" /> {/* Ícone mais neutro */}
        <CardTitle className="text-xl font-bold text-gray-800">Endereço e Horário</CardTitle> {/* Tipografia mais genérica */}
      </CardHeader>
      <CardContent className="p-4 space-y-6">
        {hasAddress && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">Endereço</p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start text-base text-gray-900 hover:text-gray-700 transition-colors" // Cor de hover mais neutra
            >
              <MapPin className="w-4 h-4 mr-2 mt-1 flex-shrink-0 text-gray-600" /> {/* Ícone mais neutro */}
              {fullAddress}
            </a>
          </div>
        )}

        {hasHours && (
          <div className={cn("space-y-2", hasAddress && "pt-4 border-t border-gray-100")}>
            <p className="text-sm font-semibold text-gray-700">Horário de Funcionamento</p>
            <DetailedHoursDisplay schedule={opening_hours} />
          </div>
        )}

        {hasPaymentMethods && (
          <div className={cn("space-y-2", (hasAddress || hasHours) && "pt-4 border-t border-gray-100")}>
            <p className="text-sm font-semibold text-gray-700">Formas de Pagamento</p>
            <div className="flex flex-wrap gap-2">
              {paymentMethods.map((method, index) => (
                <span key={index} className="px-3 py-1 rounded-md bg-gray-100 text-gray-700 text-sm font-medium"> {/* Estilo de pill mais simples */}
                  {method}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RestaurantAddressHoursSection;
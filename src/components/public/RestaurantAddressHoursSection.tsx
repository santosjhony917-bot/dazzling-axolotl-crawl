"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { MapPin, Clock, CreditCard } from 'lucide-react';
import { Restaurant } from '@/types/restaurant'; // Corrigido para minúsculo
import { cn } from '@/lib/utils';

interface RestaurantAddressHoursSectionProps {
  id: string;
  restaurant: Restaurant;
  fullAddress: string;
  paymentMethods?: string[];
}

const RestaurantAddressHoursSection: React.FC<RestaurantAddressHoursSectionProps> = ({
  id,
  restaurant,
  fullAddress,
  paymentMethods,
}) => {
  const hasAddressHours = restaurant.address || restaurant.opening_hours;
  const hasPaymentMethods = paymentMethods && paymentMethods.length > 0;

  if (!hasAddressHours && !hasPaymentMethods) {
    return null;
  }

  return (
    <Card id={id} className="p-4 shadow-soft-md rounded-xl bg-white border border-gray-300">
      <h3 className="text-xl font-bold text-primary mb-4">Localização e Horário</h3>

      {/* Localização */}
      {restaurant.address && (
        <div className="mb-4">
          <div className="flex items-center mb-2">
            <MapPin className="w-5 h-5 mr-2 text-gray-500 shrink-0" />
            <h4 className="font-semibold text-gray-800">Localização</h4>
          </div>
          <p className="text-gray-700 ml-7">{fullAddress}</p>
        </div>
      )}

      {/* Horário de Funcionamento */}
      {restaurant.opening_hours && (
        <div className="mb-4">
          <div className="flex items-center mb-2">
            <Clock className="w-5 h-5 mr-2 text-gray-500 shrink-0" />
            <h4 className="font-semibold text-gray-800">Horário de Funcionamento</h4>
          </div>
          <div className="ml-7 text-gray-700">
            {Object.entries(restaurant.opening_hours).map(([day, hours]) => (
              <p key={day}>
                <span className="capitalize">{day}:</span> {hours || 'Fechado'}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Formas de Pagamento */}
      {hasPaymentMethods && (
        <div>
          <div className="flex items-center mb-2">
            <CreditCard className="w-5 h-5 mr-2 text-gray-500 shrink-0" />
            <h4 className="font-semibold text-gray-800">Formas de Pagamento</h4>
          </div>
          <div className="ml-7 text-gray-700">
            {paymentMethods.map((method, index) => (
              <span key={index} className="inline-block bg-gray-100 rounded-full px-3 py-1 text-sm font-medium text-gray-700 mr-2 mb-2">
                {method}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default RestaurantAddressHoursSection;
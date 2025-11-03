"use client";

import React from 'react';
import { MapPin, Clock, CreditCard, ExternalLink } from 'lucide-react';
import { OpeningHoursDisplay } from './OpeningHoursDisplay';
import { RestaurantProfile } from '@/types/restaurant'; // Corrigido para RestaurantProfile
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';

interface RestaurantAddressHoursSectionProps {
  restaurant: RestaurantProfile;
  addressItems: { icon: JSX.Element; value: string; link?: string; isExternal?: boolean }[];
  fullAddress: string;
  paymentMethods: string[];
}

const RestaurantAddressHoursSection: React.FC<RestaurantAddressHoursSectionProps> = ({
  restaurant,
  addressItems,
  fullAddress,
  paymentMethods,
}) => {
  const { opening_hours } = restaurant;

  return (
    <Card className="p-4 shadow-soft-md rounded-xl bg-white border border-gray-300">
      <h2 className="text-2xl font-bold text-primary mb-3">Informações</h2>
      <div className="space-y-4">
        {/* Endereço */}
        <div className="space-y-4">
          <div className="flex items-start">
            {addressItems[0].icon}
            <div className="ml-3 min-w-0">
              {addressItems[0].link ? (
                <a
                  href={addressItems[0].link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base font-bold text-primary hover:text-primary/90 transition-colors break-words flex items-center mt-2"
                >
                  {addressItems[0].value}
                  {addressItems[0].isExternal && <ExternalLink className="w-4 h-4 ml-1 flex-shrink-0" />}
                </a>
              ) : (
                <p className="text-base font-bold text-primary break-words mt-2">{addressItems[0].value}</p>
              )}
            </div>
          </div>
        </div>

        {/* Separator between Address and Opening Hours */}
        {fullAddress && opening_hours && <Separator className="my-4 bg-gray-100" />}

        {/* Horário de Funcionamento */}
        {opening_hours && (
          <div className="pt-4">
            <div className="flex items-start">
              <Clock className="w-5 h-5 text-gray-500 mt-1 flex-shrink-0" />
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
            {/* Separator between Opening Hours and Payment Methods */}
            {(fullAddress || opening_hours) && <Separator className="my-4 bg-gray-100" />}
            <div className="pt-4">
              <div className="flex items-start">
                <CreditCard className="w-5 h-5 text-gray-500 mt-1 flex-shrink-0" />
                <div className="ml-3 min-w-0">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Formas de Pagamento</p>
                  <div className="flex flex-wrap gap-2">
                    {paymentMethods.map((method, index) => (
                      <span key={index} className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">
                        {method}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
};

export default RestaurantAddressHoursSection;
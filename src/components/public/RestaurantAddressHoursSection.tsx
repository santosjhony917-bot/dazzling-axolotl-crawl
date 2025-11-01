"use client";

import React, { useMemo } from 'react';
import { MapPin, Clock } from 'lucide-react';
import { PublicRestaurantData } from '@/types/restaurant';
import { OpeningHoursDisplay } from '@/components/public/OpeningHoursDisplay';
import { processSchedule } from '@/lib/schedule'; // Import the processing utility

interface RestaurantAddressHoursSectionProps {
  restaurant: PublicRestaurantData;
}

const RestaurantAddressHoursSection: React.FC<RestaurantAddressHoursSectionProps> = ({ restaurant }) => {
  const { address, city, state, cep, opening_hours, statusText, isOpen } = restaurant;

  const fullAddress = [address, city, state, cep].filter(Boolean).join(', ');

  const processedSchedule = useMemo(() => {
    return processSchedule(opening_hours);
  }, [opening_hours]);

  return (
    <div className="space-y-6 p-4 border-t border-gray-200">
      {/* Endereço */}
      {(fullAddress || restaurant.latitude) && (
        <div className="flex items-start space-x-3 text-gray-600">
          <MapPin className="w-5 h-5 flex-shrink-0 mt-1 text-gray-500" />
          <div className="flex-1">
            <p className="font-medium text-sm text-gray-800 mb-1">Localização</p>
            {fullAddress ? (
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-600 hover:text-blue-800 transition-colors text-base"
              >
                {fullAddress}
              </a>
            ) : (
              <p className="text-base">Localização definida no mapa.</p>
            )}
          </div>
        </div>
      )}

      {/* Horário de Funcionamento */}
      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          <Clock className="w-5 h-5 text-gray-500" />
          <div className="flex-1">
            <p className="font-medium text-sm text-gray-800">Status Atual</p>
            <p className={`text-base font-semibold ${isOpen ? 'text-green-600' : 'text-red-600'}`}>
              {statusText}
            </p>
          </div>
        </div>

        {processedSchedule && (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Horário de Funcionamento</p>
            <OpeningHoursDisplay openingHours={processedSchedule} />
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantAddressHoursSection;
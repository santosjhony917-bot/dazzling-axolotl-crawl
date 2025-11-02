import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Clock, ExternalLink } from 'lucide-react';
import { OpeningHoursDisplay } from './OpeningHoursDisplay';
import { PublicRestaurantData, WeekSchedule } from '@/types/restaurant';

interface RestaurantAddressHoursSectionProps {
  id: string;
  restaurant: PublicRestaurantData;
  fullAddress: string | null;
}

const RestaurantAddressHoursSection: React.FC<RestaurantAddressHoursSectionProps> = ({ id, restaurant, fullAddress }) => {
  const { opening_hours } = restaurant;

  // Converte opening_hours para WeekSchedule para OpeningHoursDisplay
  // Adicionado 'unknown' para forçar a conversão, pois o tipo Json é muito genérico.
  const currentOpeningHours = opening_hours as unknown as WeekSchedule;

  if (!fullAddress && !currentOpeningHours) {
    return null;
  }

  return (
    <Card id={id} className="shadow-soft-md border-none rounded-xl p-0">
      <CardHeader className="flex flex-row items-center space-x-3 p-4 border-b border-gray-100">
        <MapPin className="w-6 h-6 text-primary" />
        <CardTitle className="text-2xl font-extrabold text-primary">Endereço e Horário</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {fullAddress && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-gray-700">Endereço</p>
            <div className="flex items-start">
              <MapPin className="w-5 h-5 text-highlight mt-1 flex-shrink-0" />
              <p className="ml-3 text-base text-gray-900 break-words">{fullAddress}</p>
            </div>
          </div>
        )}

        {currentOpeningHours && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Horário de Funcionamento</p>
            <OpeningHoursDisplay openingHours={currentOpeningHours} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RestaurantAddressHoursSection;
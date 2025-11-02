import React from 'react';
import { MapPin, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import OpeningHoursDisplay from '@/components/restaurant/OpeningHoursDisplay';
import { PublicRestaurantData } from '@/types/restaurant'; // Importar PublicRestaurantData
import { WeekSchedule } from '@/types/schedule'; // Importar WeekSchedule do novo arquivo

interface RestaurantAddressHoursSectionProps {
  restaurant: PublicRestaurantData;
}

const RestaurantAddressHoursSection: React.FC<RestaurantAddressHoursSectionProps> = ({ restaurant }) => {
  const { address, number, neighborhood, city, state, cep, opening_hours } = restaurant;

  const addressParts = [
    address,
    number,
    neighborhood,
    city,
    state,
    cep,
  ].filter(Boolean);

  const hasAddress = addressParts.length > 0;
  const hasOpeningHours = opening_hours && Object.keys(opening_hours).length > 0;

  if (!hasAddress && !hasOpeningHours) {
    return null;
  }

  return (
    <Card className="w-full shadow-soft-md rounded-xl">
      <CardHeader className="p-4 pb-0">
        <CardTitle className="text-2xl font-extrabold text-[#022D68] tracking-tight">Localização e Horário</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-6">
        {hasAddress && (
          <div>
            <h3 className="text-lg font-bold text-[#022D68] mb-3">Endereço</h3>
            <div className="flex items-start gap-3 text-gray-700">
              <MapPin className="w-5 h-5 text-highlight mt-1" />
              <p className="text-base">{addressParts.join(', ')}</p>
            </div>
          </div>
        )}

        {hasOpeningHours && (
          <div>
            <h3 className="text-lg font-bold text-[#022D68] mb-3">Horário de Funcionamento</h3>
            <OpeningHoursDisplay openingHours={opening_hours as WeekSchedule} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RestaurantAddressHoursSection;
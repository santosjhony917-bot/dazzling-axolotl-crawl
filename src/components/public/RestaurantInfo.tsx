import React from 'react';
import { PublicRestaurantData } from '@/types/restaurant';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import OpeningHoursDisplay from './OpeningHoursDisplay';
import { WeekSchedule } from '@/types/schedule'; // Importando WeekSchedule

interface RestaurantInfoProps {
  id: string;
  restaurant: PublicRestaurantData;
  scheduleDisplay: WeekSchedule; // Usando WeekSchedule
  fullAddress: string;
}

const RestaurantInfo: React.FC<RestaurantInfoProps> = ({ 
  id, 
  restaurant, 
  scheduleDisplay, 
  fullAddress 
}) => {
  const { phone, email, opening_hours } = restaurant;

  return (
    <div id={id} className="space-y-4 pt-4">
      <h2 className="text-xl font-bold text-primary">Informações</h2>
      
      {/* Endereço */}
      {fullAddress && (
        <div className="flex items-start space-x-3">
          <MapPin className="h-5 w-5 text-highlight mt-1 shrink-0" />
          <div className="flex-1">
            <p className="text-base font-semibold text-primary">Endereço</p>
            <p className="text-sm text-gray-600">{fullAddress}</p>
          </div>
        </div>
      )}
      
      {/* Horário de Funcionamento */}
      {opening_hours && (
        <div className="pt-2">
          <div className="flex items-start space-x-3">
            <Clock className="h-5 w-5 text-highlight mt-1 shrink-0" />
            <div className="flex-1">
              <p className="text-base font-semibold text-primary">Horário de Funcionamento</p>
              {/* Passando scheduleDisplay (WeekSchedule) em vez de opening_hours (OpeningHours[]) */}
              <OpeningHoursDisplay openingHours={scheduleDisplay} /> 
            </div>
          </div>
        </div>
      )}
      
      {/* Contato (Telefone/Email) */}
      {(phone || email) && (
        <div className="space-y-2 pt-2">
          <p className="text-base font-semibold text-primary">Contato</p>
          {phone && (
            <a href={`tel:${phone}`} className="flex items-center space-x-3 text-gray-700 hover:text-highlight transition-colors">
              <Phone className="h-5 w-5 text-highlight" />
              <span>{phone}</span>
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} className="flex items-center space-x-3 text-gray-700 hover:text-highlight transition-colors">
              <Mail className="h-5 w-5 text-highlight" />
              <span>{email}</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default RestaurantInfo;
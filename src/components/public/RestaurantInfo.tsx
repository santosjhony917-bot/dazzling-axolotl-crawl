"use client";

import React from 'react';
import { PublicRestaurantData } from '@/types/restaurant';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

interface RestaurantInfoProps {
  restaurant: PublicRestaurantData;
}

const RestaurantInfo: React.FC<RestaurantInfoProps> = ({ restaurant }) => {
  return (
    <div className="py-4">
      <h2 className="text-xl font-bold text-primary mb-4">Informações</h2>
      <div className="space-y-3 text-gray-700">
        {restaurant.address && (
          <div className="flex items-start">
            <MapPin className="h-5 w-5 text-primary mr-2 mt-1 flex-shrink-0" />
            <p>{restaurant.address}, {restaurant.number} - {restaurant.neighborhood}, {restaurant.city} - {restaurant.state}, {restaurant.cep}</p>
          </div>
        )}
        {restaurant.phone && (
          <div className="flex items-center">
            <Phone className="h-5 w-5 text-primary mr-2" />
            <p>{restaurant.phone}</p>
          </div>
        )}
        {restaurant.email && (
          <div className="flex items-center">
            <Mail className="h-5 w-5 text-primary mr-2" />
            <p>{restaurant.email}</p>
          </div>
        )}
        {restaurant.opening_hours && (
          <div className="flex items-start">
            <Clock className="h-5 w-5 text-primary mr-2 mt-1 flex-shrink-0" />
            <div>
              <p className="font-semibold">Horário de Funcionamento:</p>
              {/* Exemplo básico, você pode formatar melhor */}
              {Object.entries(restaurant.opening_hours).map(([day, hours]) => (
                <p key={day} className="capitalize">{day}: {hours as string}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantInfo;
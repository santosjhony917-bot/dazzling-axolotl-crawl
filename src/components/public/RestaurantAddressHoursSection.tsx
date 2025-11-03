"use client";

import { MapPin, Clock, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Restaurant } from "@/types/restaurant";
import { formatOpeningHours } from "@/lib/utils";

interface RestaurantAddressHoursSectionProps {
  restaurant: Restaurant;
}

export function RestaurantAddressHoursSection({ restaurant }: RestaurantAddressHoursSectionProps) {
  const { address, number, neighborhood, city, state, cep, latitude, longitude, opening_hours } = restaurant;

  const fullAddress = [address, number, neighborhood, city, state, cep].filter(Boolean).join(", ");

  const googleMapsLink =
    latitude && longitude
      ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;

  const addressItems = [
    {
      icon: <MapPin className="w-5 h-5 text-primary flex-shrink-0" />,
      value: fullAddress,
      link: googleMapsLink,
      isExternal: true,
    },
  ];

  const openingHoursItems = [
    {
      icon: <Clock className="w-5 h-5 text-primary flex-shrink-0" />,
      value: formatOpeningHours(opening_hours),
    },
  ];

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg">
      <CardHeader className="bg-gradient-to-r from-primary to-secondary text-white p-4 rounded-t-lg flex flex-row items-center justify-between">
        {/* Ícone MapPin removido conforme solicitado */}
        <CardTitle className="text-2xl font-extrabold text-white">Gerais</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-6">
        {/* Endereço */}
        <div className="space-y-4">
          <div className="flex items-start">
            {addressItems[0].icon} {/* Renderiza o ícone do array */}
            <div className="ml-3 min-w-0">
              <p className="text-sm font-semibold text-gray-700 mb-2">Localização</p>
              {addressItems[0].link ? (
                <a 
                  href={addressItems[0].link} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-base font-bold text-primary hover:text-primary/90 transition-colors break-words flex items-center"
                >
                  {addressItems[0].value}
                  {addressItems[0].isExternal && <ExternalLink className="w-4 h-4 ml-1 flex-shrink-0" />}
                </a>
              ) : (
                <p className="text-base font-bold text-primary break-words">{addressItems[0].value}</p>
              )}
            </div>
          </div>
        </div>

        {/* Separator between Address and Opening Hours */}
        <div className="border-t border-gray-200 my-4"></div>

        {/* Horário de Funcionamento */}
        <div className="space-y-4">
          <div className="flex items-start">
            {openingHoursItems[0].icon}
            <div className="ml-3 min-w-0">
              <p className="text-sm font-semibold text-gray-700 mb-2">Horário de Funcionamento</p>
              <p className="text-base font-bold text-primary break-words whitespace-pre-line">
                {openingHoursItems[0].value}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
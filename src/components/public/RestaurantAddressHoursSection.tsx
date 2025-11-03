"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Clock, Phone, Mail, Link as LinkIcon } from "lucide-react";
import { PublicRestaurantData } from "@/types/restaurant";
import { formatOpeningHours } from "@/lib/utils";
import { Link } from "react-router-dom";

interface RestaurantAddressHoursSectionProps {
  restaurant: PublicRestaurantData;
}

export function RestaurantAddressHoursSection({ restaurant }: RestaurantAddressHoursSectionProps) {
  const hasAddress = restaurant.address && restaurant.number && restaurant.neighborhood && restaurant.city && restaurant.state && restaurant.cep;
  const hasContact = restaurant.phone || restaurant.email || restaurant.whatsapp_url || restaurant.ifood_url || restaurant.other_url;
  const hasOpeningHours = restaurant.opening_hours && Object.values(restaurant.opening_hours).some(day => day.isOpen && day.slots.length > 0); // Adjusted check for opening hours

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg">
      <CardHeader className="pb-0">
        {/* Ícone MapPin removido conforme solicitado */}
        <CardTitle className="text-2xl font-extrabold text-primary">Gerais</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-6">
        {hasAddress && (
          <div className="flex items-start space-x-3">
            <MapPin className="h-6 w-6 text-gray-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Endereço</h3>
              <p className="text-gray-600">
                {restaurant.address}, {restaurant.number} - {restaurant.neighborhood}, {restaurant.city} - {restaurant.state}, {restaurant.cep}
              </p>
            </div>
          </div>
        )}

        {hasOpeningHours && (
          <div className="flex items-start space-x-3">
            <Clock className="h-6 w-6 text-gray-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Horário de Funcionamento</h3>
              <div className="text-gray-600">
                {formatOpeningHours(restaurant.opening_hours).map((line, index) => ( // Removed type cast
                  <p key={index}>{line}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {hasContact && (
          <div className="flex items-start space-x-3">
            <Phone className="h-6 w-6 text-gray-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Contato</h3>
              <div className="space-y-1">
                {restaurant.phone && (
                  <p className="text-gray-600 flex items-center">
                    <Phone className="h-4 w-4 mr-2" /> {restaurant.phone}
                  </p>
                )}
                {restaurant.email && (
                  <p className="text-gray-600 flex items-center">
                    <Mail className="h-4 w-4 mr-2" /> {restaurant.email}
                  </p>
                )}
                {restaurant.whatsapp_url && (
                  <Link to={restaurant.whatsapp_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center">
                    <LinkIcon className="h-4 w-4 mr-2" /> WhatsApp
                  </Link>
                )}
                {restaurant.ifood_url && (
                  <Link to={restaurant.ifood_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center">
                    <LinkIcon className="h-4 w-4 mr-2" /> iFood
                  </Link>
                )}
                {restaurant.other_url && (
                  <Link to={restaurant.other_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center">
                    <LinkIcon className="h-4 w-4 mr-2" /> {restaurant.other_url_label || "Outro Link"}
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
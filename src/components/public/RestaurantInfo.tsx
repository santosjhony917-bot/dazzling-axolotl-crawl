"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Mail, MapPin, Clock, Globe, Instagram, Facebook, Link as LinkIcon } from 'lucide-react';
import { Restaurant } from '@/types/supabase'; // Assumindo que este tipo existe

interface RestaurantInfoProps {
  restaurant: Restaurant;
}

const RestaurantInfo: React.FC<RestaurantInfoProps> = ({ restaurant }) => {
  const contactItems = [];
  if (restaurant.phone) {
    contactItems.push({ icon: Phone, text: restaurant.phone, link: `tel:${restaurant.phone}` });
  }
  if (restaurant.email) {
    contactItems.push({ icon: Mail, text: restaurant.email, link: `mailto:${restaurant.email}` });
  }

  const socialNetworkItems = [];
  if (restaurant.social_networks && Array.isArray(restaurant.social_networks)) {
    restaurant.social_networks.forEach((network: any) => {
      if (network.type === 'instagram' && network.url) {
        socialNetworkItems.push({ icon: Instagram, text: 'Instagram', link: network.url });
      } else if (network.type === 'facebook' && network.url) {
        socialNetworkItems.push({ icon: Facebook, text: 'Facebook', link: network.url });
      } else if (network.type === 'website' && network.url) {
        socialNetworkItems.push({ icon: Globe, text: 'Website', link: network.url });
      }
    });
  }

  const hasAddress = restaurant.address && restaurant.number && restaurant.neighborhood && restaurant.city && restaurant.state && restaurant.cep;
  const fullAddress = hasAddress
    ? `${restaurant.address}, ${restaurant.number} - ${restaurant.neighborhood}, ${restaurant.city} - ${restaurant.state}, ${restaurant.cep}`
    : null;

  const hasOpeningHours = restaurant.opening_hours && Object.keys(restaurant.opening_hours).length > 0;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Phone className="h-6 w-6" /> Contato e Links
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-6">
        {/* Contato Direto */}
        {restaurant.plan !== 'free' && contactItems.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contato Direto</h3>
            {contactItems.map((item, index) => (
              <a key={index} href={item.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-700 hover:text-blue-600">
                <item.icon className="h-5 w-5" /> {item.text}
              </a>
            ))}
          </div>
        )}

        {/* Outras Redes */}
        {restaurant.plan !== 'free' && socialNetworkItems.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Outras Redes</h3>
            {socialNetworkItems.map((item, index) => (
              <a key={index} href={item.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-700 hover:text-blue-600">
                <item.icon className="h-5 w-5" /> {item.text}
              </a>
            ))}
          </div>
        )}

        {/* Endereço */}
        {fullAddress && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Endereço</h3>
            <a href={`https://www.google.com/maps/search/?api=1&query=${restaurant.latitude},${restaurant.longitude}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-700 hover:text-blue-600">
              <MapPin className="h-5 w-5" /> {fullAddress}
            </a>
          </div>
        )}

        {/* Horário de Funcionamento */}
        {hasOpeningHours && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Horário de Funcionamento</h3>
            {Object.entries(restaurant.opening_hours).map(([day, hours]: [string, any]) => (
              <div key={day} className="flex items-center gap-2 text-gray-700">
                <Clock className="h-5 w-5" />
                <span className="font-medium capitalize">{day}:</span>
                <span>{hours.open} - {hours.close}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RestaurantInfo;
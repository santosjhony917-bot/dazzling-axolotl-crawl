"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Mail, MapPin, Globe } from 'lucide-react';

interface RestaurantContactProps {
  restaurant: any;
}

const RestaurantContact: React.FC<RestaurantContactProps> = ({ restaurant }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contato</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {restaurant.address && (
          <div className="flex items-center text-gray-700 dark:text-gray-300">
            <MapPin className="mr-2 h-5 w-5 text-primary" />
            <span>{restaurant.address}, {restaurant.number} - {restaurant.neighborhood}, {restaurant.city} - {restaurant.state}, {restaurant.cep}</span>
          </div>
        )}
        {restaurant.phone && (
          <div className="flex items-center text-gray-700 dark:text-gray-300">
            <Phone className="mr-2 h-5 w-5 text-primary" />
            <a href={`tel:${restaurant.phone}`} className="hover:underline">{restaurant.phone}</a>
          </div>
        )}
        {restaurant.email && (
          <div className="flex items-center text-gray-700 dark:text-gray-300">
            <Mail className="mr-2 h-5 w-5 text-primary" />
            <a href={`mailto:${restaurant.email}`} className="hover:underline">{restaurant.email}</a>
          </div>
        )}
        {restaurant.external_url && (
          <div className="flex items-center text-gray-700 dark:text-gray-300">
            <Globe className="mr-2 h-5 w-5 text-primary" />
            <a href={restaurant.external_url} target="_blank" rel="noopener noreferrer" className="hover:underline">Website</a>
          </div>
        )}
        {/* Adicione links para redes sociais, WhatsApp, iFood, etc. aqui */}
      </CardContent>
    </Card>
  );
};

export default RestaurantContact;
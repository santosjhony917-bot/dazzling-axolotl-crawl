"use client";

import React from 'react';
import { MapPin, Phone, Mail, Link as LinkIcon, Utensils, Clock, CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import ProfileHeaderManagement from '@/components/restaurant/profile/ProfileHeaderManagement'; // Import as default

interface Restaurant {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  cover_image_url: string | null;
  category: string | null;
  phone: string | null;
  email: string | null;
  whatsapp_url: string | null;
  ifood_url: string | null;
  other_url: string | null;
  other_url_label: string | null;
  address: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
  opening_hours: any | null; // TODO: Define a more specific type
}

interface MainProfileCardProps {
  restaurant: Restaurant;
}

const MainProfileCard: React.FC<MainProfileCardProps> = ({ restaurant }) => {
  const formatAddress = () => {
    const parts = [];
    if (restaurant.address) parts.push(restaurant.address);
    if (restaurant.number) parts.push(`, ${restaurant.number}`);
    if (restaurant.neighborhood) parts.push(` - ${restaurant.neighborhood}`);
    if (restaurant.city) parts.push(`, ${restaurant.city}`);
    if (restaurant.state) parts.push(`/${restaurant.state}`);
    if (restaurant.cep) parts.push(` - ${restaurant.cep}`);
    return parts.join('');
  };

  const formatOpeningHours = () => {
    if (!restaurant.opening_hours || Object.keys(restaurant.opening_hours).length === 0) {
      return 'Horário não definido';
    }
    // This is a simplified example. A real implementation would parse and display
    // opening hours more robustly, potentially for each day.
    const days = Object.keys(restaurant.opening_hours);
    if (days.length === 7 && days.every(day => restaurant.opening_hours[day].length > 0)) {
      return '7 dias abertos. Ex: 09:00 - 18:00'; // Placeholder
    }
    return 'Horários específicos definidos';
  };

  return (
    <Card className="relative mt-16">
      <ProfileHeaderManagement restaurant={restaurant} />
      <CardHeader className="pt-20 pb-4 px-6">
        <CardTitle className="text-3xl font-bold">{restaurant.name}</CardTitle>
        {restaurant.description && (
          <p className="text-gray-600 dark:text-gray-400 mt-2">{restaurant.description}</p>
        )}
      </CardHeader>
      <CardContent className="px-6 pb-6 space-y-4">
        <div className="flex items-center text-gray-700 dark:text-gray-300">
          <Utensils className="h-5 w-5 mr-3 text-primary" />
          <span>{restaurant.category || 'Categoria não definida'}</span>
        </div>

        <div className="flex items-start text-gray-700 dark:text-gray-300">
          <MapPin className="h-5 w-5 mr-3 text-primary flex-shrink-0 mt-1" />
          <span>{formatAddress() || 'Endereço não definido'}</span>
        </div>

        {restaurant.phone && (
          <div className="flex items-center text-gray-700 dark:text-gray-300">
            <Phone className="h-5 w-5 mr-3 text-primary" />
            <span>{restaurant.phone}</span>
          </div>
        )}

        {restaurant.email && (
          <div className="flex items-center text-gray-700 dark:text-gray-300">
            <Mail className="h-5 w-5 mr-3 text-primary" />
            <span>{restaurant.email}</span>
          </div>
        )}

        <div className="flex items-center text-gray-700 dark:text-gray-300">
          <Clock className="h-5 w-5 mr-3 text-primary" />
          <span>{formatOpeningHours()}</span>
        </div>

        <Separator />

        <h3 className="text-lg font-semibold mb-2">Links Úteis</h3>
        <div className="space-y-2">
          {restaurant.whatsapp_url && (
            <a href={restaurant.whatsapp_url} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:underline dark:text-blue-400">
              <LinkIcon className="h-4 w-4 mr-2" /> WhatsApp
            </a>
          )}
          {restaurant.ifood_url && (
            <a href={restaurant.ifood_url} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:underline dark:text-blue-400">
              <LinkIcon className="h-4 w-4 mr-2" /> iFood
            </a>
          )}
          {restaurant.other_url && (
            <a href={restaurant.other_url} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:underline dark:text-blue-400">
              <LinkIcon className="h-4 w-4 mr-2" /> {restaurant.other_url_label || 'Outro Link'}
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MainProfileCard;
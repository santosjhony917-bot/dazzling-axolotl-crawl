import React from 'react';
import { Phone, Mail, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Restaurant } from '@/types/supabase';

interface RestaurantContactSectionProps {
  id: string;
  restaurant: Restaurant;
  isPremium: boolean;
}

const RestaurantContactSection: React.FC<RestaurantContactSectionProps> = ({ id, restaurant, isPremium }) => {
  return (
    <Card id={id} className="shadow-none">
      <CardHeader className="flex flex-row items-center space-x-3 p-4 border-b">
        <Phone className="w-6 h-6 text-primary" />
        <CardTitle className="text-xl font-semibold">Contato</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {restaurant.phone && (
          <div className="flex items-center space-x-3">
            <Phone className="w-5 h-5 text-gray-500" />
            <a href={`tel:${restaurant.phone}`} className="text-primary hover:underline">{restaurant.phone}</a>
          </div>
        )}
        {restaurant.email && (
          <div className="flex items-center space-x-3">
            <Mail className="w-5 h-5 text-gray-500" />
            <a href={`mailto:${restaurant.email}`} className="text-primary hover:underline">{restaurant.email}</a>
          </div>
        )}
        {isPremium && restaurant.external_url && (
          <div className="flex items-center space-x-3">
            <Globe className="w-5 h-5 text-gray-500" />
            <a href={restaurant.external_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              {restaurant.external_url}
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RestaurantContactSection;
import React from 'react';
import { PublicRestaurantData } from '@/pages/RestaurantProfilePublic';
import { Phone, Mail, MapPin } from 'lucide-react';

interface AboutSectionProps {
  restaurant: PublicRestaurantData;
  isPremium: boolean;
}

const AboutSection: React.FC<AboutSectionProps> = ({ restaurant }) => {
  return (
    <section className="py-6">
      <h2 className="text-2xl font-bold mb-4">Sobre {restaurant.name}</h2>
      <p className="text-gray-700 leading-relaxed mb-4">{restaurant.description || 'Nenhuma descrição disponível.'}</p>

      <div className="space-y-2">
        {restaurant.phone && (
          <p className="flex items-center text-gray-700">
            <Phone className="w-4 h-4 mr-2 text-primary" /> {restaurant.phone}
          </p>
        )}
        {restaurant.email && (
          <p className="flex items-center text-gray-700">
            <Mail className="w-4 h-4 mr-2 text-primary" /> {restaurant.email}
          </p>
        )}
        {restaurant.addressSummary && (
          <p className="flex items-center text-gray-700">
            <MapPin className="w-4 h-4 mr-2 text-primary" /> {restaurant.addressSummary}
          </p>
        )}
      </div>
    </section>
  );
};

export default AboutSection;
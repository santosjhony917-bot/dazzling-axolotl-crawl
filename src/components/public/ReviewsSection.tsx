import React from 'react';
import { PublicRestaurantData } from '@/pages/RestaurantProfilePublic';
import { Star } from 'lucide-react';

interface ReviewsSectionProps {
  restaurant: PublicRestaurantData;
  isPremium: boolean;
}

const ReviewsSection: React.FC<ReviewsSectionProps> = ({ restaurant }) => {
  // Placeholder para futuras avaliações
  return (
    <section className="py-6">
      <h2 className="text-2xl font-bold mb-4">Avaliações</h2>
      <div className="flex items-center text-gray-600">
        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400 mr-1" />
        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400 mr-1" />
        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400 mr-1" />
        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400 mr-1" />
        <Star className="w-5 h-5 text-gray-300 fill-gray-300 mr-2" />
        <span>(4.0 de 5 estrelas - 120 avaliações)</span>
      </div>
      <p className="text-gray-600 mt-2">Recurso de avaliações em desenvolvimento.</p>
    </section>
  );
};

export default ReviewsSection;
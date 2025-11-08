import React from 'react';
import { formatCurrency } from '@/lib/utils'; // Alterado de formatPrice para formatCurrency
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';
import { Link } from 'react-router-dom';

interface PublicMenuItemCardProps {
  item: {
    id: string;
    name: string;
    description?: string;
    price: number;
    image_url?: string;
  };
  restaurantId: string;
}

const PublicMenuItemCard: React.FC<PublicMenuItemCardProps> = ({ item, restaurantId }) => {
  return (
    <Link to={`/restaurants/${restaurantId}/menu/${item.id}`} className="block">
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <img
          src={item.image_url || PLACEHOLDER_IMAGE_URL}
          alt={item.name}
          className="w-full h-32 object-cover"
        />
        <div className="p-3">
          <h3 className="font-semibold text-base text-gray-900 line-clamp-1">{item.name}</h3>
          {item.description && (
            <p className="text-xs text-gray-600 line-clamp-2 mt-1">{item.description}</p>
          )}
          <p className="font-bold text-orange-600 text-base mt-2">{formatCurrency(item.price)}</p>
        </div>
      </div>
    </Link>
  );
};

export default PublicMenuItemCard;
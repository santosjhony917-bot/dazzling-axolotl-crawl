import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';
import { Link } from 'react-router-dom';

interface SearchItemCardProps {
  item_id: string;
  item_name: string;
  item_description: string;
  item_price: number;
  item_image_url?: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_category: string;
  onClick: (itemId: string, type: 'dish' | 'restaurant') => void; // Adicionado a prop onClick
}

const SearchItemCard: React.FC<SearchItemCardProps> = ({
  item_id,
  item_name,
  item_description,
  item_price,
  item_image_url,
  restaurant_id,
  restaurant_name,
  restaurant_category,
  onClick, // Desestruturado a prop onClick
}) => {
  return (
    <div onClick={() => onClick(item_id, 'dish')} className="block cursor-pointer"> {/* Usando div e onClick */}
      <div className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
        <img
          src={item_image_url || PLACEHOLDER_IMAGE_URL}
          alt={item_name}
          className="w-20 h-20 object-cover rounded-md flex-shrink-0"
        />
        <div className="flex-grow">
          <h3 className="font-semibold text-lg text-gray-900">{item_name}</h3>
          <p className="text-sm text-gray-600 line-clamp-2">{item_description}</p>
          <p className="text-xs text-gray-500 mt-1">
            {restaurant_name} ({restaurant_category})
          </p>
        </div>
        <p className="font-bold text-orange-600 text-lg flex-shrink-0">
          {formatCurrency(item_price)}
        </p>
      </div>
    </div>
  );
};

export default SearchItemCard;
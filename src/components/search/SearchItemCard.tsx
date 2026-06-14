import React from 'react';
import { formatPrice } from '@/utils/formatters';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';
import { MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { useImageCacheBuster } from '@/hooks/useImageCacheBuster';

interface SearchItem {
  id: string;
  name: string;
  description: string | null;
  price?: number;
  imageUrl: string | null;
  type: 'dish' | 'restaurant';
  category?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  restaurantName?: string | null;
  itemCategoryName?: string | null;
}

interface SearchItemCardProps {
  item: SearchItem;
  onClick: (itemId: string, type: 'dish' | 'restaurant') => void;
}

const SearchItemCard: React.FC<SearchItemCardProps> = ({ item, onClick }) => {
  const isDish = item.type === 'dish';
  const formattedPrice = item.price ? formatPrice(item.price) : null;
  const displayDescription = isDish 
    ? `${item.restaurantName}${item.itemCategoryName ? ` • ${item.itemCategoryName}` : ''}`
    : item.category;
  const getBustedUrl = useImageCacheBuster();

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(item.id, item.type)}
      className="w-full"
    >
      <div className="soft-card flex items-center gap-4 p-4 w-full mb-4 cursor-pointer">
        
        <div 
          className="bg-center bg-no-repeat bg-cover rounded-[12px] w-20 h-20 flex-shrink-0 bg-gray-100" 
          style={{ backgroundImage: `url("${getBustedUrl(item.imageUrl) || PLACEHOLDER_IMAGE_URL}")` }}
          data-alt={item.name}
        />
        
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <p className="text-[#3C2F2F] text-[18px] font-bold leading-tight truncate">
            {item.name}
          </p>
          
          {isDish && formattedPrice && (
            <p className="text-[#EF2A39] text-[16px] font-bold mt-1">
              {formattedPrice}
            </p>
          )}
          
          {displayDescription && (
            <p className="text-[#6A6A6A] text-[13px] font-medium truncate mt-0.5">
              {displayDescription}
            </p>
          )}
          
          {!isDish && item.neighborhood && (
            <p className="text-[#6A6A6A] text-[12px] flex items-center gap-1 mt-1 font-medium">
              <MapPin className="w-3.5 h-3.5 text-[#EF2A39]" /> {item.neighborhood}
            </p>
          )}
        </div>

      </div>
    </motion.div>
  );
};

export default SearchItemCard;
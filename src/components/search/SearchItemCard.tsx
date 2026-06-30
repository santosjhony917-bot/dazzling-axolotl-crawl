import React from 'react';
import { formatMenuPrice } from '@/utils/menuPricing';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';
import { MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { useImageCacheBuster } from '@/hooks/useImageCacheBuster';

interface SearchItem {
  id: string;
  name: string;
  description: string | null;
  price?: number;
  priceType?: string | null;
  displayPrice?: number | null;
  priceMin?: number | null;
  priceMax?: number | null;
  commercialType?: string | null;
  isConfigurable?: boolean | null;
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
  const isCombo = isDish && item.commercialType === 'combo_builder';
  const getBustedUrl = useImageCacheBuster();

  const formattedPrice = isDish
    ? formatMenuPrice({
        price: item.price,
        display_price: item.displayPrice,
        price_min: item.priceMin,
        price_max: item.priceMax,
        price_type: item.priceType,
        commercial_type: item.commercialType,
        is_configurable: item.isConfigurable,
      })
    : null;

  const displayDescription = isDish
    ? `${item.restaurantName}${item.itemCategoryName ? ` - ${item.itemCategoryName}` : ''}${item.neighborhood ? ` - ${item.neighborhood}` : ''}`
    : item.category;

  return (
    <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.99 }} onClick={() => onClick(item.id, item.type)}>
      <div className="mb-3 flex w-full cursor-pointer items-center gap-3 rounded-[22px] border border-slate-100 bg-white p-3 shadow-soft">
        <div className="relative h-[76px] w-[76px] flex-shrink-0 overflow-hidden rounded-[16px] bg-slate-100">
          <img
            src={getBustedUrl(item.imageUrl) || PLACEHOLDER_IMAGE_URL}
            alt={item.name}
            className={isDish ? "h-full w-full object-contain" : "h-full w-full object-cover"}
          />
          {isDish && item.imageUrl && item.imageUrl !== PLACEHOLDER_IMAGE_URL && (
            <div className="absolute right-1 top-1 rounded-full bg-black/35 px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wide text-white">
              Foto
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-[16px] font-semibold leading-tight text-[#3C2F2F]">{item.name}</p>
            {isCombo && (
              <span className="shrink-0 rounded-full bg-highlight/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-highlight">
                Combo
              </span>
            )}
          </div>

          {isDish && formattedPrice && (
            <p className="mt-1 text-[15px] font-semibold text-highlight">{formattedPrice}</p>
          )}

          {displayDescription && (
            <p className="mt-0.5 truncate text-[13px] font-normal text-text-secondary">{displayDescription}</p>
          )}

          {!isDish && item.neighborhood && (
            <p className="mt-1 flex items-center gap-1 text-[12px] font-normal text-text-secondary">
              <MapPin className="h-3.5 w-3.5 text-highlight" /> {item.neighborhood}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default SearchItemCard;

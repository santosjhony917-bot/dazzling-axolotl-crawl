import React from 'react';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
}

interface PublicMenuItemCardProps {
  item: MenuItem;
}

const PublicMenuItemCard: React.FC<PublicMenuItemCardProps> = ({ item }) => {
  const formattedPrice = `R$ ${item.price.toFixed(2).replace('.', ',')}`;

  return (
    <div className="flex items-center gap-4 bg-white dark:bg-background-dark rounded-lg p-2 shadow-sm border border-gray-100 dark:border-gray-700">
      <div 
        className="bg-center bg-no-repeat aspect-square bg-cover rounded-lg size-16 flex-shrink-0" 
        style={{ backgroundImage: `url("${item.imageUrl}")` }}
        data-alt={item.name}
      />
      <div className="flex-1">
        <p className="text-[#111418] dark:text-white text-base font-bold leading-normal">{item.name}</p>
        <p className="text-[#5f728c] dark:text-gray-400 text-sm font-normal leading-normal">{formattedPrice}</p>
      </div>
    </div>
  );
};

export default PublicMenuItemCard;
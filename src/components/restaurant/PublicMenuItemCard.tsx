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
  const formattedPrice = item.price != null ? `R$ ${item.price.toFixed(2).replace('.', ',')}` : 'Preço sob consulta';

  return (
    <div className="flex items-center gap-4 bg-white dark:bg-background-dark rounded-xl p-2 shadow-none border border-gray-100 dark:border-gray-700">
      <div 
        className="bg-center bg-no-repeat aspect-square bg-cover rounded-xl size-16 flex-shrink-0" 
        style={{ backgroundImage: `url("${item.imageUrl}")` }}
        data-alt={item.name}
      />
      <div className="flex-1">
        <p className="text-[#111418] dark:text-white text-base font-bold leading-normal">{item.name}</p>
        <p className="text-text-secondary dark:text-gray-400 text-sm font-normal leading-normal">{formattedPrice}</p>
      </div>
    </div>
  );
};

export default PublicMenuItemCard;
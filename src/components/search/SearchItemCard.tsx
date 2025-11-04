import React from 'react';

interface SearchItemCardProps {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl: string;
  restaurantName: string; // Nova propriedade para o nome do restaurante
  onClick: (id: string) => void; // Alterado para aceitar o id
}

const SearchItemCard: React.FC<SearchItemCardProps> = ({
  id,
  name,
  price,
  description,
  imageUrl,
  restaurantName,
  onClick,
}) => {
  return (
    <div
      onClick={() => onClick(id)} // Passa o id do item ao clicar
      className="flex items-center gap-4 bg-white dark:bg-background-dark rounded-2xl p-4 shadow-soft-lg cursor-pointer hover:shadow-soft-xl transition-shadow border border-gray-100"
    >
      <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden">
        <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{name}</h3>
        <p className="text-primary font-bold text-base">R$ {price.toFixed(2).replace('.', ',')}</p>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
            {description}
          </p>
        )}
        {restaurantName && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {restaurantName}
          </p>
        )}
      </div>
    </div>
  );
};

export default SearchItemCard;
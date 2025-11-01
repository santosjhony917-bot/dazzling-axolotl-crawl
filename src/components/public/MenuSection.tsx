import React from 'react';
import { Utensils } from 'lucide-react';

interface MenuSectionProps {
  restaurantId: string;
}

const MenuSection: React.FC<MenuSectionProps> = ({ restaurantId }) => {
  // Placeholder para a lógica de carregamento do menu
  
  return (
    <div className="mt-8 px-4">
      <h2 className="text-lg font-bold text-[#022D68] dark:text-white flex items-center gap-2">
        <Utensils className="w-5 h-5 text-highlight" />
        Cardápio
      </h2>
      
      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-600 dark:text-gray-400">
        <p>O cardápio será carregado aqui usando o `restaurantId`: {restaurantId}</p>
        {/* Implementação futura: Listagem de MenuCategories e MenuItems */}
      </div>
    </div>
  );
};

export default MenuSection;
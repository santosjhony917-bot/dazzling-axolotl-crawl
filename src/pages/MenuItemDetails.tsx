import React from 'react';
import { useParams } from 'react-router-dom';
import { Pizza } from 'lucide-react';

const MenuItemDetails: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>();

  return (
    <div className="p-4 max-w-md mx-auto text-center">
      <Pizza className="w-12 h-12 text-highlight mx-auto mt-10 mb-4" />
      <h1 className="text-2xl font-bold text-[#022D68] mb-2">Detalhes do Item</h1>
      <p className="text-gray-600">Visualizando detalhes do item de menu ID: {itemId}</p>
    </div>
  );
};

export default MenuItemDetails;
import React from 'react';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';
import { Menu } from 'lucide-react';

const MenuManagementPage: React.FC = () => {
  return (
    <RestaurantAreaPageLayout 
      title="Gerenciamento de Cardápio" 
      icon={Menu} 
      backPath="restaurant-area/home"
    >
      <div className="p-4">
        <h2 className="text-xl font-semibold mb-4">Em construção: Gerencie suas categorias e itens aqui.</h2>
        {/* Implementação futura do gerenciamento de menu */}
      </div>
    </RestaurantAreaPageLayout>
  );
};

export default MenuManagementPage;
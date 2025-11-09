"use client";

import React from 'react';
import { Menu } from 'lucide-react';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';
import MenuManagement from '@/pages/restaurant/MenuManagement'; // Assuming this is the component with the actual logic

const MenuManagementPage: React.FC = () => {
  return (
    <RestaurantAreaPageLayout
      title="Gerenciar Cardápio"
      icon={Menu}
    >
      <MenuManagement />
    </RestaurantAreaPageLayout>
  );
};

export default MenuManagementPage;
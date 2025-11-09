"use client";

import React from 'react';
import { Image } from 'lucide-react';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';
import GalleryManagement from '@/pages/restaurant/GalleryManagement'; // Assuming this is the component with the actual logic

const GalleryManagementPage: React.FC = () => {
  return (
    <RestaurantAreaPageLayout
      title="Gerenciar Galeria"
      icon={Image}
    >
      <GalleryManagement />
    </RestaurantAreaPageLayout>
  );
};

export default GalleryManagementPage;
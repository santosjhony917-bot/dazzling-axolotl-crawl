"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RestaurantAboutProps {
  restaurant: any;
}

const RestaurantAbout: React.FC<RestaurantAboutProps> = ({ restaurant }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sobre {restaurant.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700 dark:text-gray-300">{restaurant.description || 'Nenhuma descrição disponível.'}</p>
        {/* Adicione mais informações sobre o restaurante aqui, se necessário */}
      </CardContent>
    </Card>
  );
};

export default RestaurantAbout;
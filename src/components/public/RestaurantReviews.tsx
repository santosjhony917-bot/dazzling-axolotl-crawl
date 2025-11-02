"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RestaurantReviewsProps {
  restaurantId: string;
}

const RestaurantReviews: React.FC<RestaurantReviewsProps> = ({ restaurantId }) => {
  // Implementação futura para buscar e exibir avaliações
  return (
    <Card>
      <CardHeader>
        <CardTitle>Avaliações</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700 dark:text-gray-300">Nenhuma avaliação disponível ainda. (Funcionalidade em desenvolvimento)</p>
      </CardContent>
    </Card>
  );
};

export default RestaurantReviews;
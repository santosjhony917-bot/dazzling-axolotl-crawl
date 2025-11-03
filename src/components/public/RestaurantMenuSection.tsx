"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RestaurantMenuSectionProps {
  restaurantId: string;
}

export function RestaurantMenuSection({ restaurantId }: RestaurantMenuSectionProps) {
  // This is a placeholder component.
  // In a real application, you would fetch menu categories and items for the given restaurantId
  // and display them here.
  const menuCategories = [
    { id: '1', name: 'Entradas', items: ['Salada Caesar', 'Pão de Alho'] },
    { id: '2', name: 'Pratos Principais', items: ['Bife Ancho', 'Salmão Grelhado'] },
    { id: '3', name: 'Sobremesas', items: ['Petit Gateau', 'Pudim'] },
  ];

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-extrabold text-primary">Cardápio</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-6">
        {menuCategories.map(category => (
          <div key={category.id}>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">{category.name}</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              {category.items.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
        {/* Add more sophisticated menu display logic here */}
        <p className="text-gray-500 text-center">Conteúdo do cardápio em desenvolvimento.</p>
      </CardContent>
    </Card>
  );
}
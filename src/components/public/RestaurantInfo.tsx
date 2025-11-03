"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PublicRestaurantData } from '@/types/restaurant'; // Changed from Restaurant

interface RestaurantInfoProps {
  restaurant: PublicRestaurantData; // Updated prop type
}

export function RestaurantInfo({ restaurant }: RestaurantInfoProps) {
  // This is a placeholder component for general restaurant information
  // that might be specific to premium layouts, or a refactored contact/links section.
  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-extrabold text-primary">Informações Adicionais</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <p className="text-gray-600">
          Aqui você pode adicionar informações adicionais sobre o restaurante, como:
        </p>
        <ul className="list-disc list-inside text-gray-600">
          <li>Detalhes sobre a culinária</li>
          <li>História do restaurante</li>
          <li>Serviços especiais (delivery, take-out, reservas)</li>
          <li>Outras informações relevantes para clientes premium.</li>
        </ul>
        <p className="text-gray-500 text-center">Conteúdo de informações adicionais em desenvolvimento.</p>
      </CardContent>
    </Card>
  );
}
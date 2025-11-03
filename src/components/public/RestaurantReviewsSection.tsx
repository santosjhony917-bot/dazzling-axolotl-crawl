"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';

interface RestaurantReviewsSectionProps {
  restaurantId: string;
}

export function RestaurantReviewsSection({ restaurantId }: RestaurantReviewsSectionProps) {
  // This is a placeholder component.
  // In a real application, you would fetch reviews for the given restaurantId
  // and display them here.
  const reviews = [
    { id: '1', author: 'Maria Silva', rating: 5, comment: 'Comida excelente e atendimento impecável!' },
    { id: '2', author: 'João Santos', rating: 4, comment: 'Ambiente agradável, mas o prato demorou um pouco.' },
  ];

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-extrabold text-primary">Avaliações</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-6">
        {reviews.map(review => (
          <div key={review.id} className="border-b pb-4 last:border-b-0">
            <div className="flex items-center mb-2">
              <div className="flex text-yellow-500 mr-2">
                {Array.from({ length: review.rating }).map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-current" />
                ))}
              </div>
              <h4 className="font-semibold text-gray-800">{review.author}</h4>
            </div>
            <p className="text-gray-600">{review.comment}</p>
          </div>
        ))}
        {/* Add more sophisticated review display and submission logic here */}
        <p className="text-gray-500 text-center">Conteúdo das avaliações em desenvolvimento.</p>
      </CardContent>
    </Card>
  );
}
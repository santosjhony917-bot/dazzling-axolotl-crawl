"use client";

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Utensils, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePublicRestaurant } from '@/hooks/usePublicRestaurant';
import { createPageUrl } from '@/utils/url';
import Header from '@/components/Header';
import { Card, CardContent } from '@/components/ui/card';
import RestaurantMenu from '@/components/public/RestaurantMenu'; // Reutiliza o componente de menu

export default function FullMenuPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();

  const { restaurant, isLoading, error } = usePublicRestaurant(restaurantId);

  const handleBack = () => navigate(-1);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-background-light">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="p-8 text-center min-h-screen bg-background-light">
        <Header 
          title="Cardápio"
          leftAction={{ icon: ArrowLeft, onClick: handleBack }}
        />
        <div className="pt-20">
          <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <h1 className="text-xl font-semibold text-gray-700">Cardápio Não Encontrado</h1>
          <p className="text-gray-500 mt-2">{error instanceof Error ? error.message : "O restaurante ou cardápio solicitado não existe."}</p>
          <Button onClick={handleBack} className="mt-6">
            Voltar
          </Button>
        </div>
      </div>
    );
  }
  
  const hasMenu = restaurant.menu_categories && restaurant.menu_categories.length > 0;

  return (
    <div className="min-h-screen bg-background-light max-w-md mx-auto">
      <Header 
        title={`Cardápio: ${restaurant.name}`}
        leftAction={{ icon: ArrowLeft, onClick: handleBack }}
      />
      
      <main className="p-4 space-y-6">
        <Card className="shadow-soft-md border-none rounded-xl p-4">
          <CardContent className="p-0 flex items-center gap-3">
            <Utensils className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-primary">Cardápio Completo</h1>
          </CardContent>
        </Card>
        
        {hasMenu ? (
          <RestaurantMenu 
            restaurantId={restaurant.id} // Adicionado o restaurantId
            menuCategories={restaurant.menu_categories} 
            isFullMenuPage={true} // Nova prop para indicar que é a página completa
          />
        ) : (
          <Card className="p-6 text-center shadow-soft-md border-none rounded-xl">
            <Utensils className="w-8 h-8 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Nenhum item ativo no cardápio.</p>
          </Card>
        )}
      </main>
    </div>
  );
}
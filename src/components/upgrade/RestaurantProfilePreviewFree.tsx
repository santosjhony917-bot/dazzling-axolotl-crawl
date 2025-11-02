"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Clock } from 'lucide-react';
import { useAuthData } from '@/context/AuthContext';

const RestaurantProfilePreviewFree: React.FC = () => {
  const { restaurant } = useAuthData();

  if (!restaurant) {
    return (
      <Card className="w-full max-w-md mx-auto border-2 border-dashed border-gray-300 p-6 text-center text-gray-500">
        <p>Carregando dados do restaurante...</p>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-none rounded-xl overflow-hidden relative">
      <div className="relative h-40 bg-gray-200">
        {restaurant.cover_image_url ? (
          <img src={restaurant.cover_image_url} alt="Capa do Restaurante" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-600">
            <p>Sem imagem de capa</p>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent h-1/2"></div>
        <div className="absolute bottom-2 left-4 flex items-center">
          {restaurant.image_url ? (
            <img src={restaurant.image_url} alt="Logo do Restaurante" className="w-16 h-16 rounded-full border-2 border-white object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full border-2 border-white bg-gray-400 flex items-center justify-center text-white text-xl font-bold">
              {restaurant.name ? restaurant.name[0] : 'R'}
            </div>
          )}
          <div className="ml-3">
            <CardTitle className="text-xl font-bold text-white drop-shadow-md">{restaurant.name || 'Meu Restaurante'}</CardTitle>
            <Badge variant="secondary" className="bg-yellow-400 text-black text-xs font-semibold mt-1">Plano Free</Badge>
          </div>
        </div>
      </div>
      <CardContent className="p-4 bg-white">
        <div className="flex items-center text-sm text-gray-600 mb-2">
          <MapPin className="h-4 w-4 mr-1 text-primary" />
          <span>{restaurant.address || 'Endereço não disponível'}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600 mb-4">
          <Clock className="h-4 w-4 mr-1 text-primary" />
          <span>Horário de funcionamento limitado</span>
        </div>
        <p className="text-gray-700 text-sm mb-4 line-clamp-3">
          {restaurant.description || 'Descreva seu restaurante para atrair mais clientes! No plano Free, sua descrição é limitada.'}
        </p>
        
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center text-yellow-500">
            <Star className="h-4 w-4 fill-yellow-500 mr-1" />
            <span>4.0 (10 avaliações)</span> {/* Dados mockados */}
          </div>
          <Button variant="outline" className="text-primary border-primary hover:bg-primary hover:text-white">
            Ver Menu (Limitado)
          </Button>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 p-3 rounded-md text-sm mt-4">
          <p className="font-semibold">Destaque-se! No plano Premium, você tem:</p>
          <ul className="list-disc list-inside mt-1">
            <li>Galeria de fotos completa</li>
            <li>Menu ilimitado e personalizável</li>
            <li>Mais visibilidade e ferramentas de marketing</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default RestaurantProfilePreviewFree;
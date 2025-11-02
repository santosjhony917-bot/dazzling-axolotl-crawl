"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Clock, Phone, Globe } from 'lucide-react';
import { useAuthData } from '@/context/AuthContext';
import { PublicRestaurantData } from '@/types/restaurant';

const RestaurantProfilePreviewPremium: React.FC = () => {
  const { restaurant } = useAuthData();

  if (!restaurant) {
    return (
      <Card className="w-full max-w-md mx-auto border-2 border-dashed border-gray-300 p-6 text-center text-gray-500">
        <p>Carregando dados do restaurante...</p>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-2xl border-2 border-primary rounded-xl overflow-hidden relative">
      <div className="relative h-48 bg-gray-200">
        {restaurant.cover_image_url ? (
          <img src={restaurant.cover_image_url} alt="Capa do Restaurante" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary font-semibold">
            <p>Sua imagem de capa Premium!</p>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent h-1/2"></div>
        <div className="absolute bottom-4 left-4 flex items-center">
          {restaurant.image_url ? (
            <img src={restaurant.image_url} alt="Logo do Restaurante" className="w-20 h-20 rounded-full border-4 border-white object-cover shadow-md" />
          ) : (
            <div className="w-20 h-20 rounded-full border-4 border-white bg-primary flex items-center justify-center text-white text-2xl font-bold shadow-md">
              {restaurant.name ? restaurant.name[0] : 'R'}
            </div>
          )}
          <div className="ml-4">
            <CardTitle className="text-2xl font-extrabold text-white drop-shadow-lg">{restaurant.name || 'Meu Restaurante Premium'}</CardTitle>
            <Badge className="bg-green-500 text-white text-sm font-bold mt-1 px-3 py-1">Plano Premium</Badge>
          </div>
        </div>
      </div>
      <CardContent className="p-6 bg-white">
        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm text-gray-700 mb-4">
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-2 text-primary" />
            <span>{restaurant.address || 'Endereço completo disponível'}</span>
          </div>
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-2 text-primary" />
            <span>Horário de funcionamento detalhado</span>
          </div>
          <div className="flex items-center">
            <Phone className="h-4 w-4 mr-2 text-primary" />
            <span>{restaurant.phone || 'Telefone de contato'}</span>
          </div>
          <div className="flex items-center">
            <Globe className="h-4 w-4 mr-2 text-primary" />
            <span>{restaurant.whatsapp_url ? 'WhatsApp disponível' : 'Link para site/redes sociais'}</span>
          </div>
        </div>
        <p className="text-gray-800 text-base mb-6">
          {restaurant.description || 'Com o plano Premium, sua descrição é ilimitada e totalmente otimizada para atrair mais clientes, destacando o melhor do seu negócio!'}
        </p>
        
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center text-yellow-500">
            <Star className="h-5 w-5 fill-yellow-500 mr-1" />
            <span className="font-semibold text-lg">4.8 (250+ avaliações)</span> {/* Dados mockados aprimorados */}
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-white font-bold py-2 px-4 rounded-full shadow-md">
            Ver Menu Completo
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <img src="https://via.placeholder.com/100x100?text=Foto+1" alt="Galeria 1" className="w-full h-20 object-cover rounded-md shadow-sm" />
          <img src="https://via.placeholder.com/100x100?text=Foto+2" alt="Galeria 2" className="w-full h-20 object-cover rounded-md shadow-sm" />
          <img src="https://via.placeholder.com/100x100?text=Foto+3" alt="Galeria 3" className="w-full h-20 object-cover rounded-md shadow-sm" />
        </div>
        <p className="text-center text-sm text-gray-600 mt-2">Galeria de fotos completa no Premium!</p>
      </CardContent>
    </Card>
  );
};

export default RestaurantProfilePreviewPremium;
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Phone, Clock, Image, Link, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

const RestaurantProfilePreviewPremium: React.FC = () => {
  return (
    <Card className="overflow-hidden shadow-lg max-w-md mx-auto bg-white dark:bg-gray-800">
      {/* Imagem de Capa */}
      <div className="relative h-40 bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
        <Image className="w-8 h-8 text-gray-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        <div className="absolute bottom-3 left-3 flex items-center text-white text-sm font-semibold">
          <Crown className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
          Perfil Premium
        </div>
      </div>

      <div className="p-4">
        {/* Nome e Avaliação */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-xl font-bold text-primary dark:text-white">Restaurante Premium Exemplo</h3>
            <div className="flex items-center text-sm text-yellow-500">
              <Star className="w-4 h-4 fill-yellow-500 mr-1" />
              <span>4.8 (120 avaliações)</span>
            </div>
          </div>
          <Button size="sm" className="bg-highlight hover:bg-highlight/90 text-white">
            Ver Cardápio
          </Button>
        </div>

        {/* Informações de Contato e Localização */}
        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300 mb-4">
          <div className="flex items-center">
            <MapPin className="w-4 h-4 text-highlight mr-2 flex-shrink-0" />
            <span>Rua Exemplo, 123 - Centro, Cidade/UF</span>
          </div>
          <div className="flex items-center">
            <Phone className="w-4 h-4 text-highlight mr-2 flex-shrink-0" />
            <span>(99) 99999-9999</span>
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 text-highlight mr-2 flex-shrink-0" />
            <span>Aberto agora (11:00 - 23:00)</span>
          </div>
        </div>

        {/* Links de Pedido/Redes */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button variant="outline" size="sm" className="text-xs h-7 border-gray-300 dark:border-gray-600">
            <Link className="w-3 h-3 mr-1" /> Site Oficial
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-7 border-gray-300 dark:border-gray-600">
            <Link className="w-3 h-3 mr-1" /> iFood
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-7 border-gray-300 dark:border-gray-600">
            <Link className="w-3 h-3 mr-1" /> WhatsApp
          </Button>
        </div>

        {/* Descrição */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
          Descrição detalhada do restaurante, destacando a culinária, ambiente e diferenciais. O perfil Premium permite uma descrição mais rica e completa.
        </p>

        {/* Galeria de Fotos */}
        <div className="mb-4">
          <h4 className="font-semibold text-primary dark:text-white mb-2">Galeria de Fotos</h4>
          <div className="grid grid-cols-3 gap-2 h-20">
            <div className="bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-gray-500 text-xs">Foto 1</div>
            <div className="bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-gray-500 text-xs">Foto 2</div>
            <div className="bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-gray-500 text-xs">Foto 3</div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default RestaurantProfilePreviewPremium;
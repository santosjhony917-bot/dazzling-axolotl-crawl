import React from 'react';
import { Card } from '@/components/ui/card';
import { Star, MapPin, Phone, Clock, Crown, Image, Menu, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const RestaurantProfilePreviewPremium: React.FC = () => {
  return (
    <Card className="w-full max-w-md mx-auto shadow-2xl overflow-hidden bg-background-light relative">
      
      {/* Selo Premium (Mantendo o destaque visual) */}
      <div className="absolute top-0 right-0 bg-highlight text-white text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center z-20">
        <Crown className="w-3 h-3 mr-1 fill-white" /> PREMIUM
      </div>

      {/* Imagem de Capa */}
      <div className="h-40 bg-gray-300 relative">
        <img 
          src="https://via.placeholder.com/600x400?text=Capa+Premium" 
          alt="Capa do Restaurante Premium" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
      </div>

      <div className="p-4 relative">
        {/* Nome e Avaliação */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <h1 className="text-2xl font-bold text-primary">Restaurante Premium Destaque</h1>
            <div className="flex items-center text-sm text-yellow-500 mt-1">
              <Star className="w-4 h-4 fill-yellow-500 mr-1" />
              <span className="font-semibold">4.8</span> (125 Avaliações)
            </div>
          </div>
          <Badge variant="secondary" className="bg-green-500 text-white text-xs font-semibold">ABERTO</Badge>
        </div>

        {/* Descrição */}
        <p className="text-sm text-gray-600 mb-4 line-clamp-3">
          Descrição completa e detalhada do restaurante, destacando a culinária, ambiente e diferenciais. O plano Premium permite uma descrição mais rica e atrativa.
        </p>

        {/* Informações de Contato e Localização */}
        <div className="space-y-2 text-sm text-gray-700 mb-4">
          <div className="flex items-center">
            <MapPin className="w-4 h-4 text-highlight mr-2 flex-shrink-0" />
            <span>Rua Exemplo Premium, 123 - Centro, Cidade/UF</span>
          </div>
          <div className="flex items-center">
            <Phone className="w-4 h-4 text-highlight mr-2 flex-shrink-0" />
            <span>(99) 99999-9999 (Múltiplos Contatos)</span>
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 text-highlight mr-2 flex-shrink-0" />
            <span>Seg - Sex: 11:00 - 23:00</span>
          </div>
        </div>

        {/* Botões de Ação Premium */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Button variant="outline" className="flex flex-col h-auto py-2 px-1 text-xs text-primary border-highlight hover:bg-highlight/10">
            <Image className="w-5 h-5 mb-1 text-highlight" />
            Galeria
          </Button>
          <Button variant="outline" className="flex flex-col h-auto py-2 px-1 text-xs text-primary border-highlight hover:bg-highlight/10">
            <Menu className="w-5 h-5 mb-1 text-highlight" />
            Cardápio
          </Button>
          <Button variant="outline" className="flex flex-col h-auto py-2 px-1 text-xs text-primary border-highlight hover:bg-highlight/10">
            <MessageSquare className="w-5 h-5 mb-1 text-highlight" />
            Avaliar
          </Button>
        </div>

        {/* Destaque de Cardápio Premium */}
        <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-highlight rounded-r-md">
          <h3 className="font-semibold text-highlight text-sm mb-1">Destaque do Cardápio</h3>
          <p className="text-xs text-gray-700">Prato exclusivo com foto e preço. Recurso Premium.</p>
        </div>
      </div>
    </Card>
  );
};

export default RestaurantProfilePreviewPremium;
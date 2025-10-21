import React from 'react';
import { MapPin, Star, Clock, Utensils, MessageSquare, Phone, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const mockRestaurant = {
  name: "Restaurante Exemplo (Free)",
  category: "Comida Brasileira",
  rating: 4.2,
  reviews: 150,
  address: "Rua das Flores, 123 - Centro",
  status: "Aberto agora",
  coverImage: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1974&auto=format&fit=crop",
  logo: "https://via.placeholder.com/100x100?text=Logo",
  isPremium: false,
  links: {
    whatsapp: true,
    ifood: false,
    website: false,
  },
  highlights: [
    { id: 1, name: "Prato do Dia", price: 25.00, imageUrl: "https://images.unsplash.com/photo-1565299624942-4348fb35947b?q=80&w=1780&auto=format&fit=crop" },
  ]
};

const RestaurantProfilePreviewFree: React.FC = () => {
  return (
    <Card className="w-full max-w-sm mx-auto border-2 border-gray-300 shadow-lg overflow-hidden">
      {/* Header e Imagem de Capa */}
      <div className="relative h-32 bg-gray-200">
        <img src={mockRestaurant.coverImage} alt="Capa" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/30" />
        
        {/* Logo e Nome */}
        <div className="absolute bottom-0 left-4 transform translate-y-1/2 flex items-end">
          <img src={mockRestaurant.logo} alt="Logo" className="w-16 h-16 rounded-full border-4 border-white bg-white object-cover" />
          <div className="ml-3 mb-2">
            <h3 className="text-lg font-bold text-white drop-shadow-md">{mockRestaurant.name}</h3>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="pt-10 p-4 bg-white">
        
        {/* Status e Avaliação */}
        <div className="flex justify-between items-center mb-4">
          <Badge className="bg-gray-200 text-gray-700 font-semibold">
            {mockRestaurant.category}
          </Badge>
          <div className="flex items-center text-sm text-gray-600">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 mr-1" />
            {mockRestaurant.rating} ({mockRestaurant.reviews} avaliações)
          </div>
        </div>

        {/* Informações Básicas */}
        <div className="space-y-2 text-sm text-gray-700 mb-4 border-b pb-4">
          <div className="flex items-center">
            <MapPin className="w-4 h-4 mr-2 text-primary" />
            {mockRestaurant.address}
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-2 text-primary" />
            <span className="font-semibold text-green-600">{mockRestaurant.status}</span>
          </div>
        </div>

        {/* Canais de Contato (Limitado) */}
        <div className="flex justify-around gap-2 mb-6">
          <Button variant="outline" className="flex-1 border-primary text-primary hover:bg-primary/10">
            <MessageSquare className="w-4 h-4 mr-2" /> WhatsApp
          </Button>
          <Button variant="outline" className="flex-1 text-gray-500 cursor-not-allowed">
            <Utensils className="w-4 h-4 mr-2" /> iFood (Oculto)
          </Button>
        </div>

        {/* Destaques (Limitado a 1) */}
        <h4 className="font-bold text-primary mb-3">Destaques (1 Item)</h4>
        <div className="grid grid-cols-1 gap-3">
          {mockRestaurant.highlights.map(item => (
            <div key={item.id} className="flex items-center bg-gray-50 rounded-lg p-2">
              <img src={item.imageUrl} alt={item.name} className="w-12 h-12 object-cover rounded mr-3" />
              <div className="flex-1">
                <p className="font-medium text-sm">{item.name}</p>
                <p className="text-xs text-gray-500">R$ {item.price.toFixed(2)}</p>
              </div>
              <Button size="sm" className="bg-primary hover:bg-primary/90">Ver</Button>
            </div>
          ))}
        </div>
        
        <p className="text-center text-xs text-red-500 mt-4">
          Seu perfil aparece abaixo dos planos Premium.
        </p>
      </div>
    </Card>
  );
};

export default RestaurantProfilePreviewFree;
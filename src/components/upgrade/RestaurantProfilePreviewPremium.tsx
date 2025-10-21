import React from 'react';
import { MapPin, Star, Clock, Utensils, MessageSquare, Phone, Globe, Crown, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const mockRestaurantPremium = {
  name: "Restaurante Exemplo (Premium)",
  category: "Comida Brasileira",
  rating: 4.9,
  reviews: 890,
  address: "Rua das Flores, 123 - Centro",
  status: "Aberto agora",
  coverImage: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1974&auto=format&fit=crop",
  logo: "https://via.placeholder.com/100x100?text=Logo",
  isPremium: true,
  links: {
    whatsapp: true,
    ifood: true,
    website: true,
  },
  highlights: [
    { id: 1, name: "Prato do Dia Premium", price: 25.00, imageUrl: "https://images.unsplash.com/photo-1565299624942-4348fb35947b?q=80&w=1780&auto=format&fit=crop" },
    { id: 2, name: "Sobremesa Exclusiva", price: 15.00, imageUrl: "https://images.unsplash.com/photo-1551782450-a2132b4ba213d?q=80&w=2069&auto=format&fit=crop" },
    { id: 3, name: "Bebida Artesanal", price: 10.00, imageUrl: "https://images.unsplash.com/photo-1554224155-6726b1ff8582?q=80&w=2070&auto=format&fit=crop" },
  ]
};

const RestaurantProfilePreviewPremium: React.FC = () => {
  return (
    <Card className="w-full max-w-sm mx-auto border-4 border-highlight shadow-2xl overflow-hidden relative">
      {/* Selo Premium */}
      <div className="absolute top-0 right-0 bg-highlight text-white text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center z-10">
        <Crown className="w-3 h-3 mr-1 fill-white" /> PREMIUM
      </div>

      {/* Header e Imagem de Capa */}
      <div className="relative h-40 bg-gray-200">
        <img src={mockRestaurantPremium.coverImage} alt="Capa" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-primary/40" />
        
        {/* Logo e Nome */}
        <div className="absolute bottom-0 left-4 transform translate-y-1/2 flex items-end">
          <img src={mockRestaurantPremium.logo} alt="Logo" className="w-20 h-20 rounded-full border-4 border-white bg-white object-cover shadow-lg" />
          <div className="ml-3 mb-3">
            <h3 className="text-xl font-bold text-white drop-shadow-lg">{mockRestaurantPremium.name}</h3>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="pt-14 p-4 bg-white">
        
        {/* Status e Avaliação (Mais Proeminente) */}
        <div className="flex justify-between items-center mb-4">
          <Badge className="bg-primary text-white font-semibold text-sm">
            {mockRestaurantPremium.category}
          </Badge>
          <div className="flex items-center text-base font-bold text-highlight">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 mr-1" />
            {mockRestaurantPremium.rating} ({mockRestaurantPremium.reviews} avaliações)
          </div>
        </div>

        {/* Informações Básicas */}
        <div className="space-y-2 text-sm text-gray-700 mb-4 border-b pb-4">
          <div className="flex items-center font-medium">
            <MapPin className="w-4 h-4 mr-2 text-primary" />
            {mockRestaurantPremium.address}
          </div>
          <div className="flex items-center font-medium">
            <Clock className="w-4 h-4 mr-2 text-primary" />
            <span className="font-bold text-green-700 flex items-center">
              <Zap className="w-4 h-4 mr-1 text-green-700 fill-green-700" /> {mockRestaurantPremium.status}
            </span>
          </div>
        </div>

        {/* Canais de Contato (Todos Visíveis) */}
        <div className="flex justify-around gap-2 mb-6">
          <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white">
            <MessageSquare className="w-4 h-4 mr-2" /> WhatsApp
          </Button>
          <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white">
            <Utensils className="w-4 h-4 mr-2" /> iFood
          </Button>
          <Button variant="outline" className="flex-1 border-primary text-primary hover:bg-primary/10">
            <Globe className="w-4 h-4 mr-2" /> Site
          </Button>
        </div>

        {/* Destaques (Mais Itens) */}
        <h4 className="font-bold text-primary mb-3 flex items-center">
          <Zap className="w-4 h-4 mr-1 text-highlight fill-highlight" /> Destaques Premium ({mockRestaurantPremium.highlights.length} Itens)
        </h4>
        <div className="grid grid-cols-1 gap-3">
          {mockRestaurantPremium.highlights.map(item => (
            <div key={item.id} className="flex items-center bg-highlight/10 rounded-lg p-2 border border-highlight/30">
              <img src={item.imageUrl} alt={item.name} className="w-12 h-12 object-cover rounded mr-3" />
              <div className="flex-1">
                <p className="font-bold text-sm text-primary">{item.name}</p>
                <p className="text-xs text-highlight">R$ {item.price.toFixed(2)}</p>
              </div>
              <Button size="sm" className="bg-highlight hover:bg-highlight/90">Ver</Button>
            </div>
          ))}
        </div>
        
        <p className="text-center text-xs text-green-600 font-semibold mt-4">
          Seu perfil aparece em destaque no topo da busca!
        </p>
      </div>
    </Card>
  );
};

export default RestaurantProfilePreviewPremium;
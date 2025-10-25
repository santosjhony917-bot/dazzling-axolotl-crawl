import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search, Loader2, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuthContext } from '@/context/AuthContext';
import { createPageUrl } from '@/utils/url';
import { showInfo, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';

// Mock de sugestões de restaurantes próximos (para usuários não logados ou sem localização)
const mockSuggestions: Partial<Restaurant>[] = [
  { id: 'mock1', name: 'Pizzaria do Chef', category: 'Pizza', image_url: PLACEHOLDER_IMAGE_URL, city: 'São Paulo' },
  { id: 'mock2', name: 'Hamburgueria Artesanal', category: 'Lanches', image_url: PLACEHOLDER_IMAGE_URL, city: 'Rio de Janeiro' },
];

export default function ClientSearchPage() {
  const navigate = useNavigate();
  const { restaurant } = useAuthContext(); // Obtém o objeto restaurante do contexto
  const isRestaurantUser = !!restaurant; // Verifica se é um usuário de restaurante
  
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [address, setAddress] = useState<string>('Buscando localização...');
  const [isLocating, setIsLocating] = useState(true);
  const [recentLocations, setRecentLocations] = useState<any[]>([]); // Mock para simplificar

  // 1. Obter Localização do Usuário
  useEffect(() => {
    // Tenta obter a localização do navegador
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ lat: latitude, lng: longitude });
          setAddress('Localização atual (GPS)');
          setIsLocating(false);
        },
        (error) => {
          console.error("Geolocation error:", error);
          setAddress('Localização não disponível. Usando localização padrão.');
          setLocation({ lat: -23.5505, lng: -46.6333 }); // São Paulo como fallback
          setIsLocating(false);
          showInfo("Não foi possível obter sua localização. Usando São Paulo como padrão.");
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setAddress('Geolocalização não suportada. Usando localização padrão.');
      setLocation({ lat: -23.5505, lng: -46.6333 }); // São Paulo como fallback
      setIsLocating(false);
      showInfo("Geolocalização não suportada. Usando São Paulo como padrão.");
    }
  }, []);

  // 2. Lógica de Busca
  const handleSearch = () => {
    if (!location) {
      showError("Aguarde enquanto sua localização é definida.");
      return;
    }
    
    navigate(createPageUrl('restaurantResults', {
      lat: location.lat.toString(),
      lng: location.lng.toString(),
      query: searchQuery || undefined,
    }));
  };

  // 3. Renderização
  if (isRestaurantUser) {
    return (
      <div className="p-6 text-center">
        <Utensils className="w-12 h-12 text-primary mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Bem-vindo, {restaurant.name}!</h2>
        <p className="text-gray-600 mb-6">Como usuário de restaurante, você não precisa buscar. Gerencie seu perfil no painel.</p>
        <Button onClick={() => navigate(createPageUrl('restaurantDashboard'))}>
          Ir para o Painel
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-3xl font-extrabold text-gray-900">Encontre seu próximo prato favorito</h1>
      
      {/* Localização */}
      <Card className="p-4 flex items-center gap-3 shadow-sm">
        {isLocating ? (
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        ) : (
          <MapPin className="w-5 h-5 text-primary" />
        )}
        <div>
          <p className="text-xs font-semibold text-gray-500">Entregando em:</p>
          <p className="text-sm font-medium text-gray-800">{address}</p>
        </div>
      </Card>

      {/* Barra de Busca */}
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Buscar restaurantes, pratos ou categorias..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-grow"
        />
        <Button onClick={handleSearch} disabled={isLocating} size="icon">
          <Search className="w-5 h-5" />
        </Button>
      </div>

      {/* Sugestões */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-primary">Sugestões Próximas</h2>
        <div className="grid grid-cols-2 gap-4">
          {mockSuggestions.map((r) => (
            <Card 
              key={r.id} 
              className="p-3 text-center cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(createPageUrl('restaurantProfile', { restaurantId: r.id! }))}
            >
              <img 
                src={r.image_url || PLACEHOLDER_IMAGE_URL} 
                alt={r.name} 
                className="w-full h-24 object-cover rounded-lg mb-2"
              />
              <p className="font-semibold text-sm truncate">{r.name}</p>
              <p className="text-xs text-gray-500">{r.category}</p>
            </Card>
          ))}
        </div>
      </div>
      
      {/* Locais Recentes (Mock) */}
      <div className="pt-4">
        <h2 className="text-xl font-bold text-primary mb-3">Locais Recentes</h2>
        <Card className="p-4 text-center text-gray-500">
          Nenhum local recente salvo.
        </Card>
      </div>
    </div>
  );
}
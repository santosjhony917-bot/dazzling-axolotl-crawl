import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search, Loader2, Utensils, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { createPageUrl } from '@/utils/url';
import { showInfo, showError } from '@/utils/toast';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';
import ClientLayout from '@/components/ClientLayout';
import { useUserSearchLocation } from '@/hooks/useUserSearchLocation';
import UserLocationModal from '@/components/restaurant/UserLocationModal'; // Para alterar a localização
import { Restaurant } from '@/types/supabase'; // Importa o tipo Restaurant

// Mock de sugestões de restaurantes próximos (para usuários não logados ou sem localização)
const mockSuggestions: Partial<Restaurant>[] = [
  { id: 'mock1', name: 'Pizzaria do Chef', category: 'Pizza', image_url: PLACEHOLDER_IMAGE_URL, city: 'São Paulo' },
  { id: 'mock2', name: 'Hamburgueria Artesanal', category: 'Lanches', image_url: PLACEHOLDER_IMAGE_URL, city: 'Rio de Janeiro' },
  { id: 'mock3', name: 'Açaí Tropical', category: 'Sobremesas', image_url: PLACEHOLDER_IMAGE_URL, city: 'João Pessoa' },
];

export default function ClientSearchPage() {
  const navigate = useNavigate();
  const { location, isLoading: isLocationLoading, refetch: refetchLocation } = useUserSearchLocation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const userLat = location.latitude;
  const userLon = location.longitude;
  const currentAddress = location.address;

  // Lógica de Busca
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (userLat === null || userLon === null) {
      showError("Aguarde enquanto sua localização é definida.");
      return;
    }
    
    // Navega para a página de resultados, passando a localização e a query
    navigate(createPageUrl('restaurantResults', {
      lat: userLat.toString(),
      lng: userLon.toString(),
      query: searchQuery || undefined,
    }));
  };
  
  const handleLocationSaved = () => {
    refetchLocation();
    setIsLocationModalOpen(false);
  };

  return (
    <ClientLayout title="Buscar" selectedTab="search" showBackButton={false}>
      <div className="p-4 space-y-6">
        <h1 className="text-3xl font-extrabold text-primary">Encontre seu próximo prato favorito</h1>
        
        {/* Localização */}
        <Card 
          className="p-4 flex items-center justify-between shadow-md border-none cursor-pointer hover:bg-gray-50"
          onClick={() => setIsLocationModalOpen(true)}
        >
          <div className="flex items-center gap-3">
            {isLocationLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-highlight" />
            ) : (
              <MapPin className="w-5 h-5 text-highlight" />
            )}
            <div>
              <p className="text-xs font-semibold text-gray-500">Entregando em:</p>
              <p className="text-sm font-medium text-primary truncate max-w-[200px]">{currentAddress}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-500" />
        </Card>

        {/* Barra de Busca */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            type="text"
            placeholder="Buscar restaurantes, pratos ou categorias..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-grow h-12 rounded-xl"
          />
          <Button type="submit" disabled={isLocationLoading} size="icon" className="h-12 w-12 rounded-xl bg-primary hover:bg-primary/90">
            <Search className="w-5 h-5" />
          </Button>
        </form>

        {/* Sugestões */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-primary">Sugestões Próximas</h2>
          <div className="grid grid-cols-2 gap-4">
            {mockSuggestions.map((r) => (
              <Card 
                key={r.id} 
                className="p-3 text-center cursor-pointer hover:shadow-lg transition-shadow rounded-xl border-none"
                onClick={() => navigate(createPageUrl('restaurantProfile', { restaurantId: r.id! }))}
              >
                <img 
                  src={r.image_url || PLACEHOLDER_IMAGE_URL} 
                  alt={r.name} 
                  className="w-full h-24 object-cover rounded-lg mb-2"
                />
                <p className="font-semibold text-sm truncate text-primary">{r.name}</p>
                <p className="text-xs text-gray-500">{r.category}</p>
              </Card>
            ))}
          </div>
        </div>
        
        {/* Locais Recentes (Mock) */}
        <div className="pt-4">
          <h2 className="text-xl font-bold text-primary mb-3">Locais Recentes</h2>
          <Card className="p-4 text-center text-gray-500 shadow-sm border-none rounded-xl">
            Nenhum local recente salvo.
          </Card>
        </div>
      </div>
      
      {/* User Location Modal */}
      <UserLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentAddress={currentAddress}
        onLocationSaved={handleLocationSaved}
      />
    </ClientLayout>
  );
}
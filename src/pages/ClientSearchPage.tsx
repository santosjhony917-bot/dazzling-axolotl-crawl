import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search, Loader2, Utensils, ChevronRight, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { createPageUrl } from '@/utils/url';
import { showInfo, showError } from '@/utils/toast';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';
import ClientLayout from '@/components/ClientLayout';
import { useUserSearchLocation } from '@/hooks/useUserSearchLocation';
import UserLocationModal from '@/components/restaurant/UserLocationModal';
import SearchToggle from '@/components/SearchToggle';
import SearchItemCard from '@/components/search/SearchItemCard'; // Novo componente

type SearchType = 'dish' | 'restaurant'; // CORRIGIDO: Usando singular para consistência com SearchItemCard

// Mock de dados para Pratos em Destaque (baseado na imagem)
const mockDishHighlights = [
  { id: 'd1', name: 'Moqueca de Camarão', description: 'Um ensopado tradicional de camarão cozido em leite de coco...', price: 59.90, imageUrl: 'https://images.unsplash.com/photo-1563379926898-05f4575a4513?q=80&w=1974&auto=format&fit=crop', type: 'dish' as const },
  { id: 'd2', name: 'Picanha na Chapa', description: 'Picanha fatiada e grelhada em chapa quente, servida com...', price: 79.90, imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop', type: 'dish' as const },
  { id: 'd3', name: 'Escondidinho de Macaxeira', description: 'Purê cremoso de macaxeira com recheio de carne de sol...', price: 45.00, imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop', type: 'dish' as const },
  { id: 'd4', name: 'Carne de Sol com Macaxeira', description: 'Carne de sol desfiada e acebolada, acompanhada de macaxeira frita...', price: 65.50, imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=800&auto=format&fit=crop', type: 'dish' as const },
];

// Mock de dados para Restaurantes em Destaque
const mockRestaurantHighlights = [
  { id: 'r1', name: 'Trattoria del Ponte', category: 'Italiana', city: 'João Pessoa', price: undefined, imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1974&auto=format&fit=crop', type: 'restaurant' as const },
  { id: 'r2', name: 'Sakura Sushi', category: 'Japonesa', city: 'João Pessoa', price: undefined, imageUrl: 'https://images.unsplash.com/photo-1550547660-d94500ad4594?q=80&w=1974&auto=format&fit=crop', type: 'restaurant' as const },
];


export default function ClientSearchPage() {
  const navigate = useNavigate();
  const { location, isLoading: isLocationLoading, refetch: refetchLocation } = useUserSearchLocation();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [activeSearchType, setActiveSearchType] = useState<SearchType>('dish'); // CORRIGIDO: Inicia com 'dish'

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
    
    // Navega para a página de resultados, passando a localização, a query e o tipo de busca
    navigate(createPageUrl('restaurantResults', {
      lat: userLat.toString(),
      lng: userLon.toString(),
      query: searchQuery || undefined,
      type: activeSearchType, // Adicionando o tipo de busca
    }));
  };
  
  const handleLocationSaved = () => {
    refetchLocation();
    setIsLocationModalOpen(false);
  };
  
  const handleItemClick = (itemId: string, type: SearchType) => {
    if (type === 'restaurant') { // CORRIGIDO: Comparação com 'restaurant'
      navigate(createPageUrl('restaurantProfile', { restaurantId: itemId }));
    } else {
      // Para pratos, podemos navegar para o perfil do restaurante que o vende
      showInfo("Funcionalidade de detalhe do prato em desenvolvimento.");
    }
  };
  
  const highlights = activeSearchType === 'dish' ? mockDishHighlights : mockRestaurantHighlights;
  const highlightTitle = activeSearchType === 'dish' ? 'Pratos em Destaque' : 'Restaurantes em Destaque';

  // Mapeamento de SearchType para o SearchToggle (que usa plural)
  const toggleType = activeSearchType === 'dish' ? 'dishes' : 'restaurants';
  const handleToggleChange = (type: 'dishes' | 'restaurants') => {
    setActiveSearchType(type === 'dishes' ? 'dish' : 'restaurant');
  };

  return (
    <ClientLayout title="Buscar" selectedTab="search" showBackButton={true}>
      <div className="p-4 space-y-6">
        
        {/* Barra de Busca e Filtro */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <Input
              type="text"
              placeholder={activeSearchType === 'dish' ? "Buscar por prato..." : "Buscar por restaurante..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 h-12 rounded-xl"
            />
          </div>
          <Button 
            type="button" 
            onClick={() => navigate(createPageUrl('search-restaurants'))} // Abre a tela de filtros avançados
            size="icon" 
            variant="outline" 
            className="h-12 w-12 rounded-xl shrink-0 border-gray-300 text-primary hover:bg-gray-100"
          >
            <Filter className="w-5 h-5" />
          </Button>
        </form>
        
        {/* Toggle Pratos / Restaurantes */}
        <SearchToggle activeType={toggleType} onToggle={handleToggleChange} />

        {/* Destaques */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-primary">{highlightTitle}</h2>
          <div className="space-y-3">
            {highlights.map((item) => (
              <SearchItemCard 
                key={item.id} 
                item={item} 
                onClick={handleItemClick} // CORRIGIDO: Agora o tipo é compatível
              />
            ))}
          </div>
        </div>
        
        {/* Locais Recentes (Mock) - Mantido para estrutura */}
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
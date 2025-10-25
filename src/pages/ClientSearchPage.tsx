import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Filter, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Header from '@/components/Header';
import SearchToggle from '@/components/SearchToggle';
import PublicMenuItemCard from '@/components/public/PublicMenuItemCard';
import RestaurantCard from '@/components/restaurant/RestaurantCard';
import { createPageUrl } from '@/utils/url';
import { Restaurant } from '@/types/restaurant';
import CustomerBottomNav from '@/components/CustomerBottomNav';

type SearchType = 'dishes' | 'restaurants';

// Mock Data para Pratos
const mockDishes = [
  { id: 'd1', name: "Moqueca de Camarão", description: "Um ensopado tradicional de camarão cozido em leite de coco...", price: 59.90, image_url: "https://images.unsplash.com/photo-1580476262798-57a42912da26?q=80&w=1974&auto=format&fit=crop", restaurantName: "Restaurante Mar" },
  { id: 'd2', name: "Picanha na Chapa", description: "Picanha fatiada e grelhada em chapa quente, servida com...", price: 79.90, image_url: "https://images.unsplash.com/photo-1565299624942-4c8d4e281ace?q=80&w=1974&auto=format&fit=crop", restaurantName: "Churrascaria Fogo" },
  { id: 'd3', name: "Escondidinho de Macaxeira", description: "Purê cremoso de macaxeira com recheio de carne de sol...", price: 45.00, image_url: "https://images.unsplash.com/photo-1568901346537-21b8284b7423?q=80&w=1974&auto=format&fit=crop", restaurantName: "Sabor Nordestino" },
  { id: 'd4', name: "Carne de Sol com Macaxeira", description: "Carne de sol desfiada e acebolada, acompanhada de macaxeira frita...", price: 65.50, image_url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1974&auto=format&fit=crop", restaurantName: "Sabor Nordestino" },
];

// Mock Data para Restaurantes (usando a interface Restaurant)
const mockRestaurants: Restaurant[] = [
  { id: 'r1', user_id: 'u1', name: "Trattoria del Ponte", description: "Cozinha Italiana autêntica.", image_url: null, cover_image_url: null, address: "Rua A, 100", number: '100', city: 'João Pessoa', state: 'PB', cep: '58000-000', neighborhood: 'Centro', phone: null, email: null, cnpj: null, category: 'Italiana', whatsapp_url: null, ifood_url: null, other_url: null, plan: 'premium', opening_hours: null, created_at: new Date().toISOString(), latitude: -7.1, longitude: -34.8, distance_km: 1.2, external_url: 'http://trattoria.com' },
  { id: 'r2', user_id: 'u2', name: "Sakura Sushi", description: "O melhor sushi da cidade.", image_url: null, cover_image_url: null, address: "Av. B, 200", number: '200', city: 'João Pessoa', state: 'PB', cep: '58000-000', neighborhood: 'Tambaú', phone: null, email: null, cnpj: null, category: 'Japonesa', whatsapp_url: null, ifood_url: null, other_url: null, plan: 'free', opening_hours: null, created_at: new Date().toISOString(), latitude: -7.1, longitude: -34.8, distance_km: 2.5, external_url: 'http://sakurasushi.com' },
];


export default function ClientSearchPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('dishes');
  const [loading, setLoading] = useState(false);

  // Simulação de resultados filtrados
  const filteredDishes = mockDishes.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredRestaurants = mockRestaurants.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.category?.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleToggleSearch = (type: SearchType) => {
    setSearchType(type);
    // setSearchQuery(''); // Manter a query ao trocar o tipo
  };
  
  const handleGoToFilters = () => {
    // Navega para a tela de filtros de localização/distância
    navigate(createPageUrl('search-restaurants'));
  };
  
  const handleDishClick = (itemId: string) => {
    // Simula a navegação para o perfil do restaurante que contém o prato
    const dish = mockDishes.find(d => d.id === itemId);
    if (dish) {
        // Em um cenário real, buscaríamos o ID do restaurante pelo ID do item
        navigate(createPageUrl(`restaurant-profile/r1`)); 
    }
  };
  
  const handleRestaurantClick = (restaurantId: string) => {
    navigate(createPageUrl(`restaurant-profile/${restaurantId}`));
  };

  return (
    <div className="max-w-md mx-auto bg-[#f5f7f8] min-h-screen pb-20">
      <Header 
        title="Buscar" 
        leftAction={{ icon: ArrowLeft, onClick: () => navigate(createPageUrl('home')) }} 
      />

      <div className="p-4">
        {/* Barra de Pesquisa */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder={`Buscar por ${searchType === 'dishes' ? 'prato' : 'restaurante'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 rounded-full text-base focus:border-highlight focus:ring-highlight"
            />
          </div>
          <Button size="icon" variant="outline" className="h-12 w-12 rounded-full shrink-0 border-gray-300 text-primary hover:bg-gray-100" onClick={handleGoToFilters}>
              <Filter className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Toggle de Busca */}
        <SearchToggle activeType={searchType} onToggle={handleToggleSearch} />

        {/* Resultados */}
        <h2 className="text-lg font-bold mb-3 text-primary">
          {searchType === 'dishes' ? 'Pratos em Destaque' : 'Restaurantes Próximos'}
        </h2>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : searchType === 'dishes' ? (
          <div className="space-y-4">
            {filteredDishes.length > 0 ? (
                filteredDishes.map((dish) => (
                    <PublicMenuItemCard 
                        key={dish.id} 
                        item={dish} 
                        onClick={handleDishClick}
                    />
                ))
            ) : (
                <div className="text-center p-8 bg-white rounded-xl shadow-md">
                    <p className="text-gray-500">Nenhum prato encontrado.</p>
                </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRestaurants.length > 0 ? (
                filteredRestaurants.map((restaurant) => (
                    <RestaurantCard 
                        key={restaurant.id} 
                        restaurant={restaurant} 
                        onClick={() => handleRestaurantClick(restaurant.id)}
                    />
                ))
            ) : (
                <div className="text-center p-8 bg-white rounded-xl shadow-md">
                    <p className="text-gray-500">Nenhum restaurante encontrado.</p>
                </div>
            )}
          </div>
        )}
      </div>
      
      {/* Bottom Navigation */}
      <CustomerBottomNav selectedTab="search" />
    </div>
  );
}
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Utensils } from 'lucide-react';
import ClientLayout from '@/components/ClientLayout';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils/url';
import RestaurantCard from '@/components/restaurant/RestaurantCard';

// Mock data for demonstration
const mockFavorites = [
  { id: 'r1', name: 'Pizzaria do Chef', category: 'Italiana', distance_km: 2.1, plan: 'premium', image_url: 'https://images.unsplash.com/photo-1513104890138-7c7496e1ef17?q=80&w=1974&auto=format&fit=crop' },
  { id: 'r2', name: 'Sushi House', category: 'Japonesa', distance_km: 0.8, plan: 'basic', image_url: 'https://images.unsplash.com/photo-1579871708004-72e6290d224c?q=80&w=1974&auto=format&fit=crop' },
];

const Favorites: React.FC = () => {
  const navigate = useNavigate();
  
  const handleViewRestaurant = (restaurantId: string) => {
    navigate(createPageUrl('restaurantProfile', { restaurantId }));
  };

  return (
    <ClientLayout selectedTab="favorites">
      <div className="p-4 space-y-4 pt-20">
        <h1 className="text-2xl font-bold text-primary">Meus Favoritos</h1>
        
        {mockFavorites.length > 0 ? (
          <div className="space-y-4">
            {mockFavorites.map((restaurant) => (
              <RestaurantCard 
                key={restaurant.id} 
                restaurant={restaurant as any} // Usando 'any' para mock data
                onClick={() => handleViewRestaurant(restaurant.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center p-8 text-gray-600">
            <Heart className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-xl font-semibold">Nenhum Favorito</p>
            <p className="mt-2">Comece a explorar e adicione seus restaurantes preferidos!</p>
            <Button onClick={() => navigate(createPageUrl('home'))} className="mt-4 bg-highlight hover:bg-highlight/90">
              Explorar Restaurantes
            </Button>
          </div>
        )}
      </div>
    </ClientLayout>
  );
};

export default Favorites;
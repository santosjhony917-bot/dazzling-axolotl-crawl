import React from 'react';
import CustomerBottomNav from '@/components/CustomerBottomNav';
import { useFavorites } from '@/hooks/useFavorites';
import { Loader2, Utensils, Heart } from 'lucide-react';
import RestaurantCard from '@/components/restaurant/RestaurantCard';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { Skeleton } from '@/components/ui/skeleton';

export default function Favorites() {
  const { favorites, isLoading, error } = useFavorites();
  const navigate = useNavigate();

  const handleViewRestaurant = (id: string) => {
    navigate(createPageUrl(`restaurant-profile/${id}`));
  };

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold text-[#022D68] mb-6">Meus Favoritos</h1>
      
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="w-full h-48 rounded-xl" />
          <Skeleton className="w-full h-48 rounded-xl" />
        </div>
      ) : error ? (
        <div className="text-center p-8 bg-red-100 rounded-xl shadow-sm border border-red-300">
          <p className="text-red-700">Erro ao carregar favoritos: {error}</p>
        </div>
      ) : favorites.length === 0 ? (
        <div className="text-center p-8 bg-white rounded-xl shadow-sm">
          <Heart className="w-10 h-10 text-gray-400 mx-auto mb-3 fill-gray-200" />
          <p className="text-gray-600">Você ainda não tem restaurantes favoritos.</p>
          <p className="text-sm text-gray-500 mt-1">Encontre um restaurante e clique no ícone de coração para adicionar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {favorites.map((fav) => (
            <RestaurantCard 
              key={fav.restaurant_id} 
              restaurant={fav.restaurants} 
              onClick={() => handleViewRestaurant(fav.restaurant_id)}
            />
          ))}
        </div>
      )}
      
      <CustomerBottomNav selectedTab="favorites" />
    </div>
  );
}
"use client";

import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin } from "lucide-react";
import RestaurantCard from "../components/RestaurantCard"; // Corrected import path
import PremiumBanner from "../components/PremiumBanner"; // Corrected import path
import PopularDishesCarousel from "../components/PopularDishesCarousel"; // Corrected import path
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client"; // Corrected import path
import { useAuth } from "../hooks/useAuth"; // Corrected import path

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();

  const { data: restaurants, isLoading: isLoadingRestaurants } = useQuery({
    queryKey: ["restaurants", searchQuery],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("find_nearby_restaurants", {
        user_lat: -23.55052, // Example latitude (São Paulo)
        user_lng: -46.633309, // Example longitude (São Paulo)
        max_distance_km: 50,
        search_query: searchQuery,
      });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-[#E47948]">
            FoodApp
          </Link>
          <nav>
            {user ? (
              <Link to="/dashboard" className="text-gray-700 hover:text-[#E47948] mr-4">
                Dashboard
              </Link>
            ) : (
              <Link to="/login" className="text-gray-700 hover:text-[#E47948] mr-4">
                Login
              </Link>
            )}
            <Link to="/profile" className="text-gray-700 hover:text-[#E47948]">
              Profile
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto p-4">
        <div className="mb-6">
          <PremiumBanner />
        </div>

        <div className="relative mb-6">
          <Input
            type="text"
            placeholder="Buscar restaurantes ou pratos..."
            className="pl-10 pr-4 py-2 rounded-full border-gray-300 focus:border-[#E47948] focus:ring-[#E47948]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        </div>

        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" className="flex items-center space-x-2">
            <MapPin size={18} />
            <span>Localização Atual</span>
          </Button>
          <Button variant="ghost" className="text-[#E47948]">
            Filtrar
          </Button>
        </div>

        {/* Pratos Populares */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-extrabold text-[#022D68] tracking-tight">Pratos Populares</h2>
            <Button variant="link" className="text-[#E47948] p-0 h-auto" asChild>
              <Link to="/popular-dishes">Ver Mais</Link>
            </Button>
          </div>
          <PopularDishesCarousel />
        </div>

        {/* Restaurantes Próximos */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-extrabold text-[#022D68] tracking-tight">Restaurantes Próximos</h2>
            <Button variant="link" className="text-[#E47948] p-0 h-auto" asChild>
              <Link to="/restaurants">Ver Mais</Link>
            </Button>
          </div>
          {isLoadingRestaurants ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-full h-[200px] bg-gray-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {restaurants?.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom"; // Importando useNavigate
import { MapPin, Search, Heart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import RestaurantCard from "@/components/restaurant/RestaurantCard";
import { PopularItemCard } from "@/components/menu/PopularItemCard";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import useUserLocation from "@/hooks/useUserLocation";
import BannerCarousel from "@/components/BannerCarousel";

const fetchRestaurants = async (
  latitude: number | null,
  longitude: number | null,
  searchQuery: string
) => {
  let query = supabase.from("restaurants").select("*");

  if (searchQuery) {
    query = query.ilike("name", `%${searchQuery}%`);
  }

  if (latitude !== null && longitude !== null) {
    const { data, error } = await supabase.rpc("find_nearby_restaurants", {
      user_lat: latitude,
      user_lng: longitude,
      search_query: searchQuery,
    });
    if (error) throw error;
    return data;
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return data;
};

const fetchPopularItems = async () => {
  const { data, error } = await supabase.rpc("search_menu_items", {
    search_query: null,
    p_limit: 10,
  });
  if (error) throw error;
  return data;
};

const fetchBanners = async () => {
  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .eq("is_active", true)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return data;
};

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const { location, loading: locationLoading, error: locationError } = useUserLocation();
  const navigate = useNavigate(); // Inicializando useNavigate

  const {
    data: restaurants,
    isLoading: isLoadingRestaurants,
    error: restaurantsError,
  } = useQuery({
    queryKey: ["restaurants", location?.latitude, location?.longitude, searchQuery],
    queryFn: () =>
      fetchRestaurants(location?.latitude || null, location?.longitude || null, searchQuery),
  });

  const {
    data: popularItems,
    isLoading: isLoadingPopularItems,
    error: popularItemsError,
  } = useQuery({
    queryKey: ["popularItems"],
    queryFn: fetchPopularItems,
  });

  const {
    data: banners,
    isLoading: isLoadingBanners,
    error: bannersError,
  } = useQuery({
    queryKey: ["banners"],
    queryFn: fetchBanners,
  });

  return (
    <div className="container mx-auto p-4 pb-16">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <MapPin className="text-orange-500" size={20} />
          {locationLoading ? (
            <span className="text-sm text-gray-500">Carregando localização...</span>
          ) : locationError ? (
            <span className="text-sm text-red-500">Erro ao obter localização</span>
          ) : location ? (
            <span className="text-sm text-gray-700">
              {location.address || `${location.latitude}, ${location.longitude}`}
            </span>
          ) : (
            <span className="text-sm text-gray-500">Localização não disponível</span>
          )}
        </div>
        <Button variant="ghost" size="icon">
          <Heart className="text-gray-600" size={20} />
        </Button>
      </div>

      <div className="relative mb-6">
        <Input
          placeholder="Buscar restaurantes ou pratos..."
          className="pl-10 pr-4 py-2 rounded-full shadow-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
      </div>

      {isLoadingBanners ? (
        <Skeleton className="w-full h-[150px] rounded-lg mb-6" />
      ) : banners && banners.length > 0 ? (
        <BannerCarousel banners={banners} className="mb-6" />
      ) : null}

      <h2 className="text-xl font-bold mb-4">Pratos Populares</h2>
      <ScrollArea className="w-full whitespace-nowrap hide-scrollbar">
        <div className="flex flex-nowrap space-x-4 pb-6">
          {isLoadingPopularItems ? (
            <>
              <Skeleton className="w-[180px] h-[200px] rounded-2xl flex-shrink-0" />
              <Skeleton className="w-[180px] h-[200px] rounded-2xl flex-shrink-0" />
              <Skeleton className="w-[180px] h-[200px] rounded-2xl flex-shrink-0" />
              <Skeleton className="w-[180px] h-[200px] rounded-2xl flex-shrink-0" />
            </>
          ) : popularItems && popularItems.length > 0 ? (
            popularItems.map((item) => (
              <PopularItemCard key={item.id} item={item} className="flex-shrink-0" />
            ))
          ) : (
            <p className="text-gray-500">Nenhum prato popular encontrado.</p>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <h2 className="text-xl font-bold mt-6 mb-4">Restaurantes Próximos</h2>
      <div className="grid gap-4">
        {isLoadingRestaurants ? (
          <>
            <Skeleton className="h-[120px] rounded-xl" />
            <Skeleton className="h-[120px] rounded-xl" />
            <Skeleton className="h-[120px] rounded-xl" />
          </>
        ) : restaurants && restaurants.length > 0 ? (
          restaurants.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              onClick={() => navigate(`/restaurants/${restaurant.id}`)} // Adicionando onClick
            />
          ))
        ) : (
          <p className="text-gray-500">Nenhum restaurante encontrado.</p>
        )}
      </div>
    </div>
  );
}
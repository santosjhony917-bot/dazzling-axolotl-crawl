"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MapPin, Utensils } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { RestaurantCard } from '@/components/restaurant/RestaurantCard'; // Importação nomeada corrigida
import { Skeleton } from '@/components/ui/skeleton';

interface Restaurant {
  id: string;
  name: string;
  image_url?: string;
  category?: string;
  city?: string;
  distance_km?: number;
}

export default function RestaurantResults() {
  const [searchParams] = useSearchParams();
  const initialSearchQuery = searchParams.get("query") || "";
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting user location:", error);
          setUserLocation({ latitude: -7.11948, longitude: -34.86456 }); // João Pessoa coordinates
        }
      );
    } else {
      console.log("Geolocation is not supported by this browser.");
      setUserLocation({ latitude: -7.11948, longitude: -34.86456 }); // João Pessoa coordinates
    }
  }, []);

  useEffect(() => {
    const fetchRestaurants = async () => {
      if (!userLocation) return;

      setLoading(true);
      const { data, error } = await supabase.rpc('find_nearby_restaurants', {
        user_lat: userLocation.latitude,
        user_lng: userLocation.longitude,
        search_query: searchQuery,
        max_distance_km: 50 // Example max distance
      });

      if (error) {
        console.error("Error fetching restaurants:", error);
        setRestaurants([]);
      } else {
        setRestaurants(data || []);
      }
      setLoading(false);
    };

    fetchRestaurants();
  }, [userLocation, searchQuery]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Resultados da Busca</h1>
      <div className="mb-6">
        <Input
          type="text"
          placeholder="Buscar restaurantes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-2 border rounded-md"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, index) => (
            <Skeleton key={index} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {restaurants.length > 0 ? (
            restaurants.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))
          ) : (
            <p className="col-span-full text-center text-gray-500">Nenhum restaurante encontrado.</p>
          )}
        </div>
      )}
    </div>
  );
}
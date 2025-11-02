"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createPageUrl } from "@/utils/createPageUrl";
import { supabase } from "@/integrations/supabase/client";

const PLACEHOLDER_IMAGE_URL = "https://via.placeholder.com/150";

export default function Home() {
  const [restaurants, setRestaurants] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const navigate = useNavigate();

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
          // Fallback to a default location if geolocation fails
          setUserLocation({ latitude: -7.11948, longitude: -34.86456 }); // João Pessoa coordinates
        }
      );
    } else {
      console.log("Geolocation is not supported by this browser.");
      // Fallback to a default location if geolocation is not supported
      setUserLocation({ latitude: -7.11948, longitude: -34.86456 }); // João Pessoa coordinates
    }
  }, []);

  useEffect(() => {
    const fetchRestaurants = async () => {
      if (!userLocation) return;

      let query = supabase
        .from("restaurants")
        .select("*")
        .order("plan", { ascending: false }); // Premium restaurants first

      if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching restaurants:", error);
      } else {
        // Filter by distance using the Supabase function
        const { data: nearbyRestaurants, error: nearbyError } = await supabase.rpc('find_nearby_restaurants', {
          user_lat: userLocation.latitude,
          user_lng: userLocation.longitude,
          search_query: searchQuery,
          max_distance_km: 50 // Example max distance
        });

        if (nearbyError) {
          console.error("Error finding nearby restaurants:", nearbyError);
          setRestaurants(data || []); // Fallback to all restaurants if RPC fails
        } else {
          setRestaurants(nearbyRestaurants || []);
        }
      }
    };

    fetchRestaurants();
  }, [userLocation, searchQuery]);

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <Input
          type="text"
          placeholder="Buscar restaurantes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-2 border rounded-md"
        />
      </div>

      {/* Restaurantes Próximos */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-extrabold text-[#022D68] tracking-tight">Restaurantes Próximos</h2>
          <Button
            variant="link"
            className="text-primary p-0 h-auto"
            onClick={() => navigate(createPageUrl('restaurants'))}
          >
            Ver todos
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {restaurants.map((restaurant: any) => (
            <Card
              key={restaurant.id}
              className="flex overflow-hidden cursor-pointer hover:shadow-soft-lg transition-shadow relative border-none shadow-soft-md rounded-xl"
              onClick={() => navigate(createPageUrl('restaurantProfile', { restaurantId: restaurant.id }))}
            >
              <img
                src={restaurant.image_url || PLACEHOLDER_IMAGE_URL}
                alt={restaurant.name}
                className="w-24 h-28 object-cover flex-shrink-0"
              />
              <div className="p-3 flex-1 min-w-0">
                <CardTitle className="text-lg font-bold truncate text-primary">{restaurant.name}</CardTitle>
                {restaurant.category && (
                  <p className="text-sm text-gray-600 flex items-center mt-1">
                    <Utensils className="w-4 h-4 mr-1 text-gray-500" />
                    {restaurant.category}
                  </p>
                )}
                {restaurant.city && (
                  <p className="text-sm text-gray-600 flex items-center mt-1">
                    <MapPin className="w-4 h-4 mr-1 text-gray-500" />
                    {restaurant.city}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Outras seções da Home, se houver */}
    </div>
  );
}
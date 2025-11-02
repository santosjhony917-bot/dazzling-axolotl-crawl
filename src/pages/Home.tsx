"use client";

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { createPageUrl } from '@/utils/createPageUrl';
import { PLACEHOLDER_IMAGE_URL } from '@/lib/constants';

const Home = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [nearbyRestaurants, setNearbyRestaurants] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
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
          setUserLocation({ latitude: -23.55052, longitude: -46.633309 }); // São Paulo coordinates
        }
      );
    } else {
      console.log("Geolocation is not supported by this browser.");
      // Fallback to a default location
      setUserLocation({ latitude: -23.55052, longitude: -46.633309 }); // São Paulo coordinates
    }
  }, []);

  useEffect(() => {
    const fetchNearbyRestaurants = async () => {
      if (!userLocation) return;

      let query = supabase
        .from('restaurants')
        .select('*, user_favorites(id)')
        .order('plan', { ascending: false })
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching restaurants:', error);
      } else {
        const restaurantsWithDistance = await Promise.all(
          data.map(async (restaurant) => {
            if (restaurant.latitude && restaurant.longitude) {
              const { data: distanceData, error: distanceError } = await supabase.rpc('calculate_distance', {
                lat1: userLocation.latitude,
                lng1: userLocation.longitude,
                lat2: restaurant.latitude,
                lng2: restaurant.longitude,
              });

              if (distanceError) {
                console.error('Error calculating distance:', distanceError);
                return { ...restaurant, distance_km: null };
              }
              return { ...restaurant, distance_km: distanceData };
            }
            return { ...restaurant, distance_km: null };
          })
        );

        const sortedRestaurants = restaurantsWithDistance
          .filter(r => r.distance_km !== null && r.distance_km <= 50) // Filter by 50km radius
          .sort((a, b) => a.distance_km - b.distance_km); // Sort by distance

        setNearbyRestaurants(sortedRestaurants);
      }
    };

    fetchNearbyRestaurants();
  }, [userLocation, searchQuery]);

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-[#022D68] tracking-tight mb-2">Descubra Sabores Próximos</h1>
        <p className="text-lg text-muted-foreground mb-4">Encontre os melhores restaurantes perto de você.</p>
        <Input
          type="text"
          placeholder="Buscar restaurantes..."
          className="w-full p-3 border rounded-lg shadow-sm focus:ring-primary focus:border-primary"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Restaurantes Próximos */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-extrabold text-[#022D68] tracking-tight">Restaurantes Próximos</h2>
          <Button
            variant="link"
            className="text-primary hover:text-primary-dark"
            onClick={() => navigate('/restaurants')}
          >
            Ver Todos
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {nearbyRestaurants.length > 0 ? (
            nearbyRestaurants.map((restaurant) => (
              <Card 
                key={restaurant.id} 
                className="flex overflow-hidden cursor-pointer hover:shadow-soft-lg transition-shadow relative border-none shadow-soft-md rounded-xl"
              >
                <div 
                  className="flex flex-1"
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
                      <p className="text-sm text-muted-foreground truncate">{restaurant.category}</p>
                    )}

                    {restaurant.distance_km !== null && (
                      <div className="flex items-center text-sm text-gray-600 mt-1">
                        <MapPin className="h-4 w-4 mr-1 text-gray-500" />
                        <span>{restaurant.distance_km.toFixed(1)} km</span>
                      </div>
                    )}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-2 right-2 text-gray-500 hover:text-red-500"
                  onClick={() => { /* Handle favorite toggle */ }}
                >
                  <Star className={restaurant.user_favorites.length > 0 ? "h-5 w-5 fill-red-500 text-red-500" : "h-5 w-5"} />
                </Button>
              </Card>
            ))
          ) : (
            <p className="col-span-full text-center text-muted-foreground">Nenhum restaurante próximo encontrado.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
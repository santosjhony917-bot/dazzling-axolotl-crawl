import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, MapPin, Star, Utensils, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useNearbyRestaurants, NearbyRestaurant } from "@/hooks/useNearbyRestaurants";
import { formatDistance } from "@/services/geocoding";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PLACEHOLDER_IMAGE_URL } from "@/constants/assets"; // Importando a constante

const RestaurantResults = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const latParam = searchParams.get('lat');
  const lonParam = searchParams.get('lon');
  const distanceParam = searchParams.get('distance');
  const searchParam = searchParams.get('search');

  const userLat = latParam ? parseFloat(latParam) : null;
  const userLon = lonParam ? parseFloat(lonParam) : null;
  const maxDistance = distanceParam ? parseInt(distanceParam) : 10;
  const initialSearchQuery = searchParam || '';

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [currentLocationLabel, setCurrentLocationLabel] = useState("Localização Atual");

  // Fetch restaurants using the hook
  const { restaurants, loading, error, refetch } = useNearbyRestaurants({
    userLat,
    userLon,
    maxDistanceKm: maxDistance,
    searchQuery: searchQuery,
    enabled: userLat !== null && userLon !== null,
  });

  useEffect(() => {
    // In a real app, we would reverse geocode the lat/lon here to get a readable address label
    if (userLat && userLon) {
      // Placeholder for reverse geocoding logic (using coordinates for now)
      setCurrentLocationLabel(`(${userLat.toFixed(2)}, ${userLon.toFixed(2)})`);
    }
  }, [userLat, userLon]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    // Note: The search query is automatically updated in the useQuery hook due to dependency change.
  };

  const handleGoToSearchPage = () => {
    // Navigate back to the search configuration page
    navigate(`/search-restaurants?lat=${userLat}&lon=${userLon}&distance=${maxDistance}&search=${searchQuery}`);
  };

  const renderRestaurantCard = (restaurant: NearbyRestaurant) => (
    <Card key={restaurant.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
      <img src={restaurant.image_url || PLACEHOLDER_IMAGE_URL} alt={restaurant.name} className="w-full h-48 object-cover" />
      <CardHeader>
        <CardTitle>{restaurant.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600">Cozinha (Plano: {restaurant.plan})</p>
        <div className="flex justify-between items-center mt-2">
          <div className="flex items-center gap-1">
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            <span className="font-semibold">4.5</span> {/* Mock rating for now */}
          </div>
          <div className="flex items-center gap-1 text-gray-500 text-sm">
            <MapPin className="w-4 h-4" />
            <span>{formatDistance(restaurant.distance_km)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Resultados</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <MapPin className="w-5 h-5 text-[#E47948]" />
                <span className="truncate max-w-[100px]">{currentLocationLabel}</span>
              </div>
              <Button onClick={handleSignOut} variant="outline">Sair</Button>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <Input
                type="text"
                placeholder="Buscar por nome..."
                className="w-full pl-10 h-12 text-base rounded-full"
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
            <Button size="icon" variant="outline" className="h-12 w-12 rounded-full shrink-0" onClick={handleGoToSearchPage}>
                <Filter className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="w-full h-48" />
                <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                <CardContent><Skeleton className="h-4 w-1/2" /></CardContent>
              </Card>
            ))}
          </div>
        )}

        {error && (
          <div className="text-center p-8 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <p className="font-semibold">Erro ao carregar restaurantes:</p>
            <p>{error}</p>
            <Button onClick={() => refetch()} className="mt-4">Tentar Novamente</Button>
          </div>
        )}

        {!loading && !error && restaurants.length === 0 && (
          <div className="text-center p-8 text-gray-600">
            <Utensils className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-xl font-semibold">Nenhum restaurante encontrado</p>
            <p className="mt-2">Tente aumentar a distância máxima ({maxDistance} km) ou mudar sua busca.</p>
            <Button onClick={handleGoToSearchPage} className="mt-4 bg-[#022D68] hover:bg-[#022D68]/90">
                Ajustar Busca
            </Button>
          </div>
        )}

        {!loading && restaurants.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.map(renderRestaurantCard)}
          </div>
        )}
      </main>
    </div>
  );
};

export default RestaurantResults;
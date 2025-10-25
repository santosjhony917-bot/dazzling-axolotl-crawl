import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, MapPin, Utensils, Filter, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useNearbyRestaurants, NearbyRestaurant } from "@/hooks/useNearbyRestaurants";
import { formatDistance } from "@/services/geocoding";
import { useState, useEffect, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { PLACEHOLDER_IMAGE_URL } from "@/constants/assets";
import { createPageUrl } from "@/utils/url";
import { useAuthContext } from "@/context/AuthContext";
import { useAuth } from "@/hooks/useAuth"; // Importando useAuth

const PublicRestaurantDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signOut } = useAuthContext();
  const { id } = useParams<{ id: string }>(); // Usando useParams para obter o ID
  const { user } = useAuth(); // Usando user para verificar se é proprietário
  
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
    // Placeholder para reverse geocoding logic (usando coordenadas para agora)
    if (userLat && userLon) {
      setCurrentLocationLabel(`(${userLat.toFixed(2)}, ${userLon.toFixed(2)})`);
    }
  }, [userLat, userLon]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleGoToSearchPage = () => {
    // Navega de volta para a página de configuração de busca
    navigate(`/search-restaurants?lat=${userLat}&lon=${userLon}&distance=${maxDistance}&search=${searchQuery}`);
  };
  
  const handleViewRestaurant = (id: string) => {
    navigate(createPageUrl(`restaurant-profile/${id}`));
  };

  const renderRestaurantCard = (restaurant: NearbyRestaurant) => (
    <Card 
      key={restaurant.id} 
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer border-none rounded-xl"
      onClick={() => handleViewRestaurant(restaurant.id)}
    >
      <div className="relative h-48 bg-gray-100">
        <img src={restaurant.image_url || PLACEHOLDER_IMAGE_URL} alt={restaurant.name} className="w-full h-full object-cover" />
        
        {/* Plan Tag */}
        {restaurant.plan !== 'free' && (
          <div className="absolute top-3 left-3 bg-highlight text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center">
            <Crown className="w-3 h-3 mr-1 fill-white" />
            {restaurant.plan === 'premium' ? 'Premium' : 'Basic'}
          </div>
        )}
      </div>
      
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-extrabold text-primary tracking-tight truncate">{restaurant.name}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-gray-600">{restaurant.category || 'Cozinha Não Definida'}</p>
        <div className="flex justify-between items-center mt-2">
          {/* Removendo Rating */}
          <div className="flex items-center gap-1 text-gray-500 text-sm">
            <MapPin className="w-4 h-4 text-highlight" />
            <span className="font-semibold text-primary">{formatDistance(restaurant.distance_km)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const restaurantsArray = (restaurants || []) as NearbyRestaurant[];

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-primary">Resultados</h1>
            <Button onClick={handleSignOut} variant="outline" className="text-red-600 hover:bg-red-50">Sair</Button>
          </div>
          <div className="mt-4 flex gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <Input
                type="text"
                placeholder="Buscar por nome ou categoria..."
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

      <main className="px-4 py-6">
        {loading && (
          <div className="space-y-4">
            <Skeleton className="w-full h-48 rounded-xl" />
            <Skeleton className="w-full h-48 rounded-xl" />
          </div>
        )}

        {error && (
          <div className="text-center p-8 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <p className="font-semibold">Erro ao carregar restaurantes:</p>
            <p>{error}</p>
            <Button onClick={() => refetch()} className="mt-4">Tentar Novamente</Button>
          </div>
        )}

        {!loading && !error && restaurantsArray.length === 0 && (
          <div className="text-center p-8 text-gray-600 bg-white rounded-xl shadow-md">
            <Utensils className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-xl font-semibold">Nenhum restaurante encontrado</p>
            <p className="mt-2">Tente aumentar a distância máxima ({maxDistance} km) ou mudar sua busca.</p>
            <Button onClick={handleGoToSearchPage} className="mt-4 bg-[#022D68] hover:bg-[#022D68]/90">
                Ajustar Busca
            </Button>
          </div>
        )}

        {!loading && restaurantsArray.length > 0 && (
          <div className="space-y-4">
            {restaurantsArray.map(renderRestaurantCard)}
          </div>
        )}
      </main>
    </div>
  );
};

export default PublicRestaurantDashboard;
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePopularMenuItems } from '@/hooks/usePopularMenuItems';
import { useNearbyRestaurants } from '@/hooks/useNearbyRestaurants';
import HighlightCard from '@/components/restaurant/HighlightCard';
import RestaurantCard from '@/components/restaurant/RestaurantCard';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const { data: popularMenuItems, isLoading: isLoadingPopularItems } = usePopularMenuItems();
  // Correção para useNearbyRestaurants: passando um objeto com a propriedade 'location'
  const { restaurants: nearbyRestaurants, loading: isLoadingNearbyRestaurants } = useNearbyRestaurants({
    location: {
      latitude: userLocation?.latitude,
      longitude: userLocation?.longitude,
    },
    searchQuery: searchQuery
  });

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
          console.error("Erro ao obter localização:", error);
          // Fallback ou mensagem para o usuário
        }
      );
    } else {
      console.log("Geolocalização não é suportada por este navegador.");
      // Fallback ou mensagem para o usuário
    }
  }, []);

  const handleSearch = () => {
    // A busca já é reativa através do useNearbyRestaurants com searchQuery
    // Se precisar de alguma ação adicional ao clicar no botão de busca, adicione aqui.
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#022D68] mb-2">Olá, {user?.user_metadata?.first_name || 'Visitante'}!</h1>
        <p className="text-gray-600 mb-4">Encontre os melhores restaurantes e pratos perto de você.</p>

        <div className="relative flex items-center mb-4">
          <Search className="absolute left-3 text-gray-400" size={20} />
          <Input
            type="text"
            placeholder="Buscar restaurantes ou pratos..."
            className="pl-10 pr-4 py-2 rounded-full border border-gray-300 focus:ring-2 focus:ring-[#E47948] focus:border-transparent"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
          />
        </div>

        <div className="flex items-center text-gray-500">
          <MapPin size={18} className="mr-2" />
          <span>{userLocation ? `Localização atual: ${userLocation.latitude}, ${userLocation.longitude}` : 'Buscando localização...'}</span>
        </div>
      </div>

      {/* Pratos Populares */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-extrabold text-[#022D68] tracking-tight">Pratos Populares</h2>
          <Button variant="link" className="text-[#E47948] p-0 h-auto" onClick={() => navigate('/full-menu')}>
            Ver todos
          </Button>
        </div>
        <ScrollArea className="w-full whitespace-nowrap hide-scrollbar">
          <div className="flex flex-nowrap space-x-4 pb-6 w-max">
            {isLoadingPopularItems ? (
              <>
                <Skeleton className="w-[180px] h-[200px] rounded-2xl" />
                <Skeleton className="w-[180px] h-[200px] rounded-2xl" />
                <Skeleton className="w-[180px] h-[200px] rounded-2xl" />
              </>
            ) : popularMenuItems && popularMenuItems.length > 0 ? (
              popularMenuItems.map((item) => (
                <HighlightCard key={item.id} item={item} />
              ))
            ) : (
              <div className="text-center p-4 text-gray-500 bg-white rounded-xl shadow-soft-md w-full">
                Nenhum prato popular encontrado.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Restaurantes Próximos */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-extrabold text-[#022D68] tracking-tight">Restaurantes Próximos</h2>
          <Button variant="link" className="text-[#E47948] p-0 h-auto" onClick={() => navigate('/restaurants')}>
            Ver todos
          </Button>
        </div>
        <ScrollArea className="w-full whitespace-nowrap hide-scrollbar">
          <div className="flex flex-nowrap space-x-4 pb-6 w-max">
            {isLoadingNearbyRestaurants ? (
              <>
                <Skeleton className="w-[280px] h-[180px] rounded-2xl" />
                <Skeleton className="w-[280px] h-[180px] rounded-2xl" />
                <Skeleton className="w-[280px] h-[180px] rounded-2xl" />
              </>
            ) : nearbyRestaurants && nearbyRestaurants.length > 0 ? (
              nearbyRestaurants.map((restaurant) => (
                <RestaurantCard
                  key={restaurant.id}
                  restaurant={restaurant}
                  onClick={() => navigate(`/restaurant/${restaurant.id}`)}
                />
              ))
            ) : (
              <div className="text-center p-4 text-gray-500 bg-white rounded-xl shadow-soft-md w-full">
                Nenhum restaurante próximo encontrado.
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '../components/ui/carousel';
import { MapPin, Search, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { formatPrice } from '../utils/formatters';

const Home = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [popularDishes, setPopularDishes] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBanners();
    fetchPopularDishes();
    // Optionally, fetch restaurants based on a default location or prompt user for location
  }, []);

  useEffect(() => {
    if (userLocation) {
      fetchRestaurants(userLocation.latitude, userLocation.longitude, searchQuery);
    }
  }, [userLocation, searchQuery]);

  const fetchBanners = async () => {
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (error) {
      toast.error('Erro ao carregar banners.');
      console.error('Error fetching banners:', error);
    } else {
      setBanners(data);
    }
  };

  const fetchPopularDishes = async () => {
    const { data, error } = await supabase
      .rpc('search_menu_items', { search_query: null, p_limit: 10 }) // Assuming a function to get popular items
      .select('*');

    if (error) {
      toast.error('Erro ao carregar pratos populares.');
      console.error('Error fetching popular dishes:', error);
    } else {
      setPopularDishes(data);
    }
  };

  const fetchRestaurants = async (latitude: number, longitude: number, query: string) => {
    const { data, error } = await supabase.rpc('find_nearby_restaurants', {
      user_lat: latitude,
      user_lng: longitude,
      search_query: query,
    });

    if (error) {
      toast.error('Erro ao carregar restaurantes.');
      console.error('Error fetching restaurants:', error);
    } else {
      setRestaurants(data);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (userLocation) {
      fetchRestaurants(userLocation.latitude, userLocation.longitude, searchQuery);
    } else {
      toast.info('Por favor, permita o acesso à sua localização para buscar restaurantes.');
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          toast.success('Localização obtida com sucesso!');
        },
        (error) => {
          toast.error('Erro ao obter localização. Por favor, permita o acesso.');
          console.error('Error getting location:', error);
        }
      );
    } else {
      toast.error('Geolocalização não é suportada pelo seu navegador.');
    }
  };

  const toggleFavorite = async (restaurantId: string) => {
    // Placeholder for favorite logic
    toast.info(`Restaurante ${restaurantId} favoritado/desfavoritado!`);
  };

  return (
    <div className="container mx-auto p-4">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex items-center space-x-2 mb-6">
        <Button variant="outline" size="icon" onClick={getUserLocation}>
          <MapPin className="h-4 w-4" />
        </Button>
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Buscar restaurantes ou pratos..."
            className="pl-10 pr-4 py-2 rounded-md w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button type="submit" className="bg-[#E47948] hover:bg-[#D06A3C]">
          Buscar
        </Button>
      </form>

      {/* Banners Carousel */}
      {banners.length > 0 && (
        <Carousel className="w-full mb-6">
          <CarouselContent>
            {banners.map((banner) => (
              <CarouselItem key={banner.id}>
                <Card className="relative overflow-hidden rounded-lg">
                  <img src={banner.image_url} alt={banner.title} className="w-full h-48 object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent p-4 flex flex-col justify-end">
                    <h3 className="text-white text-xl font-bold">{banner.title}</h3>
                    {banner.subtitle && <p className="text-white text-sm">{banner.subtitle}</p>}
                    {banner.has_button && banner.button_text && banner.button_link && (
                      <Button
                        className="mt-2 self-start"
                        style={{ backgroundColor: banner.button_color, color: banner.text_color }}
                        onClick={() => window.open(banner.button_link, '_blank')}
                      >
                        {banner.button_text}
                      </Button>
                    )}
                  </div>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      )}

      {/* Pratos Populares */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-extrabold text-[#022D68] tracking-tight">Pratos Populares</h2>
          <Button
            variant="link"
            className="text-[#E47948] hover:bg-[#D06A3C] px-0"
            onClick={() => navigate('/popular-dishes')}
          >
            Ver todos
          </Button>
        </div>
        <div className="flex space-x-4 overflow-x-auto pb-2">
          {popularDishes.map((item) => (
            <Card key={item.id} className="min-w-[200px] md:min-w-[250px] lg:min-w-[300px]">
              <CardContent className="p-4">
                <img src={item.image_url} alt={item.name} className="w-full h-32 object-cover rounded-md mb-2" />
                <h3 className="font-semibold text-lg">{item.name}</h3>
                <p className="text-sm text-gray-600">{item.restaurant_name}</p>
                <p className="text-lg font-bold text-[#E47948] mt-2">{formatPrice(item.price)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Nearby Restaurants */}
      <div className="mt-8">
        <h2 className="text-xl font-extrabold text-[#022D68] tracking-tight mb-4">Restaurantes Próximos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {restaurants.length > 0 ? (
            restaurants.map((restaurant) => (
              <Card key={restaurant.id} className="relative">
                <CardContent className="p-0">
                  <img
                    src={restaurant.cover_image_url || 'https://via.placeholder.com/400x200'}
                    alt={restaurant.name}
                    className="w-full h-40 object-cover rounded-t-lg"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-white/70 hover:bg-white"
                    onClick={() => toggleFavorite(restaurant.id)}
                  >
                    <Heart className="h-4 w-4 text-red-500" />
                  </Button>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg">{restaurant.name}</h3>
                    <p className="text-sm text-gray-600">{restaurant.category}</p>
                    <p className="text-sm text-gray-500 flex items-center mt-1">
                      <MapPin className="h-3 w-3 mr-1" /> {restaurant.distance_km?.toFixed(1)} km
                    </p>
                    <Button
                      className="mt-3 w-full bg-[#E47948] hover:bg-[#D06A3C]"
                      onClick={() => navigate(`/restaurant/${restaurant.id}`)}
                    >
                      Ver Restaurante
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="col-span-full text-center text-gray-500">
              Nenhum restaurante encontrado. Tente buscar em outra localização ou permita o acesso à sua localização.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
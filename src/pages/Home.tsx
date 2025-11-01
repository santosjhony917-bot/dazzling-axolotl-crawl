"use client";

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Star, Heart, UtensilsCrossed } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import RestaurantCard from '@/components/RestaurantCard'; // Corrigido para default import
import { useAuthData } from '@/context/AuthContext';
import PremiumBanner from '@/components/restaurant/dashboard/PremiumBanner';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay"; // Mantido, esperando que o rebuild resolva o erro de tipo

const fetchBanners = async () => {
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .eq('is_active', true)
    .eq('target_audience', 'user')
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data;
};

const fetchPopularItems = async () => {
  const { data, error } = await supabase
    .rpc('search_menu_items', { search_query: null, p_limit: 10 });
  if (error) throw error;
  return data;
};

const Home = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { restaurant, isAuthenticated } = useAuthData();

  const { data: banners, isLoading: isLoadingBanners } = useQuery({
    queryKey: ['banners'],
    queryFn: fetchBanners,
  });

  const { data: popularItems, isLoading: isLoadingPopularItems } = useQuery({
    queryKey: ['popularItems'],
    queryFn: fetchPopularItems,
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
          console.error("Error getting location:", error);
          setLocationError("Não foi possível obter sua localização. Por favor, habilite a localização no seu navegador.");
        }
      );
    } else {
      setLocationError("Geolocalização não é suportada pelo seu navegador.");
    }
  }, []);

  const handleSearch = () => {
    // Implement search logic or navigate to search results page
    console.log('Searching for:', searchQuery);
  };

  return (
    <div className="container mx-auto p-4">
      {isAuthenticated && restaurant && (
        <PremiumBanner />
      )}

      {/* Search Bar */}
      <div className="flex items-center space-x-2 mb-6">
        <Input
          type="text"
          placeholder="Buscar restaurantes ou pratos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-grow"
        />
        <Button onClick={handleSearch}>
          <Search className="h-4 w-4 mr-2" /> Buscar
        </Button>
      </div>

      {/* Location Display */}
      {userLocation ? (
        <div className="flex items-center text-sm text-gray-600 mb-6">
          <MapPin className="h-4 w-4 mr-1" />
          <span>Localização atual: {userLocation.latitude.toFixed(2)}, {userLocation.longitude.toFixed(2)}</span>
        </div>
      ) : (
        <div className="flex items-center text-sm text-red-600 mb-6">
          <MapPin className="h-4 w-4 mr-1" />
          <span>{locationError || "Obtendo localização..."}</span>
        </div>
      )}

      {/* Banners */}
      {!isLoadingBanners && banners && banners.length > 0 && (
        <div className="mb-6">
          <Carousel
            plugins={[
              Autoplay({
                delay: 5000,
              }),
            ]}
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent>
              {banners.map((banner) => (
                <CarouselItem key={banner.id}>
                  <div className="relative w-full h-48 rounded-lg overflow-hidden shadow-lg">
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    {/* Overlay Escuro para Contraste */}
                    <div className="absolute inset-0 bg-black/50" />
                    <div className="absolute bottom-4 left-4 z-10 p-4 text-white">
                      <h3 className="text-xl font-bold">{banner.title}</h3>
                      {banner.subtitle && <p className="text-sm mt-1">{banner.subtitle}</p>}
                      {banner.link_url && (
                        <Button asChild className="mt-2 px-4 py-2 rounded-md text-sm font-semibold bg-[#E47948] hover:bg-[#C2653B]">
                          <Link to={banner.link_url}>Ver Mais</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      )}

      {/* Pratos Populares */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-extrabold text-[#022D68] tracking-tight">Pratos Populares</h2>
          <Button variant="ghost" className="text-[#E47948] hover:text-[#C2653B]">
            Ver Todos
          </Button>
        </div>
        {isLoadingPopularItems ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="bg-gray-200 rounded-lg shadow-md p-4 animate-pulse h-48"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {popularItems?.map((item: any) => (
              <div key={item.item_id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <img src={item.item_image_url || 'https://via.placeholder.com/150'} alt={item.item_name} className="w-full h-32 object-cover" />
                <div className="p-4">
                  <h3 className="font-semibold text-lg text-[#022D68]">{item.item_name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{item.restaurant_name}</p>
                  <p className="text-md font-bold text-[#E47948]">R$ {item.item_price.toFixed(2)}</p>
                  <div className="flex items-center mt-2">
                    <Heart className="h-4 w-4 text-gray-400 mr-1" />
                    <span className="text-sm text-gray-500">Favoritar</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Restaurantes em Destaque (Placeholder) */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-extrabold text-[#022D68] tracking-tight">Restaurantes em Destaque</h2>
          <Button variant="ghost" className="text-[#E47948] hover:text-[#C2653B]">
            Ver Todos
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Placeholder for restaurant cards */}
          {[...Array(4)].map((_, index) => (
            <RestaurantCard key={index} restaurant={{
              id: `placeholder-${index}`,
              name: `Restaurante Exemplo ${index + 1}`,
              description: 'Uma breve descrição do restaurante.',
              image_url: 'https://via.placeholder.com/300',
              cover_image_url: 'https://via.placeholder.com/600',
              plan: 'free',
              category: 'Comida Brasileira',
              city: 'São Paulo',
              state: 'SP',
              latitude: -23.55,
              longitude: -46.63,
              user_id: 'some-user-id',
              created_at: new Date().toISOString(),
              phone: null,
              email: null,
              cnpj: null,
              whatsapp_url: null,
              ifood_url: null,
              other_url: null,
              address: null,
              number: null,
              neighborhood: null,
              cep: null,
              opening_hours: null,
              external_url: null,
              followers_override: 0,
              payment_methods: null,
              social_networks: null,
            }} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
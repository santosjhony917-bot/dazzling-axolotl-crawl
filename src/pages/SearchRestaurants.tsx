"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { useUserSearchLocation } from '@/hooks/useUserSearchLocation';
import { useNearbyRestaurants } from '@/hooks/useNearbyRestaurants';
import RestaurantCard from '@/components/RestaurantCard';
import { showError, showSuccess } from '@/utils/toast';
import { UserSearchLocation } from '@/types/user';
import { createPageUrl } from '@/utils/navigation';

interface GeocodedAddress {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
}

const mockGeocodeAddress = async (address: string): Promise<GeocodedAddress | null> => {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      if (address.toLowerCase().includes('são paulo')) {
        resolve({
          formattedAddress: 'São Paulo, SP, Brasil',
          latitude: -23.55052,
          longitude: -46.633309,
          city: 'São Paulo',
          state: 'SP',
        });
      } else if (address.toLowerCase().includes('rio de janeiro')) {
        resolve({
          formattedAddress: 'Rio de Janeiro, RJ, Brasil',
          latitude: -22.906847,
          longitude: -43.172897,
          city: 'Rio de Janeiro',
          state: 'RJ',
        });
      } else {
        resolve(null);
      }
    }, 500);
  });
};

const SearchRestaurants: React.FC = () => {
  const navigate = useNavigate();
  const { location: userSearchLocation, saveLocation, isLoading: isLocationLoading } = useUserSearchLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [loadingGeocode, setLoadingGeocode] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<UserSearchLocation | null>(userSearchLocation);

  useEffect(() => {
    setSelectedLocation(userSearchLocation);
  }, [userSearchLocation]);

  const { restaurants, isLoading: isLoadingRestaurants } = useNearbyRestaurants({
    userLat: selectedLocation?.latitude || 0,
    userLng: selectedLocation?.longitude || 0,
    searchQuery: searchQuery,
    enabled: !!selectedLocation?.latitude && !!selectedLocation?.longitude,
  });

  const handleAddressSearch = async () => {
    setLoadingGeocode(true);
    const geocoded = await mockGeocodeAddress(addressInput);
    setLoadingGeocode(false);

    if (geocoded) {
      const newLocation: UserSearchLocation = {
        address: geocoded.formattedAddress,
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
        cep: geocoded.cep,
        city: geocoded.city,
        state: geocoded.state,
        neighborhood: geocoded.neighborhood,
        street: geocoded.street,
      };
      const result = await saveLocation(newLocation);
      if (result && result.error) {
        showError(`Erro ao salvar localização: ${result.error}`);
      } else {
        showSuccess('Localização atualizada!');
        setSelectedLocation(newLocation);
      }
    } else {
      showError('Endereço não encontrado.');
    }
  };

  const handleRestaurantClick = (restaurantId: string) => {
    navigate(createPageUrl('restaurantProfile', { restaurantId }));
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-[#022D68] mb-6">Buscar Restaurantes</h1>

      <div className="mb-6 space-y-4">
        <div>
          <Label htmlFor="addressInput">Sua Localização</Label>
          <div className="flex space-x-2">
            <Input
              id="addressInput"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder={selectedLocation?.address || "Digite um endereço"}
              disabled={isLocationLoading}
            />
            <Button onClick={handleAddressSearch} disabled={loadingGeocode || isLocationLoading}>
              {loadingGeocode ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
            </Button>
          </div>
          {isLocationLoading && <p className="text-sm text-gray-500 mt-1">Carregando localização...</p>}
        </div>

        <div>
          <Label htmlFor="searchQuery">Nome do Restaurante ou Tipo de Cozinha</Label>
          <div className="flex space-x-2">
            <Input
              id="searchQuery"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ex: Pizza, Sushi, Restaurante do João"
            />
            <Button onClick={() => { /* Trigger search via useNearbyRestaurants */ }}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {isLoadingRestaurants ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {restaurants && restaurants.length > 0 ? (
            restaurants.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                onClick={() => handleRestaurantClick(restaurant.id)}
              />
            ))
          ) : (
            <p className="col-span-full text-center text-gray-500">Nenhum restaurante encontrado perto de "{selectedLocation?.address}".</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchRestaurants;
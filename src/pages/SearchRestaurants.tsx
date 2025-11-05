import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, MapPin, LocateFixed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import UserLocationModal from '@/components/restaurant/UserLocationModal';
import { useUserSearchLocation } from '@/hooks/useUserSearchLocation';
import { showError, showSuccess } from '@/utils/toast';
import { getCurrentLocationAddress, GeocodedAddress, saveLastSearchLocation } from '@/services/geolocation';

const MOCK_LOCATION_COORDS = { lat: -7.1195, lon: -34.8450 };
const MOCK_ADDRESS = "Localização Padrão (João Pessoa)";

export default function SearchRestaurants() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const initialDistance = searchParams.get('distance') ? parseInt(searchParams.get('distance')!) : 10;
  const initialSearch = searchParams.get('search') || '';

  const [distance, setDistance] = useState<number[]>([initialDistance]);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  
  const { location, isLoading: isLocationLoading, refetch: refetchLocation, saveLocation } = useUserSearchLocation();
  const [showLocationModal, setShowLocationModal] = useState(false);

  const userLat = location.latitude;
  const userLon = location.longitude;
  const currentAddress = location.address;

  // Efeito para garantir que a localização inicial seja carregada ou o modal seja aberto
  useEffect(() => {
    // Se a localização for a padrão (mock) e não estivermos carregando, abrimos o modal para forçar a definição.
    if (!isLocationLoading && location.address === MOCK_ADDRESS) {
      setShowLocationModal(true);
    }
  }, [isLocationLoading, location.address]);

  const handleLocationUpdate = useCallback(async (useGPS: boolean) => {
    if (!useGPS) {
      // Se não for para usar GPS, abrimos o modal para entrada manual
      setShowLocationModal(true);
      return;
    }

    // Tenta obter a localização real via GPS
    try {
      const addressData = await getCurrentLocationAddress();
      
      // Salva a localização obtida via GPS
      const { error } = await saveLocation(addressData);
      
      if (!error) {
        showSuccess("Localização atualizada via GPS!");
        refetchLocation();
      } else {
        throw new Error(error);
      }
    } catch (error) {
      console.error("Failed to fetch location via GPS:", error);
      showError("Não foi possível obter sua localização via GPS. Por favor, digite o endereço.");
      setShowLocationModal(true);
    }
  }, [saveLocation, refetchLocation]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (userLat === null || userLon === null || currentAddress === MOCK_ADDRESS) {
      showError("Por favor, defina sua localização de busca primeiro.");
      setShowLocationModal(true);
      return;
    }
    
    navigate(`/restaurant-results?lat=${userLat}&lon=${userLon}&distance=${distance[0]}&search=${searchQuery}`);
  };
  
  const handleLocationSaved = () => {
    refetchLocation();
    setShowLocationModal(false);
  };

  return (
    <div className="min-h-screen bg-background-light flex flex-col">
      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-primary hover:bg-primary/5">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h2 className="text-primary text-xl font-bold leading-tight tracking-[-0.015em]">Ajustar Busca</h2>
          <div className="size-10 shrink-0"></div>
        </div>
      </header>

      <main className="flex-grow p-4 w-full max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Localização Atual */}
          <div className="bg-white p-4 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold text-primary mb-3 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-highlight" />
              Localização de Busca
            </h3>
            <div className="flex items-center justify-between">
              <p className={`text-base ${isLocationLoading ? 'text-gray-500 italic' : 'text-gray-800'}`}>
                {isLocationLoading ? "Obtendo endereço..." : currentAddress}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleLocationUpdate(true)}
                disabled={isLocationLoading}
                className="text-highlight border-highlight hover:bg-highlight/5 rounded-xl"
              >
                <LocateFixed className="w-4 h-4 mr-1" />
                {isLocationLoading ? "Aguarde" : "Atualizar GPS"}
              </Button>
            </div>
            <Button 
                variant="link" 
                size="sm" 
                onClick={() => setShowLocationModal(true)}
                className="text-primary p-0 h-auto mt-2"
            >
                Digitar Endereço
            </Button>
          </div>

          {/* Filtro de Distância */}
          <div className="bg-white p-4 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold text-primary mb-4">
              Distância Máxima: <span className="text-highlight">{distance[0]} km</span>
            </h3>
            <Slider
              value={distance}
              max={50}
              min={1}
              step={1}
              onValueChange={setDistance}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-500 mt-2">
              <span>1 km</span>
              <span>50 km</span>
            </div>
          </div>

          {/* Campo de Busca */}
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <Input
                type="text"
                placeholder="Buscar por nome ou tipo de comida..."
                className="w-full pl-10 h-12 text-base rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              disabled={isLocationLoading || userLat === null || userLon === null}
              className="w-full bg-primary text-white font-bold h-12 text-lg hover:bg-primary/90 rounded-xl shadow-lg transition-all"
            >
              <Search className="w-5 h-5 mr-2" />
              {isLocationLoading ? "Aguardando Localização..." : "Buscar Restaurantes"}
            </Button>
          </form>
        </motion.div>
      </main>
      
      {/* User Location Modal (para entrada manual) */}
      <UserLocationModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        currentAddress={currentAddress}
        onLocationSaved={handleLocationSaved}
      />
    </div>
  );
}
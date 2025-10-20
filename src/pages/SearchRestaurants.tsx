import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, MapPin, LocateFixed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import LocationPermissionModal, { checkLocationPreference } from '@/components/LocationPermissionModal';
import { getCurrentLocationAddress, GeocodedAddress } from '@/services/geolocation';
import { showError, showSuccess } from '@/utils/toast';

const MOCK_LOCATION_COORDS = { lat: -7.1195, lon: -34.8450 };

export default function SearchRestaurants() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const initialDistance = searchParams.get('distance') ? parseInt(searchParams.get('distance')!) : 10;
  const initialSearch = searchParams.get('search') || '';
  const initialLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null;
  const initialLon = searchParams.get('lon') ? parseFloat(searchParams.get('lon')!) : null;

  const [distance, setDistance] = useState<number[]>([initialDistance]);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [location, setLocation] = useState<{ lat: number | null; lon: number | null; address: string }>({
    lat: initialLat,
    lon: initialLon,
    address: "Obtendo localização...",
  });
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  const handleLocationUpdate = (addressData: GeocodedAddress) => {
    setLocation({
      lat: addressData.lat,
      lon: addressData.lon,
      address: `${addressData.street}, ${addressData.city} - ${addressData.state}`,
    });
    setLoadingLocation(false);
  };

  const fetchLocation = async (useGPS: boolean) => {
    setLoadingLocation(true);
    
    if (!useGPS) {
      // Se for para usar mock location, não tentamos o GPS
      console.log("Usando localização mock (João Pessoa).");
      handleLocationUpdate({
        street: "Av. Epitácio Pessoa",
        neighborhood: "Tambau",
        city: "João Pessoa",
        state: "PB",
        cep: "58039-000",
        lat: MOCK_LOCATION_COORDS.lat,
        lon: MOCK_LOCATION_COORDS.lon,
      });
      return;
    }

    try {
      // Esta chamada dispara o prompt de permissão do navegador/dispositivo
      const addressData = await getCurrentLocationAddress();
      handleLocationUpdate(addressData);
      showSuccess("Localização atualizada via GPS!");
    } catch (error) {
      console.error("Failed to fetch location via GPS:", error);
      showError("Não foi possível obter sua localização via GPS. Usando localização padrão.");
      
      // Fallback to mock location if GPS fails or permission is denied
      handleLocationUpdate({
        street: "Av. Epitácio Pessoa",
        neighborhood: "Tambau",
        city: "João Pessoa",
        state: "PB",
        cep: "58039-000",
        lat: MOCK_LOCATION_COORDS.lat,
        lon: MOCK_LOCATION_COORDS.lon,
      });
    }
  };

  useEffect(() => {
    // checkLocationPreference agora é síncrona
    const preference = checkLocationPreference();
    if (preference === 'unset') {
      // Se a preferência não foi definida, mostramos o modal.
      setShowPermissionModal(true);
    } else if (preference === 'granted') {
      // Se já foi concedida, tentamos buscar via GPS
      fetchLocation(true);
    } else if (preference === 'mock') {
      // Se for para usar mock, usamos mock
      fetchLocation(false);
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (location.lat === null || location.lon === null) {
      showError("Aguarde enquanto obtemos sua localização.");
      return;
    }
    
    navigate(`/restaurant-results?lat=${location.lat}&lon=${location.lon}&distance=${distance[0]}&search=${searchQuery}`);
  };
  
  const handlePermissionGranted = () => {
    setShowPermissionModal(false);
    fetchLocation(true);
  };
  
  const handleUseMockLocation = () => {
    setShowPermissionModal(false);
    fetchLocation(false);
  };
  
  const handlePermissionDenied = () => {
    setShowPermissionModal(false);
    // Se o usuário negar, usamos a localização mockada como fallback
    fetchLocation(false);
  };

  return (
    <div className="min-h-screen bg-[#f5f7f8] flex flex-col">
      <LocationPermissionModal
        isOpen={showPermissionModal}
        onGrant={handlePermissionGranted}
        onDeny={handlePermissionDenied}
        onUseMockLocation={handleUseMockLocation}
      />

      <header className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-[#022D68] hover:bg-[#022D68]/5">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h2 className="text-[#022D68] text-xl font-bold leading-tight tracking-[-0.015em]">Buscar Restaurantes</h2>
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
            <h3 className="text-lg font-semibold text-[#022D68] mb-3 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-[#E47948]" />
              Sua Localização
            </h3>
            <div className="flex items-center justify-between">
              <p className={`text-base ${loadingLocation ? 'text-gray-500 italic' : 'text-gray-800'}`}>
                {loadingLocation ? "Obtendo endereço..." : location.address}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fetchLocation(true)}
                disabled={loadingLocation}
                className="text-[#E47948] border-[#E47948] hover:bg-[#E47948]/5"
              >
                <LocateFixed className="w-4 h-4 mr-1" />
                {loadingLocation ? "Aguarde" : "Atualizar GPS"}
              </Button>
            </div>
          </div>

          {/* Filtro de Distância */}
          <div className="bg-white p-4 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold text-[#022D68] mb-4">
              Distância Máxima: <span className="text-[#E47948]">{distance[0]} km</span>
            </h3>
            <Slider
              defaultValue={[initialDistance]}
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
                className="w-full pl-10 h-12 text-base rounded-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              disabled={loadingLocation || location.lat === null}
              className="w-full bg-[#022D68] text-white font-bold h-12 text-lg hover:bg-[#022D68]/90 rounded-full shadow-lg transition-all"
            >
              <Search className="w-5 h-5 mr-2" />
              {loadingLocation ? "Aguardando Localização..." : "Buscar Restaurantes"}
            </Button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
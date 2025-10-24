import { useState, useEffect, memo } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils/url";
import CustomerBottomNav from "@/components/CustomerBottomNav";
import LocationPermissionModal, { checkLocationPreference } from "@/components/LocationPermissionModal";
import { Button } from "@/components/ui/button";
import { MapPin, Search, Utensils } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { showSuccess, showError } from "@/utils/toast";
import { PLACEHOLDER_IMAGE_URL } from "@/constants/assets";
import { loadLastSearchLocation, getCurrentLocationAddress, saveLastSearchLocation } from "@/services/geolocation"; // Importando saveLastSearchLocation

// Componente memoizado para itens de restaurante
const RestaurantItem = memo(({ restaurant }: { restaurant: any }) => (
  <Card key={restaurant.id} className="rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer">
    <img src={restaurant.imageUrl} alt={restaurant.name} className="w-full h-32 object-cover" />
    <CardContent className="p-4">
      <h2 className="text-lg font-semibold text-[#022D68]">{restaurant.name}</h2>
      <p className="text-sm text-gray-600">{restaurant.cuisine}</p>
      <div className="flex items-center justify-between mt-2 text-sm">
        <span className="flex items-center text-[#E47948] font-medium">
          ★ {restaurant.rating}
        </span>
        <span className="text-gray-500">{restaurant.distance} km</span>
      </div>
    </CardContent>
  </Card>
));

// Mock data for demonstration
const mockRestaurants = [
  { id: 1, name: "Restaurante A", cuisine: "Italiana", rating: 4.5, distance: 1.2, imageUrl: PLACEHOLDER_IMAGE_URL },
  { id: 2, name: "Churrascaria B", cuisine: "Churrasco", rating: 4.8, distance: 0.5, imageUrl: PLACEHOLDER_IMAGE_URL },
  { id: 3, name: "Japa C", cuisine: "Japonesa", rating: 4.2, distance: 2.1, imageUrl: PLACEHOLDER_IMAGE_URL },
];

const Index = () => {
  const navigate = useNavigate();
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [userLocation, setUserLocation] = useState("Buscando localização...");

  useEffect(() => {
    const checkLocation = async () => {
      const preference = checkLocationPreference();
      const savedLocation = loadLastSearchLocation();

      if (savedLocation) {
        setUserLocation(savedLocation.address);
        return;
      }

      if (preference === 'unset') {
        setLocationModalOpen(true);
      } else if (preference === 'granted') {
        try {
          const addressData = await getCurrentLocationAddress();
          setUserLocation(addressData.formattedAddress);
          saveLastSearchLocation(addressData); // Salva se for a primeira vez e o GPS funcionar
        } catch (e) {
          setUserLocation("Localização Padrão");
        }
      } else {
        // Se 'denied' ou 'mock', usamos o mock e salvamos para persistir
        try {
            const addressData = await getCurrentLocationAddress(); // Isso usará o mock/fallback
            setUserLocation(addressData.formattedAddress);
            saveLastSearchLocation(addressData);
        } catch (e) {
            setUserLocation("Localização Padrão");
        }
      }
    };
    checkLocation();
  }, []);

  const handleLocationGranted = async () => {
    setLocationModalOpen(false);
    // Força a busca e salva no localStorage
    try {
        const addressData = await getCurrentLocationAddress();
        setUserLocation(addressData.formattedAddress);
        saveLastSearchLocation(addressData);
        showSuccess("Localização definida com sucesso!");
    } catch (e) {
        setUserLocation("Localização Padrão");
        showError("Falha ao obter localização GPS. Usando padrão.");
    }
  };

  const handleLocationDenied = async () => {
    setLocationModalOpen(false);
    // Se negado, garante que o mock seja salvo para persistir
    try {
        const addressData = await getCurrentLocationAddress(); // Isso usará o mock/fallback
        setUserLocation(addressData.formattedAddress);
        saveLastSearchLocation(addressData);
    } catch (e) {
        setUserLocation("Localização Padrão");
    }
  };
  
  const handleUseMockLocation = async () => {
    setLocationModalOpen(false);
    // Se mock, garante que o mock seja salvo para persistir
    try {
        const addressData = await getCurrentLocationAddress(); // Isso usará o mock/fallback
        setUserLocation(addressData.formattedAddress);
        saveLastSearchLocation(addressData);
        showSuccess("Usando localização padrão.");
    } catch (e) {
        setUserLocation("Localização Padrão");
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#022D68]">
            <MapPin className="h-5 w-5" />
            <span className="text-sm font-medium truncate max-w-[150px]">{userLocation}</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-[#022D68] hover:bg-[#022D68]/5"
            onClick={() => navigate(createPageUrl('profile'))}
          >
            <Utensils className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Search Bar */}
        <div className="mt-4">
          <div 
            className="flex items-center h-12 bg-gray-100 rounded-full px-4 text-gray-500 cursor-pointer"
            onClick={() => navigate(createPageUrl('search-restaurants'))}
          >
            <Search className="h-5 w-5 mr-2" />
            <span className="text-sm">Buscar restaurantes, pratos...</span>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-6">
        <h1 className="text-2xl font-bold text-[#022D68]">Restaurantes Próximos</h1>
        
        {/* Restaurant List (Mock) */}
        <div className="space-y-4">
          {mockRestaurants.map((restaurant) => (
            <RestaurantItem key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>
        
        <div className="text-center pt-4">
          <Button variant="outline" className="rounded-full border-[#E47948] text-[#E47948] hover:bg-[#E47948]/5">
            Ver mais restaurantes
          </Button>
        </div>
      </main>

      {/* Bottom Navigation */}
      <CustomerBottomNav selectedTab="home" />

      {/* Location Modal */}
      <LocationPermissionModal
        isOpen={locationModalOpen}
        onGrant={handleLocationGranted}
        onDeny={handleLocationDenied}
        onUseMockLocation={handleUseMockLocation}
      />
    </div>
  );
};

export default Index;
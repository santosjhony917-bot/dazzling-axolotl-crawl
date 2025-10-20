import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils/url";
import CustomerBottomNav from "@/components/CustomerBottomNav";
import LocationPermissionModal, { checkLocationPreference } from "@/components/LocationPermissionModal";
import { Button } from "@/components/ui/button";
import { MapPin, Search, Utensils } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { showSuccess } from "@/utils/toast";

// Mock data for demonstration
const mockRestaurants = [
  { id: 1, name: "Restaurante A", cuisine: "Italiana", rating: 4.5, distance: 1.2, imageUrl: "https://via.placeholder.com/150?text=Restaurante+A" },
  { id: 2, name: "Churrascaria B", cuisine: "Churrasco", rating: 4.8, distance: 0.5, imageUrl: "https://via.placeholder.com/150?text=Churrascaria+B" },
  { id: 3, name: "Japa C", cuisine: "Japonesa", rating: 4.2, distance: 2.1, imageUrl: "https://via.placeholder.com/150?text=Japa+C" },
];

const Index = () => {
  const navigate = useNavigate();
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [userLocation, setUserLocation] = useState("Localização Atual");

  useEffect(() => {
    const checkLocation = async () => {
      const preference = await checkLocationPreference();
      if (preference === 'unknown') {
        setLocationModalOpen(true);
      } else if (preference === 'granted') {
        // Simulate fetching location
        setUserLocation("Rua das Flores, 123");
      }
    };
    checkLocation();
  }, []);

  const handleLocationGranted = () => {
    setLocationModalOpen(false);
    setUserLocation("Rua das Flores, 123");
    showSuccess("Localização definida com sucesso!");
  };

  const handleLocationDenied = () => {
    setLocationModalOpen(false);
    setUserLocation("Localização Padrão");
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
      />
    </div>
  );
};

export default Index;
import { useState, useEffect } from "react";
import { MapPin, User, Search, ArrowLeft } from "lucide-react";
import CustomerBottomNav from "@/components/ClientBottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { LocationPermissionModal } from "@/components/LocationPermissionModal";
// import appLogo from "@/assets/filter-food-logo-new.png";
const appLogo = "/assets/filterfood-logo.png";

const SearchRestaurants = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [distance, setDistance] = useState([20]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentLocation, setCurrentLocation] = useState("Obtendo localização...");
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  
  // Check if user has saved location preference - same as CustomerHome
  useEffect(() => {
    const hasLocationPermission = localStorage.getItem('locationPermissionGranted');
    if (!hasLocationPermission) {
      // First time - show location modal
      setShowLocationModal(true);
    } else {
      // Try to get user location
      requestUserLocation();
    }
  }, []);

  const requestUserLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocalização indisponível",
        description: "Seu navegador não suporta geolocalização",
        variant: "destructive",
      });
      // Use default location
      setUserCoords({ lat: -7.1195, lon: -34.8450 });
      setCurrentLocation("João Pessoa, PB");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserCoords({ lat: latitude, lon: longitude });
        setCurrentLocation("Localização obtida");
        
        // Save permission
        localStorage.setItem('locationPermissionGranted', 'true');
      },
      (error) => {
        console.error('Error getting location:', error);
        
        // Use default location
        setUserCoords({ lat: -7.1195, lon: -34.8450 });
        setCurrentLocation("João Pessoa, PB");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // Cache for 5 minutes
      }
    );
  };

  const handleEnableLocation = () => {
    setShowLocationModal(false);
    requestUserLocation();
  };

  const handleUseMockLocation = () => {
    setShowLocationModal(false);
    setUserCoords({ lat: -7.1195, lon: -34.8450 });
    setCurrentLocation("João Pessoa, PB");
    
    localStorage.setItem('useMockLocation', 'true');
    
    toast({
      title: "Localização configurada",
      description: "Usando: João Pessoa, PB",
    });
  };
  
  const applyFilters = () => {
    if (!userCoords) {
      toast({
        title: "Aguardando localização",
        description: "Por favor, aguarde enquanto obtemos sua localização",
        variant: "destructive",
      });
      return;
    }

    navigate(`/restaurant-results?distance=${distance[0]}&lat=${userCoords.lat}&lon=${userCoords.lon}&search=${encodeURIComponent(searchQuery)}`);
  };
  return <div className="min-h-screen bg-background pb-20">
      {/* Header - Flat Design */}
      <div className="bg-gradient-to-r from-[#002E6D] to-[#014D9F] px-4 pt-3 pb-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/home")} className="text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={appLogo} alt="FilterFood" className="h-7 w-auto" />
          </div>
          <Link to="/profile">
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors">
              <User className="h-4 w-4 text-white" />
            </div>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 pb-24 mt-4">
        <div className="bg-white border border-border/30 rounded-2xl p-4 shadow-sm">
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input type="text" placeholder="Buscar restaurantes ou pratos..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 pr-3 h-10 bg-muted/40 border-border/30 rounded-2xl text-sm focus:bg-background transition-colors" />
          </div>

          {/* Distance Display */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-foreground">Distância máxima</span>
              <div className="bg-muted px-2 py-0.5 rounded-2xl">
                <span className="text-xs font-medium text-foreground">
                  {distance[0]} km
                </span>
              </div>
            </div>
            <Slider value={distance} onValueChange={setDistance} min={1} max={50} step={1} className="mb-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 km</span>
              <span>50 km</span>
            </div>
          </div>

          {/* Apply Filters Button */}
          <Button onClick={applyFilters} className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-2xl">
            Buscar
          </Button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <CustomerBottomNav selectedTab="buscar" />

      {/* Location Permission Modal */}
      <LocationPermissionModal
        open={showLocationModal}
        onOpenChange={setShowLocationModal}
        onEnableLocation={handleEnableLocation}
        onUseMockLocation={handleUseMockLocation}
      />
    </div>;
};
export default SearchRestaurants;
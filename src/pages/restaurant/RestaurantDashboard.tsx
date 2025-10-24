import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Utensils, TrendingUp, DollarSign, Clock, ChevronRight, Loader2, Search } from 'lucide-react';
import RestaurantBottomNav from '@/components/restaurant/RestaurantBottomNav';
import { useUserSearchLocation } from '@/hooks/useUserSearchLocation';
import UserLocationModal from '@/components/restaurant/UserLocationModal';
import { useUserRole } from '@/hooks/useUserRole';

// Mock Data
const mockStats = {
  revenue: 1250.50,
  orders: 45,
  avgTime: 22,
};

// Helper Components (Definidos localmente para manter a estrutura)

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color }) => (
  <Card className="rounded-xl shadow-md text-center p-3">
    <CardHeader className="p-0 pb-1">
      <Icon className={`w-6 h-6 mx-auto ${color}`} />
    </CardHeader>
    <CardContent className="p-0">
      <p className="text-xs font-medium text-gray-500">{title}</p>
      <p className="text-lg font-bold text-[#022D68] mt-0.5">{value}</p>
    </CardContent>
  </Card>
);

interface ManagementLinkProps {
  title: string;
  description: string;
  onClick: () => void;
}

const ManagementLink: React.FC<ManagementLinkProps> = ({ title, description, onClick }) => (
  <Card 
    className="rounded-xl shadow-md cursor-pointer hover:shadow-lg transition-shadow"
    onClick={onClick}
  >
    <CardContent className="p-4 flex items-center justify-between">
      <div>
        <h3 className="text-base font-semibold text-[#022D68]">{title}</h3>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400" />
    </CardContent>
  </Card>
);


const RestaurantDashboard = () => {
  const navigate = useNavigate();
  const { location, isLoading, refetch } = useUserSearchLocation();
  const { isPremium } = useUserRole();
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const handleLocationSaved = () => {
    refetch();
  };
  
  const handleGoToCompetitorSearch = () => {
    if (location.latitude === 0 && location.longitude === 0) {
      alert("Por favor, defina sua localização de busca primeiro.");
      setIsLocationModalOpen(true);
      return;
    }
    // Navega para a tela de busca, passando a localização salva como parâmetros
    navigate(`/restaurant-area/stats?lat=${location.latitude}&lon=${location.longitude}`);
  };

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#022D68]">Dashboard</h1>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-[#022D68] hover:bg-[#022D68]/5"
            onClick={() => navigate(createPageUrl('restaurant-area/profile-menu'))}
          >
            <Utensils className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="p-4 space-y-6">
        
        {/* User Search Location Card (Para definir a localização de busca) */}
        <Card 
          className="rounded-xl shadow-md cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setIsLocationModalOpen(true)}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="text-primary w-7 h-7" />
              <div>
                <p className="text-text-light/60 dark:text-text-dark/60 text-xs font-medium">
                  Localização de Busca
                </p>
                {isLoading ? (
                  <div className="flex items-center text-sm font-semibold text-primary">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Carregando...
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-primary truncate max-w-[200px]">
                    {location.address}
                  </p>
                )}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </CardContent>
        </Card>

        {/* Statistics Cards */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard 
            title="Receita (Hoje)" 
            value={`R$ ${mockStats.revenue.toFixed(2)}`} 
            icon={DollarSign} 
            color="text-green-600" 
          />
          <StatCard 
            title="Pedidos (Hoje)" 
            value={mockStats.orders.toString()} 
            icon={TrendingUp} 
            color="text-blue-600" 
          />
          <StatCard 
            title="Tempo Médio" 
            value={`${mockStats.avgTime} min`} 
            icon={Clock} 
            color="text-yellow-600" 
          />
        </div>

        {/* Management Links */}
        <div className="space-y-3">
          <ManagementLink 
            title="Buscar Concorrentes" 
            description="Encontre restaurantes próximos à sua localização de busca." 
            onClick={handleGoToCompetitorSearch}
          />
          <ManagementLink 
            title="Gerenciar Cardápio" 
            description="Adicione, edite ou remova pratos e categorias." 
            onClick={() => navigate(createPageUrl('restaurant-area/menu'))}
          />
          <ManagementLink 
            title="Configurações de Perfil" 
            description="Edite informações, horários e plano do restaurante." 
            onClick={() => navigate(createPageUrl('restaurant-area/profile-menu'))}
          />
        </div>
      </main>

      {/* Bottom Navigation */}
      <RestaurantBottomNav selectedTab="home" isFree={!isPremium} />

      {/* User Location Modal */}
      <UserLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentAddress={location.address}
        onLocationSaved={handleLocationSaved}
      />
    </div>
  );
};

export default RestaurantDashboard;
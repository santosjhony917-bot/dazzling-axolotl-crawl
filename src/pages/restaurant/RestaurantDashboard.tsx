import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Utensils, MapPin, DollarSign, Search, ArrowRight, Settings, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createPageUrl } from '@/utils/url';
import { useRestaurantContext } from '@/context/RestaurantContext';
import { useAuthContext } from '@/context/AuthContext';
import { showError, showSuccess } from '@/utils/toast';
import RestaurantBottomNav from '@/components/restaurant/RestaurantBottomNav';
import PremiumBanner from '@/components/restaurant/dashboard/PremiumBanner';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export default function RestaurantDashboard() {
  const navigate = useNavigate();
  const { restaurant, isLoading: isRestaurantLoading } = useRestaurantContext();
  const { profile } = useAuthContext();
  
  const [minPrice, setMinPrice] = useState(10);
  const [maxPrice, setMaxPrice] = useState(50);
  const [maxDistanceKm, setMaxDistanceKm] = useState(10);
  
  const isPremium = restaurant?.plan === 'premium' || restaurant?.plan === 'premium_gift';

  if (isRestaurantLoading) {
    return <div className="p-4 text-center text-gray-500">Carregando dashboard...</div>;
  }

  if (!restaurant) {
    // Este caso deve ser tratado pelo RestaurantArea, mas é um fallback seguro
    return <div className="p-4 text-center text-red-500">Nenhum restaurante encontrado.</div>;
  }

  const handleApplyPriceFilter = () => {
    // Lógica de filtro (mock)
    showSuccess(`Filtro de preço aplicado: R$${minPrice.toFixed(2)} a R$${maxPrice.toFixed(2)}. Redirecionando para Busca.`);
    navigate(createPageUrl('search-unified'));
  };

  const handleApplyDistanceFilter = () => {
    // Lógica de filtro (mock)
    showSuccess(`Filtro de distância aplicado: até ${maxDistanceKm} km. Redirecionando para Busca.`);
    navigate(createPageUrl('search-unified'));
  };

  const handleOpenSearchConfig = () => {
    navigate(createPageUrl('search-unified'));
  };

  const handleEditMenu = () => {
    navigate(createPageUrl('restaurant-area/menu'));
  };

  const handleEditProfile = () => {
    navigate(createPageUrl('restaurant-area/profile-menu'));
  };

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      {/* Header */}
      <header className="p-4 bg-white shadow-soft-md sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-primary">Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">Bem-vindo(a), {profile?.first_name || 'Proprietário'}!</p>
      </header>

      <div className="p-4 space-y-6">
        
        {/* Banner Premium */}
        {!isPremium && <PremiumBanner />}

        {/* Estatísticas Rápidas (Mock) */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="shadow-soft-md border-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Visualizações (30d)</CardTitle>
              <BarChart3 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,234</div>
              <p className="text-xs text-green-500">+15% desde o mês passado</p>
            </CardContent>
          </Card>
          <Card className="shadow-soft-md border-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Favoritos</CardTitle>
              <Utensils className="h-4 w-4 text-highlight" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">215</div>
              <p className="text-xs text-green-500">+5% desde o mês passado</p>
            </CardContent>
          </Card>
        </div>

        {/* Ações Rápidas */}
        <Card className="shadow-soft-md border-none">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-primary">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start h-12 text-primary border-primary/20 hover:bg-primary/5"
              onClick={handleEditMenu}
            >
              <Utensils className="w-5 h-5 mr-3" />
              Gerenciar Cardápio
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start h-12 text-primary border-primary/20 hover:bg-primary/5"
              onClick={handleEditProfile}
            >
              <Settings className="w-5 h-5 mr-3" />
              Editar Perfil e Configurações
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Button>
          </CardContent>
        </Card>

        {/* Configurações de Busca (Mock) */}
        <Card className="shadow-soft-md border-none">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-primary">Simulação de Busca</CardTitle>
            <p className="text-sm text-gray-500">Veja como seu restaurante aparece na busca dos clientes.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-base font-medium text-gray-700">Localização Atual:</p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-highlight hover:bg-highlight/10"
                onClick={handleOpenSearchConfig}
              >
                <MapPin className="w-4 h-4 mr-1" />
                Ver no Mapa
              </Button>
            </div>
            
            <Separator />

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Filtro de Preço (R$):</label>
              <div className="flex items-center space-x-2">
                <input 
                  type="number" 
                  value={minPrice} 
                  onChange={(e) => setMinPrice(Number(e.target.value))}
                  className="w-1/2 p-2 border rounded-lg text-center"
                />
                <span className="text-gray-500">-</span>
                <input 
                  type="number" 
                  value={maxPrice} 
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-1/2 p-2 border rounded-lg text-center"
                />
              </div>
              <Button onClick={handleApplyPriceFilter} className="w-full h-10 bg-primary hover:bg-primary/90">
                Aplicar Filtro de Preço
              </Button>
            </div>

            <Separator />

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Distância Máxima (km): {maxDistanceKm}</label>
              <input 
                type="range" 
                min="1" 
                max="50" 
                value={maxDistanceKm} 
                onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <Button onClick={handleApplyDistanceFilter} className="w-full h-10 bg-primary hover:bg-primary/90">
                Aplicar Filtro de Distância
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Link para o Perfil Público */}
        <div className="text-center pt-4">
          <Button 
            variant="link" 
            className="text-[#022D68] hover:bg-[#022D68]/5 bg-gray-100 rounded-xl shadow-soft-sm"
            onClick={() => navigate(createPageUrl('restaurantProfile', { restaurantId: restaurant.id }))}
          >
            Ver Perfil Público <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <RestaurantBottomNav isPremium={isPremium} />
    </div>
  );
}
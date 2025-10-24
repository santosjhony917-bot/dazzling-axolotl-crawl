import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ArrowLeft, Loader2, Utensils, TrendingUp, DollarSign, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserSearchLocation } from '@/hooks/useUserSearchLocation';
import { useRestaurantByOwner } from '@/hooks/useRestaurantByOwner';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

const RestaurantStats: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Mantemos o hook de localização, mas não exibimos a UI de configuração
  const { location, isLoading: isLocationLoading } = useUserSearchLocation();
  
  const { restaurant, isLoading: isRestaurantLoading, error: restaurantError } = useRestaurantByOwner(user?.id);

  const isLoading = isRestaurantLoading || isLocationLoading;

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError("Erro ao sair: " + error.message);
    } else {
      navigate('/auth');
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const renderStatCard = (title: string, value: string | number, icon: React.ReactNode) => (
    <Card className="flex flex-col items-center justify-center p-4 text-center">
      <div className="text-[#E47948] mb-2">{icon}</div>
      <CardTitle className="text-2xl font-bold text-[#022D68]">{value}</CardTitle>
      <p className="text-sm text-gray-500">{title}</p>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 max-w-md mx-auto">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  if (restaurantError || !restaurant) {
    return (
      <div className="p-4 text-center max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Erro de Acesso</h1>
        <p className="text-gray-600">Você precisa ter um restaurante registrado para acessar esta página.</p>
        <Button onClick={() => navigate('/restaurant-setup')} className="mt-4 bg-[#022D68] hover:bg-[#022D68]/90">
          Configurar Restaurante
        </Button>
        <Button onClick={handleSignOut} variant="link" className="mt-2">
          Sair
        </Button>
      </div>
    );
  }

  // Mock data for demonstration
  const mockStats = {
    totalViews: 1250,
    menuClicks: 890,
    revenueEstimate: 4500.50,
    newCustomers: 45,
  };

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-4 max-w-md mx-auto">
      <header className="bg-white p-4 shadow-sm sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <Button variant="ghost" size="icon" onClick={handleGoBack}>
            <ArrowLeft className="h-6 w-6 text-[#022D68]" />
          </Button>
          <h1 className="text-xl font-bold text-[#022D68] truncate max-w-[200px]">{restaurant.name}</h1>
          <Button onClick={handleSignOut} variant="outline">Sair</Button>
        </div>
      </header>

      <main className="p-4 space-y-6">
        
        <h2 className="text-2xl font-bold text-[#022D68]">Estatísticas do Restaurante</h2>
        
        {/* Informações do Restaurante */}
        <Card className="bg-white p-4 rounded-xl shadow-md">
          <div className="flex items-center gap-4">
            <Utensils className="h-8 w-8 text-[#E47948]" />
            <div>
              <p className="text-lg font-semibold text-[#022D68]">{restaurant.name}</p>
              <p className="text-sm text-gray-500">{restaurant.address}</p>
            </div>
          </div>
          <Separator className="my-3" />
          <div className="flex justify-between text-sm text-gray-600">
            <span>Plano Atual:</span>
            <span className="font-medium capitalize">{restaurant.plan}</span>
          </div>
        </Card>

        {/* Grid de Estatísticas */}
        <div className="grid grid-cols-2 gap-4">
          {renderStatCard("Visualizações Totais", mockStats.totalViews, <TrendingUp className="w-6 h-6" />)}
          {renderStatCard("Cliques no Menu", mockStats.menuClicks, <Utensils className="w-6 h-6" />)}
          {renderStatCard("Receita Estimada (Mês)", `$${mockStats.revenueEstimate.toFixed(2)}`, <DollarSign className="w-6 h-6" />)}
          {renderStatCard("Novos Clientes (Mês)", mockStats.newCustomers, <Users className="w-6 h-6" />)}
        </div>

        {/* Seção de Ações */}
        <Card className="bg-white p-4 rounded-xl shadow-md space-y-3">
          <h3 className="text-lg font-bold text-[#022D68]">Ações Rápidas</h3>
          <Button 
            className="w-full bg-[#022D68] hover:bg-[#022D68]/90"
            onClick={() => navigate('/restaurant-dashboard')}
          >
            Gerenciar Menu
          </Button>
          <Button 
            className="w-full bg-[#E47948] hover:bg-[#E47948]/90"
            onClick={() => navigate(`/restaurant-profile/${restaurant.id}`)}
          >
            Ver Perfil Público
          </Button>
        </Card>
      </main>
    </div>
  );
};

export default RestaurantStats;
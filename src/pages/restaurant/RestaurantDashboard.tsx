"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Users, Utensils, MapPin } from 'lucide-react';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import { useNearbyCompetitors } from '@/hooks/useNearbyCompetitors';
import NearbyCompetitorCard from '@/components/NearbyCompetitorCard';
import { Skeleton } from '@/components/ui/skeleton';

const DashboardMetricCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">+20.1% from last month</p>
    </CardContent>
  </Card>
);

const RestaurantDashboard: React.FC = () => {
  const { restaurant, isLoading: isProfileLoading, error: profileError } = useRestaurantProfile();

  const currentRestaurantId = restaurant?.id;
  const latitude = restaurant?.latitude ?? undefined;
  const longitude = restaurant?.longitude ?? undefined;

  const { 
    competitors, 
    isLoading: isCompetitorsLoading, 
    error: competitorsError 
  } = useNearbyCompetitors(currentRestaurantId, latitude, longitude);

  if (isProfileLoading) {
    return (
      <div className="p-4 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-[120px]" />
          <Skeleton className="h-[120px]" />
          <Skeleton className="h-[120px]" />
          <Skeleton className="h-[120px]" />
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  if (profileError || !restaurant) {
    return <div className="p-4 text-red-500">Erro ao carregar o painel: {profileError || "Restaurante não encontrado."}</div>;
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-3xl font-bold">Painel de Controle: {restaurant.name}</h1>
      
      {/* Metrics Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardMetricCard 
          title="Receita Total" 
          value="R$ 45.231,89" 
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} 
        />
        <DashboardMetricCard 
          title="Seguidores" 
          value="2,350" 
          icon={<Users className="h-4 w-4 text-muted-foreground" />} 
        />
        <DashboardMetricCard 
          title="Itens Ativos" 
          value="124" 
          icon={<Utensils className="h-4 w-4 text-muted-foreground" />} 
        />
        <DashboardMetricCard 
          title="Plano Atual" 
          value={restaurant.plan.toUpperCase()} 
          icon={<MapPin className="h-4 w-4 text-muted-foreground" />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area (Placeholder for Charts/Stats) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Visão Geral de Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] flex items-center justify-center text-muted-foreground">
              Gráfico de vendas (Implementação futura)
            </div>
          </CardContent>
        </Card>

        {/* Nearby Competitors Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Concorrentes Próximos (10km)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
            {isCompetitorsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : competitorsError ? (
              <p className="text-sm text-red-500">Erro ao carregar concorrentes.</p>
            ) : competitors.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum concorrente encontrado em 10km.</p>
            ) : (
              competitors.map((item) => (
                <NearbyCompetitorCard 
                  key={item.id} 
                  id={item.id}
                  name={item.name}
                  distance_km={item.distance_km}
                  category={item.category}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RestaurantDashboard;
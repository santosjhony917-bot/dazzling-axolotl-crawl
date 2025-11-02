import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, TrendingUp, DollarSign, Crown, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createPageUrl } from '@/utils/url';
import { useAuthData } from '@/context/AuthContext';
import { useRestaurantData } from '@/hooks/useRestaurantData';
import { Skeleton } from '@/components/ui/skeleton';

export default function MetricsPage() {
  const navigate = useNavigate();
  const { restaurant, isLoading: isRestaurantLoading } = useRestaurantData();
  const isPremium = restaurant?.plan === 'premium';

  if (isRestaurantLoading) {
    return (
      <div className="p-4 space-y-4 md:max-w-md md:mx-auto">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 md:max-w-md md:mx-auto">
      <header className="flex items-center p-4 bg-white shadow-sm">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <h1 className="flex-grow text-center text-xl font-semibold text-primary">Métricas e Promoções</h1>
        <div className="w-10"></div>
      </header>

      <main className="p-4 space-y-6">
        {!isPremium && (
          <Card className="bg-yellow-50 border-yellow-200 text-yellow-800 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-600" /> Recurso Premium
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Para acessar métricas detalhadas e criar promoções, assine um de nossos planos premium.
              </p>
              <Button 
                onClick={() => navigate(createPageUrl('restaurant-area-upgrade'))}
                className="bg-highlight hover:bg-highlight/90 mt-4"
              >
                Ver Planos Premium
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <BarChart className="h-5 w-5 text-primary" /> Visão Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isPremium ? "1.234" : "Disponível no Premium"}
            </div>
            <p className="text-xs text-gray-500">Visualizações no último mês</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" /> Engajamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isPremium ? "25%" : "Disponível no Premium"}
            </div>
            <p className="text-xs text-gray-500">Taxa de cliques no cardápio</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-600" /> Promoções Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isPremium ? "3" : "Disponível no Premium"}
            </div>
            <p className="text-xs text-gray-500">Promoções ativas no momento</p>
            {isPremium && (
              <Button className="mt-4 bg-purple-600 hover:bg-purple-700">
                Gerenciar Promoções
              </Button>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
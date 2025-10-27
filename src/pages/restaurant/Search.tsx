import React from 'react';
import RestaurantAreaHeader from '@/components/restaurant/RestaurantAreaHeader';
import { Search, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import RestaurantBottomNav from '@/components/restaurant/RestaurantBottomNav';
import { useUserRole } from '@/hooks/useUserRole';

export default function RestaurantSearch() {
  const { isPremium } = useUserRole();
  
  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      <RestaurantAreaHeader title="Análise de Mercado" icon={BarChart3} backPath="restaurant-area/home" />
      
      <main className="p-4 space-y-6">
        <Card className="shadow-soft-lg border-none rounded-xl bg-white">
          <CardHeader>
            <CardTitle className="text-2xl text-primary">Estatísticas de Concorrência</CardTitle>
            <CardDescription>Visualize dados de restaurantes próximos e tendências de mercado.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Gráficos e dados de concorrentes serão exibidos aqui.</p>
          </CardContent>
        </Card>
      </main>
      
      <RestaurantBottomNav selectedTab="search" isFree={!isPremium} />
    </div>
  );
}
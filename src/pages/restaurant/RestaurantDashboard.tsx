import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Users, DollarSign, Home, Utensils, Settings, Crown } from 'lucide-react';
import RestaurantBottomNav from '@/components/restaurant/RestaurantBottomNav';

// Definição das abas para a área administrativa (Mock)
const adminTabs = [
  { name: 'Dashboard', path: '/restaurant', icon: Home, isPremium: false },
  { name: 'Cardápio', path: '/restaurant/menu', icon: Utensils, isPremium: true },
  { name: 'Configurações', path: '/restaurant/settings', icon: Settings, isPremium: false },
];

export default function RestaurantDashboard() {
  const isPremium = true; // Mock para garantir que a navegação inferior funcione

  return (
    <div className="space-y-6 pb-20 sm:pb-6">
      <h1 className="text-3xl font-bold text-[#022D68]">Dashboard do Restaurante</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas Hoje</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 1.250,00</div>
            <p className="text-xs text-muted-foreground">+20.1% desde o mês passado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Novos Seguidores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+2350</div>
            <p className="text-xs text-muted-foreground">+180.1% desde o mês passado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visitas ao Perfil</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+12,234</div>
            <p className="text-xs text-muted-foreground">+19% desde o mês passado</p>
          </CardContent>
        </Card>
      </div>
      <p className="text-gray-500">Conteúdo do Dashboard em desenvolvimento.</p>
      
      {/* Bottom Navigation (Corrigido) */}
      <RestaurantBottomNav tabs={adminTabs} selectedTab="Dashboard" isFree={!isPremium} />
    </div>
  );
}
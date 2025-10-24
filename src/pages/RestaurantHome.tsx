import React from 'react';
import { Home, Utensils, Settings } from 'lucide-react';
import RestaurantBottomNav from '@/components/restaurant/RestaurantBottomNav';

// Definição das abas para a área administrativa (Mock)
const adminTabs = [
  { name: 'Home', path: '/restaurant/home', icon: Home, isPremium: false },
  { name: 'Cardápio', path: '/restaurant/menu', icon: Utensils, isPremium: true },
  { name: 'Configurações', path: '/restaurant/settings', icon: Settings, isPremium: false },
];

export default function RestaurantHome() {
  const isPremium = false; // Mock

  return (
    <div className="p-4 space-y-4 min-h-screen pb-20 sm:pb-6">
      <h1 className="text-3xl font-bold text-[#022D68]">Página Inicial do Restaurante</h1>
      <p className="text-gray-600">Bem-vindo à sua área administrativa.</p>
      
      {/* Bottom Navigation (Corrigido) */}
      <RestaurantBottomNav tabs={adminTabs} selectedTab="Home" isFree={!isPremium} />
    </div>
  );
}
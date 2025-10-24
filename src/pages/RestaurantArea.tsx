import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, Utensils, Settings, DollarSign, LogOut, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import RestaurantBottomNav from '@/components/restaurant/RestaurantBottomNav';
import RestaurantSidebar from '@/components/restaurant/RestaurantSidebar';

// Definição das abas
const tabs = [
  { name: 'Dashboard', path: '/restaurant', icon: Home, isPremium: false },
  { name: 'Cardápio', path: '/restaurant/menu', icon: Utensils, isPremium: true }, // Nova aba
  { name: 'Assinatura', path: '/restaurant/subscription', icon: DollarSign, isPremium: false },
  { name: 'Configurações', path: '/restaurant/settings', icon: Settings, isPremium: false },
];

export default function RestaurantArea() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();
  
  // Mock de estado do restaurante (deve ser buscado do DB)
  const [restaurant, setRestaurant] = useState<{ name: string, plan: 'free' | 'premium' } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isPremium = restaurant?.plan === 'premium';

  // Determina a aba selecionada com base na rota
  const selectedTab = tabs.find(tab => location.pathname === tab.path)?.name || 'Dashboard';

  useEffect(() => {
    if (!user && !isAuthLoading) {
      navigate('/login');
      return;
    }
    
    if (user) {
      // Simulação de busca do restaurante do usuário
      const fetchRestaurantData = async () => {
        // Em um app real, buscaríamos o restaurante associado ao user.id
        // Por enquanto, vamos mockar o plano para testar a funcionalidade Premium
        await new Promise(resolve => setTimeout(resolve, 500)); // Simula delay da API
        
        // MOCK: Defina 'premium' aqui para testar o MenuManagement
        setRestaurant({ name: "Meu Restaurante", plan: 'premium' }); 
        setIsLoading(false);
      };
      fetchRestaurantData();
    }
  }, [user, isAuthLoading, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#E47948]" />
      </div>
    );
  }

  // Filtra as abas para usuários Free
  const availableTabs = tabs.filter(tab => !tab.isPremium || isPremium);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar (Desktop) */}
      <RestaurantSidebar 
        tabs={availableTabs} 
        selectedTab={selectedTab} 
        restaurantName={restaurant?.name || 'Restaurante'}
        isPremium={isPremium}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="sm:hidden p-4 bg-white shadow-md flex justify-between items-center">
          <h1 className="text-xl font-bold text-[#022D68]">{selectedTab}</h1>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="w-5 h-5 text-red-500" />
          </Button>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 sm:pb-6">
          <Outlet />
        </main>
        
        {/* Bottom Navigation (Mobile) */}
        <RestaurantBottomNav tabs={availableTabs} selectedTab={selectedTab} isFree={!isPremium} />
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, PlusCircle, Utensils, Store, Settings, Loader2, TrendingUp, Users, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAuthContext } from '@/context/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { createPageUrl } from '@/utils/url';
import RestaurantBottomNav from '@/components/restaurant/RestaurantBottomNav';
import HighlightCard from '@/components/restaurant/HighlightCard';
import { motion } from 'framer-motion';

// Mock de dados para os cards de destaque
const mockHighlights = [
  { id: 'h1', title: 'Vendas (Mês)', value: 'R$ 12.450', change: '+12%', icon: 'sales' as const, color: 'green' as const },
  { id: 'h2', title: 'Visualizações (Dia)', value: '1.5k', change: '+5%', icon: 'views' as const, color: 'blue' as const },
  { id: 'h3', title: 'Seguidores', value: '345', change: '+20%', icon: 'followers' as const, color: 'orange' as const },
  { id: 'h4', title: 'Itens Ativos', value: '42', change: '0%', icon: 'items' as const, color: 'purple' as const },
];

// Mock de Ações Rápidas
const mockQuickActions = [
  { id: 'a1', title: 'Adicionar Novo Prato', icon: PlusCircle, url: 'restaurant-area/menu/add-item' },
  { id: 'a2', title: 'Gerenciar Cardápio', icon: Utensils, url: 'restaurant-area/menu' },
  { id: 'a3', title: 'Configurações da Loja', icon: Settings, url: 'restaurant-area/settings' },
];

// Define the specific paths used in this component to satisfy PathKey requirement
type DashboardPath = 
  'restaurant-area/settings' | 
  'restaurant-area/menu/add-item' | 
  'restaurant-area/menu' | 
  'restaurant-area/plans' |
  'restaurant-login';

export default function RestaurantDashboard() {
  const navigate = useNavigate();
  const { restaurant, isLoading } = useAuthContext();
  const { isPremium } = useUserRole();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background-light">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    // Isso não deve acontecer se o AuthContext estiver funcionando corretamente, mas é um fallback
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">Erro: Restaurante não encontrado.</p>
        <Button onClick={() => navigate(createPageUrl('restaurant-login'))}>Fazer Login</Button>
      </div>
    );
  }

  const handleNavigate = (url: DashboardPath) => {
    navigate(createPageUrl(url));
  };

  return (
    <div className="min-h-screen bg-background-light pb-20 max-w-md mx-auto">
      {/* Header */}
      <header className="p-4 bg-white shadow-soft-md sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Store className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Bem-vindo(a),</p>
              <h1 className="text-xl font-bold text-primary truncate max-w-[200px]">
                {restaurant.name}
              </h1>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleNavigate('restaurant-area/settings')}
            className="rounded-xl border-gray-300 text-primary hover:bg-primary/5"
          >
            <Settings className="w-4 h-4 mr-2" />
            Ajustes
          </Button>
        </div>
      </header>

      <main className="p-4 space-y-6">
        
        {/* Destaques de Performance */}
        <section>
          <h2 className="text-lg font-bold text-primary mb-4">Performance</h2>
          <ScrollArea className="w-full whitespace-nowrap pb-6"> {/* Aumentado pb-6 */}
            <div className="flex space-x-4">
              {mockHighlights.map((item) => (
                <HighlightCard key={item.id} item={item} />
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="h-1.5" />
          </ScrollArea>
        </section>

        {/* Ações Rápidas */}
        <section>
          <h2 className="text-lg font-bold text-primary mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-1 gap-4">
            {mockQuickActions.map((action) => (
              <motion.div
                key={action.id}
                whileHover={{ x: 5 }}
                whileTap={{ scale: 0.99 }}
              >
                <Card 
                  className="rounded-xl shadow-soft-lg border-none cursor-pointer hover:shadow-soft-xl transition-shadow"
                  onClick={() => handleNavigate(action.url as DashboardPath)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="size-10 rounded-lg bg-highlight/10 flex items-center justify-center text-highlight">
                        <action.icon className="w-5 h-5" />
                      </div>
                      <p className="text-base font-semibold text-primary">{action.title}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        <Separator className="my-6 bg-gray-200" />

        {/* Status do Plano */}
        <section>
          <h2 className="text-lg font-bold text-primary mb-4">Seu Plano</h2>
          <Card className={
            `rounded-2xl shadow-soft-xl border-none p-6 ${isPremium ? 'bg-gradient-to-r from-primary to-blue-800 text-white' : 'bg-white text-primary border border-gray-100'}`
          }>
            <CardTitle className={`text-xl font-extrabold ${isPremium ? 'text-white' : 'text-primary'}`}>
              {isPremium ? 'Plano Premium Ativo' : 'Plano Gratuito'}
            </CardTitle>
            <p className={`mt-2 text-sm ${isPremium ? 'text-blue-200' : 'text-gray-600'}`}>
              {isPremium 
                ? 'Aproveite todos os recursos avançados, como destaques e análises detalhadas.' 
                : 'Atualize para o Premium para desbloquear recursos exclusivos e aumentar sua visibilidade.'
              }
            </p>
            <Button 
              variant={isPremium ? 'secondary' : 'highlight'} 
              onClick={() => handleNavigate('restaurant-area/plans')}
              className={`mt-4 rounded-xl font-bold ${isPremium ? 'bg-white text-primary hover:bg-gray-100' : 'shadow-highlight-glow'}`}
            >
              {isPremium ? 'Gerenciar Plano' : 'Ver Planos Premium'}
            </Button>
          </Card>
        </section>
      </main>

      <RestaurantBottomNav selectedTab="home" isFree={!isPremium} />
    </div>
  );
}
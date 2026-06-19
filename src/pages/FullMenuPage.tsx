import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Utensils, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePublicRestaurant } from '@/hooks/usePublicRestaurant';
import { createPageUrl } from '@/utils/url';
import Header from '@/components/Header';
import { Card, CardContent } from '@/components/ui/card';
import RestaurantMenu from '@/components/public/RestaurantMenu'; // Reutiliza o componente de menu
import { useQuotaCheck } from '@/hooks/useQuotaCheck';
import FreemiumPaywallModal from '@/components/public/FreemiumPaywallModal';

export default function FullMenuPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();

  const { showPaywall, quotaChecked, unlockQuota } = useQuotaCheck(restaurantId);

  const { restaurant, isLoading, error } = usePublicRestaurant(restaurantId);

  const handleBack = () => navigate(-1);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-background-light">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="p-8 text-center min-h-screen bg-background-light">
        <Header 
          title="Cardápio"
          leftAction={{ icon: ArrowLeft, onClick: handleBack }}
        />
        <div className="pt-20">
          <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <h1 className="text-xl font-semibold text-gray-700">Cardápio Não Encontrado</h1>
          <p className="text-gray-500 mt-2">{error instanceof Error ? error.message : "O restaurante ou cardápio solicitado não existe."}</p>
          <Button onClick={handleBack} className="mt-6">
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  if (quotaChecked && showPaywall) {
    return (
      <div className="relative min-h-screen w-full flex flex-col items-center justify-start bg-background-light">
        <Header 
          title="Cardápio"
          leftAction={{ icon: ArrowLeft, onClick: handleBack }}
        />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md w-full mx-auto">
          <div className="bg-white/80 backdrop-blur-md border border-slate-100 rounded-3xl p-8 shadow-sm space-y-4">
            <span className="text-4xl animate-pulse inline-block">🔒</span>
            <h2 className="text-xl font-bold text-slate-800">Visualização Limitada</h2>
            <p className="text-sm text-slate-500">
              Você atingiu o limite de 5 cardápios diários da sua conta gratuita.
            </p>
          </div>
        </div>
        <FreemiumPaywallModal
          isOpen={showPaywall}
          onClose={() => navigate("/home")}
          onUnlock={unlockQuota}
        />
      </div>
    );
  }
  
  const hasMenu = restaurant.menu_categories && restaurant.menu_categories.length > 0;

  return (
    <div className="min-h-screen bg-background-light max-w-md mx-auto">
      <Header 
        title={restaurant.name.replace(/^Cardápio:\s*/i, '')}
        leftAction={{ icon: ArrowLeft, onClick: handleBack }}
      />
      
      <main className="p-4 space-y-6">
        <Card className="border border-slate-100 bg-white rounded-2xl shadow-none p-4">
          <CardContent className="p-0 flex items-center gap-3">
            <Utensils className="w-5 h-5 text-highlight/80" />
            <h1 className="text-base font-extrabold text-slate-800">Cardápio Completo</h1>
          </CardContent>
        </Card>
        
        {hasMenu ? (
          <RestaurantMenu 
            menuCategories={restaurant.menu_categories} 
            menuSections={restaurant.menu_sections}
            isFullMenuPage={true} // Nova prop para indicar que é a página completa
          />
        ) : (
          <Card className="p-6 text-center border border-slate-100 bg-white rounded-2xl shadow-none">
            <Utensils className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-500">Nenhum item ativo no cardápio.</p>
          </Card>
        )}
      </main>
    </div>
  );
}
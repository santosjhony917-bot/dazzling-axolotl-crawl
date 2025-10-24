import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Utensils, Info, Menu as MenuIcon, Crown, HelpCircle, ArrowLeft, Store } from 'lucide-react';
import { createPageUrl } from '@/utils/url';
import NavCardItem from '@/components/NavCardItem';
import RestaurantAreaHeader from '@/components/restaurant/RestaurantAreaHeader';
import { useRestaurant } from '@/hooks/useRestaurant';
import { Skeleton } from '@/components/ui/skeleton';
import SubscriptionCard from '@/components/restaurant/profile/SubscriptionCard';
import { useUserRole } from '@/hooks/useUserRole';

export default function RestaurantProfileMenu() {
  const navigate = useNavigate();
  const { restaurant, isLoading } = useRestaurant();
  const { isPremium } = useUserRole();

  if (isLoading) {
    return (
      <div className="p-4 max-w-md mx-auto space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const restaurantName = restaurant?.name || "Meu Restaurante";

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      <RestaurantAreaHeader title="Perfil do Restaurante" icon={Store} backPath="restaurant-area/home" />

      <main className="p-4 space-y-6">
        
        {/* Informações Básicas e Endereço */}
        <Card className="shadow-xl rounded-xl border-none">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#022D68] flex items-center gap-2">
              <Info className="w-5 h-5" />
              Informações do Estabelecimento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <NavCardItem 
              label="Dados e Endereço" 
              description="Edite nome, contato, CNPJ e localização."
              icon={Info} 
              onClick={() => navigate(createPageUrl('restaurant-area/profile'))}
            />
          </CardContent>
        </Card>

        {/* Gerenciamento de Cardápio */}
        <Card className="shadow-xl rounded-xl border-none">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#022D68] flex items-center gap-2">
              <MenuIcon className="w-5 h-5" />
              Gerenciamento de Conteúdo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <NavCardItem 
              label="Cardápio e Categorias" 
              description="Adicione, edite e organize seus pratos."
              icon={Utensils} 
              onClick={() => navigate(createPageUrl('restaurant-area/menu'))}
            />
          </CardContent>
        </Card>
        
        {/* Plano e Assinatura */}
        <SubscriptionCard isPremium={isPremium} />

        {/* Suporte */}
        <Card className="shadow-xl rounded-xl border-none">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-[#022D68] flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Suporte
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <NavCardItem 
              label="Central de Ajuda" 
              description="Tutoriais, FAQ e contato com o suporte."
              icon={HelpCircle} 
              onClick={() => navigate(createPageUrl('restaurant-area/help'))}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
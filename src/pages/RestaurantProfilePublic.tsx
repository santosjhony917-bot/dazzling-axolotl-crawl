import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Clock, Phone, Utensils, Crown, ArrowLeft, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { usePublicRestaurantProfile } from '@/hooks/usePublicRestaurantProfile'; // Importação corrigida
import PublicRestaurantLayout from '@/components/PublicRestaurantLayout';
import { showError } from '@/utils/toast';
import { formatCurrency } from '@/utils/formatters';
import { useRestaurantMenu } from '@/hooks/useRestaurantMenu';
import FullMenuDisplay from '@/components/FullMenuDisplay';
import { Skeleton } from '@/components/ui/skeleton';

// Componente para exibir o conteúdo principal do perfil (usado dentro do layout)
interface RestaurantProfileContentProps {
  restaurant: any;
  menu: any[];
  menuLoading: boolean;
}

const RestaurantProfileContent: React.FC<RestaurantProfileContentProps> = ({ restaurant, menu, menuLoading }) => {
  const navigate = useNavigate();
  const isPremium = restaurant.plan === 'premium';

  const formatScheduleSummary = (schedule: any): string => {
    if (!schedule) return "Horários não definidos";
    
    // Obtém o nome completo do dia da semana em inglês (ex: 'Monday')
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    // Encontra a chave correspondente no objeto schedule (que usa 'monday', 'tuesday', etc.)
    const fullDayKey = Object.keys(schedule).find(key => key === today) as keyof typeof schedule | undefined;

    if (fullDayKey && schedule[fullDayKey]?.isOpen && schedule[fullDayKey].slots.length > 0) {
      const slot = schedule[fullDayKey].slots[0];
      return `Aberto hoje: ${slot.start} - ${slot.end}`;
    }
    return "Fechado hoje";
  };

  const scheduleSummary = formatScheduleSummary(restaurant.opening_hours);

  return (
    <div className="relative bg-[#f5f7f8] font-sans antialiased flex min-h-screen w-full flex-col items-center overflow-x-hidden">
      
      {/* 1. Topo do Perfil (Capa e Logo) */}
      <div className="relative w-full h-56 bg-gray-300 dark:bg-gray-700">
        {restaurant.cover_image_url && (
            <img
                src={restaurant.cover_image_url}
                alt="Capa do Restaurante"
                className="w-full h-full object-cover"
            />
        )}
        
        {/* Botão Voltar */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 text-white bg-black/30 hover:bg-black/50 rounded-full"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>

        {/* Card Principal Flutuante */}
        <Card className="absolute -bottom-12 left-4 right-4 shadow-xl border-none rounded-xl p-4 bg-white dark:bg-gray-800">
          <div className="flex items-start gap-4">
            {/* Logo */}
            <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden border-4 border-white dark:border-gray-800 flex-shrink-0">
              {restaurant.image_url ? (
                <img src={restaurant.image_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Utensils className="w-full h-full p-4 text-gray-500" />
              )}
            </div>
            
            {/* Info e Plano */}
            <div className="flex-1 pt-1">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-2xl text-[#022D68] leading-tight">
                    {restaurant.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{restaurant.category}</p>
                </div>
                <Badge 
                  variant="outline" 
                  className={`text-xs font-semibold rounded-full px-3 py-1 mt-1 flex-shrink-0 ${isPremium ? 'border-yellow-500 text-yellow-700 bg-yellow-50' : 'border-gray-400 text-gray-600 bg-white'}`}
                >
                  {isPremium ? <Crown className="w-3 h-3 mr-1 fill-yellow-500 text-yellow-500" /> : null}
                  {isPremium ? "Premium" : "Free"}
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Botões de Ação (WhatsApp, iFood, etc.) */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex gap-2">
            {restaurant.whatsapp_url && (
              <Button 
                onClick={() => window.open(restaurant.whatsapp_url, '_blank')}
                className="flex-1 flex items-center justify-center gap-2 h-10 px-3 bg-green-500 hover:bg-green-600 text-white text-sm font-bold rounded-full"
              >
                <Phone className="w-4 h-4" />
                WhatsApp
              </Button>
            )}
            {restaurant.ifood_url && (
              <Button 
                onClick={() => window.open(restaurant.ifood_url, '_blank')}
                className="flex-1 flex items-center justify-center gap-2 h-10 px-3 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-full"
              >
                <ShoppingCart className="w-4 h-4" />
                iFood
              </Button>
            )}
          </div>
        </Card>
      </div>
      
      {/* Espaçamento para o Card Flutuante */}
      <div className="h-20"></div> 

      <div className="w-full max-w-md space-y-4 px-4 pb-24">
        
        {/* 2. Informações Básicas */}
        <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-none p-4 space-y-3">
          <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
            <MapPin className="w-5 h-5 text-highlight flex-shrink-0" />
            <p className="text-sm">{restaurant.address || "Endereço não informado"}</p>
          </div>
          <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
            <Clock className="w-5 h-5 text-highlight flex-shrink-0" />
            <p className="text-sm">{scheduleSummary}</p>
          </div>
          {restaurant.description && (
            <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">{restaurant.description}</p>
            </div>
          )}
        </Card>

        {/* 3. Cardápio Completo (Substituindo Destaques) */}
        <FullMenuDisplay menu={menu} loading={menuLoading} />

      </div>
    </div>
  );
};


const RestaurantProfilePublic: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = usePublicRestaurantProfile(id); 
  const { menu, loading: menuLoading } = useRestaurantMenu(id);

  if (isLoading) {
    return (
      <PublicRestaurantLayout restaurant={null} backPath="home">
        <div className="p-4 space-y-4">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      </PublicRestaurantLayout>
    );
  }

  if (error || !data || !data.restaurant) {
    return (
      <PublicRestaurantLayout restaurant={null} backPath="home">
        <div className="p-8 text-center text-red-500">
          <p className="font-bold">Erro ao carregar o perfil do restaurante.</p>
          <p className="text-sm text-gray-700 mt-2">Detalhe: {error || "Restaurante não encontrado."}</p>
          <p className="text-sm text-gray-500 mt-1">ID: {id}</p>
        </div>
      </PublicRestaurantLayout>
    );
  }

  const { restaurant } = data;

  return (
    <PublicRestaurantLayout restaurant={restaurant} backPath="home">
      <RestaurantProfileContent restaurant={restaurant} menu={menu} menuLoading={menuLoading} />
    </PublicRestaurantLayout>
  );
};

export default RestaurantProfilePublic;
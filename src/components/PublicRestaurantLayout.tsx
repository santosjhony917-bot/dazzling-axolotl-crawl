import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { usePublicRestaurant } from '@/hooks/usePublicRestaurant';
import { Button } from '@/components/ui/button';
import FreeProfileLayout from './public/FreeProfileLayout';
import PremiumProfileLayout from './public/PremiumProfileLayout';
import { createPageUrl } from '@/utils/url';

export default function PublicRestaurantLayout() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();
  const { restaurant, isLoading, error } = usePublicRestaurant(restaurantId);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#f5f7f8]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="p-6 text-center bg-white min-h-screen flex flex-col justify-center items-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Restaurante Não Encontrado</h2>
        <p className="text-gray-600 mb-6">O perfil que você está tentando acessar não existe ou foi removido.</p>
        <Button onClick={() => navigate(createPageUrl('index'))}>
          Voltar para o Início
        </Button>
      </div>
    );
  }

  // O layout específico (Free ou Premium) é responsável por toda a estrutura, incluindo o header público.
  return (
    <div className="relative bg-[#f5f7f8] font-sans antialiased flex min-h-screen w-full flex-col items-center overflow-x-hidden">
      
      {/* Botão de Voltar Flutuante (Para navegação do cliente) */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-30 w-10 h-10 rounded-full bg-white shadow-md hover:bg-gray-50 text-primary"
      >
        <ArrowLeft className="h-6 w-6" />
      </Button>

      {/* Renderiza o layout apropriado */}
      {restaurant.plan === 'premium' ? (
        <PremiumProfileLayout restaurant={restaurant} />
      ) : (
        <FreeProfileLayout restaurant={restaurant} />
      )}
    </div>
  );
}
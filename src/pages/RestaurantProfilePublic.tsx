"use client";

import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { cn } from '@/lib/utils';

import { usePublicRestaurant } from "@/hooks/usePublicRestaurant";
import { useRestaurantFollow } from "@/hooks/useRestaurantFollow";
import PremiumProfileLayout from "@/components/public/PremiumProfileLayout";
import FreeProfileLayout from "@/components/public/FreeProfileLayout";
import RestaurantPageHeader from "@/components/restaurant/RestaurantPageHeader"; // Usando o cabeçalho do restaurante
import RestaurantProfileHeader from "@/components/restaurant/RestaurantProfileHeader"; // O componente de capa modificado
import { PublicRestaurantData } from "@/types/restaurant";

interface RestaurantProfilePublicProps {
  initialRestaurantId?: string;
  simulatedPlan?: 'free' | 'premium';
  isCompact?: boolean;
}

const RestaurantProfilePublic = ({ initialRestaurantId, simulatedPlan, isCompact }: RestaurantProfilePublicProps) => {
  const params = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const id = initialRestaurantId || params.restaurantId;

  const { restaurant, isLoading, error, refetch } = usePublicRestaurant(id);
  
  const currentPlan = simulatedPlan || restaurant?.plan;

  const { toggleFollow, isToggling } = useRestaurantFollow(
    restaurant?.id || '', 
    restaurant?.is_favorite || false
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-light">
        <div className="text-center">
          <p className="text-lg font-semibold text-primary">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    console.error("Error loading restaurant:", error);
    console.error("Restaurant ID being used:", id);
    
    let errorMessage = "Restaurante não encontrado ou erro ao carregar.";
    if (error) {
      if (error instanceof Error) {
        errorMessage = `Erro ao carregar restaurante: ${error.message}`;
      } else {
        errorMessage = `Erro ao carregar restaurante: ${String(error)}`;
      }
    } else if (!restaurant) {
      errorMessage = `Restaurante com ID "${id}" não encontrado.`;
    }

    return (
      <div className="flex items-center justify-center h-screen bg-background-light">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">{errorMessage}</p>
          <Button onClick={() => navigate("/")} className="mt-4">
            Voltar para a Home
          </Button>
        </div>
      </div>
    );
  }

  // Dados para o RestaurantProfileHeader (capa e logo)
  const profileHeaderData = {
    id: restaurant.id,
    name: restaurant.name,
    coverImageUrl: restaurant.cover_image_url || '',
    isPremium: restaurant.plan === 'premium',
    isCompact: isCompact,
  };

  // Adicionando um console.log para verificar a URL da capa
  console.log("Restaurant cover image URL:", profileHeaderData.coverImageUrl);

  // Altura da capa (h-48 = 192px, h-24 = 96px)
  const coverHeight = isCompact ? 96 : 192;
  // Altura do RestaurantPageHeader (h-16 = 64px)
  const pageHeaderHeight = 64;
  
  // O conteúdo principal precisa ser empurrado para baixo pela altura da capa.
  // O RestaurantMainInfoCard tem um -mt-16 (64px) que o faz subir,
  // então o espaçador deve considerar a altura da capa.
  const mainContentTopPadding = coverHeight; 

  return (
    <div className="relative min-h-screen bg-background-light">
      {/* Capa do Restaurante (RestaurantProfileHeader) - FIXED e abaixo do PageHeader */}
      {/* z-index 10 para ficar abaixo do RestaurantPageHeader (z-index 20) */}
      <RestaurantProfileHeader restaurant={profileHeaderData} className="fixed top-0 left-0 right-0 z-10" />

      {/* Cabeçalho fixo da aplicação (seta de voltar, compartilhar) */}
      {/* z-index 20 para ficar acima da capa */}
      {!isCompact && <RestaurantPageHeader />}

      {/* Espaçador para empurrar o conteúdo principal para baixo */}
      <div style={{ height: `${mainContentTopPadding}px` }} className="w-full" />

      {/* Main content container */}
      <div className={cn("max-w-md mx-auto")}>
        {/* O conteúdo principal do perfil (PremiumProfileLayout ou FreeProfileLayout) */}
        {currentPlan === 'premium' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <PremiumProfileLayout 
              restaurant={restaurant as PublicRestaurantData} 
              toggleFavorite={toggleFollow} 
              isFavoriteMutating={isToggling}
              isCompact={isCompact}
            />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <FreeProfileLayout 
              restaurant={restaurant as PublicRestaurantData} 
              toggleFavorite={toggleFollow} 
              isFavoriteMutating={isToggling}
              isCompact={isCompact}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default RestaurantProfilePublic;
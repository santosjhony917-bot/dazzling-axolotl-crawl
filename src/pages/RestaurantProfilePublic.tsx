"use client";

import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

import { usePublicRestaurant } from "@/hooks/usePublicRestaurant";
import { useRestaurantFollow } from "@/hooks/useRestaurantFollow";
import PremiumProfileLayout from "@/components/public/PremiumProfileLayout";
import FreeProfileLayout from "@/components/public/FreeProfileLayout";
import RestaurantPageHeader from "@/components/public/RestaurantPageHeader"; // Importar o novo cabeçalho
import RestaurantProfileHeader from "@/components/public/RestaurantProfileHeader"; // O componente de capa modificado
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

  return (
    <div className="relative min-h-screen bg-background-light">
      {/* Novo cabeçalho fixo no topo */}
      <RestaurantPageHeader />

      <div className={`max-w-md mx-auto ${currentPlan === 'premium' ? 'pt-16' : 'pt-24'}`}>
        {/* Componente de capa (agora apenas para premium e não fixo) */}
        <RestaurantProfileHeader 
          restaurant={{ 
            id: restaurant.id, 
            name: restaurant.name, 
            coverImageUrl: restaurant.cover_image_url, 
            isPremium: currentPlan === 'premium' 
          }} 
        />

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
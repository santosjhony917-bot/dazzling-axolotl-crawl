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
import { PublicRestaurantData } from "@/types/restaurant";
// Removido: import RestaurantActionsBar from "@/components/public/RestaurantActionsBar";

interface RestaurantProfilePublicProps {
  initialRestaurantId?: string;
  simulatedPlan?: 'free' | 'premium';
  isCompact?: boolean;
}

const RestaurantProfilePublic = ({ initialRestaurantId, simulatedPlan, isCompact }: RestaurantProfilePublicProps) => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { restaurant, isLoading, error, refetch } = usePublicRestaurant(restaurantId || initialRestaurantId);
  
  // Usar o simulatedPlan se fornecido, caso contrário, usar o plano do restaurante
  const currentPlan = simulatedPlan || restaurant?.plan;

  const { toggleFollow, isToggling } = useRestaurantFollow(
    restaurant?.id || '', 
    restaurant?.is_favorite || false
  );

  const handleBack = () => {
    navigate(-1);
  };

  const handleShare = () => {
    if (restaurant) {
      navigator.share({
        title: restaurant.name,
        url: window.location.href,
      });
    }
  };

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
    console.error("Restaurant ID being used:", restaurantId);
    
    let errorMessage = "Restaurante não encontrado ou erro ao carregar.";
    if (error) {
      if (error instanceof Error) {
        errorMessage = `Erro ao carregar restaurante: ${error.message}`;
      } else {
        // Fallback caso o erro não seja uma instância de Error, mas ainda seja um valor
        errorMessage = `Erro ao carregar restaurante: ${String(error)}`;
      }
    } else if (!restaurant) {
      errorMessage = `Restaurante com ID "${restaurantId}" não encontrado.`;
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

  // Renderiza o layout apropriado com base no plano
  if (currentPlan === 'premium') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Actions Bar agora é renderizado dentro do PremiumProfileLayout */}
        <PremiumProfileLayout 
          restaurant={restaurant as PublicRestaurantData} 
          toggleFavorite={toggleFollow} 
          isFavoriteMutating={isToggling}
          isCompact={isCompact}
          onBack={handleBack}
          onShare={handleShare}
          isFavorite={restaurant.is_favorite}
        />
      </motion.div>
    );
  } else {
    // Default para FreeProfileLayout se não for premium ou se o plano for 'free'
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Actions Bar agora é renderizado dentro do FreeProfileLayout */}
        <FreeProfileLayout 
          restaurant={restaurant as PublicRestaurantData} 
          toggleFavorite={toggleFollow} 
          isFavoriteMutating={isToggling}
          isCompact={isCompact}
          onBack={handleBack}
          onShare={handleShare}
          isFavorite={restaurant.is_favorite}
        />
      </motion.div>
    );
  }
};

export default RestaurantProfilePublic;
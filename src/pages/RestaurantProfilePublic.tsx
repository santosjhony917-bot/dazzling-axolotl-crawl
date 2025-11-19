"use client";

import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Crown } from "lucide-react"; // Added Crown
import { Card } from "@/components/ui/card"; // Added Card

import { usePublicRestaurant } from "@/hooks/usePublicRestaurant";
import { useRestaurantFollow } from "@/hooks/useRestaurantFollow";
import PremiumProfileLayout from "@/components/public/PremiumProfileLayout";
import FreeProfileLayout from "@/components/public/FreeProfileLayout";
import RestaurantPageHeader from "@/components/public/RestaurantPageHeader"; 
import RestaurantProfileHeader from "@/components/public/RestaurantProfileHeader"; 
import { PublicRestaurantData } from "@/types/restaurant";
import { cn } from "@/lib/utils";
import { useAuthData } from "@/context/AuthContext"; // Added useAuthData
import { createPageUrl } from "@/utils/url"; // Added createPageUrl

interface RestaurantProfilePublicProps {
  initialRestaurantId?: string;
  simulatedPlan?: 'free' | 'premium';
  isCompact?: boolean;
}

const RestaurantProfilePublic = ({ initialRestaurantId, simulatedPlan, isCompact }: RestaurantProfilePublicProps) => {
  const params = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { restaurant: loggedInRestaurant } = useAuthData(); // Get logged in restaurant
  
  const id = initialRestaurantId || params.restaurantId;

  const { restaurant, isLoading, error, refetch } = usePublicRestaurant(id);
  
  const currentPlan = simulatedPlan || restaurant?.plan;

  const { toggleFollow, isToggling } = useRestaurantFollow(
    restaurant?.id || '', 
    restaurant?.is_favorite || false
  );

  const isOwner = loggedInRestaurant?.id === restaurant?.id;
  const showFreeWarning = isOwner && currentPlan === 'free';

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

      {/* Aviso para dono de restaurante Free */}
      {showFreeWarning && (
        <div className="max-w-md mx-auto p-4 pb-0 pt-20"> {/* Added pt-20 to account for fixed header */}
          <Card className="bg-amber-50 border-amber-200 p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <Crown className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-800">Seu perfil ainda aparece limitado para os clientes.</h3>
                <p className="text-sm text-amber-700 mt-1">Libere o visual Premium para se destacar.</p>
              </div>
            </div>
            <Button 
              size="sm" 
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => navigate(createPageUrl('restaurant-area/upgrade'))}
            >
              Visualizar Premium
            </Button>
          </Card>
        </div>
      )}

      <div className={cn("max-w-md mx-auto", showFreeWarning ? "pt-4" : "pt-0")}>
        {/* O conteúdo principal do perfil (PremiumProfileLayout ou FreeProfileLayout) */}
        {currentPlan === 'premium' || currentPlan === 'premium_gift' ? (
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
          <motion.div>
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
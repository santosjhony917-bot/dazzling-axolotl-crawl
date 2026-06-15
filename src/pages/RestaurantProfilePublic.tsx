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
import { cn } from "@/lib/utils";
import { useQuotaCheck } from "@/hooks/useQuotaCheck";
import FreemiumPaywallModal from "@/components/public/FreemiumPaywallModal";

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

  const { showPaywall, quotaChecked, unlockQuota } = useQuotaCheck(id);

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

  if (quotaChecked && showPaywall) {
    return (
      <div className="relative min-h-screen w-full flex flex-col items-center justify-start bg-background-light">
        <RestaurantPageHeader />
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

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-start bg-background-light">
      {/* Novo cabeçalho fixo no topo */}
      <RestaurantPageHeader />

      <div className={cn("max-w-md w-full mx-auto")}>
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
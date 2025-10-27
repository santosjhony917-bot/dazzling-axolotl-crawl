import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils/url";
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { useAuthContext } from '@/context/AuthContext'; // Import useAuthContext

// Caminho para o novo logo
const LOGO_URL = "/assets/filterfood-logo.png";

export default function Splash() {
  const navigate = useNavigate();
  const { isComplete, isLoading: isStatusLoading } = useOnboardingStatus();
  const { session, isLoading: isAuthLoading, restaurant } = useAuthContext(); // Use AuthContext

  const isLoading = isStatusLoading || isAuthLoading;

  // Auto-navigate after 2 seconds
  useEffect(() => {
    if (isLoading) return;
    
    console.log("Splash screen loaded. Redirecting in 2 seconds...");
    const timer = setTimeout(() => {
      if (!isComplete) {
        // 1. Onboarding não completo -> Inicia Onboarding
        navigate(createPageUrl("onboarding"), { replace: true });
      } else if (session) {
        // 2. Onboarding completo E Autenticado -> Vai para a Home correta
        const isRestaurantOwner = !!restaurant;
        const targetPath = isRestaurantOwner 
          ? createPageUrl("restaurant-area/dashboard") 
          : createPageUrl("home");
        navigate(targetPath, { replace: true });
      } else {
        // 3. Onboarding completo E Não Autenticado -> Vai para a tela de escolha de papel (Welcome)
        navigate(createPageUrl("welcome"), { replace: true });
      }
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [navigate, isLoading, isComplete, session, restaurant]);

  return (
    <div className="h-screen w-full relative flex items-center justify-center bg-[#E47948]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
        className="text-center px-8"
      >
        <div className="mx-auto max-w-[520px]">
          {/* Usando a imagem PNG oficial */}
          <img 
            src={LOGO_URL} 
            alt="Filter Food Logo" 
            className="w-64 h-auto mx-auto drop-shadow-xl"
          />
        </div>
      </motion.div>
    </div>
  );
}
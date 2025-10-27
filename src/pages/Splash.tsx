import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils/url";
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';

// Caminho para o novo logo
const LOGO_URL = "/assets/filterfood-logo.png";

export default function Splash() {
  const navigate = useNavigate();
  const { isComplete, isLoading } = useOnboardingStatus();

  // Auto-navigate after 2 seconds
  useEffect(() => {
    if (isLoading) return;
    
    console.log("Splash screen loaded. Redirecting in 2 seconds...");
    const timer = setTimeout(() => {
      if (isComplete) {
        // Se o onboarding estiver completo, vai direto para Welcome
        navigate(createPageUrl("welcome"), { replace: true });
      } else {
        // Caso contrário, vai para Onboarding
        navigate(createPageUrl("onboarding"), { replace: true });
      }
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [navigate, isLoading, isComplete]);

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
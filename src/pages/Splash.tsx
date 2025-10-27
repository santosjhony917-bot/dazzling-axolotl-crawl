import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils/url";
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus'; // Mantendo o hook para consistência

// Caminho para o novo logo
const LOGO_URL = "/assets/filterfood-logo.png";

export default function Splash() {
  const navigate = useNavigate();
  const { isComplete, isLoading } = useOnboardingStatus(); // Mantendo o hook, mas a lógica de redirecionamento é fixa aqui

  // Auto-navigate after 2 seconds
  useEffect(() => {
    if (isLoading) return;
    
    console.log("Splash screen loaded. Redirecting to onboarding in 2 seconds...");
    const timer = setTimeout(() => {
      // Redirecionamento fixo para 'onboarding' conforme solicitado
      navigate(createPageUrl("onboarding"), { replace: true });
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [navigate, isLoading]);

  return (
    <div className="h-screen w-full relative flex items-center justify-center bg-[#E47948]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: "easeInOut" }} // Transição mais suave
        className="text-center px-8"
      >
        <div className="mx-auto max-w-[520px]">
          {/* Usando a imagem PNG oficial */}
          <img 
            src={LOGO_URL} 
            alt="Filter Food Logo" 
            className="w-64 h-auto mx-auto drop-shadow-xl" // Adicionando sombra
          />
        </div>
      </motion.div>
    </div>
  );
}
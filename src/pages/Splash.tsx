import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils/url";
import { useAuthContext } from "@/context/AuthContext"; // Importando o contexto de autenticação

// Caminho para o novo logo
const LOGO_URL = "/assets/filterfood-logo.png";

export default function Splash() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuthContext(); // Usando o contexto de autenticação

  // Auto-navigate after 2 seconds
  useEffect(() => {
    if (isLoading) return;

    const targetPath = user ? createPageUrl("home") : createPageUrl("onboarding");
    
    // Se o usuário estiver autenticado, navega imediatamente para a home.
    if (user) {
      navigate(targetPath, { replace: true });
      return;
    }
    
    // Se o usuário não estiver autenticado, exibe o splash por 2 segundos antes de ir para o onboarding.
    console.log(`Splash screen loaded. Redirecting to ${targetPath} in 2 seconds...`);
    
    const timer = setTimeout(() => {
      navigate(targetPath, { replace: true });
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [navigate, user, isLoading]);

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

      {/* Loading dots animation at the bottom (REMOVIDO) */}
    </div>
  );
}
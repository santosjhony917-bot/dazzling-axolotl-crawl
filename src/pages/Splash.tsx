"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils/url";
import { useAuthData } from "@/context/AuthContext"; 
import { Loader2 } from "lucide-react";

const LOGO_URL = "/assets/filterfood-logo.png";

export default function Splash() {
  const navigate = useNavigate();
  // Agora estamos pegando também os dados do restaurante e o estado de carregamento do restaurante
  const { user, isLoading, restaurant, isRestaurantLoading } = useAuthData(); 

  useEffect(() => {
    // Espera o estado de autenticação e os dados do restaurante serem resolvidos
    if (isLoading || isRestaurantLoading) {
      return;
    }

    let targetPath: string;
    let delay = 2000; // Atraso padrão para a tela de splash

    if (user) {
      if (restaurant) {
        // Usuário autenticado E possui um restaurante
        targetPath = createPageUrl("restaurant-area/home");
        delay = 50; // Redirecionamento rápido para proprietários de restaurante
      } else {
        // Usuário autenticado, mas NÃO possui um restaurante (usuário cliente)
        targetPath = createPageUrl("home");
        delay = 50; // Redirecionamento rápido para usuários clientes
      }
    } else {
      // Usuário não autenticado
      targetPath = createPageUrl("onboarding");
      delay = 2000; // Atraso da tela de splash para usuários não autenticados
    }
    
    console.log(`Splash screen loaded. Redirecting to ${targetPath} in ${delay}ms...`);
    
    const timer = setTimeout(() => {
      // Redireciona sempre que a lógica for resolvida, pois a tela de splash é um ponto de entrada.
      navigate(targetPath, { replace: true });
    }, delay);
    
    return () => clearTimeout(timer);
  }, [navigate, user, isLoading, restaurant, isRestaurantLoading]); // Adicionando restaurant e isRestaurantLoading às dependências

  return (
    <div className="h-screen w-full relative flex flex-col items-center justify-center bg-[#E47948] md:max-w-md md:mx-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: "easeInOut" }} 
        className="text-center px-8"
      >
        <div className="mx-auto max-w-[520px]">
          <img 
            src={LOGO_URL} 
            alt="Filter Food Logo" 
            className="w-64 h-auto mx-auto drop-shadow-xl" 
          />
        </div>
      </motion.div>
      
      {/* Indicador de carregamento enquanto isLoading ou isRestaurantLoading é true */}
      {(isLoading || isRestaurantLoading) && (
        <div className="absolute bottom-10">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      )}
    </div>
  );
}
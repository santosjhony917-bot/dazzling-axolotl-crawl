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
    <div className="h-screen w-full relative flex flex-col items-center justify-center bg-gradient-to-br from-highlight via-highlight/90 to-amber-500 md:max-w-md md:mx-auto overflow-hidden">
      {/* Animated background circles */}
      <motion.div
        className="absolute top-20 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-20 left-10 w-60 h-60 bg-white/10 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5,
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }} 
        className="text-center px-8 z-10"
      >
        <div className="mx-auto max-w-[520px]">
          <motion.img 
            src={LOGO_URL} 
            alt="Filter Food Logo" 
            className="w-72 h-auto mx-auto drop-shadow-2xl"
            animate={{
              y: [0, -10, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>

        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mt-8"
        >
          <p className="text-white text-xl font-bold tracking-wide drop-shadow-lg">
            Descubra o melhor da gastronomia
          </p>
          <p className="text-white/90 text-sm mt-2 font-medium">
            Compare preços, explore pratos e encontre seu próximo restaurante favorito
          </p>
        </motion.div>
      </motion.div>
      
      {/* Indicador de carregamento enquanto isLoading ou isRestaurantLoading é true */}
      {(isLoading || isRestaurantLoading) && (
        <motion.div 
          className="absolute bottom-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Loader2 className="w-10 h-10 animate-spin text-white drop-shadow-lg" />
        </motion.div>
      )}

      {/* Version footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="absolute bottom-4 text-white/70 text-xs font-medium"
      >
        v1.0.0
      </motion.div>
    </div>
  );
}
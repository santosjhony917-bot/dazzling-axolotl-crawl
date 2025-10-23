import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils/url";

// Caminho para o novo logo
const LOGO_URL = "/assets/filterfood-logo.png";

export default function Splash() {
  const navigate = useNavigate();

  // Auto-navigate after 2 seconds
  useEffect(() => {
    console.log("Splash screen loaded. Redirecting to onboarding in 2 seconds...");
    const timer = setTimeout(() => {
      navigate(createPageUrl("onboarding"));
    }, 2000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="h-screen w-full relative flex items-center justify-center bg-[#E47948]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, ease: "easeInOut" }}
        className="text-center px-8"
      >
        <div className="mx-auto max-w-[520px]">
          {/* Usando a imagem PNG oficial */}
          <img 
            src={LOGO_URL} 
            alt="Filter Food Logo" 
            className="w-64 h-auto mx-auto"
          />
        </div>
      </motion.div>

      {/* Loading dots animation at the bottom */}
      <motion.div 
        className="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex justify-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-3 h-3 bg-white/70 rounded-full"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}
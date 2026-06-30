"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils/url";
import { useAuthData } from "@/context/AuthContext";

export default function Splash() {
  const navigate = useNavigate();
  const { user, isLoading, restaurant, isRestaurantLoading } = useAuthData();

  useEffect(() => {
    if (isLoading || isRestaurantLoading) {
      return;
    }

    const targetPath = createPageUrl("onboarding");
    const delay = user ? 50 : 2200;

    console.log(`Splash screen loaded. Redirecting to ${targetPath} in ${delay}ms...`);

    const timer = setTimeout(() => {
      navigate(targetPath, { replace: true });
    }, delay);

    return () => clearTimeout(timer);
  }, [navigate, user, isLoading, restaurant, isRestaurantLoading]);

  return (
    <div className="min-h-screen w-full bg-[#f1f5f9] flex justify-center">
      <div className="flex min-h-screen w-full max-w-md mx-auto items-center justify-center overflow-hidden bg-[#df4b1c] font-['Poppins']">
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10"
        >
          <motion.div
            initial={{ clipPath: "inset(0 100% 0 0)" }}
            animate={{ clipPath: "inset(0 0% 0 0)" }}
            transition={{ delay: 0.18, duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden px-8 py-4"
          >
            <motion.h1
              aria-label="FilterFood"
              initial={{ y: 18 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.18, duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
              className="font-['Lobster'] text-[76px] leading-none text-white"
            >
              FilterFood
            </motion.h1>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}

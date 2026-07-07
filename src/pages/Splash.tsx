"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils/url";
import { useAuthData } from "@/context/AuthContext";

const easeOut = [0.16, 1, 0.3, 1] as const;
const logoLetters = "FilterFood".split("");

export default function Splash() {
  const navigate = useNavigate();
  const { user, isLoading, restaurant, isRestaurantLoading } = useAuthData();

  useEffect(() => {
    if (isLoading || isRestaurantLoading) {
      return;
    }

    const targetPath = createPageUrl("onboarding");
    const delay = user ? 2600 : 3600;

    console.log(`Splash screen loaded. Redirecting to ${targetPath} in ${delay}ms...`);

    const timer = setTimeout(() => {
      navigate(targetPath, { replace: true });
    }, delay);

    return () => clearTimeout(timer);
  }, [navigate, user, isLoading, restaurant, isRestaurantLoading]);

  return (
    <div className="min-h-screen w-full bg-[#f1f5f9] flex justify-center">
      <div className="relative flex min-h-screen w-full max-w-md mx-auto items-center justify-center overflow-hidden bg-[#df4b1c] font-['Poppins']">
        <h1
          aria-label="FilterFood"
          className="relative z-10 flex items-baseline justify-center px-6 font-['Lobster'] text-[72px] leading-none text-white drop-shadow-[0_18px_42px_rgba(0,0,0,0.20)]"
        >
          {logoLetters.map((letter, index) => (
            <motion.span
              aria-hidden="true"
              key={`${letter}-${index}`}
              initial={{ opacity: 0, y: 24, rotate: index % 2 === 0 ? -8 : 8, scale: 0.88 }}
              animate={{
                opacity: 1,
                y: [24, -12, 5, -4, 0],
                rotate: [index % 2 === 0 ? -8 : 8, index % 2 === 0 ? 5 : -5, 0],
                scale: [0.88, 1.08, 0.98, 1.03, 1],
              }}
              transition={{
                delay: 0.24 + index * 0.055,
                duration: 1.28,
                ease: easeOut,
                times: [0, 0.42, 0.64, 0.82, 1],
              }}
              className="inline-block origin-bottom"
            >
              {letter}
            </motion.span>
          ))}
        </h1>
      </div>
    </div>
  );
}

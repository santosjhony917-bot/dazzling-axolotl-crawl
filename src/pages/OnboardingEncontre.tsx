import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils/url";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OnboardingEncontre() {
  const navigate = useNavigate();

  const handleNext = () => {
    // Navigate to the next onboarding screen
    // navigate(createPageUrl("OnboardingAvalie"));
  };

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden">
      {/* BACKGROUND (Image and Gradient) */}
      <div className="absolute inset-0 w-full h-full">
        <img 
          alt="A delicious grilled dish with vegetables" 
          className="w-full h-full object-cover" 
          src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070&auto=format&fit=crop"
        />
        
        {/* DARK GRADIENT TO ENSURE TEXT READABILITY */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20"></div>
      </div>

      {/* SCREEN CONTENT */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative flex flex-col h-full p-6 pt-10 text-white"
      > 
        {/* SPACER: OCCUPIES EMPTY SPACE AND PUSHES CONTENT DOWN */}
        <div className="flex-grow"></div> 

        {/* MAIN TEXT BLOCK (BOTTOM PART) */}
        <motion.div 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex flex-col justify-end items-center text-center pb-12"
        >
          <h1 className="text-white tracking-tight text-4xl md:text-5xl font-bold leading-tight">
            Encontre
          </h1>
          <p className="text-white/90 text-lg font-normal leading-normal max-w-md mt-4 px-4">
            Descubra os melhores sabores da cidade. Encontre restaurantes, pratos e experiências gastronômicas em João Pessoa.
          </p>
        </motion.div>

        {/* FOOTER: INDICATORS AND ACTION BUTTON */}
        <motion.div 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex flex-col items-center gap-5 pb-10"
        >
          {/* SLIDE INDICATORS */}
          <div className="flex w-full flex-row items-center justify-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-[#E47948] shadow-lg"></div>
            <div className="h-2.5 w-2.5 rounded-full bg-white/40"></div>
            <div className="h-2.5 w-2.5 rounded-full bg-white/40"></div>
          </div>

          {/* MAIN BUTTON */}
          <div className="w-full max-w-md px-4">
            <Button 
              onClick={handleNext}
              className="w-full h-14 bg-[#E47948] hover:bg-[#E47948]/90 text-white rounded-full text-lg font-bold shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <span>Próximo</span>
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
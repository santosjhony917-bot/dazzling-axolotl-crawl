import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, DollarSign, MapPin, Utensils, Search, Star, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import OnboardingScreen from '../components/onboarding/OnboardingScreen';
import { createPageUrl } from '@/utils/url';

const onboardingScreens = [
  {
    title: "Bem-vindo ao Filterfood",
    description: "Descubra os melhores restaurantes perto de você. Compare preços, avalie opções e encontre sua próxima refeição perfeita.",
    backgroundImage: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
    features: [
      { icon: Search, label: "Buscar" },
      { icon: Star, label: "Avaliar" },
      { icon: Heart, label: "Favoritar" }
    ]
  },
  {
    title: "Compare",
    description: "Encontre a opção perfeita para você. Compare preços, veja onde os restaurantes estão e filtre pelo seu tipo de comida favorito.",
    backgroundImage: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80",
    features: [
      { icon: DollarSign, label: "Preço" },
      { icon: MapPin, label: "Localização" },
      { icon: Utensils, label: "Tipo de comida" }
    ]
  },
  {
    title: "Comece Agora",
    description: "Tudo pronto! Explore restaurantes incríveis, compare opções e aproveite sua experiência culinária perfeita.",
    backgroundImage: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80",
    features: null
  }
];

export default function Onboarding() {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [direction, setDirection] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentScreen < onboardingScreens.length - 1) {
      setDirection(1);
      setCurrentScreen(prev => prev + 1);
    } else {
      completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    try {
      await base44.auth.updateMe({ onboarding_completed: true });
      navigate(createPageUrl('welcome'));
    } catch (error) {
      console.error('Error completing onboarding:', error);
      navigate(createPageUrl('welcome'));
    }
  };

  const skipOnboarding = () => {
    completeOnboarding();
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0
    })
  };

  const screen = onboardingScreens[currentScreen];

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#f5f7f8]">
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={currentScreen}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 }
          }}
          className="absolute inset-0"
        >
          <OnboardingScreen
            title={screen.title}
            description={screen.description}
            features={screen.features}
            backgroundImage={screen.backgroundImage}
          >
            {/* Navigation Footer */}
            <div className="flex w-full justify-between items-center px-4 pb-4 mt-auto">
              <button
                onClick={skipOnboarding}
                className="text-gray-600 text-base font-medium hover:text-gray-800 transition-colors"
              >
                Pular
              </button>

              {/* Indicators */}
              <div className="flex items-center justify-center gap-3">
                {onboardingScreens.map((_, index) => (
                  <motion.div
                    key={index}
                    animate={{
                      scale: currentScreen === index ? 1.2 : 1,
                      opacity: currentScreen === index ? 1 : 0.4
                    }}
                    className={`h-2.5 w-2.5 rounded-full ${
                      currentScreen === index ? 'bg-[#032d63]' : 'bg-[#032d63]/40'
                    }`}
                  />
                ))}
              </div>

              {/* Next/Finish Button */}
              <div className="w-32">
                <Button
                  onClick={handleNext}
                  className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-full h-12 bg-[#032d63] hover:bg-[#032d63]/90 text-white gap-1 text-base font-bold shadow-lg transition-all hover:shadow-xl"
                >
                  <span className="truncate">
                    {currentScreen === onboardingScreens.length - 1 ? 'Começar' : 'Próximo'}
                  </span>
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </OnboardingScreen>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, DollarSign, MapPin, Utensils, Search, Star, Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import OnboardingScreen from '../components/onboarding/OnboardingScreen';
import { createPageUrl } from '@/utils/url';
import { showError } from '@/utils/toast';

const onboardingScreens = [
  {
    title: "Bem-vindo ao FilterFood",
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
  const [isCompleting, setIsCompleting] = useState(false);
  const navigate = useNavigate();

  // Check if onboarding was already completed on initial load
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const userData = await base44.auth.me();
        if (userData.onboarding_completed) {
          console.log("Onboarding already completed, redirecting to welcome.");
          navigate(createPageUrl('welcome'));
        }
      } catch (error) {
        // If user is not found or any other error, proceed with onboarding
        console.log("No user data found or error fetching, starting onboarding.");
      }
    };

    checkOnboardingStatus();
  }, [navigate]);

  const completeOnboarding = async () => {
    if (isCompleting) return; // Prevent multiple clicks
    
    setIsCompleting(true);
    try {
      await base44.auth.updateMe({ onboarding_completed: true });
      console.log("Onboarding marked as completed.");
      navigate(createPageUrl('welcome'));
    } catch (error) {
      console.error('Error completing onboarding:', error);
      showError('Falha ao concluir o onboarding. Por favor, tente novamente.');
      // Even if the API call fails, we still navigate to welcome to prevent being stuck
      navigate(createPageUrl('welcome'));
    } finally {
      setIsCompleting(false);
    }
  };
  
  const handleNext = () => {
    if (currentScreen < onboardingScreens.length - 1) {
      setDirection(1);
      setCurrentScreen(prev => prev + 1);
    } else {
      // Última tela: completa o onboarding
      completeOnboarding();
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

  // Garante que screen seja válido antes de renderizar
  const screen = onboardingScreens[currentScreen];
  
  if (!screen) {
    // Se por algum motivo o índice for inválido (ex: 3), navegamos imediatamente
    completeOnboarding();
    return null; 
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] w-full flex flex-col">
      <div className="relative w-full h-screen overflow-hidden bg-background-light max-w-md mx-auto border-x border-slate-200/60">
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
              <Button
                onClick={skipOnboarding}
                disabled={isCompleting}
                variant="ghost"
                className="text-gray-600 text-base font-medium hover:text-gray-800 transition-colors disabled:opacity-50"
              >
                Pular
              </Button>

              {/* Indicators */}
              <div className="flex items-center justify-center gap-2">
                {onboardingScreens.map((_, index) => {
                  const isActive = currentScreen === index;
                  return (
                    <motion.div
                      key={index}
                      layout
                      animate={{
                        width: isActive ? 24 : 8,
                        opacity: isActive ? 1 : 0.3
                      }}
                      transition={{ duration: 0.3 }}
                      className="h-2 rounded-full bg-[#EF2A39]"
                    />
                  );
                })}
              </div>

              {/* Next/Finish Button */}
              <div className="shrink-0">
                <Button
                  onClick={handleNext}
                  disabled={isCompleting}
                  variant="highlight"
                  className="flex h-12 w-12 items-center justify-center rounded-full shadow-[0_8px_20px_rgba(239,42,57,0.22)] border-none transition-all active:scale-95 disabled:opacity-70 p-0"
                  title="Próximo"
                >
                  {isCompleting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                  )}
                </Button>
              </div>
            </div>
          </OnboardingScreen>
        </motion.div>
      </AnimatePresence>
      </div>
    </div>
  );
}
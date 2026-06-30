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
    backgroundImage: "/images/filterfood_combo_food.png",
    accentImage: "/images/filterfood_combo_food.png",
    features: [
      { icon: Search, label: "Buscar" },
      { icon: Star, label: "Avaliar" },
      { icon: Heart, label: "Favoritar" }
    ]
  },
  {
    title: "Compare",
    description: "Encontre a opção perfeita para você. Compare preços, veja onde os restaurantes estão e filtre pelo seu tipo de comida favorito.",
    backgroundImage: "/images/filterfood_compare_table.png",
    accentImage: "/images/filterfood_price_search.png",
    features: [
      { icon: DollarSign, label: "Preço" },
      { icon: MapPin, label: "Localização" },
      { icon: Utensils, label: "Tipo de comida" }
    ]
  },
  {
    title: "Comece Agora",
    description: "Tudo pronto! Explore restaurantes incríveis, compare opções e aproveite sua experiência culinária perfeita.",
    backgroundImage: "/images/filterfood_price_search.png",
    accentImage: "/images/filterfood_compare_table.png",
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
    localStorage.setItem('filterfood_onboarding_completed', 'true');
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
      <div className="app-phone-shell relative h-screen overflow-hidden">
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
            accentImage={screen.accentImage}
          >
            {/* Navigation Footer */}
            <div className="mt-auto flex w-full items-center justify-between px-4 pb-4">
              <Button
                onClick={skipOnboarding}
                disabled={isCompleting}
                variant="ghost"
                className="h-10 px-3 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700 disabled:opacity-50"
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
                      className="h-1.5 rounded-full bg-highlight"
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
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/70 p-0 shadow-none transition-all active:scale-95 disabled:opacity-70"
                  title="Próximo"
                  aria-label={currentScreen < onboardingScreens.length - 1 ? 'Próxima tela' : 'Concluir onboarding'}
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

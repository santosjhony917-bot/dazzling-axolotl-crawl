import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, X } from 'lucide-react';

interface FeatureTourProps {
  onClose: () => void;
}

interface StepConfig {
  id: number;
  targetId: string;
  title: string;
  text: string;
  padding: number;
  isCircle: boolean;
}

const steps: StepConfig[] = [
  {
    id: 1,
    targetId: 'tour-search-bar',
    title: '🔍 Encontre o que deseja!',
    text: 'Busque por pratos, ingredientes ou pelo seu restaurante favorito de João Pessoa em um só lugar.',
    padding: 6,
    isCircle: false,
  },
  {
    id: 2,
    targetId: 'tour-restaurants-list',
    title: '📋 Cardápios Completos!',
    text: 'Veja preços reais, fotos e detalhes de até 5 estabelecimentos por dia gratuitamente.',
    padding: 6,
    isCircle: false,
  },
  {
    id: 3,
    targetId: 'tour-happy-hour-card',
    title: '🍻 Happy Hour Coletivo!',
    text: 'Convide seus amigos, crie salas de bate-papo em tempo real e combinem de comer juntos nos seus locais favoritos de João Pessoa!',
    padding: 6,
    isCircle: false,
  },
  {
    id: 4,
    targetId: 'tour-ai-button',
    title: '🤖 Olá! Eu sou a IA do FilterFood.',
    text: 'Estou aqui para te dar dicas personalizadas de onde comer e achar as melhores promoções da cidade. Eu ficarei totalmente disponível para você assim que você convidar 3 amigos para o app!',
    padding: 4,
    isCircle: true,
  }
];

export const FeatureTour: React.FC<FeatureTourProps> = ({ onClose }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  const currentStep = steps[stepIndex];

  // Monitorar o elemento alvo do passo atual
  useEffect(() => {
    if (!currentStep) return;

    const updateCoordinates = () => {
      const element = document.getElementById(currentStep.targetId);
      if (element) {
        // Se o elemento não estiver visível por rolagem, faz o scroll suave até ele
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const getRect = () => {
          const rect = element.getBoundingClientRect();
          setTargetRect({
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          });
        };

        // Atualizar imediatamente e agendar atualizações durante o scroll suave
        getRect();
        const timers = [
          setTimeout(getRect, 100),
          setTimeout(getRect, 300),
          setTimeout(getRect, 500)
        ];

        window.addEventListener('resize', getRect);
        window.addEventListener('scroll', getRect, { passive: true });

        return () => {
          timers.forEach(clearTimeout);
          window.removeEventListener('resize', getRect);
          window.removeEventListener('scroll', getRect);
        };
      } else {
        // Fallback caso o elemento não seja encontrado
        setTargetRect({
          left: window.innerWidth / 2 - 60,
          top: window.innerHeight / 2 - 60,
          width: 120,
          height: 120,
        });
      }
    };

    const cleanup = updateCoordinates();
    
    // Re-checar após curto intervalo para garantir renderização do DOM
    const fallbackTimer = setTimeout(updateCoordinates, 250);

    return () => {
      if (cleanup) cleanup();
      clearTimeout(fallbackTimer);
    };
  }, [stepIndex, currentStep]);

  const handleNext = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem('tutorial_visto', 'true');
    onClose();
  };

  if (!targetRect || !currentStep) return null;

  const isTopHalf = targetRect.top + targetRect.height / 2 < window.innerHeight / 2;
  const padding = currentStep.padding;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden select-none">
      {/* Dimmed Background Overlay */}
      <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={handleComplete} />

      {/* Dynamic Spotlight Mask */}
      <motion.div
        animate={{
          left: targetRect.left - padding,
          top: targetRect.top - padding,
          width: targetRect.width + padding * 2,
          height: targetRect.height + padding * 2,
          borderRadius: currentStep.isCircle ? '9999px' : '24px',
        }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        style={{
          position: 'fixed',
          boxShadow: '0 0 0 9999px rgba(9, 13, 26, 0.75)',
          pointerEvents: 'none',
          zIndex: 101,
        }}
      />

      {/* Pulsing Accent Glow Border around target */}
      <motion.div
        animate={{
          left: targetRect.left - padding - 3,
          top: targetRect.top - padding - 3,
          width: targetRect.width + padding * 2 + 6,
          height: targetRect.height + padding * 2 + 6,
          borderRadius: currentStep.isCircle ? '9999px' : '26px',
        }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        className="fixed border-2 border-[#EF2A39] shadow-[0_0_20px_rgba(239,42,57,0.6)] pointer-events-none z-[102]"
        style={{
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        }}
      />

      {/* Skip Button Top Right */}
      <button
        onClick={handleComplete}
        className="fixed top-5 right-5 z-[103] bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3.5 py-1.5 rounded-full border border-white/20 shadow-md flex items-center gap-1 backdrop-blur-md active:scale-95 transition-all cursor-pointer pointer-events-auto"
      >
        Pular tutorial <X className="w-3 h-3" />
      </button>

      {/* Elegant Glassmorphism Explanation Balloon */}
      <div
        className="fixed z-[104] w-[90%] max-w-[350px] pointer-events-auto transition-all duration-300"
        style={
          isTopHalf
            ? {
                top: `${targetRect.top + targetRect.height + 20}px`,
                left: '50%',
                transform: 'translateX(-50%)',
              }
            : {
                bottom: `${window.innerHeight - targetRect.top + 20}px`,
                left: '50%',
                transform: 'translateX(-50%)',
              }
        }
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={stepIndex}
            initial={{ opacity: 0, y: isTopHalf ? 15 : -15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: isTopHalf ? -10 : 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-white/95 backdrop-blur-md border border-white/20 rounded-[28px] p-6 shadow-[0_15px_45px_rgba(0,0,0,0.35)] flex flex-col gap-4 relative overflow-hidden"
          >
            {/* Decorative colored glow on top of card */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF7E40] to-[#EF2A39]" />

            <div className="space-y-2">
              {/* Step indicator */}
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#EF2A39] flex items-center gap-1.5">
                <span>Passo {stepIndex + 1} de {steps.length}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#EF2A39]/30" />
              </div>
              <h3 className="text-base font-extrabold text-[#3C2F2F] tracking-tight">
                {currentStep.title}
              </h3>
              <p className="text-xs text-[#6A6A6A] leading-relaxed font-medium">
                {currentStep.text}
              </p>
            </div>

            {/* Pagination dots & Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-1">
              {/* Dots */}
              <div className="flex gap-1.5">
                {steps.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === stepIndex ? 'w-4 bg-[#EF2A39]' : 'w-1.5 bg-slate-200'
                    }`}
                  />
                ))}
              </div>

              {/* Action Button */}
              {stepIndex === steps.length - 1 ? (
                <Button
                  onClick={handleComplete}
                  className="bg-gradient-to-r from-[#FF7E40] to-[#EF2A39] hover:brightness-110 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-[0_4px_12px_rgba(239,42,57,0.3)] flex items-center gap-1.5 border-none cursor-pointer"
                >
                  Começar a Usar! <Sparkles className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  className="bg-[#3C2F2F] hover:bg-[#4E3E3E] text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 border-none cursor-pointer"
                >
                  Próximo <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

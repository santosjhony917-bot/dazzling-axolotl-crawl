import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, BookOpenText, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FeatureTourProps {
  onClose: () => void;
}

const TOUR_STORAGE_KEY = 'filterfood_feature_tour_completed';

const steps = [
  {
    title: 'Pergunte como você fala',
    text: 'Diga o prato, o orçamento, para quantas pessoas e a região. A busca usa apenas cardápios disponíveis e publicados.',
    icon: Sparkles,
  },
  {
    title: 'Confira o que foi entendido',
    text: 'Ajuste preço, distância, pessoas ou restrições pelos filtros visíveis. Nenhum critério é relaxado silenciosamente.',
    icon: SlidersHorizontal,
  },
  {
    title: 'Verifique no cardápio',
    text: 'Cada opção mostra restaurante, preço e origem. Abra o cardápio para conferir antes de decidir.',
    icon: BookOpenText,
  },
] as const;

export const FeatureTour: React.FC<FeatureTourProps> = ({ onClose }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();
  const currentStep = steps[stepIndex];
  const StepIcon = currentStep.icon;

  const complete = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    // Compatibilidade com instalações que já consultavam a chave anterior.
    localStorage.setItem('tutorial_visto', 'true');
    onClose();
  };

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') complete();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  // O foco deve ser capturado apenas quando o tour abre.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:items-center">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="feature-tour-title"
        aria-describedby="feature-tour-description"
        className="relative w-full max-w-[420px] overflow-hidden rounded-[30px] border border-white/70 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.28)]"
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={complete}
          className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ff-primary)]"
          aria-label="Fechar apresentação"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="pr-12">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ff-primary)]">
            Como funciona · {stepIndex + 1} de {steps.length}
          </p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[var(--ff-text-primary)]">
            A IA dos cardápios em três passos
          </h2>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={stepIndex}
            initial={reduceMotion ? false : { opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, x: -12 }}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
            className="mt-6 rounded-[24px] bg-[var(--ff-surface-warm)] p-5"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--ff-orange-soft)] text-[var(--ff-primary)]">
              <StepIcon className="h-6 w-6" aria-hidden="true" />
            </span>
            <h3 id="feature-tour-title" className="mt-4 text-xl font-bold text-[var(--ff-text-primary)]">
              {currentStep.title}
            </h3>
            <p id="feature-tour-description" className="mt-2 text-base leading-7 text-[var(--ff-text-secondary)]">
              {currentStep.text}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="flex gap-2" aria-label={`Passo ${stepIndex + 1} de ${steps.length}`}>
            {steps.map((step, index) => (
              <span
                key={step.title}
                className={`h-2 rounded-full transition-[width,background-color] duration-200 ${
                  index === stepIndex ? 'w-6 bg-[var(--ff-primary)]' : 'w-2 bg-slate-200'
                }`}
                aria-hidden="true"
              />
            ))}
          </div>

          <div className="flex gap-2">
            {stepIndex > 0 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStepIndex((current) => current - 1)}
                className="min-h-11 rounded-full px-4"
              >
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Voltar
              </Button>
            )}
            <Button
              type="button"
              onClick={() => {
                if (stepIndex === steps.length - 1) complete();
                else setStepIndex((current) => current + 1);
              }}
              className="min-h-11 rounded-full bg-[var(--ff-primary)] px-5 font-bold text-white hover:bg-[var(--ff-primary-dark)]"
            >
              {stepIndex === steps.length - 1 ? 'Fazer uma pergunta' : 'Continuar'}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

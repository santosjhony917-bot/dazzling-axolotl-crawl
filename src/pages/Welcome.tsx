import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpenText, ChevronRight, MapPin, Rocket, Store } from 'lucide-react';
import { createPageUrl } from '@/utils/url';
import { base44 } from '@/api/base44Client';
import { showError } from '@/utils/toast';
import {
  FFOutlineButton,
  FFPageContainer,
  FFPrimaryButton,
  FFSectionTitle,
} from '@/components/filterfood/FilterFoodUI';

export default function Welcome() {
  const navigate = useNavigate();

  const handleNavigation = async (role: 'customer' | 'restaurant', path: string) => {
    try {
      await base44.auth.updateMe({ user_role: role });
      navigate(path);
    } catch (error) {
      showError('Falha ao definir o papel do usuário. Tente novamente.');
    }
  };

  return (
    <FFPageContainer shellClassName="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[var(--ff-surface-warm)]">
      <div
        className="absolute inset-x-0 top-0 w-full overflow-hidden bg-[radial-gradient(circle_at_44%_14%,#fff8ef_0%,#ffe1ce_38%,#f7b17f_100%)]"
        style={{ height: 'clamp(410px, 58dvh, 540px)' }}
      >
        <img
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover object-[center_38%]"
          src="/images/filterfood_welcome_food_hero.webp"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_46%_30%,transparent_0%,rgba(255,250,246,0.02)_48%,rgba(255,250,246,0.58)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[var(--ff-surface-warm)] via-[var(--ff-surface-warm)]/42 to-transparent" />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.45 }}
          className="absolute left-5"
          style={{ top: 'max(1.25rem, env(safe-area-inset-top))' }}
        >
          <div className="inline-flex items-center gap-3 rounded-full border border-orange-100/80 bg-white/94 py-2 pl-2 pr-4 text-sm font-bold text-[var(--ff-text-primary)] shadow-[0_12px_24px_rgba(88,29,11,0.08)] backdrop-blur-md">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--ff-primary)] text-white shadow-[0_8px_16px_rgba(223,75,28,0.18)]">
              <MapPin className="h-4 w-4" />
            </span>
            Cardápios disponíveis
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.48, duration: 0.45 }}
          className="absolute right-4 inline-flex items-center gap-2 rounded-full bg-[var(--ff-primary)] px-5 py-3 text-sm font-bold text-white shadow-[var(--ff-shadow-button)]"
          style={{ top: 'clamp(5.5rem, 13dvh, 7.5rem)' }}
        >
          <Rocket className="h-4 w-4" />
          Em um só app
        </motion.div>
      </div>

      <main className="relative z-10 flex min-h-[100dvh] flex-col justify-end">
        <section className="flex w-full flex-col items-center rounded-t-[42px] border-t border-[var(--ff-border-soft)] bg-[var(--ff-surface-warm)] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8 text-center shadow-[0_-16px_48px_rgba(15,23,42,0.08)]">
          <motion.h1
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="mt-1 font-['Lobster'] text-5xl font-normal leading-none text-[var(--ff-primary)] drop-shadow-[0_2px_5px_rgba(0,0,0,0.04)]"
          >
            FilterFood
          </motion.h1>

          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-5 mt-4 w-full max-w-sm"
          >
            <FFSectionTitle
              align="center"
              title="Pergunte. A IA consulta os cardápios disponíveis."
              description="Encontre pratos, preços e restaurantes publicados perto de você."
            />
          </motion.div>

          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mb-5 mt-auto flex w-full flex-col gap-3"
          >
            <FFPrimaryButton
              onClick={() => handleNavigation('customer', createPageUrl('auth'))}
              aria-label="Consultar cardápios como cliente"
              className="h-14 w-full justify-between px-6 text-base"
            >
              <span className="inline-flex items-center gap-2">
                <BookOpenText className="h-5 w-5" />
                Consultar Cardápios
              </span>
              <ChevronRight className="h-5 w-5" />
            </FFPrimaryButton>

            <FFOutlineButton
              onClick={() => handleNavigation('restaurant', createPageUrl('restaurant-area-hub'))}
              aria-label="Entrar na área do restaurante"
              className="h-14 w-full justify-between border-[var(--ff-primary)]/45 px-6 text-base"
            >
              <span className="inline-flex items-center gap-2">
                <Store className="h-5 w-5" />
                Sou Restaurante
              </span>
              <ChevronRight className="h-5 w-5" />
            </FFOutlineButton>
          </motion.div>

          <footer className="mt-auto w-full pt-2">
            <p className="text-center text-[11px] font-medium text-[var(--ff-text-secondary)]">
              © 2026 FilterFood. Todos os direitos reservados.
            </p>
          </footer>
        </section>
      </main>
    </FFPageContainer>
  );
}

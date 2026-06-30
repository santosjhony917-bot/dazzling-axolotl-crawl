import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpenText, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils/url';
import { base44 } from '@/api/base44Client';
import { showError } from '@/utils/toast';

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
    <div className="min-h-screen bg-[#f1f5f9] w-full flex flex-col">
      <div className="app-phone-shell relative flex flex-col bg-[#FAFAFA] font-['Poppins']">
        <div className="absolute top-0 inset-x-0 w-full h-[42%] min-h-[280px]">
          <img
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover"
            src="/images/filterfood_compare_table.png"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/15 to-[#FAFAFA]" />
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.45 }}
            className="absolute left-5 top-8 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-[#3C2F2F] shadow-[0_10px_24px_rgba(15,23,42,0.10)] backdrop-blur-md"
          >
            Cardápios da cidade
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.48, duration: 0.45 }}
            className="absolute right-5 top-20 rounded-full bg-[#df4b1c] px-4 py-2 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(223,75,28,0.18)]"
          >
            Em um só app
          </motion.div>
        </div>

        <main className="relative z-10 flex min-h-screen flex-col justify-end">
          <section className="w-full bg-[#FAFAFA] min-h-[56%] rounded-t-[32px] px-5 pb-5 pt-7 flex flex-col items-center text-center border-t border-slate-100/70 shadow-[0_-10px_34px_rgba(15,23,42,0.04)]">
            <motion.h1
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="font-['Lobster'] text-[46px] text-[#df4b1c] leading-none drop-shadow-[0_2px_5px_rgba(0,0,0,0.04)] mt-1"
            >
              FilterFood
            </motion.h1>

            <motion.div
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="w-full max-w-sm text-center mt-4 mb-5"
            >
              <h2 className="text-[#3C2F2F] text-[22px] font-semibold leading-tight">
                Todos os cardápios da cidade
              </h2>
              <p className="text-[#6A6A6A] text-sm font-medium mt-2 leading-relaxed">
                Consulte pratos, preços e restaurantes em um só lugar.
              </p>
            </motion.div>

            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-auto mb-4 flex w-full flex-col gap-3 rounded-[24px] border border-slate-100/80 bg-white p-4 shadow-soft"
            >
              <Button
                onClick={() => handleNavigation('customer', createPageUrl('auth'))}
                aria-label="Consultar cardÃ¡pios como cliente"
                className="w-full h-11 bg-[#df4b1c] hover:bg-[#bd3f17] text-white rounded-2xl text-[15px] font-semibold shadow-none transition-all duration-200 active:scale-95 border-none flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#df4b1c] focus-visible:ring-offset-2"
              >
                <BookOpenText className="w-5 h-5 shrink-0" />
                Consultar Cardápios
              </Button>

              <Button
                onClick={() => handleNavigation('restaurant', createPageUrl('restaurant-area-hub'))}
                variant="outline"
                aria-label="Entrar na Ã¡rea do restaurante"
                className="w-full h-11 bg-white border border-[#df4b1c]/35 text-[#df4b1c] hover:bg-[#df4b1c]/5 rounded-2xl text-[15px] font-semibold transition-all duration-200 active:scale-95 shadow-none flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#df4b1c] focus-visible:ring-offset-2"
              >
                <Store className="w-5 h-5 shrink-0" />
                Sou Restaurante
              </Button>
            </motion.div>

            <footer className="w-full pt-3 mt-auto">
              <p className="text-[#888888] text-[11px] font-medium text-center">
                © 2026 FilterFood. Todos os direitos reservados.
              </p>
            </footer>
          </section>
        </main>
      </div>
    </div>
  );
}

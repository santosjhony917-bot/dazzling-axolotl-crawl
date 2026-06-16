import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Store } from 'lucide-react';
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
      showError("Falha ao definir o papel do usuário. Tente novamente.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] w-full flex flex-col">
      <div className="relative flex min-h-screen w-full max-w-md mx-auto border-x border-slate-200/60 flex-col bg-[#FAFAFA] font-['Poppins'] overflow-hidden shadow-none">
        
        {/* Top Hero Image */}
        <div className="absolute top-0 inset-x-0 w-full h-[45%]">
          <img 
            alt="Welcome Hero" 
            className="w-full h-full object-cover" 
            src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80" 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/15 to-[#FAFAFA]" />
        </div>

        {/* Content Card (Bottom) */}
        <div className="relative flex flex-col h-full justify-end flex-grow z-10">
          <div className="w-full bg-[#FAFAFA] min-h-[58%] rounded-t-[36px] p-6 pt-8 flex flex-col items-center text-center border-t border-slate-100/50 shadow-[0_-12px_40px_rgba(0,0,0,0.05)]">
            
            {/* Logo */}
            <div className="bg-gradient-to-r from-[#FF7E40] to-[#EF2A39] rounded-2xl px-5 py-2 inline-flex items-center mt-2">
              <img src="/assets/filterfood-logo.png" alt="FilterFood" className="h-8 w-auto" />
            </div>


            {/* Welcome Text */}
            <motion.div 
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="w-full text-center mt-3 mb-6"
            >
              <h2 className="text-[#3C2F2F] text-[22px] font-bold leading-tight">
                Bem-vindo!
              </h2>
              <p className="text-[#6A6A6A] text-sm font-medium mt-1">
                Escolha como deseja usar o aplicativo hoje.
              </p>
            </motion.div>

            {/* Action Buttons */}
            <motion.div 
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="flex flex-col gap-4 w-full px-2 mb-8 mt-auto"
            >
              <Button
                onClick={() => handleNavigation('customer', createPageUrl('auth'))}
                className="w-full h-[58px] bg-[#EF2A39] hover:bg-[#D62230] text-white rounded-[20px] text-base font-bold shadow-[0px_8px_20px_rgba(239,42,57,0.22)] transition-all duration-200 active:scale-95 border-none flex items-center justify-center gap-2"
              >
                <MapPin className="w-5 h-5 shrink-0" />
                Encontrar Restaurantes
              </Button>

              <Button
                onClick={() => handleNavigation('restaurant', createPageUrl('restaurant-area-hub'))}
                variant="outline"
                className="w-full h-[58px] bg-white border-2 border-[#EF2A39] text-[#EF2A39] hover:bg-[#EF2A39]/5 rounded-[20px] text-base font-bold transition-all duration-200 active:scale-95 shadow-[0_2px_5px_rgba(0,0,0,0.04)] flex items-center justify-center gap-2"
              >
                <Store className="w-5 h-5 shrink-0" />
                Sou Restaurante
              </Button>
            </motion.div>

            {/* Footer */}
            <footer className="w-full pt-4 mt-auto">
              <p className="text-[#888888] text-[11px] font-medium text-center">
                © 2026 FilterFood. Todos os direitos reservados.
              </p>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
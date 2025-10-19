import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils/url';

export default function Welcome() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const user = await base44.auth.me();
      
      if (user.user_role === 'customer') {
          navigate(createPageUrl('find-restaurants'));
      } else if (user.user_role === 'restaurant') {
          navigate(createPageUrl('restaurant-dashboard'));
      }
    } catch (error) {
      // User is not logged in or has no role, stay on this page
      console.log('User has no role, staying on welcome page.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelection = async (role: 'customer' | 'restaurant') => {
    try {
      await base44.auth.updateMe({ user_role: role });
      
      if (role === 'customer') {
        navigate(createPageUrl('onboarding'));
      } else {
        navigate(createPageUrl('restaurant-signup'));
      }
    } catch (error) {
      console.error('Error saving user role:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-[#E47948]/20 rounded-full" />
          <div className="h-4 w-32 bg-[#022D68]/20 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden bg-white">
      <div className="flex flex-col items-center justify-center flex-grow p-4">
        {/* Logo and Icon */}
        <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
          className="flex flex-col items-center mb-8"
        >
          <div className="mb-4">
            <svg width="154" height="81" viewBox="0 0 350 183.6" className="w-40 h-auto">
              <g transform="matrix(-1.022 0 0 1.022 227.94 -1.794)" fill="#000b7a">
                <path d="M51.8 25.55c-5.77 0-10.46 4.69-10.46 10.46 0 4.98 3.97 14.13 10.46 14.13 6.49 0 10.46-9.15 10.46-14.13C62.26 30.24 57.56 25.55 51.8 25.55zm0 19.08c-1.99 0-4.95-5.16-4.95-8.62 0-2.74 2.22-4.96 4.95-4.96s4.96 2.22 4.96 4.96c0 3.47-2.96 8.62-4.96 8.62z"></path>
                <path d="M82.88 50.35c2.08-4.47 3.16-9.32 3.16-14.34C86.04 17.12 70.68 1.76 51.8 1.76c-18.88 0-34.25 15.37-34.25 34.25 0 4.17.75 8.22 2.2 12.03.64 1.58 3.26 7.38 8.77 13.01.22.21.42.43.65.63l19.66 20.88c.03.04 3.08 3.03 5.93 0l3.65-3.88h10.84c.9.11 2.09.55 2.64 2.03.01.01.01.01.01.02l2.97 7.9h-8.12s.01.01.01.01l.22.57c.31 1.13.4 3.53-4.69 3.53H31.89c-4.29 0-3.76-2.43-3.55-3.06l3.07-8.18c.06-.11.11-.23.17-.39.68-1.76 1.36-2.29 1.84-2.43h2.09c3.04 0 .71-2.46.71-2.46h0l-1.08-1.15s0 0 0 0c-1.41-1.5-3.1-1.83-4.07-1.89h-.96c-.64.12-1.7.68-2.56 2.96l-6.28 16.74c0 .03-1.38 5.36 7.13 5.36h46.54c0 0 8.99-1.14 6.51-7.78l-4.46-11.9c0 0 0-.01 0-.01-1.33-3.55-5.04-3.47-5.04-3.47h-7.61l10.92-11.6L81.4 57.79c2.29-2.86 3.85-5.55 4.82-7.44zm-28.4-1.6c0 0 0 0 0 .01-2.35 2.5-4.42.94-5.12.27l-.24-.26s0 0 0-.01L33.09 57.8l-.19-.18c-1.34-1.17-2.58-2.48-3.68-3.88l-.27-.36c-3.86-5.06-5.89-11.07-5.89-17.38C23.06 10.15 36 -2.74 51.81-2.74c15.85 0 28.74 12.9 28.74 28.74 0 6.31-2.04 12.32-5.89 17.38L54.49 74.82z"></path>
              </g>
              <g transform="matrix(2.225 0 0 2.225 -5.072 94.083)" fill="#000b7a">
                <path d="M2.28 15.52h18.2v5.56h-12.2v3.92h9.8v5.56h-9.8v9.44h-6v-24.48zM20.93 20h6v20h-6V20zm3 1.88c2.04 0 3.48-1.44 3.48-3.48 0-2.08-1.44-3.44-3.48-3.44-2.08 0-3.44 1.36-3.44 3.44-.04 2.12 1.32 3.48 3.44 3.48zM28.42 12h6v28h-6V12zm19.09 8.68v5.56h-5.6v3.76c0 3.08 2.04 4.64 5 4.64.36 0 .68-.04.96-.08s.52-.08.8-.12v5.56c-.36.04-.64.12-.84.16-.24.04-.64.04-1.16.04-6.04 0-10.76-4.12-10.76-10.2v-14.8h6v5.48h5.6zM53.96 27.6c.6.2 1.28.36 2 .44.72.12 1.4.16 2.04.16.8 0 2.84-.16 2.84-1.32 0-1.24-1.76-1.28-2.64-1.28-1.76 0-3.28.4-4.24 2zm11.32 6.16v5.6c-2.24.52-4.48.88-6.8.88-6.36 0-11.08-3.72-11.08-10.16 0-6.36 4.56-10.28 10.6-10.28 4.12 0 8.88 1.96 8.88 6.64 0 4.64-5.04 6.36-8.92 6.36-1.48 0-2.96-.4-4.32-.96.8 2.24 3.2 2.6 5.28 2.6 1.08 0 2.16-.04 3.24-.2 1-.08 2.16-.2 3.12-.48zM73.45 30v10h-6v-9.96c0-6.64 4.88-10.24 11.04-10.24.2 0 .48 0 .76.04s.6.12.88.16v5.8c-.2-.04-.44-.08-.72-.12s-.52-.08-.72-.08c-1 0-1.8.12-2.48.32-1.12.4-2.12 1.16-2.48 2.36-.2.52-.28 1.12-.28 1.72zM80.61 15.52h18.2v5.56h-12.2v3.92h9.8v5.56h-9.8v9.44h-6v-24.48zm27.41 19.12c2.92 0 4.6-1.72 4.6-4.64s-1.68-4.64-4.6-4.64-4.6 1.72-4.6 4.64 1.68 4.64 4.6 4.64zm0 5.56c-6.16 0-10.6-4.08-10.6-10.2 0-6.32 4.6-10.2 10.6-10.2 6.2 0 10.6 4.08 10.6 10.2-.04 6.28-4.64 10.2-10.6 10.2zM128.51 34.68c2.92 0 4.6-1.72 4.6-4.64s-1.68-4.64-4.6-4.64-4.6 1.72-4.6 4.64 1.68 4.64 4.6 4.64zm0 5.56c-6.16 0-10.6-4.08-10.6-10.2 0-6.32 4.6-10.2 10.6-10.2 6.2 0 10.6 4.08 10.6 10.2-.04 6.28-4.64 10.2-10.6 10.2zM153.6 30c0-3-1.48-4.64-4.52-4.64-.84 0-1.56.12-2.16.36-1.12.52-1.88 1.28-2.24 2.48-.2.56-.28 1.16-.28 1.8s.08 1.24.28 1.8c.32 1.16 1.16 2 2.24 2.44.6.28 1.32.4 2.16.4 3.04 0 4.52-1.64 4.52-4.64zm0-8v-10h6v18c0 6.36-4.52 10.2-10.56 10.2-6.16 0-10.64-4-10.64-10.12 0-5.64 4.16-10.28 9.84-10.28 2.12 0 3.96.6 5.36 2.2z"></path>
              </g>
            </svg>
          </div>
          <h1 className="text-[#022D68] text-3xl font-bold tracking-tight">FilterFood</h1>
        </motion.div>

        {/* Welcome Text */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="w-full max-w-md text-center"
        >
          <h1 className="text-[#111418] tracking-light text-[32px] font-bold leading-tight pb-3 pt-6">
            Bem-vindo!
          </h1>
          <p className="text-[#111418] text-base font-normal leading-normal pb-3 pt-1">
            Escolha como deseja usar o FilterFood
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex flex-col gap-4 w-full max-w-md px-4 py-3 mt-8"
        >
          <Button
            onClick={() => handleRoleSelection('customer')}
            className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-12 px-5 bg-[#E47948] hover:bg-[#E47948]/90 text-white text-base font-bold leading-normal tracking-[0.015em] w-full transition-all hover:shadow-lg"
          >
            <span className="truncate">Quero encontrar restaurantes e pratos</span>
          </Button>

          <Button
            onClick={() => handleRoleSelection('restaurant')}
            className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-12 px-5 bg-transparent border-2 border-[#E47948] text-[#E47948] hover:bg-[#E47948]/10 text-base font-bold leading-normal tracking-[0.015em] w-full transition-all"
          >
            <span className="truncate">Sou restaurante</span>
          </Button>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="w-full py-6">
        <p className="text-[#5f728c] text-sm font-normal leading-normal text-center">
          © 2025 FilterFood - Todos os direitos reservados
        </p>
      </footer>
    </div>
  );
}
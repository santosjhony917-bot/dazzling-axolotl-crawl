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
            <img
              alt="FilterFood logo"
              className="w-40 h-auto"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDaPbXmzvKkbF2Pc_SLWOOR5kIgogIIMYMAkCwUoWS563947iWScJV79Q3cKk8gIMBuOGqZE9gcpBUNkNYytQ5Q3ARQT1kbsJfGWFRoqFSxAvBuKWkqm3K8uEV6RJY8dPeGlpFDNsD4CAPfS-uV-nqQiWsPY3u4TqjuIYxlkPjUDvFsn5mFz5TVbtCvE6YyyE_0cJqXduk10h9zn6AAv-Sgvp20z2iyDCrnk-1ExzxOaSt1WUI0EDvNLnI9kW-JylHQYF6UBMiVaCDf"
            />
          </div>
        </motion.div>

        {/* Welcome Text */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="w-full max-w-md text-center"
        >
          <h1 className="text-[#032d63] tracking-light text-[32px] font-bold leading-tight pb-3 pt-6">
            Bem-vindo!
          </h1>
          <p className="text-[#032d63] text-base font-normal leading-normal pb-3 pt-1">
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
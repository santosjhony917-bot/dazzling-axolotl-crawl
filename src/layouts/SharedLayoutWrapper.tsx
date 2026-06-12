import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ClientBottomNav from '@/components/ClientBottomNav';
import RestaurantBottomNav from '@/components/restaurant/RestaurantBottomNav'; // Importar RestaurantBottomNav
import { useAuthData } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const SharedLayoutWrapper: React.FC = () => {
  const location = useLocation();
  const { restaurant, isPremium } = useAuthData(); // Obter dados do restaurante e isPremium

  // Decidir qual barra inferior renderizar com base no perfil do usuário (Dono de Restaurante ou Cliente)
  const isRestaurantOwner = !!restaurant;
  
  // Rotas públicas de perfil de restaurante (ex: /restaurant/id)
  const isPublicRestaurantProfile = location.pathname.startsWith('/restaurant/') && !location.pathname.startsWith('/restaurant-area/');

  // Ocultar barra de navegação inferior na tela do assistente IA (Combo Finder) e na sala de Happy Hour (/happy-hour/:id)
  const isComboFinder = location.pathname === '/combo-finder';
  const isHappyHourRoom = location.pathname.startsWith('/happy-hour/');
  const hideBottomNav = isComboFinder || isHappyHourRoom;
  
  const isUpgradePage = location.pathname === '/restaurant-area/upgrade';

  return (
    <div className={cn(
      "min-h-screen flex flex-col transition-colors duration-200",
      isUpgradePage ? "bg-[#090D1A]" : "bg-[#f1f5f9]"
    )}>
      {/* Main content area */}
      <main
        className={cn(
          "flex-grow mx-auto w-full min-h-screen flex flex-col shadow-none transition-colors duration-200",
          isUpgradePage ? "bg-[#090D1A]" : "bg-background-light",
          !isPublicRestaurantProfile && "max-w-md border-x",
          !isPublicRestaurantProfile && (isUpgradePage ? "border-white/5" : "border-slate-200/60"),
          !hideBottomNav && "pb-24" // Não adiciona padding se hideBottomNav for verdadeiro (sem menu inferior)
        )}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="flex-grow flex flex-col w-full h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      
      {!hideBottomNav && (
        isRestaurantOwner ? (
          <RestaurantBottomNav isFree={!isPremium} />
        ) : (
          <ClientBottomNav />
        )
      )}
    </div>
  );
};

export default SharedLayoutWrapper;
import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import ClientBottomNav from '@/components/ClientBottomNav';
import RestaurantBottomNav from '@/components/restaurant/RestaurantBottomNav';
import { useAuthData } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const SharedLayoutWrapper: React.FC = () => {
  const location = useLocation();
  const { restaurant, isPremium } = useAuthData();
  const reduceMotion = useReducedMotion();

  // Decidir qual barra inferior renderizar com base no perfil do usuário (Dono de Restaurante ou Cliente)
  const isRestaurantOwner = !!restaurant;
  
  // Rotas públicas de perfil de restaurante (ex: /restaurant/id)
  // Ocultar barra de navegação inferior na sala de Happy Hour (/happy-hour/:id)
  const isHappyHourRoom = location.pathname.startsWith('/happy-hour/');
  const hideBottomNav = isHappyHourRoom;
  
  const isUpgradePage = location.pathname === '/restaurant-area/upgrade';

  return (
    <div className={cn(
      "min-h-screen w-full flex flex-col items-center justify-start transition-colors duration-200",
      isUpgradePage ? "bg-[#090D1A]" : "" // Deixa vazio para usar o background do body
    )}>
      {/* Main content area */}
      <main
        className={cn(
          "mobile-viewport-container flex-grow mx-auto w-full flex flex-col transition-colors duration-200 relative",
          isUpgradePage ? "bg-[#090D1A]" : "bg-background-light",
          !hideBottomNav && "pb-36"
        )}
      >
        <motion.div
          key={location.pathname}
          initial={reduceMotion ? false : { opacity: 0.9, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.15, ease: 'easeOut' }}
          className="flex-grow flex flex-col w-full h-full"
        >
          <Outlet />
        </motion.div>

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

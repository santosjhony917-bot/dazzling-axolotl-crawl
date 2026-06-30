import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ClientBottomNav from '@/components/ClientBottomNav';
import RestaurantBottomNav from '@/components/restaurant/RestaurantBottomNav';
import AiChatBalloon from '@/components/AiChatBalloon';
import { useAuthData } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const SharedLayoutWrapper: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { restaurant, isPremium } = useAuthData();

  const [isAiOpen, setIsAiOpen] = useState(false);

  // Redirecionamento automático do /combo-finder para a /home abrindo o balão de IA
  useEffect(() => {
    if (location.pathname === '/combo-finder') {
      setIsAiOpen(true);
      navigate('/home', { replace: true });
    }
  }, [location.pathname, navigate]);

  // Decidir qual barra inferior renderizar com base no perfil do usuário (Dono de Restaurante ou Cliente)
  const isRestaurantOwner = !!restaurant;
  
  // Rotas públicas de perfil de restaurante (ex: /restaurant/id)
  const isPublicRestaurantProfile = location.pathname.startsWith('/restaurant/') && !location.pathname.startsWith('/restaurant-area/');

  // Ocultar barra de navegação inferior na sala de Happy Hour (/happy-hour/:id)
  const isComboFinder = location.pathname === '/combo-finder';
  const isHappyHourRoom = location.pathname.startsWith('/happy-hour/');
  const hideBottomNav = isComboFinder || isHappyHourRoom;
  
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
          initial={{ opacity: 0.9, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="flex-grow flex flex-col w-full h-full"
        >
          <Outlet />
        </motion.div>

        {/* Balão do Assistente Gourmet IA */}
        {(!isRestaurantOwner || isPremium) && (
          <AiChatBalloon isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
        )}
      </main>
      
      {!hideBottomNav && (
        isRestaurantOwner ? (
          <RestaurantBottomNav isFree={!isPremium} isAiOpen={isAiOpen} onToggleAi={() => setIsAiOpen(prev => !prev)} />
        ) : (
          <ClientBottomNav isAiOpen={isAiOpen} onToggleAi={() => setIsAiOpen(prev => !prev)} />
        )
      )}
    </div>
  );
};

export default SharedLayoutWrapper;

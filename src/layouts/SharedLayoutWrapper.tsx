import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Main content area */}
      <main
        className={cn(
          "flex-grow mx-auto w-full",
          !isPublicRestaurantProfile && "max-w-md", // Aplicar max-w-md a todas as rotas do wrapper, exceto perfis públicos
          !hideBottomNav && "pb-20" // Não adiciona padding se hideBottomNav for verdadeiro (sem menu inferior)
        )}
      >
        <Outlet />
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
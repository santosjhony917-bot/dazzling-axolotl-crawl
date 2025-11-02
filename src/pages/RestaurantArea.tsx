import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthData } from '@/context/AuthContext';
import { createPageUrl } from '@/utils/url';
import RestaurantBottomNav from '@/components/restaurant/RestaurantBottomNav';
import { Loader2 } from 'lucide-react';

export default function RestaurantArea() {
  const { user, isLoading, restaurant, isRestaurantLoading } = useAuthData();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isLoading || isRestaurantLoading) {
      return; // Ainda carregando dados de autenticação ou restaurante
    }

    if (!user) {
      // Não autenticado, redireciona para o login do restaurante
      navigate(createPageUrl('restaurant-login'), { state: { from: location }, replace: true });
    } else if (user.user_role !== 'restaurant') {
      // Usuário autenticado, mas não é um restaurante, redireciona para o hub
      navigate(createPageUrl('restaurant-area-hub'), { replace: true });
    } else if (!restaurant) {
      // Autenticado como restaurante, mas sem restaurante associado (deve ir para o hub ou create)
      navigate(createPageUrl('restaurant-area-hub'), { replace: true });
    } else {
      // Autenticado e com restaurante, garante que está na área correta
      if (location.pathname === createPageUrl('restaurant-area-hub') || location.pathname === createPageUrl('restaurant-signup') || location.pathname === createPageUrl('restaurant-login')) {
        navigate(createPageUrl('restaurant-area-home'), { replace: true });
      }
    }
  }, [user, isLoading, restaurant, isRestaurantLoading, navigate, location]);

  if (isLoading || isRestaurantLoading || !user || user.user_role !== 'restaurant' || !restaurant) {
    // Renderiza um loader enquanto decide para onde navegar
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col">
      <div className="flex-1 pb-16"> {/* Adiciona padding-bottom para a nav bar */}
        <Outlet />
      </div>
      <RestaurantBottomNav />
    </div>
  );
}
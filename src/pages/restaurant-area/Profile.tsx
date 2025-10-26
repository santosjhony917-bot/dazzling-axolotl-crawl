import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/context/AuthContext';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils/url';
import ProfileManagementLayout from '@/components/restaurant/ProfileManagementLayout';
import RestaurantBottomNav from '@/components/restaurant/RestaurantBottomNav';
import { useUserRole } from '@/hooks/useUserRole';

export default function RestaurantProfilePage() {
  const navigate = useNavigate();
  const { isLoading: authLoading, restaurant } = useAuthContext();
  const { isPremium } = useUserRole();

  // Scroll to top on mount/navigation
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#f5f7f8]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // O ProtectedRoute já garante que 'restaurant' existe, mas mantemos o fallback
  if (!restaurant) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Acesso Negado</h2>
        <p className="text-gray-600 mb-6">Você precisa ter um restaurante registrado para acessar esta página.</p>
        <Button onClick={() => navigate(createPageUrl('index'))}>
          Voltar para o Início
        </Button>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      <ProfileManagementLayout />
      
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md z-30">
        <RestaurantBottomNav selectedTab="perfil" isFree={!isPremium} />
      </div>
    </div>
  );
}
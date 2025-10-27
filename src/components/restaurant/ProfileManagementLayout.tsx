import React, { ReactNode } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeft, Utensils, Settings, Image, Crown, LogOut, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils/url';
import { useRestaurantContext } from '@/context/RestaurantContext';
import { useAuthContext } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import RestaurantBottomNav from './RestaurantBottomNav';
import ActionCard from './dashboard/ActionCard';
import SubscriptionCard from './profile/SubscriptionCard';
import ContentManagementSection from './profile/ContentManagementSection';
import SubscriptionSupportSection from './profile/SubscriptionSupportSection';

interface ProfileManagementLayoutProps {
  children?: ReactNode;
}

/**
 * Layout principal para a área de gerenciamento de perfil do restaurante.
 * Esta é a página que o usuário vê ao clicar em 'Perfil' na navegação inferior.
 */
export default function ProfileManagementLayout({ children }: ProfileManagementLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { restaurant, isLoading: isRestaurantLoading } = useRestaurantContext();
  const { refetchProfile } = useAuthContext();

  const isPremium = restaurant?.plan === 'premium';

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      refetchProfile();
      navigate(createPageUrl('welcome'));
    } catch (error) {
      console.error('Logout error:', error);
      showError('Falha ao sair. Tente novamente.');
    }
  };

  if (isRestaurantLoading) {
    return <div className="p-4 text-center text-gray-500">Carregando perfil...</div>;
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-white max-w-md mx-auto">
        <Utensils className="w-12 h-12 text-red-500 mb-4" />
        <h1 className="text-xl font-bold text-red-600 mb-2">Restaurante Não Encontrado</h1>
        <p className="text-gray-600 mb-6">Você precisa ter um restaurante registrado para acessar esta página.</p>
        <Button onClick={() => navigate(createPageUrl('index'))}>
          Voltar para o Início
        </Button>
      </div>
    );
  }

  // Se houver children, renderiza o conteúdo da sub-rota (ex: Settings, Menu)
  if (children) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20 max-w-md mx-auto">
        {children}
        <RestaurantBottomNav isPremium={isPremium} />
      </div>
    );
  }

  // Se não houver children, renderiza o menu principal de gerenciamento
  return (
    <div className="min-h-screen bg-gray-50 pb-20 max-w-md mx-auto">
      
      {/* Header */}
      <header className="flex items-center bg-white p-4 justify-start sticky top-0 z-20 shadow-soft-md w-full">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl('restaurant-area/dashboard'))}
          className="text-[#022D68] hover:bg-[#022D68]/5"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h2 className="text-[#022D68] text-xl font-bold ml-4 truncate">Gerenciamento do Perfil</h2>
      </header>

      <div className="p-4 space-y-6">
        
        {/* Seção de Assinatura */}
        <SubscriptionCard isPremium={isPremium} />

        {/* Seção de Gerenciamento de Conteúdo */}
        <ContentManagementSection navigate={navigate} isPremium={isPremium} />

        {/* Seção de Configurações e Suporte */}
        <SubscriptionSupportSection navigate={navigate} isPremium={isPremium} />

        {/* Ações de Perfil */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-primary pt-2">Conta</h3>
          
          <ActionCard
            icon={Settings}
            title="Configurações da Conta"
            description="Gerencie seu e-mail, senha e dados pessoais."
            onClick={() => navigate(createPageUrl('restaurant-area/settings'))}
          />

          <ActionCard
            icon={LogOut}
            title="Sair da Conta"
            description="Desconectar-se do painel do restaurante."
            onClick={handleLogout}
            className="text-red-600 hover:bg-red-50"
          />
        </div>
      </div>
      
      {/* Bottom Navigation */}
      <RestaurantBottomNav isPremium={isPremium} />
    </div>
  );
}
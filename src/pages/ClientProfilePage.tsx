import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LogOut, Utensils, Heart, Settings, User, Loader2, HelpCircle, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/context/AuthContext';
import { createPageUrl } from '@/utils/url';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import ClientPageWrapper from '@/components/ClientPageWrapper';
import { showError } from '@/utils/toast';
import NavCardItem from '@/components/NavCardItem';
import UserProfileHeader from '@/components/UserProfileHeader';

// Hook para buscar o restaurante do usuário logado (mantido, mas o uso foi simplificado)
const useUserRestaurant = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['userRestaurant', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
        throw error;
      }
      
      return data;
    },
    enabled: !!userId,
  });
};

export default function ClientProfilePage() {
  const { user, profile, signOut, isLoading: isAuthLoading, restaurant: authRestaurant } = useAuthContext();
  const navigate = useNavigate();
  
  const restaurant = authRestaurant;

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const userDisplayName = profile?.first_name || user?.email?.split('@')[0] || 'Usuário';
  const userEmail = user?.email || 'Não logado';

  return (
    <ClientPageWrapper selectedTab="profile">
      
      {/* Novo Header no estilo banner */}
      <UserProfileHeader 
        displayName={userDisplayName}
        email={userEmail}
        onBack={() => navigate(createPageUrl('home'))}
      />

      <main className="p-4 space-y-6 -mt-6 relative z-10">
        
        {/* Seção de Gerenciamento do Restaurante */}
        {restaurant && (
          <Card className="shadow-lg border-none rounded-xl bg-white p-4 space-y-3">
            <h2 className="text-lg font-bold text-primary mb-2">Gerenciamento do Restaurante</h2>
            
            <NavCardItem 
              icon={Utensils}
              title={restaurant.name}
              description="Acesse o painel de controle do seu restaurante."
              onClick={() => handleNavigate(createPageUrl('restaurant-area/home'))}
            />
            
            <NavCardItem 
              icon={Settings}
              title="Configurações do Restaurante"
              description="Edite informações, horário de funcionamento e links."
              onClick={() => handleNavigate(createPageUrl('restaurant-area/profile-menu'))}
            />
          </Card>
        )}

        {/* Seção de Navegação Geral */}
        <Card className="shadow-lg border-none rounded-xl bg-white p-4 space-y-3">
          <h2 className="text-lg font-bold text-primary mb-2">Geral</h2>
          
          <NavCardItem 
            icon={Heart}
            title="Meus Favoritos"
            description="Veja os restaurantes e pratos que você favoritou."
            onClick={() => handleNavigate(createPageUrl('favorites'))}
          />
          
          <NavCardItem 
            icon={Settings}
            title="Configurações da Conta"
            description="Atualize seu nome e preferências."
            onClick={() => showError("Edição de perfil em desenvolvimento.")}
          />
          
          <NavCardItem 
            icon={HelpCircle}
            title="Central de Ajuda"
            description="Encontre tutoriais e suporte."
            onClick={() => handleNavigate(createPageUrl('helpCenter'))}
          />
          
          <NavCardItem 
            icon={FileText}
            title="Termos e Privacidade"
            description="Leia nossos termos de uso e política de dados."
            onClick={() => handleNavigate(createPageUrl('legal'))}
          />
        </Card>

        {/* Botão de Logout */}
        <div className="pt-4 pb-8">
          <Button 
            onClick={handleSignOut} 
            className="w-full bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 h-12 rounded-xl shadow-soft-md"
          >
            <LogOut className="w-5 h-5" />
            Sair da Conta
          </Button>
        </div>
      </main>
    </ClientPageWrapper>
  );
}
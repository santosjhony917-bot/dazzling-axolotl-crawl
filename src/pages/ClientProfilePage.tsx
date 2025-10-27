import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LogOut, Utensils, MapPin, Heart, Settings, ArrowLeft, User, Loader2, HelpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/context/AuthContext';
import { createPageUrl } from '@/utils/url';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppHeader from '@/components/Header';
import ClientPageWrapper from '@/components/ClientPageWrapper';
import { showError } from '@/utils/toast';
import NavCardItem from '@/components/NavCardItem'; // Importando NavCardItem

// Hook para buscar o restaurante do usuário logado
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
  const isRestaurantLoading = false; 

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
      <AppHeader 
        title="Meu Perfil" 
        leftAction={{ icon: ArrowLeft, onClick: () => navigate(createPageUrl('home')) }}
      />

      <main className="p-4 space-y-6">
        {/* User Info Card (Visualmente mais rico) */}
        <Card className="shadow-lg border-none rounded-xl bg-white">
          <CardContent className="p-6 flex items-center space-x-4">
            <div className="size-14 rounded-full bg-highlight/10 flex items-center justify-center shrink-0">
              <User className="w-7 h-7 text-highlight" />
            </div>
            <div>
              <p className="font-extrabold text-xl text-primary leading-tight">{userDisplayName}</p>
              <p className="text-sm text-gray-500 mt-0.5">{userEmail}</p>
            </div>
          </CardContent>
        </Card>

        {/* Restaurant Management Section (Only visible if user owns a restaurant) */}
        {restaurant && (
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-primary px-1 mb-4">Gerenciamento do Restaurante</h2>
            
            <NavCardItem 
              icon={Utensils}
              title={restaurant.name}
              description="Acesse o painel de controle do seu restaurante."
              onClick={() => handleNavigate(createPageUrl('restaurant-area/home'))}
            />
            
            <NavCardItem 
              icon={Settings}
              title="Configurações"
              description="Edite informações, horário de funcionamento e links."
              onClick={() => handleNavigate(createPageUrl('restaurant-area/profile-menu'))}
            />
          </div>
        )}

        {/* General Navigation Section */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-primary px-1 mb-4">Geral</h2>
          
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
        </div>

        {/* Logout Button */}
        <div className="pt-4">
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
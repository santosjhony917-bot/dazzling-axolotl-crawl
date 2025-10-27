import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LogOut, Utensils, MapPin, Heart, Settings, ArrowLeft, User, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/context/AuthContext';
import { createPageUrl } from '@/utils/url';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppHeader from '@/components/Header';
import ClientPageWrapper from '@/components/ClientPageWrapper';
import { showError } from '@/utils/toast';

interface NavCardItemProps {
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
}

const NavCardItem: React.FC<NavCardItemProps> = ({ icon: Icon, title, description, onClick }) => (
  <Card 
    className="flex items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors shadow-sm border-l-4 border-highlight"
    onClick={onClick}
  >
    <div className="p-3 bg-highlight/10 rounded-full mr-4">
      <Icon className="w-6 h-6 text-highlight" />
    </div>
    <div className="flex-1">
      <p className="font-semibold text-primary">{title}</p>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
    <ArrowLeft className="w-4 h-4 text-gray-400 transform rotate-180" />
  </Card>
);

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
  const { user, signOut, isLoading: isAuthLoading } = useAuthContext();
  const navigate = useNavigate();
  
  const { data: restaurant, isLoading: isRestaurantLoading, error: restaurantError } = useUserRestaurant(user?.id);

  const isLoading = isAuthLoading || isRestaurantLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (restaurantError) {
    showError("Erro ao carregar dados do restaurante.");
  }

  const handleSignOut = async () => {
    await signOut();
    navigate(createPageUrl('home'));
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const userDisplayName = user?.email || 'Usuário';

  return (
    <ClientPageWrapper selectedTab="profile">
      <AppHeader 
        title="Meu Perfil" 
        leftAction={{ icon: ArrowLeft, onClick: () => navigate(createPageUrl('home')) }}
      />

      <main className="p-4 space-y-6">
        {/* User Info Card */}
        <Card className="shadow-lg border-none rounded-xl bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xl font-bold text-primary flex items-center gap-2">
              <User className="w-5 h-5 text-highlight" /> {userDisplayName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Gerencie suas informações e configurações.</p>
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
            description="Veja os restaurantes que você favoritou."
            onClick={() => handleNavigate(createPageUrl('favorites'))}
          />
          
          <NavCardItem 
            icon={User}
            title="Editar Perfil"
            description="Atualize seu nome e avatar."
            onClick={() => handleNavigate(createPageUrl('editProfile'))}
          />
        </div>

        {/* Logout Button */}
        <div className="pt-4">
          <Button 
            onClick={handleSignOut} 
            className="w-full bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </Button>
        </div>
      </main>
    </ClientPageWrapper>
  );
}
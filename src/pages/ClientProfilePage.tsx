import React from 'react';
import ClientPageWrapper from '@/components/ClientPageWrapper';
import { useAuthContext } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User as UserIcon, Settings, Heart, MapPin, Loader2 } from 'lucide-react';
import NavCardItem from '@/components/NavCardItem';
import { createPageUrl } from '@/utils/url';
import { useNavigate } from 'react-router-dom';

const ClientProfilePage: React.FC = () => {
  const { user, profile, signOut, restaurant, isLoading: authLoading } = useAuthContext();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
  };
  
  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#f5f7f8]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Se o usuário for proprietário de restaurante, redireciona para a área do restaurante
  if (restaurant) {
    navigate(createPageUrl('restaurant-area/profile-menu'), { replace: true });
    return null;
  }

  return (
    <ClientPageWrapper selectedTab="profile">
      <div className="p-4 space-y-6">
        
        {/* Card de Informações Básicas */}
        <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
          <div className="flex items-center space-x-4">
            <div className="size-12 rounded-full bg-gray-200 flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-gray-500" />
            </div>
            <div>
              <p className="font-semibold text-lg">{profile?.first_name || 'Usuário'}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>
          
          <Button 
            onClick={handleSignOut} 
            variant="destructive" 
            className="w-full mt-4"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
        
        {/* Seções de Navegação */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-[#022D68] px-1 mb-4">Configurações</h2>
          
          <NavCardItem 
            icon={Heart}
            title="Meus Favoritos"
            description="Restaurantes e pratos que você amou."
            onClick={() => navigate(createPageUrl('favorites'))}
          />
          
          <NavCardItem 
            icon={MapPin}
            title="Endereços Salvos"
            description="Gerencie seus locais de busca."
            onClick={() => alert("Gerenciar endereços")}
          />
          
          <NavCardItem 
            icon={Settings}
            title="Configurações da Conta"
            description="Mude nome, senha e preferências."
            onClick={() => alert("Configurações da conta")}
          />
        </div>
        
        {/* Área do Restaurante */}
        {!restaurant && (
          <div className="space-y-3 pt-4">
            <h2 className="text-xl font-bold text-[#022D68] px-1 mb-4">Seu Negócio</h2>
            <NavCardItem 
              icon={MapPin}
              title="Área do Restaurante"
              description="Gerencie seu perfil, cardápio e vendas."
              onClick={() => navigate(createPageUrl('restaurant-area-hub'))}
            />
          </div>
        )}
        
      </div>
    </ClientPageWrapper>
  );
};

export default ClientProfilePage;
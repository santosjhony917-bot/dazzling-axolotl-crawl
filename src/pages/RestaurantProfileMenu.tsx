import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Utensils, User, Eye, LogOut, Settings, BarChart3, MapPin, CreditCard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import { useUserRole } from '@/hooks/useUserRole';
import { showSuccess } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { Separator } from '@/components/ui/separator';

// Componente de Item de Menu Reutilizável
interface MenuItemProps {
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
  isPremiumOnly?: boolean;
  isPremium?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon: Icon, title, description, onClick, isPremiumOnly = false, isPremium = false }) => {
  const isDisabled = isPremiumOnly && !isPremium;
  
  return (
    <Card 
      className={`w-full transition-all ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}`}
      onClick={isDisabled ? () => {} : onClick}
    >
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-lg ${isDisabled ? 'bg-gray-200' : 'bg-primary/10'}`}>
            <Icon className={`w-6 h-6 ${isDisabled ? 'text-gray-500' : 'text-primary'}`} />
          </div>
          <div>
            <p className={`font-semibold text-base ${isDisabled ? 'text-gray-500' : 'text-primary'}`}>{title}</p>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
        {isPremiumOnly && !isPremium && (
          <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">Premium</span>
        )}
      </CardContent>
    </Card>
  );
};

const RestaurantProfileMenu = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { restaurant } = useRestaurantProfile(user?.id || null);
  const { isPremium } = useUserRole();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    showSuccess("Você foi desconectado.");
    navigate(createPageUrl('login'));
  };

  const handleGoBack = () => {
    navigate(createPageUrl('restaurant-area/dashboard'));
  };
  
  const handleViewPublicProfile = () => {
    if (restaurant?.id) {
      // Navega para a rota pública do restaurante
      navigate(createPageUrl(`restaurant-profile/${restaurant.id}`));
    } else {
      alert("Aguarde o carregamento do perfil do restaurante.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-8 max-w-md mx-auto">
      
      {/* Header */}
      <header className="flex items-center bg-white p-4 justify-between sticky top-0 z-10 shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleGoBack}
          className="text-primary hover:bg-primary/5"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold text-primary">Menu do Restaurante</h1>
        <div className="w-10"></div> {/* Placeholder */}
      </header>

      <main className="p-4 space-y-6">
        
        {/* Seção Perfil */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-700">Perfil</h2>
          
          <MenuItem
            icon={Utensils}
            title="Dados do Restaurante"
            description="Edite nome, endereço e informações de contato."
            onClick={() => navigate(createPageUrl('restaurant-area/profile-edit'))}
          />
          
          <MenuItem
            icon={Eye}
            title="Ver meu perfil público"
            description="Veja como seu restaurante aparece para os clientes."
            onClick={handleViewPublicProfile} // Usando a função de navegação correta
          />
        </section>
        
        <Separator />

        {/* Seção Gerenciamento */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-700">Gerenciamento</h2>
          
          <MenuItem
            icon={BarChart3}
            title="Análise de Mercado"
            description="Compare-se com concorrentes próximos."
            onClick={() => navigate(createPageUrl('restaurant-area/stats'))}
            isPremiumOnly={true}
            isPremium={isPremium}
          />
          
          <MenuItem
            icon={MapPin}
            title="Localização de Busca"
            description="Defina o ponto de referência para análise."
            onClick={() => alert("Abrir modal de localização")} // Implementar modal se necessário
            isPremiumOnly={true}
            isPremium={isPremium}
          />
          
          <MenuItem
            icon={CreditCard}
            title="Assinatura Premium"
            description="Gerencie seu plano e pagamentos."
            onClick={() => navigate(createPageUrl('restaurant-area/subscription'))}
          />
        </section>
        
        <Separator />

        {/* Seção Conta */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-gray-700">Conta</h2>
          
          <MenuItem
            icon={Settings}
            title="Configurações da Conta"
            description="Mude senha e e-mail."
            onClick={() => navigate(createPageUrl('settings'))}
          />
          
          <MenuItem
            icon={LogOut}
            title="Sair"
            description="Desconectar desta conta."
            onClick={handleLogout}
          />
        </section>
        
      </main>
    </div>
  );
};

export default RestaurantProfileMenu;
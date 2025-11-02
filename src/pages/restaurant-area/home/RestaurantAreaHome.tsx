import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Utensils, Image, Share2, Clock, CreditCard, TrendingUp, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils/url';
import NavCardItem from '@/components/NavCardItem';
import { useAuthData } from '@/context/AuthContext';
import { base44 } from '@/integrations/base44Client'; // Importando o cliente base44
import { showError } from '@/utils/toast';
import { useRestaurantData } from '@/hooks/useRestaurantData';
import { Skeleton } from '@/components/ui/skeleton';

export default function RestaurantAreaHome() {
  const navigate = useNavigate();
  const { signOut } = useAuthData(); // Usando o signOut do AuthContext
  const { restaurant, isLoading: isRestaurantLoading, error: restaurantError } = useRestaurantData();

  const handleLogout = async () => {
    try {
      // Não é necessário chamar base44.auth.signOut() aqui, pois o signOut do AuthContext já faz isso.
      signOut();
      navigate(createPageUrl('welcome'));
    } catch (error) {
      console.error("Error during logout:", error);
      showError("Erro ao fazer logout. Tente novamente.");
    }
  };

  const isPremium = restaurant?.plan === 'premium';

  const navItems = [
    {
      icon: LayoutDashboard,
      title: "Informações do Restaurante",
      description: "Gerencie os dados básicos do seu estabelecimento.",
      path: createPageUrl('restaurant-area-info'),
      isLocked: false,
    },
    {
      icon: Utensils,
      title: "Cardápio",
      description: "Organize suas categorias e itens do menu.",
      path: createPageUrl('restaurant-area-menu'),
      isLocked: false,
    },
    {
      icon: Image,
      title: "Galeria de Fotos",
      description: "Adicione e gerencie as fotos do seu restaurante.",
      path: createPageUrl('restaurant-area-gallery'),
      isLocked: !isPremium,
    },
    {
      icon: Share2,
      title: "Redes Sociais",
      description: "Conecte suas redes sociais e outras plataformas.",
      path: createPageUrl('restaurant-area-social-media'),
      isLocked: !isPremium,
    },
    {
      icon: Clock,
      title: "Horário de Funcionamento",
      description: "Defina os horários de abertura e fechamento.",
      path: createPageUrl('restaurant-area-opening-hours'),
      isLocked: false,
    },
    {
      icon: CreditCard,
      title: "Métodos de Pagamento",
      description: "Configure as formas de pagamento aceitas.",
      path: createPageUrl('restaurant-area-payment-methods'),
      isLocked: false,
    },
    {
      icon: TrendingUp,
      title: "Métricas e Promoções",
      description: "Acompanhe o desempenho e crie promoções.",
      path: createPageUrl('restaurant-area-metrics'),
      isLocked: !isPremium,
    },
    {
      icon: Settings,
      title: "Configurações",
      description: "Ajustes gerais da sua conta e restaurante.",
      path: createPageUrl('restaurant-area-settings'),
      isLocked: false,
    },
  ];

  if (isRestaurantLoading) {
    return (
      <div className="p-4 space-y-4 md:max-w-md md:mx-auto">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (restaurantError) {
    return (
      <div className="p-4 text-center text-red-600 md:max-w-md md:mx-auto">
        <p>Erro ao carregar dados do restaurante: {restaurantError.message}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">Tentar Novamente</Button>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="p-4 text-center text-gray-600 md:max-w-md md:mx-auto">
        <p>Nenhum restaurante encontrado. Por favor, crie um restaurante primeiro.</p>
        <Button onClick={() => navigate(createPageUrl('restaurant-area-create'))} className="mt-4">Criar Restaurante</Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 md:max-w-md md:mx-auto">
      <h1 className="text-2xl font-bold text-primary mb-6">Área do Restaurante</h1>

      <div className="grid grid-cols-1 gap-4">
        {navItems.map((item, index) => (
          <NavCardItem
            key={index}
            icon={item.icon}
            title={item.title}
            description={item.description}
            onClick={() => !item.isLocked && navigate(item.path)}
            isLocked={item.isLocked}
          />
        ))}
      </div>

      <Button
        onClick={handleLogout}
        variant="outline"
        className="w-full mt-6 flex items-center justify-center gap-2 text-red-600 border-red-600 hover:bg-red-50"
      >
        <LogOut className="w-5 h-5" />
        Sair
      </Button>
    </div>
  );
}
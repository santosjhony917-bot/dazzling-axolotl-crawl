import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Utensils, MapPin, Clock, CreditCard, MessageCircle, Globe, ArrowLeft, Settings, LayoutDashboard, Users, DollarSign, Star, TrendingUp, Zap, Shield, Package, Menu, List, Image, Link, QrCode } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { useRestaurant } from '@/hooks/useRestaurant';
import { Skeleton } from '@/components/ui/skeleton';

// 1. Header Section
const HeaderSection: React.FC<{ navigate: ReturnType<typeof useNavigate> }> = ({ navigate }) => {
  const { restaurant, isLoading } = useRestaurant();

  if (isLoading) {
    return (
      <div className="p-4 flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 flex items-center justify-between bg-white border-b">
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
          {restaurant?.image_url ? (
            <img src={restaurant.image_url} alt={restaurant.name} className="w-full h-full object-cover" />
          ) : (
            <Utensils className="w-6 h-6 text-gray-500" />
          )}
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#022D68] truncate">{restaurant?.name || 'Meu Restaurante'}</h2>
          <p className="text-sm text-gray-500">{restaurant?.plan === 'premium' ? 'Plano Premium' : 'Plano Free'}</p>
        </div>
      </div>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => navigate(createPageUrl('restaurant-area/settings'))}
        className="text-[#022D68] hover:bg-[#022D68]/5"
      >
        <Settings className="w-6 h-6" />
      </Button>
    </div>
  );
};

// 2. Cardápio Section
const MenuSection: React.FC<{ navigate: ReturnType<typeof useNavigate> }> = ({ navigate }) => (
  <div className="p-4 space-y-3">
    <Button 
      onClick={() => navigate(createPageUrl('restaurant-area/menu'))}
      className="w-full flex items-center justify-center gap-2 min-w-[84px] cursor-pointer overflow-hidden rounded-full h-12 px-4 bg-highlight hover:bg-highlight/90 text-white text-base font-bold leading-normal tracking-[0.015em]"
    >
      <Utensils className="w-5 h-5 mr-2" />
      Atualizar Cardápio
    </Button>
    
  </div>
);

// 3. Links Section
interface LinkItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

const LinkItem: React.FC<LinkItemProps> = ({ icon, title, description, onClick }) => (
  <div 
    className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors rounded-lg"
    onClick={onClick}
  >
    <div className="flex items-center space-x-4">
      <div className="p-2 bg-gray-100 rounded-full text-[#022D68]">
        {icon}
      </div>
      <div>
        <p className="font-semibold text-sm text-[#022D68]">{title}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </div>
    <ArrowLeft className="w-4 h-4 text-gray-400 transform rotate-180" />
  </div>
);

const LinksSection: React.FC<{ navigate: ReturnType<typeof useNavigate> }> = ({ navigate }) => (
  <Card className="shadow-md border-none rounded-xl">
    <CardContent className="p-0 divide-y divide-gray-100">
      <LinkItem
        icon={<MapPin className="w-5 h-5" />}
        title="Localização e Contato"
        description="Endereço, telefone, WhatsApp e redes sociais."
        onClick={() => navigate(createPageUrl('restaurant-area/location'))}
      />
      <LinkItem
        icon={<Clock className="w-5 h-5" />}
        title="Horários de Funcionamento"
        description="Defina os horários de abertura e fechamento."
        onClick={() => navigate(createPageUrl('restaurant-area/hours'))}
      />
      <LinkItem
        icon={<CreditCard className="w-5 h-5" />}
        title="Formas de Pagamento"
        description="Gerencie as opções de pagamento aceitas."
        onClick={() => navigate(createPageUrl('restaurant-area/payment'))}
      />
      <LinkItem
        icon={<Image className="w-5 h-5" />}
        title="Galeria de Fotos"
        description="Adicione fotos do seu restaurante e pratos (Premium)."
        onClick={() => navigate(createPageUrl('restaurant-area/gallery'))}
      />
      <LinkItem
        icon={<Link className="w-5 h-5" />}
        title="Links de Pedido"
        description="iFood, Site Próprio e outros links (Premium)."
        onClick={() => navigate(createPageUrl('restaurant-area/order-links'))}
      />
      <LinkItem
        icon={<QrCode className="w-5 h-5" />}
        title="QR Code do Cardápio"
        description="Gere e personalize seu QR Code."
        onClick={() => navigate(createPageUrl('restaurant-area/qrcode'))}
      />
    </CardContent>
  </Card>
);

// 4. Analytics Section
const AnalyticsSection: React.FC<{ navigate: ReturnType<typeof useNavigate> }> = ({ navigate }) => (
  <Card className="shadow-md border-none rounded-xl">
    <CardContent className="p-0 divide-y divide-gray-100">
      <LinkItem
        icon={<TrendingUp className="w-5 h-5" />}
        title="Estatísticas e Desempenho"
        description="Acompanhe visualizações e interações (Premium)."
        onClick={() => navigate(createPageUrl('restaurant-area/analytics'))}
      />
      <LinkItem
        icon={<Star className="w-5 h-5" />}
        title="Avaliações e Feedback"
        description="Gerencie o feedback dos seus clientes (Premium)."
        onClick={() => navigate(createPageUrl('restaurant-area/reviews'))}
      />
    </CardContent>
  </Card>
);

// 5. Subscription Section
const SubscriptionSection: React.FC<{ navigate: ReturnType<typeof useNavigate> }> = ({ navigate }) => (
  <Card className="shadow-md border-none rounded-xl">
    <CardContent className="p-0 divide-y divide-gray-100">
      <LinkItem
        icon={<DollarSign className="w-5 h-5" />}
        title="Meu Plano"
        description="Gerencie sua assinatura e faça upgrade."
        onClick={() => navigate(createPageUrl('restaurant-area/subscription'))}
      />
    </CardContent>
  </Card>
);

// Main Component
export default function RestaurantProfileMenu() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-8 max-w-md mx-auto">
      <header className="sticky top-0 z-20 bg-white shadow-sm p-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="text-[#022D68] hover:bg-[#022D68]/5"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-bold text-[#022D68] flex-1 text-center pr-10 truncate">
          Área do Restaurante
        </h1>
        <div className="w-10"></div>
      </header>

      <HeaderSection navigate={navigate} />

      <main className="p-4 space-y-6">
        
        <h2 className="text-xl font-bold text-[#022D68] mt-4">Cardápio</h2>
        <MenuSection navigate={navigate} />

        <h2 className="text-xl font-bold text-[#022D68] mt-4">Informações Públicas</h2>
        <LinksSection navigate={navigate} />

        <h2 className="text-xl font-bold text-[#022D68] mt-4">Desempenho</h2>
        <AnalyticsSection navigate={navigate} />

        <h2 className="text-xl font-bold text-[#022D68] mt-4">Conta</h2>
        <SubscriptionSection navigate={navigate} />
        
      </main>
    </div>
  );
}
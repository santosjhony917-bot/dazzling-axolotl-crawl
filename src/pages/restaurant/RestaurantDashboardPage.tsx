"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import { useAuthData } from '@/context/AuthContext';
import { Loader2, Utensils, Settings, Menu, Image, MapPin, Star, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';
import { Separator } from '@/components/ui/separator';

const ActionCard: React.FC<{ title: string; icon: React.ReactNode; description: string; to: string; isPremium?: boolean }> = ({
  title,
  icon,
  description,
  to,
  isPremium = false,
}) => (
  <Card className={isPremium ? "border-yellow-500/50" : ""}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-lg font-medium flex items-center gap-2">
        {icon} {title}
      </CardTitle>
      {isPremium && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
    </CardHeader>
    <CardContent>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{description}</p>
      <Button asChild className="w-full">
        <Link to={to}>Gerenciar</Link>
      </Button>
    </CardContent>
  </Card>
);

const RestaurantDashboardPage: React.FC = () => {
  const { restaurant, isLoading: profileLoading } = useRestaurantProfile();
  const { isPremium, isLoading: authLoading } = useAuthData();

  const isLoading = profileLoading || authLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return <div className="p-4 text-red-500">Nenhum restaurante associado ao usuário.</div>;
  }

  return (
    <RestaurantAreaPageLayout 
      title={`Painel de Gerenciamento`} 
      icon={Utensils} 
      backPath="/" // Volta para a home pública
    >
      <div className="p-4 space-y-8"> {/* Removido min-h-screen, pb-20, max-w-md, mx-auto */}
        
        {/* Seção de Status e Visão Geral */}
        <Card className="bg-primary/5 dark:bg-gray-800">
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-2 text-primary dark:text-primary-light">Seu Perfil: {restaurant.name}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Plano Atual: <span className={`font-bold ${isPremium ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>{isPremium ? 'Premium' : 'Free'}</span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Seu perfil está {restaurant.address && restaurant.image_url ? 'completo e pronto para receber clientes.' : 'incompleto. Complete as informações básicas!'}
            </p>
            <div className="mt-4">
              <Button variant="outline" asChild>
                <Link to={`/restaurant/${restaurant.id}`}>
                  <Eye className="w-4 h-4 mr-2" /> Ver Perfil Público
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Seção de Ações Rápidas */}
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <ActionCard
            title="Cardápio"
            icon={<Menu className="w-5 h-5 text-blue-500" />}
            description="Adicione, edite e organize as categorias e itens do seu menu."
            to="menu"
          />

          <ActionCard
            title="Configurações"
            icon={<Settings className="w-5 h-5 text-gray-500" />}
            description="Atualize nome, descrição, contato, endereço e horários de funcionamento."
            to="profile-settings"
          />
          
          <ActionCard
            title="Galeria de Fotos"
            icon={<Image className="w-5 h-5 text-purple-500" />}
            description="Adicione fotos do seu ambiente e pratos para atrair mais clientes."
            to="gallery"
            isPremium={!isPremium} // Galeria é Premium
          />
          
          <ActionCard
            title="Localização"
            icon={<MapPin className="w-5 h-5 text-red-500" />}
            description="Confirme seu endereço e coordenadas para aparecer na busca por proximidade."
            to="profile-settings"
          />
        </div>
      </div>
    </RestaurantAreaPageLayout>
  );
};

export default RestaurantDashboardPage;
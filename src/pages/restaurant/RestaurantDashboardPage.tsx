"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Utensils, Image as ImageIcon, Settings, BarChart, Crown, PlusCircle } from 'lucide-react';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import { useAuthData } from '@/context/AuthContext'; // Importando useAuthData
import PremiumBanner from '@/components/restaurant/dashboard/PremiumBanner';
import { Loader2 } from 'lucide-react';

const RestaurantDashboardPage: React.FC = () => {
  const { restaurant, isLoading: profileLoading } = useRestaurantProfile();
  const { isPremium, isProfileLoading: authLoading } = useAuthData(); // Corrigido: usando 'isProfileLoading' e 'isPremium'

  if (profileLoading || authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold text-[#022D68] mb-4">Dashboard do Restaurante</h1>
        <p className="text-gray-600">Nenhum restaurante encontrado. Por favor, registre ou reivindique um restaurante.</p>
        <Button asChild className="mt-4 bg-[#E47948] hover:bg-[#C2653B]">
          <Link to="/claim-restaurant">Registrar/Reivindicar Restaurante</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold text-[#022D68] mb-6">Dashboard de {restaurant.name}</h1>

      <PremiumBanner />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card de Gerenciamento de Menu */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gerenciar Menu</CardTitle>
            <Utensils className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Cardápio Completo</div>
            <p className="text-xs text-gray-500">Adicione, edite e organize seus pratos.</p>
            <Button asChild className="w-full mt-4 bg-[#022D68] hover:bg-[#011F4A]">
              <Link to="/restaurant/menu">Ir para o Menu</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Card de Gerenciamento de Galeria */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gerenciar Galeria</CardTitle>
            <ImageIcon className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Fotos do Restaurante</div>
            <p className="text-xs text-gray-500">Mostre o melhor do seu ambiente e pratos.</p>
            <Button asChild className="w-full mt-4 bg-[#022D68] hover:bg-[#011F4A]">
              <Link to="/restaurant/gallery">Ir para a Galeria</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Card de Configurações do Perfil */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Configurações do Perfil</CardTitle>
            <Settings className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Detalhes do Restaurante</div>
            <p className="text-xs text-gray-500">Atualize informações, endereço e contatos.</p>
            <Button asChild className="w-full mt-4 bg-[#022D68] hover:bg-[#011F4A]">
              <Link to="/restaurant/settings">Ir para Configurações</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Card de Métricas (Premium) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Métricas e Insights</CardTitle>
            <BarChart className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isPremium ? 'Acessar Métricas' : 'Recurso Premium'}</div>
            <p className="text-xs text-gray-500">
              {isPremium ? 'Veja o desempenho do seu restaurante.' : 'Desbloqueie com o plano Premium.'}
            </p>
            <Button asChild className="w-full mt-4 bg-[#E47948] hover:bg-[#C2653B]">
              <Link to="/restaurant/metrics">
                {isPremium ? 'Ver Métricas' : 'Fazer Upgrade'}
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Card de Upgrade de Plano */}
        {!isPremium && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upgrade de Plano</CardTitle>
              <Crown className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Desbloqueie Mais!</div>
              <p className="text-xs text-gray-500">Acesse recursos exclusivos com um plano Premium.</p>
              <Button asChild className="w-full mt-4 bg-[#E47948] hover:bg-[#C2653B]">
                <Link to="/restaurant/upgrade">Ver Planos</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Card para Adicionar Novo Item (Acesso Rápido) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Adicionar Item Rápido</CardTitle>
            <PlusCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Novo Prato/Bebida</div>
            <p className="text-xs text-gray-500">Adicione um novo item diretamente ao seu menu.</p>
            <Button asChild className="w-full mt-4 bg-[#022D68] hover:bg-[#011F4A]">
              <Link to="/restaurant/menu">Adicionar Item</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RestaurantDashboardPage;
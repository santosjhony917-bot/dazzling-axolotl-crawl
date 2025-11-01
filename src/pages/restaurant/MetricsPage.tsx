"use client";

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthData } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, BarChart, TrendingUp, Users, DollarSign, Star } from 'lucide-react';
import { Loader2 } from 'lucide-react';

const MetricsPage: React.FC = () => {
  const { isPremium, isProfileLoading } = useAuthData(); // Corrigido: usando 'isProfileLoading' e 'isPremium'
  const navigate = useNavigate();

  if (isProfileLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="container mx-auto p-8 text-center">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-[#022D68]">Recurso Premium</CardTitle>
            <CardDescription className="text-lg text-gray-600">
              As métricas detalhadas são um recurso exclusivo para assinantes Premium.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-gray-700">
              Com o plano Premium, você terá acesso a insights valiosos sobre o desempenho do seu restaurante,
              incluindo visualizações de perfil, interações com o menu, favoritos e muito mais.
            </p>
            <Button
              className="w-full bg-[#E47948] hover:bg-[#C2653B] text-white text-lg py-3"
              onClick={() => navigate('/restaurant/upgrade')}
            >
              Fazer Upgrade para Premium
            </Button>
            <p className="text-sm text-gray-500">
              Desbloqueie o potencial máximo do seu negócio!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold text-[#022D68] mb-6">Métricas do Restaurante</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card de Visitas ao Perfil */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visitas ao Perfil</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-gray-500">+20.1% do mês passado</p>
            <div className="h-24 bg-gray-100 mt-4 rounded-md flex items-center justify-center">
              <LineChart className="h-16 w-16 text-gray-300" />
            </div>
          </CardContent>
        </Card>

        {/* Card de Interações com o Menu */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interações com o Menu</CardTitle>
            <BarChart className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">876</div>
            <p className="text-xs text-gray-500">+15.5% do mês passado</p>
            <div className="h-24 bg-gray-100 mt-4 rounded-md flex items-center justify-center">
              <BarChart className="h-16 w-16 text-gray-300" />
            </div>
          </CardContent>
        </Card>

        {/* Card de Favoritos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Novos Favoritos</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">54</div>
            <p className="text-xs text-gray-500">+10.0% do mês passado</p>
            <div className="h-24 bg-gray-100 mt-4 rounded-md flex items-center justify-center">
              <Star className="h-16 w-16 text-gray-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Itens Mais Populares */}
      <Card>
        <CardHeader>
          <CardTitle>Itens Mais Populares</CardTitle>
          <CardDescription>Os itens do seu menu que mais geram interesse.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <li className="flex justify-between items-center border-b pb-2">
              <span>Pizza Calabresa</span>
              <span className="font-semibold">150 interações</span>
            </li>
            <li className="flex justify-between items-center border-b pb-2">
              <span>Hambúrguer Clássico</span>
              <span className="font-semibold">120 interações</span>
            </li>
            <li className="flex justify-between items-center border-b pb-2">
              <span>Salada Caesar</span>
              <span className="font-semibold">90 interações</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Seção de Desempenho de Vendas (Exemplo) */}
      <Card>
        <CardHeader>
          <CardTitle>Desempenho de Vendas</CardTitle>
          <CardDescription>Visão geral das suas vendas (se integrado).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 bg-gray-100 rounded-md">
            <DollarSign className="h-16 w-16 text-gray-300" />
            <p className="ml-4 text-gray-500">Integração de vendas em breve!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MetricsPage;
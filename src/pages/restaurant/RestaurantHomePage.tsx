"use client";

import React from 'react';
import { useAuthData } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const RestaurantHomePage: React.FC = () => {
  const { restaurant, isProfileLoading } = useAuthData(); // Corrigido: usando 'isProfileLoading'

  if (isProfileLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold text-[#022D68] mb-4">Página Inicial do Restaurante</h1>
        <p className="text-gray-600">Nenhum restaurante encontrado. Por favor, registre ou reivindique um restaurante.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-[#022D68] mb-6">Bem-vindo, {restaurant.name}!</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Visão Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Aqui você verá um resumo rápido do seu restaurante.</p>
            {/* Adicione mais conteúdo aqui */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notificações</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Nenhuma notificação nova.</p>
            {/* Adicione mais conteúdo aqui */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Links para as ações mais comuns.</p>
            {/* Adicione mais conteúdo aqui */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RestaurantHomePage;
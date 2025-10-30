"use client";

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Utensils, Settings, Image, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const menuItems = [
  {
    title: 'Gerenciar Cardápio',
    description: 'Adicione, edite e organize categorias e itens do seu menu.',
    icon: Utensils,
    path: '/restaurant-area/menu',
  },
  {
    title: 'Galeria de Imagens',
    description: 'Gerencie as fotos da sua galeria para atrair mais clientes.',
    icon: Image,
    path: '/restaurant-area/gallery',
  },
  {
    title: 'Métricas e Desempenho',
    description: 'Acompanhe o desempenho do seu restaurante e metas de seguidores.',
    icon: BarChart3,
    path: '/restaurant-area/metrics',
  },
];

const ProfileMenuPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-800">Área do Restaurante</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {menuItems.map((item) => (
            <Card
              key={item.title}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(item.path)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold">{item.title}</CardTitle>
                <item.icon className="h-6 w-6 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfileMenuPage;
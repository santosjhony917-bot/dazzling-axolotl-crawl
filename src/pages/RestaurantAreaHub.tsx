import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createPageUrl } from '@/utils/url';
import { Utensils, PlusCircle, LogIn } from 'lucide-react';

export default function RestaurantAreaHub() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 md:max-w-md md:mx-auto">
      <div className="text-center mb-8">
        <Utensils className="w-24 h-24 text-highlight mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-primary mb-2">Área do Restaurante</h1>
        <p className="text-text-secondary">Gerencie seu estabelecimento e alcance mais clientes.</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <Card className="shadow-lg">
          <CardContent className="p-6 flex flex-col items-center text-center">
            <PlusCircle className="w-12 h-12 text-blue-500 mb-4" />
            <h2 className="text-xl font-semibold text-primary mb-2">Cadastrar Novo Restaurante</h2>
            <p className="text-text-secondary mb-4">
              Ainda não tem seu restaurante no FilterFood? Cadastre-o agora e comece a atrair clientes.
            </p>
            <Button
              onClick={() => navigate(createPageUrl('restaurant-signup'))}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Cadastrar Restaurante
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardContent className="p-6 flex flex-col items-center text-center">
            <LogIn className="w-12 h-12 text-green-500 mb-4" />
            <h2 className="text-xl font-semibold text-primary mb-2">Acessar Meu Restaurante</h2>
            <p className="text-text-secondary mb-4">
              Já possui um restaurante cadastrado? Faça login para gerenciar suas informações.
            </p>
            <Button
              onClick={() => navigate(createPageUrl('restaurant-login'))}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              Acessar Painel
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
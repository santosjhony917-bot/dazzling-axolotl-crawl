import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PATH_MAP, createPageUrl } from '@/utils/url';

const RestaurantAreaHub = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">Área do Restaurante</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-gray-600">
            Bem-vindo à área do restaurante. Escolha uma opção abaixo para continuar.
          </p>
          <Link to={createPageUrl('restaurant-login')}>
            <Button className="w-full" size="lg">Fazer Login</Button>
          </Link>
          <Link to={createPageUrl('restaurant-signup')}>
            <Button className="w-full" variant="outline" size="lg">Cadastrar Restaurante</Button>
          </Link>
          <Link to={createPageUrl('claim-restaurant')}>
            <Button className="w-full" variant="ghost" size="lg">Reivindicar Restaurante Existente</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default RestaurantAreaHub;
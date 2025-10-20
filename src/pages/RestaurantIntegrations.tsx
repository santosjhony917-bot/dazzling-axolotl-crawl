import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

const RestaurantIntegrations = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto flex flex-col items-center justify-center text-center">
      <div className="absolute top-4 left-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/restaurant-area/profile-menu">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
      </div>
      <Package className="h-24 w-24 text-gray-400 mb-6" />
      <h1 className="text-2xl font-bold text-gray-800 mb-3">Canais de Pedido (Integrações)</h1>
      <p className="text-gray-600 mb-6">
        Gerencie suas integrações com plataformas de pedido como WhatsApp, iFood e outras.
      </p>
      <Button asChild>
        <Link to="/restaurant-area/profile-menu">Voltar ao Perfil</Link>
      </Button>
    </div>
  );
};

export default RestaurantIntegrations;
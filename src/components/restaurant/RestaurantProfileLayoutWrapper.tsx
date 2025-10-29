import React from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { Loader2, AlertTriangle } from 'lucide-react';
import ProfileManagementLayout from './ProfileManagementLayout';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { Button } from '@/components/ui/button';

interface RestaurantProfileLayoutWrapperProps {
  children: React.ReactNode;
}

const RestaurantProfileLayoutWrapper: React.FC<RestaurantProfileLayoutWrapperProps> = ({ children }) => {
  const { restaurant, isLoading } = useAuthContext();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Restaurante Não Encontrado</h2>
        <p className="text-gray-600 mb-6">Seu usuário não está associado a um restaurante. Por favor, cadastre ou reivindique um restaurante.</p>
        <Button onClick={() => navigate(createPageUrl('restaurant-area-hub'))}>
          Voltar para o Hub
        </Button>
      </div>
    );
  }

  return (
    <ProfileManagementLayout restaurantId={restaurant.id}>
      {children}
    </ProfileManagementLayout>
  );
};

export default RestaurantProfileLayoutWrapper;
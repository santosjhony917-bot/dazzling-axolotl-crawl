import React from 'react';
import { useParams } from 'react-router-dom';
import { Utensils } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const RestaurantProfile: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();

  return (
    <div className="min-h-screen bg-background-light p-4 max-w-md mx-auto text-center flex items-center justify-center">
      <Card className="shadow-soft-xl border-none rounded-2xl bg-white p-8 w-full">
        <Utensils className="w-12 h-12 text-highlight mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-[#022D68] mb-2">Perfil do Restaurante</h1>
        <p className="text-gray-600">Visualizando o perfil do restaurante ID: {restaurantId}</p>
      </Card>
    </div>
  );
};

export default RestaurantProfile;
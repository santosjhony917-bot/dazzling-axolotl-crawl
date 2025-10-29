import React from 'react';
import RestaurantProfileLayoutWrapper from '@/components/restaurant/RestaurantProfileLayoutWrapper';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuthContext } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

// Mock component for the actual profile settings content
const ProfileSettingsContent: React.FC = () => {
  const { restaurant } = useAuthContext(); // Accessing restaurant data here

  if (!restaurant) {
    return <div className="p-4 text-gray-500">Carregando dados do restaurante...</div>;
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">Aqui você pode editar o nome, descrição e categoria do seu restaurante.</p>
          <div className="h-20 bg-gray-50 mt-4 rounded flex items-center justify-center text-gray-400">
            Formulário de Edição de Perfil para {restaurant.name}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Horários de Funcionamento</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">Defina os horários em que seu restaurante está aberto.</p>
          <div className="h-20 bg-gray-50 mt-4 rounded flex items-center justify-center text-gray-400">
            Configuração de Horários
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const RestaurantProfileSettingsPage: React.FC = () => {
  // The wrapper handles loading and fetching the restaurant ID
  return (
    <RestaurantProfileLayoutWrapper>
      <ProfileSettingsContent />
    </RestaurantProfileLayoutWrapper>
  );
}

export default RestaurantProfileSettingsPage;
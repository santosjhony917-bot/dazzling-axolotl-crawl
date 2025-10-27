import React from 'react';
import ProfileManagementLayout from '@/components/restaurant/ProfileManagementLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

// Mock component for the actual profile settings content
const ProfileSettingsContent: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">Aqui você pode editar o nome, descrição e categoria do seu restaurante.</p>
          {/* Placeholder for form/settings */}
          <div className="h-20 bg-gray-50 mt-4 rounded flex items-center justify-center text-gray-400">
            Formulário de Edição de Perfil
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Horários de Funcionamento</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">Defina os horários em que seu restaurante está aberto.</p>
          {/* Placeholder for form/settings */}
          <div className="h-20 bg-gray-50 mt-4 rounded flex items-center justify-center text-gray-400">
            Configuração de Horários
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const ProfilePage: React.FC = () => {
  // TODO: Fetch the actual restaurant ID for the authenticated user
  const mockRestaurantId = "mock-restaurant-id-123"; 

  // O ProfileManagementLayout agora usa o AuthContext para obter os dados do restaurante
  return (
    <ProfileManagementLayout restaurantId={mockRestaurantId}>
      <ProfileSettingsContent />
    </ProfileManagementLayout>
  );
}

export default ProfilePage;
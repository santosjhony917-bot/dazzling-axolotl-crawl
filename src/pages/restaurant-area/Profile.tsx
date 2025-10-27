import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/context/AuthContext';
import ProfileManagementLayout from '@/components/restaurant/ProfileManagementLayout';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Componente de Conteúdo do Perfil (Placeholder)
const ProfileContent: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações do Perfil</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Aqui você pode gerenciar suas informações pessoais como usuário.</p>
        <Button className="mt-4">Editar Perfil</Button>
      </CardContent>
    </Card>
  );
};

const RestaurantAreaProfilePage: React.FC = () => {
  const { isLoading: authLoading, restaurant } = useAuthContext();
  const navigate = useNavigate();

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    // Se não houver restaurante, redireciona ou mostra erro
    return <p className="p-8 text-red-500">Você precisa cadastrar um restaurante para acessar esta área.</p>;
  }

  // O ProfileManagementLayout agora usa o AuthContext para obter os dados do restaurante
  return (
    <ProfileManagementLayout restaurant={restaurant}>
      <ProfileContent />
    </ProfileManagementLayout>
  );
}

export default RestaurantAreaProfilePage;
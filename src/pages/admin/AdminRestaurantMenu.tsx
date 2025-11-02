import React from 'react';
import { useParams } from 'react-router-dom';
import AdminAreaHeader from '@/components/admin/AdminAreaHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AdminRestaurantMenu: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();

  return (
    <div className="space-y-6">
      <AdminAreaHeader
        title={`Gerenciar Cardápio do Restaurante: ${restaurantId}`}
        description="Aqui você poderá gerenciar as categorias e itens do cardápio deste restaurante."
      />
      <Card>
        <CardHeader>
          <CardTitle>Cardápio</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Funcionalidade de gerenciamento de cardápio para o restaurante {restaurantId} em desenvolvimento.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRestaurantMenu;
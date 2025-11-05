import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const MenuManagement: React.FC = () => {
  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Gerenciamento de Cardápio</h1>
      <Card>
        <CardHeader>
          <CardTitle>Seu Cardápio</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Aqui você pode adicionar, editar e organizar as categorias e itens do seu menu.</p>
          <div className="mt-4 p-6 bg-gray-50 rounded text-gray-500">
            Conteúdo de gerenciamento de menu em desenvolvimento.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MenuManagement;
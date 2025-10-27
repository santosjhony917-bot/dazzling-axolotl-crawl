import React from 'react';
import { useParams } from 'react-router-dom';
import { Pizza } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const MenuItemDetails: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>();

  return (
    <div className="min-h-screen bg-background-light p-4 max-w-md mx-auto text-center flex items-center justify-center">
      <Card className="shadow-soft-xl border-none rounded-2xl bg-white p-8 w-full">
        <Pizza className="w-12 h-12 text-highlight mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-[#022D68] mb-2">Detalhes do Item</h1>
        <p className="text-gray-600">Visualizando detalhes do item de menu ID: {itemId}</p>
      </Card>
    </div>
  );
};

export default MenuItemDetails;
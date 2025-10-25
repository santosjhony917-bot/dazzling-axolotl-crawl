import React from 'react';
import RestaurantAreaHeader from '@/components/restaurant/RestaurantAreaHeader';
import { Package, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function RestaurantCategoriesManagement() {
  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      <RestaurantAreaHeader title="Gerenciar Categorias" icon={Package} backPath="restaurant-area/menu" />
      
      <main className="p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-primary">Lista de Categorias</CardTitle>
            <CardDescription>Crie, edite e ordene as categorias do seu cardápio.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full bg-highlight hover:bg-highlight/90"
              onClick={() => alert("Abrir modal de nova categoria")}
            >
              <PlusCircle className="w-4 h-4 mr-2" /> Criar Nova Categoria
            </Button>
            <p className="text-gray-600">Lista de categorias ativas e inativas será exibida aqui.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
import React from 'react';
import RestaurantAreaHeader from '@/components/restaurant/RestaurantAreaHeader';
import { Utensils, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';

export default function RestaurantMenuManagement() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      <RestaurantAreaHeader title="Gerenciar Cardápio" icon={Utensils} backPath="restaurant-area/profile-menu" />
      
      <main className="p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-primary">Itens e Categorias</CardTitle>
            <CardDescription>Adicione e organize os pratos do seu cardápio.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full bg-highlight hover:bg-highlight/90"
              onClick={() => navigate(createPageUrl('restaurant-area/categories'))}
            >
              <PlusCircle className="w-4 h-4 mr-2" /> Gerenciar Categorias
            </Button>
            <Button 
              variant="outline" 
              className="w-full border-primary text-primary hover:bg-primary/5"
              onClick={() => alert("Abrir modal de adição de item")}
            >
              <Utensils className="w-4 h-4 mr-2" /> Adicionar Novo Item
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-primary">Visualização do Cardápio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">A lista completa de categorias e itens será exibida aqui.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
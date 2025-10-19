import React from 'react';
import { Package, Plus, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

export default function RestaurantCategories() {
  const navigate = useNavigate();

  // Mock data for categories
  const categories = [
    { id: 1, name: "Lanches", items: 5 },
    { id: 2, name: "Bebidas", items: 10 },
    { id: 3, name: "Acompanhamentos", items: 3 },
  ];

  return (
    <div className="p-4 space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-foreground">Gerenciar Categorias</h2>
        <Button 
          size="sm" 
          className="bg-[#E47948] hover:bg-[#E47948]/90 text-white"
          onClick={() => alert("Abrir modal de nova categoria")}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      <Card className="shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-[#022D68]" />
            Categorias Cadastradas ({categories.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {categories.map(category => (
            <div key={category.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div>
                <p className="font-medium text-foreground">{category.name}</p>
                <p className="text-sm text-muted-foreground">{category.items} itens</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => alert(`Editar ${category.name}`)}
              >
                <ChevronLeft className="h-4 w-4 rotate-180" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="pt-4 text-center">
        <Button 
          variant="outline" 
          onClick={() => navigate('/restaurant-area/profile-menu')}
        >
          Voltar ao Perfil
        </Button>
      </div>
    </div>
  );
}
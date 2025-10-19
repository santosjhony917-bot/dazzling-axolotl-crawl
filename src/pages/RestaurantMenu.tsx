import React from 'react';
import { UtensilsCrossed, Plus, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

export default function RestaurantMenu() {
  const navigate = useNavigate();

  // Mock data for menu items
  const menuItems = [
    { id: 1, name: "Cachorro Quente Clássico", price: 15.00, category: "Lanches", active: true },
    { id: 2, name: "Batata Frita Grande", price: 12.00, category: "Acompanhamentos", active: true },
    { id: 3, name: "Refrigerante Lata", price: 6.00, category: "Bebidas", active: false },
  ];

  return (
    <div className="p-4 space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-foreground">Cardápio</h2>
        <Button 
          size="sm" 
          className="bg-[#E47948] hover:bg-[#E47948]/90 text-white"
          onClick={() => alert("Abrir modal de novo item")}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Item
        </Button>
      </div>

      <Card className="shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-[#022D68]" />
            Itens Cadastrados ({menuItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {menuItems.map(item => (
            <div key={item.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <div>
                <p className="font-medium text-foreground">{item.name}</p>
                <p className="text-sm text-muted-foreground">R$ {item.price.toFixed(2)} - {item.category}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${item.active ? 'text-green-600' : 'text-red-600'}`}>
                  {item.active ? 'Ativo' : 'Inativo'}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => alert(`Editar ${item.name}`)}
                >
                  <ChevronLeft className="h-4 w-4 rotate-180" />
                </Button>
              </div>
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
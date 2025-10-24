import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Utensils, Star, Clock, MapPin, Plus, TrendingUp, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

// Tipagem simplificada para o prato
interface Dish {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string; // Adicionando campo de imagem
}

// Dados mockados com imagens
const mockDishes: Dish[] = [
  {
    id: 1,
    name: "Feijoada Completa",
    description: "A tradicional feijoada brasileira com carnes nobres e acompanhamentos.",
    price: 45.90,
    imageUrl: "https://images.unsplash.com/photo-1589302168068-964664d93fd4?q=80&w=1920&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: 2,
    name: "Salmão Grelhado",
    description: "Filé de salmão grelhado com molho de maracujá e purê de batatas.",
    price: 65.00,
    imageUrl: "https://images.unsplash.com/photo-1519708227418-d6dc969a9974?q=80&w=1920&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: 3,
    name: "Picanha na Chapa",
    description: "Picanha suculenta servida na chapa com arroz biro-biro.",
    price: 78.50,
    imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1920&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
];

// Componente de Card de Prato (DishCard)
const DishCard: React.FC<{ dish: Dish }> = ({ dish }) => (
  <Card className="overflow-hidden transition-shadow hover:shadow-lg">
    <div className="relative h-32">
      <img 
        src={dish.imageUrl} 
        alt={dish.name} 
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/20 flex items-end p-3">
        <span className="text-white text-lg font-bold bg-highlight px-2 py-1 rounded-md">
          R$ {dish.price.toFixed(2).replace('.', ',')}
        </span>
      </div>
    </div>
    <CardContent className="p-3">
      <h3 className="text-lg font-semibold text-primary truncate">{dish.name}</h3>
      <p className="text-sm text-gray-500 line-clamp-2 mt-1">{dish.description}</p>
    </CardContent>
  </Card>
);


export default function RestaurantDashboard() {
  const navigate = useNavigate();

  // Dados mockados do restaurante
  const mockRestaurant = {
    name: "Sabor Nordestino",
    address: "Rua das Flores, 123 - Centro",
    rating: 4.7,
    openTime: "11:00",
    closeTime: "23:00",
    plan: "premium",
  };

  return (
    <div className="max-w-md mx-auto bg-[#f5f7f8] min-h-screen">
      <Header 
        title="Dashboard do Restaurante" 
        leftAction={{ icon: ArrowLeft, onClick: () => navigate(-1) }} 
      />

      <div className="p-4 space-y-6">
        {/* Informações Principais */}
        <Card className="shadow-lg border-t-4 border-highlight">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-2xl text-primary">
              {mockRestaurant.name}
              <Utensils className="w-6 h-6 text-highlight" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-gray-600">
            <div className="flex items-center text-sm">
              <MapPin className="w-4 h-4 mr-2 text-highlight" />
              <span>{mockRestaurant.address}</span>
            </div>
            <div className="flex items-center text-sm">
              <Star className="w-4 h-4 mr-2 text-yellow-500 fill-yellow-500" />
              <span>Avaliação: {mockRestaurant.rating} (500+)</span>
            </div>
            <div className="flex items-center text-sm">
              <Clock className="w-4 h-4 mr-2 text-green-600" />
              <span>Horário: {mockRestaurant.openTime} - {mockRestaurant.closeTime}</span>
            </div>
            <div className="flex items-center text-sm">
              <DollarSign className="w-4 h-4 mr-2 text-indigo-600" />
              <span className="capitalize">Plano Atual: {mockRestaurant.plan}</span>
            </div>
          </CardContent>
        </Card>

        {/* Ações Rápidas */}
        <div className="grid grid-cols-2 gap-4">
          <Button className="h-12 bg-primary hover:bg-primary/90 text-white shadow-md">
            <Plus className="w-5 h-5 mr-2" />
            Novo Prato
          </Button>
          <Button variant="outline" className="h-12 border-primary text-primary hover:bg-primary/5">
            <TrendingUp className="w-5 h-5 mr-2" />
            Ver Estatísticas
          </Button>
        </div>

        <Separator />

        {/* Destaques do Dia */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-primary">Destaques do Dia</h2>
            <Button 
              variant="link" 
              className="text-highlight p-0 h-auto"
              onClick={() => console.log('Gerenciar Destaques')}
            >
              Gerenciar
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mockDishes.map(dish => (
              <DishCard key={dish.id} dish={dish} />
            ))}
          </div>
        </div>

        <Separator />

        {/* Outras Seções (Exemplo) */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg text-primary">Gerenciamento de Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Visualize e gerencie pedidos em tempo real.</p>
            <Button className="mt-3 bg-highlight hover:bg-highlight/90">
              Ir para Pedidos
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
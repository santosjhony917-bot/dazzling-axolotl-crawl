import React from 'react';
import { Link } from 'react-router-dom';
import { Search, DollarSign, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import BottomNavigation from '@/components/layout/BottomNavigation'; // Importando o componente de navegação inferior

const Home: React.FC = () => {
  // Mock data for demonstration
  const dailyHighlights = [
    { id: '1', name: 'Restaurante Teste Premium', cuisine: 'Culinária Internacional', price: 'R$ 25,00', imageUrl: 'https://images.unsplash.com/photo-1504674590-ba0953925254?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
    { id: '2', name: 'Bodega do danilo', cuisine: 'Churrasco', price: 'R$ 25,00', imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=1981&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
    // Add more mock data as needed
  ];

  const nearbyRestaurants = [
    { id: '1', name: 'Restaurante Teste Premium', cuisine: 'Culinária Internacional', distance: '4.1 km', plan: 'Premium', imageUrl: 'https://images.unsplash.com/photo-1504674590-ba0953925254?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
    { id: '2', name: 'Bodega do danilo', cuisine: 'Churrasco', distance: '3.9 km', plan: 'Básico', imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=1981&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
    // Add more mock data as needed
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="p-4 bg-white shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center text-gray-700">
            <MapPin className="h-5 w-5 mr-2" />
            <span className="font-medium">Localização de Busca</span>
          </div>
          <Link to="/restaurant-area/home" className="text-sm text-blue-600">
            /restaurant-area/home
          </Link>
        </div>
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            placeholder="Buscar por prato ou restaurante..."
            className="flex-grow"
          />
          <Button size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="flex-grow p-4 space-y-6 max-w-md mx-auto w-full">
        
        {/* Ações Rápidas (Filtros) */}
        <div className="flex gap-4 pt-2">
          <Card className="flex-1 p-4 flex flex-col items-center justify-center text-center">
            <DollarSign className="h-6 w-6 text-orange-500 mb-2" />
            <span className="text-sm font-medium">Buscar Prato por Preço</span>
          </Card>
          <Card className="flex-1 p-4 flex flex-col items-center justify-center text-center">
            <MapPin className="h-6 w-6 text-orange-500 mb-2" />
            <span className="text-sm font-medium">Buscar Restaurantes Próximos</span>
          </Card>
        </div>

        {/* Destaques do Dia */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Destaques do Dia</h2>
            <Link to="#" className="text-sm text-blue-600">Ver todos</Link>
          </div>
          <Carousel className="w-full">
            <CarouselContent>
              {dailyHighlights.map((item) => (
                <CarouselItem key={item.id} className="md:basis-1/2 lg:basis-1/3">
                  <Card className="overflow-hidden">
                    <img src={item.imageUrl} alt={item.name} className="w-full h-32 object-cover" />
                    <div className="p-3">
                      <h3 className="font-semibold text-sm">{item.name}</h3>
                      <p className="text-xs text-gray-500">{item.cuisine}</p>
                      <p className="text-sm font-bold text-orange-600 mt-1">{item.price}</p>
                    </div>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </section>

        {/* Restaurantes Próximos */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Restaurantes Próximos</h2>
            <Link to="#" className="text-sm text-blue-600">Ver todos</Link>
          </div>
          <div className="space-y-3">
            {nearbyRestaurants.map((restaurant) => (
              <Card key={restaurant.id} className="flex items-center p-3">
                <Avatar className="h-12 w-12 mr-3">
                  <AvatarImage src={restaurant.imageUrl} alt={restaurant.name} />
                  <AvatarFallback>{restaurant.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-grow">
                  <h3 className="font-semibold">{restaurant.name}</h3>
                  <p className="text-sm text-gray-500">{restaurant.cuisine}</p>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <MapPin className="h-3 w-3 mr-1" />
                    <span>{restaurant.distance}</span>
                    <Badge variant="secondary" className="ml-2 px-2 py-0.5 text-xs font-medium">
                      {restaurant.plan}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Home;
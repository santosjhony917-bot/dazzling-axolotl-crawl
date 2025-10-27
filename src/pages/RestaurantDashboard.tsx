import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Utensils, MapPin, Crown, Camera, Settings, Package, Loader2, Star } from 'lucide-react';
import { useRestaurantContext } from '@/context/RestaurantContext';
import { cn } from '@/lib/utils';
import RestaurantBottomNav from '@/components/restaurant/RestaurantBottomNav';
import { Button } from '@/components/ui/button';

const DashboardCard: React.FC<{ title: string, icon: React.ElementType, path: string, description: string, isPremium?: boolean }> = ({ title, icon: Icon, path, description, isPremium = false }) => {
  const { restaurant } = useRestaurantContext();
  const isRestaurantPremium = restaurant?.plan === 'premium';
  const isLocked = isPremium && !isRestaurantPremium;

  return (
    <Link to={path} className={cn(
      "block",
      isLocked ? "pointer-events-none opacity-60" : "hover:shadow-lg transition-shadow"
    )}>
      <Card className="h-full shadow-soft-md dark:bg-gray-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</CardTitle>
          {isPremium && !isRestaurantPremium && <Crown className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
          <Icon className="w-5 h-5 text-primary dark:text-highlight" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
};

const RestaurantDashboard: React.FC = () => {
  const { restaurant, isLoading } = useRestaurantContext();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="text-center p-8">
        <h1 className="text-xl font-bold text-red-500">Erro: Restaurante não carregado.</h1>
      </div>
    );
  }

  const isPremium = restaurant.plan === 'premium';
  const restaurantId = restaurant.id;

  const dashboardItems = useMemo(() => [
    { title: 'Cardápio', icon: Utensils, path: `/restaurant-area/${restaurantId}/menu`, description: 'Gerencie categorias e itens do menu.' },
    { title: 'Galeria', icon: Camera, path: `/restaurant-area/${restaurantId}/gallery`, description: 'Adicione fotos do seu local e pratos.', isPremium: true },
    { title: 'Localização', icon: MapPin, path: `/restaurant-area/${restaurantId}/location`, description: 'Defina o endereço e coordenadas GPS.' },
    { title: 'Informações', icon: Settings, path: `/restaurant-area/${restaurantId}/info`, description: 'Edite nome, descrição e horários.' },
    { title: 'Avaliações', icon: Star, path: `/restaurant-area/${restaurantId}/reviews`, description: 'Monitore e responda às avaliações dos clientes.', isPremium: true },
  ], [restaurantId]);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard de {restaurant.name}</h1>

      {/* Upgrade Banner */}
      {!isPremium && (
        <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 shadow-soft-md">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center">
              <Crown className="w-6 h-6 text-yellow-600 mr-3 fill-yellow-300" />
              <div>
                <p className="font-bold text-yellow-800 dark:text-yellow-300">Seu plano atual é FREE.</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">Desbloqueie recursos Premium, como Galeria e Avaliações.</p>
              </div>
            </div>
            <Link to={`/restaurant-area/${restaurantId}/upgrade`}>
              <Button className="bg-yellow-600 hover:bg-yellow-700 text-white">Upgrade</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Grid de Funcionalidades */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dashboardItems.map((item) => (
          <DashboardCard key={item.title} {...item} isPremium={item.isPremium} />
        ))}
      </div>

      {/* Link para Planos */}
      <div className="text-center pt-4">
        <Link to={`/restaurant-area/${restaurantId}/upgrade`} className="text-primary hover:underline font-medium flex items-center justify-center">
          <Package className="w-4 h-4 mr-2" /> Gerenciar Planos
        </Link>
      </div>

      {/* Bottom Navigation */}
      <RestaurantBottomNav />
    </div>
  );
};

export default RestaurantDashboard;
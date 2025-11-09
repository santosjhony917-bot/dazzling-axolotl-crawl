import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Utensils, Image as ImageIcon, Settings, BarChart3, Crown, PlusCircle, Loader2, AlertTriangle } from 'lucide-react'; // Alias Image
import { Button } from '@/components/ui/button';
import { RestaurantAreaPageLayout } from '@/components/restaurant/RestaurantAreaPageLayout';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRestaurantData } from '@/context/RestaurantContext'; // Named import
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import CreateRestaurantForm from '@/components/restaurant/CreateRestaurantForm'; // Import as default

const RestaurantDashboardPage: React.FC = () => {
  const { restaurant, isLoading, refreshRestaurantData } = useRestaurantData();
  const [followersCount, setFollowersCount] = useState<number | null>(null);
  const [isCreatingRestaurant, setIsCreatingRestaurant] = useState(false);

  useEffect(() => {
    if (restaurant) {
      fetchFollowersCount(restaurant.id);
    }
  }, [restaurant]);

  const fetchFollowersCount = async (restaurantId: string) => {
    const { data, error } = await supabase.rpc('count_restaurant_followers', {
      p_restaurant_id: restaurantId,
    });

    if (error) {
      console.error('Error fetching followers count:', error);
      toast.error('Erro ao carregar o número de seguidores.');
    } else {
      setFollowersCount(data);
    }
  };

  const handleRestaurantCreated = () => {
    refreshRestaurantData();
    setIsCreatingRestaurant(false);
    toast.success('Restaurante criado com sucesso!');
  };

  if (isLoading) {
    return (
      <RestaurantAreaPageLayout title="Dashboard do Restaurante">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </RestaurantAreaPageLayout>
    );
  }

  if (!restaurant) {
    return (
      <RestaurantAreaPageLayout title="Dashboard do Restaurante">
        <div className="flex flex-col items-center justify-center py-10">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
            Você ainda não tem um restaurante cadastrado. Crie um para começar!
          </p>
          <Button onClick={() => setIsCreatingRestaurant(true)}>
            <PlusCircle className="h-4 w-4 mr-2" /> Criar Meu Restaurante
          </Button>

          {isCreatingRestaurant && (
            <div className="mt-8 w-full max-w-2xl">
              <CreateRestaurantForm onSuccess={handleRestaurantCreated} onCancel={() => setIsCreatingRestaurant(false)} />
            </div>
          )}
        </div>
      </RestaurantAreaPageLayout>
    );
  }

  return (
    <RestaurantAreaPageLayout title="Dashboard do Restaurante">
      <div className="space-y-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Seguidores</CardTitle>
              <Utensils className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {followersCount !== null ? followersCount : <Loader2 className="h-5 w-5 animate-spin" />}
              </div>
              <p className="text-xs text-muted-foreground">
                Total de usuários que favoritaram seu restaurante.
              </p>
            </CardContent>
          </Card>
          {/* Adicione mais cards de métricas aqui */}
        </div>

        <Separator />

        <h2 className="text-2xl font-bold">Ações Rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link to="/restaurant-area/menu">
            <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center text-lg">
              <Utensils className="h-6 w-6 mb-2" />
              Gerenciar Cardápio
            </Button>
          </Link>
          <Link to="/restaurant-area/gallery">
            <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center text-lg">
              <ImageIcon className="h-6 w-6 mb-2" />
              Gerenciar Galeria
            </Button>
          </Link>
          <Link to="/restaurant-area/settings">
            <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center text-lg">
              <Settings className="h-6 w-6 mb-2" />
              Configurações do Perfil
            </Button>
          </Link>
          <Link to="/restaurant-area/metrics">
            <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center text-lg">
              <BarChart3 className="h-6 w-6 mb-2" />
              Ver Métricas
            </Button>
          </Link>
          <Link to="/upgrade">
            <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center text-lg">
              <Crown className="h-6 w-6 mb-2" />
              Gerenciar Plano
            </Button>
          </Link>
        </div>
      </div>
    </RestaurantAreaPageLayout>
  );
};

export default RestaurantDashboardPage;
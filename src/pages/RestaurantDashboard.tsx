import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Search, Utensils, Menu, Settings, ArrowLeft, Plus, TrendingUp, Users, Star } from 'lucide-react';
import { Restaurant } from '@/types/restaurant';
import { fetchRestaurantById } from '@/integrations/supabase/restaurants';
import { Skeleton } from '@/components/ui/skeleton';
import { createPageUrl } from '@/utils/url';
import SearchByPriceModal from '@/components/search/SearchByPriceModal';
import SearchByNameModal from '@/components/search/SearchByNameModal';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const RestaurantDashboard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { toast } = useToast();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);

  const isOwner = session?.user.id === restaurant?.user_id;

  const fetchRestaurant = useCallback(async (restaurantId: string) => {
    setIsLoading(true);
    try {
      const data = await fetchRestaurantById(restaurantId);
      if (data) {
        setRestaurant(data);
      } else {
        toast({
          title: "Erro",
          description: "Restaurante não encontrado.",
          variant: "destructive",
        });
        navigate(createPageUrl('home'));
      }
    } catch (error) {
      console.error("Failed to fetch restaurant:", error);
      toast({
        title: "Erro de Conexão",
        description: "Não foi possível carregar os dados do restaurante.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [navigate, toast]);

  useEffect(() => {
    if (id) {
      fetchRestaurant(id);
    }
  }, [id, fetchRestaurant]);

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const handleApplyPriceFilter = (minPrice: number, maxPrice: number) => {
    // This function is no longer needed here as the search modal handles the search internally.
    // Keeping it as a placeholder if future filtering logic is added to the dashboard.
    console.log(`Applying price filter: ${minPrice} - ${maxPrice}`);
    setIsPriceModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="p-4 max-w-md mx-auto space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return null; // Should be handled by fetchRestaurant redirect/toast
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-2xl font-bold text-primary dark:text-white truncate max-w-[70%]">{restaurant.name}</h1>
        {isOwner ? (
          <Button variant="ghost" size="icon" onClick={() => handleNavigate(createPageUrl('restaurant-settings', { id: restaurant.id }))}>
            <Settings className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </Button>
        ) : (
          <div className="w-6 h-6"></div> // Placeholder for alignment
        )}
      </div>

      {/* Informações Principais */}
      <Card className="mb-6 overflow-hidden">
        {restaurant.cover_image_url && (
          <img 
            src={restaurant.cover_image_url} 
            alt={`Capa de ${restaurant.name}`} 
            className="w-full h-32 object-cover"
          />
        )}
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-primary">{restaurant.name}</h2>
            <Badge variant={restaurant.plan === 'premium' ? 'default' : 'secondary'} className="capitalize">
              {restaurant.plan}
            </Badge>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{restaurant.description}</p>
          <div className="flex items-center mt-2 text-sm text-yellow-500">
            <Star className="w-4 h-4 fill-yellow-500 mr-1" />
            <span>4.5 (120 avaliações)</span>
          </div>
        </CardContent>
      </Card>

      {/* Ações Rápidas (NOVOS BOTÕES DE BUSCA) */}
      <div className="flex gap-4 pt-2 mb-6">
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={() => setIsPriceModalOpen(true)}
        >
          <DollarSign className="w-4 h-4 mr-2" /> Buscar Prato|Preço
        </Button>
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={() => setIsNameModalOpen(true)}
        >
          <Utensils className="w-4 h-4 mr-2" /> Buscar Prato|Nome
        </Button>
      </div>

      {/* Ações do Proprietário / Navegação */}
      {isOwner && (
        <Alert className="mb-6 bg-blue-50 border-blue-300 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-400">
          <AlertTitle className="font-bold text-blue-800 dark:text-blue-400">Painel do Proprietário</AlertTitle>
          <AlertDescription>
            Gerencie seu cardápio, visualize estatísticas e edite seu perfil.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        <ActionCard 
          title="Ver Cardápio" 
          icon={Menu} 
          onClick={() => handleNavigate(createPageUrl('restaurant-menu', { id: restaurant.id }))}
        />
        {isOwner && (
          <>
            <ActionCard 
              title="Adicionar Item" 
              icon={Plus} 
              onClick={() => handleNavigate(createPageUrl('menu-item-create', { restaurantId: restaurant.id }))}
            />
            <ActionCard 
              title="Estatísticas" 
              icon={TrendingUp} 
              onClick={() => handleNavigate(createPageUrl('restaurant-stats', { id: restaurant.id }))}
            />
            <ActionCard 
              title="Gerenciar Equipe" 
              icon={Users} 
              onClick={() => handleNavigate(createPageUrl('restaurant-team', { id: restaurant.id }))}
            />
          </>
        )}
      </div>

      {/* Modais de Busca */}
      <SearchByPriceModal 
        isOpen={isPriceModalOpen} 
        onClose={() => setIsPriceModalOpen(false)}
      />
      <SearchByNameModal 
        isOpen={isNameModalOpen} 
        onClose={() => setIsNameModalOpen(false)}
      />
    </div>
  );
};

// Componente auxiliar para ações
interface ActionCardProps {
  title: string;
  icon: React.ElementType;
  onClick: () => void;
}

const ActionCard: React.FC<ActionCardProps> = ({ title, icon: Icon, onClick }) => (
  <Card className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" onClick={onClick}>
    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
      <Icon className="w-6 h-6 text-primary mb-2" />
      <p className="text-sm font-medium">{title}</p>
    </CardContent>
  </Card>
);

export default RestaurantDashboard;
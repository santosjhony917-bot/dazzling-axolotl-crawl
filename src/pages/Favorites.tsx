import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Utensils, MapPin, Loader2, ArrowLeft, DollarSign } from 'lucide-react';
import { useAuthContext } from '@/context/AuthContext';
import { useUserFavoritesList } from '@/hooks/useUserFavoritesList'; // Restaurantes seguidos
import { useMenuItemFavorites } from '@/hooks/useMenuItemFavorites'; // Itens favoritos
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils/url';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';
import ClientLayout from '@/components/ClientLayout';
import CustomerBottomNav from '@/components/CustomerBottomNav';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatPrice } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

// Componente para listar Restaurantes Seguidos
const RestaurantFavoritesList: React.FC<{ navigate: ReturnType<typeof useNavigate> }> = ({ navigate }) => {
  const { favorites, isLoading, error } = useUserFavoritesList();
  const { user } = useAuthContext();

  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  
  if (error) {
    return <div className="p-4 text-red-500">Erro ao carregar restaurantes: {error}</div>;
  }

  if (favorites.length === 0) {
    return (
      <div className="p-6 text-center text-gray-600">
        <Utensils className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p>Você ainda não está seguindo nenhum restaurante.</p>
        <Button variant="link" onClick={() => navigate(createPageUrl('search-unified'))}>
          Encontrar Restaurantes
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {favorites.map((fav) => {
        const r = fav.restaurants;
        if (!r) return null;

        return (
          <Card 
            key={r.id} 
            className="flex p-3 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => navigate(createPageUrl('restaurantProfile', { restaurantId: r.id }))}
          >
            <img 
              src={r.image_url || PLACEHOLDER_IMAGE_URL} 
              alt={r.name} 
              className="w-20 h-20 object-cover rounded-lg mr-4 shrink-0"
            />
            <div className="flex flex-col justify-center">
              <h3 className="font-bold text-lg text-gray-800">{r.name}</h3>
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <Utensils className="w-3 h-3" /> {r.category || 'Geral'}
              </p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {r.city || 'Localização desconhecida'}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

// Componente para listar Itens de Menu Favoritos
const ItemFavoritesList: React.FC = () => {
  const { favoriteItems, isLoading, error } = useMenuItemFavorites();

  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  
  if (error) {
    return <div className="p-4 text-red-500">Erro ao carregar pratos favoritos: {error}</div>;
  }

  if (favoriteItems.length === 0) {
    return (
      <div className="p-6 text-center text-gray-600">
        <DollarSign className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p>Você ainda não favoritou nenhum item de menu.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {favoriteItems.map((item) => (
        <Card 
          key={item.id} 
          className="flex p-3 cursor-pointer hover:bg-gray-50 transition-colors"
          // Ação de clique para ver detalhes do item (futuro)
          onClick={() => alert(`Detalhes do item: ${item.name}`)}
        >
          <img 
            src={item.image_url || PLACEHOLDER_IMAGE_URL} 
            alt={item.name} 
            className="w-20 h-20 object-cover rounded-lg mr-4 shrink-0"
          />
          <div className="flex flex-col justify-center">
            <h3 className="font-bold text-lg text-gray-800">{item.name}</h3>
            <p className="text-sm text-highlight font-semibold flex items-center gap-1">
              {formatPrice(item.price)}
            </p>
            <p className="text-xs text-gray-500 line-clamp-1">{item.description || 'Sem descrição'}</p>
          </div>
        </Card>
      ))}
    </div>
  );
};


export default function Favorites() {
  const { user, isLoading: isAuthLoading } = useAuthContext();
  const { restaurant } = useAuth(); 
  const navigate = useNavigate();
  const isRestaurantUser = !!restaurant;

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="p-6 text-center">
        <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Acesse para ver seus favoritos</h2>
        <p className="text-gray-600 mb-6">Faça login para salvar e gerenciar seus restaurantes e pratos preferidos.</p>
        <Button onClick={() => navigate(createPageUrl('auth'))}>
          Fazer Login
        </Button>
      </div>
    );
  }

  if (isRestaurantUser) {
    return (
      <div className="p-6 text-center">
        <Heart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Área Exclusiva para Clientes</h2>
        <p className="text-gray-600 mb-6">Proprietários de restaurantes não podem favoritar. Use o menu inferior para acessar seu painel.</p>
        <Button onClick={() => navigate(createPageUrl('restaurant-area/home'))}>
          Ir para o Painel
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      <ClientLayout title="Meus Favoritos" selectedTab="favorites" showBackButton={false}>
        <div className="p-4">
          <Tabs defaultValue="restaurants" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-auto p-1 bg-gray-200 rounded-xl shadow-inner mb-6">
              <TabsTrigger value="restaurants" className="flex items-center gap-2 h-10 rounded-xl data-[state=active]:bg-highlight data-[state=active]:text-white font-semibold">
                <Utensils className="w-5 h-5" /> Restaurantes
              </TabsTrigger>
              <TabsTrigger value="items" className="flex items-center gap-2 h-10 rounded-xl data-[state=active]:bg-highlight data-[state=active]:text-white font-semibold">
                <DollarSign className="w-5 h-5" /> Pratos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="restaurants">
              <RestaurantFavoritesList navigate={navigate} />
            </TabsContent>
            
            <TabsContent value="items">
              <ItemFavoritesList />
            </TabsContent>
          </Tabs>
        </div>
      </ClientLayout>
      
      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md z-30">
        <CustomerBottomNav selectedTab="favorites" />
      </div>
    </div>
  );
}
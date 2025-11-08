"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Heart, Share2, MapPin, Phone, Globe, Instagram, Facebook, Twitter, Clock, Utensils, Star } from 'lucide-react';
import { toast } from 'sonner';
import FreeProfileLayout from '@/components/public/FreeProfileLayout';
import PremiumProfileLayout from '@/components/public/PremiumProfileLayout';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

interface PublicRestaurantData {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  cover_image_url?: string;
  category?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  whatsapp_url?: string;
  ifood_url?: string;
  other_url?: string;
  other_url_label?: string;
  external_url?: string;
  plan: 'free' | 'basic' | 'premium';
  opening_hours?: any; // Consider a more specific type
  payment_methods?: any; // Consider a more specific type
  social_networks?: any; // Consider a more specific type
  followers_override?: number;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
}

interface MenuCategory {
  id: string;
  name: string;
  menu_items: MenuItem[];
}

const getRestaurantData = async (id: string): Promise<PublicRestaurantData> => {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data;
};

const getMenuData = async (restaurantId: string): Promise<MenuCategory[]> => {
  const { data, error } = await supabase
    .from('menu_categories')
    .select(`
      id,
      name,
      menu_items (
        id,
        name,
        description,
        price,
        image_url
      )
    `)
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .order('order_index', { ascending: true })
    .order('order_index', { foreignTable: 'menu_items', ascending: true });

  if (error) throw new Error(error.message);
  return data;
};

const getFollowerCount = async (restaurantId: string): Promise<number> => {
  const { data, error } = await supabase.rpc('count_restaurant_followers', { p_restaurant_id: restaurantId });
  if (error) throw new Error(error.message);
  return data;
};

const getIsFavorite = async (restaurantId: string, userId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('user_favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('restaurant_id', restaurantId)
    .single();
  if (error && error.code !== 'PGRST116') throw new Error(error.message); // PGRST116 means no rows found
  return !!data;
};

const RestaurantProfilePublic: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const { data: restaurant, isLoading: isLoadingRestaurant, error: restaurantError } = useQuery<PublicRestaurantData, Error>({
    queryKey: ['restaurant', id],
    queryFn: () => getRestaurantData(id!),
    enabled: !!id,
  });

  const { data: menuCategories, isLoading: isLoadingMenu, error: menuError } = useQuery<MenuCategory[], Error>({
    queryKey: ['menu', id],
    queryFn: () => getMenuData(id!),
    enabled: !!id,
  });

  const { data: followerCount, isLoading: isLoadingFollowerCount, error: followerCountError } = useQuery<number, Error>({
    queryKey: ['followerCount', id],
    queryFn: () => getFollowerCount(id!),
    enabled: !!id,
  });

  const { data: isFavorite, isLoading: isLoadingIsFavorite, error: isFavoriteError } = useQuery<boolean, Error>({
    queryKey: ['isFavorite', id, userId],
    queryFn: () => getIsFavorite(id!, userId!),
    enabled: !!id && !!userId,
  });

  const toggleFavoriteMutation = useMutation<void, Error, boolean>({
    mutationFn: async (currentFavoriteStatus) => {
      if (!userId) {
        toast.error("Você precisa estar logado para favoritar um restaurante.");
        return;
      }
      if (currentFavoriteStatus) {
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', userId)
          .eq('restaurant_id', id!);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from('user_favorites')
          .insert({ user_id: userId, restaurant_id: id! });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isFavorite', id, userId] });
      queryClient.invalidateQueries({ queryKey: ['followerCount', id] });
      toast.success(isFavorite ? "Restaurante removido dos favoritos!" : "Restaurante adicionado aos favoritos!");
    },
    onError: (error) => {
      toast.error(`Erro ao favoritar: ${error.message}`);
    },
  });

  const handleToggleFavorite = () => {
    if (isFavorite !== undefined) {
      toggleFavoriteMutation.mutate(isFavorite);
    }
  };

  if (isLoadingRestaurant || isLoadingMenu || isLoadingFollowerCount || isLoadingIsFavorite) {
    return <div className="text-center py-8">Carregando perfil do restaurante...</div>;
  }

  if (restaurantError) {
    return <div className="text-center py-8 text-red-500">Erro ao carregar restaurante: {restaurantError.message}</div>;
  }

  if (!restaurant) {
    return <div className="text-center py-8">Restaurante não encontrado.</div>;
  }

  const isPremium = restaurant.plan === 'premium';

  const renderContent = (
    <>
      <div className="flex items-center justify-center space-x-4 mb-6">
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold">{followerCount !== undefined ? followerCount + (restaurant.followers_override || 0) : '...'}</span>
          <span className="text-sm text-gray-600">Seguidores</span>
        </div>
        <Separator orientation="vertical" className="h-10" />
        <Button
          onClick={handleToggleFavorite}
          disabled={toggleFavoriteMutation.isPending || !userId}
          variant={isFavorite ? "default" : "outline"}
          className={isFavorite ? "bg-red-500 hover:bg-red-600 text-white" : ""}
        >
          <Heart className={cn("mr-2 h-4 w-4", isFavorite && "fill-current")} />
          {isFavorite ? "Favoritado" : "Favoritar"}
        </Button>
        <Button variant="outline" onClick={() => navigator.clipboard.writeText(window.location.href).then(() => toast.success("Link copiado!"))}>
          <Share2 className="mr-2 h-4 w-4" /> Compartilhar
        </Button>
      </div>

      {restaurant.description && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Sobre</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{restaurant.description}</p>
          </CardContent>
        </Card>
      )}

      {(restaurant.address || restaurant.phone || restaurant.whatsapp_url || restaurant.ifood_url || restaurant.other_url || restaurant.external_url || (restaurant.social_networks && restaurant.social_networks.length > 0)) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Contato e Localização</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {restaurant.address && (
              <div className="flex items-center text-gray-700">
                <MapPin className="mr-2 h-5 w-5 text-gray-500" />
                <span>{restaurant.address}, {restaurant.city} - {restaurant.state}</span>
              </div>
            )}
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone}`} className="flex items-center text-blue-600 hover:underline">
                <Phone className="mr-2 h-5 w-5 text-blue-500" />
                <span>{restaurant.phone}</span>
              </a>
            )}
            {restaurant.whatsapp_url && (
              <a href={restaurant.whatsapp_url} target="_blank" rel="noopener noreferrer" className="flex items-center text-green-600 hover:underline">
                <img src="/whatsapp-icon.png" alt="WhatsApp" className="mr-2 h-5 w-5" />
                <span>WhatsApp</span>
              </a>
            )}
            {restaurant.ifood_url && (
              <a href={restaurant.ifood_url} target="_blank" rel="noopener noreferrer" className="flex items-center text-red-600 hover:underline">
                <img src="/ifood-icon.png" alt="iFood" className="mr-2 h-5 w-5" />
                <span>iFood</span>
              </a>
            )}
            {restaurant.other_url && (
              <a href={restaurant.other_url} target="_blank" rel="noopener noreferrer" className="flex items-center text-purple-600 hover:underline">
                <Globe className="mr-2 h-5 w-5 text-purple-500" />
                <span>{restaurant.other_url_label || "Outro Link"}</span>
              </a>
            )}
            {restaurant.external_url && (
              <a href={restaurant.external_url} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:underline">
                <Globe className="mr-2 h-5 w-5 text-blue-500" />
                <span>Website</span>
              </a>
            )}
            {restaurant.social_networks && restaurant.social_networks.length > 0 && (
              <div className="flex items-center space-x-4 pt-2">
                {restaurant.social_networks.map((social: { platform: string; url: string }) => (
                  <a key={social.platform} href={social.url} target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-gray-900">
                    {social.platform === 'instagram' && <Instagram className="h-6 w-6" />}
                    {social.platform === 'facebook' && <Facebook className="h-6 w-6" />}
                    {social.platform === 'twitter' && <Twitter className="h-6 w-6" />}
                    {/* Adicione outros ícones de redes sociais conforme necessário */}
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {restaurant.opening_hours && Object.keys(restaurant.opening_hours).length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Horário de Funcionamento</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {Object.entries(restaurant.opening_hours).map(([day, hours]: [string, any]) => (
                <li key={day} className="flex justify-between">
                  <span className="font-medium">{day}:</span>
                  <span>{hours.open} - {hours.close}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {restaurant.payment_methods && Object.keys(restaurant.payment_methods).length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Formas de Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.entries(restaurant.payment_methods).map(([method, available]) => (
              available && <Badge key={method} variant="secondary">{method}</Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {menuCategories && menuCategories.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Utensils className="mr-2 h-6 w-6" /> Pratos Principais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {menuCategories.map((category) => (
              <div key={category.id}>
                <h3 className="text-xl font-semibold mb-3">{category.name}</h3>
                <div className="grid gap-4">
                  {category.menu_items.map((item) => (
                    <div key={item.id} className="flex items-center space-x-4 border-b pb-4 last:border-b-0 last:pb-0">
                      {item.image_url && (
                        <AspectRatio ratio={1 / 1} className="w-24 h-24 flex-shrink-0 rounded-md overflow-hidden">
                          <img src={item.image_url} alt={item.name} className="object-cover w-full h-full" />
                        </AspectRatio>
                      )}
                      <div className="flex-grow">
                        <h4 className="font-medium text-lg">{item.name}</h4>
                        <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                        <p className="font-bold text-lg text-primary mt-1">R$ {item.price.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {isPremium ? (
        <PremiumProfileLayout
          restaurant={restaurant as PublicRestaurantData}
          toggleFavorite={handleToggleFavorite}
          isFavoriteMutating={toggleFavoriteMutation.isPending}
          isCompact={false} // Assuming a default value or prop for this
        >
          {renderContent}
        </PremiumProfileLayout>
      ) : (
        <FreeProfileLayout
          restaurant={restaurant as PublicRestaurantData}
          toggleFavorite={handleToggleFavorite}
          isFavoriteMutating={toggleFavoriteMutation.isPending}
          isCompact={false} // Assuming a default value or prop for this
        >
          {renderContent}
        </FreeProfileLayout>
      )}
    </div>
  );
};

export default RestaurantProfilePublic;
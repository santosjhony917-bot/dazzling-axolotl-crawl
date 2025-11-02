import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/integrations/base44Client';
import { useAuthData } from '@/context/AuthContext';

interface Restaurant {
  id: string;
  user_id: string;
  name: string;
  description: string;
  image_url: string;
  cover_image_url: string;
  plan: 'free' | 'basic' | 'premium';
  phone: string;
  email: string;
  cnpj: string;
  category: string;
  whatsapp_url: string;
  ifood_url: string;
  other_url: string;
  address: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  latitude: number;
  longitude: number;
  opening_hours: any; // Considerar tipagem mais específica
  created_at: string;
  external_url: string;
  followers_override: number;
  payment_methods: any; // Considerar tipagem mais específica
  social_networks: { platform: string; url: string }[];
  is_favorited?: boolean;
}

export const useRestaurantData = (restaurantId?: string) => {
  const { user, isLoading: isUserLoading } = useAuthData();

  const queryKey = restaurantId ? ['restaurantData', restaurantId] : ['restaurantData', user?.id];

  const { data, isLoading, error, refetch } = useQuery<Restaurant, Error>({
    queryKey: queryKey,
    queryFn: async () => {
      if (restaurantId) {
        return await base44.restaurants.getRestaurantById(restaurantId);
      } else if (user?.id) {
        return await base44.restaurants.getRestaurantByUserId(user.id);
      }
      throw new Error("No restaurant ID or user ID provided.");
    },
    enabled: !isUserLoading && (!!restaurantId || !!user?.id),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes (substitui cacheTime)
  });

  return { restaurant: data, isLoading, error, refetch };
};
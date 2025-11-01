import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';
import { showError, showSuccess } from '@/utils/toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, TrendingUp, Save } from 'lucide-react';

const fetchRestaurant = async (restaurantId: string): Promise<Restaurant> => {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', restaurantId)
    .single();
  if (error) throw error;
  return data;
};

const updateFollowersOverride = async (restaurantId: string, followersOverride: number) => {
  const { error } = await supabase
    .from('restaurants')
    .update({ followers_override: followersOverride })
    .eq('id', restaurantId);
  if (error) throw error;
};

const InstantMetrics: React.FC<{ restaurantId: string }> = ({ restaurantId }) => {
  const queryClient = useQueryClient();
  const { data: restaurant, isLoading, error } = useQuery<Restaurant, Error>({
    queryKey: ['restaurant', restaurantId],
    queryFn: () => fetchRestaurant(restaurantId),
  });

  const [tempFollowers, setTempFollowers] = useState<number>(0);

  useEffect(() => {
    if (restaurant) {
      setTempFollowers(restaurant.followers_override || 0);
    }
  }, [restaurant]);

  const mutation = useMutation({
    mutationFn: ({ id, followers }: { id: string; followers: number }) =>
      updateFollowersOverride(id, followers),
    onSuccess: () => {
      showSuccess('Contagem de seguidores atualizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId] });
    },
    onError: (err) => {
      showError(`Erro ao atualizar seguidores: ${err.message}`);
    },
  });

  if (isLoading) {
    return <Loader2 className="h-8 w-8 animate-spin text-primary" />;
  }

  if (error) {
    return <p className="text-red-500">Erro: {error.message}</p>;
  }

  if (!restaurant) {
    return <p>Restaurante não encontrado.</p>;
  }

  return (
    <Card className="shadow-soft-md border-none rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Seguidores (Override)
        </CardTitle>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold mb-4">
          {restaurant.followers_override || 0}
        </div>
        <div className="flex space-x-2">
          <Input
            type="number"
            value={tempFollowers}
            onChange={(e) => setTempFollowers(parseInt(e.target.value) || 0)}
            className="w-24"
          />
          <Button
            onClick={() => mutation.mutate({ id: restaurant.id, followers: tempFollowers })}
            disabled={mutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" /> Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default InstantMetrics;
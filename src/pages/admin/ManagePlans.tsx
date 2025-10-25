import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Utensils, Loader2, Check, AlertTriangle, Crown } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant, RestaurantPlan } from '@/types/supabase';
import { showError, showSuccess } from '@/utils/toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // <-- Importação adicionada

// Planos disponíveis para seleção manual
const availablePlans: { value: RestaurantPlan, label: string, isPaid: boolean }[] = [
  { value: 'free', label: 'Free', isPaid: false },
  { value: 'basic', label: 'Basic', isPaid: true },
  { value: 'premium', label: 'Premium', isPaid: true },
];

// Função para buscar todos os restaurantes
const fetchAllRestaurants = async (): Promise<Restaurant[]> => {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name, plan, email, created_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data as Restaurant[];
};

export default function ManagePlans() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<RestaurantPlan | 'all'>('all');

  // Query para listar restaurantes
  const { data: restaurants, isLoading, error, refetch } = useQuery<Restaurant[], Error>({
    queryKey: ['adminRestaurantsList'],
    queryFn: fetchAllRestaurants,
    staleTime: 60000, // 1 minuto
  });

  // Mutação para atualizar o plano
  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, newPlan }: { id: string, newPlan: RestaurantPlan }) => {
      const { error } = await supabase
        .from('restaurants')
        .update({ plan: newPlan })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess('Plano atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['adminRestaurantsList'] });
    },
    onError: (e) => {
      showError(`Falha ao atualizar plano: ${(e as Error).message}`);
    },
  });

  const filteredRestaurants = useMemo(() => {
    if (!restaurants) return [];
    if (filter === 'all') return restaurants;
    return restaurants.filter(r => r.plan === filter);
  }, [restaurants, filter]);

  const handlePlanChange = (restaurantId: string, currentPlan: RestaurantPlan, newPlan: string) => {
    const newPlanTyped = newPlan as RestaurantPlan;
    
    // Regra de Negócio: Planos pagos não podem ser rebaixados manualmente
    const isCurrentPlanPaid = availablePlans.find(p => p.value === currentPlan)?.isPaid;
    const isNewPlanFree = newPlanTyped === 'free';
    
    if (isCurrentPlanPaid && isNewPlanFree) {
      showError("Restaurantes com planos pagos não podem ser rebaixados manualmente para Free.");
      return;
    }
    
    if (currentPlan !== newPlanTyped) {
      updatePlanMutation.mutate({ id: restaurantId, newPlan: newPlanTyped });
    }
  };
  
  const getPlanColor = (plan: RestaurantPlan) => {
    switch (plan) {
      case 'premium': return 'bg-amber-500 text-white';
      case 'basic': return 'bg-blue-500 text-white';
      case 'free': return 'bg-gray-200 text-gray-700';
      default: return 'bg-gray-200 text-gray-700';
    }
  };
  
  const isPlanEditable = (plan: RestaurantPlan) => {
    // Se o plano for pago, ele não é editável (para Free/Basic)
    return plan === 'free';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#022D68]">
            <Crown className="w-6 h-6" /> Gerenciamento de Planos
          </CardTitle>
          <CardDescription>Visualize e altere o plano de assinatura dos restaurantes (apenas para Free).</CardDescription>
        </CardHeader>
      </Card>

      <Card className="shadow-lg border-none rounded-xl">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-primary">Lista de Restaurantes</h3>
            <Select value={filter} onValueChange={(value) => setFilter(value as RestaurantPlan | 'all')}>
              <SelectTrigger className="w-[180px] h-10">
                <SelectValue placeholder="Filtrar por Plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Planos</SelectItem>
                {availablePlans.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erro ao carregar</AlertTitle>
              <AlertDescription>Falha ao listar restaurantes: {error.message}</AlertDescription>
            </Alert>
          ) : filteredRestaurants.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum restaurante encontrado com o filtro selecionado.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRestaurants.map((restaurant) => (
                <div key={restaurant.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg shadow-sm">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-base font-bold text-primary truncate">{restaurant.name}</p>
                    <p className="text-sm text-gray-600 truncate">{restaurant.email}</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className={cn("px-3 py-1 rounded-full text-xs font-bold", getPlanColor(restaurant.plan))}>
                      {restaurant.plan.toUpperCase()}
                    </div>
                    
                    <Select 
                      value={restaurant.plan} 
                      onValueChange={(newPlan) => handlePlanChange(restaurant.id, restaurant.plan, newPlan)}
                      disabled={!isPlanEditable(restaurant.plan) || updatePlanMutation.isPending}
                    >
                      <SelectTrigger className="w-[120px] h-10">
                        <SelectValue placeholder="Alterar Plano" />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePlans.map(p => (
                          <SelectItem 
                            key={p.value} 
                            value={p.value}
                            // Desabilita a opção se o plano atual for pago e o novo for Free
                            disabled={!isPlanEditable(restaurant.plan) && p.value !== restaurant.plan}
                          >
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
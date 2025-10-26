import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant, RestaurantPlan } from '@/types/supabase';
import { showError, showSuccess } from '@/utils/toast';
import AdminAreaHeader from '@/components/admin/AdminAreaHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle, XCircle, Gift } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PlanOption {
  value: RestaurantPlan | 'premium_gift'; // Permitindo 'premium_gift' temporariamente para o Select
  label: string;
  isPaid: boolean;
  isGift: boolean;
}

const PLAN_OPTIONS: PlanOption[] = [
  { value: 'free', label: 'Free', isPaid: false, isGift: false },
  { value: 'basic', label: 'Basic', isPaid: true, isGift: false },
  { value: 'premium', label: 'Premium', isPaid: true, isGift: false },
  { value: 'premium_gift', label: 'Premium G (Cortesia)', isPaid: false, isGift: true },
];

const fetchRestaurants = async (): Promise<Restaurant[]> => {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Restaurant[];
};

export default function ManagePlans() {
  const queryClient = useQueryClient();
  const { data: restaurants, isLoading, error } = useQuery({
    queryKey: ['adminRestaurants'],
    queryFn: fetchRestaurants,
  });
  const [searchTerm, setSearchTerm] = useState('');

  const updatePlanMutation = useMutation({
    mutationFn: async ({ restaurantId, newPlan }: { restaurantId: string, newPlan: RestaurantPlan }) => {
      const { error } = await supabase
        .from('restaurants')
        .update({ plan: newPlan })
        .eq('id', restaurantId);

      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("Plano atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['adminRestaurants'] });
    },
    onError: (e) => {
      showError(`Falha ao atualizar plano: ${(e as Error).message}`);
    },
  });

  const filteredRestaurants = restaurants?.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.id.includes(searchTerm)
  ) || [];

  const getPlanBadge = (plan: RestaurantPlan) => {
    let classes = 'text-xs font-semibold px-2 py-0.5 rounded-full';
    let label = '';
    let icon = null;

    switch (plan) {
      case 'premium':
        classes = cn(classes, 'bg-amber-500 text-white');
        label = 'Premium';
        break;
      case 'premium_gift':
        classes = cn(classes, 'bg-green-500 text-white');
        label = 'Cortesia';
        icon = <Gift className="w-3 h-3 mr-1" />;
        break;
      case 'basic':
        classes = cn(classes, 'bg-blue-500 text-white');
        label = 'Basic';
        break;
      case 'free':
      default:
        classes = cn(classes, 'bg-gray-200 text-gray-700');
        label = 'Free';
        break;
    }
    return <span className={cn(classes, "flex items-center")}>{icon}{label}</span>;
  };

  const handlePlanChange = (restaurantId: string, newPlanValue: string) => {
    // O valor do select pode ser 'premium_gift', que é um valor válido para RestaurantPlan
    updatePlanMutation.mutate({ restaurantId, newPlan: newPlanValue as RestaurantPlan });
  };

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-4xl mx-auto">
      <AdminAreaHeader title="Gerenciar Planos" />

      <main className="p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Controle de Assinaturas</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Buscar por nome, email ou ID do restaurante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-4"
            />

            {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
            {error && <p className="text-red-500">Erro ao carregar restaurantes.</p>}

            {!isLoading && filteredRestaurants.length === 0 && (
              <p className="text-center text-gray-500 py-8">Nenhum restaurante encontrado.</p>
            )}

            <div className="space-y-4">
              {filteredRestaurants.map((restaurant) => (
                <div key={restaurant.id} className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm">
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="font-bold truncate">{restaurant.name}</p>
                    <p className="text-sm text-gray-500 truncate">{restaurant.email || restaurant.id}</p>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    {getPlanBadge(restaurant.plan)}
                    
                    <Select 
                      value={restaurant.plan} 
                      onValueChange={(value) => handlePlanChange(restaurant.id, value)}
                      disabled={updatePlanMutation.isPending}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Mudar Plano" />
                      </SelectTrigger>
                      <SelectContent>
                        {PLAN_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
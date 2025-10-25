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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Planos disponíveis para seleção manual
const availablePlans: { value: RestaurantPlan, label: string, isPaid: boolean, isGift: boolean }[] = [
  { value: 'free', label: 'Free', isPaid: false, isGift: false },
  { value: 'premium', label: 'Premium', isPaid: true, isGift: false },
  { value: 'premium_gift', label: 'Premium G (Cortesia)', isPaid: false, isGift: true },
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

interface PendingChange {
  id: string;
  name: string;
  currentPlan: RestaurantPlan;
  newPlan: RestaurantPlan;
}

export default function ManagePlans() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<RestaurantPlan | 'all'>('all');
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  // Query para listar restaurantes
  const { data: restaurants, isLoading, error, refetch } = useQuery<Restaurant[], Error>({
    queryKey: ['adminRestaurantsList'],
    queryFn: fetchAllRestaurants,
    staleTime: 60000, // 1 minuto
  });

  // Mutação para atualizar o plano
  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, newPlan }: { id: string, newPlan: RestaurantPlan }) => {
      // Adicionando select() para garantir que a operação foi bem-sucedida
      const { data, error } = await supabase
        .from('restaurants')
        .update({ plan: newPlan })
        .eq('id', id)
        .select(); 
        
      if (error) {
        console.error("Supabase Update Error:", error);
        throw error;
      }
      
      // Se não houver dados retornados, pode ser um problema de RLS ou ID
      if (!data || data.length === 0) {
          throw new Error("Nenhuma linha atualizada. Verifique permissões (RLS) ou ID.");
      }
    },
    onSuccess: () => {
      showSuccess('Plano atualizado com sucesso!');
      // Invalida a query para forçar o recarregamento dos dados
      queryClient.invalidateQueries({ queryKey: ['adminRestaurantsList'] });
      setPendingChange(null);
      setIsAlertOpen(false);
    },
    onError: (e) => {
      const errorMessage = (e as Error).message;
      console.error("Mutation Error:", errorMessage);
      showError(`Falha ao atualizar plano: ${errorMessage}`);
      setPendingChange(null);
      setIsAlertOpen(false);
    },
  });

  const filteredRestaurants = useMemo(() => {
    if (!restaurants) return [];
    if (filter === 'all') return restaurants;
    return restaurants.filter(r => r.plan === filter);
  }, [restaurants, filter]);

  const getPlanDetails = (plan: RestaurantPlan) => {
    return availablePlans.find(p => p.value === plan) || availablePlans[0];
  };

  const isPlanEditable = (currentPlan: RestaurantPlan, targetPlan: RestaurantPlan) => {
    const currentDetails = getPlanDetails(currentPlan);
    const targetDetails = getPlanDetails(targetPlan);
    
    // Regra 1: Planos pagos (premium) não podem ser rebaixados para free ou premium_gift.
    if (currentDetails.isPaid && (targetPlan === 'free' || targetPlan === 'premium_gift')) {
      return false;
    }
    
    // Regra 2: Planos cortesia (premium_gift) não podem ser rebaixados para free.
    if (currentDetails.isGift && targetPlan === 'free') {
        return false;
    }
    
    // Regra 3: Se o plano atual for FREE, só pode ser alterado para PREMIUM_GIFT.
    if (currentPlan === 'free') {
        return targetPlan === 'premium_gift';
    }
    
    // Regra 4: Se o plano atual for pago/cortesia, pode ir para outro pago/cortesia (upgrade ou lateral).
    if (currentDetails.isPaid || currentDetails.isGift) {
        // Permite transição entre premium e premium_gift (upgrade/lateral)
        return targetPlan === 'premium' || targetPlan === 'premium_gift';
    }
    
    return true;
  };
  
  const getPlanColor = (plan: RestaurantPlan) => {
    switch (plan) {
      case 'premium': return 'bg-amber-500 text-white';
      case 'premium_gift': return 'bg-green-500 text-white'; // Cor para cortesia
      case 'free': return 'bg-gray-200 text-gray-700';
      default: return 'bg-gray-200 text-gray-700';
    }
  };

  const handlePlanChange = (restaurant: Restaurant, newPlan: string) => {
    const newPlanTyped = newPlan as RestaurantPlan;
    const currentPlan = restaurant.plan;
    
    if (currentPlan === newPlanTyped) return;

    // Verifica se a transição é permitida
    if (!isPlanEditable(currentPlan, newPlanTyped)) {
        showError(`Transição de plano não permitida: ${currentPlan.toUpperCase()} para ${newPlanTyped.toUpperCase()}.`);
        return;
    }
    
    setPendingChange({
      id: restaurant.id,
      name: restaurant.name,
      currentPlan: currentPlan,
      newPlan: newPlanTyped,
    });
    setIsAlertOpen(true);
  };
  
  const confirmPlanUpdate = () => {
    if (pendingChange) {
      updatePlanMutation.mutate({ 
        id: pendingChange.id, 
        newPlan: pendingChange.newPlan 
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#022D68]">
            <Crown className="w-6 h-6" /> Gerenciamento de Planos
          </CardTitle>
          <CardDescription>Visualize e altere o plano de assinatura dos restaurantes.</CardDescription>
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
                      {getPlanDetails(restaurant.plan).label.toUpperCase()}
                    </div>
                    
                    <Select 
                      value={restaurant.plan} 
                      onValueChange={(newPlan) => handlePlanChange(restaurant, newPlan)}
                      disabled={updatePlanMutation.isPending}
                    >
                      <SelectTrigger className="w-[120px] h-10">
                        <SelectValue placeholder="Alterar Plano" />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePlans.map(p => (
                          <SelectItem 
                            key={p.value} 
                            value={p.value}
                            // Desabilita a opção se a transição não for permitida
                            disabled={!isPlanEditable(restaurant.plan, p.value)}
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
      
      {/* Alert Dialog de Confirmação */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-primary">
              <Crown className="h-5 w-5 mr-2 text-highlight" /> Confirmar Alteração de Plano
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você tem certeza que deseja alterar o plano do restaurante 
              <span className="font-bold text-gray-900"> {pendingChange?.name}</span> de 
              <span className="font-bold text-highlight"> {getPlanDetails(pendingChange?.currentPlan || 'free').label.toUpperCase()}</span> para 
              <span className="font-bold text-highlight"> {getPlanDetails(pendingChange?.newPlan || 'free').label.toUpperCase()}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setPendingChange(null)} 
              disabled={updatePlanMutation.isPending}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmPlanUpdate} 
              disabled={updatePlanMutation.isPending} 
              className="bg-highlight hover:bg-highlight/90"
            >
              {updatePlanMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Alteração'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
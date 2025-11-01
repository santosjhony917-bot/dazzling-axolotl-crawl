import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Crown, Loader2, AlertTriangle, Utensils } from 'lucide-react';
import { useAdminRestaurants } from '@/hooks/useAdminRestaurants';
import { Restaurant, RestaurantPlan } from '@/types/supabase';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const planColors: Record<RestaurantPlan, string> = {
  free: 'bg-gray-200 text-gray-700',
  basic: 'bg-blue-100 text-blue-700',
  premium: 'bg-yellow-100 text-yellow-800',
  premium_gift: 'bg-green-100 text-green-700', // CORREÇÃO: Adicionado premium_gift
};

const planLabels: Record<RestaurantPlan, string> = {
  free: 'Free',
  basic: 'Basic',
  premium: 'Premium',
  premium_gift: 'Premium (Gift)', // CORREÇÃO: Adicionado premium_gift
};

const ManagePlans: React.FC = () => {
  const { restaurants, isLoading, error, updatePlan, isUpdating } = useAdminRestaurants();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handlePlanChange = (restaurantId: string, newPlan: string) => {
    setUpdatingId(restaurantId);
    updatePlan({ restaurantId, newPlan: newPlan as RestaurantPlan });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="shadow-soft-lg border-none rounded-xl bg-white p-6">
        <AlertTriangle className="h-6 w-6 text-red-500 mx-auto mb-3" />
        <p className="text-red-600 text-center">Erro ao carregar restaurantes: {error.message}</p>
      </Card>
    );
  }

  return (
    <Card className="shadow-soft-lg border-none rounded-xl bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl text-[#022D68]">
          <Crown className="w-6 h-6" /> Gerenciar Planos
        </CardTitle>
        <CardDescription>Total de {restaurants.length} restaurantes cadastrados. Altere o plano de assinatura abaixo.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Restaurante</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plano Atual</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {restaurants.map((restaurant) => {
                const isCurrentlyUpdating = isUpdating && updatingId === restaurant.id;
                return (
                  <tr key={restaurant.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 truncate max-w-[150px]">
                      {restaurant.name}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">
                        <Utensils className="w-3 h-3 mr-1" /> {restaurant.category || 'Não definido'}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Badge className={cn("font-bold", planColors[restaurant.plan])}>
                        {planLabels[restaurant.plan]}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <Select 
                        onValueChange={(value) => handlePlanChange(restaurant.id, value)}
                        value={restaurant.plan}
                        disabled={isCurrentlyUpdating}
                      >
                        <SelectTrigger className="w-[180px] h-9 rounded-lg">
                          <SelectValue placeholder="Alterar Plano" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(planLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key} className={cn(planColors[key as RestaurantPlan])}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isCurrentlyUpdating && <Loader2 className="h-4 w-4 animate-spin text-primary inline-block ml-2" />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ManagePlans;
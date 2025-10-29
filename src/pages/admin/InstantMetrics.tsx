import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, Loader2, AlertTriangle, Save, Utensils } from 'lucide-react';
import { useAdminRestaurants } from '@/hooks/useAdminRestaurants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { useQueryClient } from '@tanstack/react-query';

interface RestaurantFollower {
  id: string;
  name: string;
  category: string | null;
  followers_override: number | null;
}

const InstantMetrics: React.FC = () => {
  const { restaurants, isLoading, error, refetch } = useAdminRestaurants();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempFollowers, setTempFollowers] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = (restaurant: RestaurantFollower) => {
    setEditingId(restaurant.id);
    setTempFollowers(restaurant.followers_override || 0);
  };

  const handleSave = async (restaurantId: string) => {
    if (tempFollowers === null || tempFollowers < 0) {
      showError("A contagem de seguidores deve ser um número positivo.");
      return;
    }
    
    setIsSaving(true);
    
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({ followers_override: tempFollowers })
        .eq('id', restaurantId);

      if (error) throw new Error(error.message);

      showSuccess("Contagem de seguidores atualizada com sucesso!");
      setEditingId(null);
      setTempFollowers(null);
      
      // Força o refetch da lista de restaurantes
      queryClient.invalidateQueries({ queryKey: ['adminRestaurants'] });
      refetch();
      
    } catch (e) {
      showError(`Falha ao salvar: ${(e as Error).message}`);
    } finally {
      setIsSaving(false);
    }
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
          <Users className="w-6 h-6" /> Gerenciar Seguidores (Métricas Instantâneas)
        </CardTitle>
        <CardDescription>Defina manualmente a contagem de seguidores para fins de destaque e teste.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Restaurante</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seguidores (Override)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {restaurants.map((restaurant) => {
                const isEditing = editingId === restaurant.id;
                return (
                  <tr key={restaurant.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 truncate max-w-[150px]">
                      {restaurant.name}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Utensils className="w-3 h-3 mr-1 inline" /> {restaurant.category || 'Não definido'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {isEditing ? (
                        <Input
                          type="number"
                          value={tempFollowers === null ? '' : tempFollowers}
                          onChange={(e) => setTempFollowers(parseInt(e.target.value) || 0)}
                          min="0"
                          className="w-24 h-8 text-sm"
                          disabled={isSaving}
                        />
                      ) : (
                        <span className="font-bold">{restaurant.followers_override || 0}</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {isEditing ? (
                        <Button
                          size="sm"
                          onClick={() => handleSave(restaurant.id)}
                          disabled={isSaving}
                          className="bg-green-600 hover:bg-green-700 flex items-center gap-1"
                        >
                          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Salvar
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(restaurant as RestaurantFollower)}
                          disabled={isSaving}
                          className="text-primary border-primary hover:bg-primary/5"
                        >
                          Editar
                        </Button>
                      )}
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

export default InstantMetrics;
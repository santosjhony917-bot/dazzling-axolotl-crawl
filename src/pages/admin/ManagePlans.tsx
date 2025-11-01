"use client";

import React, { useState } from 'react';
import { useAdminRestaurants } from '@/hooks/useAdminRestaurants';
import { Restaurant, RestaurantPlan } from '@/types/supabase'; // Importando o tipo correto
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

const ManagePlans: React.FC = () => {
  const { restaurants, isLoading, updateRestaurantPlan, isUpdatingPlan, updateRestaurantFollowersOverride, isUpdatingFollowers } = useAdminRestaurants();
  const [editingFollowersId, setEditingFollowersId] = useState<string | null>(null);
  const [newFollowersCount, setNewFollowersCount] = useState<number>(0);

  const handleUpdatePlan = async (restaurantId: string, newPlan: RestaurantPlan) => {
    await updateRestaurantPlan({ id: restaurantId, plan: newPlan });
  };

  const handleEditFollowers = (restaurant: Restaurant) => {
    setEditingFollowersId(restaurant.id);
    setNewFollowersCount(restaurant.followers_override || 0);
  };

  const handleSaveFollowers = async (restaurantId: string) => {
    await updateRestaurantFollowersOverride({ id: restaurantId, followers_override: newFollowersCount });
    setEditingFollowersId(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold text-[#022D68] mb-6">Gerenciar Planos e Seguidores</h1>

      <Card>
        <CardHeader>
          <CardTitle>Restaurantes</CardTitle>
          <CardDescription>Gerencie os planos de assinatura e a contagem de seguidores dos restaurantes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome do Restaurante
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plano Atual
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alterar Plano
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Seguidores (Override)
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {restaurants.map((restaurant) => (
                  <tr key={restaurant.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {restaurant.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Badge variant={restaurant.plan === 'premium' ? 'default' : 'outline'}>
                        {restaurant.plan}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Select
                        value={restaurant.plan}
                        onValueChange={(value: RestaurantPlan) => handleUpdatePlan(restaurant.id, value)}
                        disabled={isUpdatingPlan}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Selecionar Plano" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="basic">Basic</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editingFollowersId === restaurant.id ? (
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            value={newFollowersCount}
                            onChange={(e) => setNewFollowersCount(parseInt(e.target.value))}
                            className="w-24"
                          />
                          <Button size="sm" onClick={() => handleSaveFollowers(restaurant.id)} disabled={isUpdatingFollowers}>
                            {isUpdatingFollowers ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setEditingFollowersId(null)}>
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span>{restaurant.followers_override || 0}</span>
                          <Button variant="outline" size="sm" onClick={() => handleEditFollowers(restaurant)}>
                            Editar
                          </Button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {/* Ações adicionais aqui, se necessário */}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManagePlans;
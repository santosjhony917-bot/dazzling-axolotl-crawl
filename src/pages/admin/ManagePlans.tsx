import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Crown, Loader2, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

const planColors: Record<string, string> = {
  free: 'bg-gray-200 text-gray-700',
  premium: 'bg-yellow-100 text-yellow-800',
  premium_gift: 'bg-green-100 text-green-700',
};

const planLabels: Record<string, string> = {
  free: 'Gratuito',
  premium: 'Premium (Assinante)',
  premium_gift: 'Premium (Cortesia)',
};

const ManagePlans: React.FC = () => {
  const [filters, setFilters] = useState({ city: '', neighborhood: '' });
  const [cityInput, setCityInput] = useState('');
  const [neighborhoodInput, setNeighborhoodInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce text filters
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({
        city: cityInput,
        neighborhood: neighborhoodInput
      });
      setCurrentPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [cityInput, neighborhoodInput]);

  const {
    restaurants,
    totalCount,
    isLoading,
    error,
    updatePlan,
    isUpdatingPlan,
    updateMultiplePlans,
    isUpdatingMultiplePlans,
  } = useAdminRestaurants({
    ...filters,
    page: currentPage,
    pageSize: 15
  });

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkPlan, setBulkPlan] = useState<RestaurantPlan | ''>('');

  // Clear selections on page/filter change
  useEffect(() => {
    setSelectedIds([]);
  }, [currentPage, filters]);

  const itemsPerPage = 15;
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const activePage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));
  const startIndex = (activePage - 1) * itemsPerPage;

  const handlePlanChange = (restaurantId: string, newPlan: string) => {
    setUpdatingId(restaurantId);
    updatePlan({ restaurantId, newPlan: newPlan as RestaurantPlan }, {
      onSettled: () => setUpdatingId(null),
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(restaurants.filter(r => r.plan !== 'premium').map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    }
  };

  const handleBulkUpdate = () => {
    if (selectedIds.length > 0 && bulkPlan) {
      updateMultiplePlans({ restaurantIds: selectedIds, newPlan: bulkPlan }, {
        onSuccess: () => {
          setSelectedIds([]);
          setBulkPlan('');
        },
      });
    }
  };

  const allSelected = useMemo(() => {
    const selectableRestaurants = restaurants.filter(r => r.plan !== 'premium');
    return selectableRestaurants.length > 0 && selectedIds.length === selectableRestaurants.length;
  }, [restaurants, selectedIds]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="shadow-none border-none rounded-2xl bg-white p-6">
        <AlertTriangle className="h-6 w-6 text-red-500 mx-auto mb-3" />
        <p className="text-red-600 text-center">Erro ao carregar restaurantes: {error.message}</p>
      </Card>
    );
  }

  return (
    <Card className="shadow-none border-none rounded-2xl bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl text-primary">
          <Crown className="w-6 h-6" /> Gerenciar Planos
        </CardTitle>
        <CardDescription>Total de {totalCount} restaurantes cadastrados. Altere o plano de assinatura abaixo.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              placeholder="Filtrar por cidade..."
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              disabled={isLoading}
            />
            <Input
              placeholder="Filtrar por bairro..."
              value={neighborhoodInput}
              onChange={(e) => setNeighborhoodInput(e.target.value)}
              disabled={isLoading}
            />
          </div>
          {selectedIds.length > 0 && (
            <div className="p-4 bg-gray-50 rounded-lg flex items-center gap-4 border">
              <p className="text-sm font-medium">{selectedIds.length} restaurante(s) selecionado(s).</p>
              <Select value={bulkPlan} onValueChange={(value) => setBulkPlan(value as RestaurantPlan)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecione um novo plano" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(planLabels)
                    .filter(([key]) => key !== 'premium')
                    .map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button onClick={handleBulkUpdate} disabled={!bulkPlan || isUpdatingMultiplePlans}>
                {isUpdatingMultiplePlans ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aplicar a Todos'}
              </Button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Selecionar todos"
                    disabled={restaurants.length === 0}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Restaurante</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Local</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plano Atual</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {restaurants.map((restaurant) => {
                const isCurrentlyUpdating = isUpdatingPlan && updatingId === restaurant.id;
                return (
                  <tr key={restaurant.id} className={cn("hover:bg-gray-50 transition-colors", selectedIds.includes(restaurant.id) && "bg-blue-50")}>
                    <td className="px-4 py-4">
                      <Checkbox
                        checked={selectedIds.includes(restaurant.id)}
                        onCheckedChange={(checked) => handleSelectRow(restaurant.id, !!checked)}
                        aria-label={`Selecionar ${restaurant.name}`}
                        disabled={restaurant.plan === 'premium'}
                      />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 truncate max-w-[150px]">
                      {restaurant.name}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {[restaurant.neighborhood, restaurant.city].filter(Boolean).join(', ')}
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
                        disabled={isCurrentlyUpdating || isUpdatingMultiplePlans || restaurant.plan === 'premium'}
                      >
                        <SelectTrigger 
                          className={cn("w-[180px] h-9 rounded-lg", restaurant.plan === 'premium' && "opacity-80 cursor-not-allowed")}
                          title={restaurant.plan === 'premium' ? "Assinatura ativa do Premium (Assinante) - não pode ser alterada manualmente" : undefined}
                        >
                          <SelectValue placeholder="Alterar Plano" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(planLabels)
                            .filter(([key]) => key !== 'premium' || restaurant.plan === 'premium')
                            .map(([key, label]) => (
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl mt-4">
            <div className="text-sm text-gray-500 font-medium">
              Exibindo <span className="font-semibold text-primary">{startIndex + 1}</span> a{' '}
              <span className="font-semibold text-primary">
                {Math.min(startIndex + itemsPerPage, totalCount)}
              </span>{' '}
              de <span className="font-semibold text-primary">{totalCount}</span> restaurantes
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={activePage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-xs font-bold text-gray-600 px-2">
                Página {activePage} de {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={activePage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ManagePlans;
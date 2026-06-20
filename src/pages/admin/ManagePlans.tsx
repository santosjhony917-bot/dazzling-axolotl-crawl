import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Crown, Loader2, AlertTriangle, ChevronLeft, ChevronRight, Percent, Shuffle, Map, HelpCircle, Check, RefreshCw } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError } from '@/utils/toast';

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

// Helper for Largest Remainder Method distribution
const distributeCounts = (total: number, pctFree: number, pctPremium: number, pctGift: number) => {
  if (total <= 0) return { free: 0, premium: 0, premium_gift: 0 };
  
  // Calculate initial floor counts
  let freeCount = Math.floor((total * pctFree) / 100);
  let premiumCount = Math.floor((total * pctPremium) / 100);
  let giftCount = Math.floor((total * pctGift) / 100);
  
  let allocated = freeCount + premiumCount + giftCount;
  let remaining = total - allocated;
  
  // Distribute remainder based on fractional parts
  if (remaining > 0) {
    const fractions = [
      { plan: 'free', frac: ((total * pctFree) / 100) - freeCount },
      { plan: 'premium', frac: ((total * pctPremium) / 100) - premiumCount },
      { plan: 'premium_gift', frac: ((total * pctGift) / 100) - giftCount },
    ];
    
    fractions.sort((a, b) => b.frac - a.frac);
    
    for (let i = 0; i < remaining; i++) {
      const planToIncrement = fractions[i % fractions.length].plan;
      if (planToIncrement === 'free') freeCount++;
      else if (planToIncrement === 'premium') premiumCount++;
      else if (planToIncrement === 'premium_gift') giftCount++;
    }
  }
  
  return {
    free: freeCount,
    premium: premiumCount,
    premium_gift: giftCount
  };
};

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const ManagePlans: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'manual' | 'percentage'>('manual');

  // --- Tab 1: Manual/Bulk Select State ---
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


  // --- Tab 2: Percentage Bulk State & Logic ---
  const [cities, setCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [pctFree, setPctFree] = useState<number>(33);
  const [pctPremium, setPctPremium] = useState<number>(33);
  const [pctGift, setPctGift] = useState<number>(34);
  const [strategy, setStrategy] = useState<'random' | 'neighborhood'>('random');
  
  const [cityRestaurants, setCityRestaurants] = useState<Restaurant[]>([]);
  const [isFetchingCityRestaurants, setIsFetchingCityRestaurants] = useState<boolean>(false);
  
  const [previewUpdates, setPreviewUpdates] = useState<{ id: string; name: string; neighborhood: string; oldPlan: string; newPlan: string }[]>([]);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [isApplyingPercentage, setIsApplyingPercentage] = useState<boolean>(false);
  const [showFullPreviewList, setShowFullPreviewList] = useState<boolean>(false);

  // Fetch unique cities for selector
  const loadCities = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('city')
        .not('city', 'is', null);
        
      if (error) throw error;
      
      const uniqueCities = Array.from(new Set(data.map(r => r.city.trim())))
        .filter(Boolean)
        .sort();
      setCities(uniqueCities);
      if (uniqueCities.length > 0 && !selectedCity) {
        setSelectedCity(uniqueCities[0]);
      }
    } catch (err: any) {
      console.error("Erro ao carregar cidades para lote:", err);
    }
  };

  useEffect(() => {
    loadCities();
  }, []);

  // Fetch restaurants in selected city
  useEffect(() => {
    if (!selectedCity) return;
    
    const loadCityRestaurants = async () => {
      setIsFetchingCityRestaurants(true);
      try {
        const { data, error } = await supabase
          .from('restaurants')
          .select('*')
          .eq('city', selectedCity);
          
        if (error) throw error;
        setCityRestaurants(data || []);
        // Reset preview when city changes
        setPreviewUpdates([]);
        setShowPreview(false);
      } catch (err: any) {
        showError("Erro ao carregar restaurantes da cidade: " + err.message);
      } finally {
        setIsFetchingCityRestaurants(false);
      }
    };
    
    loadCityRestaurants();
  }, [selectedCity]);

  // Sum of percentages validation
  const sumPct = pctFree + pctPremium + pctGift;
  const isPctValid = sumPct === 100;

  // Run simulation/preview
  const handleSimulatePercentage = () => {
    if (!isPctValid) {
      showError(`A soma dos percentuais deve ser exatamente 100%. Atual: ${sumPct}%`);
      return;
    }
    
    if (cityRestaurants.length === 0) {
      showError("Nenhum restaurante encontrado nesta cidade para distribuir.");
      return;
    }
    
    let updates: { id: string; name: string; neighborhood: string; oldPlan: string; newPlan: string }[] = [];
    
    if (strategy === 'random') {
      const shuffled = shuffleArray(cityRestaurants);
      const counts = distributeCounts(shuffled.length, pctFree, pctPremium, pctGift);
      
      let index = 0;
      // Free
      for (let i = 0; i < counts.free; i++) {
        if (index >= shuffled.length) break;
        const r = shuffled[index++];
        updates.push({ id: r.id, name: r.name, neighborhood: r.neighborhood || 'N/A', oldPlan: r.plan, newPlan: 'free' });
      }
      // Premium
      for (let i = 0; i < counts.premium; i++) {
        if (index >= shuffled.length) break;
        const r = shuffled[index++];
        updates.push({ id: r.id, name: r.name, neighborhood: r.neighborhood || 'N/A', oldPlan: r.plan, newPlan: 'premium' });
      }
      // Premium Cortesia (gift)
      for (let i = 0; i < counts.premium_gift; i++) {
        if (index >= shuffled.length) break;
        const r = shuffled[index++];
        updates.push({ id: r.id, name: r.name, neighborhood: r.neighborhood || 'N/A', oldPlan: r.plan, newPlan: 'premium_gift' });
      }
    } else {
      // Group by neighborhood
      const nhGroups: Record<string, Restaurant[]> = {};
      cityRestaurants.forEach(r => {
        const nh = r.neighborhood || 'Sem Bairro';
        if (!nhGroups[nh]) nhGroups[nh] = [];
        nhGroups[nh].push(r);
      });
      
      // Distribute in each neighborhood group
      Object.entries(nhGroups).forEach(([nh, list]) => {
        const shuffled = shuffleArray(list);
        const counts = distributeCounts(shuffled.length, pctFree, pctPremium, pctGift);
        
        let index = 0;
        // Free
        for (let i = 0; i < counts.free; i++) {
          if (index >= shuffled.length) break;
          const r = shuffled[index++];
          updates.push({ id: r.id, name: r.name, neighborhood: nh, oldPlan: r.plan, newPlan: 'free' });
        }
        // Premium
        for (let i = 0; i < counts.premium; i++) {
          if (index >= shuffled.length) break;
          const r = shuffled[index++];
          updates.push({ id: r.id, name: r.name, neighborhood: nh, oldPlan: r.plan, newPlan: 'premium' });
        }
        // Premium Cortesia (gift)
        for (let i = 0; i < counts.premium_gift; i++) {
          if (index >= shuffled.length) break;
          const r = shuffled[index++];
          updates.push({ id: r.id, name: r.name, neighborhood: nh, oldPlan: r.plan, newPlan: 'premium_gift' });
        }
      });
    }
    
    setPreviewUpdates(updates);
    setShowPreview(true);
    showSuccess("Simulação realizada! Revise a distribuição e clique em 'Aplicar Alterações' para salvar.");
  };

  // Apply simulated updates to database
  const handleApplyPercentage = async () => {
    if (previewUpdates.length === 0) return;
    
    setIsApplyingPercentage(true);
    try {
      const freeIds = previewUpdates.filter(u => u.newPlan === 'free').map(u => u.id);
      const premiumIds = previewUpdates.filter(u => u.newPlan === 'premium').map(u => u.id);
      const giftIds = previewUpdates.filter(u => u.newPlan === 'premium_gift').map(u => u.id);
      
      let totalUpdated = 0;
      
      if (freeIds.length > 0) {
        const { error } = await supabase
          .from('restaurants')
          .update({ plan: 'free' })
          .in('id', freeIds);
        if (error) throw error;
        totalUpdated += freeIds.length;
      }
      
      if (premiumIds.length > 0) {
        const { error } = await supabase
          .from('restaurants')
          .update({ plan: 'premium' })
          .in('id', premiumIds);
        if (error) throw error;
        totalUpdated += premiumIds.length;
      }
      
      if (giftIds.length > 0) {
        const { error } = await supabase
          .from('restaurants')
          .update({ plan: 'premium_gift' })
          .in('id', giftIds);
        if (error) throw error;
        totalUpdated += giftIds.length;
      }
      
      showSuccess(`Sucesso! Planos atualizados em lote para ${totalUpdated} restaurantes em ${selectedCity}.`);
      
      // Clear preview and reload
      setPreviewUpdates([]);
      setShowPreview(false);
      
      // Reload current city restaurants
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('city', selectedCity);
      if (!error && data) {
        setCityRestaurants(data);
      }
      
      // Invalidate react-query cache
      queryClient.invalidateQueries({ queryKey: ['adminRestaurants'] });
    } catch (err: any) {
      showError("Erro ao aplicar planos em lote: " + err.message);
    } finally {
      setIsApplyingPercentage(false);
    }
  };

  // Group previews by neighborhood for display
  const previewByNeighborhood = useMemo(() => {
    const breakdown: Record<string, { total: number; free: number; premium: number; gift: number }> = {};
    previewUpdates.forEach(item => {
      const nh = item.neighborhood;
      if (!breakdown[nh]) {
        breakdown[nh] = { total: 0, free: 0, premium: 0, gift: 0 };
      }
      breakdown[nh].total++;
      if (item.newPlan === 'free') breakdown[nh].free++;
      else if (item.newPlan === 'premium') breakdown[nh].premium++;
      else if (item.newPlan === 'premium_gift') breakdown[nh].gift++;
    });
    return Object.entries(breakdown).sort((a, b) => a[0].localeCompare(b[0]));
  }, [previewUpdates]);

  const previewSummary = useMemo(() => {
    const free = previewUpdates.filter(u => u.newPlan === 'free').length;
    const premium = previewUpdates.filter(u => u.newPlan === 'premium').length;
    const gift = previewUpdates.filter(u => u.newPlan === 'premium_gift').length;
    return { free, premium, gift };
  }, [previewUpdates]);


  if (isLoading && activeTab === 'manual') {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && activeTab === 'manual') {
    return (
      <Card className="shadow-none border border-slate-100 rounded-2xl bg-white p-6">
        <AlertTriangle className="h-6 w-6 text-red-500 mx-auto mb-3" />
        <p className="text-red-600 text-center font-medium">Erro ao carregar restaurantes: {error.message}</p>
      </Card>
    );
  }

  return (
    <Card className="shadow-none border border-slate-100 rounded-2xl bg-white">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl text-primary font-bold">
              <Crown className="w-6 h-6 text-primary" /> Gerenciar Planos
            </CardTitle>
            <CardDescription>
              {activeTab === 'manual' 
                ? `Total de ${totalCount} restaurantes cadastrados no filtro. Altere o plano de assinatura manualmente.`
                : `Gerenciamento em lotes por distribuição percentual na cidade selecionada.`}
            </CardDescription>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-100 mt-6 mb-2">
          <button
            className={cn(
              "py-2.5 px-4 text-sm font-semibold border-b-2 transition-colors relative -bottom-[2px]",
              activeTab === 'manual' 
                ? "border-primary text-primary" 
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
            onClick={() => setActiveTab('manual')}
          >
            Distribuição Manual
          </button>
          <button
            className={cn(
              "py-2.5 px-4 text-sm font-semibold border-b-2 transition-colors relative -bottom-[2px] flex items-center gap-1.5",
              activeTab === 'percentage' 
                ? "border-primary text-primary" 
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
            onClick={() => setActiveTab('percentage')}
          >
            <Percent className="w-4 h-4" /> Distribuição em Lote (Percentual)
          </button>
        </div>
      </CardHeader>

      <CardContent>
        {activeTab === 'manual' ? (
          // --- Tab 1 Content: Manual Table view ---
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                placeholder="Filtrar por cidade..."
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                disabled={isLoading}
                className="rounded-xl border-slate-200"
              />
              <Input
                placeholder="Filtrar por bairro..."
                value={neighborhoodInput}
                onChange={(e) => setNeighborhoodInput(e.target.value)}
                disabled={isLoading}
                className="rounded-xl border-slate-200"
              />
            </div>
            {selectedIds.length > 0 && (
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-wrap items-center gap-4 animate-in fade-in duration-200">
                <p className="text-sm font-medium text-slate-700">{selectedIds.length} restaurante(s) selecionado(s).</p>
                <Select value={bulkPlan} onValueChange={(value) => setBulkPlan(value as RestaurantPlan)}>
                  <SelectTrigger className="w-[200px] rounded-xl border-slate-200 bg-white">
                    <SelectValue placeholder="Selecione um novo plano" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {Object.entries(planLabels)
                      .filter(([key]) => key !== 'premium')
                      .map(([key, label]) => (
                        <SelectItem key={key} value={key} className="rounded-lg">
                          {label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleBulkUpdate} 
                  disabled={!bulkPlan || isUpdatingMultiplePlans}
                  className="rounded-xl"
                >
                  {isUpdatingMultiplePlans ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aplicar a Todos'}
                </Button>
              </div>
            )}
            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-4 py-3 text-left w-12">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Selecionar todos"
                        disabled={restaurants.length === 0}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Restaurante</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Local</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Plano Atual</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {restaurants.map((restaurant) => {
                    const isCurrentlyUpdating = isUpdatingPlan && updatingId === restaurant.id;
                    return (
                      <tr key={restaurant.id} className={cn("hover:bg-slate-50/30 transition-colors", selectedIds.includes(restaurant.id) && "bg-indigo-50/30")}>
                        <td className="px-4 py-4">
                          <Checkbox
                            checked={selectedIds.includes(restaurant.id)}
                            onCheckedChange={(checked) => handleSelectRow(restaurant.id, !!checked)}
                            aria-label={`Selecionar ${restaurant.name}`}
                            disabled={restaurant.plan === 'premium'}
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-slate-800 truncate max-w-[180px]">
                          {restaurant.name}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-500">
                          {[restaurant.neighborhood, restaurant.city].filter(Boolean).join(', ')}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Badge className={cn("font-bold text-[10px] rounded-full uppercase tracking-wider px-2 py-0.5", planColors[restaurant.plan])}>
                            {planLabels[restaurant.plan]}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <Select 
                              onValueChange={(value) => handlePlanChange(restaurant.id, value)}
                              value={restaurant.plan}
                              disabled={isCurrentlyUpdating || isUpdatingMultiplePlans || restaurant.plan === 'premium'}
                            >
                              <SelectTrigger 
                                className={cn("w-[180px] h-9 rounded-xl border-slate-200 bg-white", restaurant.plan === 'premium' && "opacity-80 cursor-not-allowed")}
                                title={restaurant.plan === 'premium' ? "Assinatura ativa do Premium (Assinante) - não pode ser alterada manualmente" : undefined}
                              >
                                <SelectValue placeholder="Alterar Plano" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {Object.entries(planLabels)
                                  .filter(([key]) => key !== 'premium' || restaurant.plan === 'premium')
                                  .map(([key, label]) => (
                                    <SelectItem key={key} value={key} className={cn("rounded-lg", planColors[key as RestaurantPlan])}>
                                      {label}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            {isCurrentlyUpdating && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border border-slate-100 bg-slate-50/50 rounded-2xl mt-4">
                <div className="text-xs text-slate-500 font-medium">
                  Exibindo <span className="font-bold text-primary">{startIndex + 1}</span> a{' '}
                  <span className="font-bold text-primary">
                    {Math.min(startIndex + itemsPerPage, totalCount)}
                  </span>{' '}
                  de <span className="font-bold text-primary">{totalCount}</span> restaurantes
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={activePage === 1}
                    className="h-8 w-8 p-0 rounded-xl border-slate-200 bg-white"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-xs font-bold text-slate-700 px-2">
                    Página {activePage} de {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={activePage === totalPages}
                    className="h-8 w-8 p-0 rounded-xl border-slate-200 bg-white"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          // --- Tab 2 Content: Percentage distribution ---
          <div className="space-y-6">
            <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-6 space-y-6">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Parâmetros de Distribuição em Lote</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. City Select */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 block flex items-center gap-1.5">
                    <Map className="w-3.5 h-3.5 text-slate-400" /> Cidade Alvo
                  </label>
                  <div className="flex gap-2">
                    <Select value={selectedCity} onValueChange={setSelectedCity} disabled={isFetchingCityRestaurants || isApplyingPercentage}>
                      <SelectTrigger className="w-full rounded-xl border-slate-200 bg-white font-medium">
                        <SelectValue placeholder="Selecione a cidade" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {cities.map(c => (
                          <SelectItem key={c} value={c} className="rounded-lg">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={loadCities}
                      disabled={isFetchingCityRestaurants || isApplyingPercentage}
                      title="Recarregar Cidades"
                      className="rounded-xl border-slate-200 bg-white"
                    >
                      <RefreshCw className="w-4 h-4 text-slate-500" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium px-1">
                    {isFetchingCityRestaurants 
                      ? "Carregando restaurantes..." 
                      : `${cityRestaurants.length} restaurantes ativos nesta cidade.`}
                  </p>
                </div>

                {/* 2. Strategy Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 block flex items-center gap-1.5">
                    <Shuffle className="w-3.5 h-3.5 text-slate-400" /> Método de Divisão
                  </label>
                  <Select value={strategy} onValueChange={(value) => setStrategy(value as any)} disabled={isApplyingPercentage}>
                    <SelectTrigger className="w-full rounded-xl border-slate-200 bg-white font-medium">
                      <SelectValue placeholder="Selecione a estratégia" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="random" className="rounded-lg">Aleatório (Global na Cidade)</SelectItem>
                      <SelectItem value="neighborhood" className="rounded-lg">Rateado Proporcional por Bairros</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-slate-400 font-medium px-1">
                    {strategy === 'random' 
                      ? "Divide os planos aleatoriamente na cidade toda conforme os percentuais." 
                      : "Garante a proporção inserida individualmente dentro de cada bairro."}
                  </p>
                </div>

                {/* 3. Validation Badge */}
                <div className="flex items-end justify-start pb-1">
                  <div className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-bold w-full",
                    isPctValid 
                      ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                      : "bg-red-50 border-red-100 text-red-700 animate-pulse"
                  )}>
                    {isPctValid ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Soma Válida (100%)</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4" />
                        <span>Soma Inválida (Soma: {sumPct}%, Deve ser 100%)</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Percentages Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                {/* Free Pct */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 block">
                    Percentual Gratuito (Free)
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={pctFree}
                      onChange={(e) => setPctFree(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                      disabled={isApplyingPercentage}
                      className="rounded-xl border-slate-200 pr-8"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">%</span>
                  </div>
                </div>

                {/* Premium Pct */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 block">
                    Percentual Premium (Assinante)
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={pctPremium}
                      onChange={(e) => setPctPremium(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                      disabled={isApplyingPercentage}
                      className="rounded-xl border-slate-200 pr-8"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">%</span>
                  </div>
                </div>

                {/* Premium Gift (Cortesia) Pct */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 block">
                    Percentual Premium Cortesia
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={pctGift}
                      onChange={(e) => setPctGift(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                      disabled={isApplyingPercentage}
                      className="rounded-xl border-slate-200 pr-8"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">%</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  onClick={handleSimulatePercentage}
                  disabled={!isPctValid || cityRestaurants.length === 0 || isFetchingCityRestaurants || isApplyingPercentage}
                  variant="outline"
                  className="rounded-xl border-slate-200 bg-white"
                >
                  {isFetchingCityRestaurants ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                  Simular Distribuição
                </Button>
                {showPreview && (
                  <Button
                    onClick={handleApplyPercentage}
                    disabled={isApplyingPercentage || previewUpdates.length === 0}
                    className="rounded-xl bg-primary text-white hover:bg-primary/95"
                  >
                    {isApplyingPercentage ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                        Salvando Alterações...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-1.5" />
                        Aplicar Alterações
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* PREVIEW CONTAINER */}
            {showPreview && (
              <div className="space-y-6 border border-slate-100 rounded-2xl p-6 animate-in fade-in duration-200 bg-white">
                <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Simulação do Resultado</h3>
                    <p className="text-xs text-slate-500 mt-1">Veja como ficará a distribuição dos planos antes de salvar no banco.</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold bg-slate-50 border px-4 py-2 rounded-2xl text-slate-600">
                    <div>Gratuito: <span className="font-bold text-slate-800">{previewSummary.free} ({Math.round((previewSummary.free / previewUpdates.length) * 100)}%)</span></div>
                    <div>Premium: <span className="font-bold text-slate-800">{previewSummary.premium} ({Math.round((previewSummary.premium / previewUpdates.length) * 100)}%)</span></div>
                    <div>Cortesia: <span className="font-bold text-slate-800">{previewSummary.gift} ({Math.round((previewSummary.gift / previewUpdates.length) * 100)}%)</span></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Box: Neighborhood Breakdown */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Rateio por Bairros ({previewByNeighborhood.length} bairros)</h4>
                    <div className="overflow-x-auto border border-slate-100 rounded-2xl max-h-[350px]">
                      <table className="min-w-full divide-y divide-slate-100 text-xs">
                        <thead>
                          <tr className="bg-slate-50/50 font-bold text-slate-500">
                            <th className="px-3 py-2.5 text-left">Bairro</th>
                            <th className="px-3 py-2.5 text-center">Total</th>
                            <th className="px-3 py-2.5 text-center">Free</th>
                            <th className="px-3 py-2.5 text-center">Premium</th>
                            <th className="px-3 py-2.5 text-center">Cortesia</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {previewByNeighborhood.map(([nh, item]) => (
                            <tr key={nh} className="hover:bg-slate-50/30">
                              <td className="px-3 py-2.5 font-semibold text-slate-700">{nh}</td>
                              <td className="px-3 py-2.5 text-center font-bold text-slate-800 bg-slate-50/50">{item.total}</td>
                              <td className="px-3 py-2.5 text-center text-slate-600">{item.free}</td>
                              <td className="px-3 py-2.5 text-center text-slate-600">{item.premium}</td>
                              <td className="px-3 py-2.5 text-center text-slate-600">{item.gift}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Box: Change List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Lista de Alterações</h4>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowFullPreviewList(!showFullPreviewList)}
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
                      >
                        {showFullPreviewList ? "Mostrar Menos" : `Ver Todos (${previewUpdates.length})`}
                      </Button>
                    </div>

                    <div className="overflow-y-auto border border-slate-100 rounded-2xl max-h-[350px] bg-slate-50/30 p-2 space-y-1.5">
                      {(showFullPreviewList ? previewUpdates : previewUpdates.slice(0, 10)).map((item, idx) => {
                        const hasChanged = item.oldPlan !== item.newPlan;
                        return (
                          <div key={item.id} className="bg-white border border-slate-100 rounded-xl p-3 flex justify-between items-center text-xs shadow-sm">
                            <div className="max-w-[50%]">
                              <div className="font-bold text-slate-800 truncate" title={item.name}>{item.name}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5 truncate">{item.neighborhood}</div>
                            </div>
                            <div className="flex items-center gap-1.5 font-medium">
                              <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border">{planLabels[item.oldPlan]}</span>
                              <span className="text-slate-400 shrink-0">➔</span>
                              <span className={cn(
                                "text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider",
                                planColors[item.newPlan],
                                hasChanged ? "ring-2 ring-indigo-500/10 shadow-sm" : ""
                              )}>
                                {planLabels[item.newPlan]}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {!showFullPreviewList && previewUpdates.length > 10 && (
                        <div className="text-center p-3 text-[11px] font-medium text-slate-400 bg-white border border-dashed rounded-xl">
                          Mais {previewUpdates.length - 10} restaurantes simulados ocultados... clique em "Ver Todos" para expandir.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ManagePlans;
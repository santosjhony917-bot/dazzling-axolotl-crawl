import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, CreditCard, Gift, Ban, TrendingUp, AlertCircle, ArrowUpRight, DollarSign, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function CitySubscriptions() {
  const { cityId } = useParams();
  const [city, setCity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all'); // 'all', 'pago', 'cortesia'

  useEffect(() => {
    async function loadData() {
      if (!cityId) return;
      setLoading(true);
      try {
        // 1. Fetch city info
        const { data: cityData, error: cityError } = await supabase
          .from('expansion_projects')
          .select('*')
          .eq('slug', cityId)
          .single();

        if (cityError) throw cityError;
        setCity(cityData);

        // 2. Fetch restaurants in this city
        const { data: restData, error: restError } = await supabase
          .from('restaurants')
          .select('id, name, plan, created_at')
          .eq('city', cityData.name)
          .eq('state', cityData.state);

        if (restError) throw restError;

        const restaurantIds = (restData || []).map((r: any) => r.id);
        const crmStageByRestaurant: Record<string, string> = {};
        if (restaurantIds.length > 0) {
          const { data: crmRows, error: crmError } = await supabase
            .from('commercial_leads')
            .select('restaurant_id, pipeline_stage')
            .in('restaurant_id', restaurantIds);
          if (crmError) throw crmError;
          (crmRows || []).forEach((lead: any) => {
            crmStageByRestaurant[lead.restaurant_id] = lead.pipeline_stage;
          });
        }

        setRestaurants((restData || []).map((restaurant: any) => ({
          ...restaurant,
          crm_stage: crmStageByRestaurant[restaurant.id] || 'Sem CRM',
        })));
      } catch (err: any) {
        console.error('Error loading subscriptions data:', err);
        toast.error('Erro ao carregar dados financeiros: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [cityId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="ml-2 text-sm text-slate-500 font-medium">Carregando dados financeiros...</span>
      </div>
    );
  }

  if (!city) return null;

  // Filter lists
  const premiumPagantes = restaurants.filter(r => r.plan === 'premium');
  const premiumCortesias = restaurants.filter(r => r.plan === 'premium_gift' || r.plan === 'premium_cortesia');
  const freeLeads = restaurants.filter(r => !r.plan || r.plan === 'free');

  // MRR
  const mrr = premiumPagantes.length * 49.90;

  // Search and filter logic
  const filtered = restaurants.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase());
    
    if (filterType === 'pago') {
      return matchesSearch && r.plan === 'premium';
    }
    if (filterType === 'cortesia') {
      return matchesSearch && (r.plan === 'premium_gift' || r.plan === 'premium_cortesia');
    }
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Painel Financeiro ({city.name} - {city.state})</h2>
          <p className="text-sm text-slate-500">Gestão de MRR, retenção e saúde financeira da cidade.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm rounded-xl bg-slate-900 text-white">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">MRR Atual</p>
              <p className="text-2xl font-black text-emerald-400">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(mrr)}
              </p>
            </div>
            <div className="p-3 bg-slate-800 text-emerald-400 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-xl">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Premium (Pagantes)</p>
              <p className="text-2xl font-black text-slate-900">{premiumPagantes.length}</p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
              <CreditCard className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-xl">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Premium (Cortesia)</p>
              <p className="text-2xl font-black text-slate-900">{premiumCortesias.length}</p>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <Gift className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-xl">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Leads Free</p>
              <p className="text-2xl font-black text-slate-900">{freeLeads.length}</p>
            </div>
            <div className="p-3 bg-slate-50 text-slate-500 rounded-lg">
              <Ban className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Lista de Assinaturas */}
        <div className="lg:col-span-2">
          <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-slate-50">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar restaurante..."
                  className="pl-9 h-9 border-slate-200 text-sm bg-white"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <Badge 
                  variant={filterType === 'all' ? 'default' : 'outline'} 
                  className="cursor-pointer font-semibold py-1 px-2.5"
                  onClick={() => setFilterType('all')}
                >
                  Todos
                </Badge>
                <Badge 
                  variant={filterType === 'pago' ? 'default' : 'outline'} 
                  className="cursor-pointer font-semibold py-1 px-2.5"
                  onClick={() => setFilterType('pago')}
                >
                  Pagantes
                </Badge>
                <Badge 
                  variant={filterType === 'cortesia' ? 'default' : 'outline'} 
                  className="cursor-pointer font-semibold py-1 px-2.5"
                  onClick={() => setFilterType('cortesia')}
                >
                  Cortesias
                </Badge>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-white hover:bg-white border-slate-100">
                    <TableHead className="font-bold text-slate-500">Estabelecimento</TableHead>
                    <TableHead className="font-bold text-slate-500">Plano</TableHead>
                    <TableHead className="font-bold text-slate-500">Mensalidade</TableHead>
                    <TableHead className="font-bold text-slate-500">Status CRM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-slate-500 font-medium">
                        Nenhum registro encontrado para os filtros selecionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((r) => {
                      const isPago = r.plan === 'premium';
                      const isCortesia = r.plan === 'premium_gift' || r.plan === 'premium_cortesia';
                      
                      let planText = 'Free';
                      let planColor = 'text-slate-500';
                      let valText = 'R$ 0,00';
                      
                      if (isPago) {
                        planText = 'Premium (Pago)';
                        planColor = 'text-indigo-600';
                        valText = 'R$ 49,90';
                      } else if (isCortesia) {
                        planText = 'Premium (Cortesia)';
                        planColor = 'text-purple-600';
                        valText = 'R$ 0,00';
                      }

                      return (
                        <TableRow key={r.id} className="border-slate-100 hover:bg-slate-50">
                          <TableCell className="font-bold text-slate-900">{r.name}</TableCell>
                          <TableCell>
                            <span className={`text-xs font-extrabold ${planColor}`}>
                              {planText}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium text-slate-700">{valText}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`font-bold ${
                              r.crm_stage === 'Won' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              ['Lost', 'OptOut', 'Blocked'].includes(r.crm_stage) ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}>
                              {r.crm_stage || 'Sem CRM'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            
            {filtered.length > 0 && (
              <div className="p-3 bg-slate-50 text-center border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-500">
                  Exibindo {filtered.length} de {restaurants.length} registros da cidade.
                </span>
              </div>
            )}
          </Card>
        </div>

        {/* Forecast & Alertas Financeiros */}
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm rounded-xl bg-white">
            <CardHeader className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-slate-500" /> Forecast (Previsão)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-slate-600">MRR Mensal Projetado</span>
                <span className="text-sm font-black text-emerald-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(mrr)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <span className="text-sm font-semibold text-slate-600">Faturamento Anual (ARR)</span>
                <span className="text-base font-black text-indigo-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(mrr * 12)}
                </span>
              </div>
            </CardContent>
          </Card>

          {premiumCortesias.length > 0 && (
            <Card className="border-amber-200 shadow-sm rounded-xl overflow-hidden bg-amber-50/30">
              <div className="p-4 border-b border-amber-100 flex items-center gap-2 bg-amber-50">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <h3 className="font-bold text-amber-900 text-sm">Oportunidades de Receita</h3>
              </div>
              <CardContent className="p-4 space-y-3 bg-white">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{premiumCortesias.length} Cortesias Ativas</p>
                    <p className="text-xs text-slate-500 leading-tight mt-0.5">
                      Você tem {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(premiumCortesias.length * 49.90)} de MRR em potencial esperando conversão para plano pago.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, Activity, Database, CheckCircle, CheckCircle2, Briefcase, CreditCard, Sparkles, MapPin, Loader2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { ExpansionProject } from '@/types/supabase';
import { toast } from 'sonner';

// Módulos
import CityCollection from './components/CityCollection';
import CityValidation from './components/CityValidation';
import CityVitrineCrm from './components/CityVitrineCrm';
import CityCrm from './components/CityCrm';
import CitySubscriptions from './components/CitySubscriptions';
import CityAnalytics from './components/CityAnalytics';
import CityOperationsControlCenter from './components/operations/CityOperationsControlCenter';
import { useCityOperationState } from './components/operations/useCityOperationState';
import { OperationScoreboardData } from './components/operations/types';

const readAiLog = (restaurant: any) => {
  const raw = restaurant?.ai_log;
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(String(raw));
  } catch (_) {
    return {};
  }
};

const getMenuStatus = (restaurant: any) => {
  const log = readAiLog(restaurant);
  return restaurant?.menu_status || log?.menu_status || (log?.status === 'menu_found' ? 'found' : '');
};

const isSchemaMissingError = (error: any) => {
  const message = String(error?.message || error?.hint || error?.details || '').toLowerCase();
  return message.includes('schema cache')
    || message.includes('does not exist')
    || message.includes('could not find')
    || message.includes('column');
};

type WorkflowState = {
  totalLeads: number;
  validated: number;
  published: number;
  strategyRows: number;
  crmLeads: number;
  premiumVisual: number;
  paidPremium: number;
  firstWaveSent: number;
  missingStrategyTable: boolean;
};

const emptyWorkflow: WorkflowState = {
  totalLeads: 0,
  validated: 0,
  published: 0,
  strategyRows: 0,
  crmLeads: 0,
  premiumVisual: 0,
  paidPremium: 0,
  firstWaveSent: 0,
  missingStrategyTable: false,
};

export default function CityDashboard() {
  const { cityId } = useParams();
  const operationState = useCityOperationState(cityId);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab') || 'operations';
  const currentTab = requestedTab === 'strategy' ? 'vitrine-crm' : requestedTab;

  const [city, setCity] = useState<ExpansionProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [workflow, setWorkflow] = useState<WorkflowState>(emptyWorkflow);

  const loadWorkflow = React.useCallback(async (cityData: ExpansionProject) => {
    if (!cityId) return;

    const countRestaurants = async (configureQuery: (query: any) => any) => {
      const { count, error } = await configureQuery(
        supabase
          .from('restaurants')
          .select('id', { count: 'exact', head: true })
          .eq('city', cityData.name)
          .eq('state', cityData.state)
      );
      if (error) throw error;
      return count || 0;
    };

    const totalLeads = await countRestaurants(query => query.eq('is_deleted', false));
    const validated = await countRestaurants(query => query.eq('is_deleted', false).eq('ai_validated', true).eq('menu_status', 'found'));
    const published = await countRestaurants(query => query.eq('is_deleted', false).eq('is_published', true).eq('menu_status', 'found'));
    const premiumVisual = await countRestaurants(query => query.eq('is_deleted', false).eq('plan', 'premium_gift'));
    const paidPremium = await countRestaurants(query => query.eq('is_deleted', false).eq('plan', 'premium'));

    const { data: publishedRows, error: publishedRowsError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('city', cityData.name)
      .eq('state', cityData.state)
      .eq('is_deleted', false)
      .eq('is_published', true)
      .eq('menu_status', 'found')
      .limit(1000);

    if (publishedRowsError) throw publishedRowsError;
    const publishedIds = (publishedRows || []).map((item: any) => item.id);

    let strategyRows: any[] = [];
    let missingStrategyTable = false;
    const { data: strategyData, error: strategyError } = await supabase
      .from('city_launch_strategy')
      .select('restaurant_id, sent_to_crm_at')
      .eq('city_slug', cityId);
    if (strategyError) {
      if (isSchemaMissingError(strategyError)) missingStrategyTable = true;
      else throw strategyError;
    } else {
      strategyRows = strategyData || [];
    }

    let crmLeads = 0;
    if (publishedIds.length > 0) {
      const { data: crmRows, error: crmError } = await supabase
        .from('commercial_leads')
        .select('id, restaurant_id')
        .in('restaurant_id', publishedIds);
      if (!crmError) crmLeads = crmRows?.length || 0;
    }

    setWorkflow({
      totalLeads,
      validated,
      published,
      strategyRows: strategyRows.length,
      crmLeads,
      premiumVisual,
      paidPremium,
      firstWaveSent: strategyRows.filter((item: any) => Boolean(item.sent_to_crm_at)).length,
      missingStrategyTable,
    });
  }, [cityId]);

  useEffect(() => {
    async function loadCity() {
      if (!cityId) return;
      try {
        const { data, error } = await supabase.from('expansion_projects').select('*').eq('slug', cityId).single();
        if (error) throw error;
        setCity(data);
        await loadWorkflow(data);
      } catch (err) {
        console.error("Erro ao carregar cidade:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCity();
  }, [cityId, loadWorkflow]);

  const handleTabChange = (val: string) => {
    if (val === 'validation' && workflow.totalLeads === 0) {
      toast.info('Comece pela coleta: ainda nao ha leads nesta cidade.');
      setSearchParams({ tab: 'collection' });
      return;
    }

    if (['vitrine-crm', 'crm'].includes(val) && workflow.published === 0) {
      toast.warning('A cidade pode encerrar com perfis incompletos, mas Vitrine/CRM exige ao menos um perfil aprovado pelo gate final.');
      setSearchParams({ tab: workflow.totalLeads > 0 ? 'operations' : 'collection' });
      return;
    }

    if (val === 'crm' && workflow.crmLeads === 0 && workflow.strategyRows === 0 && !workflow.missingStrategyTable) {
      toast.warning('Monte a Vitrine & CRM antes de operar o Sales Hub.');
      setSearchParams({ tab: 'vitrine-crm' });
      return;
    }

    if (val === 'subscriptions' && workflow.crmLeads === 0 && workflow.paidPremium === 0) {
      toast.info('O financeiro ja pode ser visto, mas ele ganha sentido depois da primeira onda do CRM.');
    }

    setSearchParams({ tab: val });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!city) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-700">Projeto de Expansão não encontrado</h2>
        <Button onClick={() => navigate('/admin/expansion')}>Voltar para a Visão Executiva</Button>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden animate-in fade-in duration-500 pb-12 font-sans bg-slate-50 min-h-[calc(100vh-2rem)] -m-8 p-8">
      
      {/* City Header - Premium Vercel/Linear Style */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-start gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            className="text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-full mt-1 shrink-0"
            onClick={() => navigate('/admin/expansion')}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{city.name}</h1>
              <Badge className={
                city.status === 'Operação' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none font-bold uppercase tracking-wider text-[10px] px-2 py-0.5' :
                city.status === 'Campanha' ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-none font-bold uppercase tracking-wider text-[10px] px-2 py-0.5' :
                'bg-slate-100 text-slate-700 hover:bg-slate-200 border-none font-bold uppercase tracking-wider text-[10px] px-2 py-0.5'
              }>
                {city.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Estado: {city.state}
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${city.health_score && city.health_score > 80 ? 'bg-emerald-500' : city.health_score && city.health_score > 60 ? 'bg-amber-500' : 'bg-red-500'}`} /> 
                Saúde: {city.health_score}/100
              </div>
            </div>
          </div>
        </div>

        <div className="w-full md:w-64 space-y-2">
          <div className="flex justify-between text-xs font-bold text-slate-600">
            <span>Progresso do Projeto</span>
            <span>{city.progress || 0}%</span>
          </div>
          <Progress value={city.progress || 0} className="h-2 bg-slate-100" />
        </div>
      </div>

      {currentTab !== 'operations' && (
        <WorkflowRail workflow={workflow} operations={operationState.scoreboard} currentTab={currentTab} onGo={handleTabChange} />
      )}

      {/* Tabs / Módulos - Linear Style Navigation */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="min-w-0 w-full">
        <div className="bg-white border border-slate-200 rounded-xl p-1 mb-6 shadow-sm overflow-x-auto hide-scrollbar">
          <TabsList className="flex w-max min-w-full h-auto p-0 bg-transparent gap-1 justify-start">
            <TabsTrigger 
              value="operations" 
              className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:shadow-none rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
            >
              <Activity className="w-4 h-4" />
              <span className="text-sm font-bold">Centro de Operações</span>
            </TabsTrigger>

            <TabsTrigger 
              value="collection" 
              className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:shadow-none rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
            >
              <Database className="w-4 h-4" />
              <span className="text-sm font-bold">Motor de Coleta</span>
            </TabsTrigger>

            <TabsTrigger 
              value="validation" 
              className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:shadow-none rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-bold">QA & Validação</span>
            </TabsTrigger>

            <TabsTrigger 
              value="vitrine-crm" 
              className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:shadow-none rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span className="text-sm font-bold">Vitrine & CRM</span>
            </TabsTrigger>

            <TabsTrigger 
              value="crm" 
              className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:shadow-none rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
            >
              <Briefcase className="w-4 h-4" />
              <span className="text-sm font-bold">Sales Hub (CRM)</span>
            </TabsTrigger>

            <TabsTrigger 
              value="subscriptions" 
              className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:shadow-none rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              <span className="text-sm font-bold">Painel Financeiro</span>
            </TabsTrigger>

            <TabsTrigger 
              value="analytics" 
              className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none rounded-lg text-slate-500 hover:text-indigo-600 transition-colors ml-auto border border-transparent data-[state=active]:border-indigo-100"
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-bold">Ask AI (Copiloto)</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-0 min-w-0">
          <TabsContent value="operations" className="mt-0 min-w-0 outline-none"><CityOperationsControlCenter state={operationState} /></TabsContent>
          <TabsContent value="collection" className="mt-0 min-w-0 outline-none"><CityCollection /></TabsContent>
          <TabsContent value="validation" className="mt-0 min-w-0 outline-none"><CityValidation /></TabsContent>
          <TabsContent value="vitrine-crm" className="mt-0 min-w-0 outline-none"><CityVitrineCrm /></TabsContent>
          <TabsContent value="crm" className="mt-0 min-w-0 outline-none"><CityCrm /></TabsContent>
          <TabsContent value="subscriptions" className="mt-0 min-w-0 outline-none"><CitySubscriptions /></TabsContent>
          <TabsContent value="analytics" className="mt-0 min-w-0 outline-none"><CityAnalytics /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function WorkflowRail({
  workflow,
  operations,
  currentTab,
  onGo,
}: {
  workflow: WorkflowState;
  operations: OperationScoreboardData;
  currentTab: string;
  onGo: (tab: string) => void;
}) {
  const hasRunEvidence = operations.candidatesDiscovered > 0 || operations.restaurantsWithJobs > 0;
  const guidance = !hasRunEvidence && workflow.totalLeads > 0
    ? `${operations.restaurantsWithoutJobs || workflow.totalLeads} registros legados aguardam reconciliacao com um City Run.`
    : operations.needsHumanReview > 0
      ? `${operations.needsHumanReview} caso(s) exigem revisao humana; lacunas comuns podem encerrar como accepted_incomplete.`
      : operations.cityRemaining > 0
        ? `${operations.cityRemaining} restaurante(s) ainda nao possuem decisao terminal.`
        : operations.activeRestaurants > 0
          ? 'Cidade operacionalmente decidida. Nivel 6 e publicacao seguem em fluxo separado.'
          : 'Inicie o censo para descobrir e reconciliar os restaurantes da cidade.';
  const steps = [
    { label: 'Descobertos', value: operations.candidatesDiscovered || workflow.totalLeads },
    { label: 'Reconciliados', value: operations.activeRestaurants },
    { label: 'Decididos', value: operations.cityProcessed },
    { label: 'Revisao humana', value: operations.needsHumanReview },
    { label: 'Auditados (N6)', value: operations.level6 },
    { label: 'Publicados', value: workflow.published },
  ];

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`h-4 w-4 ${operations.cityRemaining === 0 && operations.activeRestaurants > 0 ? 'text-emerald-600' : 'text-blue-600'}`} />
            <p className="text-xs font-black uppercase text-slate-600">Fechamento da cidade</p>
          </div>
          <p className="mt-1 truncate text-sm font-semibold text-slate-700">{guidance}</p>
        </div>
        {currentTab !== 'operations' && (
          <Button onClick={() => onGo('operations')} variant="outline" className="h-9 rounded-md text-xs font-black">
            Abrir operacao
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 sm:grid-cols-3 xl:grid-cols-6 xl:divide-y-0">
        {steps.map((step) => (
          <div key={step.label} className="px-3 py-2.5">
            <p className="text-[10px] font-black uppercase text-slate-500">{step.label}</p>
            <p className="mt-1 text-lg font-black tabular-nums text-slate-900">{step.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

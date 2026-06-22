import React from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, Activity, Database, CheckCircle, Target, Briefcase, CreditCard, Sparkles, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// Módulos
import CitySettings from './components/CitySettings';
import CityCollection from './components/CityCollection';
import CityValidation from './components/CityValidation';
import CityStrategy from './components/CityStrategy';
import CityCrm from './components/CityCrm';
import CitySubscriptions from './components/CitySubscriptions';
import CityAnalytics from './components/CityAnalytics';

export default function CityDashboard() {
  const { cityId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'operations';

  const handleTabChange = (val: string) => {
    setSearchParams({ tab: val });
  };

  const cityName = cityId === 'joao-pessoa-pb' ? 'João Pessoa' : 
                   cityId === 'campina-grande-pb' ? 'Campina Grande' : 
                   'Nova Cidade';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12 font-sans bg-slate-50 min-h-[calc(100vh-2rem)] -m-8 p-8">
      
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
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{cityName}</h1>
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none font-bold uppercase tracking-wider text-[10px] px-2 py-0.5">
                Em Operação
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Paraíba (PB)
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" /> Saúde: 92/100
              </div>
            </div>
          </div>
        </div>

        <div className="w-full md:w-64 space-y-2">
          <div className="flex justify-between text-xs font-bold text-slate-600">
            <span>Progresso do Projeto</span>
            <span>85%</span>
          </div>
          <Progress value={85} className="h-2 bg-slate-100" />
        </div>
      </div>

      {/* Tabs / Módulos - Linear Style Navigation */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
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
              value="strategy" 
              className="flex items-center gap-2 py-2 px-4 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:shadow-none rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
            >
              <Target className="w-4 h-4" />
              <span className="text-sm font-bold">Estratégia Comercial</span>
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

        <div className="mt-0">
          <TabsContent value="operations" className="mt-0 outline-none"><CitySettings /></TabsContent>
          <TabsContent value="collection" className="mt-0 outline-none"><CityCollection /></TabsContent>
          <TabsContent value="validation" className="mt-0 outline-none"><CityValidation /></TabsContent>
          <TabsContent value="strategy" className="mt-0 outline-none"><CityStrategy /></TabsContent>
          <TabsContent value="crm" className="mt-0 outline-none"><CityCrm /></TabsContent>
          <TabsContent value="subscriptions" className="mt-0 outline-none"><CitySubscriptions /></TabsContent>
          <TabsContent value="analytics" className="mt-0 outline-none"><CityAnalytics /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

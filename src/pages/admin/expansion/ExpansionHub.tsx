import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, TrendingUp, Plus, BarChart3, Users, CreditCard, ChevronRight, Map, LineChart, Star } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// Mock data for the National Executive view
const NATIONAL_METRICS = {
  mrr: 'R$ 124.500',
  arr: 'R$ 1.49M',
  activeCities: 3,
  planningCities: 2,
  nationalConversion: '18.4%',
  totalPremium: 1250,
  totalFree: 4500,
  expectedRevenue: 'R$ 180.000',
};

const MOCK_CITIES = [
  {
    id: 'joao-pessoa-pb',
    name: 'João Pessoa',
    state: 'PB',
    status: 'Operação',
    healthScore: 92,
    progress: 85,
    restaurants: 1387,
    imported: 1230,
    premiumCortesia: 700,
    premiumPago: 264,
    free: 266,
    conversion: '32%',
    revenue: 'R$ 9.800',
    manager: 'Carlos Silva'
  },
  {
    id: 'campina-grande-pb',
    name: 'Campina Grande',
    state: 'PB',
    status: 'Campanha',
    healthScore: 78,
    progress: 60,
    restaurants: 850,
    imported: 300,
    premiumCortesia: 50,
    premiumPago: 10,
    free: 240,
    conversion: '12%',
    revenue: 'R$ 450',
    manager: 'Ana Paula'
  },
  {
    id: 'recife-pe',
    name: 'Recife',
    state: 'PE',
    status: 'Planejamento',
    healthScore: 100,
    progress: 10,
    restaurants: 0,
    imported: 0,
    premiumCortesia: 0,
    premiumPago: 0,
    free: 0,
    conversion: '0%',
    revenue: 'R$ 0',
    manager: 'Pendente'
  }
];

export default function ExpansionHub() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 font-sans">
      
      {/* Header and Call to Action */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Visão Executiva</h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Controle nacional de implantações e expansão de mercado.</p>
        </div>
        <Button className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm rounded-lg font-medium">
          <Plus className="w-4 h-4 mr-2" /> Novo Projeto de Cidade
        </Button>
      </div>

      {/* Global Executive Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm rounded-xl bg-white hover:border-slate-300 transition-colors">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">MRR Nacional</p>
                <p className="text-2xl font-bold text-slate-900">{NATIONAL_METRICS.mrr}</p>
              </div>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-emerald-600 font-medium">
              <TrendingUp className="w-3 h-3 mr-1" />
              <span>+12.5% vs último mês</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-xl bg-white hover:border-slate-300 transition-colors">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">Cidades Ativas</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-slate-900">{NATIONAL_METRICS.activeCities}</p>
                  <p className="text-sm font-medium text-slate-500">/ {NATIONAL_METRICS.activeCities + NATIONAL_METRICS.planningCities} total</p>
                </div>
              </div>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Map className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-slate-500 font-medium">
              <span>{NATIONAL_METRICS.planningCities} cidades em planejamento</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-xl bg-white hover:border-slate-300 transition-colors">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">Assinaturas Premium</p>
                <p className="text-2xl font-bold text-slate-900">{NATIONAL_METRICS.totalPremium.toLocaleString('pt-BR')}</p>
              </div>
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                <Star className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-slate-500 font-medium">
              <span className="text-slate-900 font-bold">{NATIONAL_METRICS.totalFree.toLocaleString('pt-BR')}</span> <span className="ml-1">contas Free ativas</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm rounded-xl bg-white hover:border-slate-300 transition-colors">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-sm font-medium text-slate-500">Taxa de Conversão</p>
                <p className="text-2xl font-bold text-slate-900">{NATIONAL_METRICS.nationalConversion}</p>
              </div>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <LineChart className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-slate-500 font-medium">
              <span>Média nacional de Lead → Premium</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="pt-6 border-t border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Projetos de Expansão (Cidades)</h2>
          <Button variant="outline" size="sm" className="text-slate-600 border-slate-200">
            Filtrar por Status
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {MOCK_CITIES.map((city) => (
            <div 
              key={city.id} 
              onClick={() => navigate(`/admin/expansion/${city.id}`)}
              className="group cursor-pointer bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 rounded-xl transition-all duration-200 overflow-hidden relative"
            >
              {/* Highlight bar for active cities */}
              {city.status === 'Operação' && (
                <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
              )}
              {city.status === 'Campanha' && (
                <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500" />
              )}

              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      {city.name} <span className="text-xs text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded">{city.state}</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">Líder: {city.manager}</p>
                  </div>
                  <Badge variant="outline" className={
                    city.status === 'Operação' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold' : 
                    city.status === 'Campanha' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold' : 
                    'bg-slate-50 text-slate-600 border-slate-200 font-semibold'
                  }>
                    {city.status}
                  </Badge>
                </div>

                {/* Progress / Health */}
                <div className="mb-5 space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-500">Progresso do Projeto</span>
                    <span className={city.progress > 80 ? 'text-emerald-600' : 'text-slate-700'}>{city.progress}%</span>
                  </div>
                  <Progress value={city.progress} className="h-1.5 bg-slate-100" />
                </div>

                <div className="grid grid-cols-2 gap-y-4 gap-x-4 mb-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-0.5">Leads Mapeados</p>
                    <p className="text-sm font-bold text-slate-900">{city.restaurants.toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-0.5">Assinantes</p>
                    <p className="text-sm font-bold text-indigo-600">{city.premiumPago}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-0.5">Receita Atual</p>
                    <p className="text-sm font-bold text-emerald-600">{city.revenue}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-0.5">Saúde (IA)</p>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${city.healthScore > 80 ? 'bg-emerald-500' : city.healthScore > 60 ? 'bg-amber-500' : 'bg-red-500'}`} />
                      <p className="text-sm font-bold text-slate-900">{city.healthScore}/100</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between group-hover:bg-indigo-50 transition-colors">
                <span className="text-xs font-semibold text-slate-500 group-hover:text-indigo-600">Acessar Centro de Operações</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

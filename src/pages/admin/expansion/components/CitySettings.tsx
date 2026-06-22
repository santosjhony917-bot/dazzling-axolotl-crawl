import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Circle, Sparkles, TrendingUp, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useSearchParams } from 'react-router-dom';

export default function CitySettings() {
  const { cityId } = useParams();
  const [, setSearchParams] = useSearchParams();
  const [city, setCity] = useState<any>(null);
  const [stats, setStats] = useState({
    totalLeads: 0,
    validatedLeads: 0,
    premiumLeads: 0,
    noPhoneLeads: 0,
    expiringPremium: 0,
  });
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
          .select('id, name, phone, plan, ai_validated, created_at')
          .eq('city', cityData.name)
          .eq('state', cityData.state);

        if (restError) throw restError;

        if (restData) {
          const totalLeads = restData.length;
          const validatedLeads = restData.filter(r => r.ai_validated).length;
          const premiumLeads = restData.filter(r => r.plan === 'premium').length;
          const noPhoneLeads = restData.filter(r => !r.phone || r.phone.trim() === '').length;
          const expiringPremium = restData.filter(r => r.plan === 'premium_gift').length;

          setStats({
            totalLeads,
            validatedLeads,
            premiumLeads,
            noPhoneLeads,
            expiringPremium,
          });

          // Generate dynamic timeline events
          const events = [];
          
          // Latest collected
          const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
          const last24hCount = restData.filter(r => new Date(r.created_at || '').getTime() > oneDayAgo).length;

          if (last24hCount > 0) {
            events.push({
              time: 'Últimas 24h',
              title: `${last24hCount} novos leads adicionados`,
              desc: 'Coletados do Google Maps / Extensão.',
              color: 'bg-emerald-500'
            });
          }

          // Latest validated
          const lastValidated = restData.filter(r => r.ai_validated).length;
          if (lastValidated > 0) {
            events.push({
              time: 'IA Ativa',
              title: `${lastValidated} perfis validados por IA`,
              desc: 'Imagens, links de bio e Instagram enriquecidos.',
              color: 'bg-indigo-500'
            });
          }

          if (premiumLeads > 0) {
            const premiumList = restData.filter(r => r.plan === 'premium');
            events.push({
              time: 'Comercial',
              title: `${premiumLeads} clientes Premium ativos`,
              desc: `Destaque para "${premiumList[0]?.name || 'parceiros'}" e outros.`,
              color: 'bg-emerald-500'
            });
          }

          if (events.length === 0) {
            events.push({
              time: 'Status',
              title: 'Aguardando início de coleta',
              desc: 'Nenhum lead ou alteração registrada nas últimas 24h.',
              color: 'bg-slate-300'
            });
          }

          setRecentEvents(events);
        }
      } catch (err) {
        console.error('Error loading city stats:', err);
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
        <span className="ml-2 text-sm text-slate-500 font-medium">Carregando dados reais do projeto...</span>
      </div>
    );
  }

  if (!city) return null;

  const validatedPercent = stats.totalLeads > 0 ? Math.round((stats.validatedLeads / stats.totalLeads) * 100) : 0;
  const premiumPercent = stats.totalLeads > 0 ? Math.round((stats.premiumLeads / stats.totalLeads) * 100) : 0;

  // Dynamic Copilot Recommendation
  let copilotText = '';
  if (stats.totalLeads === 0) {
    copilotText = `${city.name} (${city.state}) está em fase inicial de implantação. Nenhum lead foi coletado ainda. Recomendo acessar a aba 'Motor de Coleta' e iniciar a varredura de estabelecimentos via Google Maps ou Extensão para começar a povoar a base de dados.`;
  } else if (stats.validatedLeads < stats.totalLeads * 0.8) {
    copilotText = `${city.name} (${city.state}) possui ${stats.totalLeads} leads mapeados, mas apenas ${stats.validatedLeads} (${validatedPercent}%) foram validados por IA. Recomendo acessar a aba 'QA & Validação' para revisar os dados antes de iniciar a prospecção ativa.`;
  } else {
    copilotText = `${city.name} (${city.state}) atingiu uma excelente densidade de leads validados (${stats.validatedLeads} estabelecimentos). Recomendo iniciar a fase de Prospecção Ativa (CRM) imediatamente para maximizar as conversões deste mês.`;
  }

  const handleCrmClick = () => {
    setSearchParams({ tab: 'crm' });
  };

  return (
    <div className="space-y-6">
      
      {/* AI Copilot Alert */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex gap-4 items-start shadow-sm animate-in fade-in duration-300">
        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-700 shrink-0 mt-0.5">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-indigo-900 text-sm mb-1">Copiloto de Expansão (IA)</h3>
          <p className="text-indigo-800 text-sm mb-3">
            {copilotText}
          </p>
          <div className="flex gap-2">
            <Button onClick={handleCrmClick} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-8">
              Iniciar Prospecção (CRM)
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Metrics & Checklist */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-slate-200 shadow-sm rounded-xl">
              <CardContent className="p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Base de Restaurantes</p>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-black text-slate-900">{stats.totalLeads}</span>
                </div>
                <Progress value={stats.totalLeads > 0 ? 100 : 0} className="h-1 mt-3 bg-slate-100 [&>div]:bg-emerald-500" />
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm rounded-xl">
              <CardContent className="p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Validados com IA</p>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-black text-slate-900">{stats.validatedLeads}</span>
                  <span className="text-sm font-semibold text-slate-500 mb-1">/ {validatedPercent}%</span>
                </div>
                <Progress value={validatedPercent} className="h-1 mt-3 bg-slate-100 [&>div]:bg-indigo-500" />
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm rounded-xl">
              <CardContent className="p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Conversão de Vendas</p>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-black text-slate-900">{premiumPercent}%</span>
                </div>
                <Progress value={premiumPercent} className="h-1 mt-3 bg-slate-100 [&>div]:bg-blue-500" />
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 shadow-sm rounded-xl">
            <CardContent className="p-0">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                <h3 className="font-bold text-slate-900">Checklist de Implantação</h3>
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none font-bold">
                  {stats.totalLeads === 0 ? 'Fase 1: Coleta pendente' : stats.validatedLeads < stats.totalLeads * 0.8 ? 'Fase 2: Triagem IA' : 'Fase 3: CRM Ativo'}
                </Badge>
              </div>
              
              <div className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 text-sm">Configuração Inicial e Definição de Metas</p>
                    <p className="text-xs text-slate-500 mt-0.5">Responsável alocado e raio de atuação definido.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {stats.totalLeads > 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <p className={`font-bold text-sm ${stats.totalLeads > 0 ? 'text-slate-900' : 'text-slate-400'}`}>Coleta Massiva de Leads (Google/Social)</p>
                      <span className={`text-xs font-bold ${stats.totalLeads > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {stats.totalLeads > 0 ? '100%' : '0%'}
                      </span>
                    </div>
                    <Progress value={stats.totalLeads > 0 ? 100 : 0} className="h-1.5 bg-slate-100 [&>div]:bg-emerald-500" />
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {validatedPercent >= 80 ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className={`w-5 h-5 shrink-0 mt-0.5 ${stats.totalLeads > 0 ? 'text-indigo-500' : 'text-slate-300'}`} />
                  )}
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <p className={`font-bold text-sm ${stats.totalLeads > 0 ? 'text-slate-900' : 'text-slate-400'}`}>Validação e Triagem de Qualidade (IA)</p>
                      <span className={`text-xs font-bold ${stats.totalLeads > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>{validatedPercent}%</span>
                    </div>
                    <Progress value={validatedPercent} className="h-1.5 bg-slate-100 [&>div]:bg-indigo-500" />
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Circle className={`w-5 h-5 shrink-0 mt-0.5 ${stats.validatedLeads > 0 ? 'text-indigo-500' : 'text-slate-300'}`} />
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <p className={`font-bold text-sm ${stats.validatedLeads > 0 ? 'text-indigo-900' : 'text-slate-400'}`}>Execução Comercial (Vendas e CRM)</p>
                      <span className={`text-xs font-bold ${stats.validatedLeads > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
                        {stats.premiumLeads > 0 ? `${stats.premiumLeads} ativos` : 'Aguardando'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 mb-2">{stats.premiumLeads} assinaturas Premium ativadas até agora.</p>
                    <Progress value={premiumPercent} className="h-1.5 bg-slate-100 [&>div]:bg-indigo-500" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Alerts & Timeline */}
        <div className="space-y-6">
          <Card className="border-rose-100 shadow-sm rounded-xl overflow-hidden animate-in fade-in duration-300">
            <div className="p-4 border-b border-rose-100 bg-rose-50 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <h3 className="font-bold text-rose-900 text-sm">Atenção Necessária</h3>
            </div>
            <CardContent className="p-4 bg-white space-y-4">
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">Leads sem telefone</p>
                  <p className="text-xs text-slate-500">{stats.noPhoneLeads} restaurantes precisam de revisão.</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">Premium expirando / Cortesia</p>
                  <p className="text-xs text-slate-500">{stats.expiringPremium} contas cortesia ativas.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm rounded-xl">
            <CardContent className="p-5">
              <h3 className="font-bold text-slate-900 mb-4">Linha do Tempo (Últimas 24h)</h3>
              
              <div className="relative border-l border-slate-200 ml-3 space-y-6">
                {recentEvents.map((evt, i) => (
                  <div key={i} className="relative">
                    <div className={`absolute -left-1.5 mt-1.5 w-3 h-3 ${evt.color} rounded-full ring-4 ring-white`} />
                    <div className="pl-6">
                      <p className="text-xs text-slate-400 font-semibold mb-0.5">{evt.time}</p>
                      <p className="text-sm font-bold text-slate-800">{evt.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{evt.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}

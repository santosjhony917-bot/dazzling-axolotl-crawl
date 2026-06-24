import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Sparkles, TrendingUp, DollarSign, Target, BarChart, Send, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function CityStrategy() {
  const { cityId } = useParams();
  const [city, setCity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [premiumPercent, setPremiumPercent] = useState([20]);
  const [ticketMedio, setTicketMedio] = useState([49]);
  const [validatedRestaurants, setValidatedRestaurants] = useState<number>(0);
  const [premiumActive, setPremiumActive] = useState<number>(0);
  const [distributionMethod, setDistributionMethod] = useState('bairros');
  const [messageTemplate, setMessageTemplate] = useState('Olá! Vimos o perfil do {restaurante} e percebemos uma oportunidade de destacar o cardápio de vocês no FilterFood. Posso te mostrar?');
  const [isApplying, setIsApplying] = useState(false);

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

  const fetchStats = async () => {
    if (!cityId) return;
    setLoading(true);
    try {
      const { data: cityData, error: cityError } = await supabase
        .from('expansion_projects')
        .select('*')
        .eq('slug', cityId)
        .single();

      if (cityError) throw cityError;
      setCity(cityData);

      const { data, error } = await supabase
        .from('restaurants')
        .select('id, plan, is_deleted, ai_log')
        .eq('city', cityData.name)
        .eq('state', cityData.state)
        .eq('ai_validated', true);

      if (error) throw error;

      const rows = (data || []).filter(r => r.is_deleted !== true && getMenuStatus(r) === 'found');
      setValidatedRestaurants(rows.length);
      setPremiumActive(rows.filter(r => r.plan === 'premium').length);
    } catch (error: any) {
      toast.error(`Erro ao buscar dados do Supabase: ${error?.message || 'erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityId]);

  const targetPremium = Math.floor(validatedRestaurants * (premiumPercent[0] / 100));
  const availableSlots = Math.max(0, targetPremium - premiumActive);
  const projectedMRR = targetPremium * ticketMedio[0];
  const saturationPercent = validatedRestaurants > 0 ? Math.round((targetPremium / validatedRestaurants) * 100) : 0;

  let riskLevel = 'Baixo';
  let riskColor = 'text-emerald-600 bg-emerald-50 border-emerald-200';
  let aiRecommendation = 'A meta mantém escassez e deixa espaço para converter bons restaurantes sem inflar o Premium.';

  if (premiumPercent[0] > 65) {
    riskLevel = 'Alto';
    riskColor = 'text-rose-600 bg-rose-50 border-rose-200';
    aiRecommendation = 'Meta alta demais: perde exclusividade. Use isso só se a cidade tiver poucos restaurantes validados ou plano de entrada barato.';
  } else if (premiumPercent[0] > 40) {
    riskLevel = 'Moderado';
    riskColor = 'text-amber-600 bg-amber-50 border-amber-200';
    aiRecommendation = 'Meta possível, mas exige régua clara de valor. Evite prometer destaque para todo mundo.';
  }

  const handleApplyStrategy = async () => {
    if (!city) return;
    try {
      setIsApplying(true);
      toast.loading('Salvando estratégia e preparando CRM...');

      const { data: restaurants, error } = await supabase
        .from('restaurants')
        .select('id, plan, is_deleted, ai_log')
        .eq('city', city.name)
        .eq('state', city.state)
        .eq('ai_validated', true);

      if (error) throw error;

      const eligible = (restaurants || []).filter(r => (
        r.is_deleted !== true
        && r.plan !== 'premium'
        && getMenuStatus(r) === 'found'
      ));

      if (eligible.length === 0) {
        toast.error('Nenhum restaurante validado disponível para preparar no CRM.');
        return;
      }

      const ids = eligible.map(r => r.id);
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({ plan: 'free', visit_status: 'Pendente' } as any)
        .in('id', ids);

      if (updateError) throw updateError;

      localStorage.setItem('crm_message_template', messageTemplate);
      localStorage.setItem('crm_strategy_config', JSON.stringify({
        city: city.name,
        state: city.state,
        premiumPercent: premiumPercent[0],
        ticketMedio: ticketMedio[0],
        distributionMethod,
        savedAt: new Date().toISOString(),
      }));

      toast.success(`Estratégia salva. ${ids.length} restaurantes validados preparados no CRM. Nenhum Premium foi ativado automaticamente.`);
      await fetchStats();
    } catch (err: any) {
      toast.error(`Erro ao aplicar estratégia: ${err?.message || 'erro desconhecido'}`);
    } finally {
      setIsApplying(false);
      toast.dismiss();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="ml-2 text-sm text-slate-500 font-medium">Carregando simulador comercial...</span>
      </div>
    );
  }

  if (!city) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Estratégia Comercial — {city.name}</h2>
          <p className="text-sm text-slate-500">Simula meta, prepara CRM e mantém assinatura Premium dependente de fechamento real.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-slate-200 shadow-sm rounded-xl bg-white">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <Target className="w-4 h-4 text-slate-500" /> Variáveis do simulador
              </h3>
            </div>
            <CardContent className="p-5 space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-slate-700">Meta máxima de Premium</label>
                  <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{premiumPercent[0]}%</span>
                </div>
                <Slider value={premiumPercent} onValueChange={setPremiumPercent} max={100} step={1} />
                <p className="text-xs text-slate-500">É uma meta de conversão, não uma ativação automática.</p>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-slate-700">Ticket médio mensal</label>
                  <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">R$ {ticketMedio[0]}</span>
                </div>
                <Slider value={ticketMedio} onValueChange={setTicketMedio} min={49} max={499} step={10} />
                <p className="text-xs text-slate-500">Usado apenas para projeção financeira.</p>
              </div>
            </CardContent>
          </Card>

          <div className={`p-5 rounded-xl border ${riskColor} flex flex-col gap-3 shadow-sm`}>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <h4 className="font-bold">Análise da IA</h4>
            </div>
            <div className="flex justify-between items-center bg-white/50 p-2 rounded-lg border border-white/20">
              <span className="text-sm font-semibold">Risco de saturação:</span>
              <span className="text-sm font-black uppercase tracking-wider">{riskLevel}</span>
            </div>
            <p className="text-sm leading-relaxed mt-1">{aiRecommendation}</p>
          </div>

          <Card className="border-indigo-200 shadow-sm rounded-xl overflow-hidden bg-white">
            <div className="p-4 border-b border-indigo-100 bg-indigo-50/50">
              <h3 className="font-bold text-indigo-900 flex items-center gap-2 text-sm">
                <Send className="w-4 h-4 text-indigo-500" /> Preparar CRM
              </h3>
            </div>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Prioridade comercial</label>
                <select
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                  value={distributionMethod}
                  onChange={(e) => setDistributionMethod(e.target.value)}
                >
                  <option value="bairros">Distribuir por bairros</option>
                  <option value="aleatorio">Fila geral da cidade</option>
                  <option value="notas">Priorizar melhores avaliações</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Mensagem de prospecção</label>
                <textarea
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 min-h-[90px]"
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                />
                <p className="text-[10px] text-slate-500 leading-tight">Use <strong>{'{restaurante}'}</strong> para inserir o nome no WhatsApp.</p>
              </div>

              <Button onClick={handleApplyStrategy} disabled={isApplying || validatedRestaurants === 0} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md h-10 mt-2">
                {isApplying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                {isApplying ? 'Preparando...' : 'Salvar estratégia e preparar CRM'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-slate-200 shadow-sm rounded-xl bg-slate-900 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <DollarSign className="w-24 h-24" />
              </div>
              <CardContent className="p-6 relative z-10">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">MRR potencial se bater a meta</p>
                <p className="text-4xl font-black text-emerald-400">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(projectedMRR)}
                </p>
                <div className="mt-6 flex items-center text-sm font-medium text-slate-300">
                  <TrendingUp className="w-4 h-4 mr-2 text-emerald-400" />
                  Projeção, não receita confirmada
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm rounded-xl bg-white">
              <CardContent className="p-6">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Base comercial validada</p>
                <div className="flex items-end gap-3 mb-4">
                  <p className="text-3xl font-black text-slate-900">{validatedRestaurants.toLocaleString('pt-BR')}</p>
                  <p className="text-sm font-semibold text-slate-500 mb-1">Restaurantes</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-indigo-600">Meta Premium ({targetPremium})</span>
                      <span className="text-slate-400">Slots livres ({availableSlots})</span>
                    </div>
                    <div className="w-full flex h-3 rounded-full overflow-hidden bg-slate-200">
                      <div style={{ width: `${saturationPercent}%` }} className="bg-indigo-500 transition-all duration-300" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 shadow-sm rounded-xl bg-white">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <BarChart className="w-4 h-4 text-slate-500" /> Impacto financeiro simulado
              </h3>
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Premium ativos</p>
                  <p className="text-lg font-black text-slate-900">{premiumActive}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Meta Premium</p>
                  <p className="text-lg font-black text-indigo-600">{targetPremium}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">ARR projetado</p>
                  <p className="text-lg font-black text-emerald-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(projectedMRR * 12)}
                  </p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-[10px] uppercase font-bold text-emerald-700 mb-1">Ticket mensal</p>
                  <p className="text-lg font-black text-emerald-700">R$ {ticketMedio[0]}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Sparkles, TrendingUp, DollarSign, Target, ShieldAlert, BarChart, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function CityStrategy() {
  const [premiumPercent, setPremiumPercent] = useState([20]); // % de estabelecimentos premium
  const [ticketMedio, setTicketMedio] = useState([149]); // Mensalidade R$
  const [totalRestaurants, setTotalRestaurants] = useState<number>(0); 
  const [distributionMethod, setDistributionMethod] = useState('bairros');
  const [messageTemplate, setMessageTemplate] = useState('Olá! Vimos o cardápio do {restaurante} e achamos incrível. Gostaríamos de oferecer 30 dias de destaque gratuito na vitrine FilterFood. O que acha?');
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { count, error } = await supabase
          .from('restaurants')
          .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        setTotalRestaurants(count || 0);
      } catch (error: any) {
        toast.error('Erro ao buscar dados do Supabase: ' + error.message);
      }
    };
    fetchStats();
  }, []);

  // Calcula projeções
  const totalPremium = Math.floor(totalRestaurants * (premiumPercent[0] / 100));
  const totalFree = totalRestaurants - totalPremium;
  const projectedMRR = totalPremium * ticketMedio[0];
  const coveragePercent = Math.min(100, Math.floor((totalPremium / totalRestaurants) * 100));

  // Risk logic
  let riskLevel = 'Baixo';
  let riskColor = 'text-emerald-600 bg-emerald-50 border-emerald-200';
  let aiRecommendation = 'A proporção atual garante percepção de escassez e alto valor agregado para os assinantes Premium.';

  if (premiumPercent[0] > 65) {
    riskLevel = 'Alto';
    riskColor = 'text-rose-600 bg-rose-50 border-rose-200';
    aiRecommendation = 'Atenção: A densidade de contas Premium está excessivamente alta. Isso destrói a percepção de exclusividade e pode gerar cancelamentos em massa.';
  } else if (premiumPercent[0] > 40) {
    riskLevel = 'Moderado';
    riskColor = 'text-amber-600 bg-amber-50 border-amber-200';
    aiRecommendation = 'Densidade Premium atingindo limite de saturação. Recomendo pausar campanhas de upgrade e focar na retenção dos clientes atuais.';
  }

  const handleApplyStrategy = async () => {
    try {
      setIsApplying(true);
      toast.loading('Distribuindo estratégia e atualizando banco...');

      // Buscar todos validados
      const { data: restaurants, error } = await supabase
        .from('restaurants')
        .select('id, neighborhood, rating')
        .eq('ai_validated', true);

      if (error) throw error;
      if (!restaurants || restaurants.length === 0) {
        toast.error('Nenhum restaurante validado encontrado.');
        return;
      }

      // Separa premium vs free
      const targetPremiumCount = Math.floor(restaurants.length * (premiumPercent[0] / 100));
      
      let sorted = [...restaurants];
      if (distributionMethod === 'aleatorio') {
        sorted.sort(() => Math.random() - 0.5);
      } else if (distributionMethod === 'notas') {
        sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      } else {
        // fragmentado por bairros: tenta pegar os melhores espalhados
        sorted.sort((a, b) => (a.neighborhood || '').localeCompare(b.neighborhood || ''));
      }

      const premiumIds = sorted.slice(0, targetPremiumCount).map(r => r.id);
      const freeIds = sorted.slice(targetPremiumCount).map(r => r.id);

      // Atualiza Premium
      if (premiumIds.length > 0) {
        const { error: errP } = await supabase
          .from('restaurants')
          .update({ 
            plan: 'premium_cortesia', 
            visit_status: 'won' // Marca como won (ativo) direto
          })
          .in('id', premiumIds);
        if (errP) throw errP;
      }

      // Atualiza CRM (Leads) com a mensagem configurada em mente
      if (freeIds.length > 0) {
        const { error: errF } = await supabase
          .from('restaurants')
          .update({ 
            plan: 'free', 
            visit_status: 'lead'
          })
          .in('id', freeIds);
        if (errF) throw errF;
      }

      toast.success(`Estratégia aplicada! ${premiumIds.length} Cortesias ativadas e ${freeIds.length} enviados ao CRM.`);
      
      // Save the default message template to localStorage so CityCrm can use it
      localStorage.setItem('crm_message_template', messageTemplate);
      
    } catch (err: any) {
      toast.error('Erro ao aplicar estratégia: ' + err.message);
    } finally {
      setIsApplying(false);
      toast.dismiss();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">War Room (Simulador Estratégico)</h2>
          <p className="text-sm text-slate-500">Projete cenários financeiros e de saturação de mercado para esta cidade.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel de Controle (Sliders) */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-slate-200 shadow-sm rounded-xl">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <Target className="w-4 h-4 text-slate-500" /> Variáveis do Simulador
              </h3>
            </div>
            <CardContent className="p-5 space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-slate-700">Meta de Cobertura Premium</label>
                  <span className="text-sm font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{premiumPercent[0]}%</span>
                </div>
                <Slider 
                  value={premiumPercent} 
                  onValueChange={setPremiumPercent} 
                  max={100} 
                  step={1} 
                  className="[&>span:first-child]:bg-indigo-100 [&_[role=slider]]:bg-indigo-600 [&_[role=slider]]:border-indigo-600"
                />
                <p className="text-xs text-slate-500">Define o teto máximo de estabelecimentos que poderão ter plano pago/cortesia.</p>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-slate-700">Ticket Médio (Mensalidade)</label>
                  <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">R$ {ticketMedio[0]}</span>
                </div>
                <Slider 
                  value={ticketMedio} 
                  onValueChange={setTicketMedio} 
                  min={49} 
                  max={499} 
                  step={10} 
                  className="[&>span:first-child]:bg-emerald-100 [&_[role=slider]]:bg-emerald-600 [&_[role=slider]]:border-emerald-600"
                />
                <p className="text-xs text-slate-500">Preço simulado do plano Premium para cálculo de receita.</p>
              </div>
            </CardContent>
          </Card>

          {/* AI Recommendation Panel */}
          <div className={`p-5 rounded-xl border ${riskColor} flex flex-col gap-3 shadow-sm`}>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <h4 className="font-bold">Análise da IA</h4>
            </div>
            <div className="flex justify-between items-center bg-white/50 p-2 rounded-lg border border-white/20">
              <span className="text-sm font-semibold">Risco de Saturação:</span>
              <span className="text-sm font-black uppercase tracking-wider">{riskLevel}</span>
            </div>
            <p className="text-sm leading-relaxed mt-1">
              {aiRecommendation}
            </p>
          </div>

          {/* Execution Form */}
          <Card className="border-indigo-200 shadow-sm rounded-xl overflow-hidden">
            <div className="p-4 border-b border-indigo-100 bg-indigo-50/50">
              <h3 className="font-bold text-indigo-900 flex items-center gap-2 text-sm">
                <Send className="w-4 h-4 text-indigo-500" /> Execução da Estratégia
              </h3>
            </div>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Como distribuir as Cortesias ({premiumPercent[0]}%)?</label>
                <select 
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                  value={distributionMethod}
                  onChange={(e) => setDistributionMethod(e.target.value)}
                >
                  <option value="bairros">Fragmentado por Bairros (Homogêneo)</option>
                  <option value="aleatorio">Aleatório na Cidade Inteira</option>
                  <option value="notas">Focar nas Melhores Avaliações (&gt; 4.5)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Mensagem de Prospecção (Para os {100 - premiumPercent[0]}% do CRM)</label>
                <textarea 
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 min-h-[80px]"
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  placeholder="Olá! Vimos o cardápio do {restaurante}..."
                />
                <p className="text-[10px] text-slate-500 leading-tight">
                  Os não sorteados irão para o CRM com esta mensagem no botão do WhatsApp. Use <strong>{'{restaurante}'}</strong> para inserir o nome do local.
                </p>
              </div>

              <Button 
                onClick={handleApplyStrategy}
                disabled={isApplying || totalRestaurants === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md h-10 mt-2"
              >
                {isApplying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {isApplying ? 'Processando Banco...' : 'Aplicar Estratégia na Base'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Dashboard de Resultados */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-slate-200 shadow-sm rounded-xl bg-slate-900 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <DollarSign className="w-24 h-24" />
              </div>
              <CardContent className="p-6 relative z-10">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Projeção de Receita (MRR Máximo)</p>
                <p className="text-4xl font-black text-emerald-400">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(projectedMRR)}
                </p>
                <div className="mt-6 flex items-center text-sm font-medium text-slate-300">
                  <TrendingUp className="w-4 h-4 mr-2 text-emerald-400" />
                  Potencial de faturamento recorrente mensal
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm rounded-xl">
              <CardContent className="p-6">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Distribuição da Base</p>
                <div className="flex items-end gap-3 mb-4">
                  <p className="text-3xl font-black text-slate-900">{totalRestaurants.toLocaleString('pt-BR')}</p>
                  <p className="text-sm font-semibold text-slate-500 mb-1">Total de Leads</p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-indigo-600">Premium ({totalPremium})</span>
                      <span className="text-slate-400">Free ({totalFree})</span>
                    </div>
                    <div className="w-full flex h-3 rounded-full overflow-hidden">
                      <div style={{ width: `${premiumPercent[0]}%` }} className="bg-indigo-500 transition-all duration-300" />
                      <div style={{ width: `${100 - premiumPercent[0]}%` }} className="bg-slate-200 transition-all duration-300" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 shadow-sm rounded-xl">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <BarChart className="w-4 h-4 text-slate-500" /> Impacto Financeiro
              </h3>
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">LTV Estimado (12m)</p>
                  <p className="text-lg font-black text-slate-900">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ticketMedio[0] * 12)}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">ARR Projetado</p>
                  <p className="text-lg font-black text-emerald-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(projectedMRR * 12)}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Custo Plataforma (Fixo)</p>
                  <p className="text-lg font-black text-rose-600">R$ 1.200</p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-[10px] uppercase font-bold text-emerald-700 mb-1">Lucro Operacional</p>
                  <p className="text-lg font-black text-emerald-700">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(projectedMRR - 1200)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}

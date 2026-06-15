import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Megaphone, 
  Bot, 
  Send, 
  TrendingUp, 
  MapPin, 
  Layers, 
  CheckCircle, 
  XCircle, 
  Copy, 
  Check, 
  Loader2, 
  RefreshCw, 
  MessageSquare,
  Sparkles,
  Search,
  Activity
} from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';

interface Region {
  id: string;
  nome_cidade: string;
  uf: string;
  ddd_oficial: string;
}

interface Strategy {
  id: string;
  nome_estrategia: string;
  gatilho_venda_principal: string;
  total_tentativas: number;
  total_conversoes_premium: number;
  taxa_sucesso: number;
  pre_prompt_contexto: string;
}

interface Campaign {
  id: string;
  data_disparo: string;
  total_alvo: number;
  template_utilizado: string;
  logs_sucesso: number;
  logs_falha: number;
  regioes?: { nome_cidade: string };
  bairros_envolvidos: Record<string, number>;
}

interface Establishment {
  id: string;
  nome: string;
  bairro: string;
  whatsapp_numero: string;
  status_plano: 'Premium_Cortesia' | 'Premium_Pago' | 'Free';
  status_reivindicacao: 'Nao_Contatado' | 'Notificado' | 'Em_Conversa' | 'Reivindicado';
  humor_lead: 'Interessado' | 'Duvida' | 'Neutro' | 'Irritado' | 'Opt-Out' | null;
  registro_estrategias_ia?: { nome_estrategia: string };
}

export default function AdminCrm() {
  const [activeTab, setActiveTab] = useState<'overview' | 'campaign' | 'leads' | 'chatbot'>('overview');
  const [loading, setLoading] = useState(true);

  // Database Data
  const [regions, setRegions] = useState<Region[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leads, setLeads] = useState<Establishment[]>([]);

  // Batch Campaign Form States
  const [selectedRegionId, setSelectedRegionId] = useState<string>('');
  const [batchLimit, setBatchLimit] = useState<number>(20);
  const [templateName, setTemplateName] = useState<string>('boas_vindas_premium');
  const [delayMs, setDelayMs] = useState<number>(3000); // 3 seconds default for mock/low delay
  const [sendingBatch, setSendingBatch] = useState(false);

  // BI Chatbot States
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    { role: 'assistant', text: 'Olá, Administrador! Sou a Inteligência de Negócios (BI) do FilterFood. Posso analisar todos os dados do CRM comercial, estratégias de IA e campanhas disparadas. Pergunte-me qualquer insight sobre as conversões!' }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Stats summaries
  const [stats, setStats] = useState({
    totalLeads: 0,
    claimedCount: 0,
    paidPremium: 0,
    conversionRate: 0,
  });

  const loadCrmData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Regions
      const { data: regionsData } = await supabase.from('regioes').select('*');
      setRegions(regionsData || []);

      // 2. Fetch AI Strategies
      const { data: stratData } = await supabase
        .from('registro_estrategias_ia')
        .select('*')
        .order('taxa_sucesso', { ascending: false });
      setStrategies(stratData || []);

      // 3. Fetch Campaigns Log
      const { data: campData } = await supabase
        .from('campanhas_lotes')
        .select('*, regioes(nome_cidade)')
        .order('data_disparo', { ascending: false });
      setCampaigns(campData as any || []);

      // 4. Fetch Leads
      const { data: leadsData } = await supabase
        .from('estabelecimentos')
        .select('*, registro_estrategias_ia(nome_estrategia)')
        .order('created_at', { ascending: false })
        .limit(50);
      setLeads(leadsData as any || []);

      // Calculate stats
      const { data: allLeads } = await supabase.from('estabelecimentos').select('status_plano, status_reivindicacao');
      if (allLeads) {
        const total = allLeads.length;
        const claimed = allLeads.filter(l => l.status_reivindicacao === 'Reivindicado').length;
        const paid = allLeads.filter(l => l.status_plano === 'Premium_Pago').length;
        setStats({
          totalLeads: total,
          claimedCount: claimed,
          paidPremium: paid,
          conversionRate: claimed > 0 ? Math.round((paid / claimed) * 100) : 0,
        });
      }
    } catch (e) {
      console.error(e);
      showError('Falha ao carregar dados do CRM.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCrmData();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  // Handle Trigger Campaign
  const handleTriggerCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRegionId || !templateName) {
      showError('Selecione a Região e o Template de Mensagem.');
      return;
    }

    setSendingBatch(true);
    try {
      const { data, error } = await supabase.functions.invoke('crm-send-batch', {
        body: {
          regiao_id: selectedRegionId,
          limit: Number(batchLimit),
          template_name: templateName,
          delayMs: Number(delayMs)
        }
      });

      if (error) throw error;

      showSuccess(`Campanha executada! Sucesso: ${data.sucesso}, Falhas: ${data.falha}`);
      loadCrmData();
    } catch (err: any) {
      console.error(err);
      showError(err.message || 'Erro ao disparar campanha.');
    } finally {
      setSendingBatch(false);
    }
  };

  // Handle BI Chatbot Submit
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('crm-chatbot-bi', {
        body: { question: userMsg }
      });

      if (error) throw error;
      setMessages(prev => [...prev, { role: 'assistant', text: data.response || 'Desculpe, não consegui obter resposta.' }]);
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', text: `Ocorreu um erro ao consultar o BI: ${err.message || 'Erro de rede'}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-['Poppins'] pb-10">
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-primary flex items-center gap-2">
            <Megaphone className="w-8 h-8 text-highlight" />
            CRM Inteligente & Vendas IA
          </h1>
          <p className="text-slate-500 text-sm">Controle de prospecção multi-região, disparos proporcionalizados e auto-otimização por inteligência artificial.</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadCrmData} 
          disabled={loading}
          className="rounded-xl border-slate-200"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-xs border-slate-100 rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Prospects</CardDescription>
            <CardTitle className="text-3xl font-black text-slate-800">{stats.totalLeads}</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-[10px] text-slate-400 font-semibold">Leads importados na base</span>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-slate-100 rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-slate-400">Reivindicados</CardDescription>
            <CardTitle className="text-3xl font-black text-[#25D366]">{stats.claimedCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-[10px] text-slate-400 font-semibold">Donos que acessaram a cortesia</span>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-slate-100 rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-slate-400">Premium Pago</CardDescription>
            <CardTitle className="text-3xl font-black text-amber-500">{stats.paidPremium}</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-[10px] text-slate-400 font-semibold">Conversão de vendas finalizadas</span>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-slate-100 rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-bold uppercase tracking-wider text-slate-400">Taxa de Conversão</CardDescription>
            <CardTitle className="text-3xl font-black text-[#EF2A39]">{stats.conversionRate}%</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-[10px] text-slate-400 font-semibold">Percentual de fechamento pago</span>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-white border border-slate-100 rounded-2xl">
          <TabsTrigger value="overview" className="py-2.5 rounded-xl text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
            <TrendingUp className="w-4 h-4 mr-1.5" />
            Estratégias de IA
          </TabsTrigger>
          <TabsTrigger value="campaign" className="py-2.5 rounded-xl text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
            <Megaphone className="w-4 h-4 mr-1.5" />
            Disparador Lotes
          </TabsTrigger>
          <TabsTrigger value="leads" className="py-2.5 rounded-xl text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
            <Layers className="w-4 h-4 mr-1.5" />
            Lista de Leads
          </TabsTrigger>
          <TabsTrigger value="chatbot" className="py-2.5 rounded-xl text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
            <Bot className="w-4 h-4 mr-1.5" />
            Consultor de BI Chat
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          {/* TAB 1: OVERVIEW & STRATEGIES */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* List of Strategies */}
              <div className="md:col-span-2 space-y-4">
                <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-highlight" />
                  Biblioteca de Abordagens Comerciais de Venda
                </h3>
                
                {strategies.length > 0 ? (
                  strategies.map((strat, idx) => (
                    <Card key={strat.id} className="border-slate-100 shadow-xs hover:border-slate-200 transition-all rounded-2xl relative overflow-hidden">
                      {idx === 0 && strat.taxa_sucesso > 0 && (
                        <div className="absolute top-0 right-0 bg-amber-500 text-white text-[8px] font-black uppercase tracking-wider py-1 px-3.5 rounded-bl-2xl">
                          Melhor Performance ⭐
                        </div>
                      )}
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-extrabold text-slate-800">{strat.nome_estrategia}</CardTitle>
                        <CardDescription className="text-xs text-slate-400">Gatilho Venda: <strong>{strat.gatilho_venda_principal}</strong></CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed italic">
                          "{strat.pre_prompt_contexto}"
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                          <div>Disparados: <span className="text-slate-800 font-extrabold">{strat.total_tentativas}</span></div>
                          <div>Vendas Premium: <span className="text-amber-600 font-extrabold">{strat.total_conversoes_premium}</span></div>
                          <div className="ml-auto">
                            Taxa de Conversão: 
                            <span className="text-[#EF2A39] font-black ml-1 text-sm bg-red-50 px-2 py-0.5 rounded-lg border border-red-100">
                              {Math.round(strat.taxa_sucesso * 100)}%
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-slate-400 text-xs text-center py-10">Nenhuma estratégia comercial semeada.</p>
                )}
              </div>

              {/* Regions lists */}
              <div className="space-y-4">
                <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-highlight" />
                  Cidades Cadastradas (Regiões)
                </h3>
                <Card className="border-slate-100 shadow-xs rounded-2xl">
                  <CardContent className="p-4 space-y-3">
                    {regions.length > 0 ? (
                      regions.map((reg) => (
                        <div key={reg.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                          <div>
                            <h4 className="text-xs font-bold text-slate-850">{reg.nome_cidade} - {reg.uf}</h4>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">DDD {reg.ddd_oficial}</p>
                          </div>
                          <Badge variant="outline" className="text-[9px] bg-green-50 text-green-600 border-green-200 uppercase font-black tracking-wider">
                            Ativa
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 text-xs text-center py-6">Nenhuma região comercial configurada no banco.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

            </div>
          </TabsContent>

          {/* TAB 2: DISPARADOR LOTES */}
          <TabsContent value="campaign" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Campaign dispatch form */}
              <Card className="border-slate-100 shadow-xs rounded-2xl h-fit">
                <CardHeader>
                  <CardTitle className="text-sm font-extrabold text-slate-800">Agendar Lote Comercial</CardTitle>
                  <CardDescription className="text-xs">Configure o tamanho do lote e DDD de disparo.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleTriggerCampaign} className="space-y-4 text-xs">
                    
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-600">Região Alvo</label>
                      <Select value={selectedRegionId} onValueChange={setSelectedRegionId}>
                        <SelectTrigger className="rounded-xl border-slate-200">
                          <SelectValue placeholder="Selecione a cidade..." />
                        </SelectTrigger>
                        <SelectContent>
                          {regions.map((reg) => (
                            <SelectItem key={reg.id} value={reg.id}>
                              {reg.nome_cidade} - {reg.uf} (DDD {reg.ddd_oficial})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-600">Limite de Envio (Leads)</label>
                      <Input 
                        type="number"
                        min={1}
                        max={200}
                        value={batchLimit}
                        onChange={(e) => setBatchLimit(Number(e.target.value))}
                        className="rounded-xl border-slate-200"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-600">Template Meta WhatsApp</label>
                      <Input 
                        type="text"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        className="rounded-xl border-slate-200"
                        placeholder="Nome do template homologado..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-600">Intervalo entre Mensagens (ms)</label>
                      <Input 
                        type="number"
                        min={500}
                        value={delayMs}
                        onChange={(e) => setDelayMs(Number(e.target.value))}
                        className="rounded-xl border-slate-200"
                      />
                      <span className="text-[9px] text-slate-400 leading-normal block">Intervalo de segurança recomendado pela Meta API.</span>
                    </div>

                    <Button
                      type="submit"
                      disabled={sendingBatch || !selectedRegionId}
                      className="w-full h-11 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl mt-2 border-none"
                    >
                      {sendingBatch ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Disparando Lote...
                        </span>
                      ) : (
                        'Iniciar Disparo Proporcional'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Campaigns log list */}
              <div className="md:col-span-2 space-y-4">
                <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-highlight" />
                  Histórico de Campanhas e Auditoria de Disparos
                </h3>

                <div className="space-y-3">
                  {campaigns.length > 0 ? (
                    campaigns.map((camp) => (
                      <Card key={camp.id} className="border-slate-100 shadow-xs rounded-2xl">
                        <CardContent className="p-4 flex items-center justify-between gap-4 text-xs font-semibold text-slate-500">
                          <div className="space-y-1">
                            <h4 className="text-sm font-extrabold text-slate-850">
                              Cidade: {camp.regioes?.nome_cidade || 'Recife'}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-semibold">
                              Template: <code className="bg-slate-150 px-1 py-0.5 rounded text-[9px]">{camp.template_utilizado}</code>
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              Disparo em: {new Date(camp.data_disparo).toLocaleString('pt-BR')}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-1.5 max-w-[200px] justify-end">
                            {Object.entries(camp.bairros_envolvidos || {}).map(([b, qty]) => (
                              <Badge key={b} variant="outline" className="text-[9px] bg-slate-50 font-bold border-slate-200">
                                {b}: {qty}
                              </Badge>
                            ))}
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-slate-800 font-black text-sm">{camp.total_alvo} Leads</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[#25D366] font-bold flex items-center gap-0.5">
                                <CheckCircle className="w-3 h-3" /> {camp.logs_sucesso}
                              </span>
                              <span className="text-[#EF2A39] font-bold flex items-center gap-0.5">
                                <XCircle className="w-3 h-3" /> {camp.logs_falha}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <p className="text-slate-400 text-xs text-center py-10">Nenhuma campanha registrada no log.</p>
                  )}
                </div>
              </div>

            </div>
          </TabsContent>

          {/* TAB 3: LEADS LIST */}
          <TabsContent value="leads" className="space-y-4">
            <Card className="border-slate-100 shadow-xs rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-slate-50">
                <CardTitle className="text-sm font-extrabold text-slate-850 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-highlight" />
                  Estabelecimentos Cadastrados
                </CardTitle>
                <CardDescription className="text-xs">Visualização geral dos prospects importados no banco do CRM.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      <th className="p-3 pl-5">Nome</th>
                      <th className="p-3">Bairro</th>
                      <th className="p-3">WhatsApp</th>
                      <th className="p-3">Status Plano</th>
                      <th className="p-3">Prospecção</th>
                      <th className="p-3">Humor Lead</th>
                      <th className="p-3 pr-5">Abordagem IA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-semibold">
                    {leads.length > 0 ? (
                      leads.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 pl-5 font-bold text-slate-800">{l.nome}</td>
                          <td className="p-3 text-slate-500 font-medium">{l.bairro}</td>
                          <td className="p-3 text-slate-500 font-medium">{l.whatsapp_numero}</td>
                          <td className="p-3">
                            <Badge 
                              className={cn(
                                "text-[9px] font-bold border rounded-full uppercase shadow-none",
                                l.status_plano === 'Premium_Pago' && "bg-amber-500/10 text-amber-600 border-amber-500/20",
                                l.status_plano === 'Premium_Cortesia' && "bg-green-500/10 text-green-600 border-green-500/20",
                                l.status_plano === 'Free' && "bg-slate-100 text-slate-400 border-slate-200"
                              )}
                            >
                              {l.status_plano}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-[9px] font-black border uppercase shadow-none",
                                l.status_reivindicacao === 'Reivindicado' && "bg-green-500 text-white border-green-600",
                                l.status_reivindicacao === 'Em_Conversa' && "bg-blue-500/10 text-blue-600 border-blue-500/20",
                                l.status_reivindicacao === 'Notificado' && "bg-amber-500/10 text-amber-600 border-amber-500/20",
                                l.status_reivindicacao === 'Nao_Contatado' && "bg-slate-100 text-slate-400"
                              )}
                            >
                              {l.status_reivindicacao}
                            </Badge>
                          </td>
                          <td className="p-3">
                            {l.humor_lead ? (
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-[9px] font-bold border shadow-none",
                                  l.humor_lead === 'Interessado' && "bg-green-50 text-green-600 border-green-200",
                                  l.humor_lead === 'Irritado' && "bg-red-50 text-red-600 border-red-200",
                                  l.humor_lead === 'Opt-Out' && "bg-slate-100 text-slate-450",
                                  (l.humor_lead === 'Duvida' || l.humor_lead === 'Neutro') && "bg-blue-50 text-blue-600 border-blue-200"
                                )}
                              >
                                {l.humor_lead}
                              </Badge>
                            ) : '-'}
                          </td>
                          <td className="p-3 pr-5 text-[10px] text-slate-500 font-medium">
                            {l.registro_estrategias_ia?.nome_estrategia || '-'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400">Nenhum estabelecimento listado.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: BI CHATBOT */}
          <TabsContent value="chatbot" className="space-y-4">
            <Card className="border-slate-100 shadow-xs rounded-2xl overflow-hidden flex flex-col h-[520px]">
              <CardHeader className="border-b border-slate-50 bg-slate-50 flex flex-row items-center gap-3">
                <div className="p-2.5 bg-highlight text-white rounded-2xl">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm font-extrabold text-slate-800">IA de Gestão Interna de BI</CardTitle>
                  <CardDescription className="text-xs">Consulte o aprendizado comercial, conversões e eficácia das estratégias.</CardDescription>
                </div>
              </CardHeader>
              
              {/* Message scroll container */}
              <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                {messages.map((m, idx) => {
                  const isAssistant = m.role === 'assistant';
                  return (
                    <div 
                      key={idx} 
                      className={cn(
                        "flex gap-2 max-w-[85%] text-xs font-semibold leading-relaxed p-3.5 rounded-2xl shadow-xs",
                        isAssistant 
                          ? "bg-white text-slate-800 mr-auto border border-slate-100 rounded-bl-none" 
                          : "bg-primary text-white ml-auto rounded-br-none"
                      )}
                    >
                      {isAssistant && <Bot className="w-4 h-4 text-highlight shrink-0 mt-0.5" />}
                      <div className="whitespace-pre-line">{m.text}</div>
                    </div>
                  );
                })}
                
                {chatLoading && (
                  <div className="bg-white text-slate-800 mr-auto border border-slate-100 rounded-bl-none p-4 rounded-2xl shadow-xs flex items-center gap-2 max-w-[150px]">
                    <Loader2 className="w-4 h-4 animate-spin text-highlight" />
                    <span className="text-[10px] text-slate-400 font-bold">Analisando dados...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input form */}
              <div className="p-3 bg-white border-t border-slate-100 shrink-0">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input 
                    type="text"
                    placeholder="Ex: Quais estratégias geraram mais conversões premium pagas em João Pessoa?"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={chatLoading}
                    className="flex-grow rounded-xl border-slate-200 text-xs h-11"
                  />
                  <Button 
                    type="submit" 
                    disabled={chatLoading || !chatInput.trim()}
                    className="bg-primary hover:bg-primary/95 text-white rounded-xl h-11 px-4 border-none shadow-sm flex items-center justify-center"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

    </div>
  );
}

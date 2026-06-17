import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, BarChart3, Bot, Calendar, ChevronRight, Clock, 
  Filter, Mail, MessageSquare, Phone, Plus, Search, 
  Send, Sparkles, User, Zap, RefreshCw, Loader2, ArrowRight, MapPin, QrCode, Smartphone, Wifi, CheckCircle2
} from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Interfaces baseadas na nova arquitetura (Fase 2 e 3)
interface CommercialLead {
  id: string;
  restaurant_id: string;
  score: number;
  pipeline_stage: 'Uncontacted' | 'Qualified' | 'Negotiating' | 'Won' | 'Lost' | 'Nurturing';
  sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Objection' | 'Ready';
  is_ai_active: boolean;
  updated_at: string;
  restaurant?: {
    name: string;
    neighborhood: string;
    city: string;
    whatsapp_url: string;
  };
}

interface CommercialEvent {
  id: string;
  lead_id: string;
  event_type: string;
  payload: any;
  actor_type: string;
  created_at: string;
  lead?: {
    restaurant?: { name: string };
  };
}

const PIPELINE_STAGES = ['Uncontacted', 'Qualified', 'Negotiating', 'Won', 'Lost', 'Nurturing'];

export default function AdminCrm() {
  const [activeTab, setActiveTab] = useState('pipeline');
  const [loading, setLoading] = useState(true);

  const [leads, setLeads] = useState<CommercialLead[]>([]);
  const [events, setEvents] = useState<CommercialEvent[]>([]);

  // Analytics KPIs
  const [kpis, setKpis] = useState({
    totalLeads: 0,
    wonLeads: 0,
    activeNegotiations: 0,
    avgScore: 0
  });

  // Evolution API States
  const [evoUrl, setEvoUrl] = useState('http://localhost:8080');
  const [evoApiKey, setEvoApiKey] = useState('sua_chave_secreta_global_aqui');
  const [instanceName, setInstanceName] = useState('FilterFood-SDR');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('Desconectado');
  const [evoLoading, setEvoLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Leads (Apenas para restaurantes Importados/Visitados)
      const { data: leadsData, error: leadsError } = await supabase
        .from('commercial_leads')
        .select(`
          *,
          restaurant:restaurants!inner(name, neighborhood, city, whatsapp_url, is_published, is_deleted)
        `)
        .eq('restaurant.is_published', true)
        .or('restaurant.is_deleted.eq.false,restaurant.is_deleted.is.null')
        .order('score', { ascending: false });
      
      if (leadsError && leadsError.code !== '42P01') {
        // Ignora erro 42P01 (relation does not exist) prevendo a migration ainda nao rodar
        console.error(leadsError);
      }
      
      const loadedLeads = (leadsData as unknown as CommercialLead[]) || [];
      setLeads(loadedLeads);

      // 2. Fetch Events (Timeline)
      const { data: eventsData, error: eventsError } = await supabase
        .from('commercial_events')
        .select(`
          *,
          lead:commercial_leads(
            restaurant:restaurants(name)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!eventsError) {
        setEvents((eventsData as unknown as CommercialEvent[]) || []);
      }

      // Calculate KPIs
      if (loadedLeads.length > 0) {
        setKpis({
          totalLeads: loadedLeads.length,
          wonLeads: loadedLeads.filter(l => l.pipeline_stage === 'Won').length,
          activeNegotiations: loadedLeads.filter(l => l.pipeline_stage === 'Negotiating').length,
          avgScore: Math.round(loadedLeads.reduce((acc, curr) => acc + curr.score, 0) / loadedLeads.length)
        });
      }

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Evolution API Fetchers
  const checkInstanceStatus = async () => {
    if (!evoUrl || !evoApiKey) return;
    try {
      const res = await fetch(`${evoUrl}/instance/connectionState/${instanceName}`, {
        headers: { 'apikey': evoApiKey }
      });
      if (!res.ok) {
        setConnectionStatus('Offline / Servidor Inacessível');
        return;
      }
      const data = await res.json();
      setConnectionStatus(data?.instance?.state || 'Desconectado');
    } catch (e) {
      setConnectionStatus('Erro de Conexão');
    }
  };

  const generateQrCode = async () => {
    setEvoLoading(true);
    setQrCode(null);
    try {
      // Cria a instância se não existir
      await fetch(`${evoUrl}/instance/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': evoApiKey },
        body: JSON.stringify({
          instanceName: instanceName,
          token: instanceName,
          qrcode: true
        })
      });

      // Solicita a conexão / QR Code
      const res = await fetch(`${evoUrl}/instance/connect/${instanceName}`, {
        headers: { 'apikey': evoApiKey }
      });
      const data = await res.json();
      
      if (data?.base64) {
        setQrCode(data.base64);
        setConnectionStatus('Aguardando Leitura do QR');
      } else if (data?.instance?.state === 'open') {
        setConnectionStatus('open');
        showSuccess('WhatsApp já está conectado!');
      } else {
        showError('Erro ao gerar QR Code. Tente novamente.');
      }
    } catch (e) {
      showError('Falha ao conectar com o servidor Evolution API.');
    } finally {
      setEvoLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    checkInstanceStatus();
    
    // 1. Inscrições Supabase Realtime (Fase 9)
    // Otimização: Em vez de mutar a array local manualmente, chamamos o fetchData() para
    // garantir que todos os relacionamentos e KPIs (join com restaurants) venham íntegros.
    const leadsChannel = supabase.channel('realtime_leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'commercial_leads' }, (payload) => {
        console.log('[Realtime] Mudança no Lead:', payload);
        fetchData();
      })
      .subscribe();

    const eventsChannel = supabase.channel('realtime_events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'commercial_events' }, (payload) => {
        console.log('[Realtime] Novo Evento Registrado:', payload);
        fetchData();
      })
      .subscribe();

    // 2. Polling do status do WhatsApp a cada 10s se estiver na aba
    const interval = setInterval(() => {
      if (activeTab === 'whatsapp') checkInstanceStatus();
    }, 10000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(eventsChannel);
    };
  }, [activeTab]);

  // Helpers de Estilização
  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'Won': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'Lost': return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
      case 'Negotiating': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'Qualified': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'Nurturing': return 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20';
      default: return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch(sentiment) {
      case 'Positive': return <div className="w-2 h-2 rounded-full bg-emerald-500" title="Positivo" />;
      case 'Negative': return <div className="w-2 h-2 rounded-full bg-rose-500" title="Negativo" />;
      case 'Objection': return <div className="w-2 h-2 rounded-full bg-amber-500" title="Com Objeção" />;
      case 'Ready': return <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" title="Pronto para Fechar" />;
      default: return <div className="w-2 h-2 rounded-full bg-slate-300" title="Neutro" />;
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans bg-[#FAFAFA] min-h-screen p-6 rounded-3xl">
      {/* Header Estilo Linear */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Zap className="w-6 h-6 text-indigo-600 fill-indigo-600/20" />
            Intelligence OS
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Plataforma de prospecção autônoma guiada por eventos e Machine Learning.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchData} className="h-9 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Sincronizar
          </Button>
          <Button size="sm" className="h-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
            <Plus className="w-4 h-4 mr-2" />
            Nova Campanha
          </Button>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Prospects', value: kpis.totalLeads, icon: User },
          { label: 'Negociações Ativas', value: kpis.activeNegotiations, icon: Activity },
          { label: 'Score Médio', value: `${kpis.avgScore}/100`, icon: Sparkles },
          { label: 'Convertidos', value: kpis.wonLeads, icon: BarChart3 }
        ].map((kpi, i) => (
          <Card key={i} className="border border-slate-200/60 shadow-sm rounded-2xl bg-white">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-slate-50 rounded-xl">
                <kpi.icon className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{kpi.label}</p>
                <h3 className="text-2xl font-bold text-slate-900 leading-none mt-1">{kpi.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100/80 p-1 rounded-xl h-auto border border-slate-200/50">
          <TabsTrigger value="pipeline" className="rounded-lg text-sm font-medium px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-700">
            <Activity className="w-4 h-4 mr-2" /> Pipeline
          </TabsTrigger>
          <TabsTrigger value="timeline" className="rounded-lg text-sm font-medium px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-700">
            <Clock className="w-4 h-4 mr-2" /> Event Timeline
          </TabsTrigger>
          <TabsTrigger value="insights" className="rounded-lg text-sm font-medium px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-700">
            <Bot className="w-4 h-4 mr-2" /> AI Insights
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="rounded-lg text-sm font-medium px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-700">
            <Smartphone className="w-4 h-4 mr-2" /> Instância WhatsApp
          </TabsTrigger>
        </TabsList>

        {/* PIPELINE KANBAN VIEW */}
        <TabsContent value="pipeline" className="mt-6 outline-none">
          {leads.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Nenhum Lead Comercial Encontrado</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-sm text-center">Execute a migração SQL do CRM e sincronize os restaurantes existentes para gerar os primeiros leads no funil.</p>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x snap-mandatory">
              {PIPELINE_STAGES.map(stage => {
                const stageLeads = leads.filter(l => l.pipeline_stage === stage);
                return (
                  <div key={stage} className="min-w-[320px] w-[320px] shrink-0 flex flex-col snap-start">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{stage}</h3>
                      <Badge variant="secondary" className="bg-slate-200/50 text-slate-600 rounded-md font-mono text-xs">
                        {stageLeads.length}
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                      {stageLeads.map(lead => (
                        <Card key={lead.id} className="border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer bg-white rounded-xl">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {getSentimentIcon(lead.sentiment)}
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Score: {lead.score}</span>
                              </div>
                              {lead.is_ai_active ? (
                                <Badge variant="outline" className="text-[9px] bg-indigo-50 text-indigo-600 border-indigo-200 px-1.5 py-0">IA ATIVA</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-600 border-amber-200 px-1.5 py-0">HUMANO</Badge>
                              )}
                            </div>
                            
                            <h4 className="font-bold text-slate-900 truncate text-[15px] mb-1">
                              {lead.restaurant?.name || 'Desconhecido'}
                            </h4>
                            <p className="text-xs text-slate-500 truncate mb-4 flex items-center gap-1.5">
                              <MapPin className="w-3 h-3" />
                              {lead.restaurant?.neighborhood || 'Bairro Não Informado'}
                            </p>
                            
                            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                              <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(lead.updated_at), "dd MMM, HH:mm", { locale: ptBR })}
                              </span>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full">
                                <ArrowRight className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {stageLeads.length === 0 && (
                        <div className="h-24 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-xs font-medium">
                          Vazio
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TIMELINE EVENT SOURCING VIEW */}
        <TabsContent value="timeline" className="mt-6 outline-none">
          <Card className="border-slate-200/60 shadow-sm rounded-3xl bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                Global Event Stream
              </CardTitle>
              <CardDescription>Registro imutável de todas as interações no sistema (Event Sourcing).</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {events.length === 0 ? (
                  <div className="p-10 text-center text-slate-500 text-sm">Nenhum evento registrado.</div>
                ) : (
                  events.map(event => (
                    <div key={event.id} className="p-4 hover:bg-slate-50/50 transition-colors flex items-start gap-4">
                      <div className="mt-1 p-2 bg-indigo-50 rounded-xl border border-indigo-100/50">
                        {event.event_type.includes('WhatsApp') ? <MessageSquare className="w-4 h-4 text-indigo-600" /> : 
                         event.event_type.includes('QRCode') ? <Phone className="w-4 h-4 text-indigo-600" /> :
                         <Activity className="w-4 h-4 text-indigo-600" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-bold text-slate-900">{event.event_type}</h4>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {format(new Date(event.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mb-2">
                          <span className="font-semibold text-slate-800">{event.lead?.restaurant?.name || 'Sistema'}</span> • 
                          Ator: <Badge variant="outline" className="ml-1 text-[9px] bg-slate-100">{event.actor_type}</Badge>
                        </p>
                        <pre className="text-[10px] bg-slate-900 text-slate-300 p-3 rounded-lg overflow-x-auto font-mono">
                          {JSON.stringify(event.payload, null, 2)}
                        </pre>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI INSIGHTS VIEW */}
        <TabsContent value="insights" className="mt-6 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-slate-200/60 shadow-sm rounded-3xl bg-white h-[500px] flex flex-col">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-indigo-600" />
                  AI Chief Revenue Officer
                </CardTitle>
                <CardDescription>Chat de inteligência comercial focado em análise preditiva.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-center items-center p-6 text-center">
                <Sparkles className="w-12 h-12 text-indigo-200 mb-4" />
                <h3 className="text-slate-800 font-semibold mb-2">IA Conectada aos Eventos</h3>
                <p className="text-sm text-slate-500 max-w-sm">
                  O bot de BI agora analisa a tabela <code>commercial_events</code> para detectar padrões de objeção, horários de maior conversão e eficácia de campanhas em tempo real.
                </p>
              </CardContent>
              <CardFooter className="p-4 border-t border-slate-100 bg-slate-50">
                <div className="relative w-full">
                  <Input placeholder="Pergunte à IA comercial..." className="w-full pr-10 rounded-xl border-slate-200 bg-white" />
                  <Button size="sm" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 rounded-lg text-indigo-600 hover:bg-indigo-50">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>

            <Card className="border-slate-200/60 shadow-sm rounded-3xl bg-white h-[500px]">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  Performance Metrics
                </CardTitle>
                <CardDescription>Indicadores calculados a partir das assinaturas do sistema.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-sm font-medium mb-2">
                      <span className="text-slate-600">Taxa de Conversão (Lead -&gt; Won)</span>
                      <span className="text-indigo-600 font-bold">14.2%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-indigo-500 h-2 rounded-full" style={{ width: '14.2%' }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm font-medium mb-2">
                      <span className="text-slate-600">Engajamento QR Code (Físico -&gt; Digital)</span>
                      <span className="text-emerald-500 font-bold">38.5%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '38.5%' }}></div>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100/50">
                    <h4 className="text-sm font-bold text-amber-800 mb-1">Padrão de Objeção Detectado</h4>
                    <p className="text-xs text-amber-700">A IA notou um aumento de 22% na objeção "Já uso PDF no Linktree" nas últimas 48 horas nas campanhas de João Pessoa.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* WHATSAPP CONNECTION VIEW */}
        <TabsContent value="whatsapp" className="mt-6 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="border-slate-200/60 shadow-sm rounded-3xl bg-white">
              <CardHeader className="bg-emerald-50/50 border-b border-emerald-100 pb-4">
                <CardTitle className="text-lg font-bold text-emerald-900 flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-emerald-600" />
                  Sincronização WhatsApp Web
                </CardTitle>
                <CardDescription className="text-emerald-700/70">
                  Conecte seu celular para habilitar o envio autônomo da IA sem pagar a API Oficial.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8 flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="w-48 h-48 bg-white border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center relative overflow-hidden">
                    {qrCode ? (
                      <img src={qrCode} alt="WhatsApp QR Code" className="w-full h-full object-contain p-2" />
                    ) : connectionStatus === 'open' ? (
                      <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(68,64,60,0.05)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px] opacity-20 animate-pulse"></div>
                        <QrCode className="w-16 h-16 text-slate-300" />
                      </>
                    )}
                    
                    {connectionStatus !== 'open' && !qrCode && (
                      <div onClick={generateQrCode} className="absolute inset-0 backdrop-blur-sm bg-white/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
                        <Button variant="secondary" size="sm" className="shadow-lg" disabled={evoLoading}>
                          {evoLoading ? 'Gerando...' : 'Gerar QR Code'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                
                <h3 className="font-bold text-slate-900 text-lg mb-2">
                  {connectionStatus === 'open' ? 'Conectado!' : connectionStatus}
                </h3>
                <p className="text-sm text-slate-500 mb-6">
                  {connectionStatus === 'open' 
                    ? 'A IA já tem permissão para ler e enviar mensagens comerciais automaticamente no seu WhatsApp.'
                    : 'Abra o WhatsApp no seu celular, vá em Aparelhos Conectados e aponte a câmera para parear o número da empresa.'}
                </p>
                <Button 
                  onClick={generateQrCode} 
                  disabled={evoLoading || connectionStatus === 'open'}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm h-11"
                >
                  {evoLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />} 
                  Solicitar Novo QR Code
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-slate-200/60 shadow-sm rounded-3xl bg-white overflow-hidden">
                <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
                  <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-slate-500" /> Configuração do Servidor VPS
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600">URL da Evolution API</label>
                    <Input 
                      value={evoUrl} 
                      onChange={(e) => setEvoUrl(e.target.value)}
                      placeholder="http://seu-ip:8080" 
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600">Global API Key</label>
                    <Input 
                      value={evoApiKey} 
                      onChange={(e) => setEvoApiKey(e.target.value)}
                      type="password"
                      placeholder="Sua chave secreta" 
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <span className="text-sm font-medium text-slate-600">Status da Instância:</span>
                    <Badge variant={connectionStatus === 'open' ? 'default' : 'outline'} className={connectionStatus === 'open' ? 'bg-emerald-500' : 'bg-slate-100 text-slate-500'}>
                      {connectionStatus.toUpperCase()}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <div className="bg-indigo-50 p-5 rounded-3xl border border-indigo-100/50">
                <div className="flex gap-3">
                  <Bot className="w-6 h-6 text-indigo-600 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-indigo-900 mb-1">Como a IA assume o controle?</h4>
                    <p className="text-xs text-indigo-700 leading-relaxed">
                      Quando você escanear o QR Code, a plataforma ouvirá todos os Webhooks. Se um lead mandar mensagem, a IA verifica a tabela <code className="bg-indigo-100 px-1 rounded">commercial_events</code>, gera a resposta via OpenAI e dispara usando a mesma sessão do seu WhatsApp Web, como se fosse um humano digitando.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

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
  Send, Sparkles, User, Zap, RefreshCw, Loader2, ArrowRight, MapPin, QrCode, Smartphone, Wifi, CheckCircle2,
  Download, ExternalLink
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
  ai_agent_id?: string | null;
  public_profile_screenshot_url?: string | null;
  updated_at: string;
  restaurant?: {
    name: string;
    neighborhood: string;
    city: string;
    whatsapp_url: string;
  };
}

interface AiAgent {
  id: string;
  name: string;
  tone: string;
  system_prompt: string;
}

interface BusinessRule {
  id: string;
  rule_name: string;
  rule_content: string;
  is_active: boolean;
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

  // Z-API Configuration States
  const [zapiInstanceId, setZapiInstanceId] = useState('');
  const [zapiInstanceToken, setZapiInstanceToken] = useState('');
  const [zapiClientToken, setZapiClientToken] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('Desconectado');
  const [evoLoading, setEvoLoading] = useState(false);

  // Broadcast States
  const [selectedStage, setSelectedStage] = useState('Uncontacted');
  const [broadcastMessage, setBroadcastMessage] = useState('Olá {nome}! Tudo bem? Gostaria de apresentar uma novidade do FilterFood para vocês.');
  const [sendDelay, setSendDelay] = useState(5); // 5 seconds
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastProgress, setBroadcastProgress] = useState({ current: 0, total: 0 });

  // Lead Details Modal States
  const [selectedLead, setSelectedLead] = useState<CommercialLead | null>(null);
  const [leadEvents, setLeadEvents] = useState<CommercialEvent[]>([]);
  const [isEventsLoading, setIsEventsLoading] = useState(false);
  const [manualMessage, setManualMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // AI Agents & Business Rules States
  const [aiAgents, setAiAgents] = useState<AiAgent[]>([]);
  const [businessRules, setBusinessRules] = useState<BusinessRule[]>([]);
  
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentTone, setNewAgentTone] = useState('Descontraído');
  const [newAgentPrompt, setNewAgentPrompt] = useState('');
  const [editingAgent, setEditingAgent] = useState<AiAgent | null>(null);

  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleContent, setNewRuleContent] = useState('');
  const [editingRule, setEditingRule] = useState<BusinessRule | null>(null);

  // Playground States
  const [playgroundAgentId, setPlaygroundAgentId] = useState<string>('');
  const [playgroundRestaurantName, setPlaygroundRestaurantName] = useState<string>('Açaí Arretado');
  const [playgroundRules, setPlaygroundRules] = useState<Record<string, boolean>>({});
  const [playgroundMessages, setPlaygroundMessages] = useState<{ role: 'assistant' | 'user'; content: string; image_url?: string }[]>([]);
  const [playgroundInput, setPlaygroundInput] = useState<string>('');
  const [isPlaygroundTyping, setIsPlaygroundTyping] = useState<boolean>(false);
  const [playgroundApiKey, setPlaygroundApiKey] = useState<string>(() => localStorage.getItem('user_openai_key') || '');
  const [isRegeneratingScreenshot, setIsRegeneratingScreenshot] = useState<boolean>(false);
  const [broadcastSendScreenshots, setBroadcastSendScreenshots] = useState<boolean>(true);
  const [broadcastUpdateScreenshots, setBroadcastUpdateScreenshots] = useState<boolean>(true);
  const [manualSendScreenshot, setManualSendScreenshot] = useState<boolean>(true);
  const [manualUpdateScreenshot, setManualUpdateScreenshot] = useState<boolean>(true);

  const handleDownloadImage = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'cardapio_completo.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Failed to download image, opening in new tab:", error);
      window.open(url, '_blank');
    }
  };

  const selectedLeadRef = React.useRef<CommercialLead | null>(null);
  useEffect(() => {
    selectedLeadRef.current = selectedLead;
  }, [selectedLead]);

  const fetchLeadEvents = async (leadId: string) => {
    setIsEventsLoading(true);
    try {
      const { data, error } = await supabase
        .from('commercial_events')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true });
      if (!error) {
        setLeadEvents(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsEventsLoading(false);
    }
  };

  const handleSendManualMessage = async () => {
    if (!selectedLead || !manualMessage.trim()) return;
    if (!zapiInstanceId || !zapiInstanceToken) {
      showError("Por favor, configure o WhatsApp primeiro.");
      return;
    }

    setIsSendingMessage(true);
    const phone = selectedLead.restaurant?.whatsapp_url?.replace(/\D/g, '') || selectedLead.restaurant?.whatsapp_url;
    const formattedPhone = phone ? (phone.startsWith('55') ? phone : '55' + phone) : '';

    if (!formattedPhone) {
      showError("Este restaurante não possui número de telefone válido.");
      setIsSendingMessage(false);
      return;
    }

    try {
      // 1. Regenerar o print do perfil público em tempo real se marcado
      let screenshotUrl = selectedLead.public_profile_screenshot_url;
      if (manualUpdateScreenshot) {
        try {
          console.log(`[Manual] Atualizando print em tempo real para: ${selectedLead.restaurant?.name}`);
          const ssRes = await fetch(`/api/local-collector/screenshot?id=${selectedLead.restaurant_id}&origin=${window.location.origin}`);
          if (ssRes.ok) {
            const ssData = await ssRes.json();
            if (ssData.success && ssData.publicUrl) {
              screenshotUrl = ssData.publicUrl;
              // Atualizar estado local para refletir na tela imediatamente
              setSelectedLead(prev => prev ? { ...prev, public_profile_screenshot_url: ssData.publicUrl } : null);
              fetchData(); // Mantém a lista atualizada
            }
          }
        } catch (ssErr) {
          console.error(`Erro ao atualizar print para ${selectedLead.restaurant?.name}:`, ssErr);
        }
      }

      const headers: any = { 'Content-Type': 'application/json' };
      if (zapiClientToken) headers['client-token'] = zapiClientToken;

      const hasScreenshot = manualSendScreenshot && !!screenshotUrl;
      const endpoint = hasScreenshot ? 'send-image' : 'send-text';
      const payload = hasScreenshot
        ? {
            phone: formattedPhone,
            image: screenshotUrl,
            caption: manualMessage
          }
        : {
            phone: formattedPhone,
            message: manualMessage
          };

      const res = await fetch(`https://api.z-api.io/instances/${zapiInstanceId}/token/${zapiInstanceToken}/${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await supabase.from('commercial_events').insert({
          lead_id: selectedLead.id,
          event_type: hasScreenshot ? 'WhatsAppImageSent' : 'WhatsAppMessageSent',
          actor_type: 'Human',
          payload: hasScreenshot 
            ? { text: manualMessage, image_url: screenshotUrl, numberSentTo: formattedPhone }
            : { text: manualMessage, numberSentTo: formattedPhone }
        });
        setManualMessage('');
        showSuccess("Mensagem enviada com sucesso!");
        fetchLeadEvents(selectedLead.id);
      } else {
        showError("Falha ao enviar mensagem via Z-API.");
      }
    } catch (e) {
      console.error(e);
      showError("Erro de conexão ao enviar mensagem.");
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleToggleAi = async (newStatus: boolean) => {
    if (!selectedLead) return;
    try {
      const { error } = await supabase
        .from('commercial_leads')
        .update({ is_ai_active: newStatus })
        .eq('id', selectedLead.id);

      if (!error) {
        setSelectedLead(prev => prev ? { ...prev, is_ai_active: newStatus } : null);
        showSuccess(`Agente de IA ${newStatus ? 'ativado' : 'desativado'} para este lead.`);
        fetchData();
      } else {
        showError("Erro ao atualizar status da IA: " + error.message);
      }
    } catch (e: any) {
      showError("Erro: " + e.message);
    }
  };

  const handleChangeStage = async (newStage: any) => {
    if (!selectedLead) return;
    try {
      const { error } = await supabase
        .from('commercial_leads')
        .update({ pipeline_stage: newStage })
        .eq('id', selectedLead.id);

      if (!error) {
        setSelectedLead(prev => prev ? { ...prev, pipeline_stage: newStage } : null);
        showSuccess(`Estágio atualizado para ${newStage}.`);
        fetchData();
      } else {
        showError("Erro ao atualizar estágio: " + error.message);
      }
    } catch (e: any) {
      showError("Erro: " + e.message);
    }
  };

  // AI Agents CRUD Operations
  const fetchAgentsAndRules = async () => {
    try {
      const { data: agents, error: errAgents } = await supabase.from('crm_ai_agents').select('*').order('name');
      if (!errAgents) {
        setAiAgents(agents || []);
        if (agents && agents.length > 0 && !playgroundAgentId) {
          setPlaygroundAgentId(agents[0].id);
        }
      }

      const { data: rules, error: errRules } = await supabase.from('crm_business_rules').select('*').order('rule_name');
      if (!errRules) {
        setBusinessRules(rules || []);
        const rulesMap: Record<string, boolean> = {};
        rules?.forEach(r => {
          rulesMap[r.id] = r.is_active;
        });
        setPlaygroundRules(rulesMap);
      }
    } catch (e) {
      console.error("Erro ao carregar vendedores e regras:", e);
    }
  };

  const handleStartPlayground = async () => {
    const key = playgroundApiKey || import.meta.env.VITE_OPENAI_API_KEY || '';
    if (!key) {
      showError("Por favor, configure sua chave API da OpenAI para testar.");
      return;
    }
    
    if (playgroundApiKey) {
      localStorage.setItem('user_openai_key', playgroundApiKey.trim());
    }

    setIsPlaygroundTyping(true);
    setPlaygroundMessages([]);

    try {
      const selectedAgent = aiAgents.find(a => a.id === playgroundAgentId);
      
      let agentSystemPrompt = `Você é um Consultor SDR B2B (Representante de Vendas) da FilterFood.
Restaurante alvo: ${playgroundRestaurantName}.
Sua missão: Entrar em contato com esse restaurante. 

DIRETRIZES CRÍTICAS:
1. SEMPRE peça gentilmente um contato ou pergunte se pode falar com o responsável/proprietário do estabelecimento.
2. Explique o motivo do contato (mostrar uma tecnologia nova de cardápio digital sem taxas do FilterFood).
3. NUNCA pareça uma propaganda, robô ou telemarketing. Seja extremamente humano, use linguagem casual mas profissional (ex: "Oi pessoal do ${playgroundRestaurantName}, tudo bem?").
4. Se o dono falar que tem dois números (um pessoal e um empresarial), anote e mantenha a conversa fluindo.
5. NUNCA conceda descontos. Seu objetivo é apenas qualificar o interesse e explicar o benefício primário.
6. Mantenha as mensagens muito curtas (1 ou 2 parágrafos no máximo).

Se for a sua primeira mensagem (Início da Prospecção), seja sutil: "Oi! Aqui é da equipe FilterFood, tudo bem? Queria falar com o proprietário do ${playgroundRestaurantName} rapidinho sobre uma melhoria pro delivery de vocês, com quem eu falo?"`;

      if (selectedAgent) {
        agentSystemPrompt = `${selectedAgent.system_prompt}
Restaurante alvo: ${playgroundRestaurantName}.
Sua missão: Entrar em contato com esse restaurante.`;
      }

      const activeRules = businessRules.filter(r => playgroundRules[r.id]);
      let rulesContext = "";
      if (activeRules.length > 0) {
        rulesContext = "\n\nREGRAS GERAIS E INFORMAÇÕES DO NEGÓCIO:\n" + activeRules.map(r => `[${r.rule_name}]: ${r.rule_content}`).join('\n');
      }

      const systemPrompt = agentSystemPrompt + rulesContext;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Inicie a conversa de prospecção enviando a primeira mensagem de contato.' }
          ],
          temperature: 0.7,
          max_tokens: 150
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || `Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content?.trim();

      if (reply) {
        const normalizeText = (text: string) => 
          text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
          
        const matchedLead = leads.find(l => {
          if (!l.restaurant?.name) return false;
          return normalizeText(l.restaurant.name).includes(normalizeText(playgroundRestaurantName));
        });
        const screenshotUrl = matchedLead?.public_profile_screenshot_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1000';

        setPlaygroundMessages([
          { role: 'assistant', content: reply },
          { role: 'assistant', content: "Veja como ficou o perfil do seu restaurante no FilterFood! Já criamos a base para você.", image_url: screenshotUrl }
        ]);
      }
    } catch (e: any) {
      showError("Erro ao iniciar teste: " + e.message);
    } finally {
      setIsPlaygroundTyping(false);
    }
  };

  const handleSendPlaygroundMessage = async () => {
    if (!playgroundInput.trim() || isPlaygroundTyping) return;
    
    const key = playgroundApiKey || import.meta.env.VITE_OPENAI_API_KEY || '';
    if (!key) {
      showError("Chave API da OpenAI ausente.");
      return;
    }

    const userMsg = playgroundInput.trim();
    setPlaygroundInput('');
    
    const updatedMessages = [...playgroundMessages, { role: 'user', content: userMsg } as const];
    setPlaygroundMessages(updatedMessages);
    setIsPlaygroundTyping(true);

    try {
      const selectedAgent = aiAgents.find(a => a.id === playgroundAgentId);
      
      let agentSystemPrompt = `Você é um Consultor SDR B2B (Representante de Vendas) da FilterFood.
Restaurante alvo: ${playgroundRestaurantName}.
Sua missão: Entrar em contato com esse restaurante. 

DIRETRIZES CRÍTICAS:
1. SEMPRE peça gentilmente um contato ou pergunte se pode falar com o responsável/proprietário do estabelecimento.
2. Explique o motivo do contato (mostrar uma tecnologia nova de cardápio digital sem taxas do FilterFood).
3. NUNCA pareça uma propaganda, robô ou telemarketing. Seja extremamente humano, use linguagem casual mas profissional (ex: "Oi pessoal do ${playgroundRestaurantName}, tudo bem?").
4. Se o dono falar que tem dois números (um pessoal e um empresarial), anote e mantenha a conversa fluindo.
5. NUNCA conceda descontos. Seu objetivo é apenas qualificar o interesse e explicar o benefício primário.
6. Mantenha as mensagens muito curtas (1 ou 2 parágrafos no máximo).

Se for a sua primeira mensagem (Início da Prospecção), seja sutil: "Oi! Aqui é da equipe FilterFood, tudo bem? Queria falar com o proprietário do ${playgroundRestaurantName} rapidinho sobre uma melhoria pro delivery de vocês, com quem eu falo?"`;

      if (selectedAgent) {
        agentSystemPrompt = `${selectedAgent.system_prompt}
Restaurante alvo: ${playgroundRestaurantName}.
Sua missão: Entrar em contato com esse restaurante.`;
      }

      const activeRules = businessRules.filter(r => playgroundRules[r.id]);
      let rulesContext = "";
      if (activeRules.length > 0) {
        rulesContext = "\n\nREGRAS GERAIS E INFORMAÇÕES DO NEGÓCIO:\n" + activeRules.map(r => `[${r.rule_name}]: ${r.rule_content}`).join('\n');
      }

      const systemPrompt = agentSystemPrompt + rulesContext;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            ...updatedMessages
          ],
          temperature: 0.7,
          max_tokens: 150
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || `Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content?.trim();

      if (reply) {
        setPlaygroundMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      }
    } catch (e: any) {
      showError("Erro na resposta do vendedor: " + e.message);
    } finally {
      setIsPlaygroundTyping(false);
    }
  };

  const handleCreateAgent = async () => {
    if (!newAgentName.trim() || !newAgentPrompt.trim()) {
      showError("Por favor, preencha o nome e o prompt do vendedor.");
      return;
    }
    try {
      const { error } = await supabase.from('crm_ai_agents').insert({
        name: newAgentName,
        tone: newAgentTone,
        system_prompt: newAgentPrompt
      });
      if (!error) {
        showSuccess("Vendedor de IA criado com sucesso!");
        setNewAgentName('');
        setNewAgentPrompt('');
        fetchAgentsAndRules();
      } else {
        showError("Erro ao criar vendedor: " + error.message);
      }
    } catch (e: any) {
      showError("Erro: " + e.message);
    }
  };

  const handleUpdateAgent = async () => {
    if (!editingAgent || !editingAgent.name.trim() || !editingAgent.system_prompt.trim()) {
      showError("Por favor, preencha o nome e o prompt do vendedor.");
      return;
    }
    try {
      const { error } = await supabase.from('crm_ai_agents').update({
        name: editingAgent.name,
        tone: editingAgent.tone,
        system_prompt: editingAgent.system_prompt
      }).eq('id', editingAgent.id);
      if (!error) {
        showSuccess("Vendedor de IA atualizado com sucesso!");
        setEditingAgent(null);
        fetchAgentsAndRules();
      } else {
        showError("Erro ao atualizar vendedor: " + error.message);
      }
    } catch (e: any) {
      showError("Erro: " + e.message);
    }
  };

  const handleDeleteAgent = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este vendedor?")) return;
    try {
      const { error } = await supabase.from('crm_ai_agents').delete().eq('id', id);
      if (!error) {
        showSuccess("Vendedor excluído com sucesso!");
        fetchAgentsAndRules();
      } else {
        showError("Erro ao excluir vendedor: " + error.message);
      }
    } catch (e: any) {
      showError("Erro: " + e.message);
    }
  };

  const handleRegenerateScreenshot = async () => {
    if (!selectedLead) return;
    setIsRegeneratingScreenshot(true);
    try {
      const response = await fetch(`/api/local-collector/screenshot?id=${selectedLead.restaurant_id}&origin=${window.location.origin}`);
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.publicUrl) {
        showSuccess("Print do perfil público atualizado com sucesso!");
        // Update selectedLead locally
        setSelectedLead(prev => prev ? { ...prev, public_profile_screenshot_url: data.publicUrl } : null);
        // Refresh leads list to keep state synchronized
        fetchData();
      } else {
        throw new Error(data.error || "Falha ao gerar o print.");
      }
    } catch (e: any) {
      showError("Erro ao regenerar print: " + e.message);
    } finally {
      setIsRegeneratingScreenshot(false);
    }
  };

  const handleChangeLeadAgent = async (agentId: string | null) => {
    if (!selectedLead) return;
    try {
      const { error } = await supabase
        .from('commercial_leads')
        .update({ ai_agent_id: agentId || null })
        .eq('id', selectedLead.id);
      if (!error) {
        setSelectedLead(prev => prev ? { ...prev, ai_agent_id: agentId } : null);
        showSuccess("Vendedor de IA atualizado para este lead.");
        fetchData();
      } else {
        showError("Erro ao atualizar vendedor do lead: " + error.message);
      }
    } catch (e: any) {
      showError("Erro: " + e.message);
    }
  };

  // Business Rules CRUD Operations
  const handleCreateRule = async () => {
    if (!newRuleName.trim() || !newRuleContent.trim()) {
      showError("Por favor, preencha o nome e o conteúdo da regra.");
      return;
    }
    try {
      const { error } = await supabase.from('crm_business_rules').insert({
        rule_name: newRuleName,
        rule_content: newRuleContent,
        is_active: true
      });
      if (!error) {
        showSuccess("Regra de negócio criada com sucesso!");
        setNewRuleName('');
        setNewRuleContent('');
        fetchAgentsAndRules();
      } else {
        showError("Erro ao criar regra: " + error.message);
      }
    } catch (e: any) {
      showError("Erro: " + e.message);
    }
  };

  const handleUpdateRule = async () => {
    if (!editingRule || !editingRule.rule_name.trim() || !editingRule.rule_content.trim()) {
      showError("Por favor, preencha o nome e o conteúdo da regra.");
      return;
    }
    try {
      const { error } = await supabase.from('crm_business_rules').update({
        rule_name: editingRule.rule_name,
        rule_content: editingRule.rule_content,
        is_active: editingRule.is_active
      }).eq('id', editingRule.id);
      if (!error) {
        showSuccess("Regra de negócio atualizada com sucesso!");
        setEditingRule(null);
        fetchAgentsAndRules();
      } else {
        showError("Erro ao atualizar regra: " + error.message);
      }
    } catch (e: any) {
      showError("Erro: " + e.message);
    }
  };

  const handleToggleRuleStatus = async (id: string, newStatus: boolean) => {
    try {
      const { error } = await supabase.from('crm_business_rules').update({
        is_active: newStatus
      }).eq('id', id);
      if (!error) {
        showSuccess(`Regra de negócio ${newStatus ? 'ativada' : 'desativada'}.`);
        fetchAgentsAndRules();
      } else {
        showError("Erro ao alterar status da regra: " + error.message);
      }
    } catch (e: any) {
      showError("Erro: " + e.message);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta regra?")) return;
    try {
      const { error } = await supabase.from('crm_business_rules').delete().eq('id', id);
      if (!error) {
        showSuccess("Regra de negócio excluída com sucesso!");
        fetchAgentsAndRules();
      } else {
        showError("Erro ao excluir regra: " + error.message);
      }
    } catch (e: any) {
      showError("Erro: " + e.message);
    }
  };

  useEffect(() => {
    if (selectedLead) {
      fetchLeadEvents(selectedLead.id);
    } else {
      setLeadEvents([]);
    }
  }, [selectedLead]);

  const seedMissingLeads = async () => {
    try {
      const { data: restaurants } = await supabase.from('restaurants').select('id');
      const { data: leads } = await supabase.from('commercial_leads').select('restaurant_id');
      
      if (restaurants && leads) {
        const leadRestIds = new Set(leads.map(l => l.restaurant_id));
        const missing = restaurants.filter(r => !leadRestIds.has(r.id));
        
        if (missing.length > 0) {
          console.log(`Seeding ${missing.length} missing commercial leads...`);
          const inserts = missing.map(m => ({ restaurant_id: m.id }));
          await supabase.from('commercial_leads').insert(inserts);
        }
      }
    } catch (e) {
      console.error("Error seeding missing leads:", e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Garantir que todos os restaurantes possuam uma linha correspondente no commercial_leads
      await seedMissingLeads();

      // 1. Fetch Leads (Apenas para restaurantes Importados/Visitados)
      const { data: leadsData, error: leadsError } = await supabase
        .from('commercial_leads')
        .select(`
          *,
          restaurant:restaurants!inner(name, neighborhood, city, whatsapp_url, is_published, is_deleted)
        `)
        .eq('restaurant.is_published', true)
        .or('is_deleted.eq.false,is_deleted.is.null', { foreignTable: 'restaurant' })
        .order('score', { ascending: false });
      
      if (leadsError && leadsError.code !== '42P01') {
        // Ignora erro 42P01 (relation does not exist) prevendo a migration ainda nao rodar
        console.error(leadsError);
      }
      
      const loadedLeads = (leadsData as unknown as CommercialLead[]) || [];
      setLeads(loadedLeads);

      if (selectedLeadRef.current) {
        const updatedLead = loadedLeads.find(l => l.id === selectedLeadRef.current?.id);
        if (updatedLead) {
          setSelectedLead(updatedLead);
        }
      }

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

  // Z-API Fetchers
  const checkInstanceStatus = async () => {
    if (!zapiInstanceId || !zapiInstanceToken) return;
    try {
      const headers: any = {};
      if (zapiClientToken) headers['client-token'] = zapiClientToken;
      const res = await fetch(`https://api.z-api.io/instances/${zapiInstanceId}/token/${zapiInstanceToken}/status`, { headers });
      if (!res.ok) {
        setConnectionStatus('Offline / Instância Inacessível');
        return;
      }
      const data = await res.json();
      if (data?.connected) {
        setConnectionStatus('open');
      } else {
        setConnectionStatus('Desconectado');
      }
    } catch (e) {
      setConnectionStatus('Erro de Conexão');
    }
  };

  const generateQrCode = async () => {
    if (!zapiInstanceId || !zapiInstanceToken) {
      showError("Por favor, preencha o ID e o Token da Instância primeiro.");
      return;
    }
    setEvoLoading(true);
    setQrCode(null);
    try {
      const headers: any = {};
      if (zapiClientToken) headers['client-token'] = zapiClientToken;
      const res = await fetch(`https://api.z-api.io/instances/${zapiInstanceId}/token/${zapiInstanceToken}/qr-code/image`, { headers });
      if (!res.ok) {
        showError("Erro ao recuperar QR Code do Z-API.");
        return;
      }
      const data = await res.json();
      if (data?.value) {
        setQrCode(data.value);
        setConnectionStatus('Aguardando Leitura do QR');
      } else if (typeof data === 'string') {
        setQrCode(data);
        setConnectionStatus('Aguardando Leitura do QR');
      } else {
        showError("Retorno de QR Code inválido.");
      }
    } catch (e) {
      showError("Falha de rede ao conectar com Z-API.");
    } finally {
      setEvoLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      const { error } = await supabase.from('crm_settings').upsert({
        id: 1,
        zapi_instance_id: zapiInstanceId,
        zapi_instance_token: zapiInstanceToken,
        zapi_client_token: zapiClientToken
      });
      if (!error) {
        showSuccess("Configurações do Z-API salvas com sucesso!");
        checkInstanceStatus();
      } else {
        showError("Erro ao salvar configurações: " + error.message);
      }
    } catch (e: any) {
      showError("Erro ao salvar: " + e.message);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase.from('crm_settings').select('*').eq('id', 1).single();
      if (!error && data) {
        setZapiInstanceId(data.zapi_instance_id || '');
        setZapiInstanceToken(data.zapi_instance_token || '');
        setZapiClientToken(data.zapi_client_token || '');
        
        if (data.zapi_instance_id && data.zapi_instance_token) {
          const headers: any = {};
          if (data.zapi_client_token) headers['client-token'] = data.zapi_client_token;
          const res = await fetch(`https://api.z-api.io/instances/${data.zapi_instance_id}/token/${data.zapi_instance_token}/status`, { headers });
          if (res.ok) {
            const statusData = await res.json();
            setConnectionStatus(statusData?.connected ? 'open' : 'Desconectado');
          } else {
            setConnectionStatus('Offline');
          }
        }
      }
    } catch (e) {
      console.error("Erro ao carregar configurações do Z-API:", e);
    }
  };

  const handleStartBroadcast = async () => {
    const targets = leads.filter(l => l.pipeline_stage === selectedStage);
    if (targets.length === 0) {
      showError("Nenhum restaurante encontrado no estágio selecionado.");
      return;
    }
    if (!zapiInstanceId || !zapiInstanceToken) {
      showError("Por favor, configure e conecte o WhatsApp primeiro.");
      return;
    }

    setIsBroadcasting(true);
    setBroadcastProgress({ current: 0, total: targets.length });

    for (let idx = 0; idx < targets.length; idx++) {
      const lead = targets[idx];
      const phone = lead.restaurant?.whatsapp_url?.replace(/\D/g, '') || lead.restaurant?.whatsapp_url;
      const formattedPhone = phone ? (phone.startsWith('55') ? phone : '55' + phone) : '';
      
      if (!formattedPhone) {
        console.log(`Lead ${lead.id} sem telefone para disparo.`);
        setBroadcastProgress(prev => ({ ...prev, current: idx + 1 }));
        continue;
      }

      // 1. Regenerar o print do perfil público em tempo real se marcado
      if (broadcastUpdateScreenshots) {
        try {
          console.log(`[Disparo] Atualizando print em tempo real para: ${lead.restaurant?.name}`);
          const ssRes = await fetch(`/api/local-collector/screenshot?id=${lead.restaurant_id}&origin=${window.location.origin}`);
          if (ssRes.ok) {
            const ssData = await ssRes.json();
            if (ssData.success && ssData.publicUrl) {
              lead.public_profile_screenshot_url = ssData.publicUrl;
            }
          }
        } catch (ssErr) {
          console.error(`Erro ao atualizar print para ${lead.restaurant?.name}:`, ssErr);
        }
      }

      const personalizedMessage = broadcastMessage.replace(/{nome}/g, lead.restaurant?.name || 'Parceiro');

      try {
        const headers: any = { 'Content-Type': 'application/json' };
        if (zapiClientToken) headers['client-token'] = zapiClientToken;

        const hasScreenshot = broadcastSendScreenshots && !!lead.public_profile_screenshot_url;
        const endpoint = hasScreenshot ? 'send-image' : 'send-text';
        const payload = hasScreenshot
          ? {
              phone: formattedPhone,
              image: lead.public_profile_screenshot_url,
              caption: personalizedMessage
            }
          : {
              phone: formattedPhone,
              message: personalizedMessage
            };

        const res = await fetch(`https://api.z-api.io/instances/${zapiInstanceId}/token/${zapiInstanceToken}/${endpoint}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          // Log commercial event
          await supabase.from('commercial_events').insert({
            lead_id: lead.id,
            event_type: hasScreenshot ? 'WhatsAppImageSent' : 'WhatsAppMessageSent',
            actor_type: 'Human',
            payload: hasScreenshot 
              ? { text: personalizedMessage, image_url: lead.public_profile_screenshot_url, numberSentTo: formattedPhone }
              : { text: personalizedMessage, numberSentTo: formattedPhone }
          });
        }
      } catch (err) {
        console.error(`Erro ao disparar para ${lead.restaurant?.name}:`, err);
      }

      setBroadcastProgress(prev => ({ ...prev, current: idx + 1 }));

      // Wait between sends
      if (idx < targets.length - 1) {
        await new Promise(r => setTimeout(r, sendDelay * 1000));
      }
    }

    setIsBroadcasting(false);
    showSuccess("Disparo em massa concluído com sucesso!");
    fetchData();
  };

  useEffect(() => {
    fetchData();
    fetchSettings();
    fetchAgentsAndRules();
    
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
        if (selectedLeadRef.current && payload.new.lead_id === selectedLeadRef.current.id) {
          fetchLeadEvents(selectedLeadRef.current.id);
        }
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
  }, [activeTab, zapiInstanceId, zapiInstanceToken, zapiClientToken]);

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
          <TabsTrigger value="agents" className="rounded-lg text-sm font-medium px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-700">
            <Bot className="w-4 h-4 mr-2" /> Vendedores IA
          </TabsTrigger>
          <TabsTrigger value="rules" className="rounded-lg text-sm font-medium px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-700">
            <Zap className="w-4 h-4 mr-2" /> Regras do Negócio
          </TabsTrigger>
          <TabsTrigger value="playground" className="rounded-lg text-sm font-medium px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-700">
            <MessageSquare className="w-4 h-4 mr-2" /> Testar Vendedor
          </TabsTrigger>
          <TabsTrigger value="broadcast" className="rounded-lg text-sm font-medium px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-700">
            <Send className="w-4 h-4 mr-2" /> Disparo em Massa
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
                        <Card 
                          key={lead.id} 
                          onClick={() => setSelectedLead(lead)}
                          className="border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer bg-white rounded-xl"
                        >
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

        {/* AI AGENTS / VENDEDORES DE IA VIEW */}
        <TabsContent value="agents" className="mt-6 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Create/Edit Card */}
            <Card className="border-slate-200/60 shadow-sm rounded-3xl bg-white md:col-span-1">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-indigo-600" />
                  {editingAgent ? 'Editar Vendedor de IA' : 'Novo Vendedor de IA'}
                </CardTitle>
                <CardDescription className="text-xs">
                  Defina o comportamento e o tom de voz do seu agente de vendas.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600">Nome do Vendedor</label>
                  <Input 
                    value={editingAgent ? editingAgent.name : newAgentName}
                    onChange={(e) => editingAgent 
                      ? setEditingAgent({ ...editingAgent, name: e.target.value }) 
                      : setNewAgentName(e.target.value)
                    }
                    placeholder="Ex: Lucas SDR"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600">Tom de Voz</label>
                  <select
                    value={editingAgent ? editingAgent.tone : newAgentTone}
                    onChange={(e) => editingAgent
                      ? setEditingAgent({ ...editingAgent, tone: e.target.value })
                      : setNewAgentTone(e.target.value)
                    }
                    className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Descontraído">Descontraído</option>
                    <option value="Formal">Formal</option>
                    <option value="Persuasivo">Persuasivo</option>
                    <option value="Amigável">Amigável</option>
                    <option value="Agressivo">Agressivo</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600">Instruções/Prompt do Vendedor</label>
                  <textarea
                    value={editingAgent ? editingAgent.system_prompt : newAgentPrompt}
                    onChange={(e) => editingAgent
                      ? setEditingAgent({ ...editingAgent, system_prompt: e.target.value })
                      : setNewAgentPrompt(e.target.value)
                    }
                    rows={8}
                    placeholder="Você é Lucas, vendedor de IA da FilterFood. Seu objetivo é..."
                    className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none font-sans"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  {editingAgent ? (
                    <>
                      <Button onClick={handleUpdateAgent} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs h-9">
                        Salvar
                      </Button>
                      <Button onClick={() => setEditingAgent(null)} variant="outline" className="flex-1 border-slate-200 text-slate-600 rounded-xl text-xs h-9">
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <Button onClick={handleCreateAgent} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs h-9">
                      Criar Vendedor
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* List Card */}
            <Card className="border-slate-200/60 shadow-sm rounded-3xl bg-white md:col-span-2">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-indigo-600" />
                  Vendedores de IA Ativos
                </CardTitle>
                <CardDescription className="text-xs">
                  Gerencie seus vendedores automatizados. Você pode associá-los a leads específicos no Kanban.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 overflow-y-auto max-h-[500px]">
                <div className="space-y-4">
                  {aiAgents.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-sm">Nenhum vendedor de IA criado.</div>
                  ) : (
                    aiAgents.map(agent => (
                      <div key={agent.id} className="p-4 border border-slate-200/80 rounded-2xl bg-slate-50/50 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-800 text-sm">{agent.name}</h4>
                            <Badge variant="outline" className="text-[9px] bg-indigo-50 text-indigo-600 border-indigo-200">{agent.tone}</Badge>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed font-sans">{agent.system_prompt}</p>
                        </div>
                        <div className="flex sm:flex-col gap-2 shrink-0">
                          <Button 
                            onClick={() => setEditingAgent(agent)} 
                            size="sm" 
                            variant="outline" 
                            className="border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-xs h-8"
                          >
                            Editar
                          </Button>
                          <Button 
                            onClick={() => handleDeleteAgent(agent.id)} 
                            size="sm" 
                            variant="ghost" 
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-xs h-8"
                          >
                            Excluir
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* BUSINESS RULES / REGRAS DE NEGOCIO VIEW */}
        <TabsContent value="rules" className="mt-6 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Create/Edit Card */}
            <Card className="border-slate-200/60 shadow-sm rounded-3xl bg-white md:col-span-1">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-600" />
                  {editingRule ? 'Editar Regra' : 'Nova Regra Geral'}
                </CardTitle>
                <CardDescription className="text-xs">
                  Adicione regras gerais do seu negócio para orientar as respostas dos vendedores de IA.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600">Título da Regra</label>
                  <Input 
                    value={editingRule ? editingRule.rule_name : newRuleName}
                    onChange={(e) => editingRule 
                      ? setEditingRule({ ...editingRule, rule_name: e.target.value }) 
                      : setNewRuleName(e.target.value)
                    }
                    placeholder="Ex: Tabela de Preço Premium"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600">Conteúdo/Informações da Regra</label>
                  <textarea
                    value={editingRule ? editingRule.rule_content : newRuleContent}
                    onChange={(e) => editingRule
                      ? setEditingRule({ ...editingRule, rule_content: e.target.value })
                      : setNewRuleContent(e.target.value)
                    }
                    rows={10}
                    placeholder="Escreva os detalhes, FAQs, preços ou restrições do negócio..."
                    className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none font-sans"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  {editingRule ? (
                    <>
                      <Button onClick={handleUpdateRule} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs h-9">
                        Salvar
                      </Button>
                      <Button onClick={() => setEditingRule(null)} variant="outline" className="flex-1 border-slate-200 text-slate-600 rounded-xl text-xs h-9">
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <Button onClick={handleCreateRule} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs h-9">
                      Adicionar Regra
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* List Card */}
            <Card className="border-slate-200/60 shadow-sm rounded-3xl bg-white md:col-span-2">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-600" />
                  Regras Gerais Cadastradas
                </CardTitle>
                <CardDescription className="text-xs">
                  Todas as regras ativas são injetadas no contexto das conversas de todos os vendedores de IA.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 overflow-y-auto max-h-[500px]">
                <div className="space-y-4">
                  {businessRules.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-sm">Nenhuma regra geral cadastrada.</div>
                  ) : (
                    businessRules.map(rule => (
                      <div key={rule.id} className="p-4 border border-slate-200/80 rounded-2xl bg-slate-50/50 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-800 text-sm">{rule.rule_name}</h4>
                            <span className={cn(
                              "text-[9px] font-semibold px-2 py-0.5 rounded-full border",
                              rule.is_active ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-slate-100 text-slate-400 border-slate-200"
                            )}>
                              {rule.is_active ? 'Ativa' : 'Inativa'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 whitespace-pre-line leading-relaxed font-sans">{rule.rule_content}</p>
                        </div>
                        <div className="flex sm:flex-col gap-2 shrink-0">
                          <Button 
                            onClick={() => handleToggleRuleStatus(rule.id, !rule.is_active)}
                            size="sm" 
                            variant="outline" 
                            className={cn(
                              "rounded-lg text-xs h-8 border-slate-200",
                              rule.is_active ? "text-slate-600" : "text-indigo-600 hover:text-indigo-700"
                            )}
                          >
                            {rule.is_active ? 'Pausar' : 'Ativar'}
                          </Button>
                          <Button 
                            onClick={() => setEditingRule(rule)} 
                            size="sm" 
                            variant="outline" 
                            className="border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg text-xs h-8"
                          >
                            Editar
                          </Button>
                          <Button 
                            onClick={() => handleDeleteRule(rule.id)} 
                            size="sm" 
                            variant="ghost" 
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg text-xs h-8"
                          >
                            Excluir
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* PLAYGROUND / TESTAR VENDEDOR VIEW */}
        <TabsContent value="playground" className="mt-6 outline-none animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Configurações de Simulação */}
            <Card className="border border-slate-200/60 shadow-sm rounded-3xl bg-white lg:col-span-1 flex flex-col">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-600" />
                  Configurações do Teste
                </CardTitle>
                <CardDescription className="text-xs">
                  Ajuste o comportamento do agente para a simulação do chat.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-5 flex-1">
                {/* Selecionar Vendedor */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 block">Vendedor de IA a Testar</label>
                  <select
                    value={playgroundAgentId}
                    onChange={(e) => setPlaygroundAgentId(e.target.value)}
                    className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
                  >
                    <option value="">SDR Padrão (Sem Customizações)</option>
                    {aiAgents.map(agent => (
                      <option key={agent.id} value={agent.id}>{agent.name} ({agent.tone})</option>
                    ))}
                  </select>
                </div>

                {/* Nome do Restaurante */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 block">Restaurante Simulado</label>
                  <Input 
                    value={playgroundRestaurantName}
                    onChange={(e) => setPlaygroundRestaurantName(e.target.value)}
                    placeholder="Ex: Açaí Arretado"
                    className="h-9 text-sm rounded-lg"
                  />
                </div>

                {/* Chave API OpenAI */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 block">OpenAI API Key (para o teste)</label>
                  <Input 
                    type="password"
                    value={playgroundApiKey}
                    onChange={(e) => setPlaygroundApiKey(e.target.value)}
                    placeholder="Cole sua API Key da OpenAI"
                    className="h-9 text-sm rounded-lg font-mono"
                  />
                  <p className="text-[10px] text-slate-400">Armazenada apenas localmente no seu navegador para chamadas diretas.</p>
                </div>

                {/* Regras do Negócio Ativas para Teste */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 block">Regras de Negócio Injetadas ({businessRules.filter(r => playgroundRules[r.id]).length})</label>
                  <div className="border border-slate-100 rounded-xl max-h-40 overflow-y-auto divide-y divide-slate-100 p-2 bg-slate-50/50 space-y-1">
                    {businessRules.length === 0 ? (
                      <p className="text-[11px] text-slate-400 p-2 text-center">Nenhuma regra geral disponível.</p>
                    ) : (
                      businessRules.map(rule => (
                        <div key={rule.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded-lg transition-colors">
                          <input 
                            type="checkbox"
                            id={`test-rule-${rule.id}`}
                            checked={!!playgroundRules[rule.id]}
                            onChange={(e) => setPlaygroundRules({
                              ...playgroundRules,
                              [rule.id]: e.target.checked
                            })}
                            className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 border-slate-300"
                          />
                          <label htmlFor={`test-rule-${rule.id}`} className="text-[11px] font-medium text-slate-600 cursor-pointer select-none truncate flex-1">
                            {rule.rule_name}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-5 border-t border-slate-100 bg-slate-50/50">
                <Button 
                  onClick={handleStartPlayground}
                  disabled={isPlaygroundTyping}
                  className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl shadow-md h-10 transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {playgroundMessages.length > 0 ? 'Reiniciar e Iniciar Conversa' : 'Iniciar Conversa'}
                </Button>
              </CardFooter>
            </Card>

            {/* Playground Chat */}
            <Card className="border border-slate-200/60 shadow-sm rounded-3xl bg-white lg:col-span-2 h-[600px] flex flex-col overflow-hidden">
              {/* Chat Header */}
              <div className="bg-slate-50 border-b border-slate-100 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center">
                    <Bot className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">
                      {aiAgents.find(a => a.id === playgroundAgentId)?.name || 'SDR Padrão'}
                    </h3>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Simulação Ativa • Tom: {aiAgents.find(a => a.id === playgroundAgentId)?.tone || 'Padrão'}
                    </p>
                  </div>
                </div>
                {playgroundMessages.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPlaygroundMessages([])}
                    className="h-8 border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50"
                  >
                    Limpar Chat
                  </Button>
                )}
              </div>

              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/30">
                {playgroundMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6">
                    <div className="w-16 h-16 bg-indigo-50/50 rounded-full flex items-center justify-center mb-4 border border-indigo-100/50">
                      <Bot className="w-8 h-8 text-indigo-500" />
                    </div>
                    <h4 className="text-slate-800 font-bold text-sm">Playground de Vendas</h4>
                    <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed">
                      Selecione o vendedor de IA e clique em <strong>Iniciar Conversa</strong> para simular o primeiro contato. O vendedor iniciará o diálogo prospectando o restaurante simulado.
                    </p>
                  </div>
                ) : (
                  playgroundMessages.map((msg, idx) => {
                    const isAi = msg.role === 'assistant';
                    return (
                      <div 
                        key={idx} 
                        className={cn(
                          "flex flex-col max-w-[80%] animate-in slide-in-from-bottom-2 duration-200", 
                          isAi ? "mr-auto items-start" : "ml-auto items-end"
                        )}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                            {isAi ? '🤖 Vendedor' : '👤 Cliente (Você)'}
                          </span>
                        </div>
                        <div className={cn(
                          "p-3 rounded-2xl text-xs leading-relaxed shadow-sm border",
                          isAi 
                            ? "bg-white text-slate-800 border-slate-100 rounded-tl-none" 
                            : "bg-indigo-600 text-white border-indigo-500 shadow-indigo-100 rounded-tr-none"
                        )}>
                          {msg.image_url && (
                            <div className="mb-2 overflow-hidden rounded-xl border border-slate-100/60 max-w-[280px] bg-slate-50 relative group">
                              <img src={msg.image_url} alt="Print do Perfil" className="w-full h-auto max-h-60 object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                <a 
                                  href={msg.image_url} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="bg-white text-slate-800 text-[10px] font-bold px-2.5 py-1 rounded-full hover:bg-slate-100 flex items-center gap-1 shadow-sm"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Ver Inteiro
                                </a>
                                <button 
                                  onClick={() => handleDownloadImage(msg.image_url!)}
                                  className="bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full hover:bg-indigo-700 flex items-center gap-1 shadow-sm"
                                >
                                  <Download className="w-3 h-3" />
                                  Download
                                </button>
                              </div>
                            </div>
                          )}
                          {msg.content}
                        </div>
                      </div>
                    );
                  })
                )}

                {isPlaygroundTyping && (
                  <div className="flex flex-col max-w-[80%] mr-auto items-start animate-pulse">
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        🤖 Vendedor está digitando...
                      </span>
                    </div>
                    <div className="bg-white text-slate-400 border border-slate-100 p-3 rounded-2xl rounded-tl-none text-xs flex gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-slate-100 bg-white">
                <div className="relative flex items-center gap-2">
                  <textarea
                    value={playgroundInput}
                    onChange={(e) => setPlaygroundInput(e.target.value)}
                    placeholder={playgroundMessages.length === 0 ? "Inicie a conversa primeiro..." : "Responda como se fosse o dono do restaurante..."}
                    disabled={playgroundMessages.length === 0 || isPlaygroundTyping}
                    rows={2}
                    className="flex-1 p-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none font-sans shadow-inner"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendPlaygroundMessage();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSendPlaygroundMessage}
                    disabled={playgroundMessages.length === 0 || isPlaygroundTyping || !playgroundInput.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white h-12 w-12 rounded-xl flex items-center justify-center p-0 shrink-0 shadow-md transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* BROADCAST / CAMPANHAS VIEW */}
        <TabsContent value="broadcast" className="mt-6 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-slate-200/60 shadow-sm rounded-3xl bg-white md:col-span-2">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Send className="w-5 h-5 text-indigo-600" />
                  Nova Campanha de Disparo em Massa
                </CardTitle>
                <CardDescription>Envie mensagens automatizadas de prospecção para seus leads com base no estágio do funil.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600">Estágio do Funil Comercial</label>
                    <select
                      value={selectedStage}
                      onChange={(e) => setSelectedStage(e.target.value)}
                      className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {PIPELINE_STAGES.map(stage => (
                        <option key={stage} value={stage}>{stage}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600">Intervalo entre Mensagens (segundos)</label>
                    <Input
                      type="number"
                      value={sendDelay}
                      onChange={(e) => setSendDelay(Math.max(1, Number(e.target.value)))}
                      className="h-9 text-sm"
                      min={1}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 flex justify-between">
                    <span>Mensagem de Prospecção</span>
                    <span className="text-[10px] text-slate-400 font-normal">Use a tag {'{nome}'} para personalizar com o nome do restaurante.</span>
                  </label>
                  <textarea
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    rows={6}
                    placeholder="Escreva a mensagem aqui..."
                    className="w-full p-3 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Opções do Print do Perfil</label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={broadcastSendScreenshots}
                        onChange={(e) => setBroadcastSendScreenshots(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span>Enviar print do perfil público junto com a mensagem</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={broadcastUpdateScreenshots}
                        onChange={(e) => setBroadcastUpdateScreenshots(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span>Atualizar print em tempo real no momento do disparo</span>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-slate-200/60 shadow-sm rounded-3xl bg-white overflow-hidden">
                <CardHeader className="bg-slate-50 border-b border-slate-100 py-4">
                  <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-500" />
                    Resumo do Disparo
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                    <span className="text-slate-600">Destinatários Selecionados:</span>
                    <span className="font-bold text-slate-900">
                      {leads.filter(l => l.pipeline_stage === selectedStage).length} leads
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                    <span className="text-slate-600">Tempo Estimado:</span>
                    <span className="font-bold text-slate-900">
                      {Math.ceil((leads.filter(l => l.pipeline_stage === selectedStage).length * sendDelay) / 60)} min
                    </span>
                  </div>

                  {isBroadcasting && (
                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between text-xs font-semibold text-slate-600">
                        <span>Enviando mensagens...</span>
                        <span>{broadcastProgress.current} / {broadcastProgress.total}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${(broadcastProgress.current / broadcastProgress.total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleStartBroadcast}
                    disabled={isBroadcasting || leads.filter(l => l.pipeline_stage === selectedStage).length === 0}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm h-11 flex items-center justify-center gap-2 mt-4"
                  >
                    {isBroadcasting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Disparando...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Iniciar Disparo
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <div className="bg-indigo-50 p-5 rounded-3xl border border-indigo-100/50">
                <div className="flex gap-3">
                  <Bot className="w-6 h-6 text-indigo-600 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-indigo-900 mb-1">Dica de Conversão</h4>
                    <p className="text-xs text-indigo-700 leading-relaxed">
                      Utilize a tag {'{nome}'} no início de sua mensagem. Exemplo: <code>"Olá {'{nome}'}, tudo bem?"</code>. Isso melhora a taxa de resposta e diminui as chances de bloqueio do seu número.
                    </p>
                  </div>
                </div>
              </div>
            </div>
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
                    <Wifi className="w-4 h-4 text-slate-500" /> Configuração do Z-API
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600">ID da Instância</label>
                    <Input 
                      value={zapiInstanceId} 
                      onChange={(e) => setZapiInstanceId(e.target.value)}
                      placeholder="Ex: 3C..." 
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600">Token da Instância</label>
                    <Input 
                      value={zapiInstanceToken} 
                      onChange={(e) => setZapiInstanceToken(e.target.value)}
                      type="password"
                      placeholder="Ex: T..." 
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600">Client Token (Opcional)</label>
                    <Input 
                      value={zapiClientToken} 
                      onChange={(e) => setZapiClientToken(e.target.value)}
                      type="password"
                      placeholder="Ex: F..." 
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <span className="text-sm font-medium text-slate-600">Status:</span>
                    <Badge variant={connectionStatus === 'open' ? 'default' : 'outline'} className={connectionStatus === 'open' ? 'bg-emerald-500' : 'bg-slate-100 text-slate-500'}>
                      {connectionStatus.toUpperCase()}
                    </Badge>
                  </div>
                  <Button 
                    onClick={saveSettings} 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm h-10 mt-2"
                  >
                    Salvar Configurações
                  </Button>
                </CardContent>
              </Card>

              <div className="bg-indigo-50 p-5 rounded-3xl border border-indigo-100/50">
                <div className="flex gap-3">
                  <Bot className="w-6 h-6 text-indigo-600 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-indigo-900 mb-1">Como a IA assume o controle?</h4>
                    <p className="text-xs text-indigo-700 leading-relaxed">
                      Abra o painel do Z-API e configure o Webhook de recebimento de mensagens para apontar para a URL da sua Edge Function do Supabase (ex: <code>https://[seu-projeto].supabase.co/functions/v1/whatsapp-webhook</code>). Dessa forma, a IA processará as mensagens automaticamente.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* LEAD DETAILS MODAL (AI CONTEXT & HUMAN TAKEOVER) */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-100 p-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-600" />
                  {selectedLead.restaurant?.name || 'Detalhes do Lead'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Estágio Atual: <span className="font-semibold text-slate-700">{selectedLead.pipeline_stage}</span> • Score Comercial: <span className="font-semibold text-slate-700">{selectedLead.score}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                {getSentimentIcon(selectedLead.sentiment)}
                <span className="text-xs font-semibold text-slate-600 bg-slate-200/50 px-2 py-0.5 rounded-md uppercase tracking-wider font-mono">
                  {selectedLead.sentiment}
                </span>
                <button 
                  onClick={() => setSelectedLead(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 hover:bg-slate-200/50 rounded-full"
                >
                  <RefreshCw className="w-5 h-5 rotate-45" />
                </button>
              </div>
            </div>

            {/* Content Panel */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
              {/* Left Column: Settings and Toggle */}
              <div className="w-full md:w-80 bg-slate-50/50 border-r border-slate-100 p-6 space-y-6 overflow-y-auto">
                {/* AI Toggle */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Agente de IA SDR</label>
                  <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">Status do Agente</span>
                      <button
                        onClick={() => handleToggleAi(!selectedLead.is_ai_active)}
                        className={cn(
                          "w-12 h-6 rounded-full p-0.5 transition-colors duration-200 focus:outline-none",
                          selectedLead.is_ai_active ? "bg-indigo-600" : "bg-slate-300"
                        )}
                      >
                        <div 
                          className={cn(
                            "bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200",
                            selectedLead.is_ai_active ? "translate-x-6" : "translate-x-0"
                          )}
                        />
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {selectedLead.is_ai_active 
                        ? "🤖 O Agente de IA está ativo e responderá automaticamente a qualquer mensagem recebida deste restaurante."
                        : "👤 O Agente de IA está pausado. Você assume o controle das respostas manuais."}
                    </p>
                  </div>
                </div>

                {/* AI Agent Selection */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Vendedor de IA Associado</label>
                  <select
                    value={selectedLead.ai_agent_id || ''}
                    onChange={(e) => handleChangeLeadAgent(e.target.value || null)}
                    className="w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
                  >
                    <option value="">Sem Vendedor Específico (Padrão)</option>
                    {aiAgents.map(agent => (
                      <option key={agent.id} value={agent.id}>{agent.name} ({agent.tone})</option>
                    ))}
                  </select>
                </div>

                {/* Pipeline Stage */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Mover no Funil</label>
                  <select
                    value={selectedLead.pipeline_stage}
                    onChange={(e) => handleChangeStage(e.target.value as any)}
                    className="w-full h-10 px-3 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm"
                  >
                    {PIPELINE_STAGES.map(stage => (
                      <option key={stage} value={stage}>{stage}</option>
                    ))}
                  </select>
                </div>

                {/* Restaurant details */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Dados de Contato</label>
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3 text-xs">
                    <div className="flex items-center gap-2 text-slate-700">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{selectedLead.restaurant?.neighborhood || 'Bairro N/A'}, {selectedLead.restaurant?.city || 'Cidade N/A'}</span>
                    </div>
                    {selectedLead.restaurant?.whatsapp_url && (
                      <a 
                        href={selectedLead.restaurant.whatsapp_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 hover:underline font-semibold"
                      >
                        <Phone className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span>Abrir conversa no WhatsApp</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Print do Perfil */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Print do Perfil Público</label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRegenerateScreenshot}
                      disabled={isRegeneratingScreenshot}
                      className="h-7 text-[10px] px-2 text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 rounded-lg"
                    >
                      {isRegeneratingScreenshot ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Atualizando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3 h-3" />
                          Atualizar Print
                        </>
                      )}
                    </Button>
                  </div>
                  {selectedLead.public_profile_screenshot_url ? (
                    <div className="space-y-2">
                      <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-slate-50 relative group">
                        <img 
                          src={selectedLead.public_profile_screenshot_url} 
                          alt="Screenshot do perfil público" 
                          className="w-full object-cover max-h-[220px]"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <a 
                            href={selectedLead.public_profile_screenshot_url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="bg-white text-slate-800 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-slate-100"
                          >
                            Visualizar Cheio
                          </a>
                        </div>
                      </div>
                      <a 
                        href={selectedLead.public_profile_screenshot_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs text-indigo-600 hover:text-indigo-700 hover:underline font-semibold block"
                      >
                        Abrir imagem original (alta resolução)
                      </a>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4 text-center text-xs text-slate-400">
                      Print não gerado. Execute "Validar IA" para gerar.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Chat History */}
              <div className="flex-1 flex flex-col p-6 min-h-0 bg-white">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 block">Histórico de Conversação</label>
                
                {/* Chat Message Box */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] bg-slate-50/50 rounded-2xl border border-slate-100 mb-4">
                  {isEventsLoading ? (
                    <div className="flex flex-col items-center justify-center h-full py-20">
                      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
                      <span className="text-sm text-slate-500 font-medium">Carregando mensagens...</span>
                    </div>
                  ) : leadEvents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                      <MessageSquare className="w-10 h-10 text-slate-300 mb-2" />
                      <h4 className="text-slate-600 font-semibold text-sm">Sem Mensagens</h4>
                      <p className="text-xs text-slate-400 max-w-[220px] mt-1">Nenhuma mensagem WhatsApp associada a este lead ainda.</p>
                    </div>
                  ) : (
                    leadEvents.map(event => {
                      const isMsg = event.event_type === 'WhatsAppMessageSent' || event.event_type === 'WhatsAppMessageReceived';
                      const text = event.payload?.text || JSON.stringify(event.payload);

                      if (!isMsg) {
                        return (
                          <div key={event.id} className="flex justify-center my-2">
                            <span className="bg-slate-200/60 text-slate-600 text-[10px] font-medium px-2.5 py-0.5 rounded-full border border-slate-300/30">
                              {event.event_type}: {typeof event.payload === 'object' ? JSON.stringify(event.payload) : event.payload}
                            </span>
                          </div>
                        );
                      }

                      const isLead = event.actor_type === 'Lead';
                      const isAi = event.actor_type === 'AI';

                      return (
                        <div key={event.id} className={cn("flex flex-col max-w-[80%]", isLead ? "mr-auto items-start" : "ml-auto items-end")}>
                          <div className="flex items-center gap-1.5 mb-1 px-1">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                              {isLead ? 'Cliente' : isAi ? '🤖 Agente IA' : '👤 Você'}
                            </span>
                            <span className="text-[8px] text-slate-400">
                              {format(new Date(event.created_at), "HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          <div className={cn(
                            "p-3 rounded-2xl text-xs leading-relaxed",
                            isLead ? "bg-white text-slate-800 border border-slate-200/80 shadow-sm rounded-tl-none" : 
                            isAi ? "bg-indigo-600 text-white shadow-sm rounded-tr-none" : 
                            "bg-blue-600 text-white shadow-sm rounded-tr-none"
                          )}>
                            {text}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Send manual message box & options */}
                <div className="space-y-2">
                  <div className="relative flex items-center gap-2">
                    <textarea
                      value={manualMessage}
                      onChange={(e) => setManualMessage(e.target.value)}
                      placeholder="Digite uma mensagem para assumir manualmente o contato..."
                      disabled={isSendingMessage}
                      rows={2}
                      className="flex-1 p-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none font-sans"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendManualMessage();
                        }
                      }}
                    />
                    <Button
                      onClick={handleSendManualMessage}
                      disabled={isSendingMessage || !manualMessage.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white h-12 w-12 rounded-xl flex items-center justify-center p-0 shrink-0"
                    >
                      {isSendingMessage ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1.5 p-2 bg-slate-50 border border-slate-100 rounded-xl">
                    <label className="flex items-center gap-2 text-[10px] font-semibold text-slate-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={manualSendScreenshot}
                        onChange={(e) => setManualSendScreenshot(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                      />
                      <span>Enviar print do perfil público</span>
                    </label>
                    <label className="flex items-center gap-2 text-[10px] font-semibold text-slate-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={manualUpdateScreenshot}
                        onChange={(e) => setManualUpdateScreenshot(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                      />
                      <span>Atualizar print em tempo real antes de enviar</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

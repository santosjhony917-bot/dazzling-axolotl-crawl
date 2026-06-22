import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Send, Bot, User, BarChart, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SUGGESTED_QUESTIONS = [
  "Qual bairro tem maior taxa de conversão?",
  "Qual é o ticket médio das pizzarias?",
  "Por que a conversão caiu 2% na última semana?",
  "Quais as principais objeções no CRM?"
];

export default function CityAnalytics() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Olá! Sou seu Copiloto de Operações (IA). Tenho acesso em tempo real a todos os dados da cidade (Coleta, CRM, Financeiro). Como posso ajudar hoje?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage = input.trim();
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    try {
      // Coleta contexto rápido para a IA
      const { data: stats } = await supabase.from('restaurants').select('category, visit_status');
      const total = stats?.length || 0;
      const leads = stats?.filter(r => r.visit_status === 'lead' || r.visit_status === 'Pendente').length || 0;
      const won = stats?.filter(r => r.visit_status === 'won' || r.visit_status === 'Visitado').length || 0;

      const systemContext = `
        Você é um Assistente de IA de nível Executivo chamado "Copiloto de Expansão B2B".
        Sua missão é ajudar o usuário a analisar os dados de CRM da plataforma "FilterFood".
        Métricas Atuais do Banco de Dados:
        - Total de Estabelecimentos: ${total}
        - Leads Frios: ${leads}
        - Clientes Fechados/Ativos: ${won}
        - Taxa de Conversão: ${total > 0 ? ((won/total)*100).toFixed(1) : 0}%
        
        Responda de forma profissional, orientada a dados, direta e no estilo SaaS B2B. Seja conciso (máx 3 parágrafos curtos).
      `;

      const response = await fetch('/api/local-collector/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, systemContext })
      });

      if (!response.ok) throw new Error('Falha na comunicação com o backend da IA');
      
      const data = await response.json();
      
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: data.reply || 'Desculpe, não consegui processar a resposta.' 
      }]);
    } catch (err: any) {
      toast.error('Erro no Copiloto: ' + err.message);
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: 'Desculpe, ocorreu um erro de conexão com os servidores da IA.' 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="space-y-6 h-[calc(100vh-280px)] flex flex-col animate-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            Ask AI <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 uppercase tracking-widest text-[10px]">Beta</Badge>
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Analytics conversacional conectado a todos os dados da cidade.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        
        {/* Chat Area */}
        <Card className="lg:col-span-3 border-slate-200 shadow-sm rounded-2xl flex flex-col overflow-hidden bg-white">
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 custom-scrollbar">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-4 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300 ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                  msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                }`}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`p-4 rounded-2xl text-[13px] leading-relaxed shadow-sm font-medium ${
                  msg.role === 'user' 
                    ? 'bg-slate-900 text-white rounded-tr-none' 
                    : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex gap-4 max-w-[85%] animate-in fade-in duration-300">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 text-slate-400 rounded-tl-none shadow-sm flex items-center gap-1.5 h-12">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>
          
          <div className="p-4 bg-white border-t border-slate-100">
            <div className="relative flex items-center">
              <Input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Faça uma pergunta sobre os dados da operação..."
                className="pr-14 h-12 bg-white border-slate-200 focus-visible:ring-indigo-500 rounded-xl shadow-sm text-[13px]"
              />
              <Button 
                size="icon" 
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="absolute right-1.5 h-9 w-9 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white disabled:opacity-50 transition-colors"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-center text-[10px] text-slate-400 mt-3 font-semibold uppercase tracking-wider">
              A IA pode cometer erros. Verifique informações críticas.
            </p>
          </div>
        </Card>

        {/* Sidebar Hints */}
        <div className="space-y-4 lg:col-span-1 overflow-y-auto min-h-0 custom-scrollbar pr-1">
          <h3 className="font-bold text-slate-900 text-xs tracking-wider uppercase mb-3 text-slate-500">Sugestões Rápidas</h3>
          <div className="space-y-2">
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <Card 
                key={i} 
                className="border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 hover:bg-indigo-50/30 cursor-pointer transition-all duration-200 group rounded-xl" 
                onClick={() => setInput(q)}
              >
                <CardContent className="p-3.5 flex items-start gap-3">
                  <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-slate-700 leading-snug group-hover:text-indigo-900 transition-colors">{q}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="pt-5 border-t border-slate-200 mt-6">
            <h3 className="font-bold text-slate-900 text-xs tracking-wider uppercase mb-4 flex items-center gap-2 text-slate-500">
              <BarChart className="w-4 h-4" />
              Fontes Conectadas
            </h3>
            <ul className="space-y-3">
              <li className="text-[11px] font-bold flex items-center gap-2 text-slate-600">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm ring-2 ring-emerald-100" />
                Base: PostgreSQL (restaurants)
              </li>
              <li className="text-[11px] font-bold flex items-center gap-2 text-slate-600">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm ring-2 ring-emerald-100" />
                Base: PostgreSQL (subscriptions)
              </li>
              <li className="text-[11px] font-bold flex items-center gap-2 text-slate-600">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm ring-2 ring-emerald-100" />
                Streaming: Logs do CRM
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}

function Badge({ children, className, variant = 'default' }: any) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}>
      {children}
    </span>
  );
}

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Circle, Clock, Sparkles, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CitySettings() {
  return (
    <div className="space-y-6">
      
      {/* AI Copilot Alert */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex gap-4 items-start shadow-sm">
        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-700 shrink-0 mt-0.5">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-indigo-900 text-sm mb-1">Copiloto de Expansão (IA)</h3>
          <p className="text-indigo-800 text-sm mb-3">
            João Pessoa atingiu uma densidade excelente de Leads mapeados (1.387 estabelecimentos). A proporção de contas Premium Cortesia está saudável (50%). <strong>Recomendo iniciar a fase de Prospecção Ativa (CRM) imediatamente para maximizar as conversões deste mês.</strong>
          </p>
          <div className="flex gap-2">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-8">
              Iniciar Prospecção (CRM)
            </Button>
            <Button size="sm" variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-100 h-8">
              Ver Análise Completa
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
                  <span className="text-2xl font-black text-slate-900">1.387</span>
                  <span className="text-sm font-semibold text-emerald-600 flex items-center mb-1">
                    <TrendingUp className="w-3 h-3 mr-0.5" /> +12
                  </span>
                </div>
                <Progress value={100} className="h-1 mt-3 bg-slate-100 [&>div]:bg-emerald-500" />
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm rounded-xl">
              <CardContent className="p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Validados com IA</p>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-black text-slate-900">1.230</span>
                  <span className="text-sm font-semibold text-slate-500 mb-1">/ 88%</span>
                </div>
                <Progress value={88} className="h-1 mt-3 bg-slate-100 [&>div]:bg-indigo-500" />
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm rounded-xl">
              <CardContent className="p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Conversão de Vendas</p>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-black text-slate-900">32%</span>
                </div>
                <Progress value={32} className="h-1 mt-3 bg-slate-100 [&>div]:bg-blue-500" />
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 shadow-sm rounded-xl">
            <CardContent className="p-0">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                <h3 className="font-bold text-slate-900">Checklist de Implantação</h3>
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none">Fase 3: CRM em andamento</Badge>
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
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <p className="font-bold text-slate-900 text-sm">Coleta Massiva de Leads (Google/Social)</p>
                      <span className="text-xs font-bold text-emerald-600">100%</span>
                    </div>
                    <Progress value={100} className="h-1.5 bg-slate-100 [&>div]:bg-emerald-500" />
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <p className="font-bold text-slate-900 text-sm">Validação e Triagem de Qualidade (IA)</p>
                      <span className="text-xs font-bold text-emerald-600">88%</span>
                    </div>
                    <Progress value={88} className="h-1.5 bg-slate-100 [&>div]:bg-emerald-500" />
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Circle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5 fill-indigo-50" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 mt-0.5" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <p className="font-bold text-indigo-900 text-sm">Execução Comercial (Vendas e CRM)</p>
                      <span className="text-xs font-bold text-indigo-600">Em progresso</span>
                    </div>
                    <p className="text-xs text-indigo-700 mt-0.5 mb-2">264 assinaturas Premium vendidas até agora.</p>
                    <Progress value={40} className="h-1.5 bg-indigo-100 [&>div]:bg-indigo-500" />
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Circle className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-slate-400 text-sm">Consolidação e Retenção (Mês 3+)</p>
                    <p className="text-xs text-slate-400 mt-0.5">Aguardando amadurecimento da base.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Alerts & Timeline */}
        <div className="space-y-6">
          <Card className="border-rose-100 shadow-sm rounded-xl overflow-hidden">
            <div className="p-4 border-b border-rose-100 bg-rose-50 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <h3 className="font-bold text-rose-900 text-sm">Atenção Necessária</h3>
            </div>
            <CardContent className="p-4 bg-white space-y-4">
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">Leads sem telefone</p>
                  <p className="text-xs text-slate-500">45 restaurantes precisam de revisão.</p>
                </div>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700">Resolver</Button>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">Premium expirando</p>
                  <p className="text-xs text-slate-500">12 contas encerram cortesia amanhã.</p>
                </div>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700">Cobrar</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm rounded-xl">
            <CardContent className="p-5">
              <h3 className="font-bold text-slate-900 mb-4">Linha do Tempo (Últimas 24h)</h3>
              
              <div className="relative border-l border-slate-200 ml-3 space-y-6">
                <div className="relative">
                  <div className="absolute -left-1.5 mt-1.5 w-3 h-3 bg-emerald-500 rounded-full ring-4 ring-white" />
                  <div className="pl-6">
                    <p className="text-xs text-slate-400 font-medium mb-0.5">Há 2 horas</p>
                    <p className="text-sm font-semibold text-slate-800">IA validou 150 novos perfis</p>
                    <p className="text-xs text-slate-500">Imagens e descrições enriquecidas.</p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -left-1.5 mt-1.5 w-3 h-3 bg-indigo-500 rounded-full ring-4 ring-white" />
                  <div className="pl-6">
                    <p className="text-xs text-slate-400 font-medium mb-0.5">Ontem, 16:45</p>
                    <p className="text-sm font-semibold text-slate-800">Nova venda Premium</p>
                    <p className="text-xs text-slate-500">"Pizzaria da Nonna" converteu para anual.</p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -left-1.5 mt-1.5 w-3 h-3 bg-slate-300 rounded-full ring-4 ring-white" />
                  <div className="pl-6">
                    <p className="text-xs text-slate-400 font-medium mb-0.5">Ontem, 10:00</p>
                    <p className="text-sm font-semibold text-slate-800">Campanha de e-mail iniciada</p>
                    <p className="text-xs text-slate-500">Disparo para 400 hamburguerias.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}

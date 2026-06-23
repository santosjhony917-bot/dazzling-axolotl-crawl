import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Sparkles, AlertTriangle, Loader2, MapPinned, ShieldCheck, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const BLOCKED_STATUSES = ['manual_required', 'blocked', 'failed', 'invalid_source'];

export default function CitySettings() {
  const { cityId } = useParams();
  const [, setSearchParams] = useSearchParams();
  const [city, setCity] = useState<any>(null);
  const [stats, setStats] = useState({
    totalLeads: 0,
    validatedLeads: 0,
    rejectedLeads: 0,
    blockedLeads: 0,
    noMenuLeads: 0,
    crmReadyLeads: 0,
    premiumLeads: 0,
    noPhoneLeads: 0,
  });
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
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

        const { data: restData, error: restError } = await supabase
          .from('restaurants')
          .select('id, name, phone, plan, ai_validated, created_at, is_deleted, menu_status, visit_status')
          .eq('city', cityData.name)
          .eq('state', cityData.state);

        if (restError) throw restError;

        const allRows = restData || [];
        const activeRows = allRows.filter(r => r.is_deleted !== true);
        const validatedRows = activeRows.filter(r => r.ai_validated === true);
        const rejectedLeads = allRows.filter(r => r.is_deleted === true).length;
        const blockedLeads = activeRows.filter(r => BLOCKED_STATUSES.includes(r.menu_status || '')).length;
        const noMenuLeads = activeRows.filter(r => r.menu_status === 'not_found').length;
        const crmReadyLeads = validatedRows.filter(r => !!r.phone && !BLOCKED_STATUSES.includes(r.menu_status || '')).length;
        const premiumLeads = activeRows.filter(r => r.plan === 'premium').length;
        const noPhoneLeads = activeRows.filter(r => !r.phone || r.phone.trim() === '').length;

        setStats({
          totalLeads: activeRows.length,
          validatedLeads: validatedRows.length,
          rejectedLeads,
          blockedLeads,
          noMenuLeads,
          crmReadyLeads,
          premiumLeads,
          noPhoneLeads,
        });

        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const events = [];
        const last24hCount = activeRows.filter(r => new Date(r.created_at || '').getTime() > oneDayAgo).length;

        if (last24hCount > 0) {
          events.push({
            time: 'Últimas 24h',
            title: `${last24hCount} novos leads mínimos`,
            desc: 'Coletados do Google Maps pela extensão. Ainda precisam passar pelo Validar IA.',
            color: 'bg-emerald-500',
          });
        }

        if (validatedRows.length > 0) {
          events.push({
            time: 'Validar IA',
            title: `${validatedRows.length} restaurantes aprovados`,
            desc: 'Elegibilidade, origem, contato e cardápio auditados antes do CRM.',
            color: 'bg-indigo-500',
          });
        }

        if (rejectedLeads > 0 || blockedLeads > 0 || noMenuLeads > 0) {
          events.push({
            time: 'Auditoria',
            title: `${rejectedLeads} rejeitados, ${blockedLeads} bloqueados, ${noMenuLeads} sem cardápio`,
            desc: 'Cooperativas, mercados, fontes inválidas e casos sem evidência não entram como sucesso.',
            color: 'bg-rose-500',
          });
        }

        if (crmReadyLeads > 0) {
          events.push({
            time: 'CRM',
            title: `${crmReadyLeads} leads prontos para contato`,
            desc: 'Somente restaurantes validados com contato utilizável devem entrar na prospecção.',
            color: 'bg-blue-500',
          });
        }

        if (events.length === 0) {
          events.push({
            time: 'Status',
            title: 'Aguardando Fase 1',
            desc: 'Inicie a coleta pelo Google Maps usando a extensão.',
            color: 'bg-slate-300',
          });
        }

        setRecentEvents(events);
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
        <span className="ml-2 text-sm text-slate-500 font-medium">Carregando funil real do projeto...</span>
      </div>
    );
  }

  if (!city) return null;

  const validatedPercent = stats.totalLeads > 0 ? Math.round((stats.validatedLeads / stats.totalLeads) * 100) : 0;
  const crmReadyPercent = stats.validatedLeads > 0 ? Math.round((stats.crmReadyLeads / stats.validatedLeads) * 100) : 0;

  let copilotText = '';
  if (stats.totalLeads === 0) {
    copilotText = `${city.name}/${city.state} ainda não tem leads mínimos. O fluxo correto é: Maps pela extensão → Validar IA → aprovado/rejeitado → CRM → assinatura.`;
  } else if (validatedPercent < 80) {
    copilotText = `${city.name}/${city.state} tem ${stats.totalLeads} leads ativos, mas apenas ${stats.validatedLeads} passaram pelo Validar IA. Não trate coleta como sucesso antes dessa triagem.`;
  } else {
    copilotText = `${city.name}/${city.state} está pronto para operação comercial: trabalhe os ${stats.crmReadyLeads} leads com contato válido no CRM. Premium só após fechamento.`;
  }

  return (
    <div className="space-y-6">
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex gap-4 items-start shadow-sm">
        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-700 shrink-0 mt-0.5">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-indigo-900 text-sm mb-1">Copiloto de Expansão</h3>
          <p className="text-indigo-800 text-sm mb-3">{copilotText}</p>
          <div className="flex gap-2">
            <Button onClick={() => setSearchParams({ tab: 'collection' })} size="sm" variant="outline" className="font-bold h-8">
              Abrir Fase 1
            </Button>
            <Button onClick={() => setSearchParams({ tab: 'validation' })} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-8">
              Validar IA
            </Button>
            <Button onClick={() => setSearchParams({ tab: 'crm' })} size="sm" variant="outline" disabled={stats.crmReadyLeads === 0} className="font-bold h-8">
              CRM
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-slate-200 shadow-sm rounded-xl">
              <CardContent className="p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Leads ativos</p>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-black text-slate-900">{stats.totalLeads}</span>
                </div>
                <Progress value={stats.totalLeads > 0 ? 100 : 0} className="h-1 mt-3 bg-slate-100 [&>div]:bg-emerald-500" />
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm rounded-xl">
              <CardContent className="p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Validados IA</p>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-black text-slate-900">{stats.validatedLeads}</span>
                  <span className="text-sm font-semibold text-slate-500 mb-1">/ {validatedPercent}%</span>
                </div>
                <Progress value={validatedPercent} className="h-1 mt-3 bg-slate-100 [&>div]:bg-indigo-500" />
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm rounded-xl">
              <CardContent className="p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Prontos para CRM</p>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-black text-slate-900">{stats.crmReadyLeads}</span>
                  <span className="text-sm font-semibold text-slate-500 mb-1">/ {crmReadyPercent}%</span>
                </div>
                <Progress value={crmReadyPercent} className="h-1 mt-3 bg-slate-100 [&>div]:bg-blue-500" />
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 shadow-sm rounded-xl">
            <CardContent className="p-0">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                <h3 className="font-bold text-slate-900">Checklist do fluxo real</h3>
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none font-bold">
                  {stats.totalLeads === 0 ? 'Fase 1 pendente' : validatedPercent < 80 ? 'Validar IA pendente' : 'CRM liberado'}
                </Badge>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  {stats.totalLeads > 0 ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> : <Circle className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />}
                  <div className="flex-1">
                    <p className={`font-bold text-sm ${stats.totalLeads > 0 ? 'text-slate-900' : 'text-slate-400'}`}>Fase 1: Google Maps pela extensão</p>
                    <p className="text-xs text-slate-500 mt-0.5">Coleta só o lead mínimo e o link do Maps. Nada é aprovado nessa etapa.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {validatedPercent >= 80 ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> : <Circle className={`w-5 h-5 shrink-0 mt-0.5 ${stats.totalLeads > 0 ? 'text-indigo-500' : 'text-slate-300'}`} />}
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <p className={`font-bold text-sm ${stats.totalLeads > 0 ? 'text-slate-900' : 'text-slate-400'}`}>Fase 2: Validar IA aprova ou rejeita</p>
                      <span className="text-xs font-bold text-indigo-600">{validatedPercent}%</span>
                    </div>
                    <Progress value={validatedPercent} className="h-1.5 bg-slate-100 [&>div]:bg-indigo-500" />
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  {stats.crmReadyLeads > 0 ? <MessageCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" /> : <Circle className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />}
                  <div className="flex-1">
                    <p className={`font-bold text-sm ${stats.crmReadyLeads > 0 ? 'text-blue-900' : 'text-slate-400'}`}>Fase 3: CRM só com validados</p>
                    <p className="text-xs text-slate-500 mt-0.5">{stats.crmReadyLeads} leads têm validação e contato útil. Assinatura Premium só após fechamento.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-rose-100 shadow-sm rounded-xl overflow-hidden">
            <div className="p-4 border-b border-rose-100 bg-rose-50 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <h3 className="font-bold text-rose-900 text-sm">Atenção necessária</h3>
            </div>
            <CardContent className="p-4 bg-white space-y-4">
              <div className="flex gap-3 border-b border-slate-50 pb-3">
                <MapPinned className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800 text-sm">Leads sem telefone</p>
                  <p className="text-xs text-slate-500">{stats.noPhoneLeads} precisam de busca complementar antes do CRM ativo.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <ShieldCheck className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800 text-sm">Rejeitados, bloqueados e sem cardápio</p>
                  <p className="text-xs text-slate-500">{stats.rejectedLeads} rejeitados, {stats.blockedLeads} bloqueados, {stats.noMenuLeads} sem cardápio encontrado.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm rounded-xl">
            <CardContent className="p-5">
              <h3 className="font-bold text-slate-900 mb-4">Linha do tempo operacional</h3>
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

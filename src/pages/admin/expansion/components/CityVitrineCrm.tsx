import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, Bot, Crown, Eye, Gift, Loader2, RefreshCw, Send, ShieldCheck, Target, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type StrategyGroup = 'anchor' | 'commercial_target';
type VisualStatus = 'basic' | 'premium_launch' | 'claim_trial' | 'paid_premium';

type StrategyRestaurant = {
  id: string;
  name: string;
  category?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  whatsapp_url?: string | null;
  contact_candidates?: any;
  primary_contact_source?: string | null;
  followers_override?: number | null;
  social_networks?: any;
  plan?: string | null;
  commercial_score: number;
  followers_count: number;
  strategic_group: StrategyGroup;
  visual_status: VisualStatus;
  crm_wave: number;
  reason: string;
  trial_days?: number;
  sent_to_crm_at?: string | null;
};

const groupLabel: Record<StrategyGroup, string> = {
  anchor: 'Ancora',
  commercial_target: 'Alvo comercial',
};

const visualLabel: Record<VisualStatus, string> = {
  basic: 'Basico',
  premium_launch: 'Premium vitrine',
  claim_trial: 'Trial/reivindicacao',
  paid_premium: 'Premium pago',
};

const normalizePhone = (value?: string | null) => String(value || '').replace(/\D/g, '');

function readFollowers(restaurant: any) {
  if (Number(restaurant?.followers_override || 0) > 0) return Number(restaurant.followers_override);
  const socials = Array.isArray(restaurant?.social_networks) ? restaurant.social_networks : [];
  const instagram = socials.find((item: any) => item?.platform === 'instagram' || /instagram/i.test(String(item?.url || '')));
  return Number(instagram?.followers || instagram?.followers_count || 0);
}

function pickContact(restaurant: any) {
  const candidates = Array.isArray(restaurant?.contact_candidates) ? restaurant.contact_candidates : [];
  const directPhone = normalizePhone(restaurant?.phone);
  const waPhone = normalizePhone(restaurant?.whatsapp_url);
  const ranked = [
    waPhone.length >= 10 ? { phone: waPhone, whatsapp_url: restaurant.whatsapp_url, source: restaurant.primary_contact_source || 'restaurant.whatsapp_url' } : null,
    directPhone.length >= 10 ? { phone: directPhone, whatsapp_url: `https://wa.me/55${directPhone}`, source: restaurant.primary_contact_source || 'restaurant.phone' } : null,
    ...candidates
      .map((candidate: any) => ({
        phone: normalizePhone(candidate.normalized_phone || candidate.phone),
        whatsapp_url: candidate.whatsapp_url || null,
        source: candidate.source || candidate.source_url || 'contact_candidates',
        score: Number(candidate.score || 0) + (candidate.kind === 'whatsapp' ? 100 : 0),
      }))
      .filter((candidate: any) => candidate.phone?.length >= 10 || candidate.whatsapp_url)
      .sort((a: any, b: any) => b.score - a.score),
  ].filter(Boolean);

  return ranked[0] || { phone: '', whatsapp_url: '', source: '' };
}

function scoreRestaurant(restaurant: any, maxFollowers: number) {
  const followers = readFollowers(restaurant);
  const followerScore = maxFollowers > 0 ? Math.round((followers / maxFollowers) * 45) : 0;
  const contact = pickContact(restaurant);
  const hasContact = Boolean(contact.phone || contact.whatsapp_url);
  const profileScore = [
    restaurant?.category,
    restaurant?.neighborhood,
    restaurant?.phone || restaurant?.whatsapp_url,
  ].filter(Boolean).length * 5;
  const strategicCategory = /pizza|hamb|burger|sushi|acai|açaí|churras|japones|caf[eé]|almoco|almoço|bar/i.test(String(restaurant?.category || ''));
  return {
    followers,
    score: Math.min(100, followerScore + (hasContact ? 25 : 0) + profileScore + (strategicCategory ? 15 : 5)),
    hasContact,
    reason: [
      followers > 0 ? `${followers.toLocaleString('pt-BR')} seguidores` : 'sem seguidores coletados',
      hasContact ? 'contato confiavel' : 'contato fraco',
      strategicCategory ? 'categoria forte' : 'categoria comum',
    ].join(' · '),
  };
}

function isSchemaMissingError(error: any) {
  const message = String(error?.message || error?.hint || error?.details || '').toLowerCase();
  return message.includes('schema cache')
    || message.includes('does not exist')
    || message.includes('could not find')
    || message.includes('column');
}

function buildStrategy(restaurants: any[], premiumTargetPercent: number, anchorPercent: number, firstWavePercent: number, trialDays: number) {
  const maxFollowers = Math.max(...restaurants.map(readFollowers), 0);
  const enriched = restaurants
    .map((restaurant) => {
      const scored = scoreRestaurant(restaurant, maxFollowers);
      return {
        ...restaurant,
        commercial_score: scored.score,
        followers_count: scored.followers,
        has_contact: scored.hasContact,
        reason: scored.reason,
      };
    })
    .sort((a, b) => {
      if (b.followers_count !== a.followers_count) return b.followers_count - a.followers_count;
      return b.commercial_score - a.commercial_score;
    });

  const total = enriched.length;
  const anchorCount = Math.min(total, Math.max(1, Math.round(total * (anchorPercent / 100))));
  const premiumVisualCount = Math.min(total, Math.max(anchorCount, Math.round(total * (premiumTargetPercent / 100))));
  const firstWaveCount = Math.max(1, Math.round(total * (firstWavePercent / 100)));

  const anchors = new Set(enriched.slice(0, anchorCount).map((item) => item.id));
  const premiumVisual = new Set(enriched.slice(0, premiumVisualCount).map((item) => item.id));

  const commercialCandidates = enriched
    .filter((item) => !anchors.has(item.id) && item.has_contact)
    .sort((a, b) => b.commercial_score - a.commercial_score);
  const firstWave = new Set(commercialCandidates.slice(0, firstWaveCount).map((item) => item.id));

  return enriched.map((restaurant): StrategyRestaurant => {
    const isAnchor = anchors.has(restaurant.id);
    const isPaid = restaurant.plan === 'premium';
    const isPremiumVisual = premiumVisual.has(restaurant.id);
    const strategicGroup: StrategyGroup = isAnchor ? 'anchor' : 'commercial_target';
    const visualStatus: VisualStatus = isPaid
      ? 'paid_premium'
      : isAnchor
        ? 'premium_launch'
        : isPremiumVisual && strategicGroup === 'commercial_target'
          ? 'claim_trial'
          : isPremiumVisual
            ? 'premium_launch'
            : 'basic';

    return {
      ...restaurant,
      strategic_group: strategicGroup,
      visual_status: visualStatus,
      crm_wave: firstWave.has(restaurant.id) ? 1 : 0,
      reason: isAnchor
        ? `Restaurante conhecido usado como prova social: ${restaurant.reason}`
        : firstWave.has(restaurant.id)
          ? `Primeira onda do CRM: ${restaurant.reason}`
          : restaurant.reason,
      trial_days: trialDays,
    };
  });
}

export default function CityVitrineCrm() {
  const { cityId } = useParams();
  const [city, setCity] = useState<any>(null);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [strategy, setStrategy] = useState<StrategyRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [premiumTarget, setPremiumTarget] = useState([70]);
  const [anchorPercent, setAnchorPercent] = useState([20]);
  const [firstWavePercent, setFirstWavePercent] = useState([30]);
  const [trialDays, setTrialDays] = useState('14');
  const [filter, setFilter] = useState<'all' | StrategyGroup>('all');

  const load = async () => {
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

      const { data: rows, error } = await supabase
        .from('restaurants')
        .select('id, name, category, neighborhood, city, state, phone, whatsapp_url, contact_candidates, primary_contact_source, followers_override, social_networks, plan, is_published, ai_validated, menu_status, is_deleted')
        .eq('city', cityData.name)
        .eq('state', cityData.state)
        .eq('is_published', true)
        .eq('ai_validated', true)
        .eq('menu_status', 'found')
        .neq('is_deleted', true);
      if (error) throw error;

      const baseRows = rows || [];
      setRestaurants(baseRows);

      const { data: saved } = await supabase
        .from('city_launch_strategy')
        .select('*')
        .eq('city_slug', cityId);

      if (saved && saved.length > 0) {
        const savedByRestaurant = new Map(saved.map((item: any) => [item.restaurant_id, item]));
        const maxFollowers = Math.max(...baseRows.map(readFollowers), 0);
        setStrategy(baseRows.map((restaurant: any) => {
          const scored = scoreRestaurant(restaurant, maxFollowers);
          const savedRow: any = savedByRestaurant.get(restaurant.id);
          const savedGroup = savedRow?.strategic_group === 'anchor' ? 'anchor' : 'commercial_target';
          return {
            ...restaurant,
            commercial_score: savedRow?.commercial_score ?? scored.score,
            followers_count: savedRow?.followers_count ?? scored.followers,
            strategic_group: savedGroup,
            visual_status: savedRow?.visual_status || (restaurant.plan === 'premium' ? 'paid_premium' : 'basic'),
            crm_wave: savedRow?.crm_wave || 0,
            reason: savedRow?.reason || scored.reason,
            sent_to_crm_at: savedRow?.sent_to_crm_at,
          };
        }));
      } else {
        setStrategy(buildStrategy(baseRows, premiumTarget[0], anchorPercent[0], firstWavePercent[0], Number(trialDays || 14)));
      }
    } catch (err: any) {
      toast.error(`Erro ao carregar Vitrine & CRM: ${err?.message || 'erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityId]);

  const generated = useMemo(
    () => buildStrategy(restaurants, premiumTarget[0], anchorPercent[0], firstWavePercent[0], Number(trialDays || 14)),
    [anchorPercent, firstWavePercent, premiumTarget, restaurants, trialDays]
  );

  const stats = useMemo(() => {
    const total = strategy.length;
    const premiumVisual = strategy.filter((item) => ['premium_launch', 'claim_trial', 'paid_premium'].includes(item.visual_status)).length;
    const anchors = strategy.filter((item) => item.strategic_group === 'anchor').length;
    const targets = strategy.filter((item) => item.strategic_group === 'commercial_target').length;
    const wave = strategy.filter((item) => item.crm_wave === 1).length;
    const paid = strategy.filter((item) => item.visual_status === 'paid_premium').length;
    return {
      total,
      premiumVisual,
      premiumPercent: total ? Math.round((premiumVisual / total) * 100) : 0,
      anchors,
      targets,
      wave,
      paid,
    };
  }, [strategy]);

  const visibleRows = strategy
    .filter((item) => filter === 'all' || item.strategic_group === filter)
    .sort((a, b) => {
      const groupOrder = { anchor: 0, commercial_target: 1 };
      return groupOrder[a.strategic_group] - groupOrder[b.strategic_group] || b.commercial_score - a.commercial_score;
    });

  const saveStrategy = async (rows = generated) => {
    if (!cityId) return false;
    setBusy(true);
    try {
      const payload = rows.map((item) => ({
        city_slug: cityId,
        restaurant_id: item.id,
        strategic_group: item.strategic_group,
        visual_status: item.visual_status,
        crm_wave: item.crm_wave,
        commercial_score: item.commercial_score,
        followers_count: item.followers_count,
        trial_days: Number(trialDays || 14),
        trial_ends_at: item.visual_status === 'claim_trial'
          ? new Date(Date.now() + Number(trialDays || 14) * 86400000).toISOString()
          : null,
        reason: item.reason,
      }));

      const { error } = await supabase
        .from('city_launch_strategy')
        .upsert(payload as any[], { onConflict: 'city_slug,restaurant_id' });
      if (error) throw error;
      setStrategy(rows);
      toast.success('Plano da cidade salvo.');
      return true;
    } catch (err: any) {
      toast.error(`Erro ao salvar plano: ${err?.message || 'aplique a migration 0062'}`);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const applyVitrine = async () => {
    setBusy(true);
    try {
      const rows = strategy.length ? strategy : generated;
      const saved = await saveStrategy(rows);
      if (!saved) return;
      setBusy(true);

      const premiumIds = rows
        .filter((item) => ['premium_launch', 'claim_trial'].includes(item.visual_status) && item.plan !== 'premium')
        .map((item) => item.id);
      const basicIds = rows
        .filter((item) => item.visual_status === 'basic' && item.plan !== 'premium')
        .map((item) => item.id);

      if (premiumIds.length > 0) {
        const { error } = await supabase.from('restaurants').update({ plan: 'premium_gift' }).in('id', premiumIds);
        if (error) throw error;
      }
      if (basicIds.length > 0) {
        const { error } = await supabase.from('restaurants').update({ plan: 'free' }).in('id', basicIds);
        if (error) throw error;
      }

      const { error: markError } = await supabase
        .from('city_launch_strategy')
        .update({ applied_at: new Date().toISOString() })
        .eq('city_slug', cityId);
      if (markError) throw markError;

      toast.success(`${premiumIds.length} restaurantes ficaram como Premium visual/cortesia.`);
      await load();
    } catch (err: any) {
      toast.error(`Erro ao aplicar vitrine: ${err?.message || 'erro desconhecido'}`);
    } finally {
      setBusy(false);
    }
  };

  const sendFirstWaveToCrm = async () => {
    setBusy(true);
    try {
      const rows = strategy.filter((item) => item.crm_wave === 1 && item.strategic_group === 'commercial_target');
      const payload = rows
        .map((item) => {
          const contact = pickContact(item);
          if (!contact.phone && !contact.whatsapp_url) return null;
          return {
            restaurant_id: item.id,
            score: item.commercial_score,
            pipeline_stage: 'Uncontacted',
            sentiment: 'Neutral',
            is_ai_active: true,
            primary_phone: contact.phone,
            whatsapp_url: contact.whatsapp_url,
            contact_source: contact.source,
            public_profile_url: `/restaurant/${item.id}`,
            last_event_at: new Date().toISOString(),
          };
        })
        .filter(Boolean);

      if (payload.length === 0) {
        toast.error('Nenhum alvo da primeira onda tem contato confiavel.');
        return;
      }

      const { error } = await supabase
        .from('commercial_leads')
        .upsert(payload as any[], { onConflict: 'restaurant_id' });
      if (error) {
        if (!isSchemaMissingError(error)) throw error;

        const legacyPayload = payload.map((item: any) => ({
          restaurant_id: item.restaurant_id,
          score: item.score,
          pipeline_stage: item.pipeline_stage,
          sentiment: item.sentiment,
          is_ai_active: item.is_ai_active,
        }));
        const { error: legacyError } = await supabase
          .from('commercial_leads')
          .upsert(legacyPayload as any[], { onConflict: 'restaurant_id' });
        if (legacyError) throw legacyError;

        toast.warning('CRM enviado em modo compativel. Aplique a migration 0059 para salvar telefone, origem e fila do robo.');
      }

      const { error: markError } = await supabase
        .from('city_launch_strategy')
        .update({ sent_to_crm_at: new Date().toISOString() })
        .eq('city_slug', cityId)
        .eq('crm_wave', 1)
        .eq('strategic_group', 'commercial_target');
      if (markError && !isSchemaMissingError(markError)) throw markError;

      toast.success(`${payload.length} alvos comerciais enviados para o CRM.`);
      await load();
    } catch (err: any) {
      toast.error(`Erro ao enviar para CRM: ${err?.message || 'erro desconhecido'}`);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-sm font-semibold text-slate-500">
        <Loader2 className="mr-2 h-6 w-6 animate-spin text-indigo-500" />
        Carregando estrategia de vitrine...
      </div>
    );
  }

  if (!city) return null;

  return (
    <div className="min-w-0 space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-indigo-600">Vitrine & CRM</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{city.name}/{city.state}: plano de lancamento</h2>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-500">
              Separe os restaurantes em Ancoras e Alvos comerciais. Primeiro monte o plano, depois aplique a vitrine visual e por fim envie a primeira onda para o CRM.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <Button variant="outline" onClick={load} disabled={busy} className="font-bold">
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
            <Button variant="outline" onClick={() => saveStrategy(generated)} disabled={busy || restaurants.length === 0} className="font-bold">
              <Target className="mr-2 h-4 w-4" />
              Gerar plano da cidade
            </Button>
            <Button onClick={applyVitrine} disabled={busy || strategy.length === 0} className="bg-indigo-600 font-bold text-white hover:bg-indigo-700">
              <Eye className="mr-2 h-4 w-4" />
              Aplicar Premium visual
            </Button>
            <Button onClick={sendFirstWaveToCrm} disabled={busy || strategy.length === 0} variant="outline" className="font-bold">
              <Send className="mr-2 h-4 w-4" />
              Enviar alvos para o CRM
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-3">
        <ActionStep
          number="1"
          title="Gerar plano da cidade"
          description="Classifica publicados em Ancoras ou Alvos comerciais, calcula score, Premium visual e quem entra na primeira onda."
          icon={<Target className="h-4 w-4" />}
        />
        <ActionStep
          number="2"
          title="Aplicar Premium visual"
          description="Transforma o plano em vitrine real: ancoras e trials aparecem com destaque, mas ainda nao viram pagantes."
          icon={<Eye className="h-4 w-4" />}
        />
        <ActionStep
          number="3"
          title="Enviar alvos para o CRM"
          description="Cria ou atualiza os alvos comerciais no Sales Hub para o robo ou o humano iniciar o contato."
          icon={<Send className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
        <MetricCard label="Publicados" value={stats.total} icon={<Users className="h-5 w-5" />} tone="slate" />
        <MetricCard label="Vitrine premium" value={`${stats.premiumPercent}%`} icon={<Crown className="h-5 w-5" />} tone="indigo" />
        <MetricCard label="Ancoras" value={stats.anchors} icon={<ShieldCheck className="h-5 w-5" />} tone="emerald" />
        <MetricCard label="Alvos comerciais" value={stats.targets} icon={<Bot className="h-5 w-5" />} tone="blue" />
        <MetricCard label="Onda 1 CRM" value={stats.wave} icon={<Send className="h-5 w-5" />} tone="amber" />
        <MetricCard label="Pagantes" value={stats.paid} icon={<Gift className="h-5 w-5" />} tone="rose" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card className="rounded-xl border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-black">Regras da estrategia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <SliderControl label="Meta de vitrine premium" value={premiumTarget} onChange={setPremiumTarget} suffix="%" />
            <SliderControl label="Grandes como ancoras" value={anchorPercent} onChange={setAnchorPercent} suffix="%" />
            <SliderControl label="Primeira onda do CRM" value={firstWavePercent} onChange={setFirstWavePercent} suffix="%" />
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-500">Dias de trial/reivindicacao</label>
              <Input value={trialDays} onChange={(event) => setTrialDays(event.target.value.replace(/\D/g, ''))} className="h-10" />
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold leading-relaxed text-amber-900">
              Premium visual nao e pagante. Ele serve para proteger a experiencia do usuario e criar prova social na cidade.
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 rounded-xl border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-base font-black">Restaurantes por papel estrategico</CardTitle>
              <div className="flex flex-wrap gap-2">
                {(['all', 'anchor', 'commercial_target'] as const).map((item) => (
                  <Button key={item} variant={filter === item ? 'default' : 'outline'} size="sm" onClick={() => setFilter(item)} className="font-bold">
                    {item === 'all' ? 'Todos' : groupLabel[item]}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[640px] overflow-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-black">Restaurante</th>
                    <th className="px-4 py-3 font-black">Papel</th>
                    <th className="px-4 py-3 font-black">Vitrine</th>
                    <th className="px-4 py-3 font-black">Score</th>
                    <th className="px-4 py-3 font-black">Seguidores</th>
                    <th className="px-4 py-3 font-black">CRM</th>
                    <th className="px-4 py-3 font-black">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100 align-top hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <p className="font-black text-slate-950">{item.name}</p>
                        <p className="mt-0.5 text-xs font-semibold text-slate-500">{[item.category, item.neighborhood].filter(Boolean).join(' · ') || 'Sem categoria'}</p>
                      </td>
                      <td className="px-4 py-3"><GroupBadge group={item.strategic_group} /></td>
                      <td className="px-4 py-3"><VisualBadge status={item.visual_status} /></td>
                      <td className="px-4 py-3">
                        <div className="w-28">
                          <div className="mb-1 flex justify-between text-xs font-bold text-slate-600">
                            <span>{item.commercial_score}</span>
                            <span>/100</span>
                          </div>
                          <Progress value={item.commercial_score} className="h-2" />
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-700">{item.followers_count.toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-3">
                        {item.crm_wave === 1 ? (
                          <Badge variant="outline" className="border-blue-200 bg-blue-50 font-bold text-blue-700">
                            Onda 1
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-slate-50 font-bold text-slate-500">
                            Depois
                          </Badge>
                        )}
                      </td>
                      <td className="max-w-sm px-4 py-3 text-xs font-semibold leading-relaxed text-slate-500">{item.reason}</td>
                    </tr>
                  ))}
                  {visibleRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
                        Nenhum restaurante neste filtro.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ActionStep({ number, title, description, icon }: { number: string; title: string; description: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
              Passo {number}
            </span>
            <p className="text-sm font-black text-slate-950">{title}</p>
          </div>
          <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">{description}</p>
        </div>
      </div>
    </div>
  );
}

function SliderControl({ label, value, onChange, suffix }: { label: string; value: number[]; onChange: (value: number[]) => void; suffix: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</label>
        <span className="rounded bg-indigo-50 px-2 py-1 text-xs font-black text-indigo-700">{value[0]}{suffix}</span>
      </div>
      <Slider value={value} onValueChange={onChange} max={100} min={1} step={1} />
    </div>
  );
}

function MetricCard({ label, value, icon, tone }: { label: string; value: number | string; icon: React.ReactNode; tone: 'slate' | 'indigo' | 'emerald' | 'blue' | 'amber' | 'rose' }) {
  const tones = {
    slate: 'bg-slate-50 text-slate-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
  };

  return (
    <Card className="rounded-xl border-slate-200 bg-white shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-lg p-2.5 ${tones[tone]}`}>{icon}</div>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</p>
          <p className="text-2xl font-black text-slate-950">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function GroupBadge({ group }: { group: StrategyGroup }) {
  const className = group === 'anchor'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : group === 'commercial_target'
      ? 'border-blue-200 bg-blue-50 text-blue-700'
      : 'border-slate-200 bg-slate-50 text-slate-500';
  return <Badge variant="outline" className={`font-bold ${className}`}>{groupLabel[group]}</Badge>;
}

function VisualBadge({ status }: { status: VisualStatus }) {
  const className = status === 'paid_premium'
    ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
    : status === 'premium_launch'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : status === 'claim_trial'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-slate-200 bg-slate-50 text-slate-500';
  return <Badge variant="outline" className={`font-bold ${className}`}>{visualLabel[status]}</Badge>;
}

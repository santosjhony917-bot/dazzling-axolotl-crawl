import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DragDropContext, Draggable, Droppable, DropResult } from '@hello-pangea/dnd';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  Clock,
  Inbox,
  MessageCircle,
  PauseCircle,
  Phone,
  PhoneOff,
  Play,
  RefreshCw,
  Send,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  UserCheck,
  Users,
  Wifi,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type PipelineStage =
  | 'PublishedReady'
  | 'Uncontacted'
  | 'Queued'
  | 'Contacted'
  | 'Responded'
  | 'Qualified'
  | 'Handoff'
  | 'Negotiating'
  | 'Won'
  | 'Lost'
  | 'OptOut'
  | 'InvalidContact'
  | 'Blocked'
  | 'Nurturing';

type RestaurantInfo = {
  id: string;
  name: string;
  category?: string | null;
  city?: string | null;
  state?: string | null;
  neighborhood?: string | null;
  phone?: string | null;
  whatsapp_url?: string | null;
  menu_status?: string | null;
  is_published?: boolean | null;
  ai_validated?: boolean | null;
  plan?: string | null;
  created_at?: string | null;
};

type LeadCard = {
  id: string;
  restaurant_id: string;
  pipeline_stage: PipelineStage;
  sentiment?: string | null;
  score?: number | null;
  is_ai_active?: boolean | null;
  primary_phone?: string | null;
  whatsapp_url?: string | null;
  contact_source?: string | null;
  public_profile_url?: string | null;
  opt_out_at?: string | null;
  contact_invalid_at?: string | null;
  contact_invalid_reason?: string | null;
  last_contacted_at?: string | null;
  last_event_at?: string | null;
  next_action_at?: string | null;
  last_response_kind?: ResponseKind | string | null;
  last_response_is_human?: boolean | null;
  response_quality_score?: number | null;
  human_reply_count?: number | null;
  auto_reply_count?: number | null;
  last_human_reply_at?: string | null;
  last_auto_reply_at?: string | null;
  owner_identified_at?: string | null;
  interested_at?: string | null;
  restaurants?: RestaurantInfo | null;
};

type ResponseKind =
  | 'auto_reply'
  | 'bot_menu'
  | 'human_reply'
  | 'owner_identified'
  | 'interested'
  | 'objection'
  | 'opt_out'
  | 'needs_human'
  | 'unknown';

type ResponseClassification = {
  kind: ResponseKind;
  isHuman: boolean;
  isAutomatic: boolean;
  ownerIdentified: boolean;
  interested: boolean;
  needsHuman: boolean;
  optOut: boolean;
  confidence: number;
  reason: string;
};

type CityScope = {
  city: any | null;
  restaurantIds: string[] | null;
};

type CrmWorkspaceProps = {
  citySlug?: string;
  setActiveTab?: (tab: string) => void;
  showHeader?: boolean;
};

const STAGE_TO_COLUMN: Record<string, string> = {
  PublishedReady: 'ready',
  Uncontacted: 'ready',
  Nurturing: 'queued',
  Queued: 'queued',
  Contacted: 'contacted',
  Responded: 'responded',
  Qualified: 'responded',
  Handoff: 'handoff',
  Negotiating: 'handoff',
  Won: 'won',
  Lost: 'closed',
  OptOut: 'closed',
  InvalidContact: 'invalid',
  Blocked: 'closed',
};

const COLUMN_DEFAULT_STAGE: Record<string, PipelineStage> = {
  ready: 'PublishedReady',
  queued: 'Queued',
  contacted: 'Contacted',
  responded: 'Responded',
  handoff: 'Handoff',
  won: 'Won',
  invalid: 'InvalidContact',
  closed: 'Lost',
};

const COLUMNS = [
  { id: 'ready', title: 'Prontos', hint: 'Publicado + validado + contato confiavel', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { id: 'queued', title: 'Fila IA', hint: 'Aguardando robo/Geelark', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'contacted', title: 'Contato enviado', hint: 'Primeira mensagem disparada', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'responded', title: 'Respondeu', hint: 'Lead engajou ou foi qualificado', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'handoff', title: 'Humano', hint: 'Negociacao ou caso sensivel', color: 'bg-violet-50 text-violet-700 border-violet-200' },
  { id: 'won', title: 'Convertidos', hint: 'Plano fechado', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'invalid', title: 'Contato invalido', hint: 'Telefone ruim, WhatsApp inexistente ou numero errado', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { id: 'closed', title: 'Encerrados', hint: 'Perdidos, opt-out ou bloqueados', color: 'bg-rose-50 text-rose-700 border-rose-200' },
];

const OBJECTIONS = [
  { title: 'Ja tenho iFood', answer: 'Comparar com presenca propria e pedidos diretos, sem atacar marketplace.', handoff: false },
  { title: 'Quanto custa?', answer: 'Responder faixa/plano aprovado e oferecer demonstracao curta.', handoff: true },
  { title: 'Isso e golpe?', answer: 'Identificar FilterFood, enviar link publico e oferecer verificacao humana.', handoff: true },
  { title: 'Quem autorizou?', answer: 'Explicar que dados publicos foram organizados e oferecer ajuste/remocao.', handoff: true },
  { title: 'Nao quero receber', answer: 'Pedir desculpas, confirmar remocao e marcar opt-out.', handoff: false },
];

const ROBOT_ROLES = [
  { name: 'SDR IA', goal: 'Primeiro contato curto e humano', risk: 'Nao prometer resultado financeiro' },
  { name: 'Qualificador', goal: 'Descobrir responsavel, canal e interesse', risk: 'Nao insistir se houver rejeicao' },
  { name: 'Reativador', goal: 'Retomar leads que sumiram', risk: 'Respeitar cadencia baixa' },
  { name: 'Reivindicacao', goal: 'Ajudar o dono a assumir o perfil', risk: 'Nao pedir dados sensiveis por chat' },
  { name: 'Closer assistido', goal: 'Apoiar duvidas comerciais', risk: 'Handoff para preco/contrato' },
];

const formatDate = (value?: string | null) => {
  if (!value) return 'Sem registro';
  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const normalizePhone = (value?: string | null) => String(value || '').replace(/\D/g, '');

const isClosedStage = (stage?: string | null) => ['Won', 'Lost', 'OptOut', 'InvalidContact', 'Blocked'].includes(String(stage || ''));
const isReadyStage = (stage?: string | null) => ['PublishedReady', 'Uncontacted'].includes(String(stage || ''));
const isQueueStage = (stage?: string | null) => ['Queued', 'Nurturing'].includes(String(stage || ''));

const isSchemaMissingError = (error: any) => {
  const message = String(error?.message || error || '');
  return /does not exist|schema cache|Could not find the table|Could not find.*column|column .* not found/i.test(message);
};

const isStageEnumError = (error: any) => /invalid input value for enum|invalid enum value/i.test(String(error?.message || error || ''));

const classifyResponseText = (text?: string | null): ResponseClassification => {
  const raw = String(text || '').trim();
  const normalized = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (!normalized) {
    return {
      kind: 'unknown',
      isHuman: false,
      isAutomatic: false,
      ownerIdentified: false,
      interested: false,
      needsHuman: false,
      optOut: false,
      confidence: 0,
      reason: 'Mensagem vazia ou sem texto.',
    };
  }

  const hasAny = (patterns: RegExp[]) => patterns.some((pattern) => pattern.test(normalized));
  const optOut = hasAny([/\bnao quero\b/, /\bremover\b/, /\bpare\b/, /\bdescadastrar\b/, /\bsem interesse\b/]);
  const botMenu = hasAny([/\bdigite\s*\d\b/, /\btecle\s*\d\b/, /\bescolha uma opcao\b/, /\bmenu de atendimento\b/, /(^|\n)\s*\d+\s*[-.)]/]);
  const autoReply = hasAny([
    /\batendimento automatico\b/,
    /\bmensagem automatica\b/,
    /\bseja bem[- ]?vindo\b/,
    /\bobrigad[oa] por entrar em contato\b/,
    /\bnosso horario\b/,
    /\bhorario de funcionamento\b/,
    /\bresponderemos em breve\b/,
    /\bem instantes\b/,
    /\bcardapio\b.*\blink\b/,
  ]);
  const ownerIdentified = hasAny([
    /\bsou (o |a )?(dono|dona|proprietario|proprietaria|responsavel|gerente)\b/,
    /\bpode falar comigo\b/,
    /\bsou eu\b/,
    /\beu sou .*responsavel\b/,
  ]);
  const interested = hasAny([
    /\bpode mandar\b/,
    /\bmanda\b/,
    /\bme envia\b/,
    /\bcomo funciona\b/,
    /\bquero ver\b/,
    /\bmanda o link\b/,
    /\bqual valor\b/,
    /\bquanto custa\b/,
    /\btenho interesse\b/,
  ]);
  const needsHuman = hasAny([
    /\bgolpe\b/,
    /\bquem autorizou\b/,
    /\bautorizacao\b/,
    /\bcontrato\b/,
    /\bpreco\b/,
    /\bvalor\b/,
    /\breclamacao\b/,
    /\bfinanceiro\b/,
  ]);
  const objection = hasAny([/\bja tenho\b/, /\bnao preciso\b/, /\bnao entendi\b/, /\bpor que\b/, /\bifood\b/]);

  if (optOut) {
    return { kind: 'opt_out', isHuman: true, isAutomatic: false, ownerIdentified, interested: false, needsHuman: false, optOut: true, confidence: 0.92, reason: 'Pedido de parada ou rejeicao direta.' };
  }
  if (botMenu) {
    return { kind: 'bot_menu', isHuman: false, isAutomatic: true, ownerIdentified: false, interested: false, needsHuman: false, optOut: false, confidence: 0.9, reason: 'Menu ou fluxo automatico do WhatsApp.' };
  }
  if (autoReply && !ownerIdentified && !interested) {
    return { kind: 'auto_reply', isHuman: false, isAutomatic: true, ownerIdentified: false, interested: false, needsHuman: false, optOut: false, confidence: 0.86, reason: 'Saudacao ou informacao automatica.' };
  }
  if (ownerIdentified) {
    return { kind: 'owner_identified', isHuman: true, isAutomatic: false, ownerIdentified: true, interested, needsHuman, optOut: false, confidence: 0.9, reason: 'Responsavel se identificou ou aceitou falar.' };
  }
  if (needsHuman) {
    return { kind: 'needs_human', isHuman: true, isAutomatic: false, ownerIdentified: false, interested, needsHuman: true, optOut: false, confidence: 0.84, reason: 'Resposta sensivel para revisao humana.' };
  }
  if (interested) {
    return { kind: 'interested', isHuman: true, isAutomatic: false, ownerIdentified: false, interested: true, needsHuman: false, optOut: false, confidence: 0.82, reason: 'Demonstrou curiosidade ou pediu proximo passo.' };
  }
  if (objection) {
    return { kind: 'objection', isHuman: true, isAutomatic: false, ownerIdentified: false, interested: false, needsHuman: true, optOut: false, confidence: 0.76, reason: 'Objeção ou duvida comercial.' };
  }

  return { kind: 'human_reply', isHuman: true, isAutomatic: false, ownerIdentified: false, interested: false, needsHuman: false, optOut: false, confidence: 0.62, reason: 'Texto livre sem padrao automatico conhecido.' };
};

const getEventClassification = (event: any): ResponseClassification => {
  const raw = event?.payload?.classification;
  if (raw?.kind) {
    return {
      kind: raw.kind,
      isHuman: Boolean(raw.is_human ?? raw.isHuman),
      isAutomatic: Boolean(raw.is_automatic ?? raw.isAutomatic),
      ownerIdentified: Boolean(raw.owner_identified ?? raw.ownerIdentified),
      interested: Boolean(raw.interested),
      needsHuman: Boolean(raw.needs_human ?? raw.needsHuman),
      optOut: Boolean(raw.opt_out ?? raw.optOut),
      confidence: Number(raw.confidence || 0),
      reason: raw.reason || 'Classificado pelo webhook.',
    };
  }
  return classifyResponseText(event?.payload?.text || event?.payload?.message);
};

const responseKindLabel: Record<ResponseKind | string, string> = {
  auto_reply: 'Automatico',
  bot_menu: 'Menu/bot',
  human_reply: 'Humano provavel',
  owner_identified: 'Dono identificado',
  interested: 'Interesse',
  objection: 'Objecao',
  opt_out: 'Opt-out',
  needs_human: 'Precisa humano',
  unknown: 'Sem classe',
};

const responseKindClassName = (kind?: string | null) => {
  if (kind === 'owner_identified' || kind === 'interested' || kind === 'human_reply') return 'bg-emerald-50 text-emerald-700';
  if (kind === 'auto_reply' || kind === 'bot_menu') return 'bg-slate-100 text-slate-600';
  if (kind === 'needs_human' || kind === 'objection') return 'bg-amber-50 text-amber-700';
  if (kind === 'opt_out') return 'bg-rose-50 text-rose-700';
  return 'bg-slate-50 text-slate-500';
};

const toLegacyStage = (stage: PipelineStage): PipelineStage => {
  const map: Partial<Record<PipelineStage, PipelineStage>> = {
    PublishedReady: 'Uncontacted',
    Queued: 'Nurturing',
    Contacted: 'Qualified',
    Responded: 'Qualified',
    Handoff: 'Negotiating',
    OptOut: 'Lost',
    InvalidContact: 'Lost',
    Blocked: 'Lost',
  };
  return map[stage] || stage;
};

const buildWhatsappUrl = (lead: LeadCard) => {
  const phone = normalizePhone(lead.primary_phone || lead.restaurants?.phone || lead.whatsapp_url || lead.restaurants?.whatsapp_url);
  if (!phone || phone.length < 10) return '';
  const normalized = phone.startsWith('55') ? phone : `55${phone}`;
  const savedTemplate = localStorage.getItem('crm_message_template')
    || 'Ola! Aqui e da equipe FilterFood. Validamos e publicamos uma previa do perfil do {restaurante}; posso te mostrar como ficou?';
  const profileUrl = lead.public_profile_url || `/restaurant/${lead.restaurant_id}`;
  const restaurantName = lead.restaurants?.name || 'seu restaurante';
  const message = savedTemplate
    .replace(/{restaurante}/g, restaurantName)
    .replace(/{perfil}/g, profileUrl);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
};

async function resolveExpansionCity(citySlug?: string) {
  if (!citySlug) return null;
  const { data: city, error: cityError } = await supabase
    .from('expansion_projects')
    .select('name, state, slug')
    .eq('slug', citySlug)
    .single();
  if (cityError) throw cityError;
  return city;
}

async function resolveCityScope(citySlug?: string): Promise<CityScope> {
  const city = await resolveExpansionCity(citySlug);
  if (!city) return { city: null, restaurantIds: null };

  const { data: restaurants, error: restaurantError } = await supabase
    .from('restaurants')
    .select('id')
    .eq('city', city.name)
    .eq('state', city.state);
  if (restaurantError) throw restaurantError;

  return { city, restaurantIds: (restaurants || []).map((row: any) => row.id) };
}

async function fetchCrmLeads(citySlug?: string) {
  const city = await resolveExpansionCity(citySlug);
  const restaurantJoin = 'restaurants!inner';

  let query = supabase
    .from('commercial_leads')
    .select(`
      id,
      restaurant_id,
      score,
      pipeline_stage,
      sentiment,
      is_ai_active,
      primary_phone,
      whatsapp_url,
      contact_source,
      public_profile_url,
      opt_out_at,
      contact_invalid_at,
      contact_invalid_reason,
      last_contacted_at,
      last_event_at,
      next_action_at,
      last_response_kind,
      last_response_is_human,
      response_quality_score,
      human_reply_count,
      auto_reply_count,
      last_human_reply_at,
      last_auto_reply_at,
      owner_identified_at,
      interested_at,
      ${restaurantJoin} (
        id,
        name,
        category,
        city,
        state,
        neighborhood,
        phone,
        whatsapp_url,
        menu_status,
        is_published,
        ai_validated,
        plan,
        created_at
      )
    `)
    .order('last_event_at', { ascending: false, nullsFirst: false });

  if (city) {
    query = query.eq('restaurants.city', city.name).eq('restaurants.state', city.state);
  }
  query = query
    .eq('restaurants.is_published', true)
    .eq('restaurants.ai_validated', true)
    .eq('restaurants.menu_status', 'found')
    .neq('restaurants.is_deleted', true);

  const { data, error } = await query;
  if (!error) return { city, leads: (data || []) as unknown as LeadCard[] };
  if (!isSchemaMissingError(error)) throw error;

  let legacyQuery = supabase
    .from('commercial_leads')
    .select(`
      id,
      restaurant_id,
      score,
      pipeline_stage,
      sentiment,
      is_ai_active,
      created_at,
      updated_at,
      ${restaurantJoin} (
        id,
        name,
        category,
        city,
        state,
        neighborhood,
        phone,
        whatsapp_url,
        menu_status,
        is_published,
        ai_validated,
        plan,
        created_at
      )
    `)
    .order('updated_at', { ascending: false });

  if (city) {
    legacyQuery = legacyQuery.eq('restaurants.city', city.name).eq('restaurants.state', city.state);
  }
  legacyQuery = legacyQuery
    .eq('restaurants.is_published', true)
    .eq('restaurants.ai_validated', true)
    .eq('restaurants.menu_status', 'found')
    .neq('restaurants.is_deleted', true);

  const { data: legacyData, error: legacyError } = await legacyQuery;
  if (legacyError) throw legacyError;

  const leads = (legacyData || []).map((lead: any) => ({
    ...lead,
    primary_phone: normalizePhone(lead.restaurants?.phone || lead.restaurants?.whatsapp_url),
    whatsapp_url: lead.restaurants?.whatsapp_url || null,
    contact_source: lead.restaurants?.whatsapp_url ? 'restaurant.whatsapp_url' : 'restaurant.phone',
    public_profile_url: `/restaurant/${lead.restaurant_id}`,
    last_event_at: lead.updated_at || lead.created_at,
  }));

  return { city, leads: leads as LeadCard[] };
}

async function fetchResponseEvents(leads: LeadCard[], limit = 300) {
  const leadIds = leads.map((lead) => lead.id);
  if (leadIds.length === 0) return [];

  const { data, error } = await supabase
    .from('commercial_events')
    .select('id, lead_id, event_type, actor_type, payload, created_at')
    .in('lead_id', leadIds)
    .in('event_type', ['WhatsAppMessageReceived', 'WhatsAppInboundClassified'])
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

function summarizeResponseQuality(leads: LeadCard[], events: any[]) {
  const latestByLead = new Map<string, ResponseClassification>();

  events.forEach((event) => {
    if (!latestByLead.has(event.lead_id)) {
      latestByLead.set(event.lead_id, getEventClassification(event));
    }
  });

  leads.forEach((lead) => {
    if (!latestByLead.has(lead.id) && lead.last_response_kind) {
      latestByLead.set(lead.id, {
        kind: lead.last_response_kind as ResponseKind,
        isHuman: Boolean(lead.last_response_is_human),
        isAutomatic: ['auto_reply', 'bot_menu'].includes(String(lead.last_response_kind)),
        ownerIdentified: Boolean(lead.owner_identified_at),
        interested: Boolean(lead.interested_at),
        needsHuman: ['needs_human', 'objection'].includes(String(lead.last_response_kind)),
        optOut: lead.last_response_kind === 'opt_out',
        confidence: Number(lead.response_quality_score || 0),
        reason: 'Resumo salvo no lead.',
      });
    }
  });

  const latest = Array.from(latestByLead.values());
  const human = latest.filter((item) => item.isHuman && !item.optOut);
  const automatic = latest.filter((item) => item.isAutomatic);
  const owner = latest.filter((item) => item.ownerIdentified);
  const interested = latest.filter((item) => item.interested || item.kind === 'interested');
  const needsHuman = latest.filter((item) => item.needsHuman || ['needs_human', 'objection'].includes(item.kind));
  const optOut = latest.filter((item) => item.optOut || item.kind === 'opt_out');
  const totalReplies = latest.length;

  return {
    totalReplies,
    human: human.length,
    automatic: automatic.length,
    owner: owner.length,
    interested: interested.length,
    needsHuman: needsHuman.length,
    optOut: optOut.length,
    humanRate: totalReplies ? Math.round((human.length / totalReplies) * 100) : 0,
    automaticRate: totalReplies ? Math.round((automatic.length / totalReplies) * 100) : 0,
  };
}

function pickContact(restaurant: any) {
  const candidates = Array.isArray(restaurant?.contact_candidates) ? restaurant.contact_candidates : [];
  const ranked = [
    restaurant?.whatsapp_url ? {
      phone: normalizePhone(restaurant.whatsapp_url),
      whatsapp_url: restaurant.whatsapp_url,
      source: restaurant.primary_contact_source || 'restaurant.whatsapp_url',
    } : null,
    restaurant?.phone ? {
      phone: normalizePhone(restaurant.phone),
      whatsapp_url: normalizePhone(restaurant.phone).length >= 10 ? `https://wa.me/55${normalizePhone(restaurant.phone)}` : null,
      source: restaurant.primary_contact_source || 'restaurant.phone',
    } : null,
    ...candidates
      .map((candidate: any) => ({
        phone: normalizePhone(candidate.normalized_phone || candidate.phone),
        whatsapp_url: candidate.whatsapp_url || null,
        source: candidate.source || candidate.source_url || 'contact_candidates',
        score: Number(candidate.score || 0) + (candidate.kind === 'whatsapp' ? 100 : 0),
      }))
      .sort((a: any, b: any) => b.score - a.score),
  ].filter(Boolean);
  return ranked[0] || { phone: null, whatsapp_url: null, source: null };
}

async function syncPublishedRestaurants(citySlug?: string) {
  const scope = await resolveCityScope(citySlug);
  let query = supabase
    .from('restaurants')
    .select('id, name, city, state, phone, whatsapp_url, contact_candidates, primary_contact_source')
    .eq('is_published', true)
    .eq('ai_validated', true)
    .eq('menu_status', 'found')
    .neq('is_deleted', true);

  if (scope.city) {
    query = query.eq('city', scope.city.name).eq('state', scope.city.state);
  }

  let { data: restaurants, error } = await query;
  if (error && isSchemaMissingError(error)) {
    let legacyRestaurantQuery = supabase
      .from('restaurants')
      .select('id, name, city, state, phone, whatsapp_url')
      .eq('is_published', true)
      .eq('ai_validated', true)
      .eq('menu_status', 'found')
      .neq('is_deleted', true);

    if (scope.city) {
      legacyRestaurantQuery = legacyRestaurantQuery.eq('city', scope.city.name).eq('state', scope.city.state);
    }

    const legacyResult = await legacyRestaurantQuery;
    restaurants = (legacyResult.data || []).map((restaurant) => ({
      ...restaurant,
      contact_candidates: null,
      primary_contact_source: null,
    }));
    error = legacyResult.error;
  }
  if (error) throw error;

  const rows = (restaurants || [])
    .map((restaurant: any) => {
      const contact = pickContact(restaurant);
      if (!contact.phone && !contact.whatsapp_url) return null;
      return {
        restaurant_id: restaurant.id,
        score: 60,
        pipeline_stage: 'Uncontacted',
        sentiment: 'Neutral',
        is_ai_active: true,
        primary_phone: contact.phone,
        whatsapp_url: contact.whatsapp_url,
        contact_source: contact.source,
        public_profile_url: `/restaurant/${restaurant.id}`,
        last_event_at: new Date().toISOString(),
      };
    })
    .filter(Boolean);

  if (rows.length === 0) return 0;

  const { error: upsertError } = await supabase
    .from('commercial_leads')
    .upsert(rows as any[], { onConflict: 'restaurant_id' });
  if (upsertError && isSchemaMissingError(upsertError)) {
    const legacyRows = rows.map((row: any) => ({
      restaurant_id: row.restaurant_id,
      score: row.score,
      pipeline_stage: 'Uncontacted',
      sentiment: row.sentiment,
      is_ai_active: row.is_ai_active,
    }));
    const { error: legacyUpsertError } = await supabase
      .from('commercial_leads')
      .upsert(legacyRows as any[], { onConflict: 'restaurant_id' });
    if (legacyUpsertError) throw legacyUpsertError;
    return legacyRows.length;
  }
  if (upsertError) throw upsertError;
  return rows.length;
}

async function insertCommercialEvent(lead: LeadCard, eventType: string, payload: Record<string, any>, actorType = 'Human') {
  await supabase.from('commercial_events').insert({
    lead_id: lead.id,
    event_type: eventType,
    actor_type: actorType,
    payload: {
      restaurant_id: lead.restaurant_id,
      restaurant_name: lead.restaurants?.name,
      ...payload,
    },
  });
}

async function setLeadStage(lead: LeadCard, nextStage: PipelineStage) {
  const patch: Record<string, any> = {
    pipeline_stage: nextStage,
    last_event_at: new Date().toISOString(),
  };

  if (nextStage === 'Contacted') patch.last_contacted_at = new Date().toISOString();
  if (nextStage === 'OptOut') {
    patch.opt_out_at = new Date().toISOString();
    patch.is_ai_active = false;
  }
  if (nextStage === 'InvalidContact') {
    patch.contact_invalid_at = new Date().toISOString();
    patch.contact_invalid_reason = 'Marcado manualmente no CRM';
    patch.is_ai_active = false;
    patch.automation_paused_reason = 'Contato invalido';
  }
  if (nextStage === 'Handoff') patch.automation_paused_reason = 'Handoff humano solicitado pelo CRM';

  const { error } = await supabase.from('commercial_leads').update(patch).eq('id', lead.id);
  if (error && (isSchemaMissingError(error) || isStageEnumError(error))) {
    const { error: legacyError } = await supabase
      .from('commercial_leads')
      .update({ pipeline_stage: toLegacyStage(nextStage) })
      .eq('id', lead.id);
    if (legacyError) throw legacyError;
  } else if (error) {
    throw error;
  }

  await insertCommercialEvent(lead, 'PipelineStageChanged', { from: lead.pipeline_stage, to: nextStage });
  if (nextStage === 'InvalidContact') {
    await insertCommercialEvent(lead, 'InvalidContactMarked', {
      phone: lead.primary_phone || lead.restaurants?.phone,
      reason: 'Telefone/WhatsApp nao permitiu contato',
    });
  }

  if (nextStage === 'Won') {
    await supabase.from('restaurants').update({ plan: 'premium' }).eq('id', lead.restaurant_id);
  }
}

async function enqueueLead(lead: LeadCard): Promise<'job' | 'event'> {
  const activeStatuses = ['pending', 'scheduled', 'running', 'waiting_external', 'retrying'];
  const { data: existingJobs, error: existingError } = await supabase
    .from('crm_robot_jobs')
    .select('id')
    .eq('lead_id', lead.id)
    .eq('job_type', 'first_contact')
    .in('status', activeStatuses)
    .limit(1);

  if (!existingError && existingJobs && existingJobs.length > 0) {
    await setLeadStage(lead, 'Queued');
    return 'job';
  }
  if (existingError && !isSchemaMissingError(existingError)) throw existingError;

  const payload = {
    restaurant_name: lead.restaurants?.name,
    phone: lead.primary_phone || normalizePhone(lead.restaurants?.phone || lead.restaurants?.whatsapp_url),
    whatsapp_url: lead.whatsapp_url || lead.restaurants?.whatsapp_url,
    public_profile_url: lead.public_profile_url || `/restaurant/${lead.restaurant_id}`,
  };

  const { error } = await supabase.from('crm_robot_jobs').insert({
    lead_id: lead.id,
    restaurant_id: lead.restaurant_id,
    job_type: 'first_contact',
    status: 'pending',
    channel: 'whatsapp',
    provider: 'geelark',
    payload,
  });
  if (error && isSchemaMissingError(error)) {
    await insertCommercialEvent(lead, 'RobotJobRequested', payload, 'System');
    await setLeadStage(lead, 'Queued');
    return 'event';
  }
  if (error) throw error;
  await setLeadStage(lead, 'Queued');
  return 'job';
}

async function enqueueReadyLeads(leads: LeadCard[], limit = 10) {
  const ready = leads
    .filter((lead) => isReadyStage(lead.pipeline_stage) && lead.is_ai_active !== false && !lead.opt_out_at)
    .slice(0, limit);

  let fallbackEvents = 0;
  for (const lead of ready) {
    const mode = await enqueueLead(lead);
    if (mode === 'event') fallbackEvents += 1;
  }

  return { count: ready.length, fallbackEvents };
}

export function CrmTodayPanel({ citySlug, setActiveTab }: { citySlug?: string; setActiveTab: (tab: string) => void }) {
  const [city, setCity] = useState<any>(null);
  const [leads, setLeads] = useState<LeadCard[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [responseEvents, setResponseEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchCrmLeads(citySlug);
      setCity(result.city);
      setLeads(result.leads);
      setResponseEvents(await fetchResponseEvents(result.leads));

      let jobQuery = supabase
        .from('crm_robot_jobs')
        .select('id, lead_id, restaurant_id, status, job_type, scheduled_at, last_error')
        .in('status', ['pending', 'scheduled', 'running', 'waiting_external', 'retrying', 'needs_human'])
        .order('scheduled_at', { ascending: true });

      if (citySlug) {
        const scope = await resolveCityScope(citySlug);
        if (scope.restaurantIds && scope.restaurantIds.length > 0) {
          jobQuery = jobQuery.in('restaurant_id', scope.restaurantIds);
        }
      }

      const { data: jobRows } = await jobQuery;
      setJobs(jobRows || []);
    } catch (err: any) {
      toast.error(`Erro ao carregar resumo do CRM: ${err?.message || 'erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  }, [citySlug]);

  useEffect(() => {
    load();
  }, [load]);

  const ready = leads.filter((lead) => isReadyStage(lead.pipeline_stage));
  const queued = leads.filter((lead) => isQueueStage(lead.pipeline_stage));
  const responded = leads.filter((lead) => ['Responded', 'Qualified'].includes(lead.pipeline_stage));
  const handoff = leads.filter((lead) => ['Handoff', 'Negotiating'].includes(lead.pipeline_stage));
  const optOut = leads.filter((lead) => lead.pipeline_stage === 'OptOut' || lead.opt_out_at);
  const invalidContact = leads.filter((lead) => lead.pipeline_stage === 'InvalidContact' || lead.contact_invalid_at);
  const won = leads.filter((lead) => lead.pipeline_stage === 'Won');
  const failedJobs = jobs.filter((job) => ['failed', 'needs_human'].includes(job.status));
  const responseQuality = useMemo(() => summarizeResponseQuality(leads, responseEvents), [leads, responseEvents]);

  const runSync = async () => {
    setBusy(true);
    try {
      const count = await syncPublishedRestaurants(citySlug);
      toast.success(count > 0 ? `${count} restaurante(s) sincronizado(s).` : 'Nenhum restaurante novo para sincronizar.');
      await load();
    } catch (err: any) {
      toast.error(`Erro ao sincronizar: ${err?.message || 'erro desconhecido'}`);
    } finally {
      setBusy(false);
    }
  };

  const queueNext = async () => {
    setBusy(true);
    try {
      const result = await enqueueReadyLeads(leads, 10);
      toast.success(result.count > 0
        ? `${result.count} lead(s) enviados para contato${result.fallbackEvents ? ' via fallback do CRM legado.' : '.'}`
        : 'Nenhum lead pronto com IA ativa.');
      await load();
    } catch (err: any) {
      toast.error(`Erro ao enfileirar: ${err?.message || 'erro desconhecido'}`);
    } finally {
      setBusy(false);
    }
  };

  const pauseAllAi = async () => {
    const activeIds = leads.filter((lead) => lead.is_ai_active && !isClosedStage(lead.pipeline_stage)).map((lead) => lead.id);
    if (activeIds.length === 0) {
      toast.info('Nenhuma IA ativa para pausar.');
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase
        .from('commercial_leads')
        .update({ is_ai_active: false, automation_paused_reason: 'Pausa operacional pelo painel Hoje' })
        .in('id', activeIds);
      if (error && isSchemaMissingError(error)) {
        const { error: legacyError } = await supabase
          .from('commercial_leads')
          .update({ is_ai_active: false })
          .in('id', activeIds);
        if (legacyError) throw legacyError;
      } else if (error) {
        throw error;
      }
      toast.success(`${activeIds.length} automacao(oes) pausada(s).`);
      await load();
    } catch (err: any) {
      toast.error(`Erro ao pausar IA: ${err?.message || 'erro desconhecido'}`);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <LoadingBlock label="Carregando central de hoje..." />;
  }

  return (
    <div className="min-w-0 space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-indigo-600">Hoje no CRM</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
              {city ? `${city.name}/${city.state}: proxima melhor acao` : 'Central comercial: proxima melhor acao'}
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-500">
              Comece por aqui: sincronize publicados, mande os proximos leads para a fila, revise respostas e treine os robos quando houver objecoes novas.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <Button onClick={runSync} disabled={busy} variant="outline" className="h-10 font-bold">
              <RefreshCw className="mr-2 h-4 w-4" />
              Sincronizar
            </Button>
            <Button onClick={queueNext} disabled={busy} className="h-10 bg-indigo-600 font-bold text-white hover:bg-indigo-700">
              <Send className="mr-2 h-4 w-4" />
              Chamar proximos
            </Button>
            <Button onClick={() => setActiveTab('training')} variant="outline" className="h-10 font-bold">
              <BookOpen className="mr-2 h-4 w-4" />
              Treinar robos
            </Button>
            <Button onClick={pauseAllAi} disabled={busy} variant="outline" className="h-10 font-bold text-amber-700 hover:bg-amber-50">
              <PauseCircle className="mr-2 h-4 w-4" />
              Pausar IA
            </Button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        <MetricCard label="Prontos" value={ready.length} icon={<Users className="h-5 w-5" />} color="bg-slate-50 text-slate-700" />
        <MetricCard label="Na fila" value={queued.length} icon={<Bot className="h-5 w-5" />} color="bg-indigo-50 text-indigo-700" />
        <MetricCard label="Humano real" value={responseQuality.human} icon={<MessageCircle className="h-5 w-5" />} color="bg-emerald-50 text-emerald-700" />
        <MetricCard label="Automaticas" value={responseQuality.automatic} icon={<Inbox className="h-5 w-5" />} color="bg-slate-50 text-slate-700" />
        <MetricCard label="Dono achado" value={responseQuality.owner} icon={<UserCheck className="h-5 w-5" />} color="bg-blue-50 text-blue-700" />
        <MetricCard label="Precisa humano" value={responseQuality.needsHuman + failedJobs.length} icon={<ShieldAlert className="h-5 w-5" />} color="bg-violet-50 text-violet-700" />
        <MetricCard label="Convertidos" value={won.length} icon={<UserCheck className="h-5 w-5" />} color="bg-emerald-50 text-emerald-700" />
        <MetricCard label="Contato invalido" value={invalidContact.length} icon={<PhoneOff className="h-5 w-5" />} color="bg-orange-50 text-orange-700" />
        <MetricCard label="Opt-out" value={optOut.length} icon={<AlertCircle className="h-5 w-5" />} color="bg-rose-50 text-rose-700" />
      </div>

      <Card className="rounded-xl border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-black text-slate-950">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Qualidade das respostas
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <ResponseQualityPill label="Taxa humana" value={`${responseQuality.humanRate}%`} tone="emerald" />
          <ResponseQualityPill label="Resposta automatica" value={`${responseQuality.automaticRate}%`} tone="slate" />
          <ResponseQualityPill label="Interesse real" value={responseQuality.interested} tone="blue" />
          <ResponseQualityPill label="Casos sensiveis" value={responseQuality.needsHuman} tone="amber" />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-black">
              <Zap className="h-5 w-5 text-indigo-600" />
              Acoes recomendadas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ActionRow
              title="Preparar restaurantes publicados"
              description={leads.length === 0 ? 'Se a lista esta vazia, aplique a migration 0059 e sincronize os publicados.' : `${leads.length} lead(s) ja existem no CRM.`}
              action="Sincronizar"
              onClick={runSync}
            />
            <ActionRow
              title="Enviar proximos leads para o robo"
              description={`${ready.length} lead(s) podem entrar na fila com o SDR IA.`}
              action="Chamar proximos"
              onClick={queueNext}
            />
            <ActionRow
              title="Responder casos sensiveis"
              description={`${handoff.length + failedJobs.length} item(ns) precisam de humano ou revisao.`}
              action="Abrir conversas"
              onClick={() => setActiveTab('inbox')}
            />
            <ActionRow
              title="Ajustar treinamento"
              description="Revise objecoes, prompt do SDR e regras antes de aumentar cadencia."
              action="Treinar"
              onClick={() => setActiveTab('training')}
            />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-black">
              <MessageCircle className="h-5 w-5 text-emerald-600" />
              Fila de contato de hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ready.slice(0, 5).length === 0 ? (
              <EmptyState
                title="Nenhum lead pronto agora"
                description="Sincronize publicados ou conclua Validar IA para liberar restaurantes com contato confiavel."
                action="Sincronizar publicados"
                onAction={runSync}
              />
            ) : ready.slice(0, 5).map((lead) => (
              <div key={lead.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900">{lead.restaurants?.name}</p>
                  <p className="truncate text-xs font-semibold text-slate-500">
                    {[lead.restaurants?.neighborhood, lead.restaurants?.city].filter(Boolean).join(' / ') || 'Sem bairro'} · {lead.primary_phone || 'sem telefone'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => enqueueLead(lead)
                    .then((mode) => {
                      toast.success(mode === 'event'
                        ? 'Lead registrado para contato no CRM legado.'
                        : 'Lead colocado na fila do robo.');
                      load();
                    })
                    .catch((err: any) => toast.error(`Erro ao enfileirar: ${err?.message || 'erro desconhecido'}`))}
                  className="shrink-0 font-bold"
                >
                  Enfileirar
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function CrmWorkspace({ citySlug, setActiveTab, showHeader = true }: CrmWorkspaceProps) {
  const [city, setCity] = useState<any>(null);
  const [leads, setLeads] = useState<LeadCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchCrmLeads(citySlug);
      setCity(result.city);
      setLeads(result.leads);
    } catch (err: any) {
      toast.error(`Erro ao carregar CRM: ${err?.message || 'erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  }, [citySlug]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const filteredLeads = useMemo(() => {
    const term = search.trim().toLowerCase();
    return leads.filter((lead) => {
      if (activeOnly && isClosedStage(lead.pipeline_stage)) return false;
      if (!term) return true;
      const restaurant = lead.restaurants;
      return [
        restaurant?.name,
        restaurant?.category,
        restaurant?.city,
        restaurant?.state,
        restaurant?.neighborhood,
        lead.primary_phone,
        lead.contact_source,
      ].some((value) => String(value || '').toLowerCase().includes(term));
    });
  }, [activeOnly, leads, search]);

  const updateLeadStage = async (leadId: string, nextStage: PipelineStage) => {
    const lead = leads.find((item) => item.id === leadId);
    if (!lead) return;

    try {
      await setLeadStage(lead, nextStage);
      const patch: Partial<LeadCard> = { pipeline_stage: nextStage, last_event_at: new Date().toISOString() };
      if (nextStage === 'Contacted') patch.last_contacted_at = new Date().toISOString();
      if (nextStage === 'OptOut') {
        patch.opt_out_at = new Date().toISOString();
        patch.is_ai_active = false;
      }
      if (nextStage === 'InvalidContact') {
        patch.contact_invalid_at = new Date().toISOString();
        patch.contact_invalid_reason = 'Marcado manualmente no CRM';
        patch.is_ai_active = false;
      }
      setLeads((prev) => prev.map((item) => item.id === leadId ? { ...item, ...patch } : item));
      toast.success(nextStage === 'Won' ? 'Conversao registrada e plano Premium ativado.' : 'Estagio comercial atualizado.');
    } catch (err: any) {
      toast.error(`Erro ao atualizar lead: ${err?.message || 'erro desconhecido'}`);
      loadLeads();
    }
  };

  const toggleAi = async (lead: LeadCard) => {
    try {
      const next = !lead.is_ai_active;
      const { error } = await supabase
        .from('commercial_leads')
        .update({ is_ai_active: next, automation_paused_reason: next ? null : 'IA pausada manualmente' })
        .eq('id', lead.id);
      if (error && isSchemaMissingError(error)) {
        const { error: legacyError } = await supabase
          .from('commercial_leads')
          .update({ is_ai_active: next })
          .eq('id', lead.id);
        if (legacyError) throw legacyError;
      } else if (error) {
        throw error;
      }
      setLeads((prev) => prev.map((item) => item.id === lead.id ? { ...item, is_ai_active: next } : item));
      toast.success(next ? 'IA ativada para este lead.' : 'IA pausada para este lead.');
    } catch (err: any) {
      toast.error(`Erro ao alternar IA: ${err?.message || 'erro desconhecido'}`);
    }
  };

  const enqueueFirstContact = async (lead: LeadCard) => {
    try {
      const mode = await enqueueLead(lead);
      await loadLeads();
      toast.success(mode === 'event'
        ? 'Lead registrado para contato no CRM legado. Aplique a migration para ativar a fila real dos robos.'
        : 'Lead colocado na fila do robo.');
    } catch (err: any) {
      toast.error(`Erro ao enfileirar robo: ${err?.message || 'erro desconhecido'}`);
    }
  };

  const queueNext = async () => {
    try {
      const result = await enqueueReadyLeads(leads, 10);
      toast.success(result.count > 0
        ? `${result.count} lead(s) enviados para contato${result.fallbackEvents ? ' via fallback do CRM legado.' : '.'}`
        : 'Nenhum lead pronto com IA ativa.');
      await loadLeads();
    } catch (err: any) {
      toast.error(`Erro ao enfileirar: ${err?.message || 'erro desconhecido'}`);
    }
  };

  const runSync = async () => {
    setSyncing(true);
    try {
      const count = await syncPublishedRestaurants(citySlug);
      toast.success(count > 0 ? `${count} restaurante(s) sincronizado(s).` : 'Nenhum restaurante novo para sincronizar.');
      await loadLeads();
    } catch (err: any) {
      toast.error(`Erro ao sincronizar publicados: ${err?.message || 'erro desconhecido'}`);
    } finally {
      setSyncing(false);
    }
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const nextColumn = result.destination.droppableId;
    if (nextColumn === result.source.droppableId) return;
    updateLeadStage(result.draggableId, COLUMN_DEFAULT_STAGE[nextColumn]);
  };

  const stats = useMemo(() => ({
    total: leads.length,
    active: leads.filter((lead) => !isClosedStage(lead.pipeline_stage)).length,
    ready: leads.filter((lead) => isReadyStage(lead.pipeline_stage)).length,
    ai: leads.filter((lead) => lead.is_ai_active && !lead.opt_out_at).length,
    won: leads.filter((lead) => lead.pipeline_stage === 'Won').length,
    invalid: leads.filter((lead) => lead.pipeline_stage === 'InvalidContact' || lead.contact_invalid_at).length,
  }), [leads]);

  if (loading) {
    return <LoadingBlock label="Carregando CRM pos-publicacao..." />;
  }

  return (
    <div className="min-w-0 space-y-6">
      {showHeader && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-indigo-600">Leads publicados</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                {city ? `Sales Hub - ${city.name}/${city.state}` : 'Central comercial FilterFood'}
              </h2>
              <p className="mt-1 max-w-3xl text-sm font-medium leading-relaxed text-slate-500">
                Kanban de restaurantes publicados. Use os botoes para chamar no WhatsApp, enfileirar robo, pausar IA ou passar para humano.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
              <Button variant="outline" onClick={loadLeads} className="font-bold">
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </Button>
              <Button onClick={runSync} disabled={syncing} variant="outline" className="font-bold">
                <Sparkles className="mr-2 h-4 w-4" />
                Sincronizar
              </Button>
              <Button onClick={queueNext} className="bg-indigo-600 font-bold text-white hover:bg-indigo-700">
                <Send className="mr-2 h-4 w-4" />
                Chamar proximos
              </Button>
              <Button onClick={() => setActiveTab?.('training')} variant="outline" className="font-bold">
                <BookOpen className="mr-2 h-4 w-4" />
                Treinar
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4">
        <MetricCard label="Leads CRM" value={stats.total} icon={<Users className="h-5 w-5" />} color="bg-slate-50 text-slate-700" />
        <MetricCard label="Prontos" value={stats.ready} icon={<Send className="h-5 w-5" />} color="bg-blue-50 text-blue-700" />
        <MetricCard label="Ativos" value={stats.active} icon={<MessageCircle className="h-5 w-5" />} color="bg-indigo-50 text-indigo-700" />
        <MetricCard label="IA ativa" value={stats.ai} icon={<Bot className="h-5 w-5" />} color="bg-violet-50 text-violet-700" />
        <MetricCard label="Convertidos" value={stats.won} icon={<UserCheck className="h-5 w-5" />} color="bg-emerald-50 text-emerald-700" />
        <MetricCard label="Contato invalido" value={stats.invalid} icon={<PhoneOff className="h-5 w-5" />} color="bg-orange-50 text-orange-700" />
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xl">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar restaurante, bairro, cidade, telefone ou origem..."
            className="h-10 pl-9"
          />
          <MessageCircle className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        </div>
        <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
          <span>Ocultar encerrados</span>
          <Switch checked={activeOnly} onCheckedChange={setActiveOnly} />
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex max-w-full gap-5 overflow-x-auto overscroll-x-contain pb-6 custom-scrollbar">
          {COLUMNS.map((column) => {
            const columnCards = filteredLeads.filter((lead) => STAGE_TO_COLUMN[lead.pipeline_stage] === column.id);
            return (
              <div key={column.id} className="w-[330px] min-w-[330px] shrink-0">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className={`inline-flex rounded-lg border px-3 py-1.5 text-[11px] font-black uppercase ${column.color}`}>
                      {column.title}
                    </div>
                    <p className="mt-1 text-[11px] font-medium leading-snug text-slate-500">{column.hint}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-500">
                    {columnCards.length}
                  </span>
                </div>

                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[220px] space-y-3 rounded-xl transition-colors ${snapshot.isDraggingOver ? 'bg-indigo-50 p-2 ring-2 ring-indigo-200' : ''}`}
                    >
                      {columnCards.map((lead, index) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(dragProvided, dragSnapshot) => (
                            <LeadCardItem
                              lead={lead}
                              ref={dragProvided.innerRef}
                              draggableProps={dragProvided.draggableProps}
                              dragHandleProps={dragProvided.dragHandleProps}
                              dragging={dragSnapshot.isDragging}
                              onToggleAi={() => toggleAi(lead)}
                              onQueue={() => enqueueFirstContact(lead)}
                              onWhatsApp={() => {
                                const url = buildWhatsappUrl(lead);
                                if (!url) {
                                  toast.error('Contato invalido para WhatsApp.');
                                  return;
                                }
                                window.open(url, '_blank');
                                updateLeadStage(lead.id, 'Contacted');
                              }}
                              onHandoff={() => updateLeadStage(lead.id, 'Handoff')}
                              onAdvance={() => {
                                const currentColumn = STAGE_TO_COLUMN[lead.pipeline_stage] || 'ready';
                                const currentIndex = COLUMNS.findIndex((item) => item.id === currentColumn);
                                const nextColumn = COLUMNS[Math.min(currentIndex + 1, COLUMNS.length - 1)];
                                updateLeadStage(lead.id, COLUMN_DEFAULT_STAGE[nextColumn.id]);
                              }}
                              onInvalidContact={() => updateLeadStage(lead.id, 'InvalidContact')}
                              onOptOut={() => updateLeadStage(lead.id, 'OptOut')}
                            />
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {columnCards.length === 0 && (
                        <SmartColumnEmpty columnId={column.id} onSync={runSync} onTrain={() => setActiveTab?.('training')} />
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}

function MetricCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <Card className="rounded-xl border-slate-200 bg-white shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-lg p-2.5 ${color}`}>{icon}</div>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</p>
          <p className="text-2xl font-black text-slate-950">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ResponseQualityPill({ label, value, tone }: { label: string; value: string | number; tone: 'emerald' | 'slate' | 'blue' | 'amber' }) {
  const tones = {
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-800',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    blue: 'border-blue-100 bg-blue-50 text-blue-800',
    amber: 'border-amber-100 bg-amber-50 text-amber-800',
  };

  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="flex min-h-[300px] items-center justify-center text-sm font-semibold text-slate-500">
      <RefreshCw className="mr-2 h-5 w-5 animate-spin text-indigo-500" />
      {label}
    </div>
  );
}

function ActionRow({ title, description, action, onClick }: { title: string; description: string; action: string; onClick: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-black text-slate-900">{title}</p>
        <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">{description}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onClick} className="shrink-0 font-bold">
        {action}
      </Button>
    </div>
  );
}

function EmptyState({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction?: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
      <p className="text-sm font-black text-slate-700">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-xs font-medium leading-relaxed text-slate-500">{description}</p>
      {action && onAction && (
        <Button variant="outline" size="sm" onClick={onAction} className="mt-3 font-bold">
          {action}
        </Button>
      )}
    </div>
  );
}

function SmartColumnEmpty({ columnId, onSync, onTrain }: { columnId: string; onSync: () => void; onTrain: () => void }) {
  if (columnId === 'ready') {
    return (
      <EmptyState
        title="Nenhum lead pronto"
        description="Se voce ja publicou restaurantes, sincronize os publicados. Se continuar vazio, aplique a migration 0059."
        action="Sincronizar"
        onAction={onSync}
      />
    );
  }
  if (columnId === 'responded') {
    return (
      <EmptyState
        title="Sem respostas ainda"
        description="Quando um restaurante responder, ele deve aparecer aqui para IA ou humano seguirem."
        action="Treinar IA"
        onAction={onTrain}
      />
    );
  }
  return (
    <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs font-bold text-slate-400">
      Sem leads aqui
    </div>
  );
}

const LeadCardItem = React.forwardRef<HTMLDivElement, any>(function LeadCardItem({
  lead,
  draggableProps,
  dragHandleProps,
  dragging,
  onToggleAi,
  onQueue,
  onWhatsApp,
  onHandoff,
  onAdvance,
  onInvalidContact,
  onOptOut,
}, ref) {
  const restaurant = lead.restaurants || {};
  const stageColumn = STAGE_TO_COLUMN[lead.pipeline_stage] || 'ready';
  const canQueue = isReadyStage(lead.pipeline_stage) && !lead.opt_out_at;

  return (
    <Card
      ref={ref}
      {...draggableProps}
      {...dragHandleProps}
      className={`rounded-xl border-slate-200 bg-white p-4 shadow-sm transition-all ${dragging ? 'rotate-2 shadow-xl ring-2 ring-indigo-400' : 'hover:-translate-y-0.5 hover:shadow-md'}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="line-clamp-2 text-sm font-black leading-snug text-slate-950">{restaurant.name || 'Restaurante sem nome'}</h4>
          <p className="mt-1 truncate text-xs font-semibold text-slate-500">
            {[restaurant.neighborhood, restaurant.city, restaurant.state].filter(Boolean).join(' / ') || 'Sem localizacao'}
          </p>
        </div>
        {lead.opt_out_at ? (
          <ShieldAlert className="h-4 w-4 shrink-0 text-rose-500" />
        ) : lead.is_ai_active ? (
          <Bot className="h-4 w-4 shrink-0 text-indigo-500" />
        ) : (
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-600">
          {restaurant.category || 'Restaurante'}
        </Badge>
        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[10px] font-bold text-emerald-700">
          Publicado
        </Badge>
        <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-[10px] font-bold text-indigo-700">
          {lead.pipeline_stage}
        </Badge>
        {lead.last_response_kind && (
          <Badge variant="outline" className={`border-transparent text-[10px] font-bold ${responseKindClassName(lead.last_response_kind)}`}>
            {responseKindLabel[lead.last_response_kind] || lead.last_response_kind}
          </Badge>
        )}
      </div>

      <div className="space-y-2 rounded-lg bg-slate-50 p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <Phone className="h-3.5 w-3.5 text-slate-400" />
          <span className="truncate">{lead.primary_phone || restaurant.phone || 'Sem telefone'}</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <span>Ultimo evento: {formatDate(lead.last_event_at)}</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
          <span className="truncate">Origem: {lead.contact_source || 'nao informada'}</span>
        </div>
        {lead.last_response_summary && (
          <div className="flex items-start gap-2 text-xs font-semibold text-slate-600">
            <Inbox className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="line-clamp-2">{lead.last_response_summary}</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={onWhatsApp}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#25D366]/10 text-[#1fae54] transition-colors hover:bg-[#25D366] hover:text-white"
            title="Abrir WhatsApp"
          >
            <MessageCircle className="h-4 w-4" />
          </button>
          <button
            onClick={onQueue}
            disabled={!canQueue}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition-colors hover:bg-indigo-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            title="Enfileirar robo"
          >
            <Bot className="h-4 w-4" />
          </button>
          <button
            onClick={onToggleAi}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${lead.is_ai_active ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-700 hover:text-white'}`}
            title={lead.is_ai_active ? 'Pausar IA' : 'Ativar IA'}
          >
            <Sparkles className="h-4 w-4" />
          </button>
          <button
            onClick={onHandoff}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700 transition-colors hover:bg-amber-600 hover:text-white"
            title="Enviar para humano"
          >
            <ShieldAlert className="h-4 w-4" />
          </button>
          <button
            onClick={onInvalidContact}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-700 transition-colors hover:bg-orange-600 hover:text-white"
            title="Marcar contato invalido"
          >
            <PhoneOff className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          {!lead.opt_out_at && (
            <Button variant="ghost" size="sm" onClick={onOptOut} className="h-8 px-2 text-[11px] font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700">
              Opt-out
            </Button>
          )}
          {!['won', 'closed'].includes(stageColumn) && (
            <Button variant="ghost" size="sm" onClick={onAdvance} className="h-8 px-2 text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700">
              Avancar <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
});

export function CrmInboxPanel({ citySlug }: { citySlug?: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchCrmLeads(citySlug);
      const leadIds = result.leads.map((lead) => lead.id);
      if (leadIds.length === 0) {
        setEvents([]);
        return;
      }

      const { data, error } = await supabase
        .from('commercial_events')
        .select('id, lead_id, event_type, actor_type, payload, created_at')
        .in('lead_id', leadIds)
        .order('created_at', { ascending: false })
        .limit(80);
      if (error) throw error;

      const leadById = new Map(result.leads.map((lead) => [lead.id, lead]));
      setEvents((data || []).map((event: any) => ({ ...event, lead: leadById.get(event.lead_id) })));
    } catch (err: any) {
      toast.error(`Erro ao carregar conversas: ${err?.message || 'erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  }, [citySlug]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  if (loading) return <LoadingBlock label="Carregando conversas e eventos..." />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-950">Conversas e handoff</h3>
          <p className="text-sm font-medium text-slate-500">Linha do tempo comercial: mensagens, mudancas de etapa, opt-out e eventos do robo.</p>
        </div>
        <Button variant="outline" onClick={loadEvents} className="font-bold">
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {events.length === 0 ? (
        <EmptyState
          title="Ainda nao ha conversas"
          description="Quando WhatsApp, robo ou humano registrarem eventos, eles aparecem aqui."
        />
      ) : (
        <div className="grid gap-3">
          {events.map((event) => (
            <Card key={event.id} className="rounded-xl border-slate-200 bg-white shadow-sm">
              <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="bg-slate-50 font-bold text-slate-700">{event.actor_type}</Badge>
                    <Badge variant="outline" className="bg-indigo-50 font-bold text-indigo-700">{event.event_type}</Badge>
                    {event.event_type === 'WhatsAppMessageReceived' && (
                      <Badge variant="outline" className={`border-transparent font-bold ${responseKindClassName(getEventClassification(event).kind)}`}>
                        {responseKindLabel[getEventClassification(event).kind]}
                      </Badge>
                    )}
                    <span className="text-xs font-semibold text-slate-400">{formatDate(event.created_at)}</span>
                  </div>
                  <h4 className="mt-2 text-sm font-black text-slate-950">{event.lead?.restaurants?.name || 'Lead sem restaurante'}</h4>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                    {event.payload?.text || event.payload?.message || event.payload?.reason || JSON.stringify(event.payload || {})}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 font-bold"
                  onClick={() => {
                    const profileUrl = event.lead?.public_profile_url || (event.lead?.restaurant_id ? `/restaurant/${event.lead.restaurant_id}` : '');
                    if (!profileUrl) {
                      toast.error('Nao encontrei o perfil desse lead.');
                      return;
                    }
                    window.open(profileUrl, '_blank');
                  }}
                >
                  Abrir lead
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function CrmRobotQueuePanel({ citySlug }: { citySlug?: string }) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [legacyQueue, setLegacyQueue] = useState(false);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('crm_robot_jobs')
        .select(`
          id,
          lead_id,
          restaurant_id,
          job_type,
          status,
          provider,
          channel,
          scheduled_at,
          attempts,
          max_attempts,
          last_error,
          created_at,
          commercial_leads (
            id,
            pipeline_stage,
            restaurants (id, name, city, state, neighborhood)
          )
        `)
        .order('scheduled_at', { ascending: true })
        .limit(100);

      if (citySlug) {
        const scope = await resolveCityScope(citySlug);
        if (scope.restaurantIds && scope.restaurantIds.length === 0) {
          setJobs([]);
          return;
        }
        if (scope.restaurantIds) query = query.in('restaurant_id', scope.restaurantIds);
      }

      const { data, error } = await query;
      if (error && isSchemaMissingError(error)) {
        const result = await fetchCrmLeads(citySlug);
        const leadIds = result.leads.map((lead) => lead.id);
        if (leadIds.length === 0) {
          setJobs([]);
          setLegacyQueue(true);
          return;
        }

        const { data: events, error: eventError } = await supabase
          .from('commercial_events')
          .select('id, lead_id, event_type, actor_type, payload, created_at')
          .in('lead_id', leadIds)
          .eq('event_type', 'RobotJobRequested')
          .order('created_at', { ascending: false })
          .limit(100);
        if (eventError) throw eventError;

        const leadById = new Map(result.leads.map((lead) => [lead.id, lead]));
        setJobs((events || []).map((event: any) => {
          const lead = leadById.get(event.lead_id);
          return {
            id: event.id,
            lead_id: event.lead_id,
            restaurant_id: lead?.restaurant_id || event.payload?.restaurant_id,
            job_type: 'first_contact',
            status: 'pending_event',
            provider: 'crm_legado',
            channel: 'whatsapp',
            scheduled_at: event.created_at,
            attempts: 0,
            max_attempts: 1,
            fallback_event: true,
            commercial_leads: {
              id: lead?.id,
              pipeline_stage: lead?.pipeline_stage,
              restaurants: lead?.restaurants,
            },
          };
        }));
        setLegacyQueue(true);
        return;
      }
      if (error) throw error;
      setJobs(data || []);
      setLegacyQueue(false);
    } catch (err: any) {
      toast.error(`Erro ao carregar fila: ${err?.message || 'erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  }, [citySlug]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const updateJobStatus = async (jobId: string, status: string) => {
    try {
      const patch: any = { status };
      if (status === 'running') patch.started_at = new Date().toISOString();
      if (['succeeded', 'failed', 'cancelled', 'needs_human'].includes(status)) patch.finished_at = new Date().toISOString();
      const { error } = await supabase.from('crm_robot_jobs').update(patch).eq('id', jobId);
      if (error) throw error;
      await loadJobs();
    } catch (err: any) {
      toast.error(`Erro ao atualizar job: ${err?.message || 'erro desconhecido'}`);
    }
  };

  if (loading) return <LoadingBlock label="Carregando fila de robos..." />;

  const pending = jobs.filter((job) => ['pending', 'scheduled', 'retrying'].includes(job.status)).length;
  const running = jobs.filter((job) => ['running', 'waiting_external'].includes(job.status)).length;
  const human = jobs.filter((job) => job.status === 'needs_human').length;
  const failed = jobs.filter((job) => job.status === 'failed').length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-950">Fila de robos</h3>
          <p className="text-sm font-medium text-slate-500">
            {legacyQueue
              ? 'Modo legado: exibindo pedidos de contato gravados em eventos comerciais.'
              : 'Jobs para Geelark/WhatsApp/IA consumirem com retry, erro e handoff.'}
          </p>
        </div>
        <Button variant="outline" onClick={loadJobs} className="font-bold">
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Pendentes" value={pending} icon={<Clock className="h-5 w-5" />} color="bg-slate-50 text-slate-700" />
        <MetricCard label="Rodando" value={running} icon={<Play className="h-5 w-5" />} color="bg-indigo-50 text-indigo-700" />
        <MetricCard label="Humano" value={human} icon={<ShieldAlert className="h-5 w-5" />} color="bg-amber-50 text-amber-700" />
        <MetricCard label="Falhas" value={failed} icon={<AlertCircle className="h-5 w-5" />} color="bg-rose-50 text-rose-700" />
      </div>

      <div className="grid gap-3">
        {jobs.length === 0 ? (
          <EmptyState
            title="Nenhum job de robo na fila"
            description="Use Chamar proximos na aba Hoje ou Leads para criar os primeiros jobs."
          />
        ) : jobs.map((job) => {
          const restaurant = job.commercial_leads?.restaurants;
          return (
            <Card key={job.id} className="rounded-xl border-slate-200 bg-white shadow-sm">
              <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="bg-indigo-50 font-bold text-indigo-700">{job.job_type}</Badge>
                    <Badge variant="outline" className="bg-slate-50 font-bold text-slate-700">{job.status}</Badge>
                    <Badge variant="outline" className="bg-slate-50 font-bold text-slate-700">{job.provider}</Badge>
                  </div>
                  <h4 className="mt-2 text-sm font-black text-slate-950">{restaurant?.name || job.restaurant_id}</h4>
                  <p className="text-xs font-semibold text-slate-500">
                    {[restaurant?.neighborhood, restaurant?.city, restaurant?.state].filter(Boolean).join(' / ') || 'Sem cidade'} · tentativa {job.attempts}/{job.max_attempts}
                  </p>
                  {job.last_error && <p className="mt-1 text-xs font-semibold text-rose-600">{job.last_error}</p>}
                </div>
                {job.fallback_event ? (
                  <Badge variant="outline" className="shrink-0 bg-amber-50 font-bold text-amber-700">
                    Fila real pendente
                  </Badge>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => updateJobStatus(job.id, 'running')} className="font-bold">Rodando</Button>
                    <Button variant="outline" size="sm" onClick={() => updateJobStatus(job.id, 'succeeded')} className="font-bold text-emerald-700">Sucesso</Button>
                    <Button variant="outline" size="sm" onClick={() => updateJobStatus(job.id, 'needs_human')} className="font-bold text-amber-700">Humano</Button>
                    <Button variant="outline" size="sm" onClick={() => updateJobStatus(job.id, 'cancelled')} className="font-bold text-rose-700">Cancelar</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function CrmTrainingPanel() {
  const [agents, setAgents] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [draftPrompt, setDraftPrompt] = useState('');
  const [simulation, setSimulation] = useState('O dono respondeu: "Ja tenho iFood, por que preciso disso?"');

  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId);

  const loadTraining = useCallback(async () => {
    const [{ data: agentRows }, { data: ruleRows }] = await Promise.all([
      supabase.from('crm_ai_agents').select('*').order('created_at', { ascending: true }),
      supabase.from('crm_business_rules').select('*').order('created_at', { ascending: true }),
    ]);
    setAgents(agentRows || []);
    setRules(ruleRows || []);
    if (!selectedAgentId && agentRows?.[0]) {
      setSelectedAgentId(agentRows[0].id);
      setDraftPrompt(agentRows[0].system_prompt || '');
    }
  }, [selectedAgentId]);

  useEffect(() => {
    loadTraining();
  }, [loadTraining]);

  useEffect(() => {
    if (selectedAgent) setDraftPrompt(selectedAgent.system_prompt || '');
  }, [selectedAgent]);

  const savePrompt = async () => {
    if (!selectedAgentId) {
      toast.error('Crie ou selecione um agente antes de salvar.');
      return;
    }
    const { error } = await supabase
      .from('crm_ai_agents')
      .update({ system_prompt: draftPrompt, updated_at: new Date().toISOString() })
      .eq('id', selectedAgentId);
    if (error) {
      toast.error(`Erro ao salvar prompt: ${error.message}`);
      return;
    }
    toast.success('Prompt do robo salvo.');
    loadTraining();
  };

  const createDefaultAgent = async () => {
    const existing = agents.find((agent) => String(agent.name || '').toLowerCase() === 'sdr ia pos-publicacao');
    if (existing) {
      setSelectedAgentId(existing.id);
      setDraftPrompt(existing.system_prompt || DEFAULT_SDR_PROMPT);
      toast.info('SDR padrao ja existe; selecionei ele para edicao.');
      return;
    }

    const { error } = await supabase.from('crm_ai_agents').insert({
      name: 'SDR IA Pos-publicacao',
      tone: 'Consultivo',
      system_prompt: DEFAULT_SDR_PROMPT,
    }).select('id').single();
    if (error) {
      toast.error(`Erro ao criar agente: ${error.message}`);
      return;
    }
    toast.success('Agente SDR criado.');
    loadTraining();
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-5">
        {ROBOT_ROLES.map((role) => (
          <Card key={role.name} className="rounded-xl border-slate-200 bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Bot className="h-5 w-5" />
              </div>
              <p className="text-sm font-black text-slate-950">{role.name}</p>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">{role.goal}</p>
              <p className="mt-3 text-[11px] font-bold leading-relaxed text-amber-700">{role.risk}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-xl border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-black">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              Prompt e comportamento do robo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={selectedAgentId}
                onChange={(event) => setSelectedAgentId(event.target.value)}
                className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
              >
                {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
              </select>
              <Button variant="outline" onClick={createDefaultAgent} className="font-bold">
                Criar SDR padrao
              </Button>
            </div>
            <Textarea
              value={draftPrompt}
              onChange={(event) => setDraftPrompt(event.target.value)}
              className="min-h-[300px] font-mono text-xs leading-relaxed"
              placeholder="Prompt do robo..."
            />
            <Button onClick={savePrompt} className="bg-indigo-600 font-bold text-white hover:bg-indigo-700">
              Salvar treinamento
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-xl border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-black">Simulador de objecao</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea value={simulation} onChange={(event) => setSimulation(event.target.value)} className="min-h-[100px] text-sm" />
              <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-xs font-semibold leading-relaxed text-indigo-900">
                Use este campo antes de liberar escala. O criterio: resposta curta, sem promessa falsa, sem insistencia e com handoff quando for sensivel.
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-black">Biblioteca de objecoes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {OBJECTIONS.map((item) => (
                <div key={item.title} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-slate-950">{item.title}</p>
                    <Badge variant="outline" className={item.handoff ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}>
                      {item.handoff ? 'Humano' : 'IA pode responder'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">{item.answer}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="rounded-xl border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-black">Regras comerciais ativas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {rules.length === 0 ? (
            <p className="text-sm font-semibold text-slate-500">Nenhuma regra cadastrada.</p>
          ) : rules.map((rule) => (
            <div key={rule.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-slate-950">{rule.rule_name}</p>
                <Badge variant="outline" className={rule.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}>
                  {rule.is_active ? 'Ativa' : 'Inativa'}
                </Badge>
              </div>
              <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">{rule.rule_content}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function CrmSettingsPanel() {
  const [settings, setSettings] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('crm_settings').select('*').eq('id', 1).single().then(({ data }) => {
      setSettings(data || { id: 1 });
    });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('crm_settings').upsert({
        id: 1,
        zapi_instance_id: settings.zapi_instance_id || '',
        zapi_instance_token: settings.zapi_instance_token || '',
        zapi_client_token: settings.zapi_client_token || '',
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success('Configuracoes de WhatsApp salvas.');
    } catch (err: any) {
      toast.error(`Erro ao salvar: ${err?.message || 'erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <Card className="rounded-xl border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-black">
            <Wifi className="h-5 w-5 text-indigo-600" />
            WhatsApp / Z-API / Geelark
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={settings.zapi_instance_id || ''}
            onChange={(event) => setSettings((prev: any) => ({ ...prev, zapi_instance_id: event.target.value }))}
            placeholder="Instance ID"
          />
          <Input
            value={settings.zapi_instance_token || ''}
            onChange={(event) => setSettings((prev: any) => ({ ...prev, zapi_instance_token: event.target.value }))}
            placeholder="Instance token"
            type="password"
          />
          <Input
            value={settings.zapi_client_token || ''}
            onChange={(event) => setSettings((prev: any) => ({ ...prev, zapi_client_token: event.target.value }))}
            placeholder="Client token"
            type="password"
          />
          <div className="grid gap-2 sm:grid-cols-3">
            <ProviderHealth title="Geelark" status="A conectar" />
            <ProviderHealth title="Z-API" status={settings.zapi_instance_id ? 'Configurado' : 'Pendente'} />
            <ProviderHealth title="Webhook" status="Supabase" />
          </div>
          <Button onClick={save} disabled={saving} className="bg-indigo-600 font-bold text-white hover:bg-indigo-700">
            {saving ? 'Salvando...' : 'Salvar integracao'}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-amber-200 bg-amber-50 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-black text-amber-900">
            <ShieldAlert className="h-5 w-5" />
            Guardrails de automacao
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm font-semibold leading-relaxed text-amber-900 md:grid-cols-2">
          <Guardrail text="Cadencia baixa por numero e pausa automatica se houver muita rejeicao." />
          <Guardrail text="Opt-out imediato para nao quero, pare, remover ou equivalentes." />
          <Guardrail text="Handoff humano para preco, contrato, reclamacao, autorizacao ou suspeita de golpe." />
          <Guardrail text="O robo so cita dados existentes: perfil, cardapio, bairro, link publico e beneficios reais." />
        </CardContent>
      </Card>
    </div>
  );
}

function ProviderHealth({ title, status }: { title: string; status: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{title}</p>
      <p className="mt-1 text-xs font-black text-slate-900">{status}</p>
    </div>
  );
}

function Guardrail({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-white/70 p-3">
      {text}
    </div>
  );
}

export function CrmAdminTabs({ citySlug }: { citySlug?: string }) {
  const [activeTab, setActiveTab] = useState('today');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0 space-y-6">
      <div className="max-w-full overflow-x-auto pb-1">
      <TabsList className="h-auto min-w-max flex-wrap justify-start rounded-xl border border-slate-200 bg-white p-1">
        <TabsTrigger value="today" className="font-bold"><Sparkles className="mr-2 h-4 w-4" />Hoje</TabsTrigger>
        <TabsTrigger value="board" className="font-bold"><SlidersHorizontal className="mr-2 h-4 w-4" />Leads</TabsTrigger>
        <TabsTrigger value="inbox" className="font-bold"><Inbox className="mr-2 h-4 w-4" />Conversas</TabsTrigger>
        <TabsTrigger value="robots" className="font-bold"><Bot className="mr-2 h-4 w-4" />Fila de robos</TabsTrigger>
        <TabsTrigger value="training" className="font-bold"><BookOpen className="mr-2 h-4 w-4" />Treinamento IA</TabsTrigger>
        <TabsTrigger value="settings" className="font-bold"><Wifi className="mr-2 h-4 w-4" />WhatsApp</TabsTrigger>
      </TabsList>
      </div>
      <TabsContent value="today"><CrmTodayPanel citySlug={citySlug} setActiveTab={setActiveTab} /></TabsContent>
      <TabsContent value="board"><CrmWorkspace citySlug={citySlug} setActiveTab={setActiveTab} showHeader /></TabsContent>
      <TabsContent value="inbox"><CrmInboxPanel citySlug={citySlug} /></TabsContent>
      <TabsContent value="robots"><CrmRobotQueuePanel citySlug={citySlug} /></TabsContent>
      <TabsContent value="training"><CrmTrainingPanel /></TabsContent>
      <TabsContent value="settings"><CrmSettingsPanel /></TabsContent>
    </Tabs>
  );
}

const DEFAULT_SDR_PROMPT = `Voce e o SDR IA pos-publicacao do FilterFood.

Contexto: o restaurante ja foi validado e tem um perfil publicado no FilterFood. Seu trabalho e fazer um primeiro contato humano, curto e consultivo, mostrando que o perfil ja existe e pedindo para falar com o responsavel.

Regras:
- Identifique-se como equipe FilterFood.
- Nao finja ser cliente.
- Nao prometa aumento de faturamento.
- Nao invente dados de busca, preco, cardapio ou trafego.
- Use no maximo 2 paragrafos curtos.
- Se a pessoa pedir para parar, responda educadamente e marque opt-out.
- Se houver duvida sobre preco, contrato, reclamacao ou autorizacao, peca handoff humano.

Primeira mensagem sugerida:
"Oi, pessoal do {restaurante}, tudo bem? Aqui e da equipe FilterFood. A gente validou e publicou uma previa do perfil de voces no app, com base nas informacoes publicas encontradas.

Queria mostrar como ficou e confirmar com quem posso falar para voces assumirem/ajustarem o perfil. Pode ser?"`;

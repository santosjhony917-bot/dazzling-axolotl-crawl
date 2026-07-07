import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Loader2, Sparkles, Check, AlertCircle, MapPin, Instagram, Eye, Edit, Terminal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { RestaurantDetailsDialog } from '@/components/admin/RestaurantDetailsDialog';
import { geocodeAddress } from '@/services/geocoding';
import { normalizeRestaurantDisplayName } from '@/utils/formatters';

type ValidationTab = 'pendentes' | 'prontos' | 'sem_cardapio' | 'revisao' | 'rejeitados' | 'importados';
type LeadTriageKey =
  | 'likely_food_service'
  | 'likely_reject_service'
  | 'likely_reject_retail'
  | 'bakery_or_confectionery_needs_menu'
  | 'mixed_needs_maps_menu'
  | 'buffet_catering_needs_menu'
  | 'venue_or_event_needs_menu'
  | 'public_place_or_map_point'
  | 'maps_result_noise'
  | 'generic_low_signal'
  | 'unknown_need_maps_ai'
  | 'maps_status_closed';

type LeadTriage = {
  key: LeadTriageKey;
  label: string;
  action: string;
  reason: string;
  confidence: number;
  className: string;
};

type ContactCandidate = {
  phone: string;
  normalized_phone: string;
  kind: 'whatsapp' | 'mobile' | 'phone' | 'tollfree';
  source: string;
  source_url?: string;
  label?: string;
  whatsapp_url?: string;
  confidence: number;
  score: number;
  raw?: string;
  found_at: string;
};

type ExtensionTelemetryEvent = {
  type?: string;
  tabId?: number;
  windowId?: number;
  url?: string;
  title?: string;
  status?: string;
  reason?: string;
  ts?: string;
  receivedAt?: string;
};

type TrainingValidateRequest = number | {
  limit?: number;
  search?: string;
  force?: boolean;
  includePublished?: boolean;
  ids?: string[];
};

type QaStats = {
  pendentes: number;
  prontos: number;
  sem_cardapio: number;
  revisao: number;
  rejeitados: number;
  importados: number;
};

const EMPTY_QA_STATS: QaStats = {
  pendentes: 0,
  prontos: 0,
  sem_cardapio: 0,
  revisao: 0,
  rejeitados: 0,
  importados: 0,
};

const MENU_REVIEW_STATUSES = ['manual_required', 'blocked', 'failed', 'invalid_source'];
const MENU_RECOLLECT_STATUSES = ['needs_recollection'];
const MENU_NO_CARDAPIO_STATUSES = ['not_found', 'unavailable'];
const MENU_PENDING_EXCLUDED_STATUSES = [
  'found',
  ...MENU_REVIEW_STATUSES,
  ...MENU_RECOLLECT_STATUSES,
  ...MENU_NO_CARDAPIO_STATUSES,
];
const applyPendingMenuStatusFilter = (query: any) => (
  query.or(`menu_status.is.null,menu_status.not.in.(${MENU_PENDING_EXCLUDED_STATUSES.join(',')})`)
);
const MIN_PUBLIC_GALLERY_IMAGES = 3;
const MAX_PUBLIC_GALLERY_IMAGES = 8;
const AUTO_VALIDATE_BATCH_LIMIT = 20;
const TRAINING_VALIDATE_BATCH_LIMIT = 10;
const VALIDATION_FETCH_BATCH_SIZE = 20;
const VALIDATION_INITIAL_ROW_LIMIT = VALIDATION_FETCH_BATCH_SIZE;
const AUTO_VALIDATE_ROW_COOLDOWN_MS = 1500;
const APPROVE_BATCH_LIMIT = 20;
const FIXED_EXTENSION_ID = 'kehbedmdplkodjgfiohgnebicblmhghe';
const REQUIRED_EXTENSION_VERSION = '1.10.53';
const CHROME_EXTENSION_ID_RE = /^[a-p]{32}$/;
const normalizeExtensionTargetId = (value?: string | null) => {
  const candidate = String(value || '').trim();
  if (candidate === 'content-bridge') return FIXED_EXTENSION_ID;
  return CHROME_EXTENSION_ID_RE.test(candidate) ? candidate : FIXED_EXTENSION_ID;
};
const VALIDATION_LIST_SELECT = [
  'id',
  'name',
  'category',
  'description',
  'address',
  'number',
  'neighborhood',
  'city',
  'state',
  'cep',
  'latitude',
  'longitude',
  'phone',
  'whatsapp_url',
  'contact_candidates',
  'primary_contact_source',
  'contacts_last_checked_at',
  'instagram',
  'social_networks',
  'google_maps_url',
  'google_place_id',
  'google_maps_name',
  'other_url',
  'external_url',
  'ifood_url',
  'visit_notes',
  'menu_status',
  'menu_status_reason',
  'ai_validated',
  'is_deleted',
  'is_published',
  'image_url',
  'cover_image_url',
  'opening_hours',
  'created_at',
].join(',');

const compareVersions = (current = '', required = '') => {
  const currentParts = String(current || '').split('.').map(part => Number(part) || 0);
  const requiredParts = String(required || '').split('.').map(part => Number(part) || 0);
  const length = Math.max(currentParts.length, requiredParts.length);
  for (let index = 0; index < length; index += 1) {
    const currentValue = currentParts[index] || 0;
    const requiredValue = requiredParts[index] || 0;
    if (currentValue > requiredValue) return 1;
    if (currentValue < requiredValue) return -1;
  }
  return 0;
};

const imageDataUrlToBlob = (dataUrl: string): { blob: Blob; contentType: string; extension: string } | null => {
  const match = String(dataUrl || '').match(/^data:(image\/(?:png|jpe?g|webp|gif));base64,(.+)$/i);
  if (!match) return null;

  const contentType = match[1].toLowerCase();
  const byteString = atob(match[2]);
  const buffer = new ArrayBuffer(byteString.length);
  const view = new Uint8Array(buffer);
  for (let index = 0; index < byteString.length; index += 1) {
    view[index] = byteString.charCodeAt(index);
  }

  const extension = contentType.includes('png')
    ? 'png'
    : contentType.includes('webp')
      ? 'webp'
      : contentType.includes('gif')
        ? 'gif'
        : 'jpg';

  return {
    blob: new Blob([buffer], { type: contentType }),
    contentType,
    extension,
  };
};

const isCompatibleExtensionPing = (response: any) => {
  if (!response?.success) return false;
  const versionOk = compareVersions(response.version || '0.0.0', REQUIRED_EXTENSION_VERSION) >= 0;
  const capabilities = response.capabilities || {};
  return versionOk && capabilities.nativePlatformAdapters !== false;
};

const isLikelyLinkHubUrl = (value: string) => {
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/^www\./, '');
    return [
      'msha.ke',
      'linktr.ee',
      'linktree.com',
      'bio.link',
      'beacons.ai',
      'lnk.bio',
      'taplink.cc',
      'campsite.bio',
      'instabio.cc',
      'solo.to',
      'linkbio.co',
      'allmylinks.com',
    ].some(domain => host === domain || host.endsWith('.' + domain));
  } catch (_) {
    return false;
  }
};

const isBareGenericMenuPlatformRoot = (value: string) => {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const rootPath = !parsed.pathname || parsed.pathname === '/' || parsed.pathname.replace(/\/+$/g, '') === '';
    if (!rootPath || parsed.search) return false;
    return (
      host === 'cardapioweb.com' ||
      host === 'app.cardapioweb.com' ||
      host === 'livemenu.app' ||
      host === 'pedido.anota.ai' ||
      host === 'anota.ai' ||
      host === 'goomer.app' ||
      host === 'ola.click' ||
      host === 'olaclick.com' ||
      host === 'saipos.com' ||
      host === 'instadelivery.com.br'
    );
  } catch (_) {
    return false;
  }
};

const sanitizeGoogleMapsAddressInput = (fullAddress: string) => {
  let value = String(fullAddress || '')
    .replace(/[\uE000-\uF8FF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Alguns botÃµes do Google Maps entram no textContent junto com o endereÃ§o:
  // "Zap (81)98871 - 6083R. Paulo de Frontin, 60..."
  // O endereÃ§o publicÃ¡vel deve comeÃ§ar no primeiro marcador real de logradouro.
  const streetMarker = value.match(/(?:^|[^A-Za-z0-9])(R\.|Rua|Av\.|Avenida|Travessa|Tv\.|Rod\.|Rodovia|PraÃ§a|Praca|Alameda|Estrada)\s+/i);
  if (streetMarker && streetMarker.index !== undefined) {
    const markerOffset = streetMarker[0].search(/(R\.|Rua|Av\.|Avenida|Travessa|Tv\.|Rod\.|Rodovia|PraÃ§a|Praca|Alameda|Estrada)\s+/i);
    const markerIndex = streetMarker.index + Math.max(markerOffset, 0);
    if (markerIndex > 0) value = value.slice(markerIndex).trim();
  }

  value = value
    .replace(/^(?:zap|whats(?:app)?|telefone|tel\.?|ligar|chamar|pedido|pedir)\s*[:\-]?\s*/i, '')
    .replace(/^\(?\d{2}\)?\s*\d{4,5}[-\s]?\d{4}\s*/i, '')
    .replace(/\b(?:Zap|WhatsApp|Telefone|Tel\.?|Ligar)\s*\(?\d{2}\)?\s*\d{4,5}[-\s]?\d{4}\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return value;
};

const parseGoogleMapsAddress = (fullAddress: string) => {
  let street = ''; let number = ''; let neighborhood = ''; let city = ''; let state = ''; let cep = '';
  if (!fullAddress) return { street, number, neighborhood, city, state, cep };
  let working = sanitizeGoogleMapsAddressInput(fullAddress);
  const cepMatch = working.match(/\b(\d{5}-\d{3})\b/) || working.match(/\b(\d{8})\b/);
  if (cepMatch) { cep = cepMatch[1]; working = working.replace(cepMatch[0], '').trim(); }
  working = working.replace(/[\s,]+$/, '').replace(/^[\s,]+/, '').trim();
  const stateMatch = working.match(/[\s,-]\s*([A-Z]{2})\s*$/);
  if (stateMatch) { state = stateMatch[1]; working = working.substring(0, working.lastIndexOf(stateMatch[0])).trim(); }
  working = working.replace(/[\s,-]+$/, '').replace(/^[\s,-]+/, '').trim();
  const parts = working.split(',').map(p => p.trim());
  if (parts.length >= 3) {
    street = parts[0];
    const secondPart = parts[1];
    const hyphenIdx = secondPart.indexOf(' - ');
    if (hyphenIdx !== -1) {
      const numPart = secondPart.substring(0, hyphenIdx).trim();
      const bairroPart = secondPart.substring(hyphenIdx + 3).trim();
      if (/\d/.test(numPart) || numPart.toLowerCase() === 's/n') { number = numPart; neighborhood = bairroPart; }
      else { street += ', ' + secondPart; }
    } else {
      if (/^\d+/.test(secondPart) || secondPart.toLowerCase() === 's/n') number = secondPart;
      else neighborhood = secondPart;
    }
    if (parts.length >= 3) {
      const thirdPart = parts.slice(2).join(', ').trim();
      const thirdHyphen = thirdPart.indexOf(' - ');
      if (thirdHyphen !== -1 && !neighborhood) { neighborhood = thirdPart.substring(0, thirdHyphen).trim(); city = thirdPart.substring(thirdHyphen + 3).trim(); }
      else city = thirdPart;
    }
  } else if (parts.length === 2) {
    street = parts[0];
    const secondPart = parts[1];
    const hyphenIdx = secondPart.indexOf(' - ');
    if (hyphenIdx !== -1) { neighborhood = secondPart.substring(0, hyphenIdx).trim(); city = secondPart.substring(hyphenIdx + 3).trim(); }
    else city = secondPart;
    const numInStreet = street.match(/,\s*(\d+[A-Za-z]?)\s*$/);
    if (numInStreet) { number = numInStreet[1]; street = street.substring(0, street.lastIndexOf(numInStreet[0])).trim(); }
  } else {
    const hyphenIdx = working.indexOf(' - ');
    if (hyphenIdx !== -1) { street = working.substring(0, hyphenIdx).trim(); neighborhood = working.substring(hyphenIdx + 3).trim(); }
    else street = working;
  }
  street = street.replace(/^[\s,-]+|[\s,-]+$/g, '').trim(); number = number.replace(/^[\s,-]+|[\s,-]+$/g, '').trim();
  neighborhood = neighborhood.replace(/^[\s,-]+|[\s,-]+$/g, '').trim(); city = city.replace(/^[\s,-]+|[\s,-]+$/g, '').trim();
  return { street, number, neighborhood, city, state, cep };
};

const extractCoordsFromUrl = (url: string) => {
  if (!url) return null;
  const match1 = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (match1) return { lat: parseFloat(match1[1]), lng: parseFloat(match1[2]) };
  const match2 = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match2) return { lat: parseFloat(match2[1]), lng: parseFloat(match2[2]) };
  const match3 = url.match(/query=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match3) return { lat: parseFloat(match3[1]), lng: parseFloat(match3[2]) };
  return null;
};

const isGoogleMapsUrl = (value: string) => {
  if (!value || !/^https?:\/\//i.test(value)) return false;
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    const pathAndQuery = `${parsed.pathname}${parsed.search}`.toLowerCase();
    return (
      host === 'maps.app.goo.gl' ||
      host === 'goo.gl' ||
      host.endsWith('google.com') && (
        pathAndQuery.includes('/maps') ||
        pathAndQuery.includes('place_id:') ||
        pathAndQuery.includes('query=') ||
        pathAndQuery.includes('search/')
      )
    );
  } catch (_) {
    return false;
  }
};

const normalizeDedupeKey = (value: string) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const safeDecodeUrl = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch (_) {
    return value;
  }
};

const extractMapsCanonicalKey = (value: string) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const decoded = safeDecodeUrl(raw);
  const entityId =
    decoded.match(/!1s([^!/?&#]+)/i)?.[1] ||
    decoded.match(/\/place_id:([^/?&#]+)/i)?.[1] ||
    decoded.match(/[?&]query=place_id:([^&]+)/i)?.[1];
  if (entityId) return `maps:${normalizeDedupeKey(entityId)}`;

  const placeSlug = decoded.match(/\/maps\/place\/([^/@?]+)/i)?.[1] || '';
  const coords = decoded.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i)
    || decoded.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
  if (placeSlug && coords) {
    return `maps:${normalizeDedupeKey(placeSlug)}:${Number(coords[1]).toFixed(5)}:${Number(coords[2]).toFixed(5)}`;
  }

  return `url:${normalizeDedupeKey(decoded.split('?')[0] || decoded)}`;
};

const extractGoogleMapsUrlFromRestaurant = (restaurant: any) => {
  const directCandidates = [
    restaurant?.googleMapsUrl,
    restaurant?.google_maps_url,
    restaurant?.maps_url,
    restaurant?.map_url,
    restaurant?.place_url,
    restaurant?.google_url,
    restaurant?.link_google_maps,
    restaurant?.external_url,
    restaurant?.other_url,
    restaurant?.ifood_url
  ].filter(Boolean).map(String);

  for (const candidate of directCandidates) {
    if (isGoogleMapsUrl(candidate)) return candidate;
  }

  const notes = String(restaurant?.visit_notes || '');
  const matches = notes.match(/https?:\/\/[^\s\n\r"'<>]+/gi) || [];
  const found = matches.find(isGoogleMapsUrl);
  if (found) return found;

  const labeled = notes.match(/Google Maps:\s*(https?:\/\/[^\s\n\r"'<>]+)/i);
  if (labeled?.[1] && isGoogleMapsUrl(labeled[1])) return labeled[1];

  return '';
};

const normalizeContactDigits = (value: any) => String(value || '').replace(/\D/g, '');

const decodeWrappedUrl = (raw: string) => {
  let current = String(raw || '').trim();
  try {
    for (let i = 0; i < 4; i += 1) {
      const parsed = new URL(current);
      const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
      const wrapped = parsed.searchParams.get('u') || parsed.searchParams.get('url') || parsed.searchParams.get('q') || parsed.searchParams.get('redirect_uri');
      if (!wrapped || !/(^|\.)google\.|instagram\.com|facebook\.com|l\.instagram\.com/i.test(host)) break;
      current = decodeURIComponent(wrapped);
    }
  } catch (_) {}
  return current;
};

const normalizeBrazilPhoneDigits = (value: any) => {
  let digits = normalizeContactDigits(value);
  if (!digits) return '';
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0800')) return digits.slice(0, 11);
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
};

const phoneKindFromDigits = (digits: string, explicitWhatsapp = false): ContactCandidate['kind'] => {
  const normalized = normalizeBrazilPhoneDigits(digits);
  if (normalized.startsWith('0800')) return 'tollfree';
  if (explicitWhatsapp) return 'whatsapp';
  const national = normalized.startsWith('55') ? normalized.slice(2) : normalized;
  if (national.length === 11 && national[2] === '9') return 'mobile';
  return 'phone';
};

const formatPhoneDisplay = (digits: string) => {
  const normalized = normalizeBrazilPhoneDigits(digits);
  if (!normalized) return '';
  if (normalized.startsWith('0800')) {
    return normalized.replace(/^(\d{4})(\d{3})(\d{4}).*/, '$1 $2 $3');
  }
  const national = normalized.startsWith('55') ? normalized.slice(2) : normalized;
  if (national.length === 11) return `+55 (${national.slice(0, 2)}) ${national.slice(2, 7)}-${national.slice(7)}`;
  if (national.length === 10) return `+55 (${national.slice(0, 2)}) ${national.slice(2, 6)}-${national.slice(6)}`;
  return normalized.startsWith('55') ? `+${normalized}` : normalized;
};

const whatsappUrlFromDigits = (digits: string) => {
  const normalized = normalizeBrazilPhoneDigits(digits);
  if (!normalized || normalized.startsWith('0800')) return '';
  return `https://wa.me/${normalized}`;
};

const extractWhatsappDigitsFromUrl = (raw: string) => {
  const value = decodeWrappedUrl(String(raw || ''));
  if (!value) return '';
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    const phoneParam = parsed.searchParams.get('phone') || parsed.searchParams.get('to') || parsed.searchParams.get('numero');
    if (/whatsapp\.com$|api\.whatsapp\.com$|web\.whatsapp\.com$/i.test(host) && phoneParam) {
      return normalizeBrazilPhoneDigits(phoneParam);
    }
    if (host === 'wa.me' || host.endsWith('.wa.me')) {
      const pathDigits = normalizeBrazilPhoneDigits(parsed.pathname.split('/').filter(Boolean).find(part => /\d{8,}/.test(part)) || '');
      if (pathDigits) return pathDigits;
    }
  } catch (_) {
    const phoneMatch = value.match(/(?:phone|to|numero)=([^&#]+)/i);
    if (phoneMatch) return normalizeBrazilPhoneDigits(phoneMatch[1]);
    if (/wa\.me|whatsapp/i.test(value)) {
      const digits = normalizeBrazilPhoneDigits(value);
      if (digits.length >= 10) return digits;
    }
  }
  return '';
};

const isLikelyNonContactTechnicalText = (value: any, label = '', source = '') => {
  const raw = String(value || '').trim();
  const normalizedLabel = String(label || '').toLowerCase();
  const normalizedSource = String(source || '').toLowerCase();
  if (!raw) return false;

  const normalizedContext = `${normalizedLabel} ${normalizedSource}`;
  const hasExplicitContactMarker = /\b(?:wa\.me|whatsapp|api\.whatsapp|web\.whatsapp|tel:|phone=|telefone=|telefone|celular|contato|whats|zap|wpp|numero=|nÃºmero=|ligue|pedidos? pelo whats|pe[Ã§c]a pelo whats)\b/i.test(raw)
    || /\b(?:phone|telefone|whatsapp|whats|zap|wpp|contato)\b/i.test(normalizedContext);

  if (/(^|[_-])(geom|geometry|coordinates?|latitude|longitude|lat|lng|place[_-]?id|cid|hex|hash|cache|stored|timestamp|expires|ttl|token|secret|key|session|rayid|ray[_-]?id)($|[_-])/i.test(normalizedLabel) && !hasExplicitContactMarker) {
    return true;
  }

  const isRawBlobLabel = /(^|[_-])(raw|rawtext|raw_text|visualrawtext|visual_raw_text|html|json|payload|response|debug|cache|cachedata|cached|textblocks?|body|document|dom|snapshot|ocr|screenshot)($|[_-])/i.test(normalizedLabel);
  const isRawBlobSource = /\b(rawtext|visualrawtext|raw_text|visual_raw_text|html|json|payload|response|debug|cache|cached|ocr|screenshot|menu_source_validation|native_menu|adapter_raw)\b/i.test(normalizedSource);

  // Textos brutos de API/cache/HTML tÃªm IDs, timestamps e preÃ§os que parecem telefone.
  // SÃ³ sÃ£o aceitos como evidÃªncia se o prÃ³prio texto tiver marcador explÃ­cito de contato.
  if ((isRawBlobLabel || isRawBlobSource) && !hasExplicitContactMarker) return true;
  if (isRawBlobLabel && /^[\[{]/.test(raw) && !/\b(?:whatsapp|telefone|phone|contact|contato|wa\.me|tel:)\b/i.test(raw)) return true;

  // PÃ¡ginas de bloqueio/erro e dumps tÃ©cnicos nÃ£o sÃ£o fonte confiÃ¡vel para contato.
  if (/sorry,\s*you have been blocked|you are unable to access|cloudflare|ray\s*id|security service|access denied|erro\s+\d{3}|stack trace|__NEXT_DATA__|window\.__|application\/json|cacheStoredAt|cache stored at/i.test(raw) && !hasExplicitContactMarker) {
    return true;
  }

  // WKB/geometry/hash strings and CDN media URLs often contain phone-looking digit groups.
  if (/^01010000[0-9a-f]+$/i.test(raw) || (/^[0-9a-f]{24,}$/i.test(raw) && !/[+\s().-]/.test(raw))) {
    return true;
  }

  // Timestamps, ids e contadores puros nÃ£o sÃ£o telefones.
  if (/^\d{12,}$/.test(raw) && (!hasExplicitContactMarker || /\b(cache|timestamp|stored|expires|ttl|id|token|ray)\b/i.test(normalizedContext))) return true;

  const looksLikeUrl = /^https?:\/\//i.test(raw);
  const isExplicitContactUrl = /\b(?:wa\.me|whatsapp|api\.whatsapp|web\.whatsapp|tel:|phone=|telefone=|whats|zap|wpp|numero=)\b/i.test(raw);
  const isMediaUrl = looksLikeUrl && (
    /\.(?:jpe?g|png|webp|gif|svg|avif)(?:[?#].*)?$/i.test(raw.split(/[?#]/)[0])
    || /\b(?:scontent|cdninstagram|fbcdn|twimg|ytimg|googleusercontent|cloudinary|image|photo|thumb|thumbnail|avatar|profile_pic)\b/i.test(raw)
  );
  if (isMediaUrl && !isExplicitContactUrl) return true;

  // Plain long URLs without an explicit contact marker are not phone evidence.
  if (looksLikeUrl && !isExplicitContactUrl && raw.length > 120 && !/anota|pedido|cardapio|menu|delivery|ifood/i.test(normalizedSource)) {
    return true;
  }

  return false;
};

const makeContactCandidate = (
  digits: string,
  source: string,
  raw: string,
  options: { sourceUrl?: string; label?: string; whatsapp?: boolean; confidence?: number } = {}
): ContactCandidate | null => {
  if (isLikelyNonContactTechnicalText(raw, options.label, source)) return null;
  const normalized = normalizeBrazilPhoneDigits(digits);
  const kind = phoneKindFromDigits(normalized, Boolean(options.whatsapp));
  const national = normalized.startsWith('55') ? normalized.slice(2) : normalized;
  if (!normalized) return null;
  if (kind === 'tollfree' && normalized.length < 10) return null;
  if (kind !== 'tollfree' && ![10, 11].includes(national.length)) return null;
  const whatsappUrl = kind === 'whatsapp' ? whatsappUrlFromDigits(normalized) : '';
  const sourceBonus = /anota|cardapio|menu|pedido|instagram|bio|whatsapp/i.test(source) ? 12 : /google/i.test(source) ? 4 : 0;
  const kindBonus = kind === 'whatsapp' ? 100 : kind === 'mobile' ? 65 : kind === 'phone' ? 35 : 5;
  const confidence = Math.max(0.35, Math.min(0.99, options.confidence ?? (kind === 'whatsapp' ? 0.94 : kind === 'mobile' ? 0.78 : kind === 'tollfree' ? 0.45 : 0.65)));
  return {
    phone: formatPhoneDisplay(normalized),
    normalized_phone: normalized,
    kind,
    source,
    source_url: options.sourceUrl,
    label: options.label,
    whatsapp_url: whatsappUrl || undefined,
    confidence,
    score: Math.round(kindBonus + sourceBonus + confidence * 10),
    raw: String(raw || '').slice(0, 300),
    found_at: new Date().toISOString(),
  };
};

const extractContactCandidatesFromString = (value: any, source: string, sourceUrl = '', label = ''): ContactCandidate[] => {
  const raw = String(value || '');
  if (!raw || /^data:image\//i.test(raw) || isLikelyNonContactTechnicalText(raw, label, source)) return [];
  const cleanRaw = raw.slice(0, 3000);
  const normalizedLabel = String(label || '').toLowerCase();
  const normalizedSource = String(source || '').toLowerCase();
  const rawBlobLabel = /(^|[_-])(raw|rawtext|raw_text|visualrawtext|visual_raw_text|html|json|payload|response|debug|cache|cachedata|textblocks?)($|[_-])/i.test(normalizedLabel);
  const explicitContactContext = /\b(?:wa\.me|whatsapp|api\.whatsapp|web\.whatsapp|tel:|phone=|telefone=|telefone|celular|contato|whats|zap|wpp|numero=|nÃºmero=|ligue|pedidos? pelo whats|pe[Ã§c]a pelo whats)\b/i.test(cleanRaw)
    || /\b(?:phone|telefone|whatsapp|whats|zap|wpp|contato)\b/i.test(`${normalizedLabel} ${normalizedSource}`);
  if (rawBlobLabel && !explicitContactContext) return [];
  const isUrlWithoutContactMarker = /^https?:\/\//i.test(cleanRaw)
    && !/\b(?:wa\.me|whatsapp|api\.whatsapp|web\.whatsapp|tel:|phone=|telefone=|whats|zap|wpp|numero=)\b/i.test(cleanRaw);
  if (isUrlWithoutContactMarker) return [];
  const candidates: ContactCandidate[] = [];
  const whatsappDigits = extractWhatsappDigitsFromUrl(cleanRaw);
  if (whatsappDigits) {
    const candidate = makeContactCandidate(whatsappDigits, source, cleanRaw, { sourceUrl, label, whatsapp: true, confidence: 0.96 });
    if (candidate) candidates.push(candidate);
  }
  const explicitWhatsapp = /\b(?:whats(?:app)?|zap|wa\.me|api\.whatsapp|wpp)\b/i.test(cleanRaw);
  const phoneRegex = /(?:\+?55[\s().-]*)?(?:\(?\d{2}\)?[\s.-]*)?(?:9?\d{4})[\s.-]?\d{4}|0800[\s.-]?\d{3}[\s.-]?\d{4}/g;
  for (const match of cleanRaw.matchAll(phoneRegex)) {
    const candidate = makeContactCandidate(match[0], source, cleanRaw, {
      sourceUrl,
      label,
      whatsapp: explicitWhatsapp,
      confidence: explicitWhatsapp ? 0.9 : 0.68,
    });
    if (candidate) candidates.push(candidate);
  }
  return candidates;
};

const collectContactCandidates = (input: any, source: string, sourceUrl = ''): ContactCandidate[] => {
  const candidates: ContactCandidate[] = [];
  const seenObjects = new WeakSet<object>();
  const walk = (value: any, label = '', depth = 0) => {
    if (value == null || candidates.length > 80 || depth > 4) return;
    if (typeof value === 'string' || typeof value === 'number') {
      candidates.push(...extractContactCandidatesFromString(value, source, sourceUrl, label));
      return;
    }
    if (Array.isArray(value)) {
      value.slice(0, 80).forEach((item, index) => walk(item, `${label}[${index}]`, depth + 1));
      return;
    }
    if (typeof value === 'object') {
      if (seenObjects.has(value)) return;
      seenObjects.add(value);
      const preferredKeys = ['url', 'href', 'sourceUrl', 'source_url', 'label', 'title', 'text', 'snippet', 'description', 'bio', 'phone', 'telefone', 'celular', 'contact', 'contato', 'whatsapp', 'whatsapp_url'];
      for (const key of preferredKeys) {
        if (key in value) walk(value[key], key, depth + 1);
      }
      if (depth <= 1) {
        for (const [key, child] of Object.entries(value)) {
          if (
            preferredKeys.includes(key)
            || /image|photo|logo|cover|gallery|screenshot|geom|geometry|coordinate|latitude|longitude|place_id|cid|hash|hex|rawtext|raw_text|visualrawtext|visual_raw_text|html|json|payload|response|debug|cache|cached|timestamp/i.test(key)
          ) continue;
          walk(child, key, depth + 1);
        }
      }
    }
  };
  walk(input, source, 0);
  return mergeContactCandidates(candidates);
};

const mergeContactCandidates = (contacts: ContactCandidate[]) => {
  const byPhone = new Map<string, ContactCandidate>();
  for (const contact of contacts || []) {
    if (!contact?.normalized_phone) continue;
    const existing = byPhone.get(contact.normalized_phone);
    if (!existing || contact.score > existing.score || (contact.kind === 'whatsapp' && existing.kind !== 'whatsapp')) {
      byPhone.set(contact.normalized_phone, contact);
    }
  }
  return [...byPhone.values()].sort((a, b) => b.score - a.score);
};

const getPhoneAreaCode = (contact: ContactCandidate) => {
  const normalized = normalizeBrazilPhoneDigits(contact?.normalized_phone || contact?.phone || '');
  if (!normalized || normalized.startsWith('0800')) return '';
  const national = normalized.startsWith('55') ? normalized.slice(2) : normalized;
  return national.length >= 10 ? national.slice(0, 2) : '';
};

const expectedAreaCodesForRestaurant = (restaurant: any) => {
  const city = String(restaurant?.city || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const state = String(restaurant?.state || '').toUpperCase();
  if (state === 'PB' || /campina grande|joao pessoa|joÃ£o pessoa/.test(city)) return ['83'];
  return [];
};

const rankContactForRestaurant = (contact: ContactCandidate, restaurant: any) => {
  const expectedAreaCodes = expectedAreaCodesForRestaurant(restaurant);
  const areaCode = getPhoneAreaCode(contact);
  const isLocal = !expectedAreaCodes.length || (areaCode && expectedAreaCodes.includes(areaCode));
  const localBonus = isLocal ? 25 : (contact.kind === 'phone' ? -45 : -20);
  const kindBonus = contact.kind === 'whatsapp' ? 100 : contact.kind === 'mobile' ? 45 : contact.kind === 'tollfree' ? -80 : 0;
  return Number(contact.score || 0) + localBonus + kindBonus;
};

const isStrongPrimaryContact = (contact: ContactCandidate, restaurant: any) => {
  if (!contact) return false;
  if (contact.kind === 'whatsapp') return true;
  if (contact.kind === 'mobile') return true;
  const trustedMapsSource = /\bgoogle_maps\b/i.test(String(contact.source || ''));
  if (contact.kind === 'tollfree') return Boolean(trustedMapsSource && Number(contact.confidence || 0) >= 0.6);
  const trustedBioSource = /\b(?:instagram_profile|instagram_bio|instagram_bio_menu_discovery|bio_menu|gpt_navigation|menu_source_validation)\b/i.test(String(contact.source || ''));
  if (trustedBioSource && Number(contact.confidence || 0) >= 0.65) return true;
  const expectedAreaCodes = expectedAreaCodesForRestaurant(restaurant);
  const areaCode = getPhoneAreaCode(contact);
  const isLocal = !expectedAreaCodes.length || (areaCode && expectedAreaCodes.includes(areaCode));
  return Boolean(isLocal && Number(contact.confidence || 0) >= 0.65);
};

const buildRestaurantDedupeKeys = (restaurant: any) => {
  const mapsUrl = extractGoogleMapsUrlFromRestaurant(restaurant);
  const name = String(restaurant?.name || '').trim();
  const address = String(restaurant?.address || '').trim();
  const keys = [
    extractMapsCanonicalKey(mapsUrl),
    mapsUrl ? `raw-url:${normalizeDedupeKey(mapsUrl)}` : '',
    name || address ? `name-address:${normalizeDedupeKey(name)}-${normalizeDedupeKey(address)}` : '',
  ].filter(Boolean);
  return Array.from(new Set(keys));
};

export default function CityValidation() {
  const { cityId } = useParams();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [isTrainingValidarIa, setIsTrainingValidarIa] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loadedRowLimit, setLoadedRowLimit] = useState(VALIDATION_INITIAL_ROW_LIMIT);
  const [hasMoreRestaurants, setHasMoreRestaurants] = useState(false);
  const [activeTab, setActiveTab] = useState<ValidationTab>('pendentes');
  const [serverQaStats, setServerQaStats] = useState<QaStats | null>(null);
  const [activeTriageFilter, setActiveTriageFilter] = useState<LeadTriageKey | 'all'>('all');
  const [showValidationDiagnostics, setShowValidationDiagnostics] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [cityScope, setCityScope] = useState<{ name: string; state: string } | null>(null);

  const [logs, setLogs] = useState<string[]>([
    '[SYSTEM] MÃ³dulo de ValidaÃ§Ã£o e Enriquecimento IA iniciado.',
    '[SYSTEM] Aguardando comandos...'
  ]);
  const [showExtensionTelemetry, setShowExtensionTelemetry] = useState(false);
  const [extensionTelemetry, setExtensionTelemetry] = useState<ExtensionTelemetryEvent[]>([]);
  const [isLoadingExtensionTelemetry, setIsLoadingExtensionTelemetry] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const pendingLogLinesRef = useRef<string[]>([]);
  const logFlushTimerRef = useRef<number | null>(null);
  const extensionPingInFlightRef = useRef(false);
  const MAX_VISIBLE_LOG_LINES = 80;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab, activeTriageFilter, pageSize]);

  const [isExtensionActive, setIsExtensionActive] = useState(false);
  const [extensionVersion, setExtensionVersion] = useState<string | null>(null);
  const [isExtensionCompatible, setIsExtensionCompatible] = useState(false);
  const [extensionCapabilities, setExtensionCapabilities] = useState<any>(null);
  const [extensionId, setExtensionId] = useState<string | null>(() => normalizeExtensionTargetId(localStorage.getItem('chrome_extension_id') || FIXED_EXTENSION_ID));
  const extensionTargetId = normalizeExtensionTargetId(extensionId);
  const isExtensionReady = isExtensionActive && isExtensionCompatible;

  const sendExtensionMessage = (id: string, message: Record<string, any>, timeoutMs = 30000) => new Promise<any>((resolve) => {
    const chromeObj = (window as any).chrome;
    const directTargetId = normalizeExtensionTargetId(id);
    if (directTargetId && chromeObj?.runtime?.sendMessage) {
      let directSettled = false;
      const directTimer = window.setTimeout(() => {
        if (directSettled) return;
        directSettled = true;
        resolve({ success: false, error: 'Timeout aguardando resposta da extensao.' });
      }, timeoutMs);
      const finishDirect = (value: any) => {
        if (directSettled) return;
        directSettled = true;
        window.clearTimeout(directTimer);
        resolve(value);
      };
      try {
        chromeObj.runtime.sendMessage(directTargetId, message, (response: any) => {
          const directError = chromeObj.runtime.lastError?.message;
          if (directError || !response) {
            finishDirect({ success: false, error: directError || 'A extensao nao respondeu.' });
            return;
          }
          finishDirect(response);
          return;
          if (!directError && response) resolve(response);
          else resolve({ success: false, error: directError || 'A extensÃ£o nÃ£o respondeu.' });
        });
        return;
      } catch (error: any) {
        finishDirect({ success: false, error: error.message });
        return;
      }
    }
    const requestId = 'ff-page-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    let settled = false;
    const finish = (value: any) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.removeEventListener('message', listener);
      resolve(value);
    };
    const listener = (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data || {};
      if (data.source !== 'filterfood-extension-bridge' || data.requestId !== requestId) return;
      if (data.error) finish({ success: false, error: data.error });
      else finish(data.response || { success: false, error: 'A extensÃ£o nÃ£o respondeu.' });
    };
    const timer = window.setTimeout(() => finish({ success: false, error: 'Ponte da extensÃ£o nÃ£o respondeu.' }), timeoutMs);
    window.addEventListener('message', listener);
    window.postMessage({ source: 'filterfood-admin-bridge', requestId, message }, '*');
  });

  const probeExtensionReadyNow = async (timeoutMs = 7000) => {
    const storedId = localStorage.getItem('chrome_extension_id') || FIXED_EXTENSION_ID;
    const id = normalizeExtensionTargetId(storedId);
    if (storedId !== id) localStorage.setItem('chrome_extension_id', id);
    setExtensionId(id);

    const response = await sendExtensionMessage(id, { action: "ping" }, timeoutMs);
    const active = !!(response && response.success);
    const compatible = isCompatibleExtensionPing(response);
    setIsExtensionActive(active);
    setExtensionVersion(response?.version || null);
    setExtensionCapabilities(response?.capabilities || null);
    setIsExtensionCompatible(compatible);

    return {
      ready: active && compatible,
      active,
      compatible,
      version: response?.version || null,
      response,
      reason: !active
        ? 'Extensao inativa.'
        : compatible
          ? ''
          : `Extensao desatualizada/incompleta (${response?.version || 'sem versao'}). Versao minima: ${REQUIRED_EXTENSION_VERSION}.`
    };
  };

  const refreshExtensionTelemetry = async () => {
    setIsLoadingExtensionTelemetry(true);
    try {
      const response = await fetch('/api/local-collector/extension-telemetry');
      const data = await response.json();
      if (data?.success && Array.isArray(data.events)) {
        setExtensionTelemetry(data.events);
      }
    } catch (error) {
      console.warn('Falha ao carregar telemetria da extensao:', error);
    } finally {
      setIsLoadingExtensionTelemetry(false);
    }
  };

  const clearExtensionTelemetry = async () => {
    try {
      await fetch('/api/local-collector/extension-telemetry', { method: 'DELETE' });
      setExtensionTelemetry([]);
    } catch (error) {
      console.warn('Falha ao limpar telemetria da extensao:', error);
    }
  };

  useEffect(() => {
    if (!showExtensionTelemetry) return;
    let cancelled = false;

    const loadTelemetry = async () => {
      setIsLoadingExtensionTelemetry(true);
      try {
        const response = await fetch('/api/local-collector/extension-telemetry');
        const data = await response.json();
        if (!cancelled && data?.success && Array.isArray(data.events)) {
          setExtensionTelemetry(data.events);
        }
      } catch (error) {
        if (!cancelled) console.warn('Falha ao carregar telemetria da extensao:', error);
      } finally {
        if (!cancelled) setIsLoadingExtensionTelemetry(false);
      }
    };

    loadTelemetry();
    const interval = window.setInterval(loadTelemetry, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [showExtensionTelemetry]);

  useEffect(() => {
    const checkConnection = async () => {
      if (isValidating || validatingId || extensionPingInFlightRef.current) return;
      extensionPingInFlightRef.current = true;
      try {
        const storedId = localStorage.getItem('chrome_extension_id') || FIXED_EXTENSION_ID;
        const id = normalizeExtensionTargetId(storedId);
        if (storedId !== id) localStorage.setItem('chrome_extension_id', id);
        setExtensionId(id);
        const response = await sendExtensionMessage(id, { action: "ping" }, 6000);
        setIsExtensionActive(!!(response && response.success));
        setExtensionVersion(response?.version || null);
        setExtensionCapabilities(response?.capabilities || null);
        setIsExtensionCompatible(isCompatibleExtensionPing(response));
      } finally {
        extensionPingInFlightRef.current = false;
      }
    };
    checkConnection();
    const retryShort = window.setTimeout(checkConnection, 2500);
    const retryLong = window.setTimeout(checkConnection, 8000);
    const interval = setInterval(checkConnection, 45000);
    return () => {
      window.clearTimeout(retryShort);
      window.clearTimeout(retryLong);
      clearInterval(interval);
    };
  }, [isValidating, validatingId]);

  const handleDownloadExtension = () => {
    const link = document.createElement('a');
    link.href = '/chrome-extension.zip';
    link.download = 'chrome-extension.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Download da extensÃ£o iniciado!");
  };

  const handleSaveExtensionId = async () => {
    if (extensionId) {
      const id = normalizeExtensionTargetId(extensionId);
      setExtensionId(id);
      localStorage.setItem('chrome_extension_id', id);
      const response = await sendExtensionMessage(id, { action: "ping" }, 6000);
      setIsExtensionActive(!!(response && response.success));
      setExtensionVersion(response?.version || null);
      setExtensionCapabilities(response?.capabilities || null);
      setIsExtensionCompatible(isCompatibleExtensionPing(response));
      toast.success("ID da extensÃ£o salvo!");
    }
  };

  const flushPendingLogs = () => {
    const pending = pendingLogLinesRef.current.splice(0);
    if (!pending.length) return;
    setLogs(prev => {
      const next = [...prev, ...pending];
      return next.length > MAX_VISIBLE_LOG_LINES ? next.slice(-MAX_VISIBLE_LOG_LINES) : next;
    });
  };

  useEffect(() => {
    return () => {
      if (logFlushTimerRef.current !== null) {
        window.clearTimeout(logFlushTimerRef.current);
      }
    };
  }, []);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    pendingLogLinesRef.current.push(`[${time}] ${msg}`);
    if (logFlushTimerRef.current !== null) return;
    logFlushTimerRef.current = window.setTimeout(() => {
      logFlushTimerRef.current = null;
      flushPendingLogs();
    }, 500);
  };

  const summarizeMenuCategoriesForLog = (categories: any[] = []) => {
    const list = Array.isArray(categories) ? categories : [];
    const itemCount = list.reduce((total, category: any) => total + ((category?.items || category?.menu_items || []).length || 0), 0);
    const optionCount = list.reduce((total, category: any) => total + ((category?.items || category?.menu_items || []) as any[]).reduce((itemTotal, item: any) => (
      itemTotal
      + normalizeItemOptionRows(item).length
      + (Array.isArray(item?.combo_components)
        ? item.combo_components.reduce((sum: number, component: any) => sum + ((component?.items || []).length || 0), 0)
        : 0)
    ), 0), 0);
    return {
      categoryCount: list.length,
      itemCount,
      optionCount,
      sampleCategories: list.slice(0, 8).map((category: any) => ({
        name: category?.name || category?.category_name || '',
        itemCount: (category?.items || category?.menu_items || []).length || 0,
      })),
    };
  };

  const compactAiLogValue = (value: any, depth = 0, seen = new WeakSet<object>()): any => {
    if (value === null || value === undefined) return value;
    if (typeof value === 'string') {
      if (/^data:image\/|base64,/i.test(value)) return `[imagem/base64 omitida: ${value.length} caracteres]`;
      if (value.length > 2400) return `${value.slice(0, 2400)}...[truncado ${value.length - 2400} caracteres]`;
      return value;
    }
    if (typeof value !== 'object') return value;
    if (seen.has(value)) return '[referencia circular omitida]';
    if (depth >= 6) return '[profundidade maxima omitida]';
    seen.add(value);

    if (Array.isArray(value)) {
      if (value.length > 0 && value.some((item: any) => Array.isArray(item?.items) || Array.isArray(item?.menu_items))) {
        return summarizeMenuCategoriesForLog(value);
      }
      return value.slice(0, 30).map(item => compactAiLogValue(item, depth + 1, seen)).concat(
        value.length > 30 ? [`[${value.length - 30} item(ns) omitido(s)]`] : [],
      );
    }

    const result: Record<string, any> = {};
    Object.entries(value).forEach(([key, entry]) => {
      if (/^(rawText|raw_text|visualRawText|visual_raw_text|html|payload|response|debug|ocrText|textBlocks|screenshots|images)$/i.test(key)) {
        if (Array.isArray(entry)) {
          result[key] = { count: entry.length, sample: entry.slice(0, 5).map(item => compactAiLogValue(item, depth + 1, seen)) };
        } else {
          const text = String(entry || '');
          result[key] = text ? `[conteudo omitido: ${text.length} caracteres]` : entry;
        }
        return;
      }
      if (/^(categories|normalizedMenu|correctedMenu|preview)$/i.test(key) && Array.isArray(entry)) {
        result[key] = summarizeMenuCategoriesForLog(entry);
        return;
      }
      result[key] = compactAiLogValue(entry, depth + 1, seen);
    });
    return result;
  };

  const extractEvidenceUrlsForLog = (value: any, urls = new Set<string>(), depth = 0): string[] => {
    if (!value || depth > 5 || urls.size >= 20) return [...urls];
    if (typeof value === 'string') {
      if (/^https?:\/\//i.test(value) && !/^data:image\//i.test(value)) urls.add(value);
      return [...urls];
    }
    if (Array.isArray(value)) {
      value.slice(0, 50).forEach(item => extractEvidenceUrlsForLog(item, urls, depth + 1));
      return [...urls];
    }
    if (typeof value === 'object') {
      Object.entries(value).forEach(([key, entry]) => {
        if (/url|link|source|final/i.test(key) || typeof entry === 'object') extractEvidenceUrlsForLog(entry, urls, depth + 1);
      });
    }
    return [...urls];
  };

  const classifyMenuOutcomeForLog = (
    status: 'found' | 'not_found' | 'unavailable' | 'manual_required' | 'blocked' | 'invalid_source' | 'failed' | 'needs_recollection',
    reason: string,
    extra: Record<string, any> = {},
  ) => {
    if (status === 'found') {
      return {
        route: 'publishable',
        reasonCode: 'structured_menu_approved',
        nextAction: 'approve_for_app',
        status,
        blocksPublication: false,
        publishable: true,
        reason,
      };
    }

    const haystack = normalizeText(`${status} ${reason} ${JSON.stringify(compactAiLogValue(extra))}`);
    let route = 'human_review';
    let reasonCode = 'manual_review_required';
    let nextAction = 'review_before_publish';

    if (status === 'needs_recollection') {
      route = 'recollection';
      reasonCode = 'extraction_incomplete_or_wrong_source';
      nextAction = 'run_validar_ia_again_with_better_source';
    } else if (status === 'not_found') {
      route = 'not_publishable';
      reasonCode = 'no_reliable_menu_source_found';
      nextAction = 'do_not_publish_without_menu';
    } else if (status === 'unavailable') {
      route = 'not_publishable';
      reasonCode = 'restaurant_out_of_scope_or_unavailable';
      nextAction = 'keep_out_of_app';
    } else if (status === 'invalid_source') {
      route = 'recollection';
      reasonCode = 'invalid_or_unsafe_menu_source';
      nextAction = 'find_another_menu_source';
    } else if (status === 'failed') {
      route = 'human_review';
      reasonCode = 'technical_failure';
      nextAction = 'inspect_error_and_retry';
    }

    if (/captcha|login|bloqueio|blocked|cloudflare|sessao|sess[aÃ£]o|intervencao|interven[cÃ§][aÃ£]o/.test(haystack)) {
      route = 'human_review';
      reasonCode = 'access_blocked_login_captcha';
      nextAction = 'manual_login_or_review';
    } else if (/sem preco|preco confiavel|precos para revisao|unresolvedprice|price/.test(haystack) && /sem|unresolved|revisao|review/.test(haystack)) {
      route = 'human_review';
      reasonCode = 'missing_or_untrusted_prices';
      nextAction = 'manual_price_review';
    } else if (/item a item|item-a-item|detalhes|adicionais incompletos|opcoes incompletas|coleta profunda|recolet/.test(haystack)) {
      route = 'recollection';
      reasonCode = 'deep_item_details_required';
      nextAction = 'recollect_opening_each_menu_item';
    } else if (/fonte errada|listagem|reviews|avaliacao|outro restaurante|misturou|wrong source|mixed source/.test(haystack)) {
      route = 'recollection';
      reasonCode = 'wrong_or_mixed_source';
      nextAction = 'find_another_menu_source';
    } else if (/404|not found|loja nao encontrada|nao esta mais disponivel|indisponivel|pagina nao encontrada|fora do ar|source_unavailable|bio_menu_source_unavailable/.test(haystack)) {
      route = 'not_publishable';
      reasonCode = 'menu_source_unavailable_or_404';
      nextAction = 'try_alternative_menu_source_or_keep_without_menu';
    }

    return {
      route,
      reasonCode,
      nextAction,
      status,
      blocksPublication: status !== 'found',
      publishable: status === 'found',
      reason,
    };
  };

  const buildEvidenceManifestForLog = (extra: Record<string, any> = {}) => {
    const menuEvidence = extra.menuEvidence || {};
    const previewResult = extra.previewResult || {};
    const finalAudit = extra.finalAudit || {};
    const extractorAudit = extra.extractorAudit || extra.previewAudit || previewResult.audit || {};
    const categories = Array.isArray(menuEvidence.categories)
      ? menuEvidence.categories
      : Array.isArray(previewResult.categories)
        ? previewResult.categories
        : Array.isArray(finalAudit?.audit?.normalizedMenu)
          ? finalAudit.audit.normalizedMenu
          : [];

    return {
      sourceUrl: extra.sourceUrl || menuEvidence.sourceUrl || menuEvidence.finalUrl || '',
      platform: extra.platform || menuEvidence.platform || '',
      discoveryMethod: extra.discoveryMethod || menuEvidence.discoveryMethod || menuEvidence.discovery_method || '',
      sourceUrls: extractEvidenceUrlsForLog(extra),
      menu: summarizeMenuCategoriesForLog(categories),
      extractorAudit: {
        approved: extractorAudit.approved,
        itemCount: extractorAudit.itemCount,
        categoryCount: extractorAudit.categoryCount,
        pricedItemCount: extractorAudit.pricedItemCount,
        unresolvedPriceCount: extractorAudit.unresolvedPriceCount,
        pricedRatio: extractorAudit.pricedRatio,
        issues: extractorAudit.issues || [],
        warnings: extractorAudit.warnings || [],
      },
      rawEvidence: {
        rawTextChars: String(menuEvidence.rawText || menuEvidence.raw_text || '').length,
        visualRawTextChars: String(menuEvidence.visualRawText || menuEvidence.visual_raw_text || '').length,
        screenshotCount: Array.isArray(menuEvidence.screenshots) ? menuEvidence.screenshots.length : 0,
        imageCandidateCount: Array.isArray(menuEvidence.imageMenuCandidates) ? menuEvidence.imageMenuCandidates.length : 0,
        textBlockCount: Array.isArray(menuEvidence.textBlocks) ? menuEvidence.textBlocks.length : 0,
      },
      blocker: extra.requiresHuman || previewResult.requiresHuman || finalAudit.requiresHuman || null,
    };
  };

  const persistValidationFailure = async (restaurant: any, error: any, phase = 'validar_ia') => {
    if (!restaurant?.id) return;
    try {
      const reason = error?.message || String(error || 'Erro desconhecido');
      const review = classifyMenuOutcomeForLog('failed', reason, { phase });
      const payload = {
        pipeline: 'validar-ia-extension',
        status: 'failed',
        phase,
        menu_status: 'failed',
        reason,
        review,
        error: reason,
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          city: restaurant.city,
          neighborhood: restaurant.neighborhood,
        },
        recentLogs: logs.slice(-80),
        failedAt: new Date().toISOString(),
      };
      const result = await supabase
        .from('restaurants')
        .update({
          ai_validated: false,
          is_published: false,
          ai_log: JSON.stringify(payload),
          menu_status: 'failed',
          menu_status_reason: `Validar IA falhou antes de concluir auditoria: ${reason}`,
          menu_last_checked_at: new Date().toISOString(),
        })
        .eq('id', restaurant.id);
      if (result.error && /menu_status|menu_status_reason|menu_last_checked_at|schema cache|column/i.test(result.error.message || '')) {
        await supabase
          .from('restaurants')
          .update({
            ai_validated: false,
            is_published: false,
            ai_log: JSON.stringify(payload),
          })
          .eq('id', restaurant.id);
      } else if (result.error) {
        throw result.error;
      }
    } catch (logError) {
      console.warn('[Validar IA] Falha ao persistir diagnÃ³stico:', logError);
    }
  };

  const normalizeText = (value: any) => String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const getMapsClosedStatus = (source: any) => {
    const statusText = normalizeText([
      source?.businessStatus,
      source?.statusText,
      source?.mapsStatusText,
      source?.title,
      source?.name,
      source?.isPermanentlyClosed === true ? 'permanentemente fechado' : '',
      source?.isTemporarilyClosed === true ? 'temporariamente fechado' : '',
    ].filter(Boolean).join(' | '));

    if (
      source?.isPermanentlyClosed === true ||
      statusText.includes('permanently closed') ||
      statusText.includes('permanentemente fechado') ||
      statusText.includes('fechado permanentemente')
    ) {
      return {
        type: 'permanently_closed',
        label: 'permanentemente fechado',
        reason: 'O Google/Maps indica que o estabelecimento esta permanentemente fechado.',
      };
    }

    if (
      source?.isTemporarilyClosed === true ||
      statusText.includes('temporarily closed') ||
      statusText.includes('temporariamente fechado') ||
      statusText.includes('fechado temporariamente')
    ) {
      return {
        type: 'temporarily_closed',
        label: 'temporariamente fechado',
        reason: 'O Google/Maps indica que o estabelecimento esta temporariamente fechado.',
      };
    }

    return null;
  };

  const buildOptionGroupKey = (option: any) => [
    normalizeText(option?.group_name || 'Opcoes'),
    Number(option?.min_quantity || 0),
    option?.max_quantity == null ? '' : Number(option.max_quantity),
    Boolean(option?.is_required),
  ].join('::');

  const getLeadTriage = (restaurant: any, extra: Record<string, any> = {}): LeadTriage => {
    const cleanCategory = normalizeText(restaurant?.category);
    const categoryIsPlaceholder = !cleanCategory || /pendente validacao|pendente|outros|unknown|nao classificado/.test(cleanCategory);
    const text = normalizeText([
      restaurant?.name,
      categoryIsPlaceholder ? '' : restaurant?.category,
      restaurant?.description,
      restaurant?.address,
      extra.title,
      extra.name,
      extra.category,
      extra.placeType,
      extra.businessStatus,
      extra.statusText,
      extra.bio,
      extra.website,
      restaurant?.visit_notes,
      restaurant?.menu_status_reason,
      restaurant?.ai_log,
      restaurant?.coleta_logs,
    ].filter(Boolean).join(' | '));

    const normalizedTerm = (term: string) => normalizeText(term);
    const hasTerm = (terms: string[]) => terms.some(term => text.includes(normalizedTerm(term)));
    const hasWord = (terms: string[]) => terms.some(term => {
      const escaped = normalizedTerm(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp('(^|[^a-z0-9])' + escaped + '([^a-z0-9]|$)').test(text);
    });
    const cleanName = normalizeText(restaurant?.name);
    const cleanNeighborhood = normalizeText(restaurant?.neighborhood);
    const cleanCity = normalizeText(restaurant?.city);
    const nameWordCount = cleanName ? cleanName.split(/\s+/).filter(Boolean).length : 0;
    const originalName = String(restaurant?.name || '');
    const nameLooksLikeMapsSnippet =
      /^\s*[a-z]?\s*\d+(?:[,.]\d+)?\s*\(\d+\)/i.test(originalName) ||
      /[Â·â€¢]\s*(r\.|rua|av\.|avenida|travessa|rod\.|rodovia)\b/i.test(originalName) ||
      /\btemporariamente fechado\b|\bpermanentemente fechado\b/i.test(originalName);
    const nameLooksLikeAddress =
      /^(r\.\s+|rua\b|av\.\s+|avenida\b|travessa\b|rod\.\s+|rodovia\b|bairro\b|loteamento\b|condominio\b|condom[iÃ­]nio\b)/.test(cleanName) ||
      (/\b(campina grande|pb)\b/.test(cleanName) && /\b(r\.\s+|rua\b|av\.\s+|avenida\b|travessa\b|rod\.\s+|rodovia\b)\b/.test(cleanName));
    const nameLooksLikeArea = Boolean(cleanName && (
      cleanName === cleanNeighborhood ||
      cleanName === cleanCity
    ));

    const mapsStatusText = normalizeText([
      extra.businessStatus,
      extra.statusText,
      extra.isPermanentlyClosed === true ? 'permanentemente fechado' : '',
      restaurant?.visit_notes,
      restaurant?.menu_status_reason,
      restaurant?.ai_log,
    ].filter(Boolean).join(' | '));

    if (
      extra.isPermanentlyClosed === true ||
      extra.isTemporarilyClosed === true ||
      mapsStatusText.includes('temporarily closed') ||
      mapsStatusText.includes('temporariamente fechado') ||
      mapsStatusText.includes('fechado temporariamente') ||
      mapsStatusText.includes('permanently closed') ||
      mapsStatusText.includes('permanentemente fechado') ||
      mapsStatusText.includes('fechado permanentemente')
    ) {
      return {
        key: 'maps_status_closed',
        label: 'Fechado no Maps',
        action: 'Validar IA confirma',
        reason: 'O Google Maps indica fechamento temporario ou permanente; essa decisao depende de evidencia do Maps.',
        confidence: 0.99,
        className: 'bg-rose-50 text-rose-700 border-rose-200',
      };
    }

    if (nameLooksLikeMapsSnippet || nameLooksLikeAddress || nameLooksLikeArea) {
      return {
        key: 'maps_result_noise',
        label: 'RuÃ­do do Maps',
        action: 'Validar IA confirma',
        reason: 'Parece endereÃ§o, bairro, ponto do mapa ou snippet do Google, nÃ£o um estabelecimento publicÃ¡vel.',
        confidence: 0.94,
        className: 'bg-slate-50 text-slate-700 border-slate-200',
      };
    }

    const strongFood = hasTerm([
      'restaurante', 'pizzaria', 'hamburgueria', 'lanchonete', 'pastelaria', 'sorveteria',
      'gelateria', 'acai', 'aÃ§aÃ­', 'churrascaria', 'bar e restaurante', 'bar/restaurante',
      'petiscaria', 'cafeteria', 'bistro', 'bistrÃ´', 'cantina', 'cozinha', 'esfiharia',
      'temakeria', 'sushi', 'japones', 'japonÃªs', 'italiana', 'self service', 'self-service',
      'marmitaria', 'food truck', 'frutos do mar', 'doceria', 'confeitaria', 'buffet',
      'espetinho', 'espetos', 'lanche', 'lanches', 'burger', 'burguer', 'pizza', 'crepe',
      'tapioca', 'yakisoba', 'chinesa', 'asiatica', 'asiÃ¡tica', 'oriental', 'delivery de comida',
      'salgaderia', 'rotisserie', 'parrilla', 'rodizio', 'rodÃ­zio'
    ]);

    const expandedFoodSignal = strongFood || hasTerm([
      'marmita', 'marmitas', 'quentinha', 'quentinhas', 'empada', 'empadas',
      'salgado', 'salgados', 'cookie', 'cookies', 'bolo', 'bolos', 'torta', 'tortas',
      'sanduba', 'sanduiche', 'sanduÃ­che', 'sanduicheria', 'sandwich',
      'panqueca', 'panquecaria', 'grill', 'brasa', 'braseiro', 'galeto',
      'frango', 'assado', 'assados', 'cafe', 'cafÃ©', 'sobremesa', 'sobremesas',
      'coxinha', 'coxinhas', 'pastel', 'pastÃ©is', 'pastelzinho', 'hot dog', 'dog',
      'massa', 'massas', 'caldo', 'caldos', 'pamonha', 'canjica',
    ]);

    const serviceOnly = hasTerm([
      'cooperativa', 'motoboy', 'moto boy', 'entregador', 'entregadores', 'delivery de entregas',
      'logistica', 'logÃ­stica', 'transportadora', 'farmacia', 'farmÃ¡cia', 'drogaria',
      'barbearia', 'salao de beleza', 'salÃ£o de beleza', 'academia', 'igreja', 'clinica',
      'clÃ­nica', 'hospital', 'escola', 'oficina', 'lava jato', 'pet shop', 'agropecuaria',
      'agropecuÃ¡ria', 'material de construcao', 'material de construÃ§Ã£o', 'deposito', 'depÃ³sito',
      'hotel', 'pousada', 'posto de gasolina', 'posto petrobras', 'posto ipiranga'
    ]);

    const retail = hasTerm([
      'supermercado', 'hipermercado', 'atacadao', 'atacadÃ£o', 'atacarejo', 'mercado publico',
      'mercado pÃºblico', 'mercearia', 'mercadinho', 'hortifruti', 'sacolao', 'sacolÃ£o',
      'aÃ§ougue', 'acougue', 'peixaria', 'distribuidora', 'bebidas e conveniencia',
      'bebidas e conveniÃªncia', 'conveniencia', 'conveniÃªncia', 'br mania'
    ]);

    const expandedRetailSignal = retail || hasTerm(['multivarejo', 'embalagens', 'bomboniere', 'atacado', 'varejo']);

    const bakery = hasTerm([
      'padaria', 'panificadora', 'panificacao', 'panificaÃ§Ã£o', 'panificadora e confeitaria'
    ]);

    const weakBar = hasWord(['bar']) || hasTerm(['boteco', 'pub']);
    const buffetSignal = hasWord(['buffet']);
    const buffetFoodQualifier = hasTerm([
      'restaurante', 'marmitaria', 'marmita', 'quentinha', 'salgado', 'salgados',
      'pizza', 'pizzaria', 'churrasco', 'churrascaria', 'massas', 'feijoes',
      'feijÃµes', 'self service', 'self-service', 'lanchonete', 'prato feito',
      'pf', 'galeto', 'espetinho', 'espetos'
    ]);
    const buffetCateringNeedsMenu = buffetSignal && !buffetFoodQualifier;
    const hasFoodInsideRetail = hasTerm([
      'marmitaria', 'marmita', 'marmitas', 'quentinha', 'quentinhas', 'espetinho', 'espetos',
      'assado', 'assados', 'lanches', 'pizza', 'pizzaria', 'cafeteria', 'restaurante',
      'sanduiche', 'sanduÃ­che', 'salgado', 'salgados', 'salgaderia', 'frango', 'galeto',
      'cafe', 'cafÃ©', 'doceria', 'confeitaria', 'bolo', 'bolos', 'torta', 'tortas',
      'sobremesa', 'sobremesas', 'empada', 'empadas', 'cookie', 'cookies', 'pastel',
      'pastelaria', 'hamburgueria', 'burger', 'burguer', 'acai', 'aÃ§aÃ­'
    ]);
    const hardVenueOrEvent = hasTerm([
      'hotel', 'pousada', 'motel', 'sitio', 'sÃ­tio', 'chacara', 'chÃ¡cara', 'fazenda', 'resort', 'area de lazer', 'Ã¡rea de lazer',
      'recepcoes', 'recepÃ§Ãµes', 'espaco de eventos', 'espaÃ§o de eventos', 'casa de festas',
      'buffet de eventos', 'buffet festas', 'buffet e eventos', 'cerimonial', 'eventos', 'festas',
      'campestre', 'balneario', 'balneÃ¡rio'
    ]);
    const softVenueOrEvent = hasTerm(['clube', 'food park']);
    const publicPlaceOrMapPoint = hasTerm([
      'mercado publico', 'mercado pÃºblico', 'praca publica', 'praÃ§a pÃºblica',
      'praca de alimentacao', 'praÃ§a de alimentaÃ§Ã£o', 'terminal rodoviario',
      'terminal rodoviÃ¡rio', 'rodoviaria', 'rodoviÃ¡ria', 'rodoviaria velha',
      'rodoviÃ¡ria velha', 'parque da liberdade', 'parque do povo', 'parque de bodocongo',
      'parque de bodocongÃ³', 'parque da crianca', 'parque da crianÃ§a',
      'cras', 'creas', 'posto de saude', 'posto de saÃºde', 'hospital', 'igreja',
      'escola', 'colegio', 'colÃ©gio', 'universidade', 'faculdade', 'museu',
      'centro de convencoes', 'centro de convenÃ§Ãµes'
    ]) || /^(r\.\s+|rua\b|av\.\s+|avenida\b|travessa\b|rod\.\s+|rodovia\b|bairro\b|loteamento\b|condominio\b|condom[iÃ­]nio\b)/.test(cleanName)
      || /\b(praca|praÃ§a|parque|terminal|rodoviaria|rodoviÃ¡ria|cras|creas|hospital|igreja|escola|universidade|faculdade|museu)\b/.test(cleanName)
      || ['campina grande', 'galante', 'sao jose da mata', 'sÃ£o josÃ© da mata', 'centro'].includes(cleanName);
    const genericLowSignal =
      nameWordCount <= 2 &&
      hasTerm(['bar', 'lanchonete', 'restaurante', 'acai', 'aÃ§aÃ­', 'cafe', 'cafÃ©', 'pizzaria', 'pastelaria']) &&
      !/[a-z0-9]{4,}/.test(cleanName.replace(/\b(bar|lanchonete|restaurante|acai|aÃ§aÃ­|cafe|cafÃ©|pizzaria|pastelaria|do|da|de|o|a)\b/g, '').trim());

    if (publicPlaceOrMapPoint && !expandedFoodSignal && !weakBar) {
      return {
        key: 'public_place_or_map_point',
        label: 'Ponto pÃºblico / mapa',
        action: 'Validar IA confirma',
        reason: 'Ruas, praÃ§as, parques, terminais e pontos pÃºblicos nÃ£o entram no app.',
        confidence: 0.97,
        className: 'bg-slate-50 text-slate-700 border-slate-200',
      };
    }

    if (bakery) {
      return {
        key: 'bakery_or_confectionery_needs_menu',
        label: 'Padaria / panificadora',
        action: 'Validar IA confirma',
        reason: 'Padarias e panificadoras nÃ£o entram no app por regra de produto.',
        confidence: 0.95,
        className: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    }

    if (hardVenueOrEvent || (softVenueOrEvent && !expandedFoodSignal && !weakBar)) {
      return {
        key: 'venue_or_event_needs_menu',
        label: 'SÃ­tio/eventos/hospedagem',
        action: 'Validar IA confirma',
        reason: 'SÃ­tios, hotÃ©is, pousadas, resorts, Ã¡reas de lazer e eventos nÃ£o entram no app.',
        confidence: 0.94,
        className: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
      };
    }

    if (buffetCateringNeedsMenu) {
      return {
        key: 'buffet_catering_needs_menu',
        label: 'Buffet / catering',
        action: 'CardÃ¡pio obrigatÃ³rio',
        reason: 'Buffet isolado costuma ser evento/catering. SÃ³ entra se o Validar IA achar cardÃ¡pio pÃºblico organizado.',
        confidence: 0.72,
        className: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
      };
    }

    if (serviceOnly && !expandedFoodSignal && !weakBar) {
      return {
        key: 'likely_reject_service',
        label: 'ServiÃ§o / nÃ£o restaurante',
        action: 'Descartar se Maps confirmar',
        reason: 'Parece serviÃ§o, hotel, posto, clÃ­nica, barbearia ou logÃ­stica; nÃ£o deve entrar no app.',
        confidence: 0.96,
        className: 'bg-rose-50 text-rose-700 border-rose-200',
      };
    }

    if (expandedRetailSignal && !expandedFoodSignal && !hasFoodInsideRetail) {
      return {
        key: 'likely_reject_retail',
        label: 'Varejo / mercado',
        action: 'Descartar se nÃ£o houver cardÃ¡pio',
        reason: 'Parece mercado, supermercado, conveniÃªncia, distribuidora, aÃ§ougue ou peixaria sem operaÃ§Ã£o de restaurante.',
        confidence: 0.92,
        className: 'bg-orange-50 text-orange-700 border-orange-200',
      };
    }

    if ((expandedFoodSignal || hasFoodInsideRetail || weakBar) && (serviceOnly || expandedRetailSignal || bakery)) {
      return {
        key: 'mixed_needs_maps_menu',
        label: 'NegÃ³cio misto',
        action: 'Maps + cardÃ¡pio obrigatÃ³rios',
        reason: 'Tem sinal gastronÃ´mico, mas tambÃ©m sinal de varejo/serviÃ§o. O Validar IA precisa confirmar se existe cardÃ¡pio real.',
        confidence: 0.68,
        className: 'bg-violet-50 text-violet-700 border-violet-200',
      };
    }

    if (genericLowSignal) {
      return {
        key: 'generic_low_signal',
        label: 'Nome genÃ©rico fraco',
        action: 'Baixa prioridade atÃ© Maps/cardÃ¡pio',
        reason: 'Nome muito genÃ©rico ou sem marca. O Maps/cardÃ¡pio precisa provar que existe operaÃ§Ã£o real.',
        confidence: 0.6,
        className: 'bg-sky-50 text-sky-700 border-sky-200',
      };
    }

    if (expandedFoodSignal) {
      return {
        key: 'likely_food_service',
        label: 'ProvÃ¡vel restaurante',
        action: 'Rodar Validar IA',
        reason: 'Nome/categoria indica operaÃ§Ã£o gastronÃ´mica elegÃ­vel, mas ainda precisa de cardÃ¡pio para publicar.',
        confidence: 0.86,
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    }

    if (weakBar) {
      return {
        key: 'unknown_need_maps_ai',
        label: 'Bar ambÃ­guo',
        action: 'IA decide pelo cardÃ¡pio',
        reason: 'Bar/boteco pode ou nÃ£o ter comida organizada. Precisa de evidÃªncia de cardÃ¡pio.',
        confidence: 0.55,
        className: 'bg-blue-50 text-blue-700 border-blue-200',
      };
    }

    return {
      key: 'unknown_need_maps_ai',
      label: 'IA/Maps obrigatÃ³rio',
      action: 'NÃ£o decidir sÃ³ pelo nome',
      reason: 'Dados da Fase 1 nÃ£o bastam para decidir. O Validar IA deve abrir Maps, redes e cardÃ¡pio.',
      confidence: 0.45,
      className: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  };

  const updateRestaurantWithSchemaFallback = async (restaurantId: string, payload: Record<string, any>) => {
    let currentPayload = { ...payload };
    const optionalColumns = [
      'google_maps_name',
      'ai_normalized_name',
      'name_cleanup_notes',
      'google_maps_url',
      'menu_status',
      'menu_status_reason',
      'menu_last_checked_at',
      'location_source',
      'location_confidence',
      'location_verified_at',
      'location_issue_reason',
      'contact_candidates',
      'primary_contact_source',
      'contacts_last_checked_at',
      'whatsapp_url',
    ];

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const { error } = await supabase
        .from('restaurants')
        .update(currentPayload)
        .eq('id', restaurantId);

      if (!error) return;

      const message = error.message || '';
      const missingColumn = message.match(/'([^']+)'\s+column/i)?.[1] || message.match(/column\s+"([^"]+)"/i)?.[1];
      const removable = missingColumn && Object.prototype.hasOwnProperty.call(currentPayload, missingColumn)
        ? missingColumn
        : optionalColumns.find(column => Object.prototype.hasOwnProperty.call(currentPayload, column) && /schema cache|column/i.test(message));

      if (removable) {
        const { [removable]: _removed, ...nextPayload } = currentPayload;
        currentPayload = nextPayload;
        continue;
      }

      throw error;
    }
  };

  const coerceStoredContactCandidates = (input: any): ContactCandidate[] => {
    const rawList = Array.isArray(input)
      ? input
      : (typeof input === 'string' && input.trim().startsWith('[')
        ? (() => {
          try { return JSON.parse(input); } catch (_) { return []; }
        })()
        : []);

    const contacts = rawList
      .map((item: any) => {
        const normalized = normalizeBrazilPhoneDigits(item?.normalized_phone || item?.phone || item?.telefone || '');
        if (!normalized) return null;
        if (isLikelyNonContactTechnicalText(item?.raw || '', item?.label || '', item?.source || '')) return null;
        const kind = (['whatsapp', 'mobile', 'phone', 'tollfree'].includes(item?.kind) ? item.kind : phoneKindFromDigits(normalized, Boolean(item?.whatsapp_url))) as ContactCandidate['kind'];
        const source = item?.source || 'cadastro_atual';
        const confidence = Number(item?.confidence || (kind === 'whatsapp' ? 0.94 : 0.65));
        const score = Number(item?.score || (kind === 'whatsapp' ? 100 : kind === 'mobile' ? 65 : kind === 'phone' ? 35 : 5));
        if (
          String(source).toLowerCase() === 'cadastro_atual'
          && kind !== 'whatsapp'
          && !item?.whatsapp_url
          && (confidence <= 0.75 || score <= 65)
        ) return null;
        return {
          phone: item?.phone || formatPhoneDisplay(normalized),
          normalized_phone: normalized,
          kind,
          source,
          source_url: item?.source_url || item?.sourceUrl || undefined,
          label: item?.label || undefined,
          whatsapp_url: item?.whatsapp_url || (kind === 'whatsapp' ? whatsappUrlFromDigits(normalized) : undefined),
          confidence,
          score,
          raw: item?.raw || undefined,
          found_at: item?.found_at || new Date().toISOString(),
        } as ContactCandidate;
      })
      .filter(Boolean) as ContactCandidate[];

    return mergeContactCandidates(contacts);
  };

  const persistRestaurantContacts = async (
    restaurantId: string,
    currentRestaurant: any,
    input: any,
    source: string,
    sourceUrl = '',
    contextLabel = ''
  ) => {
    const existingContacts = mergeContactCandidates([
      ...coerceStoredContactCandidates(currentRestaurant?.contact_candidates),
      ...collectContactCandidates(currentRestaurant?.phone, 'cadastro_atual'),
      ...collectContactCandidates(currentRestaurant?.whatsapp_url, 'cadastro_atual'),
    ]);
    const newContacts = collectContactCandidates(input, source, sourceUrl);
    const mergedContacts = mergeContactCandidates([...existingContacts, ...newContacts]);
    if (!mergedContacts.length) return currentRestaurant;

    const rankedContacts = [...mergedContacts].sort((a, b) => rankContactForRestaurant(b, currentRestaurant) - rankContactForRestaurant(a, currentRestaurant));
    const primary = rankedContacts.find(contact => contact.kind === 'whatsapp' && contact.whatsapp_url)
      || rankedContacts.find(contact => isStrongPrimaryContact(contact, currentRestaurant));
    const payload: Record<string, any> = {
      contact_candidates: mergedContacts,
      contacts_last_checked_at: new Date().toISOString(),
    };
    if (primary) {
      payload.primary_contact_source = primary.source;
      if (!String(currentRestaurant?.phone || '').trim()) {
        payload.phone = primary.phone;
      }
      if (primary.kind === 'whatsapp' && primary.whatsapp_url && !String(currentRestaurant?.whatsapp_url || '').trim()) {
        payload.whatsapp_url = primary.whatsapp_url;
      }
    }

    await updateRestaurantWithSchemaFallback(restaurantId, payload);

    const hasNewWhatsapp = newContacts.some(contact => contact.kind === 'whatsapp');
    const message = primary
      ? (primary.kind === 'whatsapp'
        ? `WhatsApp salvo como candidato CRM: ${primary.phone}`
        : `Contato salvo como candidato CRM: ${primary.phone}`)
      : 'Contato fraco salvo apenas como candidato CRM; nÃ£o vou preencher telefone pÃºblico';
    addLog(`${message}${contextLabel ? ` (${contextLabel})` : ''}. Total de contatos candidatos: ${mergedContacts.length}.`);
    if (hasNewWhatsapp && primary) toast.success(`âœ… WhatsApp encontrado para CRM: ${primary.phone}`);

    return {
      ...currentRestaurant,
      ...payload,
      phone: payload.phone ?? currentRestaurant?.phone,
      whatsapp_url: payload.whatsapp_url ?? currentRestaurant?.whatsapp_url,
      primary_contact_source: payload.primary_contact_source ?? currentRestaurant?.primary_contact_source,
    };
  };

  const classifyRestaurantEligibilityLocal = (restaurant: any, extra: Record<string, any> = {}) => {
    const triage = getLeadTriage(restaurant, extra);
    if (triage.key === 'maps_status_closed') {
      return { status: 'ineligible' as const, confidence: 0.99, reason: triage.reason, source: 'local_rules' };
    }
    if (triage.key === 'maps_result_noise') {
      return { status: 'ineligible' as const, confidence: triage.confidence, reason: triage.reason, source: 'local_rules' };
    }
    if (triage.key === 'public_place_or_map_point') {
      return { status: 'ineligible' as const, confidence: 0.97, reason: triage.reason, source: 'local_rules' };
    }
    if (triage.key === 'likely_reject_service') {
      return { status: 'ineligible' as const, confidence: 0.96, reason: triage.reason, source: 'local_rules' };
    }
    if (triage.key === 'likely_reject_retail') {
      return { status: 'ineligible' as const, confidence: 0.92, reason: triage.reason, source: 'local_rules' };
    }
    if (triage.key === 'bakery_or_confectionery_needs_menu') {
      return { status: 'ineligible' as const, confidence: 0.95, reason: triage.reason, source: 'local_rules' };
    }
    if (triage.key === 'mixed_needs_maps_menu') {
      return { status: 'unknown' as const, confidence: triage.confidence, reason: triage.reason, source: 'local_rules' };
    }
    if (triage.key === 'venue_or_event_needs_menu') {
      return { status: 'ineligible' as const, confidence: 0.94, reason: triage.reason, source: 'local_rules' };
    }
    if (triage.key === 'generic_low_signal') {
      return { status: 'unknown' as const, confidence: triage.confidence, reason: triage.reason, source: 'local_rules' };
    }
    if (triage.key === 'likely_food_service') {
      return { status: 'eligible' as const, confidence: triage.confidence, reason: triage.reason, source: 'local_rules' };
    }
    if (triage.key === 'unknown_need_maps_ai') {
      return { status: 'unknown' as const, confidence: triage.confidence, reason: triage.reason, source: 'local_rules' };
    }
    const cleanCategory = normalizeText(restaurant?.category);
    const categoryIsPlaceholder = !cleanCategory || /pendente validacao|pendente|outros|unknown|nao classificado/.test(cleanCategory);
    const text = normalizeText([
      restaurant?.name,
      categoryIsPlaceholder ? '' : restaurant?.category,
      restaurant?.description,
      restaurant?.address,
      extra.title,
      extra.name,
      extra.category,
      extra.placeType,
      extra.businessStatus,
      extra.statusText,
      extra.bio,
      extra.website,
      restaurant?.visit_notes,
      restaurant?.menu_status_reason,
      restaurant?.ai_log,
      restaurant?.coleta_logs,
    ].filter(Boolean).join(' | '));

    const normalizedTerm = (term: string) => normalizeText(term);
    const hasTerm = (terms: string[]) => terms.some(term => text.includes(normalizedTerm(term)));
    const hasWord = (terms: string[]) => terms.some(term => {
      const escaped = normalizedTerm(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(text);
    });

    const hasMapsStatusEvidence = Boolean(
      extra.isPermanentlyClosed === true ||
      extra.isTemporarilyClosed === true ||
      extra.businessStatus ||
      extra.statusText
    );
    const mapsStatusText = normalizeText([
      extra.businessStatus,
      extra.statusText,
      extra.isPermanentlyClosed === true ? 'permanentemente fechado' : '',
      extra.isTemporarilyClosed === true ? 'temporariamente fechado' : '',
      restaurant?.visit_notes,
      restaurant?.menu_status_reason,
      restaurant?.ai_log,
    ].filter(Boolean).join(' | '));

    if (
      hasMapsStatusEvidence && (
      extra.isPermanentlyClosed === true ||
      extra.isTemporarilyClosed === true ||
      mapsStatusText.includes('permanently closed') ||
      mapsStatusText.includes('permanentemente fechado') ||
      mapsStatusText.includes('fechado permanentemente') ||
      mapsStatusText.includes('temporarily closed') ||
      mapsStatusText.includes('temporariamente fechado') ||
      mapsStatusText.includes('fechado temporariamente')
      )
    ) {
      return { status: 'ineligible' as const, confidence: 0.99, reason: 'Estabelecimento aparece como fechado no Google Maps.', source: 'local_rules' };
    }

    const strongPositive = hasTerm([
      'restaurante', 'pizzaria', 'hamburgueria', 'lanchonete', 'pastelaria', 'sorveteria',
      'gelateria', 'acai', 'aÃ§aÃ­', 'churrascaria', 'bar e restaurante', 'bar/restaurante',
      'petiscaria', 'cafeteria', 'bistro', 'bistrÃ´', 'cantina', 'cozinha', 'esfiharia',
      'temakeria', 'sushi', 'japones', 'japonÃªs', 'italiana', 'self service', 'self-service',
      'marmitaria', 'food truck', 'frutos do mar', 'doceria', 'confeitaria', 'buffet',
      'espetinho', 'espetos', 'lanche', 'lanches', 'burger', 'burguer', 'pizza',
      'salgaderia', 'rotisserie', 'parrilla', 'rodizio', 'rodÃ­zio',
    ]);

    const expandedPositive = strongPositive || hasTerm([
      'marmita', 'marmitas', 'quentinha', 'quentinhas', 'empada', 'empadas',
      'salgado', 'salgados', 'cookie', 'cookies', 'bolo', 'bolos', 'torta', 'tortas',
      'sanduba', 'sanduiche', 'sanduÃ­che', 'sanduicheria', 'sandwich',
      'panqueca', 'panquecaria', 'grill', 'brasa', 'braseiro', 'galeto',
      'frango', 'assado', 'assados', 'cafe', 'cafÃ©', 'sobremesa', 'sobremesas',
      'coxinha', 'coxinhas', 'pastel', 'pastÃ©is', 'pastelzinho', 'hot dog', 'dog',
      'massa', 'massas', 'caldo', 'caldos', 'pamonha', 'canjica',
    ]);

    const hardNegative = hasTerm([
      'cooperativa', 'motoboy', 'moto boy', 'entregador', 'entregadores', 'delivery de entregas',
      'logistica', 'logÃ­stica', 'transportadora', 'farmacia', 'farmÃ¡cia', 'drogaria',
      'barbearia', 'salao de beleza', 'salÃ£o de beleza', 'academia', 'igreja', 'clinica',
      'clÃ­nica', 'hospital', 'escola', 'oficina', 'lava jato', 'pet shop', 'agropecuaria',
      'agropecuÃ¡ria', 'material de construcao', 'material de construÃ§Ã£o', 'deposito',
      'depÃ³sito', 'cesta basica', 'cesta bÃ¡sica',
    ]);

    const retailOrLodging = hasTerm([
      'supermercado', 'hipermercado', 'atacadao', 'atacadÃ£o', 'atacarejo', 'mercado publico',
      'mercado pÃºblico', 'mercearia', 'conveniencia', 'conveniÃªncia', 'posto de gasolina',
      'hotel', 'pousada', 'motel', 'distribuidora', 'bebidas e conveniencia', 'bebidas e conveniÃªncia',
    ]);

    const bakeryMarket = hasTerm([
      'padaria', 'panificadora', 'panificacao', 'panificaÃ§Ã£o', 'super market', 'mercadinho',
      'hortifruti', 'sacolao', 'sacolÃ£o', 'aÃ§ougue', 'acougue', 'peixaria',
    ]);
    const hardVenueOrPublicPlace = hasTerm([
      'hotel', 'pousada', 'sitio', 'sÃ­tio', 'chacara', 'chÃ¡cara', 'fazenda', 'resort',
      'area de lazer', 'Ã¡rea de lazer', 'recepcoes', 'recepÃ§Ãµes', 'espaco de eventos',
      'espaÃ§o de eventos', 'casa de festas', 'buffet de eventos', 'buffet festas',
      'buffet e eventos', 'cerimonial', 'eventos', 'festas', 'clube', 'campestre',
      'balneario', 'balneÃ¡rio', 'food park', 'mercado publico', 'mercado pÃºblico',
      'praca publica', 'praÃ§a pÃºblica', 'praca de alimentacao', 'praÃ§a de alimentaÃ§Ã£o',
      'terminal rodoviario', 'terminal rodoviÃ¡rio', 'rodoviaria', 'rodoviÃ¡ria',
      'parque da liberdade', 'parque do povo', 'parque de bodocongo', 'parque de bodocongÃ³',
      'parque da crianca', 'parque da crianÃ§a',
    ]) || /^(r\.|rua|av\.|avenida|travessa|rod\.|rodovia|bairro|loteamento|condominio|condom[iÃ­]nio)\b/.test(normalizeText(restaurant?.name));

    const expandedRetailOrLodging = retailOrLodging || hasTerm(['multivarejo', 'embalagens', 'bomboniere', 'atacado', 'varejo']);
    const mixedFoodBusiness = expandedPositive && (expandedRetailOrLodging || bakeryMarket);
    const weakFoodCue = hasWord(['bar']) || hasTerm(['boteco', 'pub']);
    const buffetSignal = hasWord(['buffet']);
    const buffetFoodQualifier = hasTerm([
      'restaurante', 'marmitaria', 'marmita', 'quentinha', 'salgado', 'salgados',
      'pizza', 'pizzaria', 'churrasco', 'churrascaria', 'massas', 'feijoes',
      'feijÃµes', 'self service', 'self-service', 'lanchonete', 'prato feito',
      'pf', 'galeto', 'espetinho', 'espetos'
    ]);
    const buffetCateringNeedsMenu = buffetSignal && !buffetFoodQualifier;

    if (hardVenueOrPublicPlace) {
      return { status: 'ineligible' as const, confidence: 0.96, reason: 'Ponto publico, hotel/evento/sitio ou area similar nao entra no app por regra de produto.', source: 'local_rules' };
    }
    if (hasTerm(['padaria', 'panificadora', 'panificacao', 'panificaÃ§Ã£o'])) {
      return { status: 'ineligible' as const, confidence: 0.95, reason: 'Padaria/panificadora nao entra no app por regra de produto.', source: 'local_rules' };
    }
    if (hardNegative && !expandedPositive && !weakFoodCue) {
      return { status: 'ineligible' as const, confidence: 0.98, reason: 'Tipo de estabelecimento incompatÃ­vel com restaurante/cardÃ¡pio pÃºblico.', source: 'local_rules' };
    }
    if ((expandedRetailOrLodging || bakeryMarket) && !expandedPositive) {
      return { status: 'ineligible' as const, confidence: 0.93, reason: 'Mercado/padaria/hotel/conveniÃªncia sem sinal claro de cardÃ¡pio de restaurante.', source: 'local_rules' };
    }
    if (buffetCateringNeedsMenu) {
      return { status: 'unknown' as const, confidence: 0.58, reason: 'Buffet isolado parece catering/evento; so pode avancar se o Validar IA encontrar cardapio publico organizado.', source: 'local_rules' };
    }
    if (hardNegative && weakFoodCue) {
      return { status: 'unknown' as const, confidence: 0.6, reason: 'NegÃ³cio misto com bar/pub e serviÃ§o nÃ£o gastronÃ´mico; precisa confirmar no Maps/IA.', source: 'local_rules' };
    }
    if (mixedFoodBusiness) {
      return { status: 'unknown' as const, confidence: 0.62, reason: 'NegÃ³cio misto: tem comida, mas tambÃ©m varejo/hotel/conveniÃªncia. Precisa confirmar cardÃ¡pio no Maps/IA.', source: 'local_rules' };
    }
    if (expandedPositive) {
      return { status: 'eligible' as const, confidence: 0.88, reason: 'Nome/categoria indica food service elegÃ­vel.', source: 'local_rules' };
    }
    if (weakFoodCue) {
      return { status: 'unknown' as const, confidence: 0.58, reason: 'Bar/boteco precisa confirmar se serve comida ou tem cardÃ¡pio Ãºtil.', source: 'local_rules' };
    }
    return { status: 'unknown' as const, confidence: 0.45, reason: 'Categoria insuficiente; precisa de avaliaÃ§Ã£o por IA/Google Maps.', source: 'local_rules' };
  };

  const classifyRestaurantEligibilityAI = async (restaurant: any, context: Record<string, any> = {}) => {
    const local = classifyRestaurantEligibilityLocal(restaurant, context);
    if (local.status !== 'unknown') return local;
    try {
      const response = await fetch('/api/local-collector/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemContext: 'VocÃª decide se um lugar deve entrar em um app de busca de restaurantes/cardÃ¡pios. Responda SOMENTE JSON: {"status":"eligible|ineligible|unknown","confidence":0_a_1,"reason":"curto"}. ElegÃ­vel: restaurante, lanchonete, pizzaria, bar com comida, cafeteria, doceria/confeitaria, food truck, marmitaria. InelegÃ­vel por regra de produto: cooperativa de motoboy, supermercado, mercado, padaria/panificadora, posto, farmÃ¡cia, loja, serviÃ§o, hotel, pousada, sÃ­tio, chÃ¡cara, Ã¡rea de lazer, espaÃ§o de eventos, buffet/catering de eventos sem cardÃ¡pio pÃºblico, praÃ§a, parque, rua, ponto pÃºblico, academia, distribuidora e estabelecimento permanentemente fechado no Google Maps.',
          message: JSON.stringify({
            name: restaurant?.name,
            category: restaurant?.category,
            city: restaurant?.city,
            address: restaurant?.address,
            phone: restaurant?.phone,
            website: restaurant?.website || context.website || '',
            instagramBio: context.bio || '',
            googleMaps: {
              category: context.category || '',
              title: context.title || '',
              website: context.website || '',
              businessStatus: context.businessStatus || '',
              statusText: context.statusText || '',
              isPermanentlyClosed: context.isPermanentlyClosed === true,
            }
          })
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const json = String(payload.reply || '').match(/{[\s\S]*}/)?.[0] || '{}';
      const decision = JSON.parse(json);
      const status = ['eligible', 'ineligible', 'unknown'].includes(decision.status) ? decision.status : 'unknown';
      return {
        status,
        confidence: Math.max(0, Math.min(1, Number(decision.confidence || 0))),
        reason: String(decision.reason || 'AvaliaÃ§Ã£o IA sem motivo.'),
        source: 'ai'
      };
    } catch (error: any) {
      return { status: 'unknown' as const, confidence: 0, reason: `Falha ao classificar elegibilidade: ${error.message || error}`, source: 'ai_error' };
    }
  };

  const decideRestaurantOfficialNameAI = async (restaurant: any, context: Record<string, any> = {}) => {
    const googleMapsName = String(context.googleMapsName || restaurant?.google_maps_name || restaurant?.name || '').trim();
    if (!googleMapsName) return null;

    try {
      const response = await fetch('/api/local-collector/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemContext: [
            'VocÃª Ã© o Ã¡rbitro de nome comercial de restaurantes para um app pÃºblico.',
            'Sua tarefa Ã© escolher o nome que o dono provavelmente cadastraria no perfil dele.',
            'Remova slogans, textos de SEO, cidade/bairro e descriÃ§Ãµes genÃ©ricas vindas do Google Maps.',
            "Exemplos: \"La Migliore - O melhor rodÃ­zio de Campina Grande\" => \"La Migliore\"; \"Brazile Pizzaria - Delivery de Pizza em Campina Grande\" => \"Brazile Pizzaria\"; \"Domino's Pizza - Campina Grande\" => \"Domino's Pizza\".",
            'Preserve palavras que faÃ§am parte do nome real. NÃ£o invente nome novo. Se estiver em dÃºvida, mantenha o nome do Google com confianÃ§a menor.',
            'Responda SOMENTE JSON no formato {"official_name":"...","raw_google_name":"...","confidence":0_a_1,"reason":"curto","changed":true|false}.'
          ].join(' '),
          message: JSON.stringify({
            currentName: restaurant?.name || '',
            googleMapsName,
            googleMapsTitle: context.title || '',
            googleMapsCategory: context.category || restaurant?.category || '',
            city: restaurant?.city || context.city || '',
            state: restaurant?.state || context.state || '',
            neighborhood: restaurant?.neighborhood || context.neighborhood || '',
            address: context.address || restaurant?.address || '',
            website: context.website || restaurant?.website || '',
            instagramBio: context.bio || '',
          })
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const json = String(payload.reply || '').match(/{[\s\S]*}/)?.[0] || '{}';
      const decision = JSON.parse(json);
      const officialName = String(decision.official_name || decision.nome_oficial || '').replace(/\s+/g, ' ').trim();
      const confidence = Math.max(0, Math.min(1, Number(decision.confidence || 0)));

      if (!officialName || officialName.length < 2 || confidence < 0.55) return null;

      return {
        officialName,
        rawGoogleName: String(decision.raw_google_name || googleMapsName).trim() || googleMapsName,
        confidence,
        reason: String(decision.reason || 'Nome decidido pela IA a partir do Google Maps.').trim(),
        changed: Boolean(decision.changed) || normalizeText(officialName) !== normalizeText(googleMapsName),
      };
    } catch (error: any) {
      addLog(`IA de nome oficial falhou: ${error.message || error}`);
      return null;
    }
  };

  const markRestaurantIneligible = async (restaurant: any, decision: any, phase = 'eligibility_gate') => {
    const cleanDecisionReason = String(decision?.reason || 'fora do escopo do app').trim().replace(/[.ã€‚]+$/g, '');
    const statusReason = `Removido por regra do Validar IA: ${cleanDecisionReason}.`;
    const payload = {
      pipeline: 'validar-ia-extension',
      status: 'ineligible_removed',
      menu_status: 'unavailable',
      menu_status_reason: statusReason,
      phase,
      decision,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        category: restaurant.category,
        city: restaurant.city,
        neighborhood: restaurant.neighborhood,
      },
      recentLogs: logs.slice(-80),
      removedAt: new Date().toISOString(),
    };
    await supabase
      .from('restaurants')
      .update({
        is_deleted: true,
        is_published: false,
        ai_validated: false,
        menu_status: 'unavailable',
        menu_status_reason: statusReason,
        menu_last_checked_at: new Date().toISOString(),
        ai_log: JSON.stringify(payload),
      } as any)
      .eq('id', restaurant.id);
    await markDuplicateRestaurantsIneligible(restaurant, decision, phase, payload);
    addLog(`Estabelecimento removido da validaÃ§Ã£o: ${restaurant.name}. Motivo: ${decision.reason}`);
  };

  const markDuplicateRestaurantsIneligible = async (restaurant: any, decision: any, phase: string, basePayload: any) => {
    const keys = buildRestaurantDedupeKeys(restaurant);
    if (!restaurant?.id || !restaurant?.city || !restaurant?.state || keys.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, google_maps_url, visit_notes, address, is_deleted')
        .eq('city', restaurant.city)
        .eq('state', restaurant.state)
        .eq('name', restaurant.name)
        .neq('id', restaurant.id)
        .limit(50);

      if (error) throw error;

      const duplicateIds = (data || [])
        .filter(row => row.is_deleted !== true)
        .filter(row => {
          const rowKeys = buildRestaurantDedupeKeys(row);
          return rowKeys.some(key => keys.includes(key));
        })
        .map(row => row.id);

      if (duplicateIds.length === 0) return;

      await supabase
        .from('restaurants')
        .update({
          is_deleted: true,
          is_published: false,
          ai_validated: false,
          menu_status: 'unavailable',
          menu_status_reason: `Duplicado removido por regra do Validar IA: ${decision?.reason || 'fora do escopo do app'}.`,
          menu_last_checked_at: new Date().toISOString(),
          ai_log: JSON.stringify({
            ...basePayload,
            phase: `${phase}_duplicate`,
            duplicateOf: restaurant.id,
            decision,
            removedAt: new Date().toISOString(),
          }),
        } as any)
        .in('id', duplicateIds);

      addLog(`Duplicados canÃ´nicos removidos junto com ${restaurant.name}: ${duplicateIds.length}.`);
    } catch (error: any) {
      addLog(`NÃ£o consegui remover duplicados automaticamente: ${error?.message || error}`);
    }
  };

  const persistMenuStatus = async (
    restaurant: any,
    status: 'found' | 'not_found' | 'unavailable' | 'manual_required' | 'blocked' | 'invalid_source' | 'failed' | 'needs_recollection',
    reason: string,
    extra: Record<string, any> = {}
  ) => {
    const review = classifyMenuOutcomeForLog(status, reason, extra);
    const evidence = buildEvidenceManifestForLog(extra);
    const payload = {
      pipeline: 'validar-ia-extension',
      status: status === 'found' ? 'menu_found' : 'menu_not_collected',
      menu_status: status,
      reason,
      review,
      evidence,
      extra: compactAiLogValue(extra),
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        city: restaurant.city,
        neighborhood: restaurant.neighborhood,
      },
      recentLogs: logs.slice(-80),
      checkedAt: new Date().toISOString(),
    };
    const updateWithColumns: any = {
      ai_validated: true,
      ai_log: JSON.stringify(payload),
      menu_status: status,
      menu_status_reason: reason,
      menu_last_checked_at: new Date().toISOString(),
    };
    if (status !== 'found') {
      updateWithColumns.is_published = false;
    }
    const result = await supabase.from('restaurants').update(updateWithColumns).eq('id', restaurant.id);
    if (!result.error) return;
    if (!/menu_status|menu_status_reason|menu_last_checked_at|schema cache|column/i.test(result.error.message || '')) throw result.error;
    const legacyUpdate: any = { ai_validated: true, ai_log: JSON.stringify(payload) };
    if (status !== 'found') legacyUpdate.is_published = false;
    await supabase
      .from('restaurants')
      .update(legacyUpdate)
      .eq('id', restaurant.id);
  };

  const tryParseJsonObject = (candidate: string) => {
    const text = String(candidate || '')
      .trim()
      .replace(/^\uFEFF/, '');
    if (!text) return null;
    try {
      const parsed = JSON.parse(text);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (_) {
      return null;
    }
  };

  const extractBalancedJsonCandidates = (raw: string) => {
    const candidates: string[] = [];
    const text = String(raw || '');
    for (let start = 0; start < text.length; start++) {
      if (text[start] !== '{') continue;
      let depth = 0;
      let inString = false;
      let escaped = false;
      for (let index = start; index < text.length; index++) {
        const char = text[index];
        if (inString) {
          if (escaped) {
            escaped = false;
          } else if (char === '\\') {
            escaped = true;
          } else if (char === '"') {
            inString = false;
          }
          continue;
        }
        if (char === '"') {
          inString = true;
          continue;
        }
        if (char === '{') depth += 1;
        if (char === '}') depth -= 1;
        if (depth === 0) {
          candidates.push(text.slice(start, index + 1));
          break;
        }
      }
    }
    return candidates;
  };

  const extractJsonObject = (value: string) => {
    const raw = String(value || '').trim();
    const direct = tryParseJsonObject(raw);
    if (direct) return direct;

    const fencedBlocks = [...raw.matchAll(/(?:json)?\s*([\s\S]*?)/gi)].map(match => match[1]);
    for (const block of fencedBlocks) {
      const parsed = tryParseJsonObject(block);
      if (parsed) return parsed;
      for (const candidate of extractBalancedJsonCandidates(block)) {
        const balanced = tryParseJsonObject(candidate);
        if (balanced) return balanced;
      }
    }

    for (const candidate of extractBalancedJsonCandidates(raw)) {
      const balanced = tryParseJsonObject(candidate);
      if (balanced) return balanced;
    }

    const first = raw.indexOf('{');
    const last = raw.lastIndexOf('}');
    if (first >= 0 && last > first) {
      const sliced = tryParseJsonObject(raw.slice(first, last + 1));
      if (sliced) return sliced;
    }
    return null;
  };

  const addressLooksContaminated = (address: string) => {
    const raw = String(address || '').trim();
    const clean = sanitizeGoogleMapsAddressInput(raw);
    const normalized = normalizeText(raw);
    return !raw
      || clean !== raw
      || /\b(zap|whats|whatsapp|telefone|tel|ligar|pedido|pedir)\b/i.test(normalized)
      || /\(?\d{2}\)?\s*\d{4,5}[-\s]?\d{4}/.test(raw)
      || /\d{4,5}\s*[-\u2013]\s*\d{4}\s*(?:R\.|Rua|Av\.|Avenida|Travessa|Tv\.|Rod\.|Rodovia|PraÃ§a|Praca|Alameda|Estrada)/i.test(raw);
  };

  const normalizePublicAddressAI = async (
    rawAddress: string,
    context: { restaurant?: any; mapsData?: any; mapUrl?: string } = {}
  ) => {
    const deterministicAddress = sanitizeGoogleMapsAddressInput(rawAddress);
    const fallback = parseGoogleMapsAddress(deterministicAddress || rawAddress);
    const shouldUseAI = addressLooksContaminated(rawAddress)
      || !fallback.street
      || /\(?\d{2}\)?\s*\d{4,5}[-\s]?\d{4}/.test(fallback.street || '');

    const fallbackResult = {
      ...fallback,
      fullAddress: deterministicAddress || rawAddress,
      source: 'local_address_parser',
      confidence: shouldUseAI ? 0.55 : 0.85,
      reason: shouldUseAI ? 'Fallback local usado; IA indisponÃ­vel ou sem confianÃ§a.' : 'EndereÃ§o normalizado por regras locais.',
    };

    if (!shouldUseAI) return fallbackResult;

    try {
      addLog('EndereÃ§o parece contaminado/ambÃ­guo; IA vai normalizar antes de salvar.');
      const restaurantCtx = context.restaurant || {};
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 12000);
      const response = await fetch('/api/local-collector/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemContext: [
            'VocÃª Ã© um normalizador de endereÃ§os brasileiros para um app pÃºblico de restaurantes.',
            'Recebe texto bruto do Google Maps que pode misturar Ã­cones, botÃµes, WhatsApp, telefone e endereÃ§o.',
            'Extraia SOMENTE o endereÃ§o publicÃ¡vel. Remova telefone, WhatsApp, Zap, botÃµes, emojis, Ã­cones e textos de interface.',
            'NÃ£o invente rua, nÃºmero ou CEP. Se souber cidade/UF pelo contexto, pode preencher cidade/UF.',
            'Se o texto contiver algo como "Zap (81)98871 - 6083R. Paulo de Frontin, 60", o endereÃ§o correto comeÃ§a em "R. Paulo de Frontin".',
            'Responda SOMENTE JSON vÃ¡lido no formato {"street":"","number":"","neighborhood":"","city":"","state":"","cep":"","confidence":0_a_1,"reason":"curto"}.'
          ].join(' '),
          message: JSON.stringify({
            rawAddress,
            localSuggestion: fallbackResult,
            restaurant: {
              name: restaurantCtx.name || '',
              city: restaurantCtx.city || '',
              state: restaurantCtx.state || '',
              neighborhood: restaurantCtx.neighborhood || '',
              currentAddress: restaurantCtx.address || '',
            },
            googleMaps: {
              url: context.mapUrl || '',
              name: context.mapsData?.name || context.mapsData?.title || '',
              category: context.mapsData?.category || '',
            }
          })
        })
      });
      window.clearTimeout(timeoutId);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const decision = extractJsonObject(payload.reply || '');
      if (!decision) throw new Error('IA nÃ£o retornou JSON de endereÃ§o.');

      const confidence = Math.max(0, Math.min(1, Number(decision.confidence || 0)));
      const street = sanitizeGoogleMapsAddressInput(String(decision.street || decision.address || fallback.street || '').trim());
      const normalized = {
        street,
        number: String(decision.number || fallback.number || '').trim(),
        neighborhood: String(decision.neighborhood || fallback.neighborhood || restaurantCtx.neighborhood || '').trim(),
        city: String(decision.city || fallback.city || restaurantCtx.city || '').trim(),
        state: String(decision.state || fallback.state || restaurantCtx.state || '').trim().toUpperCase().slice(0, 2),
        cep: String(decision.cep || fallback.cep || '').trim(),
        confidence,
        reason: String(decision.reason || 'EndereÃ§o normalizado pela IA.').trim(),
        source: 'ai_address_normalizer',
      };

      const stillDirty = !normalized.street
        || /\b(zap|whats|whatsapp|telefone|tel|ligar)\b/i.test(normalizeText(normalized.street))
        || /\(?\d{2}\)?\s*\d{4,5}[-\s]?\d{4}/.test(normalized.street);

      if (confidence < 0.55 || stillDirty) {
        addLog(`IA de endereÃ§o nÃ£o teve confianÃ§a suficiente; usando fallback local. Motivo: ${normalized.reason}`);
        return fallbackResult;
      }

      const fullAddress = [
        normalized.street,
        normalized.number,
        normalized.neighborhood,
        normalized.city,
        normalized.state,
        normalized.cep
      ].filter(Boolean).join(', ');
      addLog(`IA normalizou endereÃ§o publicÃ¡vel: ${fullAddress}`);
      return { ...normalized, fullAddress };
    } catch (error: any) {
      addLog(`IA de endereÃ§o falhou; usando fallback local: ${error.message || error}`);
      return fallbackResult;
    }
  };

  const isUsableCoordinatePair = (lat: any, lng: any) => {
    const nLat = Number(lat);
    const nLng = Number(lng);
    if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) return false;
    if (Math.abs(nLat) < 0.000001 && Math.abs(nLng) < 0.000001) return false;
    // Brasil continental/aproximado. Evita salvar coordenadas absurdas por bug de parser/geocoder.
    return nLat >= -35 && nLat <= 7 && nLng >= -75 && nLng <= -28;
  };

  const distanceKmBetweenCoords = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthKm = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return earthKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  };

  const buildAddressQueryCandidates = (address: any, fallbackRestaurant: any = {}) => {
    const street = String(address?.street || address?.address || '').trim();
    const number = String(address?.number || '').trim();
    const neighborhood = String(address?.neighborhood || fallbackRestaurant?.neighborhood || '').trim();
    const city = String(address?.city || fallbackRestaurant?.city || '').trim();
    const state = String(address?.state || fallbackRestaurant?.state || '').trim();
    const cep = String(address?.cep || '').trim();
    const restaurantName = String(fallbackRestaurant?.name || '').trim();
    const queries = [
      [street, number, neighborhood, city, state, cep].filter(Boolean).join(', '),
      [street, number, city, state].filter(Boolean).join(', '),
      [street, neighborhood, city, state].filter(Boolean).join(', '),
      cep ? [cep, city, state].filter(Boolean).join(', ') : '',
      restaurantName ? [restaurantName, street, number, city, state].filter(Boolean).join(', ') : '',
    ];
    return queries
      .map(query => query.replace(/\s+/g, ' ').replace(/\s+,/g, ',').trim())
      .filter((query, index, list) => query.length >= 6 && list.indexOf(query) === index);
  };

  const geocodeFirstUsable = async (
    queries: string[],
    referenceCoords?: { lat: number; lng: number } | null
  ) => {
    for (const query of queries) {
      try {
        const geocoded = await geocodeAddress(query);
        if (!geocoded || !isUsableCoordinatePair(geocoded.lat, geocoded.lon)) continue;
        const coords = { lat: Number(geocoded.lat), lng: Number(geocoded.lon) };
        if (referenceCoords) {
          const distance = distanceKmBetweenCoords(referenceCoords, coords);
          if (distance > 80) {
            addLog(`Geocode descartado: "${query}" ficou ${Math.round(distance)}km distante do Maps.`);
            continue;
          }
        }
        return { ...coords, query };
      } catch (error: any) {
        addLog(`Geocode falhou para "${query}": ${error.message || error}`);
      }
    }
    return null;
  };

  const resolveRestaurantCoordinatesAI = async (
    address: any,
    context: { restaurant?: any; mapsData?: any; mapUrl?: string; rawAddress?: string } = {}
  ) => {
    const restaurantCtx = context.restaurant || {};
    const mapUrl = String(context.mapsData?.currentUrl || context.mapsData?.finalUrl || context.mapUrl || '').trim();
    const mapCoords = extractCoordsFromUrl(mapUrl || context.mapUrl || '');
    const mapCoordsAreExact = /!3d-?\d+(?:\.\d+)?!4d-?\d+(?:\.\d+)?/i.test(mapUrl);
    const referenceCoords = mapCoords && isUsableCoordinatePair(mapCoords.lat, mapCoords.lng)
      ? { lat: Number(mapCoords.lat), lng: Number(mapCoords.lng) }
      : null;

    if (referenceCoords && mapCoordsAreExact) {
      addLog(`Coordenadas validadas pelo link especÃ­fico do Google Maps: ${referenceCoords.lat}, ${referenceCoords.lng}`);
      return {
        ...referenceCoords,
        source: 'google_maps_place_url',
        confidence: 0.98,
        reason: 'Link do Google Maps trouxe coordenadas especÃ­ficas do lugar.',
      };
    }

    const localQueries = buildAddressQueryCandidates(address, restaurantCtx);
    const geocoded = await geocodeFirstUsable(localQueries, referenceCoords);
    if (geocoded) {
      addLog(`Coordenadas validadas por geocode do endereÃ§o: ${geocoded.lat}, ${geocoded.lng} (${geocoded.query})`);
      return {
        lat: geocoded.lat,
        lng: geocoded.lng,
        source: 'address_geocode',
        confidence: referenceCoords ? 0.9 : 0.82,
        reason: `Geocode validado a partir do endereÃ§o: ${geocoded.query}`,
      };
    }

    try {
      addLog('Coordenadas nÃ£o validadas pelo endereÃ§o; IA vai propor novas buscas de localizaÃ§Ã£o.');
      const response = await fetch('/api/local-collector/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemContext: [
            'VocÃª Ã© um agente de validaÃ§Ã£o de coordenadas para restaurantes no Brasil.',
            'Objetivo: gerar buscas de geocodificaÃ§Ã£o para encontrar latitude/longitude corretas do restaurante.',
            'Use nome, rua, nÃºmero, bairro, cidade e UF. Remova telefone, WhatsApp, Zap e textos de interface.',
            'NÃ£o invente endereÃ§o. Se faltar nÃºmero, gere busca sem nÃºmero e com nome do restaurante.',
            'Responda SOMENTE JSON vÃ¡lido: {"queries":["...","..."],"reason":"curto"}.'
          ].join(' '),
          message: JSON.stringify({
            restaurant: {
              name: restaurantCtx.name || '',
              city: restaurantCtx.city || address?.city || '',
              state: restaurantCtx.state || address?.state || '',
              neighborhood: restaurantCtx.neighborhood || address?.neighborhood || '',
              currentAddress: restaurantCtx.address || '',
            },
            normalizedAddress: address,
            rawAddress: context.rawAddress || '',
            googleMapsUrl: mapUrl || context.mapUrl || '',
            mapsReferenceCoords: referenceCoords,
          })
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const decision = extractJsonObject(payload.reply || '');
      const aiQueries = Array.isArray(decision?.queries) ? decision.queries.map((item: any) => String(item || '').trim()) : [];
      const mergedQueries = [...aiQueries, ...localQueries]
        .filter((query, index, list) => query.length >= 6 && list.indexOf(query) === index)
        .slice(0, 8);
      if (mergedQueries.length) {
        const aiGeocoded = await geocodeFirstUsable(mergedQueries, referenceCoords);
        if (aiGeocoded) {
          addLog(`IA encontrou busca geocodificÃ¡vel: ${aiGeocoded.query} â†’ ${aiGeocoded.lat}, ${aiGeocoded.lng}`);
          return {
            lat: aiGeocoded.lat,
            lng: aiGeocoded.lng,
            source: 'ai_geocode_query',
            confidence: referenceCoords ? 0.88 : 0.78,
            reason: decision?.reason || `IA gerou busca de endereÃ§o validada: ${aiGeocoded.query}`,
          };
        }
      }
    } catch (error: any) {
      addLog(`IA de coordenadas falhou: ${error.message || error}`);
    }

    if (referenceCoords) {
      addLog(`Usando coordenadas do Maps como fallback validado no Brasil: ${referenceCoords.lat}, ${referenceCoords.lng}`);
      return {
        ...referenceCoords,
        source: 'google_maps_url_fallback',
        confidence: 0.72,
        reason: 'Geocode nÃ£o confirmou, mas a URL do Maps trouxe coordenadas vÃ¡lidas.',
      };
    }

    addLog('Coordenadas nÃ£o validadas. Este restaurante nÃ£o poderÃ¡ ficar pronto para app sem nova coleta.');
    return null;
  };

  const getPublicAddressIssues = (restaurant: any) => {
    const address = String(restaurant?.address || '').trim();
    const issues: string[] = [];
    const cleanAddress = sanitizeGoogleMapsAddressInput(address);
    const normalized = normalizeText(address);
    const latitude = Number(restaurant?.latitude);
    const longitude = Number(restaurant?.longitude);
    if (!address) issues.push('EndereÃ§o ausente.');
    if (cleanAddress && cleanAddress !== address) issues.push(`EndereÃ§o contaminado por texto de interface/telefone; sugerido: ${cleanAddress}.`);
    if (/\b(zap|whats|whatsapp|telefone|tel|ligar)\b/i.test(normalized)) issues.push('EndereÃ§o contÃ©m telefone/WhatsApp ou texto de botÃ£o.');
    if (/\(?\d{2}\)?\s*\d{4,5}[-\s]?\d{4}/.test(address)) issues.push('EndereÃ§o contÃ©m nÃºmero de telefone.');
    if (address && !/(^|\b)(r\.|rua|av\.|avenida|travessa|tv\.|rod\.|rodovia|pra[Ã§c]a|alameda|estrada|shopping)(\b|\s|\.|,)/i.test(address)) {
      issues.push('EndereÃ§o nÃ£o parece comeÃ§ar/indicar logradouro publicÃ¡vel.');
    }
    if (!isUsableCoordinatePair(latitude, longitude)) {
      issues.push('Coordenadas latitude/longitude ausentes ou invÃ¡lidas; app precisa delas para busca por proximidade.');
    }
    return issues;
  };

  const getPublicIdentityIssues = (restaurant: any) => {
    const issues: string[] = [];
    const name = String(restaurant?.name || '').trim();
    const mapsName = String(restaurant?.google_maps_name || '').trim();
    const sourceName = mapsName || name;
    const normalizedName = normalizeText(sourceName);
    const triage = getLeadTriage(restaurant);
    const genericOnly = /^(bar|restaurante|lanchonete|pizzaria|acai|aÃ§aÃ­|cafe|cafÃ©|pastelaria|hamburgueria|delivery)$/i.test(normalizedName);

    if (!sourceName || normalizedName.length < 3) {
      issues.push('Nome pÃºblico ausente ou curto demais para publicar.');
    }
    if (triage.key === 'generic_low_signal' || genericOnly) {
      issues.push('Nome pÃºblico genÃ©rico/fraco; precisa confirmar identidade real no Google Maps/cardÃ¡pio antes de publicar.');
    }
    if (/\b(permanentemente|temporariamente)\s+fechad[oa]\b/i.test(sourceName)) {
      issues.push('Nome pÃºblico contÃ©m status de fechamento do Google; precisa revalidar e remover/rejeitar antes de publicar.');
    }
    if (!String(restaurant?.google_maps_url || '').trim()) {
      issues.push('Link do Google Maps ausente; a Fase 1 deve fornecer a fonte de identidade/localizaÃ§Ã£o antes do Validar IA publicar.');
    }
    return issues;
  };

  const buildMenuQualitySnapshotFromCategories = (inputCategories: any[] = []) => {
    const normalizedCategories = (inputCategories || []).map((category: any, categoryIndex: number) => ({
      id: category.id || `preview-${categoryIndex}`,
      name: category.name || category.category_name || 'CardÃ¡pio',
      order_index: Number(category.order_index ?? categoryIndex),
      items: (category.menu_items || category.items || category.samples || [])
        .sort((a: any, b: any) => Number(a.order_index || 0) - Number(b.order_index || 0))
        .map((item: any, itemIndex: number) => ({
          id: item.id || `preview-item-${categoryIndex}-${itemIndex}`,
          name: item.name,
          description: item.description || item.display_description || '',
          price: Number(item.price ?? item.display_price ?? item.price_min ?? 0),
          image_url: item.image_url || null,
          order_index: Number(item.order_index ?? itemIndex),
        })),
    }));

    const allItems = normalizedCategories.flatMap((category: any) => category.items.map((item: any) => ({ ...item, category: category.name })));
    const junkPatterns = [
      /Ãºltimo update|ultimo update|para o menu|cardÃ¡pio|cardapio$/i,
      /pedido\s+m[iÃ­]n|pedido\s+min|cupom\s+para\s+pagar|aberto\s+at[eÃ©]|loja\s+fechando/i,
      /^almo[cÃ§]o$/i,
      /^destaques$/i,
      /^crian[cÃ§]as$/i,
      /^zero lactose$/i,
      /\u2605|\bavalia[cÃ§][aÃ£]o\b|\bcomida:\s*\d|\batmosfera:\s*\d/i,
    ];
    const unrelatedRestaurantNames = ['fresh cake', 'daikÃ´n', 'daikon', 'bar do cuscuz', 'la paloma', 'picanha 200'];
    const junkItems = allItems.filter((item: any) => {
      const text = `${item.name || ''} ${item.description || ''}`;
      const normalized = normalizeText(text);
      return junkPatterns.some(pattern => pattern.test(text)) ||
        unrelatedRestaurantNames.some(name => normalized.includes(normalizeText(name)));
    });
    const pricedItems = allItems.filter((item: any) => Number(item.price || 0) > 0);
    const priceCoverage = allItems.length ? pricedItems.length / allItems.length : 0;

    return {
      categories: normalizedCategories,
      itemCount: allItems.length,
      pricedItemCount: pricedItems.length,
      priceCoverage,
      junkItemCount: junkItems.length,
      junkExamples: junkItems.slice(0, 8),
    };
  };

  const getMenuQualitySnapshot = async (restaurantId: string) => {
    const { data: categories, error } = await supabase
      .from('menu_categories')
      .select('id, name, order_index, menu_items(id, name, description, price, image_url, order_index)')
      .eq('restaurant_id', restaurantId)
      .order('order_index', { ascending: true });
    if (error) throw error;

    const normalizedCategories = (categories || []).map((category: any) => ({
      id: category.id,
      name: category.name,
      order_index: category.order_index,
      items: (category.menu_items || [])
        .sort((a: any, b: any) => Number(a.order_index || 0) - Number(b.order_index || 0))
        .map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: Number(item.price || 0),
          image_url: item.image_url,
          order_index: item.order_index,
        })),
    }));

    const allItems = normalizedCategories.flatMap((category: any) => category.items.map((item: any) => ({ ...item, category: category.name })));
    const junkPatterns = [
      /Ãºltimo update|ultimo update|para o menu|cardÃ¡pio|cardapio$/i,
      /pedido\s+m[iÃ­]n|pedido\s+min|cupom\s+para\s+pagar|aberto\s+at[eÃ©]|loja\s+fechando/i,
      /^almo[cÃ§]o$/i,
      /^destaques$/i,
      /^crian[cÃ§]as$/i,
      /^zero lactose$/i,
      /â˜…|\bavalia[cÃ§][aÃ£]o\b|\bcomida:\s*\d|\batmosfera:\s*\d/i,
    ];
    const unrelatedRestaurantNames = ['fresh cake', 'daikÃ´n', 'daikon', 'bar do cuscuz', 'la paloma', 'picanha 200'];
    const junkItems = allItems.filter((item: any) => {
      const text = `${item.name || ''} ${item.description || ''}`;
      const normalized = normalizeText(text);
      return junkPatterns.some(pattern => pattern.test(text)) ||
        unrelatedRestaurantNames.some(name => normalized.includes(normalizeText(name)));
    });
    const pricedItems = allItems.filter((item: any) => Number(item.price || 0) > 0);
    const priceCoverage = allItems.length ? pricedItems.length / allItems.length : 0;

    return {
      categories: normalizedCategories,
      itemCount: allItems.length,
      pricedItemCount: pricedItems.length,
      priceCoverage,
      junkItemCount: junkItems.length,
      junkExamples: junkItems.slice(0, 8),
    };
  };

  const toMenuNumber = (value: any, fallback = 0) => {
    if (value === null || value === undefined || value === '') return fallback;
    const parsed = Number(String(value).replace(/[^\d.,-]/g, '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const toNullableMenuNumber = (value: any) => {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(String(value).replace(/[^\d.,-]/g, '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  };

  const cleanOptionNameForSearchLabel = (value: any) => String(value || '')
    .replace(/^\s*(?:\d+\s*\/\s*\d+|1\/2|meia|meio)\s*/i, '')
    .replace(/^\s*(?:add|adc|adicional)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  const buildSearchableOptionLabel = (itemName: any, option: any) => {
    const explicit = String(option?.search_label || '').trim();
    if (explicit) return explicit;
    if (!option?.is_searchable_variant) return null;
    const baseName = String(itemName || '').trim();
    const optionName = cleanOptionNameForSearchLabel(option?.name);
    if (!baseName) return optionName || null;
    if (!optionName) return baseName || null;
    const baseKey = normalizeText(baseName);
    const optionKey = normalizeText(optionName);
    if (optionKey && baseKey.includes(optionKey)) return baseName;
    return `${baseName} - ${optionName}`.trim() || null;
  };

  const normalizeComboComponents = (item: any) => {
    const source = Array.isArray(item?.combo_components)
      ? item.combo_components
      : Array.isArray(item?.comboComponents)
        ? item.comboComponents
        : [];

    return source
      .map((component: any, componentIndex: number) => {
        const items = Array.isArray(component?.items)
          ? component.items
          : Array.isArray(component?.options)
            ? component.options
            : [];
        const type = String(
          component?.type ||
          component?.kind ||
          (items.length ? 'choice_group' : 'fixed_item')
        ).trim();
        const normalizedType = ['fixed_item', 'choice_group', 'addon_group', 'upsell_group'].includes(type)
          ? type
          : (items.length ? 'choice_group' : 'fixed_item');
        const name = String(component?.name || component?.title || component?.label || '').trim();
        const normalizedItemsFromComponent = (rawItems: any[]) => rawItems
          .map((option: any, optionIndex: number) => {
            const optionName = String(option?.name || option?.title || option?.label || '').trim();
            if (isBinaryOrInterfaceOptionName(optionName)) return null;
            return {
              name: optionName,
              description: String(option?.description || '').trim() || null,
              quantity: toNullableMenuNumber(option?.quantity) ?? 1,
              price: optionPriceLooksLikeVolume(optionName, option?.price) ? null : toNullableMenuNumber(option?.price),
              price_delta: optionPriceLooksLikeVolume(optionName, option?.price_delta ?? option?.delta) ? null : toNullableMenuNumber(option?.price_delta ?? option?.delta),
              price_behavior: String(option?.price_behavior || component?.price_behavior || '').trim() || null,
              image_url: String(option?.image_url || option?.imageUrl || '').trim() || null,
              is_default: Boolean(option?.is_default),
              is_searchable_variant: option?.is_searchable_variant !== false,
              search_label: String(option?.search_label || '').trim() || null,
              search_aliases: String(option?.search_aliases || '').trim() || null,
              order_index: Number(option?.order_index ?? optionIndex),
              choice_groups: Array.isArray(option?.choice_groups || option?.choiceGroups)
                ? normalizeComboComponents({ combo_components: option.choice_groups || option.choiceGroups })
                : [],
            };
          })
          .filter((option: any) => option && option.name.length >= 2);

        const normalizedItems = items
          ? normalizedItemsFromComponent(items)
          : [];
        const nestedChoiceGroups = Array.isArray(component?.choice_groups || component?.choiceGroups)
          ? normalizeComboComponents({ combo_components: component.choice_groups || component.choiceGroups })
          : [];

        return {
          type: normalizedType,
          name: name || (normalizedType === 'fixed_item' ? 'Item incluso' : 'Escolhas do combo'),
          description: String(component?.description || '').trim() || null,
          quantity: toNullableMenuNumber(component?.quantity) ?? 1,
          min_quantity: Number(component?.min_quantity ?? component?.min ?? (normalizedType === 'choice_group' ? 1 : 0)),
          max_quantity: component?.max_quantity ?? component?.max ?? (normalizedType === 'choice_group' ? 1 : null),
          is_required: Boolean(component?.is_required ?? normalizedType === 'choice_group'),
          price: toNullableMenuNumber(component?.price),
          price_delta: toNullableMenuNumber(component?.price_delta ?? component?.delta),
          price_behavior: String(component?.price_behavior || '').trim() || (normalizedType === 'fixed_item' ? 'included' : null),
          semantic_type: normalizedType === 'fixed_item' ? 'combo_component' : normalizedType,
          order_index: Number(component?.order_index ?? componentIndex),
          items: normalizedItems,
          choice_groups: nestedChoiceGroups,
          parent_component_name: String(component?.parent_component_name || component?.parentComponentName || '').trim() || null,
          raw_data: component,
        };
      })
      .filter((component: any) => component.name.length >= 2 || component.items.length);
  };

  const comboComponentsToOptions = (comboComponents: any[]) => {
    const optionRows: any[] = [];
    const pushNestedChoiceGroups = (parentComponent: any) => {
      const nestedGroups = Array.isArray(parentComponent?.choice_groups || parentComponent?.choiceGroups)
        ? (parentComponent.choice_groups || parentComponent.choiceGroups)
        : [];
      for (const nestedGroup of nestedGroups) {
        const nestedItems = Array.isArray(nestedGroup?.items) ? nestedGroup.items : [];
        const nestedGroupName = [parentComponent.name, nestedGroup.name || 'OpÃ§Ãµes'].filter(Boolean).join(' > ');
        const nestedBaseOption = {
          group_name: nestedGroupName,
          min_quantity: Number(nestedGroup.min_quantity || 0),
          max_quantity: nestedGroup.max_quantity == null ? null : Number(nestedGroup.max_quantity),
          is_required: Boolean(nestedGroup.is_required),
          group_order_index: Number(nestedGroup.order_index || 0),
          semantic_type: nestedGroup.semantic_type || (nestedGroup.type === 'addon_group' ? 'addon' : 'combo_choice'),
          price_behavior: nestedGroup.price_behavior || 'unknown',
          is_searchable_variant: nestedGroup.type !== 'addon_group',
          ai_reason: `Grupo interno do combo atrelado a ${parentComponent.name}`,
        };
        for (const option of nestedItems) {
          if (isBinaryOrInterfaceOptionName(option?.name)) continue;
          optionRows.push({
            ...nestedBaseOption,
            name: option.name,
            description: option.description,
            price: option.price,
            price_delta: option.price_delta,
            price_behavior: option.price_behavior || nestedBaseOption.price_behavior,
            is_searchable_variant: option.is_searchable_variant !== false && nestedGroup.type !== 'addon_group',
            search_label: option.search_label || [parentComponent.name, option.name].filter(Boolean).join(' '),
            search_aliases: option.search_aliases || null,
            order_index: Number(option.order_index || 0),
            raw_data: { source: 'nested_combo_choice_group', parentComponent, nestedGroup, option },
          });
        }
      }
    };

    for (const component of comboComponents || []) {
      const groupName = component.type === 'fixed_item'
        ? 'Itens inclusos'
        : component.name || 'Escolhas do combo';
      const groupSemantic = component.type === 'fixed_item'
        ? 'combo_component'
        : component.type === 'addon_group'
          ? 'addon'
          : component.type === 'upsell_group'
            ? 'upsell'
            : 'combo_choice';
      const baseOption = {
        group_name: groupName,
        min_quantity: Number(component.min_quantity || 0),
        max_quantity: component.max_quantity == null ? null : Number(component.max_quantity),
        is_required: Boolean(component.is_required),
        group_order_index: Number(component.order_index || 0),
        semantic_type: groupSemantic,
        price_behavior: component.price_behavior || (component.type === 'fixed_item' ? 'included' : 'unknown'),
        is_searchable_variant: component.type !== 'addon_group',
        ai_reason: component.description || null,
      };

      if (Array.isArray(component.items) && component.items.length) {
        for (const option of component.items) {
          if (isBinaryOrInterfaceOptionName(option?.name)) continue;
          optionRows.push({
            ...baseOption,
            name: option.name,
            description: option.description,
            price: option.price,
            price_delta: option.price_delta,
            price_behavior: option.price_behavior || baseOption.price_behavior,
            is_searchable_variant: option.is_searchable_variant !== false && component.type !== 'addon_group',
            search_label: option.search_label || null,
            search_aliases: option.search_aliases || null,
            order_index: Number(option.order_index || 0),
            raw_data: { source: 'combo_components', component, option },
          });
          pushNestedChoiceGroups(option);
        }
      } else {
        optionRows.push({
          ...baseOption,
          name: `${component.quantity && Number(component.quantity) > 1 ? `${component.quantity}x ` : ''}${component.name}`,
          description: component.description,
          price: component.price,
          price_delta: component.price_delta,
          order_index: 0,
          raw_data: { source: 'combo_components', component },
        });
        pushNestedChoiceGroups(component);
      }
    }
    return optionRows;
  };

  const normalizeItemOptionRows = (item: any) => {
    const rows: any[] = [];

    const addOption = (option: any, group: any = {}, groupIndex = 0, optionIndex = 0) => {
      const name = String(option?.name || option?.title || option?.label || '').trim();
      if (name.length < 2) return;
      const groupName = String(option?.group_name || option?.groupName || group?.name || group?.group_name || 'OpÃ§Ãµes').trim() || 'OpÃ§Ãµes';
      const normalizedGroupName = normalizeText(groupName);
      const isOperationalBinaryGroup = /^(deseja|quer|precisa|adicionar|enviar|retirar).*(ketchup|talher|guardanapo|cpf|observacao|observaÃ§Ã£o|troco|sacola|descartavel|embalagem)/.test(normalizedGroupName);
      if (isComboCompositionOnlyGroup(groupName)) return;
      if (isNonMenuOperationalChoiceGroup(`${groupName} ${name}`)) return;
      if (isOperationalBinaryGroup && isBinaryOrInterfaceOptionName(name)) return;
      const safePrice = optionPriceLooksLikeVolume(name, option?.price) ? null : toNullableMenuNumber(option?.price);
      const safePriceDelta = optionPriceLooksLikeVolume(name, option?.price_delta ?? option?.delta) ? null : toNullableMenuNumber(option?.price_delta ?? option?.delta);
      rows.push({
        external_id: String(option?.external_id || option?.id || '').trim() || null,
        group_name: groupName,
        name,
        description: String(option?.description || option?.descript || '').trim() || null,
        image_url: String(option?.image_url || option?.imageUrl || option?.photo || '').trim() || null,
        price: safePrice,
        price_delta: safePriceDelta,
        min_quantity: Number(option?.min_quantity ?? option?.min ?? group?.min_quantity ?? group?.min ?? 0),
        max_quantity: option?.max_quantity ?? option?.max ?? group?.max_quantity ?? group?.max ?? null,
        is_required: Boolean(option?.is_required ?? group?.is_required ?? group?.required ?? false),
        semantic_type: String(option?.semantic_type || group?.semantic_type || '').trim() || null,
        price_behavior: String(option?.price_behavior || group?.price_behavior || '').trim() || null,
        is_searchable_variant: Boolean(option?.is_searchable_variant),
        search_label: String(option?.search_label || '').trim() || null,
        search_aliases: String(option?.search_aliases || '').trim() || null,
        order_index: Number(option?.order_index ?? optionIndex),
        group_order_index: Number(option?.group_order_index ?? group?.order_index ?? groupIndex),
        ai_confidence: option?.ai_confidence === null || option?.ai_confidence === undefined ? null : Number(option.ai_confidence),
        ai_reason: String(option?.ai_reason || group?.ai_reason || '').trim() || null,
        raw_data: option?.raw_data || option,
      });
    };

    const visitGroup = (group: any, groupIndex: number) => {
      const children = Array.isArray(group?.items)
        ? group.items
        : Array.isArray(group?.options)
          ? group.options
          : [];
      if (children.length) {
        children.forEach((option: any, optionIndex: number) => addOption(option, group, groupIndex, optionIndex));
      } else {
        addOption(group, {}, groupIndex, Number(group?.order_index ?? groupIndex));
      }
    };

    if (Array.isArray(item?.option_groups)) {
      item.option_groups.forEach((group: any, groupIndex: number) => visitGroup(group, groupIndex));
    }
    if (Array.isArray(item?.options)) {
      item.options.forEach((optionOrGroup: any, index: number) => {
        const hasNestedItems = Array.isArray(optionOrGroup?.items) || Array.isArray(optionOrGroup?.options);
        if (hasNestedItems) visitGroup(optionOrGroup, index);
        else addOption(optionOrGroup, {}, Number(optionOrGroup?.group_order_index ?? 0), index);
      });
    }

    const seen = new Set<string>();
    return rows.filter((option: any) => {
      const key = [
        normalizeText(option.group_name),
        normalizeText(option.name),
        option.price ?? '',
        option.price_delta ?? '',
      ].join('::');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const countStructuredOptions = (categories: any[] = []) => categories.reduce((total: number, category: any) => (
    total + (category.items || category.menu_items || []).reduce((itemTotal: number, item: any) => {
      const optionCount = normalizeItemOptionRows(item).length;
      const comboCount = Array.isArray(item?.combo_components)
        ? item.combo_components.reduce((sum: number, component: any) => sum + 1 + ((component.items || component.options || []).length || 0), 0)
        : 0;
      return itemTotal + optionCount + comboCount;
    }, 0)
  ), 0);

  const normalizeItemOptionGroups = (item: any) => {
    const rows = normalizeItemOptionRows(item);
    const groups = new Map<string, any>();
    rows.forEach((option: any) => {
      const groupName = option.group_name || 'OpÃ§Ãµes';
      const groupOrder = Number(option.group_order_index || 0);
      const key = buildOptionGroupKey(option);
      if (!groups.has(key)) {
        groups.set(key, {
          name: groupName,
          min_quantity: option.min_quantity || 0,
          max_quantity: option.max_quantity ?? null,
          is_required: Boolean(option.is_required),
          semantic_type: option.semantic_type || null,
          price_behavior: option.price_behavior || null,
          order_index: groupOrder,
          items: [],
        });
      }
      groups.get(key).items.push(option);
    });
    return [...groups.values()];
  };

  const buildComboComponentSearchText = (comboComponents: any[]) => {
    return (comboComponents || [])
      .flatMap((component: any) => [
        component.name,
        component.description,
        component.type,
        component.parent_component_name,
        buildComboComponentSearchText(component.choice_groups || []),
        ...(component.items || []).flatMap((option: any) => [
          option.name,
          option.description,
          option.search_label,
          option.search_aliases,
          buildComboComponentSearchText(option.choice_groups || []),
        ]),
      ])
      .filter(Boolean)
      .join(' ');
  };

  const inferFixedComboComponentsFromText = (item: any) => {
    const name = String(item?.name || item?.display_name || '').trim();
    const description = String(item?.description || '').trim();
    const text = `${name} ${description}`;
    const normalized = normalizeText(text);
    if (!/(combo|dupla|duplo|pague|leve|\+|duas|dois|2x|3x|4x|refri|coca|bebida)/i.test(normalized)) return [];

    const preferredSource = /(\+|duas|dois|2x|3x|4x|refri|coca|bebida)/i.test(description)
      ? description
      : name;
    const rawPieces = preferredSource
      .replace(/\b(combo|super|big|promocao|promoÃ§Ã£o)\b/gi, ' ')
      .split(/\s*(?:\+|,| e | com )\s*/i)
      .map((piece: string) => piece.trim())
      .filter(Boolean);

    const quantityFromText = (piece: string) => {
      const lower = normalizeText(piece);
      const numeric = lower.match(/\b([2-9])\s*x\b|\b([2-9])\s+(pizza|pizzas|hamburguer|hamburgueres|burguer|burgers|refri|refrigerante|bebida|bebidas)\b/);
      if (numeric) return Number(numeric[1] || numeric[2] || 1);
      if (/\b(duas|dois)\b/.test(lower)) return 2;
      if (/\b(tres|trÃªs)\b/.test(lower)) return 3;
      if (/\b(quatro)\b/.test(lower)) return 4;
      return 1;
    };

    const cleanPiece = (piece: string) => {
      let cleaned = piece
        .replace(/\b(duas|dois|tres|trÃªs|quatro)\b/gi, '')
        .replace(/\b[2-9]\s*x\b/gi, '')
        .replace(/\b[2-9]\s+(?=pizza|pizzas|hamburguer|hamburgueres|burguer|burgers|refri|refrigerante|bebida|bebidas)/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (/^refri$/i.test(cleaned) || /^bebida$/i.test(cleaned)) cleaned = 'Refrigerante';
      if (!cleaned && /pizza/i.test(piece)) cleaned = 'Pizza';
      return cleaned;
    };

    const components = rawPieces
      .map((piece: string, index: number) => ({
        type: 'fixed_item',
        name: cleanPiece(piece),
        quantity: quantityFromText(piece),
        min_quantity: 0,
        max_quantity: null,
        is_required: false,
        price_behavior: 'included',
        semantic_type: 'combo_component',
        order_index: index,
        items: [],
        raw_data: { inferred_from: piece },
      }))
      .filter((component: any) => component.name.length >= 2);

    if (components.length) return components;
    return [{
      type: 'fixed_item',
      name: name || 'Combo',
      quantity: 1,
      min_quantity: 0,
      max_quantity: null,
      is_required: false,
      price_behavior: 'included',
      semantic_type: 'combo_component',
      order_index: 0,
      items: [],
      raw_data: { inferred_from: text },
    }];
  };

  const sourceTextProvesCombo = (item: any, categoryName = '') => {
    const name = String(item?.name || item?.display_name || '').trim();
    const description = String(item?.description || '').trim();
    const normalizedName = normalizeText(name);
    const normalizedDescription = normalizeText(description);
    const normalizedCategory = normalizeText(categoryName);
    const normalizedText = `${normalizedName} ${normalizedDescription}`.trim();

    if (!normalizedText) return false;
    if (/\b(combo|combos|kit|pague|leve|promocao|promoÃ§Ã£o)\b/.test(normalizedText)) return true;
    if (/\b(super\s+big|super\s+pizza|pizza\s+dupla|duas\s+pizzas|dois\s+burg|dois\s+hamburg|2\s*x\s*(pizza|burg|hamburg|refri|bebida))\b/.test(normalizedText)) return true;
    if (/[+]/.test(`${name} ${description}`) && /\b(coca|refri|refrigerante|bebida|batata|pizza|burger|burguer|hamburguer|hambÃºrguer|esfiha|combo)\b/.test(normalizedText)) return true;
    if (/\bpromocoes|promoÃ§Ãµes|promocao|promoÃ§Ã£o\b/.test(normalizedCategory) && /\b(coca|refri|refrigerante|bebida|dupla|duas|dois|combo|kit|[2-9]\s*x)\b/.test(normalizedText)) return true;

    return false;
  };

  const extractLiteralComboPieces = (item: any) => {
    const name = String(item?.name || item?.display_name || '').trim();
    const description = String(item?.description || '').trim();
    const hasNamePlus = /[+]/.test(name);
    const hasDescriptionPlus = /[+]/.test(description);
    const hasQuantityBundle = /\b(duas|dois|tres|trÃªs|quatro|[2-9]\s*x)\b/i.test(`${name} ${description}`);

    let source = '';
    if (hasDescriptionPlus) source = description;
    else if (hasNamePlus) source = name;
    else if (hasQuantityBundle) source = description || name;
    else return [];

    const compositionMatch = source.match(/\b(?:vem\s+com|inclui|acompanha(?:do|da)?\s+de?|cont[eÃ©]m)\s+(.+)$/i);
    if (compositionMatch?.[1]) source = compositionMatch[1];

    source = source
      .replace(/\b(al[eÃ©]m\s+disso|tamb[eÃ©]m|para\s+voc[eÃª]).*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!source) return [];

    const splitByPlus = /[+]/.test(source)
      ? source.split(/\s*\+\s*/g)
      : [source];

    return splitByPlus
      .flatMap((piece: string) => piece.split(/\s+e\s+(?=(?:um|uma|1)\s+)/i))
      .map((piece: string) => piece.replace(/[.;:]+$/g, '').trim())
      .filter((piece: string) => piece.length >= 2);
  };

  const literalComboComponentsFromText = (item: any) => {
    const components = extractLiteralComboPieces(item)
      .map((piece: string, index: number) => ({
        type: 'fixed_item',
        name: (() => {
          const cleaned = piece
            .replace(/\b(duas|dois|tres|trÃªs|quatro)\b/gi, '')
            .replace(/\b[2-9]\s*x\b/gi, '')
            .replace(/\b[2-9]\s+(?=pizza|pizzas|hamburguer|hamburgueres|burguer|burgers|refri|refrigerante|bebida|bebidas)\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
          return cleaned || piece;
        })(),
        quantity: (() => {
          const lower = normalizeText(piece);
          const numeric = lower.match(/\b([2-9])\s*x\b|\b([2-9])\s+(pizza|pizzas|hamburguer|hamburgueres|burguer|burgers|refri|refrigerante|bebida|bebidas)\b/);
          if (numeric) return Number(numeric[1] || numeric[2] || 1);
          if (/\b(duas|dois)\b/.test(lower)) return 2;
          if (/\b(tres|trÃªs)\b/.test(lower)) return 3;
          if (/\bquatro\b/.test(lower)) return 4;
          return 1;
        })(),
        min_quantity: 0,
        max_quantity: null,
        is_required: false,
        price_behavior: 'included',
        order_index: index,
        raw_data: {
          source: 'literal_combo_text',
          fidelity_rule: 'literal_only_no_rewrite',
          inferred_from: piece,
        },
      }))
      .filter((component: any) => String(component.name || '').trim().length >= 2);

    const seen = new Set<string>();
    return components.filter((component: any) => {
      const key = `${normalizeText(component.name)}::${component.quantity || 1}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const COMBO_BUCKET_KEYWORDS: Record<string, RegExp> = {
    pizza: /\b(pizza|pizzas|sabor|sabores|massa|massas|borda|bordas|calabresa|marguerita|margherita|mussarela|mu[cÃ§]arela|frango|requeijao|catupiry|pepperoni|portuguesa|quatro queijos|4 queijos)\b/i,
    beverage: /\b(coca|coca-cola|cocacola|refri|refrigerante|bebida|bebidas|guarana|guaran[aÃ¡]|fanta|sprite|pepsi|suco|agua|[0-9]+ ?ml|[0-9]+(?:[,.][0-9]+)? ?l\b|lata)\b/i,
    side: /\b(batata|fritas|anel de cebola|onion|acompanhamento|acompanhamentos|molho|molhos)\b/i,
    burger: /\b(burger|burguer|hamburguer|hamb[Ãºu]rguer|x-|smash|artesanal|salada|bacon|cheddar)\b/i,
    dessert: /\b(sobremesa|doce|brownie|chocolate|bolo|pudim)\b/i,
  };

  const comboBucketForText = (value: any) => {
    const text = normalizeText(value);
    if (!text) return 'unknown';
    for (const [bucket, pattern] of Object.entries(COMBO_BUCKET_KEYWORDS)) {
      if (pattern.test(text)) return bucket;
    }
    return 'unknown';
  };

  const comboBucketForOptionGroup = (groupName: any, options: any[] = []) => {
    const groupBucket = comboBucketForText(groupName);
    if (groupBucket !== 'unknown') return groupBucket;

    const counts = new Map<string, number>();
    for (const option of options) {
      const bucket = comboBucketForText(`${option?.name || ''} ${option?.description || ''}`);
      if (bucket !== 'unknown') counts.set(bucket, (counts.get(bucket) || 0) + 1);
    }
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    return ranked[0]?.[0] || 'unknown';
  };

  const isBinaryOrInterfaceOptionName = (value: any) => {
    const text = normalizeText(value);
    return /^(sim|nao|nÃ£o|ok|opcao|opÃ§Ã£o|selecionar|escolher)$/.test(text);
  };

  const isNonMenuOperationalChoiceGroup = (value: any) => {
    const text = normalizeText(value);
    return /\b(descartavel|talher|guardanapo|canudo|sacola|embalagem|cpf|troco|nota fiscal|cupom fiscal|observacao|observacoes)\b/.test(text);
  };

  const isComboCompositionOnlyGroup = (value: any) => {
    const text = normalizeText(value);
    return /^(itens? inclusos?|composicao(?: do combo)?|conteudo(?: do combo)?|items? included)$/.test(text);
  };

  const optionPriceLooksLikeVolume = (optionName: any, value: any) => {
    const parsed = toNullableMenuNumber(value);
    if (parsed === null) return false;
    const text = normalizeText(optionName);
    if (/\b350\s*ml\b/.test(text) && parsed === 350) return true;
    if (/\b500\s*ml\b/.test(text) && parsed === 500) return true;
    if (/\b600\s*ml\b/.test(text) && parsed === 600) return true;
    if (/\b700\s*ml\b/.test(text) && parsed === 700) return true;
    if (/\b1\s*l\b/.test(text) && parsed === 1) return true;
    if (/\b1\.5\s*l\b|\b1,5\s*l\b/.test(text) && parsed === 1.5) return true;
    if (/\b2\s*l\b/.test(text) && parsed === 2) return true;
    return false;
  };

  const normalizeComboOptionPriceDelta = (option: any, group: any) => {
    const rawValue = option?.price_delta ?? option?.price;
    if (optionPriceLooksLikeVolume(option?.name, rawValue)) return null;
    return toNullableMenuNumber(rawValue);
  };

  const attachChoiceGroupsToComboFixedItems = (components: any[]) => {
    const fixedItems = components.filter((component: any) => component?.type === 'fixed_item');
    if (fixedItems.length < 2) return components;

    const attachable = new Set(fixedItems.map((component: any) => component));
    const output: any[] = [];

    for (const component of components) {
      if (component?.type === 'fixed_item') {
        output.push({ ...component, choice_groups: Array.isArray(component.choice_groups) ? component.choice_groups : [] });
        continue;
      }

      const options = Array.isArray(component?.items) ? component.items : [];
      if (!options.length || !['choice_group', 'addon_group'].includes(component?.type)) {
        output.push(component);
        continue;
      }

      const buckets = new Map<string, any[]>();
      for (const option of options) {
        if (isBinaryOrInterfaceOptionName(option?.name)) continue;
        const optionBucket = comboBucketForText(`${option?.name || ''} ${option?.description || ''}`);
        const key = optionBucket === 'unknown' ? comboBucketForOptionGroup(component?.name, options) : optionBucket;
        buckets.set(key, [...(buckets.get(key) || []), option]);
      }

      let attachedAny = false;
      for (const [bucket, bucketOptions] of buckets.entries()) {
        const target = fixedItems.find((fixed: any) => comboBucketForText(fixed?.name) === bucket);
        if (!target || !attachable.has(target) || !bucketOptions.length) continue;

        const targetInOutput = output.find((entry: any) => entry === target || (entry?.type === 'fixed_item' && entry?.name === target?.name));
        const normalizedGroup = {
          ...component,
          name: component.name || (bucket === 'pizza' ? `Escolha da ${target.name}` : `OpÃ§Ãµes de ${target.name}`),
          parent_component_name: target.name,
          semantic_type: bucket === 'pizza' ? 'flavor' : bucket === 'beverage' ? 'beverage_choice' : component.semantic_type,
          items: bucketOptions,
          raw_data: {
            ...(component.raw_data || {}),
            source: 'attached_combo_choice_group',
            parent_component_name: target.name,
            bucket,
            fidelity_rule: 'literal_only_grouped_by_menu_semantics',
          },
        };

        if (targetInOutput) {
          targetInOutput.choice_groups = [...(targetInOutput.choice_groups || []), normalizedGroup];
        } else {
          target.choice_groups = [...(target.choice_groups || []), normalizedGroup];
        }
        attachedAny = true;
      }

      if (!attachedAny) output.push(component);
    }

    return output.map((component: any) => {
      if (component?.type !== 'fixed_item') return component;
      const choiceGroups = Array.isArray(component.choice_groups)
        ? component.choice_groups.filter((group: any) => Array.isArray(group?.items) && group.items.length > 0)
        : [];
      return choiceGroups.length ? { ...component, choice_groups: choiceGroups } : component;
    });
  };

  const comboComponentsFromOptionGroups = (item: any, startOrderIndex = 20) => {
    const optionGroups = normalizeItemOptionGroups(item);
    return optionGroups
      .map((group: any, groupIndex: number) => {
        const options = Array.isArray(group.items) ? group.items : [];
        if (!options.length) return null;

        const groupName = String(group.name || group.title || 'Escolhas do combo').trim();
        const semantic = String(group.semantic_type || '').trim();
        const minQuantity = Number(group.min_quantity ?? 0);
        const maxQuantity = group.max_quantity === null || group.max_quantity === undefined
          ? null
          : Number(group.max_quantity);
        const hasPricedOptions = options.some((option: any) => Number(option.price_delta ?? option.price ?? 0) > 0);
        const isRequired = Boolean(group.is_required || minQuantity > 0);
        const normalizedGroupName = normalizeText(groupName);

        const componentType = (
          !isRequired
          && (semantic === 'addon' || semantic === 'upsell' || /adicion|borda|ketchup|molho|extra/.test(normalizedGroupName))
        )
          ? 'addon_group'
          : (
            semantic === 'addon'
            && hasPricedOptions
            && /borda|massa|adicion|extra|molho/.test(normalizedGroupName)
              ? 'addon_group'
              : 'choice_group'
          );

        return {
          type: componentType,
          name: groupName,
          description: null,
          quantity: 1,
          min_quantity: minQuantity,
          max_quantity: maxQuantity,
          is_required: isRequired,
          price_behavior: componentType === 'addon_group' ? 'price_delta' : (group.price_behavior || 'included'),
          semantic_type: componentType === 'addon_group' ? 'combo_addon' : 'combo_choice',
          order_index: startOrderIndex + groupIndex,
          items: options.map((option: any, optionIndex: number) => {
            const optionName = String(option.name || '').trim();
            if (isBinaryOrInterfaceOptionName(optionName)) return null;
            const priceDelta = normalizeComboOptionPriceDelta(option, group);
            const priceBehavior = String(option.price_behavior || group.price_behavior || '').trim()
              || (priceDelta && priceDelta > 0 ? 'price_delta' : 'included');
            return {
              name: optionName,
              description: String(option.description || '').trim() || null,
              quantity: toNullableMenuNumber(option.quantity) ?? 1,
              price: priceBehavior === 'absolute_price' ? priceDelta : null,
              price_delta: priceBehavior === 'price_delta' ? priceDelta : null,
              price_behavior: priceBehavior,
              image_url: String(option.image_url || '').trim() || null,
              is_default: Boolean(option.is_default),
              is_searchable_variant: option.is_searchable_variant !== false && componentType !== 'addon_group',
              search_label: option.search_label || (option.is_searchable_variant !== false && componentType !== 'addon_group' ? optionName : null),
              search_aliases: option.search_aliases || null,
              order_index: Number(option.order_index ?? optionIndex),
              raw_data: {
                source: 'source_option_group_as_combo_component',
                fidelity_rule: 'literal_only_no_rewrite',
                option,
              },
            };
          }).filter((option: any) => option && String(option.name || '').trim().length >= 2),
          raw_data: {
            source: 'source_option_group_as_combo_component',
            fidelity_rule: 'literal_only_no_rewrite',
            group,
          },
        };
      })
      .filter(Boolean);
  };

  const buildLiteralComboComponents = (item: any, categoryName = '') => {
    const explicit = normalizeComboComponents(item);
    if (explicit.length) return attachChoiceGroupsToComboFixedItems(explicit);
    if (!sourceTextProvesCombo(item, categoryName)) return [];

    const fixedComponents = literalComboComponentsFromText(item);
    const optionComponents = comboComponentsFromOptionGroups(item, Math.max(20, fixedComponents.length + 1));
    const components = attachChoiceGroupsToComboFixedItems([...fixedComponents, ...optionComponents]);

    return components.length ? components : [];
  };

  const isGenericPublicMenuCategory = (value: any) => {
    const key = normalizeText(String(value || '')).replace(/[^a-z0-9]+/g, ' ').trim();
    return /^(menu|cardapio|cardapio completo|geral)$/.test(key);
  };

  const removeGenericPublicMenuCategoriesWhenRealExist = (categories: any[] = []) => {
    if (!Array.isArray(categories) || categories.length <= 1) return categories;
    const realCategories = categories.filter((category: any) => !isGenericPublicMenuCategory(category?.name));
    if (!realCategories.length) return categories;
    return realCategories;
  };
  const preferBestMenuImageResolution = (imageUrl: string) => {
    const cleanUrl = String(imageUrl || '').trim();
    if (/instadelivery-public\.nyc3\.cdn\.digitaloceanspaces\.com\/itens\//i.test(cleanUrl)) {
      return cleanUrl.replace(/_(?:75|100|150|200|300|400|600|800)_(?:75|100|150|200|300|400|600|800)(\.(?:jpe?g|png|webp|avif)(?:[?#].*)?)$/i, '$1');
    }
    return cleanUrl;
  };
  const collectMenuImageUrlsFromObject = (item: any): string[] => {
    const urls: string[] = [];
    const pushUrl = (value: any) => {
      const url = preferBestMenuImageResolution(String(value || '').trim());
      if (!url) return;
      if (!/^https?:\/\//i.test(url) && !/^data:image\//i.test(url)) return;
      if (/^data:video\//i.test(url) || /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(url)) return;
      if (/placeholder|blank|sprite|avatar|icon|logo|no[_-]?image|sem[_-]?foto|default[_-]?image/i.test(url)) return;
      const looksLikeImage = /^data:image\//i.test(url)
        || /\.(jpg|jpeg|png|gif|webp|avif)(\?|#|$)/i.test(url)
        || /(googleusercontent|fbcdn|cdninstagram|cdn|cloudinary|client-assets|storage\.googleapis|mitiendanube|nuvemshop|anota|instadelivery-public)/i.test(url);
      if (!looksLikeImage) return;
      urls.push(url);
    };
    const visit = (value: any, depth = 0) => {
      if (!value || depth > 4) return;
      if (typeof value === 'string') {
        pushUrl(value);
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((entry) => visit(entry, depth + 1));
        return;
      }
      if (typeof value !== 'object') return;
      [
        value.image_url,
        value.imageUrl,
        value.photo,
        value.photo_url,
        value.photoUrl,
        value.thumbnail_url,
        value.thumbnailUrl,
        value.url_image,
        value.image,
        value.src,
        value.url,
      ].forEach(pushUrl);
      [
        value.images,
        value.image_urls,
        value.imageUrls,
        value.extra_image_urls,
        value.extraImageUrls,
        value.gallery_images,
        value.photos,
      ].forEach((list) => visit(list, depth + 1));
      visit(value.raw_data, depth + 1);
      visit(value.rawData, depth + 1);
      visit(value.detail, depth + 1);
      visit(value.productDetail, depth + 1);
      visit(value.anota_detail, depth + 1);
      visit(value.detailPayload, depth + 1);
    };
    visit(item, 0);
    const seen = new Set<string>();
    return urls.filter((url) => {
      const key = url.replace(/[?#].*$/, '');
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const extractBestMenuImageUrl = (item: any) => collectMenuImageUrlsFromObject(item)[0] || '';

  const escapeRegexText = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const cleanMenuItemDescription = (description: any, currentName: any, siblingNames: string[] = []) => {
    let text = String(description || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) return '';

    const cutAtPatterns = [
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
      /\bCopyright\b/i,
      /\bTodos os direitos reservados\b/i,
      /\b(Rua|R\.|Avenida|Av\.|Travessa|Tv\.|PraÃ§a|Praca)\s+[A-Za-zÀ-ÖØ-öø-ÿ][^.;|]{4,90},?\s*\d+/i,
      /\b(In[iÃ­]cio|Produtos|Contato|Carrinho|Entrar|Minha conta)\b/i,
    ];

    let cutIndex = text.length;
    for (const pattern of cutAtPatterns) {
      const match = pattern.exec(text);
      if (match?.index !== undefined && match.index >= 0) {
        cutIndex = Math.min(cutIndex, match.index);
      }
    }

    const normalizedCurrentName = normalizeText(currentName);
    for (const siblingName of siblingNames) {
      const cleanSiblingName = String(siblingName || '').trim();
      if (cleanSiblingName.length < 4 || normalizeText(cleanSiblingName) === normalizedCurrentName) continue;
      const match = new RegExp(`(^|[\\sâ€¢|,.;:-])${escapeRegexText(cleanSiblingName)}([\\sâ€¢|,.;:-]|$)`, 'i').exec(text);
      if (match?.index !== undefined && match.index > 24) {
        cutIndex = Math.min(cutIndex, match.index + (match[1] ? match[1].length : 0));
      }
    }

    if (cutIndex < text.length) {
      text = text.slice(0, cutIndex).trim();
    }

    text = text
      .replace(/\s+[â€¢|,.;:-]\s*$/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    const normalizedDescription = normalizeText(text);
    if (!text || normalizedDescription === normalizedCurrentName) return '';
    return text;
  };

  const normalizeAuditMenu = (categories: any[]) => {
    const junkName = /^(Ãºltimo update:?|para o menu|cardÃ¡pio|cardapio|destaques)$/i;
    const normalizedCategories = (Array.isArray(categories) ? categories : [])
      .map((category: any) => ({
        name: String(category?.name || 'CardÃ¡pio').trim(),
        items: (Array.isArray(category?.items) ? category.items : [])
          .map((item: any) => {
            const categoryName = String(category?.name || '').trim();
            const explicitPriceSource = normalizeText(item?.price_source || '');
            const priceTypeHint = normalizeText(item?.price_type || '');
            const basePriceCandidate = toNullableMenuNumber(item?.price ?? item?.display_price);
            const priceMinCandidate = toNullableMenuNumber(item?.price_min);
            const canUsePriceMinAsBase = priceMinCandidate !== null
              && priceMinCandidate > 0
              && !/(option|required|range|starting|a partir)/.test(`${explicitPriceSource} ${priceTypeHint}`);
            const sourcePrice = basePriceCandidate !== null && basePriceCandidate > 0
              ? basePriceCandidate
              : (canUsePriceMinAsBase ? priceMinCandidate : 0);
            const explicitComboComponents = normalizeComboComponents(item);
            const explicitOptions = normalizeItemOptionRows(item);
            const inferredCommercialType = String(item?.commercial_type || item?.commercial_kind || (explicitOptions.length ? 'configurable_item' : 'simple_item')).trim();
            const inferredComboComponents = explicitComboComponents;
            const options = explicitOptions
              .filter((option: any) => option.name.length >= 2);
            const optionAbsolutePriceValues = options
              .map((option: any) => {
                const behavior = normalizeText(option?.price_behavior || '');
                const hasDelta = option?.price_delta !== null && option?.price_delta !== undefined;
                if (/(absolute|option only|preco absoluto|preco final)/.test(behavior)) {
                  return toNullableMenuNumber(option.price);
                }
                if (!hasDelta && !/(delta|acresc|adicional)/.test(behavior)) {
                  return toNullableMenuNumber(option.price);
                }
                return null;
              })
              .filter((value: any) => value !== null && value > 0);
            const price = sourcePrice > 0
              ? sourcePrice
              : (optionAbsolutePriceValues.length ? Math.min(...optionAbsolutePriceValues) : 0);
            const commercialType = inferredComboComponents.length
              ? 'combo_builder'
              : (inferredCommercialType === 'combo_builder'
                ? (options.length ? 'configurable_item' : 'simple_item')
                : inferredCommercialType);
            const explicitPriceType = String(item?.price_type || '').trim();
            const hasVariableComboChoice = inferredComboComponents.some((component: any) => component.type !== 'fixed_item');
            const priceType = commercialType === 'combo_builder' && !hasVariableComboChoice
              ? 'fixed'
              : (explicitPriceType || (commercialType === 'combo_builder' ? 'fixed' : (options.length ? 'starting_at' : 'fixed')));
            const shouldTrustProvidedRange = sourcePrice > 0 || canUsePriceMinAsBase;
            const priceMin = item?.price_min === null || item?.price_min === undefined || !shouldTrustProvidedRange
              ? price
              : toMenuNumber(item.price_min, price);
            const priceMax = item?.price_max === null || item?.price_max === undefined || !shouldTrustProvidedRange
              ? (sourcePrice > 0 ? sourcePrice : (optionAbsolutePriceValues.length ? Math.max(...optionAbsolutePriceValues) : price))
              : toMenuNumber(item.price_max, price);
            const itemImageUrls = collectMenuImageUrlsFromObject(item);
            const itemImageUrl = itemImageUrls[0] || '';
            const itemName = String(item?.name || item?.display_name || '').trim();
            const siblingNames = (Array.isArray(category?.items) ? category.items : [])
              .map((sibling: any) => String(sibling?.name || sibling?.display_name || '').trim())
              .filter((name: string) => name && name !== itemName);
            const cleanedDescription = cleanMenuItemDescription(item?.description, itemName, siblingNames);
            const rawData = typeof item?.raw_data === 'object' && item.raw_data !== null
              ? {
                ...item.raw_data,
                image_url: itemImageUrl || item.raw_data.image_url || item.raw_data.imageUrl || null,
                image_urls: itemImageUrls,
                original_description: item.raw_data.original_description || item?.description || '',
                description_cleaned: cleanedDescription !== String(item?.description || '').trim(),
                combo_components: inferredComboComponents,
                combo_rules: item?.combo_rules || item?.comboRules || null,
                combo_structuring_policy: inferredComboComponents.length ? 'literal_source_only_preserve_original_menu' : undefined,
              }
              : {
                ...item,
                image_url: itemImageUrl || null,
                image_urls: itemImageUrls,
                original_description: item?.description || '',
                description_cleaned: cleanedDescription !== String(item?.description || '').trim(),
                combo_components: inferredComboComponents,
                combo_rules: item?.combo_rules || item?.comboRules || null,
                combo_structuring_policy: inferredComboComponents.length ? 'literal_source_only_preserve_original_menu' : undefined,
              };
            return {
              name: itemName,
              description: cleanedDescription,
              price,
              display_price: toMenuNumber(item?.display_price ?? price, price),
              price_type: priceType,
              price_min: priceMin,
              price_max: priceMax,
              commercial_type: commercialType,
              is_configurable: Boolean(item?.is_configurable || options.length || inferredComboComponents.length || commercialType === 'combo_builder'),
              image_url: itemImageUrl || null,
              search_display_name: String(item?.search_display_name || item?.display_name || item?.name || '').trim(),
              search_keywords: [String(item?.search_keywords || '').trim(), buildComboComponentSearchText(inferredComboComponents)].filter(Boolean).join(' '),
              options,
              combo_components: inferredComboComponents,
              combo_rules: item?.combo_rules || item?.comboRules || null,
              raw_data: rawData,
            };
          })
          .filter((item: any) => (
            item.name.length >= 3
            && !junkName.test(item.name)
            && (
              item.price > 0
              || (Array.isArray(item.options) && item.options.length > 0)
              || (Array.isArray(item.combo_components) && item.combo_components.length > 0)
            )
          )),
      }))
      .filter((category: any) => category.name.length >= 3 && category.items.length > 0);
    return removeGenericPublicMenuCategoriesWhenRealExist(normalizedCategories);
  };

  const dedupeExactAuditMenuItems = (categories: any[] = []) => {
    let removedCount = 0;
    const normalizedValue = (value: any) => normalizeText(String(value ?? '')).replace(/[^a-z0-9]+/g, ' ').trim();
    const moneyValue = (value: any) => {
      const parsed = toNullableMenuNumber(value);
      return parsed === null ? '' : parsed.toFixed(2);
    };
    const optionSignature = (item: any) => normalizeItemOptionRows(item)
      .map((option: any) => [
        normalizedValue(option.group_name),
        normalizedValue(option.name),
        normalizedValue(option.description),
        moneyValue(option.price),
        moneyValue(option.price_delta),
        option.min_quantity ?? '',
        option.max_quantity ?? '',
        option.is_required ? '1' : '0',
        normalizedValue(option.semantic_type),
        normalizedValue(option.price_behavior),
      ].join(':'))
      .sort()
      .join('|');
    const componentSignature = (components: any[] = []): string => JSON.stringify((Array.isArray(components) ? components : [])
      .map((component: any) => ({
        type: normalizedValue(component?.type),
        name: normalizedValue(component?.name || component?.title || component?.label),
        description: normalizedValue(component?.description),
        quantity: component?.quantity ?? '',
        min_quantity: component?.min_quantity ?? component?.min ?? '',
        max_quantity: component?.max_quantity ?? component?.max ?? '',
        is_required: Boolean(component?.is_required ?? component?.required),
        price_behavior: normalizedValue(component?.price_behavior),
        items: (Array.isArray(component?.items) ? component.items : Array.isArray(component?.options) ? component.options : [])
          .map((item: any) => ({
            name: normalizedValue(item?.name || item?.title || item?.label),
            description: normalizedValue(item?.description),
            price: moneyValue(item?.price),
            price_delta: moneyValue(item?.price_delta ?? item?.delta),
            price_behavior: normalizedValue(item?.price_behavior),
          }))
          .sort((a: any, b: any) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
      }))
      .sort((a: any, b: any) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
    const itemSignature = (item: any) => [
      normalizedValue(item?.name || item?.display_name),
      normalizedValue(item?.description),
      moneyValue(item?.price),
      moneyValue(item?.display_price),
      moneyValue(item?.price_min),
      moneyValue(item?.price_max),
      normalizedValue(item?.price_type),
      normalizedValue(item?.commercial_type),
      String(item?.is_configurable ? '1' : '0'),
      String(item?.image_url || '').trim(),
      optionSignature(item),
      componentSignature(item?.combo_components || item?.comboComponents || []),
    ].join('||');

    const menu = (Array.isArray(categories) ? categories : []).map((category: any) => {
      const seen = new Set<string>();
      const items = (Array.isArray(category?.items) ? category.items : []).filter((item: any) => {
        const signature = itemSignature(item);
        if (seen.has(signature)) {
          removedCount += 1;
          return false;
        }
        seen.add(signature);
        return true;
      });
      return { ...category, items };
    }).filter((category: any) => Array.isArray(category.items) && category.items.length > 0);

    return { menu, removedCount };
  };

  const buildMenuSourceEvidence = (categories: any[] = [], rawText = '') => {
    const chunks: string[] = [String(rawText || '')];
    const categoryNames = new Set<string>();
    const itemNames = new Set<string>();
    const optionNames = new Set<string>();

    const addChunk = (value: any) => {
      const text = String(value || '').trim();
      if (text) chunks.push(text);
      return normalizeText(text);
    };

    const visitOptions = (options: any[] = []) => {
      for (const option of options || []) {
        const groupName = addChunk(option?.group_name || option?.groupName || option?.group || '');
        const optionName = addChunk(option?.name || option?.title || option?.label || '');
        addChunk(option?.description || '');
        addChunk(option?.search_label || '');
        addChunk(option?.search_aliases || '');
        if (groupName) optionNames.add(groupName);
        if (optionName) optionNames.add(optionName);
        const nestedItems = Array.isArray(option?.items)
          ? option.items
          : Array.isArray(option?.options)
            ? option.options
            : [];
        if (nestedItems.length) {
          visitOptions(nestedItems.map((nested: any) => ({
            ...nested,
            group_name: nested?.group_name || option?.name || option?.group_name || option?.title || '',
          })));
        }
      }
    };

    const visitComboComponents = (components: any[] = []) => {
      for (const component of components || []) {
        const componentName = addChunk(component?.name || component?.title || component?.label || '');
        addChunk(component?.description || '');
        if (componentName) optionNames.add(componentName);
        const items = Array.isArray(component?.items)
          ? component.items
          : Array.isArray(component?.options)
            ? component.options
            : [];
        visitOptions(items.map((item: any) => ({ ...item, group_name: component?.name || component?.title || '' })));
      }
    };

    for (const category of categories || []) {
      const categoryName = addChunk(category?.name || category?.category_name || '');
      if (categoryName) categoryNames.add(categoryName);
      const items = Array.isArray(category?.items)
        ? category.items
        : Array.isArray(category?.menu_items)
          ? category.menu_items
          : Array.isArray(category?.samples)
            ? category.samples
            : [];
      for (const item of items) {
        const itemName = addChunk(item?.name || item?.display_name || item?.title || '');
        addChunk(item?.description || item?.display_description || '');
        addChunk(item?.search_display_name || '');
        addChunk(item?.search_keywords || '');
        if (itemName) itemNames.add(itemName);
        visitOptions(Array.isArray(item?.options) ? item.options : Array.isArray(item?.option_groups) ? item.option_groups : []);
        visitComboComponents(Array.isArray(item?.combo_components) ? item.combo_components : Array.isArray(item?.comboComponents) ? item.comboComponents : []);
      }
    }

    return {
      normalizedText: normalizeText(chunks.join('\n')),
      categoryNames,
      itemNames,
      optionNames,
    };
  };

  const sourceSupportsText = (value: any, evidence: ReturnType<typeof buildMenuSourceEvidence>) => {
    const normalized = normalizeText(String(value || '').trim());
    if (!normalized || normalized.length < 2) return true;
    if (evidence.normalizedText.includes(normalized)) return true;
    const words = normalized.split(/\s+/).filter((word: string) => word.length >= 3);
    if (!words.length) return true;
    return words.every((word: string) => (
      evidence.normalizedText.includes(word)
      || (word.endsWith('s') && word.length > 4 && evidence.normalizedText.includes(word.slice(0, -1)))
      || evidence.normalizedText.includes(`${word}s`)
    ));
  };

  const sourceContainsLiteralText = (value: any, evidence: ReturnType<typeof buildMenuSourceEvidence>) => {
    const normalized = normalizeText(String(value || '').trim());
    if (!normalized || normalized.length < 2) return true;
    return evidence.normalizedText.includes(normalized);
  };

  const hasInventedMarketingTone = (value: any) => {
    const normalized = normalizeText(String(value || ''));
    return /\b(delicios|perfeit|irresistivel|suculent|saboroso|oferta imperdivel|combinacao perfeita|item montavel|valor final conforme|pronto para pedir|desfrute|saboreie)\b/.test(normalized);
  };

  const auditMenuStructuralCoherence = (categories: any[] = []) => {
    const findings: any[] = [];
    const push = (severity: 'info' | 'warning' | 'blocking', type: string, item: string, message: string, fixHint?: string) => {
      findings.push({ severity, type, item, message, fixHint });
    };

    for (const category of categories || []) {
      const categoryName = String(category?.name || '').trim();
      const normalizedCategory = normalizeText(categoryName);
      if (/^(adicionais|acrescimos|acrÃ©scimos|escolha|escolhas|turbine|bora de combo|deseja)/.test(normalizedCategory)) {
        push('warning', 'internal_group_as_public_category', categoryName, 'Categoria parece grupo interno de item, nÃ£o categoria pÃºblica.', 'Mover para option_groups/combo_components do item correspondente.');
      }

      for (const item of (category?.items || [])) {
        const itemName = String(item?.name || '').trim();
        const itemRef = [categoryName, itemName].filter(Boolean).join(' > ');
        if (/^(sim|nao|nÃ£o|ok)$/.test(normalizeText(itemName))) {
          push('blocking', 'binary_option_as_item', itemRef, 'OpÃ§Ã£o binÃ¡ria foi promovida a item pÃºblico.', 'Remover do menu pÃºblico ou manter apenas como pergunta operacional nÃ£o pesquisÃ¡vel.');
        }

        const groups = Array.isArray(item?.option_groups) ? item.option_groups : Array.isArray(item?.options) ? item.options : [];
        for (const group of groups) {
          const groupName = String(group?.name || group?.group_name || '').trim();
          const groupItems = Array.isArray(group?.items) ? group.items : [];
          const binaryCount = groupItems.filter((option: any) => isBinaryOrInterfaceOptionName(option?.name)).length;
          if (binaryCount >= 2 && /^(deseja|quer|precisa|adicionar|enviar|retirar)/.test(normalizeText(groupName))) {
            push('warning', 'operational_binary_group', `${itemRef} > ${groupName}`, 'Grupo operacional Sim/NÃ£o nÃ£o deve aparecer como adicional pesquisÃ¡vel.', 'Ocultar do cardÃ¡pio pÃºblico ou marcar semantic_type="not_searchable".');
          }
          for (const option of groupItems) {
            if (optionPriceLooksLikeVolume(option?.name, option?.price ?? option?.price_delta)) {
              push('warning', 'volume_saved_as_price', `${itemRef} > ${groupName} > ${option?.name || ''}`, 'Volume em ml/L parece ter sido interpretado como preÃ§o.', 'Zerar price/price_delta se o nÃºmero vier do volume do produto.');
            }
          }
        }

        const comboComponents = Array.isArray(item?.combo_components) ? item.combo_components : [];
        if ((item?.commercial_type || item?.commercialType) === 'combo_builder') {
          const fixedItems = comboComponents.filter((component: any) => component?.type === 'fixed_item');
          if (!comboComponents.length) {
            push('blocking', 'combo_without_components', itemRef, 'Combo sem componentes estruturados.', 'Recoletar detalhes do item ou extrair componentes do texto literal.');
          }
          if (fixedItems.length >= 2) {
            const looseChoiceGroups = comboComponents.filter((component: any) => component?.type === 'choice_group' && Array.isArray(component?.items) && component.items.length > 0);
            const attachableLooseGroups = looseChoiceGroups.filter((component: any) => {
              const bucket = comboBucketForOptionGroup(component?.name, component?.items || []);
              return bucket !== 'unknown' && fixedItems.some((fixed: any) => comboBucketForText(fixed?.name) === bucket);
            });
            if (attachableLooseGroups.length > 0) {
              push('warning', 'combo_choice_group_not_attached', itemRef, 'Grupo de escolha do combo poderia estar atrelado a um item incluso especÃ­fico.', 'Executar attachChoiceGroupsToComboFixedItems antes de salvar/publicar.');
            }
          }
          for (const component of comboComponents) {
            for (const nestedGroup of (component?.choice_groups || [])) {
              for (const option of (nestedGroup?.items || [])) {
                if (optionPriceLooksLikeVolume(option?.name, option?.price ?? option?.price_delta)) {
                  push('warning', 'nested_volume_saved_as_price', `${itemRef} > ${component?.name || ''} > ${nestedGroup?.name || ''} > ${option?.name || ''}`, 'Volume em opÃ§Ã£o interna do combo parece preÃ§o.', 'Zerar price/price_delta se for ml/L.');
                }
              }
            }
          }
        }
      }
    }

    return {
      ok: !findings.some(finding => finding.severity === 'blocking'),
      findings,
      blockingCount: findings.filter(finding => finding.severity === 'blocking').length,
      warningCount: findings.filter(finding => finding.severity === 'warning').length,
    };
  };

  const auditMenuSourceFidelity = (categories: any[] = [], sourceCategories: any[] = [], rawText = '') => {
    const evidence = buildMenuSourceEvidence(sourceCategories, rawText);
    const errors: any[] = [];
    let changed = false;

    const cleanUnsupportedDescription = (item: any) => {
      const description = String(item?.description || '').trim();
      if (!description) return item;
      // DescriÃ§Ã£o Ã© texto publicÃ¡vel: nÃ£o pode ser reconstruÃ­da por palavras soltas.
      // Precisa aparecer como trecho literal na fonte (DOM/texto/OCR/print), ou fica vazia.
      const supported = sourceContainsLiteralText(description, evidence);
      if (supported) return item;
      changed = true;
      errors.push({
        type: 'invented_description',
        severity: 'warning',
        item: item.name || '',
        message: 'Descricao removida porque nao apareceu como trecho literal na fonte original.',
      });
      return { ...item, description: '' };
    };

    const literalSourceSupports = (value: any) => {
      const text = String(value || '').trim();
      if (!text || text.length < 2) return true;
      return sourceContainsLiteralText(text, evidence);
    };

    const optionIsSupported = (option: any) => {
      const optionName = String(option?.name || '').trim();
      return literalSourceSupports(optionName);
    };

    const correctedMenu = (categories || [])
      .map((category: any) => {
        const categoryName = String(category?.name || '').trim();
        if (!literalSourceSupports(categoryName)) {
          errors.push({
            type: 'unsupported_category',
            severity: 'blocking',
            item: categoryName,
            message: 'Categoria nao aparece como texto literal no cardapio original.',
          });
        }

        const items = (Array.isArray(category?.items) ? category.items : [])
          .filter((item: any) => {
            const itemName = String(item?.name || '').trim();
            const supported = literalSourceSupports(itemName);
            if (!supported) {
              changed = true;
              errors.push({
                type: 'invented_item',
                severity: 'blocking',
                item: itemName,
                message: 'Item nao aparece como texto literal no cardapio original; nao pode ser publicado.',
              });
            }
            return supported;
          })
          .map((item: any) => {
            let nextItem = cleanUnsupportedDescription(item);

            const optionGroups = Array.isArray(nextItem.option_groups)
              ? nextItem.option_groups
              : Array.isArray(nextItem.options)
                ? nextItem.options
                : [];
            const filteredOptionGroups = optionGroups.map((group: any) => {
              const groupItems = Array.isArray(group?.items) ? group.items : [];
              if (!groupItems.length) return group;
              const filteredItems = groupItems.filter((option: any) => {
                const supported = optionIsSupported(option);
                if (!supported) {
                  changed = true;
                  errors.push({
                    type: 'unsupported_option',
                    severity: 'blocking',
                    item: `${nextItem.name || ''} > ${option?.name || ''}`,
                    message: 'Opcao/adicional nao encontrado na fonte original.',
                  });
                }
                return supported;
              });
              return { ...group, items: filteredItems };
            }).filter((group: any) => !Array.isArray(group?.items) || group.items.length > 0);

            const comboComponents = Array.isArray(nextItem.combo_components)
              ? nextItem.combo_components
              : [];
            const filteredComboComponents = comboComponents.map((component: any) => {
              const componentItems = Array.isArray(component?.items) ? component.items : [];
              const filteredItems = componentItems.filter((option: any) => {
                const supported = optionIsSupported(option);
                if (!supported) {
                  changed = true;
                  errors.push({
                    type: 'unsupported_option',
                    severity: 'blocking',
                    item: `${nextItem.name || ''} > ${option?.name || ''}`,
                    message: 'Opcao de combo nao encontrada na fonte original.',
                  });
                }
                return supported;
              });
              return { ...component, items: filteredItems };
            }).filter((component: any) => {
              const hasItems = Array.isArray(component?.items) && component.items.length > 0;
              const isFixed = component?.type === 'fixed_item';
              const supportedFixed = isFixed && literalSourceSupports(component?.name || '');
              if (!hasItems && !supportedFixed && component?.type !== 'fixed_item') {
                changed = true;
                errors.push({
                  type: 'unsupported_option',
                  severity: 'blocking',
                  item: `${nextItem.name || ''} > ${component?.name || ''}`,
                  message: 'Grupo de escolha/adicional sem opcoes verificaveis na fonte.',
                });
                return false;
              }
              return hasItems || supportedFixed;
            });

            nextItem = {
              ...nextItem,
              option_groups: filteredOptionGroups,
              options: filteredOptionGroups,
              combo_components: filteredComboComponents,
            };

            const hasStructuredChoices = filteredOptionGroups.some((group: any) => {
              const groupItems = Array.isArray(group?.items) ? group.items : [];
              return groupItems.length > 0;
            }) || normalizeItemOptionRows(nextItem).length > 0;
            if (nextItem.commercial_type === 'combo_builder' && filteredComboComponents.length === 0 && !hasStructuredChoices) {
              errors.push({
                type: 'combo_without_components',
                severity: 'blocking',
                item: nextItem.name || '',
                message: 'Combo sem componentes/opcoes comprovados na fonte; precisa recoletar abrindo o detalhe do item.',
              });
            }

            return nextItem;
          });

        return { ...category, items };
      })
      .filter((category: any) => Array.isArray(category.items) && category.items.length > 0);

    return { errors, correctedMenu, changed };
  };

  const mergeSourceImagesIntoMenu = (categories: any[] = [], sourceCategories: any[] = []) => {
    const imageByName = new Map<string, string>();
    const addSourceItem = (item: any) => {
      const name = normalizeText(String(item?.name || item?.display_name || item?.title || '').trim());
      const imageUrl = extractBestMenuImageUrl(item);
      if (name && imageUrl && !imageByName.has(name)) imageByName.set(name, imageUrl);
    };

    for (const category of sourceCategories || []) {
      const items = Array.isArray(category?.items)
        ? category.items
        : Array.isArray(category?.menu_items)
          ? category.menu_items
          : Array.isArray(category?.samples)
            ? category.samples
            : [];
      items.forEach((item: any) => {
        addSourceItem(item);
      });
    }

    if (!imageByName.size) return categories;

    const imageForName = (value: any) => {
      const itemName = normalizeText(String(value || '').trim());
      if (!itemName) return '';
      const exactImage = imageByName.get(itemName);
      if (exactImage) return exactImage;
      return '';
    };

    const mergeComboOptionImages = (components: any[] = []) => (components || []).map((component: any) => ({
      ...component,
      items: (Array.isArray(component?.items) ? component.items : []).map((option: any) => (
        String(option?.image_url || '').trim()
          ? option
          : { ...option, image_url: imageForName(option?.name) || null }
      ))
    }));

    return (categories || []).map((category: any) => ({
      ...category,
      items: (category.items || []).map((item: any) => {
        const itemImage = String(item?.image_url || '').trim() || imageForName(item?.name || item?.display_name);
        return {
          ...item,
          image_url: itemImage || null,
          combo_components: mergeComboOptionImages(item?.combo_components || []),
        };
      })
    }));
  };

  const preserveStructuredSourceMenuFacts = (
    categories: any[] = [],
    sourceCategories: any[] = [],
    options: { restoreMissingItems?: boolean; forceSourceCategories?: boolean } = {},
  ) => {
    const sourceMenu = mergeSourceImagesIntoMenu(normalizeAuditMenu(sourceCategories), sourceCategories);
    const itemKey = (value: any) => normalizeText(value).replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
    const optionSignature = (item: any) => normalizeItemOptionRows(item)
      .map((option: any) => [
        itemKey(option.group_name),
        itemKey(option.name),
        option.price ?? '',
        option.price_delta ?? '',
        option.min_quantity ?? '',
        option.max_quantity ?? '',
        option.is_required ? '1' : '0',
      ].join(':'))
      .sort()
      .join('|');
    const mainPrice = (item: any) => toNullableMenuNumber(item?.price ?? item?.display_price ?? item?.price_min);
    const priceChanged = (current: any, source: any) => {
      const currentPrice = mainPrice(current);
      const sourcePrice = mainPrice(source);
      if (sourcePrice === null || sourcePrice <= 0) return false;
      if (currentPrice === null || currentPrice <= 0) return true;
      return Math.abs(currentPrice - sourcePrice) > 0.01;
    };

    const allSourceItems: any[] = [];
    const sourceByKey = new Map<string, any[]>();
    sourceMenu.forEach((category: any, categoryIndex: number) => {
      (category.items || []).forEach((item: any, itemIndex: number) => {
        const key = itemKey(item.name || item.display_name);
        if (!key) return;
        const sourceItem = {
          ...item,
          __sourceCategoryName: category.name,
          __sourceCategoryIndex: categoryIndex,
          __sourceItemIndex: itemIndex,
          __sourceKey: key,
        };
        allSourceItems.push(sourceItem);
        const list = sourceByKey.get(key) || [];
        list.push(sourceItem);
        sourceByKey.set(key, list);
      });
    });

    const findSourceItem = (item: any) => {
      const key = itemKey(item?.name || item?.display_name);
      if (!key) return null;
      const exact = sourceByKey.get(key);
      if (exact?.length === 1) return exact[0];
      if (exact?.length && exact.length > 1) {
        const currentPrice = mainPrice(item);
        const samePrice = exact.filter((candidate: any) => {
          const candidatePrice = mainPrice(candidate);
          return currentPrice !== null && candidatePrice !== null && Math.abs(currentPrice - candidatePrice) <= 0.01;
        });
        if (samePrice.length === 1) return samePrice[0];
      }
      const fuzzyCandidates = allSourceItems.filter((candidate: any) => {
        const sourceKey = candidate.__sourceKey || '';
        if (key.length < 10 || sourceKey.length < 10) return false;
        return sourceKey.includes(key) || key.includes(sourceKey);
      });
      return fuzzyCandidates.length === 1 ? fuzzyCandidates[0] : null;
    };

    const matchedSourceKeys = new Set<string>();
    let priceFixes = 0;
    let optionFixes = 0;
    let descriptionFixes = 0;
    let imageFixes = 0;
    let categoryFixes = 0;
    let missingItemsRestored = 0;

    const preserveItem = (item: any, sourceItem: any) => {
      if (!sourceItem) return item;
      matchedSourceKeys.add(sourceItem.__sourceKey);
      const sourceImageUrls = collectMenuImageUrlsFromObject(sourceItem);
      const sourceImageUrl = sourceImageUrls[0] || '';

      if (priceChanged(item, sourceItem)) priceFixes += 1;
      const currentOptionsSignature = optionSignature(item);
      const sourceOptionsSignature = optionSignature(sourceItem);
      if (sourceOptionsSignature && currentOptionsSignature !== sourceOptionsSignature) optionFixes += 1;
      if (normalizeText(item?.description) !== normalizeText(sourceItem?.description)) descriptionFixes += 1;
      if (sourceImageUrl && String(item?.image_url || '').trim() !== sourceImageUrl) imageFixes += 1;

      const sourceOptionRows = normalizeItemOptionRows(sourceItem);
      const sourceOptionGroups = normalizeItemOptionGroups(sourceItem);
      const sourceComboComponents = normalizeComboComponents(sourceItem);
      const sourcePrice = mainPrice(sourceItem) ?? 0;
      const sourcePriceMin = toNullableMenuNumber(sourceItem.price_min) ?? sourcePrice;
      const sourcePriceMax = toNullableMenuNumber(sourceItem.price_max) ?? sourcePriceMin;

      return {
        ...item,
        name: sourceItem.name || item.name,
        description: String(sourceItem.description || '').trim(),
        price: sourcePrice,
        display_price: toNullableMenuNumber(sourceItem.display_price) ?? sourcePrice,
        price_type: sourceItem.price_type || item.price_type || (sourceOptionRows.length ? 'starting_at' : 'fixed'),
        price_min: sourcePriceMin,
        price_max: sourcePriceMax,
        price_source: sourceItem.price_source || item.price_source || (sourceOptionRows.length ? 'native_platform_options' : 'native_platform_item'),
        commercial_type: sourceItem.commercial_type || item.commercial_type || (sourceOptionRows.length ? 'configurable_item' : 'simple_item'),
        is_configurable: Boolean(sourceItem.is_configurable || sourceOptionRows.length || sourceComboComponents.length),
        image_url: sourceImageUrl || null,
        search_display_name: item.search_display_name || sourceItem.search_display_name || sourceItem.name || item.name,
        search_keywords: [
          sourceItem.search_keywords,
          item.search_keywords,
          sourceOptionRows.map((option: any) => `${option.group_name || ''} ${option.name || ''} ${option.search_label || ''}`).join(' '),
          buildComboComponentSearchText(sourceComboComponents),
        ].filter(Boolean).join(' '),
        options: sourceOptionRows.length ? sourceOptionRows : (Array.isArray(sourceItem.options) ? sourceItem.options : item.options || []),
        option_groups: sourceOptionGroups.length ? sourceOptionGroups : (Array.isArray(sourceItem.option_groups) ? sourceItem.option_groups : item.option_groups || []),
        combo_components: sourceComboComponents.length ? sourceComboComponents : (Array.isArray(sourceItem.combo_components) ? sourceItem.combo_components : item.combo_components || []),
        combo_rules: sourceItem.combo_rules || item.combo_rules || null,
        raw_data: {
          ...(typeof item.raw_data === 'object' && item.raw_data !== null ? item.raw_data : {}),
          source_preserved: true,
          source_item_name: sourceItem.name || '',
          source_category_name: sourceItem.__sourceCategoryName || '',
          source_image_url: sourceImageUrl || null,
          source_image_urls: sourceImageUrls,
        },
      };
    };

    let menu = (categories || []).map((category: any) => ({
      ...category,
      items: (Array.isArray(category.items) ? category.items : [])
        .map((item: any) => preserveItem(item, findSourceItem(item))),
    })).filter((category: any) => Array.isArray(category.items) && category.items.length > 0);

    if (options.forceSourceCategories && sourceMenu.length) {
      const categoryByKey = new Map<string, any>();
      const ensureSourceCategory = (name: any, orderIndex: number) => {
        const cleanName = String(name || '').trim() || 'CardÃ¡pio';
        const key = itemKey(cleanName);
        if (!categoryByKey.has(key)) {
          categoryByKey.set(key, {
            name: cleanName,
            items: [],
            __sourceOrder: Number.isFinite(orderIndex) ? orderIndex : 9999,
          });
        }
        return categoryByKey.get(key);
      };

      sourceMenu.forEach((sourceCategory: any, categoryIndex: number) => {
        ensureSourceCategory(sourceCategory?.name, categoryIndex);
      });

      const pushed = new Set<string>();
      menu.forEach((category: any) => {
        const currentCategoryName = String(category?.name || '').trim();
        (category.items || []).forEach((item: any) => {
          const sourceItem = findSourceItem(item);
          const sourceCategoryName = String(sourceItem?.__sourceCategoryName || '').trim();
          const targetCategory = sourceCategoryName
            ? ensureSourceCategory(sourceCategoryName, sourceItem?.__sourceCategoryIndex)
            : ensureSourceCategory(currentCategoryName || 'CardÃ¡pio', 9999);

          if (sourceCategoryName && itemKey(sourceCategoryName) !== itemKey(currentCategoryName)) {
            categoryFixes += 1;
          }

          const signature = [
            itemKey(targetCategory.name),
            itemKey(item?.name || item?.display_name),
            mainPrice(item) ?? '',
          ].join('::');
          if (pushed.has(signature)) return;
          pushed.add(signature);
          targetCategory.items.push(item);
        });
      });

      menu = [...categoryByKey.values()]
        .filter((category: any) => Array.isArray(category.items) && category.items.length > 0)
        .sort((a: any, b: any) => Number(a.__sourceOrder || 0) - Number(b.__sourceOrder || 0))
        .map(({ __sourceOrder, ...category }: any) => category);
    }

    if (options.restoreMissingItems) {
      const categoryByKey = new Map<string, any>();
      menu.forEach((category: any) => categoryByKey.set(itemKey(category.name), category));

      sourceMenu.forEach((sourceCategory: any) => {
        const missingItems = (sourceCategory.items || [])
          .filter((sourceItem: any) => !matchedSourceKeys.has(itemKey(sourceItem.name || sourceItem.display_name)))
          .map((sourceItem: any) => preserveItem(sourceItem, {
            ...sourceItem,
            __sourceCategoryName: sourceCategory.name,
            __sourceKey: itemKey(sourceItem.name || sourceItem.display_name),
          }));

        if (!missingItems.length) return;
        missingItemsRestored += missingItems.length;
        const categoryKey = itemKey(sourceCategory.name);
        const targetCategory = categoryByKey.get(categoryKey);
        if (targetCategory) {
          targetCategory.items = [...(targetCategory.items || []), ...missingItems];
        } else {
          const newCategory = { name: sourceCategory.name, items: missingItems };
          menu.push(newCategory);
          categoryByKey.set(categoryKey, newCategory);
        }
      });
    }

    return {
      menu,
      changed: priceFixes > 0 || optionFixes > 0 || descriptionFixes > 0 || imageFixes > 0 || categoryFixes > 0 || missingItemsRestored > 0,
      priceFixes,
      optionFixes,
      descriptionFixes,
      imageFixes,
      categoryFixes,
      missingItemsRestored,
      sourceItemCount: allSourceItems.length,
    };
  };

  const replaceRestaurantMenuFromAudit = async (restaurantId: string, categories: any[]) => {
    const dedupedMenu = dedupeExactAuditMenuItems(normalizeAuditMenu(categories));
    const normalized = dedupedMenu.menu;
    if (dedupedMenu.removedCount > 0) {
      addLog(`Auditoria estrutural local removeu ${dedupedMenu.removedCount} item(ns) duplicado(s) exatamente iguais antes de salvar.`);
    }
    const buildKeywords = (item: any, categoryName: string) => {
      const optionRows = normalizeItemOptionRows(item);
      const parts = [
        item.name,
        item.description,
        item.search_display_name,
        item.search_keywords,
        categoryName,
        buildComboComponentSearchText(item.combo_components || []),
        ...optionRows.flatMap((option: any) => [option.group_name, option.name, option.search_label, option.search_aliases]),
      ];
      return [...new Set(parts
        .filter(Boolean)
        .flatMap((value: any) => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[^a-z0-9]+/))
        .filter((part: string) => part.length >= 3)
      )].slice(0, 120).join(' ');
    };
    const menuImageStorageCache = new Map<string, string>();
    const getImageExtension = (url: string) => {
      const match = String(url || '').split(/[?#]/)[0].match(/\.(jpg|jpeg|png|gif|webp|avif)$/i);
      return match ? match[1].toLowerCase().replace('jpeg', 'jpg') : 'jpg';
    };
    const slugForStoragePath = (value: any) => String(value || 'item')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'item';
    const ensureMenuItemImageInStorage = async (imageUrl: string, categoryName: string, itemName: string, itemIdx: number) => {
      const originalUrl = String(imageUrl || '').trim();
      if (!originalUrl || !/^https?:\/\//i.test(originalUrl) || /supabase\.co\/storage/i.test(originalUrl)) return originalUrl;
      const cacheKey = originalUrl.replace(/[?#].*$/, '');
      if (menuImageStorageCache.has(cacheKey)) return menuImageStorageCache.get(cacheKey) || originalUrl;
      const ext = getImageExtension(originalUrl);
      const storagePath = `menu-items/${restaurantId}/${Date.now()}_${slugForStoragePath(categoryName)}_${slugForStoragePath(itemName)}_${itemIdx}.${ext}`;
      try {
        const response = await fetch(`/api/local-collector/download-and-upload?url=${encodeURIComponent(originalUrl)}&path=${encodeURIComponent(storagePath)}`, {
          method: 'POST',
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok && payload?.success && payload?.url) {
          menuImageStorageCache.set(cacheKey, payload.url);
          return payload.url;
        }
        addLog(`Imagem do item nao foi baixada para Storage (${itemName}): ${payload?.error || `HTTP ${response.status}`}. Usando URL original.`);
      } catch (error: any) {
        addLog(`Erro ao baixar imagem do item para Storage (${itemName}): ${error.message || error}. Usando URL original.`);
      }
      menuImageStorageCache.set(cacheKey, originalUrl);
      return originalUrl;
    };
    const insertMenuItem = async (item: any, categoryId: string, categoryName: string, itemIdx: number) => {
      const comboComponents = Array.isArray(item.combo_components)
        ? item.combo_components.filter((component: any) => component && String(component.name || '').trim())
        : [];
      const hasVariableComboChoice = comboComponents.some((component: any) => component.type !== 'fixed_item');
      const optionRows = normalizeItemOptionRows(item);
      const isConfigurable = Boolean(item.is_configurable || optionRows.length || comboComponents.length);
      const sourceImageUrl = extractBestMenuImageUrl(item);
      const finalItemImageUrl = await ensureMenuItemImageInStorage(sourceImageUrl, categoryName, item.name, itemIdx);
      const itemRawData = typeof item.raw_data === 'object' && item.raw_data !== null ? item.raw_data : item;
      const richPayload: any = {
        category_id: categoryId,
        name: item.name,
        display_name: item.name,
        description: item.description || '',
        price: item.price || item.display_price || item.price_min || 0,
        display_price: item.display_price || item.price || item.price_min || 0,
        price_type: item.commercial_type === 'combo_builder' && !hasVariableComboChoice
          ? 'fixed'
          : (item.price_type || (isConfigurable ? 'starting_at' : 'fixed')),
        price_min: item.price_min || item.display_price || item.price || 0,
        price_max: item.price_max || item.display_price || item.price || 0,
        price_source: isConfigurable ? 'ai_curated_options' : 'ai_curated_item',
        commercial_type: item.commercial_type || (isConfigurable ? 'configurable_item' : 'simple_item'),
        is_configurable: isConfigurable,
        image_url: finalItemImageUrl || null,
        order_index: itemIdx,
        is_active: true,
        search_display_name: item.search_display_name || item.name,
        search_keywords: item.search_keywords || buildKeywords(item, categoryName),
        combo_components: comboComponents.length ? comboComponents : null,
        combo_rules: item.combo_rules || null,
        combo_display_mode: null,
        raw_data: {
          ...itemRawData,
          source_image_url: sourceImageUrl || null,
          stored_image_url: finalItemImageUrl || null,
        },
        extraction_confidence: 0.92,
        needs_review: false,
      };
      let result = await supabase.from('menu_items').insert(richPayload as any).select('id').single();
      if (!result.error) return result.data;
      if (!/column|schema cache|display_name|display_price|price_type|commercial_type|search_keywords|combo_components|combo_rules|combo_display_mode|raw_data/i.test(result.error.message || '')) {
        throw result.error;
      }
      const basicPayload = {
        category_id: categoryId,
        name: item.name,
        description: item.description || '',
        price: item.price || item.display_price || item.price_min || 0,
        image_url: finalItemImageUrl || null,
        order_index: itemIdx,
        is_active: true,
        search_display_name: item.search_display_name || item.name,
      };
      result = await supabase.from('menu_items').insert(basicPayload as any).select('id').single();
      if (result.error) {
        const { search_display_name, ...legacyPayload } = basicPayload as any;
        const legacyResult = await supabase.from('menu_items').insert(legacyPayload as any).select('id').single();
        if (legacyResult.error) throw legacyResult.error;
        return legacyResult.data;
      }
      return result.data;
    };

    const insertOptions = async (menuItemId: string, item: any) => {
      const options = normalizeItemOptionRows(item);
      if (!options.length) return;
      const grouped = options.reduce((acc: Map<string, any[]>, option: any) => {
        const groupName = option.group_name || 'OpÃ§Ãµes';
        const key = buildOptionGroupKey(option);
        acc.set(key, [...(acc.get(key) || []), option]);
        return acc;
      }, new Map<string, any[]>());

      for (const groupOptions of grouped.values()) {
        const first = (groupOptions as any[])[0] || {};
        const groupName = first.group_name || 'OpÃ§Ãµes';
        let groupId: string | null = null;
        const groupPayload: any = {
          menu_item_id: menuItemId,
          name: groupName,
          min_quantity: Number(first.min_quantity || 0),
          max_quantity: first.max_quantity == null ? null : Number(first.max_quantity),
          is_required: Boolean(first.is_required),
          order_index: Number(first.group_order_index || 0),
          semantic_type: first.semantic_type || null,
          price_behavior: first.price_behavior || null,
          ai_confidence: first.ai_confidence || null,
          ai_reason: first.ai_reason || null,
          raw_data: { options: groupOptions },
        };
        let groupResult = await supabase.from('menu_option_groups').insert(groupPayload as any).select('id').single();
        if (groupResult.error && /semantic_type|price_behavior|ai_confidence|ai_reason|schema cache|column/i.test(groupResult.error.message || '')) {
          const { semantic_type, price_behavior, ai_confidence, ai_reason, ...fallbackGroup } = groupPayload;
          groupResult = await supabase.from('menu_option_groups').insert(fallbackGroup as any).select('id').single();
        }
        if (!groupResult.error) groupId = groupResult.data?.id || null;
        if (groupResult.error && !/does not exist|schema cache|relation/i.test(groupResult.error.message || '')) {
          throw groupResult.error;
        }

        const optionRows = (groupOptions as any[]).map((option: any, optionIdx: number) => ({
          menu_item_id: menuItemId,
          group_id: groupId,
          group_name: groupName,
          name: option.name,
          description: option.description || null,
          price: option.price == null || Number.isNaN(Number(option.price)) ? null : Number(option.price),
          price_delta: option.price_delta == null || Number.isNaN(Number(option.price_delta)) ? null : Number(option.price_delta),
          min_quantity: Number(option.min_quantity || 0),
          max_quantity: option.max_quantity == null ? null : Number(option.max_quantity),
          is_required: Boolean(option.is_required),
          is_available: true,
          order_index: Number(option.order_index ?? optionIdx),
          semantic_type: option.semantic_type || null,
          price_behavior: option.price_behavior || null,
          search_label: option.search_label || buildSearchableOptionLabel(item.name, option),
          search_aliases: option.search_aliases || null,
          is_searchable_variant: Boolean(option.is_searchable_variant),
          ai_confidence: option.ai_confidence || null,
          ai_reason: option.ai_reason || null,
          raw_data: option.raw_data || option,
        }));
        let optionResult = await supabase.from('menu_item_options').insert(optionRows as any);
        if (optionResult.error && /group_id|semantic_type|price_behavior|search_label|search_aliases|is_searchable_variant|ai_confidence|ai_reason|schema cache|column/i.test(optionResult.error.message || '')) {
          const legacyRows = optionRows.map(({ group_id, semantic_type, price_behavior, search_label, search_aliases, is_searchable_variant, ai_confidence, ai_reason, ...row }: any) => row);
          optionResult = await supabase.from('menu_item_options').insert(legacyRows as any);
        }
        if (optionResult.error && !/does not exist|schema cache|relation/i.test(optionResult.error.message || '')) {
          throw optionResult.error;
        }
      }
    };

    const { data: existingCats } = await supabase
      .from('menu_categories')
      .select('id')
      .eq('restaurant_id', restaurantId);

    if (existingCats?.length) {
      const catIds = existingCats.map((cat: any) => cat.id);
      await supabase.from('menu_items').delete().in('category_id', catIds);
      await supabase.from('menu_categories').delete().eq('restaurant_id', restaurantId);
    }

    for (let catIdx = 0; catIdx < normalized.length; catIdx++) {
      const category = normalized[catIdx];
      const { data: insertedCat, error: catError } = await supabase
        .from('menu_categories')
        .insert({
          restaurant_id: restaurantId,
          name: category.name,
          order_index: catIdx,
          is_active: true,
        })
        .select('id')
        .single();
      if (catError) throw catError;

      for (let itemIdx = 0; itemIdx < category.items.length; itemIdx++) {
        const item = category.items[itemIdx];
        const insertedItem = await insertMenuItem(item, insertedCat.id, category.name, itemIdx);
        if (insertedItem?.id) await insertOptions(insertedItem.id, item);
      }
    }

    const expectedOptionCount = countStructuredOptions(normalized);
    const expectedImageCount = normalized.reduce((total: number, category: any) => (
      total + (category.items || []).filter((item: any) => String(item?.image_url || '').trim()).length
    ), 0);

    if (expectedOptionCount >= 8 || expectedImageCount >= 5) {
      const { data: savedCategories, error: verifyMenuError } = await supabase
        .from('menu_categories')
        .select('id, menu_items(id, image_url)')
        .eq('restaurant_id', restaurantId);

      if (verifyMenuError) throw verifyMenuError;

      const savedItems = (savedCategories || []).flatMap((category: any) => category.menu_items || []);
      const savedItemIds = savedItems.map((item: any) => item.id).filter(Boolean);
      const savedImageCount = savedItems.filter((item: any) => String(item?.image_url || '').trim()).length;

      if (expectedImageCount >= 5 && savedImageCount < Math.max(1, Math.floor(expectedImageCount * 0.75))) {
        throw new Error(`Auditoria pÃ³s-salvamento bloqueou publicaÃ§Ã£o: a fonte tinha ${expectedImageCount} imagem(ns), mas sÃ³ ${savedImageCount} ficaram no banco.`);
      }

      if (expectedOptionCount >= 8) {
        let savedOptionCount = 0;
        if (savedItemIds.length) {
          const { count, error: verifyOptionsError } = await supabase
            .from('menu_item_options')
            .select('id', { count: 'exact', head: true })
            .in('menu_item_id', savedItemIds);

          if (verifyOptionsError && !/does not exist|schema cache|relation/i.test(verifyOptionsError.message || '')) {
            throw verifyOptionsError;
          }
          savedOptionCount = count || 0;
        }

        if (savedOptionCount < Math.max(1, Math.floor(expectedOptionCount * 0.85))) {
          throw new Error(`Auditoria pÃ³s-salvamento bloqueou publicaÃ§Ã£o: a fonte tinha ${expectedOptionCount} opÃ§Ã£o(Ãµes)/adicional(is), mas sÃ³ ${savedOptionCount} ficaram no banco.`);
        }
      }

      addLog(`Auditoria pÃ³s-salvamento OK: ${savedItems.length} item(ns), ${savedImageCount}/${expectedImageCount} imagem(ns) e opÃ§Ãµes preservadas no banco.`);
    }

    return normalized;
  };

  const runReadyForAppAudit = async (
    restaurant: any,
    context: { menuResult?: any; menuEvidence?: any; learnedSourceUrl?: string; effectiveRestaurant?: any; applyMenu?: boolean }
  ) => {
    const currentRestaurant = { ...(context.effectiveRestaurant || restaurant) };
    if (context.menuResult?.success || context.menuEvidence?.success) {
      // Motivos antigos de QA/recoleta nÃ£o podem contaminar a decisÃ£o atual.
      // Se esta execuÃ§Ã£o achou uma fonte direta e uma prÃ©via vÃ¡lida, a auditoria
      // deve julgar o cardÃ¡pio recÃ©m-coletado, nÃ£o o ai_log de uma tentativa anterior.
      delete (currentRestaurant as any).ai_log;
      delete (currentRestaurant as any).qa_log;
      delete (currentRestaurant as any).last_error;
      currentRestaurant.menu_status = 'found';
      currentRestaurant.menu_status_reason = context.menuResult?.message
        || 'CardÃ¡pio coletado e estruturado nesta execuÃ§Ã£o; ignore motivos antigos de recoleta.';
      currentRestaurant.menu_last_checked_at = new Date().toISOString();
      if (context.learnedSourceUrl || context.menuEvidence?.sourceUrl) {
        currentRestaurant.other_url = context.learnedSourceUrl || context.menuEvidence?.sourceUrl;
        currentRestaurant.other_url_label = `CardÃ¡pio validado ${currentRestaurant.city || restaurant.city || ''}`.trim();
      }
    }
    const identityIssues = getPublicIdentityIssues(currentRestaurant);
    const addressIssues = getPublicAddressIssues(currentRestaurant);
    const previewCategories = Array.isArray(context.menuResult?.categories)
      ? context.menuResult.categories
      : Array.isArray(context.menuResult?.normalizedMenu)
        ? context.menuResult.normalizedMenu
        : Array.isArray(context.menuResult?.preview)
          ? context.menuResult.preview
          : [];
    const rawMenuItemCount = (categories: any[] = []) => categories.reduce(
      (total: number, category: any) => total + ((category.items || category.menu_items || category.samples || []).length || 0),
      0,
    );
    const rawMenuOptionCount = (categories: any[] = []) => categories.reduce(
      (total: number, category: any) => total + ((category.items || category.menu_items || category.samples || []) as any[]).reduce(
        (itemTotal: number, item: any) => itemTotal + normalizeItemOptionRows(item).length,
        0,
      ),
      0,
    );
    const nativeEvidenceCategories = Array.isArray(context.menuEvidence?.categories)
      ? context.menuEvidence.categories
      : [];
    const nativeEvidenceIsRicher = nativeEvidenceCategories.length > 0 && (
      rawMenuItemCount(nativeEvidenceCategories) > rawMenuItemCount(previewCategories)
      || rawMenuOptionCount(nativeEvidenceCategories) > rawMenuOptionCount(previewCategories)
    );
    let authoritativeSourceCategories = nativeEvidenceIsRicher
      ? nativeEvidenceCategories
      : previewCategories;
    if (nativeEvidenceIsRicher) {
      addLog(`Fonte nativa rica detectada: preservando ${rawMenuItemCount(nativeEvidenceCategories)} item(ns) e ${rawMenuOptionCount(nativeEvidenceCategories)} opÃ§Ã£o(Ãµes) contra poda da IA/prÃ©via.`);
    }
    const menuSnapshot = authoritativeSourceCategories.length
      ? buildMenuQualitySnapshotFromCategories(authoritativeSourceCategories)
      : await getMenuQualitySnapshot(restaurant.id);
    const aiLog = readAiLog(restaurant);
    const sourceAudit = context.menuResult?.audit || context.menuEvidence?.audit || aiLog?.extra?.audit || null;
    const sourceUrlForAudit = String(context.learnedSourceUrl || context.menuEvidence?.sourceUrl || '');
    const isDirectMenuSource = /anota\.ai|saipos|livemenu|cardapioweb|goomer|ola\.click|deliverydireto|deliverymuch|instadelivery|lojavirtualnuvem|mitiendanube|nuvemshop|\/produtos?\b|pedido|menu|cardapio|cardÃ¡pio/i.test(sourceUrlForAudit)
      && !/google\.[^/]+\/(search|maps)|instagram\.com\/(p|reel|stories)\//i.test(sourceUrlForAudit);
    const nativeSourceSignature = [
      context.menuResult?.platform,
      context.menuResult?.source,
      context.menuResult?.metrics?.sourceEndpoint,
      context.menuEvidence?.platform,
      context.menuEvidence?.source,
      context.menuEvidence?.metrics?.sourceEndpoint,
      context.menuEvidence?.sourceEndpoint,
    ].filter(Boolean).join(' ');
    const hasNativeStructuredSource = /anota_ai_network|saipos|livemenu|cardapioweb|goomer|ola_click|instadelivery|platform_api|network|api/i.test(nativeSourceSignature);
    const authoritativeSourceImageCount = authoritativeSourceCategories.reduce(
      (total: number, category: any) => total + ((category.items || category.menu_items || category.samples || []) as any[])
        .filter((item: any) => String(item?.image_url || item?.imageUrl || '').trim()).length,
      0,
    );
    const hasVisibleStructuredProductSource = Boolean(
      !hasNativeStructuredSource
      && /visible_text/i.test(nativeSourceSignature)
      && isDirectMenuSource
      && rawMenuItemCount(authoritativeSourceCategories) >= 6
      && menuSnapshot.priceCoverage >= 0.55
      && (
        authoritativeSourceImageCount >= 3
        || /instadelivery|lojavirtualnuvem|mitiendanube|\/produtos?\//i.test(sourceUrlForAudit)
      )
    );
    const shouldPreserveStructuredSourceFacts = hasNativeStructuredSource || hasVisibleStructuredProductSource;
    if (hasVisibleStructuredProductSource) {
      addLog(`Fonte visivel estruturada detectada: preservando fatos do cardapio (${rawMenuItemCount(authoritativeSourceCategories)} item(ns), ${authoritativeSourceImageCount} imagem(ns)) contra poda da IA.`);
    }
    if (hasNativeStructuredSource && nativeEvidenceCategories.length > 0 && authoritativeSourceCategories !== nativeEvidenceCategories) {
      authoritativeSourceCategories = nativeEvidenceCategories;
      addLog(`Fonte nativa estruturada detectada: preservando categorias literais, ${rawMenuItemCount(nativeEvidenceCategories)} item(ns) e ${rawMenuOptionCount(nativeEvidenceCategories)} opcoes da plataforma.`);
    }
    const screenshotsForAudit = [
      ...(Array.isArray(context.menuEvidence?.screenshots) ? context.menuEvidence.screenshots : []),
      ...(Array.isArray(context.menuResult?.screenshots) ? context.menuResult.screenshots : []),
    ].filter((item: any, index: number, list: any[]) =>
      typeof item === 'string'
      && item.startsWith('data:image')
      && list.indexOf(item) === index
    ).slice(0, 4);
    let visualStructureAudit: any = null;
    if (isDirectMenuSource && screenshotsForAudit.length && authoritativeSourceCategories.length) {
      try {
        addLog(`Auditoria visual IA: comparando ${screenshotsForAudit.length} print(s) com a estrutura extraÃ­da.`);
        const visualResponse = await fetch('/api/local-collector/audit-menu-visual-structure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            images: screenshotsForAudit,
            structuredMenu: authoritativeSourceCategories,
            sourceUrl: sourceUrlForAudit,
          }),
        });
        const visualPayload = await visualResponse.json().catch(() => ({}));
        if (visualResponse.ok && visualPayload?.visualAudit) {
          visualStructureAudit = visualPayload.visualAudit;
          addLog(`Auditoria visual IA: ${visualStructureAudit.recommendation || 'sem recomendaÃ§Ã£o'} â€” ${visualStructureAudit.reason || visualStructureAudit.visual_summary || 'estrutura conferida'}.`);
        } else {
          addLog(`Auditoria visual IA indisponÃ­vel: ${visualPayload?.error || 'resposta invÃ¡lida'}.`);
        }
      } catch (visualError: any) {
        addLog(`Auditoria visual IA falhou: ${visualError.message || visualError}.`);
      }
    }
    const localIssues = [
      ...identityIssues,
      ...addressIssues,
      menuSnapshot.itemCount < 4 ? `CardÃ¡pio com poucos itens (${menuSnapshot.itemCount}).` : '',
      menuSnapshot.priceCoverage < 0.75 ? `Cobertura de preÃ§o baixa (${Math.round(menuSnapshot.priceCoverage * 100)}%).` : '',
      menuSnapshot.itemCount > 0 && menuSnapshot.pricedItemCount === 0 ? 'Cardapio sem precos confiaveis; enviar para revisao humana.' : '',
      Number(sourceAudit?.unresolvedPriceCount || 0) > 0 ? `${Number(sourceAudit?.unresolvedPriceCount || 0)} item(ns) sem preco confiavel no extrator; revisao humana obrigatoria.` : '',
      menuSnapshot.junkItemCount > 0 ? `CardÃ¡pio contÃ©m ${menuSnapshot.junkItemCount} item(ns) removÃ­veis de interface ou texto ruim; limpe esses itens e publique o restante se houver cardÃ¡pio real suficiente.` : '',
      visualStructureAudit?.recommendation === 'needs_restructure'
        ? `Auditoria visual encontrou estrutura faltante ou errada: ${visualStructureAudit.reason || visualStructureAudit.visual_summary || 'revisar categorias/opÃ§Ãµes'}.`
        : '',
      visualStructureAudit?.recommendation === 'needs_more_screenshots'
        ? `Auditoria visual pediu mais screenshots, mas isso vira aviso: ${visualStructureAudit.reason || 'nÃ£o foi possÃ­vel conferir hierarquia visual'}.`
        : '',
      sourceAudit?.approved === false && Array.isArray(sourceAudit?.issues) && sourceAudit.issues.length > 0
        ? 'Previa tecnica apontou problemas de estrutura; use isso para limpar/reagrupar o cardapio, nao como bloqueio automatico se a fonte for um cardapio direto com itens reais.'
        : '',
    ].filter(Boolean);

    const systemContext = [
      'VocÃª Ã© a auditoria final de qualidade do FilterFood antes de publicar dados para usuÃ¡rios finais.',
      'VocÃª DEVE responder SOMENTE JSON vÃ¡lido.',
      'Objetivo: corrigir dados publicÃ¡veis e decidir se o restaurante pode ficar "pronto para app".',
      'Regras duras:',
      '- A IA NAO e redatora de cardapio. Ela so classifica e posiciona textos existentes na fonte: categoria, subcategoria, item, combo, escolha, adicional, preco e horario.',
      '- NUNCA invente nome de item, categoria, subcategoria, combo, descricao, ingrediente, beneficio ou texto de venda.',
      '- Descricao so pode ser texto literal da fonte ou uma descricao vazia. Se a fonte nao trouxe descricao, deixe description="".',
      '- Se um texto nao aparece no cardapio original/print/texto bruto, ele nao pode aparecer no normalizedMenu.',
      '- Se faltar detalhe de combo, sabor, borda, adicional ou subcategoria, use nextAction="recollect_from_source" para o robo abrir detalhes/rolar/tirar novo print; nao complete por imaginacao.',
      '- EndereÃ§o nÃ£o pode conter Zap, WhatsApp, telefone, Ã­cones, texto de botÃ£o ou pedaÃ§os colados.',
      '- Latitude e longitude sÃ£o obrigatÃ³rias e precisam ser coerentes com o endereÃ§o/cidade; sem coordenadas, NUNCA publique.',
      '- Nome pÃºblico mÃ­nimo Ã© obrigatÃ³rio: "Bar", "Restaurante", "AÃ§aÃ­", "Pizzaria" ou outro nome genÃ©rico/fraco nÃ£o pode ficar pronto sem identidade real confirmada no Google Maps/cardÃ¡pio.',
      '- Se o Google Maps indicar "permanentemente fechado" ou "temporariamente fechado" no nome/status, nÃ£o publique; rejeite ou peÃ§a recoleta/validaÃ§Ã£o.',
      '- CardÃ¡pio precisa ter categorias Ãºteis e itens que o usuÃ¡rio pesquisaria. Ex: Pizza Calabresa, X-Burger, AÃ§aÃ­ 500ml.',
      '- NÃ£o aceite itens genÃ©ricos/lixo: "Ãšltimo update", "Para o menu", "AlmoÃ§o" como item sem preÃ§o, "Destaques", texto de avaliaÃ§Ã£o, nomes de outros restaurantes.',
      '- VocÃª Ã© auditor de estrutura, nÃ£o redator: NUNCA transforme descriÃ§Ã£o longa em nome de item; NUNCA crie categoria final por inferÃªncia se a fonte nÃ£o mostrar essa categoria/aba/subcategoria.',
      '- Modele o cardÃ¡pio pensando em 4 objetivos: dono preencher/revisar fÃ¡cil, usuÃ¡rio entender rÃ¡pido, busca encontrar o prato correto, e app renderizar sem gambiarra.',
      '- Categoria pÃºblica Ã© famÃ­lia de produtos vendÃ­veis (Pizzas, Combos, HambÃºrgueres, Massas, Bebidas). NÃ£o crie categoria pÃºblica para "Adicionais", "Turbine", "Bora de Combo", "Escolha seu sabor" ou similares; isso Ã© grupo interno de item.',
      '- Item Ã© o que o restaurante venderia no perfil. Ex: "Combo FamÃ­lia", "Pizza P", "Penne ao Molho Branco". Componentes, escolhas e adicionais ficam estruturados dentro do item, nÃ£o como itens soltos.',
      '- Combo deve continuar como item vendÃ­vel Ãºnico. Se tiver escolhas/adicionais, use option_groups/options como em qualquer item normal. combo_components Ã© apenas metadado opcional; nÃ£o transforme composiÃ§Ã£o fixa em grupo pÃºblico clicÃ¡vel.',
      '- Em combo, NUNCA transforme cada hamburguer/pizza/bebida escolhÃ­vel em item principal. Ex: "Pague 3, leve 4" = item principal + option_group "Escolha 4 burgers"; regra comercial em combo_rules.',
      '- Em combo com itens inclusos e escolhas, mantenha as escolhas/adicionais como grupos normais do item. NÃ£o crie card especial vermelho, nem grupo pÃºblico "Itens inclusos" quando isso for sÃ³ composiÃ§Ã£o textual.',
      '- Perguntas operacionais como "Deseja ketchup?", "Precisa de talher?", "Enviar guardanapo?", "Deseja descartÃ¡vel?" ou embalagem com opÃ§Ãµes Sim/NÃ£o nÃ£o sÃ£o itens, adicionais nem categorias pÃºblicas. Remova do cardÃ¡pio pÃºblico ou guarde sÃ³ em raw_data.',
      '- Se o mesmo adicional tem preÃ§o diferente em contextos diferentes, mantenha como option/addon contextual dentro daquele item/combo. Ex: Batata P avulsa R$10 pode ser addon de combo +R$5.',
      '- Adicional, borda, molho, escolha de bebida e complemento opcional devem ir em option_groups/options, nÃ£o como item principal, salvo se forem vendidos isoladamente. Embalagem/descartÃ¡vel operacional nÃ£o deve aparecer no app pÃºblico.',
      '- Sabores de pizza/aÃ§aÃ­/massa em item genÃ©rico devem ir como options com semantic_type="flavor". Se o preÃ§o do sabor soma ao preÃ§o base, use price_behavior="price_delta" e price_delta. Se o preÃ§o jÃ¡ Ã© final, use price_behavior="absolute_price" e price.',
      '- Para busca, search_display_name e search_keywords devem usar apenas palavras jÃ¡ presentes no item/opÃ§Ã£o/categoria original. Pode combinar "Pizza P" + "Calabresa" porque ambos aparecem na fonte; nÃ£o invente sinÃ´nimos.',
      '- Se houver item "Combo" com descricao contendo pizza/hamburguer/bebida, mantenha tudo como descricao/search_keywords do item. Nao extraia partes fixas para combo_components automaticamente; so use option_groups/options quando a fonte trouxer escolhas/adicionais reais.',
      '- Se o problema for apenas item removÃ­vel de interface/lixo do cardÃ¡pio (ex: pedido mÃ­nimo, cupom, aberto atÃ©, texto promocional), remova esses itens no normalizedMenu e use ready/publish se sobrarem pratos reais.',
      '- Se a fonte misturou outros restaurantes/listagem/reviews, marque needs_review; nÃ£o publique.',
      '- Nao confunda cardapio direto mal estruturado com listagem. Se sourceUrl for Anota AI, Saipos, LiveMenu, CardapioWeb, Goomer, Ola Click ou pagina propria de pedidos e houver muitos itens reais com preco, reclassifique e limpe no normalizedMenu em vez de bloquear.',
      '- Se a extracao colocou bebida/sobremesa/massa dentro de Pizzas, ou repetiu categorias, corrija as categorias no normalizedMenu. Isso e problema de normalizacao, nao motivo para revisao humana.',
      '- Preserve nomes literais de categorias/abas/subcategorias quando a fonte estruturada os trouxer. Ex: "Massas Artesanais", "Produtos Coca-Cola" e "Snack | Sanduiche" devem continuar assim. So encurte ou renomeie categoria quando o nome original for generico ("Menu", "Cardapio", "Geral") ou for grupo interno ("Adicionais", "Escolha sabor", "Bordas").',
      '- PreÃ§os devem ser nÃºmeros em reais. Itens sem preÃ§o confiÃ¡vel nÃ£o entram.',
      '- Item marcado como esgotado, indisponivel ou fora de estoque NAO bloqueia o cardapio. Preserve o item e a disponibilidade como informacao; publique/recolha normalmente se nome, preco, fonte e estrutura estiverem confiaveis.',
      '- Se existe fonte/link de cardÃ¡pio, mas a extraÃ§Ã£o atual veio de fonte errada, listagem, reviews ou outro restaurante, use nextAction="recollect_from_source", nÃ£o manual_review.',
      '- Se a fonte atual jÃ¡ foi aberta/validada nesta execuÃ§Ã£o (sourceUrl direto com itens), NÃ£O repita motivo antigo de "usar hub/link da bio"; avalie o cardÃ¡pio atual.',
      '- Se nativeStructuredEvidence/menuSnapshot indicam que a execuÃ§Ã£o atual extraiu itens/opÃ§Ãµes, ignore erros antigos do registro como "erro ao processar resultado", "cardÃ¡pio com 0 itens" ou "needs_recollection"; eles pertencem a tentativas anteriores.',
      '- ConfianÃ§a mÃ©dia do extrator nÃ£o bloqueia sozinha: se houver itens reais com preÃ§os, limpe lixo, padronize categorias/nomes e publique o subconjunto confiÃ¡vel.',
      '- Se a fonte Ã© direta do cardÃ¡pio e a prÃ©via tem muitos itens reais com preÃ§os, prefira decision="ready" + normalizedMenu limpo. Use needs_review sÃ³ se realmente houver item de outro restaurante, lista do Google/reviews ou impossibilidade de separar pratos reais.',
      '- Prints e visualStructureAudit sÃ£o evidÃªncia auxiliar, nÃ£o requisito obrigatÃ³rio. A decisÃ£o principal vem da estrutura extraÃ­da, fonte oficial, preÃ§os, opÃ§Ãµes/adicionais e auditoria estrutural.',
      '- NÃ£o bloqueie publicaÃ§Ã£o sÃ³ por ausÃªncia de screenshot ou por needs_more_screenshots se a fonte estruturada jÃ¡ trouxe itens, opÃ§Ãµes, preÃ§os e dados suficientes.',
      '- Se visualStructureAudit indicar needs_restructure com erro concreto, use como alerta forte e corrija o normalizedMenu quando os dados estruturados confirmarem o problema.',
      '- Se screenshots existirem e mostrarem abas/subcategorias (ex: Menu do Chefe > Na Brasa, Favoritos da Galera > combos, categoria + subcategoria), preserve essa hierarquia em categoria/subcategoria/section quando possÃ­vel, ou no nome da categoria com separador curto.',
      '- Se endereÃ§o ou coordenadas estÃ£o ausentes/invÃ¡lidos, use nextAction="recollect_from_source" para o robÃ´ voltar ao Maps/geocode antes de publicar.',
      '- Use nextAction="manual_review" somente quando houver login, captcha, bloqueio externo ou falta real de fonte acessÃ­vel.',
      '- O campo reason deve explicar o motivo real em uma frase objetiva. Nunca responda com placeholders como "curto", "...", "ok", "motivo" ou texto genÃ©rico.',
      'Formato obrigatÃ³rio:',
      '{"decision":"ready|needs_review|reject","nextAction":"publish|recollect_from_source|manual_review|reject","reason":"ex: fonte Anota AI bloqueada por Cloudflare no navegador atual; reexecutar em perfil liberado","restaurantUpdate":{"name":"","category":"","address":"","number":"","neighborhood":"","city":"","state":"","cep":"","phone":"","other_url_label":""},"normalizedMenu":[{"name":"Categoria existente ou familia evidente","items":[{"name":"Nome literal do item","description":"descriÃ§Ã£o literal da fonte ou vazio","price":35.9,"display_price":35.9,"price_type":"fixed|starting_at|range|option_only","price_min":35.9,"price_max":35.9,"commercial_type":"simple_item|configurable_item|combo_builder|simple_with_addons","is_configurable":false,"search_display_name":"nome com palavras existentes","search_keywords":"palavras existentes no item/opÃ§Ãµes/categoria","image_url":null,"combo_rules":{"summary":"Pague 3, leve 4","paid_quantity":3,"received_quantity":4},"combo_components":[{"type":"fixed_item|choice_group|addon_group|upsell_group","name":"Escolha 4 burgers|Batata inclusa|Adicionais do combo","quantity":1,"min_quantity":0,"max_quantity":1,"is_required":false,"price_behavior":"included|price_delta|absolute_price|unknown","items":[{"name":"Blitz Salada","description":"descriÃ§Ã£o literal ou vazio","price":null,"price_delta":0,"price_behavior":"included","image_url":null,"is_searchable_variant":true,"search_label":"Combo Blitz Salada","search_aliases":"combo burger salada"}]}],"option_groups":[{"name":"Sabores|Adicionais|Bebidas|Bordas","min_quantity":0,"max_quantity":1,"is_required":false,"semantic_type":"flavor|addon|required_choice|combo_component|not_searchable","price_behavior":"price_delta|absolute_price|included|unknown","items":[{"name":"Calabresa","price":null,"price_delta":10,"semantic_type":"flavor","price_behavior":"price_delta","is_searchable_variant":true,"search_label":"Pizza Calabresa","search_aliases":"pizza calabresa pizza p"}]}]}]}],"deleteExistingMenu":false,"corrections":["..."]}',
    ].join('\n');

    const menuForCurator = authoritativeSourceCategories.length
      ? authoritativeSourceCategories.slice(0, 40).map((category: any) => ({
          name: category.name,
          items: (category.items || category.menu_items || []).slice(0, 120).map((item: any) => {
            const optionRows = normalizeItemOptionRows(item);
            return {
              name: item.name,
              description: item.description || item.display_description || '',
              image_url: item.image_url || item.imageUrl || null,
              price: item.price ?? item.display_price ?? item.price_min ?? null,
              price_type: item.price_type || null,
              commercial_type: item.commercial_type || item.commercial_kind || null,
              combo_components: (item.combo_components || item.comboComponents || []).slice(0, 40),
              combo_rules: item.combo_rules || item.comboRules || null,
              option_groups: normalizeItemOptionGroups(item).slice(0, 40).map((group: any) => ({
                name: group.name,
                min_quantity: group.min_quantity,
                max_quantity: group.max_quantity,
                is_required: group.is_required,
                semantic_type: group.semantic_type,
                price_behavior: group.price_behavior,
                items: (group.items || []).slice(0, 80).map((option: any) => ({
                  name: option.name,
                  description: option.description || null,
                  image_url: option.image_url || null,
                  price: option.price ?? null,
                  price_delta: option.price_delta ?? null,
                  semantic_type: option.semantic_type || group.semantic_type || null,
                  price_behavior: option.price_behavior || group.price_behavior || null,
                  is_searchable_variant: option.is_searchable_variant || false,
                  search_label: option.search_label || null,
                })),
              })),
              options: optionRows.slice(0, 120).map((option: any) => ({
                group_name: option.group_name,
                name: option.name,
                description: option.description || null,
                image_url: option.image_url || null,
                price: option.price ?? null,
                price_delta: option.price_delta ?? null,
                min_quantity: option.min_quantity,
                max_quantity: option.max_quantity,
                is_required: option.is_required,
                semantic_type: option.semantic_type || null,
                price_behavior: option.price_behavior || null,
                is_searchable_variant: option.is_searchable_variant || false,
                search_label: option.search_label || null,
              })),
            };
          }),
        }))
      : null;

    const message = JSON.stringify({
      restaurant: currentRestaurant,
      localIssues,
      sourceUrl: context.learnedSourceUrl || context.menuEvidence?.sourceUrl || '',
      sourceAudit,
      visualStructureAudit,
      visualEvidence: {
        screenshotCount: screenshotsForAudit.length,
        nativeVisualEvidence: context.menuEvidence?.visualAuditEvidence || null,
        visualItems: Array.isArray(context.menuEvidence?.visualItems) ? context.menuEvidence.visualItems.slice(0, 40) : [],
      },
      nativeStructuredEvidence: {
        platform: context.menuResult?.platform || context.menuEvidence?.platform || '',
        source: context.menuResult?.source || context.menuEvidence?.source || '',
        sourceEndpoint: context.menuResult?.metrics?.sourceEndpoint || '',
        sourceSignature: nativeSourceSignature,
        extractedItems: menuSnapshot.itemCount,
        extractedOptions: rawMenuOptionCount(authoritativeSourceCategories),
      },
      menuSnapshot,
      menuForCurator,
    }).slice(0, 30000);

    const canUseNativeFastAudit = Boolean(
      hasNativeStructuredSource
      && rawMenuItemCount(authoritativeSourceCategories) >= 8
      && rawMenuOptionCount(authoritativeSourceCategories) >= 8
      && menuSnapshot.priceCoverage >= 0.55
    );
    let audit: any = null;
    if (canUseNativeFastAudit) {
      addLog(`PÃ³s-auditoria rÃ¡pida: fonte nativa estruturada forte (${rawMenuItemCount(authoritativeSourceCategories)} itens, ${rawMenuOptionCount(authoritativeSourceCategories)} opÃ§Ãµes). Vou usar auditorias locais e seguir sem travar na IA genÃ©rica.`);
      audit = {
        decision: 'ready',
        nextAction: 'publish',
        reason: 'Fonte nativa estruturada trouxe cardapio rico com itens, opcoes e precos; aprovado pela auditoria rapida local para seguir ate a etapa final de fotos.',
        normalizedMenu: normalizeAuditMenu(authoritativeSourceCategories),
        corrections: [],
        restaurantUpdate: {},
      };
    } else {
      addLog('PÃ³s-auditoria IA: revisando endereÃ§o, cardÃ¡pio e dados publicÃ¡veis antes de marcar como pronto.');
      const response = await fetch('/api/local-collector/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemContext, message, jsonMode: true }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || `Falha na pÃ³s-auditoria IA: HTTP ${response.status}`);
      audit = extractJsonObject(data.reply || '');
      if (!audit) throw new Error('PÃ³s-auditoria IA nÃ£o retornou JSON interpretÃ¡vel.');
    }

    const restaurantUpdate: any = {};
    const proposed = audit.restaurantUpdate || {};
    for (const key of ['name', 'category', 'address', 'number', 'neighborhood', 'city', 'state', 'cep', 'phone', 'other_url_label']) {
      if (typeof proposed[key] === 'string' && proposed[key].trim()) restaurantUpdate[key] = proposed[key].trim();
    }
    if (restaurantUpdate.address) restaurantUpdate.address = sanitizeGoogleMapsAddressInput(restaurantUpdate.address);
    if (Object.keys(restaurantUpdate).length) {
      await updateRestaurantWithSchemaFallback(restaurant.id, restaurantUpdate);
      addLog(`PÃ³s-auditoria IA aplicou correÃ§Ãµes cadastrais: ${Object.keys(restaurantUpdate).join(', ')}.`);
    }

    const staleHubReasonAfterValidatedSource = Boolean(
      (context.menuResult?.success || context.menuEvidence?.success)
      && (context.learnedSourceUrl || context.menuEvidence?.sourceUrl)
      && /link da bio|hub|usar hub|escolher card[aÃ¡]pio/i.test(String(audit.reason || ''))
    );
    if (staleHubReasonAfterValidatedSource) {
      audit.reason = 'Fonte direta de cardÃ¡pio jÃ¡ foi encontrada e validada nesta execuÃ§Ã£o; avaliaÃ§Ã£o deve considerar apenas qualidade publicÃ¡vel do cardÃ¡pio atual.';
      audit.nextAction = audit.nextAction === 'recollect_from_source' ? 'publish' : audit.nextAction;
      audit.corrections = [
        ...(Array.isArray(audit.corrections) ? audit.corrections : []),
        'Motivo antigo de recoleta por hub/link da bio ignorado porque a fonte direta atual foi validada.',
      ];
    }
    const staleProcessingReasonAfterValidatedSource = Boolean(
      (context.menuResult?.success || context.menuEvidence?.success)
      && (context.learnedSourceUrl || context.menuEvidence?.sourceUrl)
      && /erro ao processar resultado|card[aÃ¡]pio com 0 itens|muitos itens n[aÃ£]o foram coletados|needs_recollection/i.test(String(audit.reason || ''))
      && authoritativeSourceCategories.length > 0
    );
    if (staleProcessingReasonAfterValidatedSource) {
      audit.reason = 'Fonte direta de cardÃ¡pio foi extraÃ­da com itens nesta execuÃ§Ã£o; motivo antigo de erro/processamento foi ignorado.';
      if (Array.isArray(audit.normalizedMenu) && audit.normalizedMenu.length > 0) {
        audit.decision = 'ready';
      }
      audit.nextAction = audit.nextAction === 'recollect_from_source' ? 'publish' : audit.nextAction;
      audit.corrections = [
        ...(Array.isArray(audit.corrections) ? audit.corrections : []),
        'Motivo antigo de erro/processamento ignorado porque a execuÃ§Ã£o atual retornou cardÃ¡pio estruturado.',
      ];
    }

    const previewNormalizedMenu = mergeSourceImagesIntoMenu(normalizeAuditMenu(authoritativeSourceCategories), authoritativeSourceCategories);
    const previewNormalizedItemCount = previewNormalizedMenu.reduce(
      (total: number, category: any) => total + ((category.items || []).length || 0),
      0,
    );
    const previewNormalizedOptionCount = countStructuredOptions(previewNormalizedMenu);
    let normalizedMenu = mergeSourceImagesIntoMenu(normalizeAuditMenu(audit.normalizedMenu || []), authoritativeSourceCategories);
    const aiNormalizedItemCount = normalizedMenu.reduce(
      (total: number, category: any) => total + ((category.items || []).length || 0),
      0,
    );
    const aiNormalizedOptionCount = countStructuredOptions(normalizedMenu);
    const findUnsupportedLiteralNames = (menu: any[] = [], sourceMenu: any[] = []) => {
      const evidence = buildMenuSourceEvidence(sourceMenu, '');
      const unsupported: string[] = [];
      const assertLiteral = (type: string, value: any) => {
        const label = String(value || '').trim();
        const normalized = normalizeText(label);
        if (!normalized || normalized.length < 2) return;
        if (!evidence.normalizedText.includes(normalized)) unsupported.push(`${type}: ${label}`);
      };
      for (const category of menu || []) {
        assertLiteral('categoria', category?.name);
        const items = Array.isArray(category?.items)
          ? category.items
          : Array.isArray(category?.menu_items)
            ? category.menu_items
            : [];
        for (const item of items) {
          assertLiteral('item', item?.name || item?.display_name);
          const optionRows = normalizeItemOptionRows(item);
          optionRows.forEach((option: any) => assertLiteral('opÃ§Ã£o', option?.name));
          const comboComponents = Array.isArray(item?.combo_components)
            ? item.combo_components
            : Array.isArray(item?.comboComponents)
              ? item.comboComponents
              : [];
          comboComponents.forEach((component: any) => {
            const componentItems = Array.isArray(component?.items)
              ? component.items
              : Array.isArray(component?.options)
                ? component.options
                : [];
            componentItems.forEach((option: any) => assertLiteral('opÃ§Ã£o de combo', option?.name || option?.title || option?.label));
          });
        }
      }
      return unsupported.slice(0, 12);
    };
    if (
      shouldPreserveStructuredSourceFacts
      && previewNormalizedItemCount >= 8
      && (
        aiNormalizedItemCount === 0
        || aiNormalizedItemCount < Math.floor(previewNormalizedItemCount * 0.6)
        || (previewNormalizedOptionCount >= 8 && aiNormalizedOptionCount < Math.floor(previewNormalizedOptionCount * 0.6))
      )
    ) {
      normalizedMenu = previewNormalizedMenu;
      audit.normalizedMenu = normalizedMenu;
      audit.decision = 'ready';
      if (audit.nextAction === 'recollect_from_source' || audit.nextAction === 'manual_review') audit.nextAction = 'publish';
      audit.reason = 'Fonte nativa estruturada trouxe cardÃ¡pio completo; a auditoria preservou a extraÃ§Ã£o nativa por ser mais rica que a resposta da IA.';
      audit.corrections = [
        ...(Array.isArray(audit.corrections) ? audit.corrections : []),
        'NormalizaÃ§Ã£o preservou a estrutura nativa completa da plataforma porque a resposta da IA estava vazia ou menor que a fonte.',
      ];
      addLog(`PÃ³s-auditoria: usando estrutura nativa completa como base (${previewNormalizedItemCount} item(ns), ${previewNormalizedOptionCount} opÃ§Ã£o(Ãµes)), para nÃ£o perder detalhes de itens/opÃ§Ãµes.`);
    }
    if (shouldPreserveStructuredSourceFacts && previewNormalizedItemCount >= 4) {
      const unsupportedLiteralNames = findUnsupportedLiteralNames(normalizedMenu, authoritativeSourceCategories);
      if (unsupportedLiteralNames.length) {
        normalizedMenu = previewNormalizedMenu;
        audit.normalizedMenu = normalizedMenu;
        audit.decision = 'ready';
        if (audit.nextAction === 'recollect_from_source' || audit.nextAction === 'manual_review') audit.nextAction = 'publish';
        audit.corrections = [
          ...(Array.isArray(audit.corrections) ? audit.corrections : []),
          `Estrutura nativa restaurada porque a IA propÃ´s nomes que nÃ£o aparecem literalmente na fonte (${unsupportedLiteralNames.join('; ')}).`,
        ];
        addLog(`PÃ³s-auditoria: restaurei a estrutura nativa porque a IA tentou usar nomes sem prova literal (${unsupportedLiteralNames.join('; ')}).`);
      }
    }
    if (shouldPreserveStructuredSourceFacts) {
      const preserved = preserveStructuredSourceMenuFacts(normalizedMenu, authoritativeSourceCategories, { restoreMissingItems: true, forceSourceCategories: true });
      if (preserved.changed) {
        normalizedMenu = preserved.menu;
        audit.normalizedMenu = normalizedMenu;
        audit.corrections = [
          ...(Array.isArray(audit.corrections) ? audit.corrections : []),
          `Fonte nativa preservada antes de salvar: ${preserved.priceFixes} preÃ§o(s), ${preserved.optionFixes} grupo(s) de opÃ§Ãµes/adicionais, ${preserved.descriptionFixes} descriÃ§Ã£o(Ãµes), ${preserved.imageFixes} imagem(ns), ${preserved.categoryFixes} categoria(s) e ${preserved.missingItemsRestored} item(ns) restaurado(s).`,
        ];
        addLog(`PÃ³s-auditoria: fonte nativa Ã© autoridade; preservei ${preserved.priceFixes} preÃ§o(s), ${preserved.optionFixes} grupo(s) de adicionais/opÃ§Ãµes, ${preserved.categoryFixes} categoria(s) originais e restaurei ${preserved.missingItemsRestored} item(ns) que a IA havia omitido.`);
      }
    }
    let consistencyAudit: any = null;
    let sourceFidelityAudit: any = null;
    let consistencyCorrectionAppliedWithoutBlockers = false;
    const sourceTextForConsistency = [
      context.menuEvidence?.rawText,
      context.menuEvidence?.visualRawText,
      context.menuResult?.rawText,
      context.menuResult?.text,
      Array.isArray(context.menuEvidence?.textBlocks) ? context.menuEvidence.textBlocks.join('\n') : '',
    ].filter(Boolean).join('\n\n').slice(0, 90000);
    const pageTextEvidenceLength = normalizeText(sourceTextForConsistency).length;
    const weakSourceEvidenceWarning = Boolean(isDirectMenuSource && !hasNativeStructuredSource && !screenshotsForAudit.length && pageTextEvidenceLength < 300);
    const visualAuditUnavailableWarning = Boolean(isDirectMenuSource && !hasNativeStructuredSource && screenshotsForAudit.length > 0 && !visualStructureAudit);
    const evidenceGateMissing = false;
    const visualAuditRequiredButUnavailable = false;
    if (weakSourceEvidenceWarning) {
      addLog('Agente auditor: fonte direta sem print/texto bruto amplo; nÃ£o vou bloquear sÃ³ por isso, mas a auditoria estrutural precisa passar sem erros.');
    }
    if (visualAuditUnavailableWarning) {
      addLog('Agente auditor: havia print, mas a auditoria visual nÃ£o concluiu; isso agora Ã© aviso auxiliar, nÃ£o bloqueio.');
    }
    const shouldRunRemoteConsistencyAudit = Boolean(
      isDirectMenuSource
      && normalizedMenu.length > 0
      && !(hasNativeStructuredSource && canUseNativeFastAudit)
    );
    if (isDirectMenuSource && normalizedMenu.length > 0) {
      if (!shouldRunRemoteConsistencyAudit) {
        addLog('Agente auditor remoto pulado: fonte nativa estruturada forte ja passou pela auditoria rapida/local; nao vou travar o salvamento aguardando servico externo.');
      }
      if (shouldRunRemoteConsistencyAudit) {
      try {
        addLog('Agente auditor: comparando cardÃ¡pio estruturado com fonte original para impedir invenÃ§Ãµes.');
        const consistencyController = new AbortController();
        const consistencyTimeoutId = window.setTimeout(() => consistencyController.abort(), 25000);
        const consistencyResponse = await fetch('/api/local-collector/audit-menu-consistency', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: consistencyController.signal,
          body: JSON.stringify({
            proposedMenu: normalizedMenu,
            sourceMenu: authoritativeSourceCategories,
            sourceText: sourceTextForConsistency,
            sourceUrl: sourceUrlForAudit,
            visualAudit: visualStructureAudit,
            images: screenshotsForAudit,
          }),
        }).finally(() => window.clearTimeout(consistencyTimeoutId));
        const consistencyPayload = await consistencyResponse.json().catch(() => ({}));
        if (consistencyResponse.ok && consistencyPayload?.consistencyAudit) {
          consistencyAudit = consistencyPayload.consistencyAudit;
          const errors = Array.isArray(consistencyAudit.errors) ? consistencyAudit.errors : [];
          const blockingErrors = errors.filter((error: any) => String(error?.severity || '').toLowerCase() === 'blocking').length;
          addLog(`Agente auditor: ${consistencyAudit.verdict || 'sem veredito'} â€” ${errors.length} erro(s), ${blockingErrors} bloqueante(s). ${consistencyAudit.reason || ''}`.trim());
          if (
            consistencyAudit.verdict === 'corrected'
            && Array.isArray(consistencyAudit.correctedMenu)
            && consistencyAudit.correctedMenu.length
          ) {
            const corrected = mergeSourceImagesIntoMenu(normalizeAuditMenu(consistencyAudit.correctedMenu), authoritativeSourceCategories);
            const correctedCount = corrected.reduce((total: number, category: any) => total + ((category.items || []).length || 0), 0);
            const correctedOptionCount = countStructuredOptions(corrected);
            const correctedKeepsNativeStructure = !shouldPreserveStructuredSourceFacts
              || previewNormalizedOptionCount < 8
              || correctedOptionCount >= Math.floor(previewNormalizedOptionCount * 0.6);
            if (correctedCount >= 4 && correctedKeepsNativeStructure) {
              const correctedWithSourceFacts = shouldPreserveStructuredSourceFacts
                ? preserveStructuredSourceMenuFacts(corrected, authoritativeSourceCategories, { restoreMissingItems: true, forceSourceCategories: true })
                : { menu: corrected, changed: false, priceFixes: 0, optionFixes: 0, missingItemsRestored: 0 };
              normalizedMenu = correctedWithSourceFacts.menu;
              audit.normalizedMenu = normalizedMenu;
              if (blockingErrors === 0) {
                consistencyCorrectionAppliedWithoutBlockers = true;
                if (audit.decision !== 'reject') audit.decision = 'ready';
                if (audit.nextAction === 'recollect_from_source' || audit.nextAction === 'manual_review') audit.nextAction = 'publish';
              }
              audit.corrections = [
                ...(Array.isArray(audit.corrections) ? audit.corrections : []),
                `Agente auditor corrigiu o cardÃ¡pio e removeu dados nÃ£o sustentados pela fonte (${correctedCount} itens).`,
                correctedWithSourceFacts.changed
                  ? `ApÃ³s correÃ§Ã£o do agente, a fonte nativa restaurou ${correctedWithSourceFacts.priceFixes} preÃ§o(s), ${correctedWithSourceFacts.optionFixes} grupo(s) de opÃ§Ãµes/adicionais e ${correctedWithSourceFacts.missingItemsRestored} item(ns).`
                  : '',
              ].filter(Boolean);
              addLog(`Agente auditor aplicou menu corrigido: ${correctedCount} item(ns).${correctedWithSourceFacts.changed ? ' Fonte nativa reaplicada para impedir perda de preÃ§o/opÃ§Ãµes.' : ''}`);
            } else if (correctedCount >= 4 && !correctedKeepsNativeStructure) {
              audit.corrections = [
                ...(Array.isArray(audit.corrections) ? audit.corrections : []),
                'CorreÃ§Ã£o do agente auditor ignorada porque removia option_groups/options existentes na fonte nativa.',
              ];
              addLog(`Agente auditor sugeriu correÃ§Ã£o, mas ela perderia detalhes nativos (${correctedOptionCount}/${previewNormalizedOptionCount} opÃ§Ãµes); mantendo estrutura original da plataforma.`);
            }
          }
        } else {
          addLog(`Agente auditor indisponÃ­vel: ${consistencyPayload?.error || 'resposta invÃ¡lida'}.`);
        }
      } catch (consistencyError: any) {
        addLog(`Agente auditor falhou: ${consistencyError.message || consistencyError}.`);
      }
      }

      sourceFidelityAudit = auditMenuSourceFidelity(normalizedMenu, authoritativeSourceCategories, sourceTextForConsistency);
      const fidelityErrors = Array.isArray(sourceFidelityAudit.errors) ? sourceFidelityAudit.errors : [];
      const fidelityBlocking = fidelityErrors.filter((error: any) => String(error?.severity || '').toLowerCase() === 'blocking').length;
      const fidelitySamples = fidelityErrors
        .slice(0, 5)
        .map((error: any) => `${error?.type || 'erro'}${error?.item ? ` em "${error.item}"` : ''}: ${error?.message || ''}`)
        .filter(Boolean)
        .join(' | ');
      if (sourceFidelityAudit.changed && Array.isArray(sourceFidelityAudit.correctedMenu)) {
        normalizedMenu = mergeSourceImagesIntoMenu(normalizeAuditMenu(sourceFidelityAudit.correctedMenu), authoritativeSourceCategories);
        if (shouldPreserveStructuredSourceFacts) {
          const preservedAfterLocalAudit = preserveStructuredSourceMenuFacts(normalizedMenu, authoritativeSourceCategories, { restoreMissingItems: true, forceSourceCategories: true });
          if (preservedAfterLocalAudit.changed) normalizedMenu = preservedAfterLocalAudit.menu;
        }
        audit.normalizedMenu = normalizedMenu;
        addLog(`Agente auditor local removeu texto sem prova da fonte (${fidelityErrors.length} alerta(s), ${fidelityBlocking} bloqueante(s)).${fidelitySamples ? ` Exemplos: ${fidelitySamples}` : ''}`);
      } else if (fidelityErrors.length) {
        addLog(`Agente auditor local encontrou ${fidelityErrors.length} inconsistÃªncia(s), ${fidelityBlocking} bloqueante(s).${fidelitySamples ? ` Exemplos: ${fidelitySamples}` : ''}`);
      }
    }

    const normalizedItemCount = normalizedMenu.reduce(
      (total: number, category: any) => total + ((category.items || []).length || 0),
      0,
    );
    const hasStrongDirectMenuEvidence = Boolean(
      isDirectMenuSource
      && menuSnapshot.itemCount >= 8
      && menuSnapshot.priceCoverage >= 0.55
    );
    if (staleHubReasonAfterValidatedSource && normalizedMenu.length > 0) {
      audit.decision = 'ready';
      audit.nextAction = 'publish';
    }
    const sourceAuditIssues = Array.isArray(sourceAudit?.issues) ? sourceAudit.issues.map((issue: any) => normalizeText(String(issue || ''))) : [];
    const hasBlockingSourceIssue = localIssues.some(issue => /outros restaurantes|listagem|reviews?|fonte errada|misturou/i.test(issue))
      || sourceAuditIssues.some((issue: string) => /outro|listagem|review|avaliacao|fonte_errada|wrong_source|mixed_source/.test(issue));
    const aiCanRepairDirectMenu = Boolean(
      hasStrongDirectMenuEvidence
      && normalizedItemCount >= 6
      && audit.decision === 'ready'
    );
    const normalizedCategoryNames = normalizedMenu.map((category: any) => normalizeText(category.name));
    const missingVisualCategories = (Array.isArray(visualStructureAudit?.missing_categories) ? visualStructureAudit.missing_categories : [])
      .map((name: any) => normalizeText(name))
      .filter((name: string) => name.length >= 3)
      .filter((name: string) => !normalizedCategoryNames.some((categoryName: string) => categoryName.includes(name) || name.includes(categoryName)));
    let normalizedOptionCount = normalizedMenu.reduce((total: number, category: any) => total + (category.items || []).reduce((itemTotal: number, item: any) => {
      const optionCount = normalizeItemOptionRows(item).length;
      const comboCount = Array.isArray(item.combo_components) ? item.combo_components.reduce((sum: number, component: any) => sum + 1 + ((component.items || []).length || 0), 0) : 0;
      return itemTotal + optionCount + comboCount;
    }, 0), 0);
    const previewOptionCount = authoritativeSourceCategories.reduce((total: number, category: any) => total + ((category.items || category.menu_items || []) as any[]).reduce((itemTotal: number, item: any) => (
      itemTotal
      + normalizeItemOptionRows(item).length
      + (Array.isArray(item?.combo_components)
        ? item.combo_components.reduce((sum: number, component: any) => sum + 1 + ((component.items || []).length || 0), 0)
        : 0)
    ), 0), 0);
    if (
      shouldPreserveStructuredSourceFacts
      && previewOptionCount >= 8
      && normalizedMenu.length > 0
      && normalizedOptionCount < Math.max(1, Math.floor(previewOptionCount * 0.85))
    ) {
      const lostNormalizedOptionCount = normalizedOptionCount;
      normalizedMenu = previewNormalizedMenu;
      normalizedOptionCount = previewNormalizedOptionCount;
      audit.normalizedMenu = normalizedMenu;
      audit.decision = 'ready';
      if (audit.nextAction === 'recollect_from_source' || audit.nextAction === 'manual_review') audit.nextAction = 'publish';
      audit.corrections = [
        ...(Array.isArray(audit.corrections) ? audit.corrections : []),
        `Estrutura nativa restaurada porque o menu final perderia opÃ§Ãµes/adicionais da fonte (${lostNormalizedOptionCount}/${previewOptionCount}).`,
      ];
      addLog(`Agente auditor: restaurei a estrutura nativa porque a normalizaÃ§Ã£o estava perdendo grupos de opÃ§Ãµes/adicionais (${lostNormalizedOptionCount}/${previewOptionCount}).`);
    }
    const sourceHasOptionHints = /escolha\s+(?:at[eÃ©]\s*)?\d|obrigat[oÃ³]rio|massas?\s*&?\s*bordas?|bordas?|adicionais?|complementos?|turbinar|bora de combo|sabores?|selecion[e|a]|op[cÃ§][oÃµ]es/i
      .test(`${sourceTextForConsistency || ''}\n${JSON.stringify(visualStructureAudit || {})}`.slice(0, 120000));
    const visualMissingOptions = Array.isArray(visualStructureAudit?.missing_options_or_addons)
      ? visualStructureAudit.missing_options_or_addons
      : [];
    const optionHintOnlyFalsePositive = Boolean(
      hasVisibleStructuredProductSource
      && previewOptionCount === 0
      && normalizedOptionCount === 0
      && visualMissingOptions.length === 0
      && sourceHasOptionHints
    );
    if (optionHintOnlyFalsePositive) {
      addLog('Agente auditor: texto generico de personalizacao em catalogo de produtos nao sera tratado como grupo de opcoes ausente.');
    }
    const optionDetailsMissingFromNormalizedMenu = Boolean(
      isDirectMenuSource
      && normalizedMenu.length > 0
      && normalizedOptionCount === 0
      && !optionHintOnlyFalsePositive
      && (
        previewOptionCount > 0
        || sourceHasOptionHints
        || visualMissingOptions.length > 0
      )
    );
    if (optionDetailsMissingFromNormalizedMenu) {
      addLog('Agente auditor: bloqueando publicaÃ§Ã£o porque a fonte indica adicionais/escolhas, mas o cardÃ¡pio final ficou sem grupos de opÃ§Ãµes.');
    }
    const nativeStructuredMenuEvidence = Boolean(
      isDirectMenuSource
      && hasNativeStructuredSource
      && menuSnapshot.itemCount >= 8
      && (previewOptionCount >= 8 || normalizedOptionCount >= 8)
    );
    const structuredProductMenuEvidence = Boolean(
      isDirectMenuSource
      && shouldPreserveStructuredSourceFacts
      && normalizedMenu.length > 0
      && menuSnapshot.itemCount >= 8
      && menuSnapshot.priceCoverage >= 0.55
      && normalizedItemCount >= Math.max(4, Math.floor(previewNormalizedItemCount * 0.85))
    );
    if (
      nativeStructuredMenuEvidence
      && normalizedMenu.length > 0
      && /combo.*sem.*(component|op[cÃ§][aÃ£]o|opcao)|sem componentes ou op/i.test(String(audit.reason || ''))
    ) {
      audit.decision = 'ready';
      audit.nextAction = 'publish';
      audit.reason = 'Fonte nativa estruturada trouxe itens, opÃ§Ãµes e imagens suficientes; bloqueio anterior por combo sem componentes foi ignorado por haver opÃ§Ãµes comprovadas.';
      audit.corrections = [
        ...(Array.isArray(audit.corrections) ? audit.corrections : []),
        'Bloqueio de combo sem componentes ignorado porque a fonte nativa forneceu option_groups/options verificÃ¡veis.',
      ];
    }
    const visualNeedsRestructure = visualStructureAudit?.recommendation === 'needs_restructure' && Number(visualStructureAudit?.confidence ?? 0.8) >= 0.65;
    const visualStillUnresolved = Boolean(
      visualNeedsRestructure
      && !nativeStructuredMenuEvidence
      && !structuredProductMenuEvidence
      && (
        missingVisualCategories.length > 0
        || ((visualStructureAudit?.missing_options_or_addons || []).length > 0 && normalizedOptionCount === 0)
        || ((visualStructureAudit?.wrongly_promoted_items || []).length > 0 && normalizedOptionCount === 0)
      )
    );
    const visualNeedsMoreScreenshots = isDirectMenuSource
      && visualStructureAudit?.recommendation === 'needs_more_screenshots'
      && !nativeStructuredMenuEvidence
      && !structuredProductMenuEvidence;
    const consistencyErrors = Array.isArray(consistencyAudit?.errors) ? consistencyAudit.errors : [];
    const sourceFidelityErrors = Array.isArray(sourceFidelityAudit?.errors) ? sourceFidelityAudit.errors : [];
    const consistencyHasBlockingEvidenceRaw = consistencyErrors.some((error: any) => String(error?.severity || '').toLowerCase() === 'blocking')
      || consistencyErrors.some((error: any) => /invented_item|combo_without_components|addon_promoted|price_mismatch|missing_category/i.test(String(error?.type || '')));
    const consistencyAvailabilityOnlyBlock = Boolean(
      consistencyErrors.length > 0
      && consistencyErrors.every((error: any) => {
        const label = `${error?.type || ''} ${error?.message || ''} ${error?.reason || ''} ${error?.item || ''}`;
        return /esgotad|indispon[iÃ­]vel|fora de estoque|sem estoque|estoque/i.test(label)
          && !/invented_item|combo_without_components|addon_promoted|price_mismatch|missing_category|unsupported_category|unsupported_option|pre[cÃ§]o|categoria|op[cÃ§][aÃ£]o|adicional|combo|outro restaurante|listagem|review/i.test(label);
      })
    );
    const consistencyOnlyCorrectedUnsupportedDescriptions = Boolean(
      nativeStructuredMenuEvidence
      && consistencyAudit?.verdict === 'corrected'
      && Array.isArray(consistencyAudit?.correctedMenu)
      && consistencyAudit.correctedMenu.length > 0
      && consistencyErrors.length > 0
      && consistencyErrors.every((error: any) => {
        const label = `${error?.type || ''} ${error?.message || ''} ${error?.reason || ''}`;
        return /description|descri[cÃ§][aÃ£]o/i.test(label)
          && !/invented_item|combo_without_components|addon_promoted|price_mismatch|missing_category|unsupported_category|unsupported_option|pre[cÃ§]o|categoria|op[cÃ§][aÃ£]o|adicional|combo/i.test(label);
      })
    );
    const consistencyHasBlockingEvidence = consistencyHasBlockingEvidenceRaw
      && !consistencyAvailabilityOnlyBlock
      && !consistencyOnlyCorrectedUnsupportedDescriptions
      && !consistencyCorrectionAppliedWithoutBlockers;
    if (consistencyCorrectionAppliedWithoutBlockers) {
      addLog('Agente auditor corrigiu a estrutura sem bloqueantes; a publicacao pode seguir se os gates locais passarem.');
    }
    if (consistencyOnlyCorrectedUnsupportedDescriptions) {
      addLog('Agente auditor: descricoes sem prova foram removidas, mas a fonte nativa estruturada manteve itens, precos e opcoes; isso nao bloqueia publicacao.');
    }
    if (consistencyAvailabilityOnlyBlock) {
      addLog('Agente auditor: bloqueio por item esgotado/indisponivel tratado como informacao de disponibilidade, nao como erro do cardapio.');
    }
    const sourceFidelityHasBlockingEvidence = sourceFidelityErrors.some((error: any) => String(error?.severity || '').toLowerCase() === 'blocking')
      || sourceFidelityErrors.some((error: any) => /invented_item|combo_without_components|unsupported_category|unsupported_option|price_mismatch|missing_category/i.test(String(error?.type || '')));
    const nativeStructuredSourcePreserved = Boolean(
      nativeStructuredMenuEvidence
      && normalizedMenu.length > 0
      && normalizedItemCount >= Math.max(4, Math.floor(previewNormalizedItemCount * 0.9))
      && (
        previewNormalizedOptionCount < 8
        || normalizedOptionCount >= Math.max(1, Math.floor(previewNormalizedOptionCount * 0.85))
      )
    );
    const nativeStructuredAuditFalsePositive = Boolean(
      nativeStructuredSourcePreserved
      && !sourceFidelityHasBlockingEvidence
      && (
        consistencyAudit?.verdict === 'block'
        || consistencyHasBlockingEvidenceRaw
        || visualNeedsRestructure
      )
    );
    if (nativeStructuredAuditFalsePositive) {
      audit.decision = 'ready';
      audit.nextAction = 'publish';
      audit.reason = 'Fonte nativa estruturada preservada e sem erro real de fidelidade; bloqueio visual/consistencia foi tratado como falso positivo para permitir a etapa final de fotos.';
      audit.corrections = [
        ...(Array.isArray(audit.corrections) ? audit.corrections : []),
        'Bloqueio preventivo de auditoria ignorado porque a fonte oficial estruturada preservou itens/opcoes/precos e a auditoria local nao encontrou erro bloqueante de fidelidade.',
      ];
      addLog('Agente auditor: fonte nativa estruturada preservada sem erro real de fidelidade; falso bloqueio visual/consistencia nao impedira a etapa final de fotos.');
    }
    const consistencyBlockReason = String(consistencyAudit?.reason || '').trim();
    const consistencyVerdictBlockIsActionable = consistencyAudit?.verdict === 'block'
      && (
        consistencyHasBlockingEvidence
        || (!nativeStructuredMenuEvidence && /invent|falt|ausente|inconsist|pre[cÃ§]o|categoria|op[cÃ§][aÃ£]o|adicional|combo|n[aÃ£]o encontrado|nao encontrado/i.test(consistencyBlockReason))
      );
    if (
      nativeStructuredMenuEvidence
      && normalizedMenu.length > 0
      && audit.decision !== 'reject'
      && !consistencyHasBlockingEvidence
      && !sourceFidelityHasBlockingEvidence
      && (
        audit.nextAction === 'recollect_from_source'
        || audit.nextAction === 'manual_review'
        || /screenshot|print|recolet|processar resultado|card[aÃ¡]pio com 0 itens|combo.*sem.*(component|op[cÃ§][aÃ£]o|opcao)|sem componentes ou op/i.test(String(audit.reason || ''))
      )
    ) {
      audit.decision = 'ready';
      audit.nextAction = 'publish';
      audit.reason = 'Fonte nativa estruturada trouxe itens, opÃ§Ãµes, preÃ§os e imagens suficientes; a auditoria nÃ£o encontrou erro real de fonte.';
      audit.corrections = [
        ...(Array.isArray(audit.corrections) ? audit.corrections : []),
        'Bloqueio preventivo ignorado porque a fonte nativa estruturada passou pela auditoria sem inconsistÃªncias bloqueantes.',
      ];
    }
    if (shouldPreserveStructuredSourceFacts && normalizedMenu.length > 0) {
      const finalPreservation = preserveStructuredSourceMenuFacts(normalizedMenu, authoritativeSourceCategories, { restoreMissingItems: true, forceSourceCategories: true });
      if (finalPreservation.changed) {
        normalizedMenu = finalPreservation.menu;
        audit.normalizedMenu = normalizedMenu;
        addLog(`PÃ³s-auditoria final: reapliquei a fonte nativa antes do banco (${finalPreservation.priceFixes} preÃ§o(s), ${finalPreservation.optionFixes} grupo(s) de opÃ§Ãµes/adicionais, ${finalPreservation.categoryFixes} categoria(s), ${finalPreservation.missingItemsRestored} item(ns) restaurado(s)).`);
      }
    }
    const structuralAudit = auditMenuStructuralCoherence(normalizedMenu);
    if (structuralAudit.findings.length > 0) {
      const examples = structuralAudit.findings
        .slice(0, 4)
        .map((finding: any) => `${finding.type}: ${finding.item}`)
        .join(' | ');
      addLog(`Auditoria estrutural local: ${structuralAudit.blockingCount} bloqueante(s), ${structuralAudit.warningCount} aviso(s). ${examples}`);
      audit.corrections = [
        ...(Array.isArray(audit.corrections) ? audit.corrections : []),
        ...structuralAudit.findings.slice(0, 8).map((finding: any) => `${finding.type}: ${finding.message}${finding.fixHint ? ` (${finding.fixHint})` : ''}`),
      ];
    }
    const consistencyBlocksPublish = Boolean(
      sourceFidelityHasBlockingEvidence
      || (!nativeStructuredAuditFalsePositive && (
        consistencyVerdictBlockIsActionable
        || consistencyHasBlockingEvidence
      ))
    );
    const priceCompletenessBlocksPublish = Boolean(
      Number(sourceAudit?.unresolvedPriceCount || 0) > 0
      || (menuSnapshot.itemCount > 0 && menuSnapshot.pricedItemCount === 0)
    );
    if (priceCompletenessBlocksPublish) {
      addLog('Pos-auditoria bloqueou publicacao: cardapio com item(ns) sem preco confiavel deve ir para revisao humana.');
    }
    const structuredProductVisualFalsePositive = Boolean(
      hasVisibleStructuredProductSource
      && structuredProductMenuEvidence
      && normalizedMenu.length > 0
      && audit.decision === 'ready'
      && audit.nextAction === 'publish'
      && !sourceFidelityHasBlockingEvidence
      && !consistencyHasBlockingEvidence
      && structuralAudit.blockingCount === 0
      && !priceCompletenessBlocksPublish
    );
    if (structuredProductVisualFalsePositive && (visualStillUnresolved || visualNeedsMoreScreenshots)) {
      addLog('Pos-auditoria: alerta visual tratado como falso positivo porque o codigo/DOM da fonte estruturada trouxe produtos, precos e imagens coerentes.');
    }
    const normalizedAuditReason = normalizeText(String(audit.reason || ''));
    const stockAvailabilityOnlyBlock = Boolean(
      (normalizedMenu.length > 0 || previewNormalizedItemCount > 0)
      && /esgotad|indisponivel|fora de estoque|sem produtos disponiveis|produto indisponivel/.test(normalizedAuditReason)
      && !/sem preco|preco confiavel|endereco|coordenad|latitude|longitude|fonte errada|outro restaurante|listagem|review|captcha|login|bloqueio|opcao|adicional|combo|invent|categoria|screenshot|print|recolet/.test(normalizedAuditReason)
    );
    if (stockAvailabilityOnlyBlock) {
      if (normalizedMenu.length === 0 && previewNormalizedMenu.length > 0) {
        normalizedMenu = previewNormalizedMenu;
        audit.normalizedMenu = normalizedMenu;
      }
      audit.decision = 'ready';
      audit.nextAction = 'publish';
      audit.reason = 'Cardapio possui itens marcados como esgotados/indisponiveis, mas disponibilidade nao bloqueia publicacao; itens preservados como informacao da fonte.';
      audit.corrections = [
        ...(Array.isArray(audit.corrections) ? audit.corrections : []),
        'Bloqueio por disponibilidade/estoque ignorado: item esgotado deve ser preservado no cardapio, nao impedir salvamento.',
      ];
      addLog('Pos-auditoria: itens esgotados/indisponiveis nao bloqueiam mais o cardapio; vou salvar a estrutura coletada.');
    }
    const publishCandidateRestaurant = { ...currentRestaurant, ...restaurantUpdate };
    const finalPublicDataIssues = Array.from(new Set([
      ...getPublicIdentityIssues(publishCandidateRestaurant),
      ...getPublicAddressIssues(publishCandidateRestaurant),
    ]));
    if (finalPublicDataIssues.length) {
      addLog(`PÃ³s-auditoria bloqueou publicaÃ§Ã£o por dados pÃºblicos incompletos: ${finalPublicDataIssues.join(' | ')}`);
    }
    const canBeReady = audit.decision === 'ready'
      && normalizedMenu.length > 0
      && finalPublicDataIssues.length === 0
      && (!hasBlockingSourceIssue || aiCanRepairDirectMenu)
      && (!visualStillUnresolved || structuredProductVisualFalsePositive)
      && !optionDetailsMissingFromNormalizedMenu
      && structuralAudit.blockingCount === 0
      && !consistencyBlocksPublish
      && !priceCompletenessBlocksPublish;
    const finalGateDebug = {
      auditDecision: audit.decision,
      auditNextAction: audit.nextAction,
      normalizedItemCount,
      normalizedOptionCount,
      previewNormalizedItemCount,
      previewNormalizedOptionCount,
      menuSnapshot,
      finalPublicDataIssues,
      hasBlockingSourceIssue,
      aiCanRepairDirectMenu,
      evidenceGateMissing,
      visualAuditRequiredButUnavailable,
      weakSourceEvidenceWarning,
      visualAuditUnavailableWarning,
      visualStillUnresolved,
      visualNeedsMoreScreenshots,
      optionDetailsMissingFromNormalizedMenu,
      optionHintOnlyFalsePositive,
      structuralBlockingCount: structuralAudit.blockingCount,
      consistencyAvailabilityOnlyBlock,
      consistencyBlocksPublish,
      priceCompletenessBlocksPublish,
      hasVisibleStructuredProductSource,
      structuredProductMenuEvidence,
      structuredProductVisualFalsePositive,
      authoritativeSourceImageCount,
    };
    if (hasBlockingSourceIssue && aiCanRepairDirectMenu) {
      addLog('PÃ³s-auditoria IA assumiu a curadoria: fonte direta com itens reais foi normalizada apesar de alerta tÃ©cnico.');
    }

    if (audit.deleteExistingMenu === true || (!canBeReady && (menuSnapshot.junkItemCount > 0 || context.menuResult?.dryRun || context.menuResult?.success || context.menuEvidence?.success))) {
      const { data: existingCats } = await supabase.from('menu_categories').select('id').eq('restaurant_id', restaurant.id);
      if (existingCats?.length) {
        const catIds = existingCats.map((cat: any) => cat.id);
        await supabase.from('menu_items').delete().in('category_id', catIds);
        await supabase.from('menu_categories').delete().eq('restaurant_id', restaurant.id);
        addLog('PÃ³s-auditoria removeu cardÃ¡pio ruim para impedir publicaÃ§Ã£o acidental.');
      }
    } else if (canBeReady && context.applyMenu !== false) {
      const appliedMenu = await replaceRestaurantMenuFromAudit(restaurant.id, normalizedMenu);
      addLog(`PÃ³s-auditoria IA padronizou o cardÃ¡pio: ${appliedMenu.reduce((total: number, cat: any) => total + cat.items.length, 0)} item(ns) em ${appliedMenu.length} categoria(s).`);
    } else if (canBeReady) {
      addLog('PÃ³s-auditoria IA aprovou a prÃ©via; o extrator salvarÃ¡ a versÃ£o estruturada preservando adicionais/opÃ§Ãµes.');
    }

    if (!canBeReady) {
      const allLocalIssues = Array.from(new Set([...localIssues, ...finalPublicDataIssues]));
      const reasonText = `${audit.reason || ''} ${allLocalIssues.join(' ')}`;
      const needsRecollection = audit.nextAction === 'recollect_from_source'
        || consistencyBlocksPublish
        || finalPublicDataIssues.length > 0
        || /fonte errada|listagem|reviews?|outro restaurante|misturou|extra[cÃ§][aÃ£]o ruim|recolet|coordenad|latitude|longitude|geocod|endere[cÃ§]o|identidade|nome p[uÃº]blico|google maps|maps/i.test(reasonText);
      const requiresHuman = audit.nextAction === 'manual_review'
        || priceCompletenessBlocksPublish
        || /\b(login|captcha|bloqueio|interven[cÃ§][aÃ£]o humana|sess[aÃ£]o)\b/i.test(reasonText);
      return {
        ready: false,
        reason: consistencyBlocksPublish
          ? `Agente auditor bloqueou publicaÃ§Ã£o: ${consistencyAudit?.reason || sourceFidelityErrors[0]?.message || 'cardÃ¡pio estruturado nÃ£o bate com a fonte original.'}`
          : (priceCompletenessBlocksPublish
            ? 'Cardapio enviado para revisao humana: ha item(ns) sem preco confiavel.'
          : (finalPublicDataIssues.length
            ? `Dados pÃºblicos incompletos: ${finalPublicDataIssues.join(' | ')}`
            : (audit.reason || allLocalIssues.join(' | ') || 'PÃ³s-auditoria nÃ£o aprovou para publicaÃ§Ã£o.'))),
        audit: { ...audit, consistencyAudit, sourceFidelityAudit, finalGateDebug },
        localIssues: allLocalIssues,
        needsRecollection: needsRecollection && !requiresHuman,
        requiresHuman,
      };
    }

    return {
      ready: true,
      reason: audit.reason || 'PÃ³s-auditoria aprovou dados publicÃ¡veis.',
      audit: { ...audit, normalizedMenu, consistencyAudit, sourceFidelityAudit, finalGateDebug },
      localIssues,
    };
  };

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
  }, [logs]);

  const fetchRestaurants = async () => {
    setIsLoading(true);
    try {
      let projectCity: { name: string; state: string } | null = null;
      if (cityId) {
        const { data: cityData, error: cityError } = await supabase
          .from('expansion_projects')
          .select('name, state')
          .eq('slug', cityId)
          .single();
        if (cityError) throw cityError;
        projectCity = cityData;
        setCityScope(cityData);
      }

      const targetLimit = loadedRowLimit + 1;
      const serverSearchTerm = searchTerm.trim();
      const serverSearchPattern = serverSearchTerm
        ? '%' + serverSearchTerm.replace(/[%,*_]/g, ' ').replace(/\s+/g, ' ').trim() + '%'
        : '';
      const applyCityAndSearchFilters = (query: any) => {
        let scopedQuery = query;
        if (projectCity?.name && projectCity?.state) {
          scopedQuery = scopedQuery.eq('city', projectCity.name).eq('state', projectCity.state);
        }
        if (serverSearchPattern) {
          scopedQuery = scopedQuery.or('name.ilike.' + serverSearchPattern + ',address.ilike.' + serverSearchPattern + ',category.ilike.' + serverSearchPattern);
        }
        return scopedQuery;
      };

      const countRows = async (configureQuery: (query: any) => any) => {
        const { count, error } = await configureQuery(applyCityAndSearchFilters(
          supabase.from('restaurants').select('id', { count: 'exact', head: true })
        ));
        if (error) throw error;
        return count || 0;
      };

      const exactStats: QaStats = {
        ...EMPTY_QA_STATS,
        pendentes: (
          await countRows(query => applyPendingMenuStatusFilter(query.eq('is_deleted', false).eq('is_published', false).eq('ai_validated', false)))
        ) + (
          await countRows(query => query.eq('is_deleted', false).eq('is_published', false).in('menu_status', MENU_RECOLLECT_STATUSES))
        ),
        prontos: await countRows(query => query.eq('is_deleted', false).eq('is_published', false).eq('menu_status', 'found')),
        sem_cardapio: await countRows(query => query.eq('is_deleted', false).eq('is_published', false).in('menu_status', MENU_NO_CARDAPIO_STATUSES)),
        revisao: (
          await countRows(query => query.eq('is_deleted', false).eq('is_published', false).in('menu_status', MENU_REVIEW_STATUSES))
        ) + (
          await countRows(query => query.eq('is_deleted', false).eq('is_published', true).neq('menu_status', 'found'))
        ),
        rejeitados: await countRows(query => query.eq('is_deleted', true)),
        importados: await countRows(query => query.eq('is_deleted', false).eq('is_published', true).eq('menu_status', 'found')),
      };
      setServerQaStats(exactStats);

      const fetchLimitedRows = async (
        configureQuery: (query: any) => any,
        limit = targetLimit
      ) => {
        const query = configureQuery(applyCityAndSearchFilters(
          supabase
            .from('restaurants')
            .select(VALIDATION_LIST_SELECT)
        ));
        const { data, error } = await query
          .order('created_at', { ascending: false })
          .limit(limit);
        if (error) throw error;
        return data || [];
      };

      const fetchRowsForTab = async (tab: ValidationTab) => {
        if (tab === 'pendentes') {
          const [pendingRows, recollectRows] = await Promise.all([
            fetchLimitedRows(query => applyPendingMenuStatusFilter(query.eq('is_deleted', false).eq('is_published', false).eq('ai_validated', false))),
            fetchLimitedRows(query => query.eq('is_deleted', false).eq('is_published', false).in('menu_status', MENU_RECOLLECT_STATUSES), VALIDATION_FETCH_BATCH_SIZE),
          ]);
          return [...pendingRows, ...recollectRows];
        }
        if (tab === 'prontos') {
          return fetchLimitedRows(query => query.eq('is_deleted', false).eq('is_published', false).eq('menu_status', 'found'));
        }
        if (tab === 'sem_cardapio') {
          return fetchLimitedRows(query => query.eq('is_deleted', false).eq('is_published', false).in('menu_status', MENU_NO_CARDAPIO_STATUSES));
        }
        if (tab === 'revisao') {
          const [reviewRows, publishedWithoutMenuRows] = await Promise.all([
            fetchLimitedRows(query => query.eq('is_deleted', false).eq('is_published', false).in('menu_status', MENU_REVIEW_STATUSES)),
            fetchLimitedRows(query => query.eq('is_deleted', false).eq('is_published', true).neq('menu_status', 'found'), VALIDATION_FETCH_BATCH_SIZE),
          ]);
          return [...reviewRows, ...publishedWithoutMenuRows];
        }
        if (tab === 'rejeitados') {
          return fetchLimitedRows(query => query.eq('is_deleted', true));
        }
        return fetchLimitedRows(query => query.eq('is_deleted', false).eq('is_published', true).eq('menu_status', 'found'));
      };

      setHasMoreRestaurants((exactStats[activeTab] || 0) > loadedRowLimit);

      const rows = await fetchRowsForTab(activeTab);
      const mergedById = new Map<string, any>();
      rows.slice(0, loadedRowLimit).forEach((row: any) => mergedById.set(row.id, row));
      setRestaurants([...mergedById.values()]);
    } catch (err) {
      console.error('Error fetching restaurants:', err);
    } finally {
      setIsLoading(false);
    }
  };

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

  const getMenuStatusReason = (restaurant: any) => {
    const log = readAiLog(restaurant);
    return restaurant?.menu_status_reason || log?.reason || '';
  };

  const ensureRestaurantCoverFromSavedGallery = async (restaurantId: string, sourceLabel = 'galeria ja aprovada') => {
    const { data: restaurantRow } = await supabase
      .from('restaurants')
      .select('cover_image_url, coverImage')
      .eq('id', restaurantId)
      .single();
    if (restaurantRow?.cover_image_url || restaurantRow?.coverImage) return;

    const { data, error } = await supabase
      .from('restaurant_gallery')
      .select('image_url')
      .eq('restaurant_id', restaurantId)
      .order('order_index', { ascending: true })
      .limit(MAX_PUBLIC_GALLERY_IMAGES);
    if (error) throw error;

    const firstImage = (data || []).map((item: any) => String(item?.image_url || '').trim()).find(Boolean);
    if (!firstImage) return;

    await updateRestaurantWithSchemaFallback(restaurantId, { cover_image_url: firstImage });
    addLog(`Imagem de capa definida automaticamente a partir da galeria (${sourceLabel}).`);
  };

  useEffect(() => {
    setLoadedRowLimit(VALIDATION_INITIAL_ROW_LIMIT);
  }, [cityId, activeTab, searchTerm]);

  useEffect(() => {
    fetchRestaurants();
  }, [cityId, loadedRowLimit, searchTerm, activeTab]);

  const hasStructuredMenu = (restaurant: any) => {
    return restaurant?.menu_status === 'found';
  };

  const getQaState = (restaurant: any) => {
    if (restaurant?.is_deleted === true) {
      return {
        key: 'rejeitado',
        label: 'Rejeitado',
        action: 'Fora do app',
        className: 'bg-rose-50 text-rose-700 border-rose-200',
      };
    }
    if (restaurant?.is_published === true && !hasStructuredMenu(restaurant)) {
      return {
        key: 'revisao',
        label: 'Publicado sem cardapio',
        action: 'Despublicar ou revalidar',
        className: 'bg-rose-50 text-rose-700 border-rose-200',
      };
    }
    if (restaurant?.is_published === true) {
      return {
        key: 'publicado',
        label: 'Publicado',
        action: 'VisÃ­vel no app',
        className: 'bg-slate-900 text-white border-slate-900',
      };
    }
    if (hasStructuredMenu(restaurant)) {
      return {
        key: 'pronto',
        label: 'Pronto p/ app',
        action: 'Pode aprovar lote',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    }
    const menuStatus = getMenuStatus(restaurant);
    if (MENU_RECOLLECT_STATUSES.includes(menuStatus || '')) {
      return {
        key: 'pendente',
        label: 'Recoletar IA',
        action: 'IA deve escolher outra fonte',
        className: 'bg-sky-50 text-sky-700 border-sky-200',
      };
    }
    if (MENU_REVIEW_STATUSES.includes(menuStatus || '')) {
      return {
        key: 'revisao',
        label: 'RevisÃ£o humana',
        action: 'Resolver bloqueio/login/captcha',
        className: 'bg-violet-50 text-violet-700 border-violet-200',
      };
    }
    if (MENU_NO_CARDAPIO_STATUSES.includes(menuStatus || '')) {
      return {
        key: 'sem_cardapio',
        label: 'Sem cardÃ¡pio',
        action: 'NÃ£o publicar; possÃ­vel CRM',
        className: 'bg-orange-50 text-orange-700 border-orange-200',
      };
    }
    if (restaurant?.ai_validated !== true) {
      return {
        key: 'pendente',
        label: 'Pendente',
        action: 'Rodar Validar IA',
        className: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    }
    return {
      key: 'revisao',
      label: 'QA incompleto',
      action: 'Revalidar com extensÃ£o',
      className: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  };

  const activeRestaurants = useMemo(() => (
    restaurants.filter(r => r.is_deleted !== true)
  ), [restaurants]);

  const qaStateCache = useMemo(() => {
    const cache = new WeakMap<object, ReturnType<typeof getQaState>>();
    restaurants.forEach(restaurant => {
      if (restaurant && typeof restaurant === 'object') {
        cache.set(restaurant, getQaState(restaurant));
      }
    });
    return cache;
  }, [restaurants]);

  const getCachedQaState = (restaurant: any) => (
    restaurant && typeof restaurant === 'object'
      ? qaStateCache.get(restaurant) || getQaState(restaurant)
      : getQaState(restaurant)
  );

  const leadTriageCache = useMemo(() => {
    const cache = new WeakMap<object, ReturnType<typeof getLeadTriage>>();
    if (!showValidationDiagnostics && activeTriageFilter === 'all') return cache;

    restaurants.forEach(restaurant => {
      if (restaurant && typeof restaurant === 'object') {
        cache.set(restaurant, getLeadTriage(restaurant));
      }
    });
    return cache;
  }, [activeTriageFilter, restaurants, showValidationDiagnostics]);

  const getCachedLeadTriage = (restaurant: any) => (
    restaurant && typeof restaurant === 'object'
      ? leadTriageCache.get(restaurant) || getLeadTriage(restaurant)
      : getLeadTriage(restaurant)
  );

  const loadedQaStats = useMemo(() => {
    const stats = {
      pendentes: 0,
      prontos: 0,
      sem_cardapio: 0,
      revisao: 0,
      rejeitados: 0,
      importados: 0,
    };

    restaurants.forEach(restaurant => {
      if (restaurant.is_deleted === true) {
        stats.rejeitados += 1;
        return;
      }

      const state = getCachedQaState(restaurant).key;
      if (state === 'pendente') stats.pendentes += 1;
      if (state === 'pronto') stats.prontos += 1;
      if (state === 'sem_cardapio') stats.sem_cardapio += 1;
      if (state === 'revisao') stats.revisao += 1;
      if (state === 'publicado') stats.importados += 1;
    });

    return stats;
  }, [restaurants, qaStateCache]);

  const qaStats = serverQaStats || loadedQaStats;

  const triageBaseRestaurants = useMemo(() => (
    activeTab === 'rejeitados'
      ? restaurants.filter(r => r.is_deleted === true)
      : activeRestaurants
  ), [activeRestaurants, activeTab, restaurants]);

  const triageStats = useMemo(() => {
    if (!showValidationDiagnostics) return {} as Record<LeadTriageKey, number>;
    return triageBaseRestaurants.reduce((acc, restaurant) => {
      const key = getCachedLeadTriage(restaurant).key;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<LeadTriageKey, number>);
  }, [leadTriageCache, showValidationDiagnostics, triageBaseRestaurants]);

  const autoRejectTriageKeys: LeadTriageKey[] = [
    'maps_status_closed',
    'maps_result_noise',
    'public_place_or_map_point',
    'bakery_or_confectionery_needs_menu',
    'venue_or_event_needs_menu',
    'likely_reject_retail',
    'likely_reject_service',
  ];
  const highPriorityTriageKeys: LeadTriageKey[] = ['likely_food_service'];
  const ambiguousTriageKeys: LeadTriageKey[] = ['unknown_need_maps_ai', 'generic_low_signal', 'mixed_needs_maps_menu', 'buffet_catering_needs_menu'];
  const triageCount = (keys: LeadTriageKey[]) => keys.reduce((total, key) => total + (triageStats[key] || 0), 0);
  const operationStats = useMemo(() => {
    if (!showValidationDiagnostics) {
      return {
        total: activeRestaurants.length,
        highPriority: 0,
        ambiguous: 0,
        autoReject: 0,
        readyForApproval: qaStats.prontos,
        missingLocation: 0,
        missingMenuSource: 0,
      };
    }

    return {
      total: activeRestaurants.length,
      highPriority: triageCount(highPriorityTriageKeys),
      ambiguous: triageCount(ambiguousTriageKeys),
      autoReject: triageCount(autoRejectTriageKeys),
      readyForApproval: qaStats.prontos,
      missingLocation: activeRestaurants.filter(r => r.latitude == null || r.longitude == null).length,
      missingMenuSource: activeRestaurants.filter(r => !r.other_url && !r.ifood_url && !r.whatsapp_url).length,
    };
  }, [activeRestaurants, qaStats.prontos, showValidationDiagnostics, triageStats]);

  const triageCards: { key: LeadTriageKey; label: string; hint: string; className: string }[] = [
    { key: 'likely_food_service', label: 'ProvÃ¡veis restaurantes', hint: 'Bons candidatos, mas ainda exigem Validar IA e cardÃ¡pio.', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { key: 'unknown_need_maps_ai', label: 'IA/Maps obrigatÃ³rio', hint: 'Nome/categoria nÃ£o bastam; a IA deve abrir fontes antes de decidir.', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    { key: 'generic_low_signal', label: 'Nome genÃ©rico fraco', hint: 'Bar, aÃ§aÃ­, lanchonete etc. sem marca clara. Baixa prioridade atÃ© haver prova.', className: 'bg-sky-50 text-sky-700 border-sky-200' },
    { key: 'maps_result_noise', label: 'RuÃ­do do Maps', hint: 'Ruas, bairros, snippets e pontos do mapa: o Validar IA remove.', className: 'bg-slate-50 text-slate-700 border-slate-200' },
    { key: 'public_place_or_map_point', label: 'Ponto pÃºblico/mapa', hint: 'Ruas, praÃ§as, parques e terminais: remover da base.', className: 'bg-slate-50 text-slate-700 border-slate-200' },
    { key: 'bakery_or_confectionery_needs_menu', label: 'Padarias/panificadoras', hint: 'Regra de produto: remover, nÃ£o validar para o app.', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    { key: 'mixed_needs_maps_menu', label: 'NegÃ³cios mistos', hint: 'ConveniÃªncia/hotel/varejo com comida: exige Maps + cardÃ¡pio.', className: 'bg-violet-50 text-violet-700 border-violet-200' },
    { key: 'buffet_catering_needs_menu', label: 'Buffet/catering', hint: 'Buffet isolado sÃ³ avanÃ§a se houver cardÃ¡pio pÃºblico organizado.', className: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' },
    { key: 'venue_or_event_needs_menu', label: 'HotÃ©is/sÃ­tios/eventos', hint: 'Regra de produto: remover, mesmo se houver comida ocasional.', className: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' },
    { key: 'likely_reject_retail', label: 'Varejo/mercado', hint: 'Supermercados, mercearias, distribuidoras e similares.', className: 'bg-orange-50 text-orange-700 border-orange-200' },
    { key: 'likely_reject_service', label: 'ServiÃ§os/nÃ£o food', hint: 'Posto, hotel, barbearia, logÃ­stica, clÃ­nica e similares.', className: 'bg-rose-50 text-rose-700 border-rose-200' },
    { key: 'maps_status_closed', label: 'Fechado no Maps', hint: 'Remover somente com evidÃªncia oficial do Maps.', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  ];
  const activeTriageCard = activeTriageFilter === 'all'
    ? null
    : triageCards.find(card => card.key === activeTriageFilter) || null;

  const qaTabs: { key: ValidationTab; label: string; count: number; hint: string }[] = [
    { key: 'pendentes', label: 'Pendentes Validar IA', count: qaStats.pendentes, hint: 'Coletados na Fase 1 e ainda nÃ£o auditados.' },
    { key: 'prontos', label: 'Prontos p/ App', count: qaStats.prontos, hint: 'Validar IA encontrou cardÃ¡pio estruturado.' },
    { key: 'sem_cardapio', label: 'Sem CardÃ¡pio', count: qaStats.sem_cardapio, hint: 'Existe no Maps, mas nÃ£o achou cardÃ¡pio pÃºblico confiÃ¡vel.' },
    { key: 'revisao', label: 'RevisÃ£o Humana', count: qaStats.revisao, hint: 'Bloqueio, captcha, login, fonte invÃ¡lida ou QA incompleto.' },
    { key: 'rejeitados', label: 'Rejeitados', count: qaStats.rejeitados, hint: 'Removidos por regra de produto: fechado, mercado, padaria, evento, rua/ponto pÃºblico ou nÃ£o-food.' },
    { key: 'importados', label: 'Base Publicada', count: qaStats.importados, hint: 'JÃ¡ visÃ­veis no app pÃºblico.' },
  ];

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredRestaurants = useMemo(() => restaurants.filter(r => {
    const qaState = getCachedQaState(r).key;
    if (activeTab === 'rejeitados') {
      if (qaState !== 'rejeitado') return false;
    } else if (r.is_deleted === true) {
      return false;
    }

    const matchesSearch = !normalizedSearchTerm
      || (r.name && r.name.toLowerCase().includes(normalizedSearchTerm))
      || (r.address && r.address.toLowerCase().includes(normalizedSearchTerm))
      || (r.category && r.category.toLowerCase().includes(normalizedSearchTerm));

    if (!matchesSearch) return false;

    if (activeTriageFilter !== 'all') {
      const triage = getCachedLeadTriage(r);
      if (triage.key !== activeTriageFilter) return false;
    }

    if (activeTab === 'pendentes') return qaState === 'pendente';
    if (activeTab === 'prontos') return qaState === 'pronto';
    if (activeTab === 'sem_cardapio') return qaState === 'sem_cardapio';
    if (activeTab === 'revisao') return qaState === 'revisao';
    if (activeTab === 'rejeitados') return qaState === 'rejeitado';
    if (activeTab === 'importados') return qaState === 'publicado';
    return false;
  }), [activeTab, activeTriageFilter, leadTriageCache, normalizedSearchTerm, qaStateCache, restaurants]);

  const totalPages = Math.max(1, Math.ceil(filteredRestaurants.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = filteredRestaurants.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize;
  const pageEndIndex = Math.min(pageStartIndex + pageSize, filteredRestaurants.length);
  const paginatedRestaurants = useMemo(() => (
    filteredRestaurants.slice(pageStartIndex, pageEndIndex)
  ), [filteredRestaurants, pageEndIndex, pageStartIndex]);

  const countGalleryImages = (restaurant: any) => {
    const gallery = restaurant?.gallery_images || restaurant?.gallery || restaurant?.images || restaurant?.photos;
    if (Array.isArray(gallery)) return gallery.filter(Boolean).length;
    if (typeof gallery === 'string') {
      try {
        const parsed = JSON.parse(gallery);
        if (Array.isArray(parsed)) return parsed.filter(Boolean).length;
      } catch (_) {
        return gallery.trim() ? 1 : 0;
      }
    }
    return 0;
  };

  const buildLearningSnapshot = (restaurant: any) => {
    const log = readAiLog(restaurant);
    const menuStatus = getMenuStatus(restaurant);
    const galleryCount = countGalleryImages(restaurant);
    const triage = getLeadTriage(restaurant);
    const evidence = log?.evidence || log?.learning?.evidence || {};
    const menuEvidence = evidence?.menu || log?.menuEvidence || {};
    const rawEvidence = evidence?.rawEvidence || {};
    const review = log?.review || {};
    const coverImageUrl = restaurant?.cover_image_url || restaurant?.coverImage || restaurant?.image_url || '';
    const instagramUrl = restaurant?.instagram_url || restaurant?.instagram || '';
    const menuSourceUrl = restaurant?.other_url || restaurant?.external_url || restaurant?.menuSourceUrl || '';
    const sourceUrlCandidates = [
      menuSourceUrl,
      evidence?.sourceUrl,
      evidence?.menu?.sourceUrl,
      evidence?.menu?.source_url,
      log?.extra?.sourceUrl,
      log?.extra?.source_url,
      log?.extra?.requiresHuman?.sourceUrl,
      log?.extra?.requiresHuman?.source_url,
      log?.extra?.failedBioMenuSource?.sourceUrl,
      log?.extra?.failedBioMenuSource?.source_url,
      log?.extra?.menuEvidence?.sourceUrl,
      log?.extra?.menuEvidence?.source_url,
      log?.extra?.failedBioMenuSource?.sourceChain?.[0]?.url,
      log?.extra?.requiresHuman?.sourceChain?.[0]?.url,
    ];
    const sourceUrls = Array.from(new Set(sourceUrlCandidates
      .map((value: any) => String(value || '').trim())
      .filter((value: string) => /^https?:\/\//i.test(value))));
    const rating = Number(restaurant?.rating || restaurant?.google_rating || 0) || null;
    const reviewsCount = Number(restaurant?.reviews_count || restaurant?.reviewsCount || restaurant?.google_reviews_count || 0) || null;
    return {
      id: restaurant?.id,
      name: restaurant?.name || '',
      category: restaurant?.category || '',
      address: [restaurant?.address, restaurant?.number, restaurant?.neighborhood, restaurant?.city, restaurant?.state].filter(Boolean).join(', '),
      googleMapsUrl: restaurant?.google_maps_url || '',
      googleMapsName: restaurant?.google_maps_name || '',
      rating,
      reviewsCount,
      qaState: getCachedQaState(restaurant).key,
      triage: {
        key: triage.key,
        confidence: triage.confidence,
        reason: triage.reason,
        action: triage.action,
      },
      menuStatus,
      menuStatusReason: getMenuStatusReason(restaurant),
      isDeleted: restaurant?.is_deleted === true,
      isPublished: restaurant?.is_published === true,
      hasPhone: Boolean(restaurant?.phone || restaurant?.whatsapp_phone || restaurant?.primary_phone),
      hasInstagram: Boolean(instagramUrl),
      instagramUrl,
      menuSourceUrl,
      sourceUrls,
      hasMenu: menuStatus === 'found',
      menuEvidence: {
        sourceUrl: sourceUrls[0] || '',
        platform: evidence?.platform || '',
        discoveryMethod: evidence?.discoveryMethod || '',
        categoryCount: Array.isArray(menuEvidence?.categories) ? menuEvidence.categories.length : Number(menuEvidence?.categoryCount || 0) || null,
        itemCount: Number(menuEvidence?.itemCount || evidence?.extractorAudit?.itemCount || 0) || null,
        optionCount: Number(menuEvidence?.optionCount || evidence?.extractorAudit?.optionCount || 0) || null,
        screenshotCount: Number(rawEvidence?.screenshotCount || 0) || null,
        imageCandidateCount: Number(rawEvidence?.imageCandidateCount || 0) || null,
      },
      galleryCount,
      hasGallery: galleryCount > 0,
      hasCover: Boolean(coverImageUrl),
      coverImageUrl,
      hasHours: Boolean(restaurant?.opening_hours || restaurant?.hours || restaurant?.business_hours),
      reviewRoute: review?.route || '',
      reviewReasonCode: review?.reasonCode || '',
      pipeline: log?.pipeline || '',
      status: log?.status || '',
    };
  };

  const persistLearningRun = async (beforeRestaurant: any, startedAt: string, error?: any) => {
    if (!beforeRestaurant?.id) return;
    const { data: after, error: fetchError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', beforeRestaurant.id)
      .single();

    if (fetchError) throw fetchError;

    const before = buildLearningSnapshot(beforeRestaurant);
    const afterSnapshot = buildLearningSnapshot(after);
    const previousLog = readAiLog(after);
    const lesson =
      error ? 'failed' :
      afterSnapshot.isDeleted ? 'rejected' :
      afterSnapshot.hasMenu && afterSnapshot.hasGallery && afterSnapshot.hasCover ? 'ready_standard' :
      afterSnapshot.hasMenu && afterSnapshot.hasGallery && !afterSnapshot.hasCover ? 'ready_missing_cover' :
      afterSnapshot.hasMenu && !afterSnapshot.hasGallery ? 'menu_without_gallery' :
      !afterSnapshot.hasMenu && afterSnapshot.hasInstagram ? 'instagram_without_public_menu' :
      !afterSnapshot.hasMenu ? 'no_menu_found' :
      'needs_review';

    const observation = {
      isSingleCase: true,
      shouldGeneralizeAutomatically: false,
      visualQaRequired: true,
      notes: [
        'Learning run records evidence for pattern analysis; do not turn one restaurant into a global rule without repeated cases.',
        'After a restaurant becomes ready, inspect the Edit screen visually for gallery duplicates, bad photos, missing cover and menu structure errors.',
      ],
    };

    const run = {
      type: 'validar_ia_learning_run',
      version: 1,
      startedAt,
      finishedAt: new Date().toISOString(),
      before,
      after: afterSnapshot,
      lesson,
      observation,
      error: error ? (error?.message || String(error)) : '',
    };

    const previousRuns = Array.isArray(previousLog?.learning?.runs) ? previousLog.learning.runs : [];
    const nextLog = {
      ...previousLog,
      learning: {
        ...(previousLog?.learning || {}),
        lastLesson: lesson,
        lastRunAt: run.finishedAt,
        runs: [run, ...previousRuns].slice(0, 20),
      },
      lastLearningRun: run,
    };

    await supabase
      .from('restaurants')
      .update({ ai_log: JSON.stringify(nextLog) })
      .eq('id', beforeRestaurant.id);

    return run;
  };

  const handleAutoValidate = async () => {
    setShowValidationDiagnostics(false);
    setPageSize(20);
    setCurrentPage(1);
    setLoadedRowLimit(VALIDATION_INITIAL_ROW_LIMIT);
    setLogs(prev => prev.slice(-40));

    const pendingCandidates = filteredRestaurants.filter(r =>
      r.is_deleted !== true
      && getCachedQaState(r).key === 'pendente'
    );
    const localWarnings = pendingCandidates
      .map(r => ({ restaurant: r, decision: classifyRestaurantEligibilityLocal(r) }))
      .filter(item => item.decision.status === 'ineligible' && item.decision.confidence >= 0.9);

    if (localWarnings.length > 0) {
      addLog(`Triagem local sinalizou ${localWarnings.length} candidato(s) possivelmente fora do escopo; nada sera removido antes do Validar IA completo.`);
    }

    const pendingPool = pendingCandidates;

    let extensionProbe = { ready: isExtensionReady, active: isExtensionActive, compatible: isExtensionCompatible, version: extensionVersion, reason: '' };
    if (!extensionProbe.ready) {
      addLog('Extensao ainda nao sincronizada no estado visual; testando ping direto antes de bloquear o Validar IA em lote.');
      extensionProbe = await probeExtensionReadyNow(8000);
    }
    if (!extensionProbe.ready) {
      const reason = extensionProbe.reason || (!extensionProbe.active
        ? 'ExtensÃ£o inativa.'
        : `ExtensÃ£o desatualizada/incompleta (${extensionProbe.version || extensionVersion || 'sem versÃ£o'}). VersÃ£o mÃ­nima: ${REQUIRED_EXTENSION_VERSION}.`);
      addLog(`Validacao IA bloqueada para os candidatos: ${reason} Atualize a extensao para coletar Maps/cardapio/fotos; nenhum registro foi removido pela triagem local.`);
      toast.error(`${reason} Atualize a extensao antes de rodar o Validar IA.`);
      return;
    }
    if (pendingPool.length === 0) {
      toast.info('NÃ£o hÃ¡ restaurantes pendentes de validaÃ§Ã£o.');
      return;
    }

    const pendings = pendingPool.slice(0, AUTO_VALIDATE_BATCH_LIMIT);
    setIsValidating(true);
    addLog(`Iniciando validaÃ§Ã£o em lote de ${pendings.length} restaurante(s) pendente(s) usando o mesmo fluxo do botÃ£o individual.`);
    if (pendingPool.length > AUTO_VALIDATE_BATCH_LIMIT) {
      addLog(`Lote limitado a ${AUTO_VALIDATE_BATCH_LIMIT} por clique para controlar custo e evitar loops. Refine por busca/triagem ou clique novamente para continuar.`);
      toast.info(`Vou validar os primeiros ${AUTO_VALIDATE_BATCH_LIMIT} de ${pendingPool.length}. Use filtros para priorizar melhor.`);
    }
    toast.loading(`Iniciando validaÃ§Ã£o de ${pendings.length} restaurante(s) com IA...`);

    try {
      let successCount = 0;
      let failureCount = 0;
      for (const r of pendings) {
        addLog(`Validando ${r.name} pelo fluxo completo do Validar IA...`);
        toast.loading(`Validando ${r.name}...`);
        try {
          await handleSingleValidate({ stopPropagation: () => {} } as React.MouseEvent, r);

          const { data: refreshed, error: refreshError } = await supabase
            .from('restaurants')
            .select('id, name, ai_validated, is_deleted, ai_log')
            .eq('id', r.id)
            .single();

          if (refreshError) throw refreshError;

          const menuStatus = getMenuStatus(refreshed);
          if (refreshed?.is_deleted === true || Boolean(menuStatus)) {
            successCount++;
            addLog(`ValidaÃ§Ã£o em lote gerou decisÃ£o terminal para ${r.name}: ${refreshed.is_deleted ? 'rejeitado/removido' : `auditado (${menuStatus || 'sem status de cardÃ¡pio'})`}.`);
          } else {
            failureCount++;
            addLog(`ValidaÃ§Ã£o em lote nÃ£o gerou decisÃ£o terminal para ${r.name}; permanece pendente e nÃ£o serÃ¡ contado como sucesso.`);
          }
        } catch (rowErr: any) {
          failureCount++;
          addLog(`ValidaÃ§Ã£o em lote falhou para ${r.name}: ${rowErr.message || rowErr}`);
          await persistValidationFailure(r, rowErr, 'validacao_lote');
        }

        await new Promise(resolve => window.setTimeout(resolve, AUTO_VALIDATE_ROW_COOLDOWN_MS));
      }
      toast.success(`Lote concluÃ­do: ${successCount} sucesso(s), ${failureCount} falha(s). Atualizando tela...`);
      addLog(`Lote de validaÃ§Ã£o IA concluÃ­do: ${successCount} sucesso(s), ${failureCount} falha(s).`);
      // Refresh
      fetchRestaurants();
    } catch (err: any) {
      toast.error('Erro na validaÃ§Ã£o: ' + err.message);
    } finally {
      setIsValidating(false);
      toast.dismiss();
    }
  };

  const handleSingleValidate = async (e: React.MouseEvent, restaurant: any) => {
    e.stopPropagation();
    if (validatingId) return;
    setShowValidationDiagnostics(false);
    setPageSize(20);
    setCurrentPage(1);
    setLoadedRowLimit(VALIDATION_INITIAL_ROW_LIMIT);
    setLogs(prev => prev.slice(-40));

    const initialName = restaurant.name || 'registro vindo do Google Maps';
    const initialEligibility = classifyRestaurantEligibilityLocal(restaurant);
    if (initialEligibility.status === 'ineligible' && initialEligibility.confidence >= 0.9) {
      addLog(`Triagem local sinalizou possivel fora de escopo para ${initialName}: ${initialEligibility.reason}. Nada sera removido antes do Validar IA completo.`);
    }
    let extensionProbe = { ready: isExtensionReady, active: isExtensionActive, compatible: isExtensionCompatible, version: extensionVersion, reason: '' };
    if (!extensionProbe.ready) {
      addLog('Extensao ainda nao sincronizada no estado visual; testando ping direto antes de bloquear o Validar IA individual.');
      extensionProbe = await probeExtensionReadyNow(8000);
    }
    if (!extensionProbe.ready) {
      const reason = extensionProbe.reason || (!extensionProbe.active
        ? 'ExtensÃ£o inativa.'
        : `ExtensÃ£o desatualizada/incompleta (${extensionProbe.version || extensionVersion || 'sem versÃ£o'}). VersÃ£o mÃ­nima: ${REQUIRED_EXTENSION_VERSION}.`);
      addLog(`ValidaÃ§Ã£o IA individual bloqueada: ${reason} Atualize a extensÃ£o para garantir coleta item-a-item, imagens e adicionais.`);
      toast.error(`${reason} Atualize a extensÃ£o antes de validar.`);
      return;
    }
    let effectiveRestaurant: any = { ...restaurant };
    let finalMenuStatus: 'unknown' | 'found' | 'not_found' | 'manual_required' | 'failed' | 'needs_recollection' = 'unknown';

    try {
      setValidatingId(restaurant.id);
      addLog(`Iniciando validaÃ§Ã£o IA individual para: ${initialName}`);
      const toastId = toast.loading(`Validando ${initialName} com IA...`);
      effectiveRestaurant = await persistRestaurantContacts(
        restaurant.id,
        effectiveRestaurant,
        restaurant,
        'cadastro_atual',
        '',
        'dados existentes antes da validaÃ§Ã£o'
      );

      if (extensionProbe.ready) {
        // A Fase 1 agora fornece apenas o link do Google Maps; o Validar IA descobre todo o resto.
        addLog(`Iniciando fluxo autÃ´nomo a partir do Google Maps para: ${initialName}`);

        let mapUrl = extractGoogleMapsUrlFromRestaurant(restaurant);
        const mapsLookupQuery = [
          effectiveRestaurant.name || restaurant.name || initialName,
          effectiveRestaurant.address || restaurant.address || '',
          effectiveRestaurant.neighborhood || restaurant.neighborhood || '',
          effectiveRestaurant.city || restaurant.city || '',
          effectiveRestaurant.state || restaurant.state || ''
        ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
        if (!mapUrl) {
          addLog(`Google Maps sem link salvo; vou buscar pelo nome/local: ${mapsLookupQuery || initialName}`);
        }

        let mapsData: any = null;
        const normalizeSavedInstagramUrl = (value: any): string => {
          const unwrap = (entry: any): any => {
            if (!entry) return '';
            if (typeof entry === 'string') return entry;
            if (Array.isArray(entry)) {
              const direct = entry.find((item: any) => typeof item === 'string' && /instagram\.com/i.test(item));
              if (direct) return direct;
              const objectMatch = entry.find((item: any) => item?.platform === 'instagram' || /instagram\.com/i.test(String(item?.url || item?.href || '')));
              return unwrap(objectMatch);
            }
            if (typeof entry === 'object') return entry.url || entry.href || entry.value || '';
            return '';
          };

          let raw = String(unwrap(value) || '').trim();
          if (!raw) return '';
          try {
            const parsed = new URL(raw);
            if (parsed.hostname.toLowerCase() === 'l.instagram.com') {
              raw = decodeURIComponent(parsed.searchParams.get('u') || raw);
            }
          } catch (_) {}

          const match = raw.match(/^https?:\/\/(?:www\.)?instagram\.com\/([a-z0-9._-]+)\/?(?:[?#].*)?$/i);
          if (!match) return '';
          const handle = match[1].replace(/^[._]+|[._]+$/g, '');
          if (!handle || /^(p|reel|reels|stories|explore|accounts|direct)$/i.test(handle)) return '';
          return 'https://www.instagram.com/' + handle + '/';
        };
        const savedInstagram = normalizeSavedInstagramUrl(restaurant.instagram)
          || normalizeSavedInstagramUrl(effectiveRestaurant.instagram);
        let activeInstagramUrl = savedInstagram;
        if (activeInstagramUrl) {
          addLog('Instagram ja salvo/confirmado no cadastro; pulando busca no Google: ' + activeInstagramUrl);
        }
        let instagramBio = '';
        let instagramFollowers = 0;
        let instagramMenuCandidates: any[] = [];
        let validatedInstagramBioLinks: any[] = [];
        const mergeInstagramBioLinkCandidates = (current: any[] = [], next: any[] = []) => {
          const seen = new Set<string>();
          return [...current, ...next].filter((candidate: any) => {
            const key = String(candidate?.url || candidate?.href || candidate?.label || JSON.stringify(candidate || {})).trim();
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        };
        let instagramHighlightMenuImageCandidates: string[] = [];
        let instagramFeedMenuImageCandidates: string[] = [];
        let googleSearchGalleryImageCandidates: any[] = [];
        let googleMapsGalleryImageCandidates: any[] = [];
        let googleMenuImageCandidates: any[] = [];
        let logoPublicUrl = '';
        let instagramGalleryPublicUrls: string[] = [];
        let instagramFeedGalleryAllowed = false;
        let instagramFeedGalleryBlockReason = '';
        let allowInstagramGallerySaveAfterGooglePriority = false;
        const clearRejectedInstagramDerivedData = (reason = 'Instagram nao confirmado pela IA') => {
          activeInstagramUrl = '';
          instagramBio = '';
          instagramFollowers = 0;
          instagramMenuCandidates = [];
          validatedInstagramBioLinks = [];
          instagramHighlightMenuImageCandidates = [];
          instagramFeedMenuImageCandidates = [];
          instagramGalleryPublicUrls = [];
          instagramFeedGalleryAllowed = false;
          instagramFeedGalleryBlockReason = reason;
        };
        const instagramScrapeIssues: Array<{ url: string; source: string; error: string }> = [];
        const isInstagramScrapeTimeout = (value: any) =>
          /timeout|tempo limite|aguardando resposta/i.test(String(value || ''));
        const rememberInstagramScrapeIssue = (url: string, source: string, error: any) => {
          const errorText = String(error || 'sem motivo informado');
          instagramScrapeIssues.push({ url, source, error: errorText });
        };
        const hasCityEvidenceForInstagramGallery = (url: string, bio: string, reason: string, bioLinks: any[] = []) => {
          const city = normalizeText(effectiveRestaurant.city || restaurant.city || '').replace(/[^a-z0-9 ]+/g, ' ').trim();
          if (!city) return { allowed: false, reason: 'cidade do restaurante ausente para comparar com o perfil.' };
          const cityCompact = city.split(/\s+/).filter(Boolean).join('');
          const linkEvidence = (bioLinks || [])
            .map((candidate: any) => [
              candidate?.url,
              candidate?.href,
              candidate?.label,
              candidate?.title,
              candidate?.text,
              candidate?.description,
              candidate?.source,
            ].filter(Boolean).join(' '))
            .join(' ');
          const evidence = normalizeText(`${url || ''} ${bio || ''} ${linkEvidence}`).replace(/[^a-z0-9 ]+/g, ' ');
          const evidenceCompact = evidence.split(/\s+/).filter(Boolean).join('');
          if (evidence.includes(city) || (cityCompact && evidenceCompact.includes(cityCompact))) {
            return { allowed: true, reason: `perfil ou link oficial da bio menciona ${effectiveRestaurant.city || restaurant.city}.` };
          }
          return {
            allowed: false,
            reason: `perfil do Instagram nao confirma a unidade/cidade ${effectiveRestaurant.city || restaurant.city} diretamente na URL/bio/links brutos. Validacao IA: ${reason || 'sem motivo informado'}`,
          };
        };
        const googleMapsGalleryAddressMatches = (sourceAddress: string, currentRestaurant: any) => {
          const source = normalizeText(sourceAddress || '').replace(/[^a-z0-9 ]+/g, ' ').trim();
          if (!source) return { allowed: false, reason: 'fotos do Google/Maps sem endereco de origem para validar.' };

          const expectedStreet = normalizeText(currentRestaurant?.address || restaurant.address || '').replace(/[^a-z0-9 ]+/g, ' ').trim();
          const expectedNumber = String(currentRestaurant?.number || restaurant.number || '').replace(/\D+/g, '');
          const expectedCity = normalizeText(currentRestaurant?.city || restaurant.city || '').replace(/[^a-z0-9 ]+/g, ' ').trim();
          const sourceCompact = source.replace(/\s+/g, '');
          const streetTokens = expectedStreet.split(/\s+/).filter(token => token.length >= 3);

          const streetMatches = !streetTokens.length || streetTokens.every(token => source.includes(token));
          const numberMatches = !expectedNumber || sourceCompact.includes(expectedNumber);
          const cityMatches = !expectedCity || source.includes(expectedCity);

          if (streetMatches && numberMatches && cityMatches) {
            return { allowed: true, reason: `endereco das fotos bate com ${[currentRestaurant?.address || restaurant.address, currentRestaurant?.number || restaurant.number, currentRestaurant?.city || restaurant.city].filter(Boolean).join(', ')}.` };
          }

          return {
            allowed: false,
            reason: `endereco do painel de fotos nao bate com o restaurante. Fonte="${sourceAddress || 'vazio'}"; esperado="${[currentRestaurant?.address || restaurant.address, currentRestaurant?.number || restaurant.number, currentRestaurant?.city || restaurant.city].filter(Boolean).join(', ')}".`,
          };
        };
        const preferBestGalleryResolution = (imageUrl: string) => {
          const cleanUrl = String(imageUrl || '').trim();
          if (/instadelivery-public\.nyc3\.cdn\.digitaloceanspaces\.com\/itens\//i.test(cleanUrl)) {
            return cleanUrl.replace(/_(?:75|100|150|200|300|400|600|800)_(?:75|100|150|200|300|400|600|800)(\.(?:jpe?g|png|webp|avif)(?:[?#].*)?)$/i, '$1');
          }
          if (!/googleusercontent\.com/i.test(cleanUrl)) return cleanUrl;
          if (/=s\d+[^/?#]*/i.test(cleanUrl) || /=w\d+-h\d+[^/?#]*/i.test(cleanUrl)) {
            return cleanUrl.replace(/=(?:s\d+|w\d+-h\d+)[^/?#]*/i, '=s1600-w1600-h1200-rw');
          }
          return `${cleanUrl}=s1600-w1600-h1200-rw`;
        };
        const galleryDedupeKey = (imageUrl: string) => preferBestGalleryResolution(imageUrl)
          .replace(/[?#].*$/, '')
          .replace(/-\d+-\d+(\.[a-z0-9]+)$/i, '$1')
          .toLowerCase();

        const savedGalleryUrls = new Set<string>();
        const savedGalleryVisualHashes = new Set<string>();
        const galleryHashDistance = (left: string, right: string) => {
          const a = String(left || '').trim();
          const b = String(right || '').trim();
          if (!a || !b || a.length !== b.length) return Number.POSITIVE_INFINITY;
          let distance = 0;
          for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) distance += 1;
          }
          return distance;
        };
        const getGalleryVisualHash = async (imageUrl: string, sourceLabel: string) => {
          const cleanUrl = preferBestGalleryResolution(imageUrl);
          if (!/^https?:\/\//i.test(cleanUrl)) return '';
          try {
            const response = await fetch('/api/local-collector/image-visual-hash', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: cleanUrl })
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok || !payload?.success || !payload?.hash) {
              addLog(`Nao consegui auditar duplicidade visual da foto (${sourceLabel}): ${payload?.error || `HTTP ${response.status}`}.`);
              return '';
            }
            return String(payload.hash);
          } catch (hashErr: any) {
            addLog(`Erro ao auditar duplicidade visual da foto (${sourceLabel}): ${hashErr.message || hashErr}`);
            return '';
          }
        };
        const inspectGalleryVisualDuplicate = async (imageUrl: string, sourceLabel: string) => {
          const hash = await getGalleryVisualHash(imageUrl, sourceLabel);
          if (!hash) return { blocked: true, hash: '', reason: 'hash_unavailable' as const };
          for (const existingHash of savedGalleryVisualHashes) {
            if (galleryHashDistance(hash, existingHash) <= 5) {
              return { blocked: true, hash, reason: 'visual_duplicate' as const };
            }
          }
          return { blocked: false, hash, reason: 'unique' as const };
        };
        let existingInstagramFeedGalleryCount = 0;
        let coverImageAlreadySet = Boolean(effectiveRestaurant.cover_image_url || effectiveRestaurant.coverImage || restaurant.cover_image_url || restaurant.coverImage);
        try {
          const { data: existingGallery } = await supabase
            .from('restaurant_gallery')
            .select('image_url, caption')
            .eq('restaurant_id', restaurant.id);
          for (const item of existingGallery || []) {
            if (item?.image_url) {
              const existingUrl = preferBestGalleryResolution(String(item.image_url));
              savedGalleryUrls.add(existingUrl);
              const existingHash = await getGalleryVisualHash(existingUrl, 'galeria existente');
              if (existingHash) savedGalleryVisualHashes.add(existingHash);
            }
            if (/feed do instagram/i.test(String(item?.caption || ''))) existingInstagramFeedGalleryCount += 1;
          }
        } catch (galleryErr: any) {
          addLog(`NÃ£o consegui ler a galeria existente antes da validaÃ§Ã£o: ${galleryErr.message || galleryErr}`);
        }

        const saveGalleryImage = async (imageUrl: string, caption: string, orderIndex: number) => {
          const cleanUrl = preferBestGalleryResolution(imageUrl);
          if (!cleanUrl || savedGalleryUrls.has(cleanUrl)) return false;
          if (savedGalleryUrls.size >= MAX_PUBLIC_GALLERY_IMAGES) return false;
          const visualCheck = await inspectGalleryVisualDuplicate(cleanUrl, caption);
          if (visualCheck.blocked) {
            if (visualCheck.reason === 'visual_duplicate') {
              addLog(`Foto da galeria ignorada por duplicidade visual (${caption}).`);
            } else {
              addLog(`Foto da galeria ignorada porque nao consegui confirmar se era unica (${caption}).`);
            }
            return false;
          }
          savedGalleryUrls.add(cleanUrl);
          if (visualCheck.hash) savedGalleryVisualHashes.add(visualCheck.hash);
          const { error } = await supabase.from('restaurant_gallery').insert({
            restaurant_id: restaurant.id,
            image_url: cleanUrl,
            caption,
            order_index: orderIndex
          });
          if (error) {
            savedGalleryUrls.delete(cleanUrl);
            if (visualCheck.hash) savedGalleryVisualHashes.delete(visualCheck.hash);
            addLog(`Erro ao salvar foto na galeria (${caption}): ${error.message}`);
            return false;
          }
          if (/feed do instagram/i.test(String(caption || ''))) existingInstagramFeedGalleryCount += 1;
          return true;
        };

        const ensureCoverImageFromGallery = async (imageUrls: string[], sourceLabel: string) => {
          if (coverImageAlreadySet) return;
          const candidates = (imageUrls || [])
            .map((image: any) => preferBestGalleryResolution(String(image || '').trim()))
            .filter(Boolean);
          if (!candidates.length) return;

          const prefersFoodAfterFacade = /google search|google maps|see photos/i.test(sourceLabel) && candidates.length > 1;
          const coverImageUrl = prefersFoodAfterFacade ? candidates[1] : candidates[0];
          try {
            await updateRestaurantWithSchemaFallback(restaurant.id, { cover_image_url: coverImageUrl });
            coverImageAlreadySet = true;
            effectiveRestaurant = {
              ...effectiveRestaurant,
              cover_image_url: coverImageUrl,
              coverImage: coverImageUrl,
            };
            addLog(`Imagem de capa definida automaticamente a partir da galeria (${sourceLabel}).`);
          } catch (coverErr: any) {
            addLog(`Nao consegui definir capa automatica pela galeria: ${coverErr.message || coverErr}`);
          }
        };

        const ensureCoverImageFromSavedGallery = async (sourceLabel = 'galeria ja aprovada') => {
          if (coverImageAlreadySet) return;
          try {
            const { data, error } = await supabase
              .from('restaurant_gallery')
              .select('image_url')
              .eq('restaurant_id', restaurant.id)
              .order('order_index', { ascending: true })
              .limit(MAX_PUBLIC_GALLERY_IMAGES);
            if (error) throw error;
            const savedUrls = (data || []).map((item: any) => item.image_url).filter(Boolean);
            if (savedUrls.length) await ensureCoverImageFromGallery(savedUrls, sourceLabel);
          } catch (coverErr: any) {
            addLog(`Nao consegui definir capa a partir da galeria salva: ${coverErr.message || coverErr}`);
          }
        };

        const filterGalleryCandidates = async (images: string[], sourceLabel: string, maxImages: number): Promise<string[]> => {
          const limit = Math.max(0, Math.min(MAX_PUBLIC_GALLERY_IMAGES, maxImages));
          if (limit <= 0) return [];

          const seenCandidateUrls = new Set<string>();
          const candidates = (images || [])
            .map((image: any) => String(image || '').trim())
            .filter(Boolean)
            .filter((image: string) => !/^data:video\//i.test(image) && !/\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(image))
            .filter((image: string) => {
              const key = /^https?:\/\//i.test(image) ? galleryDedupeKey(image) : image;
              if (seenCandidateUrls.has(key)) return false;
              seenCandidateUrls.add(key);
              return true;
            })
            .slice(0, Math.max(limit * 3, limit));

          if (!candidates.length) return [];

          try {
            addLog(`Filtrando ${candidates.length} foto(s) de ${sourceLabel} com IA antes da galeria.`);
            const controller = new AbortController();
            const timeoutId = window.setTimeout(() => controller.abort(), 25000);
            const filterResponse = await fetch('/api/local-collector/filter-instagram-gallery', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify({ images: candidates, maxImages: limit, source: sourceLabel })
            });
            window.clearTimeout(timeoutId);

            if (!filterResponse.ok) {
              addLog(`Filtro de galeria falhou para ${sourceLabel}: HTTP ${filterResponse.status}.`);
              return [];
            }

            const filterData = await filterResponse.json();
            const visualDedupeRemoved = Number(filterData?.visualDedupeRemoved || 0);
            if (visualDedupeRemoved > 0) {
              addLog(`Filtro visual removeu ${visualDedupeRemoved} foto(s) repetida(s) de ${sourceLabel} antes de salvar.`);
            }
            const approved = Array.isArray(filterData?.filteredImages)
              ? filterData.filteredImages.filter(Boolean).slice(0, limit)
              : [];
            addLog(`IA aprovou ${approved.length}/${candidates.length} foto(s) de ${sourceLabel} para a galeria.`);
            return approved;
          } catch (filterErr: any) {
            addLog(`Erro ao filtrar fotos de ${sourceLabel}: ${filterErr.message || filterErr}`);
            return [];
          }
        };

        const saveGalleryImagesFromCandidates = async (images: string[], caption: string, orderBase: number, maxImages: number) => {
          const limit = Math.max(0, Math.min(MAX_PUBLIC_GALLERY_IMAGES - savedGalleryUrls.size, maxImages));
          const seenSourceKeys = new Set<string>();
          const candidates = (images || [])
            .map((image: any) => String(image || '').trim())
            .filter(Boolean)
            .filter((image: string) => {
              const key = /^https?:\/\//i.test(image) ? galleryDedupeKey(image) : image;
              if (seenSourceKeys.has(key)) return false;
              seenSourceKeys.add(key);
              return true;
            })
            .slice(0, limit);
          const publicUrls: string[] = [];
          const extensionFromUrl = (url: string) => {
            const match = String(url || '').split(/[?#]/)[0].match(/\.(jpg|jpeg|png|gif|webp|avif)$/i);
            return match ? match[1].toLowerCase().replace('jpeg', 'jpg') : 'jpg';
          };

          for (let i = 0; i < candidates.length; i++) {
            const image = candidates[i];
            if (/^data:image\//i.test(image)) {
              try {
                const match = image.match(/^data:([^;]+);base64,(.+)$/);
                if (!match) continue;
                const contentType = match[1];
                const byteString = atob(match[2]);
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                for (let j = 0; j < byteString.length; j++) ia[j] = byteString.charCodeAt(j);
                const blob = new Blob([ab], { type: contentType });
                const storagePath = `gallery/${restaurant.id}/gallery_candidate_${Date.now()}_${orderBase}_${i}.jpg`;
                const { error } = await supabase.storage
                  .from('restaurant-images')
                  .upload(storagePath, blob, { upsert: true, contentType });
                if (error) {
                  addLog(`Erro no upload da foto candidata ${i}: ${error.message}`);
                  continue;
                }
                const { data } = supabase.storage.from('restaurant-images').getPublicUrl(storagePath);
                publicUrls.push(data.publicUrl);
              } catch (uploadErr: any) {
                addLog(`Erro ao processar foto candidata ${i}: ${uploadErr.message || uploadErr}`);
              }
            } else {
              const storagePath = `gallery/${restaurant.id}/gallery_candidate_${Date.now()}_${orderBase}_${i}.${extensionFromUrl(image)}`;
              try {
                const response = await fetch(`/api/local-collector/download-and-upload?url=${encodeURIComponent(image)}&path=${encodeURIComponent(storagePath)}`, {
                  method: 'POST',
                });
                const payload = await response.json().catch(() => ({}));
                if (response.ok && payload?.success && payload?.url) {
                  publicUrls.push(payload.url);
                  continue;
                }
                addLog(`Foto externa da galeria nao foi baixada para Storage (${caption} ${i + 1}): ${payload?.error || `HTTP ${response.status}`}. Usando URL original.`);
              } catch (uploadErr: any) {
                addLog(`Erro ao baixar foto externa da galeria (${caption} ${i + 1}): ${uploadErr.message || uploadErr}. Usando URL original.`);
              }
              publicUrls.push(preferBestGalleryResolution(image));
            }
          }

          let savedCount = 0;
          const savedUrls: string[] = [];
          for (let i = 0; i < publicUrls.length; i++) {
            const saved = await saveGalleryImage(publicUrls[i], caption, orderBase + i);
            if (saved) {
              savedCount += 1;
              savedUrls.push(publicUrls[i]);
            }
          }
          if (savedUrls.length) await ensureCoverImageFromGallery(savedUrls, caption);
          return savedCount;
        };

        const saveInstagramFeedGalleryAfterUnitMatch = async (reason: string) => {
          if (!instagramFeedMenuImageCandidates.length) return;
          if (!allowInstagramGallerySaveAfterGooglePriority) {
            addLog(`Feed do Instagram validado para galeria, mas o salvamento foi adiado: fotos do Google tem prioridade. Motivo: ${reason}`);
            return;
          }
          const availableGallerySlots = MAX_PUBLIC_GALLERY_IMAGES - savedGalleryUrls.size;
          if (availableGallerySlots <= 0) {
            addLog('Galeria ja atingiu o limite de 8 fotos aprovadas; nao vou salvar fotos do feed apos confirmar unidade na bio.');
            return;
          }
          addLog(`Feed do Instagram liberado para galeria apos confirmacao da unidade na bio/hub: ${reason}`);
          const approved = await filterGalleryCandidates(instagramFeedMenuImageCandidates, 'feed do Instagram confirmado pela bio/hub', availableGallerySlots);
          if (!approved.length) {
            addLog(`IA aprovou 0/${instagramFeedMenuImageCandidates.length} foto(s) do feed confirmado pela bio/hub. Instagram validado permite usar a fonte, mas nao autoriza foto ruim, com pessoas, mesa suja ou material promocional; galeria ficara sem essas imagens.`);
            return;
          }

          const feedPublicUrls: string[] = [];
          for (let i = 0; i < approved.length; i++) {
            const image = approved[i];
            if (/^data:image\//i.test(image)) {
              try {
                const match = image.match(/^data:([^;]+);base64,(.+)$/);
                if (!match) continue;
                const contentType = match[1];
                const b64Data = match[2];
                const byteString = atob(b64Data);
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                for (let j = 0; j < byteString.length; j++) ia[j] = byteString.charCodeAt(j);
                const blob = new Blob([ab], { type: contentType });
                const storagePath = `gallery/${restaurant.id}/gallery_feed_unit_${Date.now()}_${i}.jpg`;
                const { error } = await supabase.storage
                  .from('restaurant-images')
                  .upload(storagePath, blob, { upsert: true, contentType });
                if (error) {
                  addLog(`Erro no upload da foto do feed confirmado ${i}: ${error.message}`);
                  continue;
                }
                const { data } = supabase.storage.from('restaurant-images').getPublicUrl(storagePath);
                feedPublicUrls.push(data.publicUrl);
              } catch (uploadErr: any) {
                addLog(`Erro ao processar foto do feed confirmado ${i}: ${uploadErr.message || uploadErr}`);
              }
            } else {
              feedPublicUrls.push(image);
            }
          }

          let savedCount = 0;
          const savedUrls: string[] = [];
          for (let i = 0; i < feedPublicUrls.length; i++) {
            const saved = await saveGalleryImage(feedPublicUrls[i], 'Feed do Instagram (unidade confirmada na bio/hub)', i + 20);
            if (saved) {
              savedCount += 1;
              savedUrls.push(feedPublicUrls[i]);
            }
          }
          if (savedUrls.length) await ensureCoverImageFromGallery(savedUrls, 'Feed do Instagram (unidade confirmada na bio/hub)');
          addLog(`Galeria recebeu ${savedCount}/${approved.length} foto(s) do feed apos confirmar unidade na bio/hub.`);
        };

        const collectGoogleSearchGalleryCandidates = async () => {
          if (googleSearchGalleryImageCandidates.length > 0 || savedGalleryUrls.size >= MAX_PUBLIC_GALLERY_IMAGES) return;
          try {
            const extractGoogleKnowledgeGraphId = (value: string) => {
              const raw = String(value || '').trim();
              if (!raw) return '';
              const decoded = (() => {
                try { return decodeURIComponent(raw); } catch (_) { return raw; }
              })();
              return decoded.match(/\/g\/[A-Za-z0-9_-]+/)?.[0] || '';
            };
            const mapsAddressForSearch = [effectiveRestaurant.address, effectiveRestaurant.number, effectiveRestaurant.neighborhood, effectiveRestaurant.city, effectiveRestaurant.state]
              .filter(Boolean)
              .join(' ');
            const googleSearchQuery = [effectiveRestaurant.name || initialName, mapsAddressForSearch].filter(Boolean).join(' ');
            const googleKnowledgeGraphId = extractGoogleKnowledgeGraphId(mapUrl || effectiveRestaurant.google_maps_url || restaurant.google_maps_url || '');
            addLog(`Etapa final de fotos: buscando painel do Google pelo nome/endereco${googleKnowledgeGraphId ? ' + kgmid' : ''}, sem termo "fotos": ${googleSearchQuery}`);
            const googleSearchRes = await sendExtensionMessage(extensionTargetId, {
              action: "searchGoogleNative",
              query: googleSearchQuery,
              kgmid: googleKnowledgeGraphId,
              restaurantId: restaurant.id
            }, 70000);
            const panelImageCandidates = Array.isArray(googleSearchRes?.panelPhotoCandidates)
              ? googleSearchRes.panelPhotoCandidates
              : [];
            const organicImageCandidates = Array.isArray(googleSearchRes?.imageCandidates)
              ? googleSearchRes.imageCandidates
              : [];
            const photosModalOpened = Boolean(googleSearchRes?.photosModalOpened);
            const normalizeCandidateImageUrl = (candidate: any) =>
              String(candidate?.image || candidate?.url || candidate || '').trim();
            const isUsableGoogleSearchImageCandidate = (candidate: any) => {
              const image = normalizeCandidateImageUrl(candidate);
              const context = String(candidate?.context || candidate?.title || candidate?.alt || '').trim();
              if (!image) return false;
              if (/^data:image\//i.test(image)) return false;
              if (/R0lGODlhAQABAIAA/i.test(image)) return false;
              if (!/^data:image\//i.test(image) && !/^https?:\/\//i.test(image)) return false;
              if (/google\.com\/logos\/doodles|google\.com\/maps\/vt\/data=/i.test(image)) return false;
              if (/products?|produtos?|view all|ver tudo|order pickup|order delivery|pedido|delivery/i.test(context)) return false;
              if (/\b\d{1,2}:\d{2}\b|videos?|vÃ­deos?|reels?|play/i.test(context)) return false;
              if (/^(menu|cardapio|card.pio|all|todas|tudo)\s*\|/i.test(context)) return false;
              return true;
            };
            const seenGoogleCandidateUrls = new Set<string>();
            const imageCandidates = (photosModalOpened ? panelImageCandidates : [])
              .filter(isUsableGoogleSearchImageCandidate)
              .filter((candidate: any) => {
                const key = normalizeCandidateImageUrl(candidate);
                if (!key || seenGoogleCandidateUrls.has(key)) return false;
                seenGoogleCandidateUrls.add(key);
                return true;
              });
            const searchEvidenceText = normalizeText([
              googleSearchRes?.pageText || '',
              ...(Array.isArray(googleSearchRes?.results) ? googleSearchRes.results.map((item: any) => `${item?.title || ''} ${item?.snippet || ''} ${item?.link || ''}`) : []),
              ...imageCandidates.map((item: any) => item?.context || '')
            ].join(' '));
            const expectedCity = normalizeText(effectiveRestaurant.city || restaurant.city || '');
            const expectedStreetTokens = normalizeText(effectiveRestaurant.address || restaurant.address || '')
              .split(' ')
              .filter(token => token.length >= 4 && !['rua', 'avenida', 'travessa', 'centro', 'campina', 'grande'].includes(token));
            const cityMatches = !expectedCity || searchEvidenceText.includes(expectedCity);
            const streetMatches = expectedStreetTokens.length === 0 || expectedStreetTokens.some(token => searchEvidenceText.includes(token));
            if (googleSearchRes?.success && imageCandidates.length > 0 && cityMatches && streetMatches) {
              googleSearchGalleryImageCandidates = imageCandidates;
              addLog(`Pesquisa normal do Google confirmou endereco (${mapsAddressForSearch}) e trouxe ${imageCandidates.length} foto(s) candidatas do modal See photos para galeria.`);
            } else if (googleSearchRes?.success && !photosModalOpened) {
              addLog('Etapa final de fotos: nao salvei miniaturas da pagina normal porque o modal See photos nao abriu.');
            } else if (googleSearchRes?.success && imageCandidates.length > 0) {
              addLog(`Pesquisa normal do Google trouxe ${imageCandidates.length} foto(s), mas ignorei para galeria porque o texto da busca nao confirmou endereco/cidade do Maps.`);
            } else {
              addLog('Etapa final de fotos: a pesquisa normal do Google nao trouxe fotos candidatas.');
            }
          } catch (googleSearchGalleryErr: any) {
            addLog(`Falha ao buscar fotos na etapa final pelo Google: ${googleSearchGalleryErr.message || googleSearchGalleryErr}`);
          }
        };

        const fillGalleryFromGoogleFallback = async () => {
          if ((!googleSearchGalleryImageCandidates.length && !googleMapsGalleryImageCandidates.length) || savedGalleryUrls.size >= MAX_PUBLIC_GALLERY_IMAGES) return;
          const availableSlots = MAX_PUBLIC_GALLERY_IMAGES - savedGalleryUrls.size;
          const sourceCandidates = googleSearchGalleryImageCandidates.length > 0
            ? googleSearchGalleryImageCandidates
            : googleMapsGalleryImageCandidates;
          const sourceLabel = googleSearchGalleryImageCandidates.length > 0
            ? 'Google Search'
            : 'Google Maps / See photos';
          const candidates = sourceCandidates
            .map((candidate: any) => String(candidate?.image || candidate?.url || candidate || '').trim())
            .filter(Boolean)
            .slice(0, Math.max(availableSlots * 3, availableSlots));
          if (!candidates.length) return;
          addLog(`${sourceLabel} trouxe ${candidates.length} foto(s) candidatas com endereco confirmado; vou usar ate 8 fotos de comida/produto ou fachada limpa, priorizando pelo menos uma fachada quando houver.`);
          const approved = await filterGalleryCandidates(candidates, sourceLabel, availableSlots);
          if (!approved.length) {
            addLog(`${sourceLabel} nao trouxe foto aprovada para completar a galeria.`);
            return;
          }
          const savedCount = await saveGalleryImagesFromCandidates(
            approved,
            `${sourceLabel} (galeria filtrada por IA)`,
            80,
            availableSlots
          );
          addLog(`Galeria recebeu ${savedCount}/${approved.length} foto(s) aprovadas de ${sourceLabel}.`);
        };

        const collectMenuImageUrlsFromCategories = (categories: any[] = []) => {
          const urls: string[] = [];
          const pushUrl = (value: any) => {
            const url = String(value || '').trim();
            if (!url) return;
            if (/^data:video\//i.test(url) || /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(url)) return;
            urls.push(preferBestGalleryResolution(url));
          };

          for (const category of categories || []) {
            const items = Array.isArray(category?.items)
              ? category.items
              : Array.isArray(category?.menu_items)
                ? category.menu_items
                : [];
            for (const item of items) {
              pushUrl(item?.image_url || item?.imageUrl || item?.photo_url || item?.photoUrl || item?.thumbnail_url);
              const rawData = item?.raw_data || item?.rawData || {};
              pushUrl(rawData?.image_url || rawData?.imageUrl || rawData?.photo_url || rawData?.thumbnail_url);
              const detail = rawData?.detail || rawData?.productDetail || {};
              [
                item?.image_urls,
                item?.extra_image_urls,
                rawData?.image_urls,
                rawData?.extra_image_urls,
                detail?.image_urls,
                detail?.extra_image_urls,
              ].forEach((list: any) => {
                if (Array.isArray(list)) list.forEach(pushUrl);
              });
            }
          }

          const seen = new Set<string>();
          return urls.filter((url) => {
            const key = url.replace(/[?#].*$/, '');
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        };

        const fillGalleryFromOfficialMenuImages = async (categories: any[] = [], sourceLabel = 'cardapio oficial') => {
          if (savedGalleryUrls.size >= MIN_PUBLIC_GALLERY_IMAGES) return;
          const availableSlots = MAX_PUBLIC_GALLERY_IMAGES - savedGalleryUrls.size;
          const menuImages = collectMenuImageUrlsFromCategories(categories);
          if (!menuImages.length) {
            addLog(`Galeria ainda abaixo do minimo e ${sourceLabel} nao trouxe imagens oficiais aproveitaveis.`);
            return;
          }

          addLog(`${sourceLabel} trouxe ${menuImages.length} foto(s) oficiais de produto; usando como fallback para completar a galeria ate ${MAX_PUBLIC_GALLERY_IMAGES} imagens.`);
          const approved = await filterGalleryCandidates(menuImages, `${sourceLabel} - fotos oficiais de produto`, availableSlots);
          if (!approved.length) {
            addLog(`IA aprovou 0/${menuImages.length} foto(s) oficiais de produto para completar a galeria.`);
            return;
          }
          const savedCount = await saveGalleryImagesFromCandidates(
            approved,
            `${sourceLabel} (fotos oficiais filtradas por IA)`,
            120,
            availableSlots
          );
          addLog(`Galeria recebeu ${savedCount}/${approved.length} foto(s) oficiais do cardapio.`);
        };

        const ensureMinimumGalleryForReadyMenu = async (categories: any[] = [], sourceLabel = 'cardapio aprovado') => {
          if (savedGalleryUrls.size >= MIN_PUBLIC_GALLERY_IMAGES) return;

          addLog(`Galeria com ${savedGalleryUrls.size}/${MIN_PUBLIC_GALLERY_IMAGES}; tentando completar pela pesquisa normal do Google/See photos antes de liberar para o app.`);
          await collectGoogleSearchGalleryCandidates();
          await fillGalleryFromGoogleFallback();

          if (savedGalleryUrls.size < MIN_PUBLIC_GALLERY_IMAGES) {
            await fillGalleryFromOfficialMenuImages(categories, sourceLabel);
          }

          if (savedGalleryUrls.size < MIN_PUBLIC_GALLERY_IMAGES && instagramFeedGalleryAllowed && instagramFeedMenuImageCandidates.length > 0) {
            allowInstagramGallerySaveAfterGooglePriority = true;
            try {
              await saveInstagramFeedGalleryAfterUnitMatch(`fallback apos Google/See photos e ${sourceLabel}`);
            } finally {
              allowInstagramGallerySaveAfterGooglePriority = false;
            }
          }

          if (savedGalleryUrls.size < MIN_PUBLIC_GALLERY_IMAGES) {
            addLog(`Galeria permaneceu abaixo do minimo apos Google/See photos, imagens oficiais e Instagram: ${savedGalleryUrls.size}/${MIN_PUBLIC_GALLERY_IMAGES}.`);
          }
        };

        const collectPublicationWarnings = (currentRestaurant: any) => {
          const warnings: string[] = [];
          if (savedGalleryUrls.size < MIN_PUBLIC_GALLERY_IMAGES) {
            warnings.push(`Galeria abaixo do ideal: ${savedGalleryUrls.size}/${MIN_PUBLIC_GALLERY_IMAGES} foto(s).`);
          }
          if (!String(currentRestaurant?.phone || '').trim()) {
            warnings.push('Telefone nao encontrado.');
          }
          return warnings;
        };
        const shouldScrapeInstagramNow = () => Boolean(activeInstagramUrl);
        let instagramSearchRanBeforeMaps = false;

        const extractInstagramProfilesFromGoogleNative = (payload: any, rawQuery: string) => {
          const normalize = (value: any) => String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
          const compact = (value: any) => normalize(value).replace(/[^a-z0-9]+/g, '');
          const queryTokens = normalize(rawQuery)
            .replace(/\b(instagram|campina|grande|pb|paraiba)\b/g, ' ')
            .split(/[^a-z0-9]+/)
            .filter((token: string) => token.length >= 3 && !['bar', 'restaurante', 'pizzaria', 'ltda', 'delivery', 'com', 'para', 'das', 'dos', 'uma', 'uns'].includes(token));
          const hasNameEvidence = (context: string, handle = '') => {
            const haystack = `${normalize(context)} ${normalize(handle)} ${compact(handle)}`;
            const compactHaystack = compact(haystack);
            const unique = Array.from(new Set(queryTokens));
            if (unique.length === 0) return true;
            const matched = unique.filter((token: string) => haystack.includes(token) || compactHaystack.includes(compact(token)));
            return matched.length >= Math.min(2, unique.length);
          };
          const urls: string[] = [];
          const addCandidate = (rawUrl: string, context: string) => {
            let value = String(rawUrl || '').trim();
            if (!value) return;
            try { value = decodeURIComponent(value); } catch (_) {}
            try {
              const parsed = new URL(value, window.location.href);
              const wrapped = parsed.searchParams.get('url') || parsed.searchParams.get('q') || parsed.searchParams.get('u');
              if (wrapped && /instagram\.com/i.test(wrapped)) value = decodeURIComponent(wrapped);
            } catch (_) {}
            const match = value.match(/instagram\.com\/([a-zA-Z0-9._]+)\/?/i);
            if (!match?.[1]) return;
            const handle = match[1].toLowerCase();
            if (['p', 'reel', 'reels', 'explore', 'stories', 'accounts'].includes(handle)) return;
            const cleanUrl = `https://www.instagram.com/${handle}/`;
            if (hasNameEvidence(context, handle)) urls.push(cleanUrl);
          };
          const texts: string[] = [];
          (Array.isArray(payload?.results) ? payload.results : []).forEach((result: any) => {
            const context = [result?.title, result?.snippet, result?.link].filter(Boolean).join(' ');
            addCandidate(result?.link, context);
            texts.push(context);
          });
          if (payload?.pageText) texts.push(String(payload.pageText));
          texts.forEach((text) => {
            const handleMatches = text.match(/@([a-zA-Z0-9._]{3,30})/g) || [];
            handleMatches.forEach((rawHandle: string) => {
              const handle = rawHandle.replace(/^@/, '').replace(/[.\s]+$/g, '').toLowerCase();
              if (!handle || ['instagram', 'google', 'gmail', 'maps'].includes(handle)) return;
              if (hasNameEvidence(text, handle)) urls.push(`https://www.instagram.com/${handle}/`);
            });
            const urlMatches = text.match(/https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9._]+\/?/gi) || [];
            urlMatches.forEach((url: string) => addCandidate(url, text));
          });
          return Array.from(new Set(urls)).slice(0, 3);
        };

        const fallbackSearchInstagramViaGoogleNative = async (query: string) => {
          addLog('Busca principal nao retornou Instagram; tentando resultados organicos do Google normal.');
          const fallbackRes = await sendExtensionMessage(extensionTargetId, {
            action: "searchGoogleNative",
            query,
            restaurantId: restaurant.id,
            skipPhotos: true
          }, 75000);
          if (fallbackRes?.requiresHuman) return { blocked: true, response: fallbackRes, candidates: [] as string[] };
          const candidates = extractInstagramProfilesFromGoogleNative(fallbackRes, query);
          if (candidates.length > 0) {
            addLog(`Google normal retornou ${candidates.length} candidato(s) de Instagram: ${candidates.join(', ')}`);
          } else {
            addLog(`Google normal tambem nao retornou candidato de Instagram com evidencia do nome.`);
          }
          return { blocked: false, response: fallbackRes, candidates };
        };

        const searchInstagramViaGoogle = async (stepLabel: string) => {
          if (activeInstagramUrl) return { success: true, skipped: true };
          instagramSearchRanBeforeMaps = true;
          addLog('Busca direta por handles provaveis ignorada: Instagram sera buscado somente por resultados reais do Google.');
          toast.success(`${stepLabel}: Buscando Instagram no Google usando nome e cidade...`);
          addLog(`${stepLabel}: Buscando Instagram no Google...`);
          const query = `${effectiveRestaurant.name || initialName || ''} ${effectiveRestaurant.city || restaurant.city || ''}`.replace(/\s+/g, ' ').trim();
          const extRes = await sendExtensionMessage(extensionTargetId, { action: "searchGoogleForInstagram", query, restaurantId: restaurant.id });
          if (extRes?.requiresHuman) {
            const reason = extRes.error || extRes.blocker || 'captcha/bloqueio no Google';
            await persistMenuStatus(restaurant, 'manual_required', `Intervencao necessaria na busca do Instagram pelo Google: ${reason}`, { instagramSearch: extRes });
            finalMenuStatus = 'manual_required';
            addLog(`Busca do Instagram pausada por intervencao humana no Google: ${reason}.`);
            toast.warning('Resolva o captcha/bloqueio da busca do Google e rode Validar IA novamente.');
            return { success: false, blocked: true };
          }

          let instagramCandidates = Array.from(new Set([
            ...((Array.isArray(extRes?.candidates) ? extRes.candidates : []) as string[]),
            ...((Array.isArray(extRes?.urls) ? extRes.urls : []) as string[]),
            extRes?.url || '',
          ].filter((url: string) => /^https?:\/\/(?:www\.)?instagram\.com\/[a-z0-9._-]+\/?$/i.test(String(url || ''))))).slice(0, 3);
          if (instagramCandidates.length === 0) {
            const fallback = await fallbackSearchInstagramViaGoogleNative(query);
            if (fallback.blocked) {
              const reason = fallback.response?.error || fallback.response?.blocker || 'captcha/bloqueio no Google';
              await persistMenuStatus(restaurant, 'manual_required', `Intervencao necessaria na busca do Instagram pelo Google: ${reason}`, { instagramSearch: fallback.response });
              finalMenuStatus = 'manual_required';
              addLog(`Busca do Instagram pausada por intervencao humana no Google normal: ${reason}.`);
              toast.warning('Resolva o captcha/bloqueio da busca do Google e rode Validar IA novamente.');
              return { success: false, blocked: true };
            }
            instagramCandidates = fallback.candidates;
          }

          if (instagramCandidates.length > 0) {
            addLog(`Google retornou ${instagramCandidates.length} candidato(s) de Instagram: ${instagramCandidates.join(', ')}`);
            const candidatesWithBio: any[] = [];
            for (const candidateUrl of instagramCandidates) {
              addLog(`Raspando candidato de Instagram para validacao: ${candidateUrl}`);
              const candidateScrape = await sendExtensionMessage(extensionTargetId, {
                action: "scrapeInstagram",
                instagramUrl: candidateUrl,
                restaurantId: restaurant.id,
                lightweight: true,
                collectImages: false
              }, 35000);
              if (candidateScrape?.success && !candidateScrape?.isLoginRequired) {
                const candidateBioLinks = Array.isArray(candidateScrape.bioLinks || candidateScrape.linkCandidates)
                  ? (candidateScrape.bioLinks || candidateScrape.linkCandidates)
                  : [];
                candidatesWithBio.push({
                  url: candidateUrl,
                  bio: candidateScrape.bio || '',
                  followers: candidateScrape.followers || 0,
                  bioLinks: candidateBioLinks
                });
              } else {
                const scrapeError = candidateScrape?.error || candidateScrape?.blocker || 'sem motivo informado';
                rememberInstagramScrapeIssue(candidateUrl, 'Google Instagram', scrapeError);
                addLog(`Candidato de Instagram nao pode ser raspado: ${candidateUrl} (${scrapeError}).`);
              }
            }

            if (candidatesWithBio.length > 0) {
              const validateCandidatesResponse = await fetch(`/api/local-collector/validate-instagram?restaurantId=${restaurant.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  candidates: candidatesWithBio,
                  restaurantName: effectiveRestaurant.name || initialName || '',
                  restaurantCity: effectiveRestaurant.city || restaurant.city || '',
                  restaurantAddress: effectiveRestaurant.address || restaurant.address || '',
                  restaurantPhone: effectiveRestaurant.phone || restaurant.phone || ''
                })
              });
              const validateCandidatesData = validateCandidatesResponse.ok
                ? await validateCandidatesResponse.json()
                : null;
              if (validateCandidatesData?.isValid && validateCandidatesData?.selectedUrl) {
                activeInstagramUrl = validateCandidatesData.selectedUrl;
                const selectedCandidate = candidatesWithBio.find((candidate: any) => normalizeSavedInstagramUrl(candidate.url) === normalizeSavedInstagramUrl(activeInstagramUrl));
                validatedInstagramBioLinks = Array.isArray(selectedCandidate?.bioLinks) ? selectedCandidate.bioLinks : [];
                if (validatedInstagramBioLinks.length > 0) {
                  instagramMenuCandidates = mergeInstagramBioLinkCandidates(instagramMenuCandidates, validatedInstagramBioLinks);
                  addLog(`Links oficiais da bio preservados da validacao do Instagram pelo Google: ${validatedInstagramBioLinks.length}.`);
                }
                toast.success(`Instagram confirmado pela IA: ${activeInstagramUrl}`);
                addLog(`Instagram confirmado pela IA entre candidatos: ${activeInstagramUrl}. Motivo: ${validateCandidatesData.reason || 'sem motivo'}`);
                return { success: true, selectedUrl: activeInstagramUrl };
              }
              addLog(`IA nao confirmou nenhum candidato de Instagram: ${validateCandidatesData?.reason || validateCandidatesData?.error || 'sem motivo informado'}`);
            } else {
              addLog('Nenhum candidato de Instagram pode ser raspado para validar pela IA.');
            }
          }

          if (!activeInstagramUrl && extRes && extRes.success && extRes.url && instagramCandidates.length === 0) {
            addLog(`Instagram candidato encontrado, mas nao usado automaticamente sem validacao: ${extRes.url}`);
          }

          const searchedProfileScrapeIssues = instagramScrapeIssues.filter((issue) => !/handles provaveis/i.test(issue.source));
          const timeoutIssues = searchedProfileScrapeIssues.filter((issue) => isInstagramScrapeTimeout(issue.error));
          if (timeoutIssues.length > 0) {
            const attemptedUrls = Array.from(new Set(timeoutIssues.map((issue) => issue.url))).join(', ');
            addLog(`Instagram candidato nao foi validado por timeout ao raspar (${attemptedUrls}). Vou continuar Maps, bio/fotos permitidas e decidir no fim com evidencias, sem travar a fila em revisao humana.`);
            return { success: false, instagramTimeout: true, attemptedUrls: timeoutIssues.map((issue) => issue.url) };
          }

          toast.error(`Nenhum Instagram encontrado via Google. ${extRes?.error || ''}`);
          addLog('Nenhum Instagram encontrado via Google.');
          return { success: false };
        };

        const earlyInstagramSearch = await searchInstagramViaGoogle('PASSO 1/5');
        if (earlyInstagramSearch.blocked) return;

        if (mapUrl || mapsLookupQuery) {
          const mapsStepLabel = instagramSearchRanBeforeMaps ? 'PASSO 2/5' : 'PASSO 1/5';
          toast.success(`${mapsStepLabel}: Acessando Google Maps para extrair dados oficiais...`);
          addLog(`${mapsStepLabel}: Acessando Google Maps...`);
          const extRes = await sendExtensionMessage(
            extensionTargetId,
            { action: "scrapeGoogleHours", query: mapsLookupQuery || effectiveRestaurant.name || '', mapUrl, restaurantId: restaurant.id },
            120000
          );

          if (extRes && extRes.success) {
            mapsData = extRes;
            mapUrl = String(extRes.finalUrl || extRes.currentUrl || mapUrl || '').trim();
            const mapsClosedStatus = getMapsClosedStatus(extRes);
            if (mapsClosedStatus) {
              addLog(`Estabelecimento fechado detectado no Google/Maps (${mapsClosedStatus.label}); nao vou procurar cardapio nem publicar.`);
              await markRestaurantIneligible(restaurant, {
                status: 'ineligible',
                confidence: 0.99,
                reason: mapsClosedStatus.reason,
                source: extRes.googleSearchFallback ? 'google_search_status_fallback' : 'google_maps_status',
                businessStatus: extRes.businessStatus || '',
                statusText: extRes.statusText || mapsClosedStatus.label,
                closedType: mapsClosedStatus.type,
                currentUrl: extRes.currentUrl || extRes.finalUrl || mapUrl || '',
                requestedUrl: extRes.requestedUrl || '',
              }, 'google_maps_closed_status_gate');
              toast.error(`${effectiveRestaurant.name || initialName} removido: ${mapsClosedStatus.label} no Google/Maps.`, { id: toastId });
              fetchRestaurants();
              return;
            }
            effectiveRestaurant = await persistRestaurantContacts(
              restaurant.id,
              effectiveRestaurant,
              extRes,
              'google_maps',
              mapUrl,
              'Google Maps'
            );
            const identityUpdate: any = {};
            const rawMapsName = String(extRes.name || extRes.title || extRes.restaurantName || '').trim();
            const mapsNameLooksLikeUiLabel = /^(horarios?|horario|enderec?o|telefone|ligar|rotas?|directions?|avaliacoes?|reviews?|menu|cardapio|site|website|fotos?|photos?)$/i.test(normalizeText(rawMapsName));
            if (rawMapsName && mapsNameLooksLikeUiLabel) {
              addLog('Nome fraco do Maps ignorado para identidade: ' + rawMapsName);
            }
            const mapsName = mapsNameLooksLikeUiLabel ? '' : rawMapsName;
            const mapsCategory = extRes.category || extRes.type || '';
            if (mapsName) {
              identityUpdate.google_maps_name = mapsName;
            }
            if (mapsCategory && (!restaurant.category || /restaurante|outros|pendente/i.test(String(restaurant.category)))) {
              identityUpdate.category = mapsCategory;
            }
            const officialNameDecision = await decideRestaurantOfficialNameAI(effectiveRestaurant, {
              googleMapsName: mapsName,
              title: extRes.title || mapsName,
              category: mapsCategory,
              address: extRes.address || restaurant.address || '',
              website: '',
              city: restaurant.city,
              state: restaurant.state,
              neighborhood: restaurant.neighborhood,
            });
            if (officialNameDecision?.officialName) {
              identityUpdate.name = officialNameDecision.officialName;
              identityUpdate.ai_normalized_name = officialNameDecision.officialName;
              identityUpdate.name_cleanup_notes = `IA definiu nome oficial a partir do Google Maps: ${officialNameDecision.reason} (confianÃ§a ${Math.round(officialNameDecision.confidence * 100)}%).`;
            } else if (mapsName && (!restaurant.name || /pendente|google maps|sem nome/i.test(String(restaurant.name)))) {
              identityUpdate.name = mapsName;
              identityUpdate.name_cleanup_notes = 'IA nÃ£o retornou confianÃ§a suficiente; nome do Google Maps mantido provisoriamente.';
            }
            identityUpdate.visit_notes = String(restaurant.visit_notes || '').includes(mapUrl)
              ? restaurant.visit_notes
              : `${restaurant.visit_notes || ''}\nGoogle Maps: ${mapUrl}`.trim();
            if (officialNameDecision?.changed) {
              identityUpdate.visit_notes = `${identityUpdate.visit_notes}\nNome original no Google Maps: ${officialNameDecision.rawGoogleName}\n${identityUpdate.name_cleanup_notes}`.trim();
            }
            await updateRestaurantWithSchemaFallback(restaurant.id, { ...identityUpdate, google_maps_url: mapUrl });
            effectiveRestaurant = {
              ...effectiveRestaurant,
              ...identityUpdate,
              name: identityUpdate.name || mapsName || effectiveRestaurant.name,
              category: mapsCategory || effectiveRestaurant.category,
              googleMapsUrl: mapUrl,
              google_maps_url: mapUrl
            };
            if (officialNameDecision?.officialName) {
              addLog(`IA definiu nome oficial: ${mapsName || officialNameDecision.rawGoogleName} â†’ ${officialNameDecision.officialName} (${Math.round(officialNameDecision.confidence * 100)}%).`);
            } else if (mapsName) {
              addLog(`Nome do Maps mantido provisoriamente: ${mapsName}`);
            }
            if (mapsCategory) addLog(`Categoria oficial do Maps: ${mapsCategory}`);

            if (extRes.schedule && extRes.scheduleIsWeekly === true) {
              toast.success('âœ… HorÃ¡rios encontrados no Google Maps! Salvando...');
              addLog(`HorÃ¡rios salvos.`);
              await supabase.from('restaurants').update({ opening_hours: extRes.schedule }).eq('id', restaurant.id);
            } else if (extRes.schedule) {
              const missingDays = Array.isArray(extRes.scheduleMissingDays) && extRes.scheduleMissingDays.length ? ` Dias faltantes: ${extRes.scheduleMissingDays.join(', ')}.` : '';
              addLog(`HorÃ¡rios parciais detectados (${extRes.scheduleDaysFound || 0}/7 dias). NÃ£o vou salvar para nÃ£o marcar dias ausentes como fechados.${missingDays}`);
            }

            if (extRes.address) {
              toast.success(`âœ… EndereÃ§o oficial encontrado: ${extRes.address}`);
              addLog(`EndereÃ§o salvo: ${extRes.address}`);
              const normalizedAddress = await normalizePublicAddressAI(extRes.address, {
                restaurant: effectiveRestaurant,
                mapsData: extRes,
                mapUrl,
              });
              const sanitizedAddress = normalizedAddress.fullAddress || sanitizeGoogleMapsAddressInput(extRes.address);
              addLog(`EndereÃ§o capturado: ${extRes.address}`);
              if (sanitizedAddress !== extRes.address) addLog(`EndereÃ§o limpo para publicaÃ§Ã£o: ${sanitizedAddress}`);
              const parsedAddr = normalizedAddress.street
                ? normalizedAddress
                : parseGoogleMapsAddress(sanitizedAddress || extRes.address);
              const addrUpdate: any = { address: parsedAddr.street };
              if (parsedAddr.number) addrUpdate.number = parsedAddr.number;
              if (parsedAddr.neighborhood) addrUpdate.neighborhood = parsedAddr.neighborhood;
              if (parsedAddr.city) addrUpdate.city = parsedAddr.city;
              if (parsedAddr.state) addrUpdate.state = parsedAddr.state;
              if (parsedAddr.cep) addrUpdate.cep = parsedAddr.cep;

              const coordinateResult = await resolveRestaurantCoordinatesAI(parsedAddr, {
                restaurant: { ...effectiveRestaurant, ...addrUpdate },
                mapsData: extRes,
                mapUrl,
                rawAddress: extRes.address,
              });
              if (coordinateResult && isUsableCoordinatePair(coordinateResult.lat, coordinateResult.lng)) {
                addrUpdate.latitude = coordinateResult.lat;
                addrUpdate.longitude = coordinateResult.lng;
                addrUpdate.location_source = coordinateResult.source;
                addrUpdate.location_confidence = coordinateResult.confidence;
                addrUpdate.location_verified_at = new Date().toISOString();
                addrUpdate.location_issue_reason = null;
                addLog(`Coordenadas salvas (${coordinateResult.source}): ${coordinateResult.lat}, ${coordinateResult.lng}.`);
              } else {
                addrUpdate.location_issue_reason = 'Validar IA nÃ£o conseguiu validar coordenadas publicÃ¡veis para o endereÃ§o.';
                addLog('Coordenadas nÃ£o foram salvas; pÃ³s-auditoria impedirÃ¡ publicaÃ§Ã£o atÃ© nova validaÃ§Ã£o.');
              }
              await updateRestaurantWithSchemaFallback(restaurant.id, addrUpdate);
              effectiveRestaurant = { ...effectiveRestaurant, ...addrUpdate };
              addLog(`EndereÃ§o salvo limpo: ${[addrUpdate.address, addrUpdate.number, addrUpdate.neighborhood, addrUpdate.city, addrUpdate.state].filter(Boolean).join(', ')}`);
            }

            if (extRes.phone) {
              addLog(`Telefone candidato lido no Google Maps: ${extRes.phone}`);
            }

            if (extRes.coverImage || (extRes.galleryImages && extRes.galleryImages.length > 0)) {
              const galleryAddressCheck = googleMapsGalleryAddressMatches(extRes.galleryAddress || extRes.address || '', effectiveRestaurant);
              if (!galleryAddressCheck.allowed) {
                addLog(`Fotos do Google/Maps ignoradas para galeria: ${galleryAddressCheck.reason}`);
              } else {
              addLog(`Fotos do Google Maps extraidas e confirmadas por endereco (${galleryAddressCheck.reason}); serao usadas como fallback filtrado se a pesquisa normal do Google nao entregar o modal See photos.`);
              const googlePhotoCandidates = [
                ...(extRes.coverImage ? [{ image: extRes.coverImage, source: 'google_cover', dateText: extRes.coverImageDateText || '' }] : []),
                ...((extRes.galleryImages || []).map((image: string, index: number) => ({
                  image,
                  source: 'google_gallery',
                  dateText: extRes.galleryImageDates?.[index] || extRes.galleryImageMeta?.[index]?.dateText || ''
                })))
              ];
              googleMapsGalleryImageCandidates = googlePhotoCandidates;
              googleMenuImageCandidates = googlePhotoCandidates;

              if (extRes.coverImage) {
                addLog('Capa candidata do Google Maps guardada apenas como evidencia; capa publica sera definida somente a partir de foto aprovada na galeria.');
              }
              if (extRes.galleryImages && extRes.galleryImages.length > 0) {
                addLog(`${extRes.galleryImages.length} foto(s) do Google Maps guardada(s) para evidencias/cardapio e fallback de galeria com filtro visual.`);
              }
              }
            }

            if (extRes.website) {
              addLog(`Website lido no Google Maps ignorado para coleta/publicacao: ${extRes.website}`);
            }

            if (!activeInstagramUrl && extRes.socialLinks && extRes.socialLinks.length > 0) {
              const instaFromMaps = extRes.socialLinks.find((s: any) => s.platform === 'instagram');
              if (instaFromMaps) {
                activeInstagramUrl = instaFromMaps.url;
                toast.success(`âœ… Instagram encontrado no Maps: ${activeInstagramUrl}`);
                addLog(`Instagram encontrado via Maps: ${activeInstagramUrl}`);
              }
            }
          } else {
            toast.error(`Falha ao obter dados do Google Maps (a aba abriu?). Tentando seguir...`);
            addLog(`Falha ao coletar dados do Google Maps via extensÃ£o.`);
          }
        }

        const enrichedEligibility = await classifyRestaurantEligibilityAI(effectiveRestaurant, {
          ...(mapsData || {}),
          website: '',
        });
        if (enrichedEligibility.status === 'ineligible' && enrichedEligibility.confidence >= 0.8) {
          await markRestaurantIneligible(restaurant, enrichedEligibility, 'post_maps_eligibility_gate');
          toast.error(`${effectiveRestaurant.name || initialName} removido: nÃ£o Ã© restaurante elegÃ­vel.`, { id: toastId });
          fetchRestaurants();
          return;
        }

        const buildDirectInstagramCandidateUrls = () => {
          const rawName = normalizeText(effectiveRestaurant.name || initialName).replace(/[^a-z0-9 ]+/g, ' ');
          const rawCity = normalizeText(effectiveRestaurant.city || '').replace(/[^a-z0-9 ]+/g, ' ');
          const rawState = normalizeText(effectiveRestaurant.state || '').replace(/[^a-z0-9]+/g, '');
          const nameWords = rawName.split(' ').filter(Boolean).filter((word: string) => !['restaurante', 'restaurant', 'delivery', 'bar', 'lanchonete', 'pizzaria', 'hamburgueria', 'cozinha'].includes(word));
          const cityCompact = rawCity.split(' ').filter(Boolean).join('');
          const stateCompact = rawState || 'pb';
          const baseCompact = nameWords.join('');
          const baseDotted = nameWords.join('.');
          const firstWord = nameWords[0] || '';
          const handles = new Set<string>();
          const addHandle = (value: string) => {
            const handle = String(value || '').toLowerCase().replace(/[^a-z0-9._]/g, '').replace(/^[._]+|[._]+$/g, '');
            if (handle.length >= 3 && handle.length <= 30 && !['instagram', 'google', 'gmail', 'maps'].includes(handle)) handles.add(handle);
          };
          addHandle(baseCompact);
          addHandle(baseDotted);
          if (cityCompact) {
            addHandle(baseCompact + cityCompact);
            addHandle(baseCompact + '.' + cityCompact);
            addHandle(firstWord + cityCompact);
            addHandle(firstWord + '.' + cityCompact);
          }
          if (stateCompact) {
            addHandle(baseCompact + stateCompact);
            addHandle(firstWord + stateCompact);
          }
          addHandle(baseCompact + 'oficial');
          return Array.from(handles).slice(0, 5).map((handle) => 'https://www.instagram.com/' + handle + '/');
        };

        const validateInstagramCandidateUrls = async (candidateUrls: string[], sourceLabel: string) => {
          const uniqueCandidates = Array.from(new Set(candidateUrls.filter((url: string) => /^https?:\/\/(?:www\.)?instagram\.com\/[a-z0-9._-]+\/?$/i.test(String(url || ''))))).slice(0, 5);
          if (uniqueCandidates.length === 0) return '';
          const strictDirectGuess = /handles provaveis/i.test(sourceLabel);
          addLog(sourceLabel + ': testando ' + uniqueCandidates.length + ' candidato(s) direto(s) de Instagram sem abrir Google.');
          const candidatesWithBio: any[] = [];
          for (const candidateUrl of uniqueCandidates) {
            addLog('Raspando candidato de Instagram para validacao: ' + candidateUrl);
            const candidateScrape = await sendExtensionMessage(extensionTargetId, {
              action: "scrapeInstagram",
              instagramUrl: candidateUrl,
              restaurantId: restaurant.id,
              lightweight: true,
              collectImages: false
            }, 35000);
            if (candidateScrape?.success && !candidateScrape?.isLoginRequired) {
              const candidateBio = String(candidateScrape.bio || '').trim();
              const candidateBioLinks = Array.isArray(candidateScrape.bioLinks || candidateScrape.linkCandidates) ? (candidateScrape.bioLinks || candidateScrape.linkCandidates) : [];
              const candidateFollowers = Number(candidateScrape.followers || 0);
              const strongDirectEvidence = candidateBioLinks.length > 0 || candidateFollowers >= 1000;
              if (strictDirectGuess && !strongDirectEvidence) {
                addLog('Candidato direto de Instagram ignorado por evid?ncia fraca: ' + candidateUrl + ' (bio/link ausente e poucos seguidores).');
                continue;
              }
              candidatesWithBio.push({
                url: candidateUrl,
                bio: candidateBio,
                followers: candidateFollowers,
                bioLinks: candidateBioLinks
              });
            } else {
              const scrapeError = candidateScrape?.error || candidateScrape?.blocker || 'sem motivo informado';
              rememberInstagramScrapeIssue(candidateUrl, sourceLabel, scrapeError);
              addLog('Candidato de Instagram nao pode ser raspado: ' + candidateUrl + ' (' + scrapeError + ').');
            }
          }
          if (candidatesWithBio.length === 0) {
            addLog(sourceLabel + ': nenhum candidato direto pode ser validado por bio.');
            return '';
          }
          const validateCandidatesResponse = await fetch('/api/local-collector/validate-instagram?restaurantId=' + restaurant.id, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              candidates: candidatesWithBio,
              restaurantName: effectiveRestaurant.name || '',
              restaurantCity: effectiveRestaurant.city || '',
              restaurantAddress: effectiveRestaurant.address || '',
              restaurantPhone: effectiveRestaurant.phone || restaurant.phone || ''
            })
          });
          const validateCandidatesData = validateCandidatesResponse.ok
            ? await validateCandidatesResponse.json()
            : null;
          if (validateCandidatesData?.isValid && validateCandidatesData?.selectedUrl) {
            const selectedCandidate = candidatesWithBio.find((candidate: any) => normalizeSavedInstagramUrl(candidate.url) === normalizeSavedInstagramUrl(validateCandidatesData.selectedUrl));
            validatedInstagramBioLinks = Array.isArray(selectedCandidate?.bioLinks) ? selectedCandidate.bioLinks : [];
            if (validatedInstagramBioLinks.length > 0) {
              instagramMenuCandidates = mergeInstagramBioLinkCandidates(instagramMenuCandidates, validatedInstagramBioLinks);
              addLog(`Links oficiais da bio preservados da validacao do Instagram: ${validatedInstagramBioLinks.length}.`);
            }
            addLog('Instagram confirmado pela IA entre candidatos diretos: ' + validateCandidatesData.selectedUrl + '. Motivo: ' + (validateCandidatesData.reason || 'sem motivo'));
            return validateCandidatesData.selectedUrl;
          }
          addLog(sourceLabel + ': IA nao confirmou candidato direto (' + (validateCandidatesData?.reason || validateCandidatesData?.error || 'sem motivo informado') + ').');
          return '';
        };

        if (!activeInstagramUrl) {
          addLog('Busca direta por handles provaveis ignorada: Instagram sera buscado somente por resultados reais do Google.');
        }

        if (!activeInstagramUrl) {
          toast.success('PASSO 2/5: Buscando Instagram no Google usando nome e cidade...');
          addLog(`PASSO 2/5: Buscando Instagram no Google...`);
          const query = `${effectiveRestaurant.name || initialName || ''} ${effectiveRestaurant.city || restaurant.city || ''}`.replace(/\s+/g, ' ').trim();
          let extRes = await sendExtensionMessage(extensionTargetId, { action: "searchGoogleForInstagram", query, restaurantId: restaurant.id });
          if (extRes?.requiresHuman) {
            const reason = extRes.error || extRes.blocker || 'captcha/bloqueio no Google';
            await persistMenuStatus(restaurant, 'manual_required', `Intervencao necessaria na busca do Instagram pelo Google: ${reason}`, { instagramSearch: extRes });
            finalMenuStatus = 'manual_required';
            addLog(`Busca do Instagram pausada por intervencao humana no Google: ${reason}.`);
            toast.warning('Resolva o captcha/bloqueio da busca do Google e rode Validar IA novamente.');
            return;
          }
          let instagramCandidates = Array.from(new Set([
            ...((Array.isArray(extRes?.candidates) ? extRes.candidates : []) as string[]),
            ...((Array.isArray(extRes?.urls) ? extRes.urls : []) as string[]),
            extRes?.url || '',
          ].filter((url: string) => /^https?:\/\/(?:www\.)?instagram\.com\/[a-z0-9._-]+\/?$/i.test(String(url || ''))))).slice(0, 3);
          if (instagramCandidates.length === 0) {
            const fallback = await fallbackSearchInstagramViaGoogleNative(query);
            if (fallback.blocked) {
              const reason = fallback.response?.error || fallback.response?.blocker || 'captcha/bloqueio no Google';
              await persistMenuStatus(restaurant, 'manual_required', `Intervencao necessaria na busca do Instagram pelo Google: ${reason}`, { instagramSearch: fallback.response });
              finalMenuStatus = 'manual_required';
              addLog(`Busca do Instagram pausada por intervencao humana no Google normal: ${reason}.`);
              toast.warning('Resolva o captcha/bloqueio da busca do Google e rode Validar IA novamente.');
              return;
            }
            instagramCandidates = fallback.candidates;
          }
          if (instagramCandidates.length > 0) {
            addLog(`${extRes?.source === 'bing' ? 'Busca alternativa' : 'Google'} retornou ${instagramCandidates.length} candidato(s) de Instagram: ${instagramCandidates.join(', ')}`);
            const candidatesWithBio: any[] = [];
            for (const candidateUrl of instagramCandidates) {
              addLog(`Raspando candidato de Instagram para validacao: ${candidateUrl}`);
              const candidateScrape = await sendExtensionMessage(extensionTargetId, {
                action: "scrapeInstagram",
                instagramUrl: candidateUrl,
                restaurantId: restaurant.id,
                lightweight: true,
                collectImages: false
              }, 35000);
              if (candidateScrape?.success && !candidateScrape?.isLoginRequired) {
                const candidateBioLinks = Array.isArray(candidateScrape.bioLinks || candidateScrape.linkCandidates)
                  ? (candidateScrape.bioLinks || candidateScrape.linkCandidates)
                  : [];
                candidatesWithBio.push({
                  url: candidateUrl,
                  bio: candidateScrape.bio || '',
                  followers: candidateScrape.followers || 0,
                  bioLinks: candidateBioLinks
                });
              } else {
                const scrapeError = candidateScrape?.error || candidateScrape?.blocker || 'sem motivo informado';
                rememberInstagramScrapeIssue(candidateUrl, extRes?.source === 'bing' ? 'Busca alternativa por perfis Instagram' : 'Google Instagram', scrapeError);
                addLog(`Candidato de Instagram nao pode ser raspado: ${candidateUrl} (${scrapeError}).`);
              }
            }
            if (candidatesWithBio.length > 0) {
              const validateCandidatesResponse = await fetch(`/api/local-collector/validate-instagram?restaurantId=${restaurant.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  candidates: candidatesWithBio,
                  restaurantName: effectiveRestaurant.name || '',
                  restaurantCity: effectiveRestaurant.city || '',
                  restaurantAddress: effectiveRestaurant.address || '',
                  restaurantPhone: effectiveRestaurant.phone || restaurant.phone || ''
                })
              });
              const validateCandidatesData = validateCandidatesResponse.ok
                ? await validateCandidatesResponse.json()
                : null;
              if (validateCandidatesData?.isValid && validateCandidatesData?.selectedUrl) {
                activeInstagramUrl = validateCandidatesData.selectedUrl;
                const selectedCandidate = candidatesWithBio.find((candidate: any) => normalizeSavedInstagramUrl(candidate.url) === normalizeSavedInstagramUrl(activeInstagramUrl));
                validatedInstagramBioLinks = Array.isArray(selectedCandidate?.bioLinks) ? selectedCandidate.bioLinks : [];
                if (validatedInstagramBioLinks.length > 0) {
                  instagramMenuCandidates = mergeInstagramBioLinkCandidates(instagramMenuCandidates, validatedInstagramBioLinks);
                  addLog(`Links oficiais da bio preservados da validacao do Instagram pelo Google: ${validatedInstagramBioLinks.length}.`);
                }
                toast.success(`Instagram confirmado pela IA: ${activeInstagramUrl}`);
                addLog(`Instagram confirmado pela IA entre candidatos: ${activeInstagramUrl}. Motivo: ${validateCandidatesData.reason || 'sem motivo'}`);
              } else {
                addLog(`IA nao confirmou nenhum candidato de Instagram: ${validateCandidatesData?.reason || validateCandidatesData?.error || 'sem motivo informado'}`);
              }
            } else {
              addLog('Nenhum candidato de Instagram pode ser raspado para validar pela IA.');
            }
          }

          if (!activeInstagramUrl && extRes && extRes.success && extRes.url && instagramCandidates.length === 0) {
            addLog(`Instagram candidato encontrado, mas nao usado automaticamente sem validacao: ${extRes.url}`);
          }
          if (!activeInstagramUrl) {
            const searchedProfileScrapeIssues = instagramScrapeIssues.filter((issue) => !/handles provaveis/i.test(issue.source));
            const timeoutIssues = searchedProfileScrapeIssues.filter((issue) => isInstagramScrapeTimeout(issue.error));
            if (timeoutIssues.length > 0) {
              const attemptedUrls = Array.from(new Set(timeoutIssues.map((issue) => issue.url))).join(', ');
              addLog(`Instagram candidato nao foi validado por timeout ao raspar (${attemptedUrls}). Vou continuar com as demais fontes permitidas e classificar pelo conjunto de evidencias.`);
            } else {
              toast.error(`Nenhum Instagram encontrado via Google. ${extRes?.error || ''}`);
              addLog(`Nenhum Instagram encontrado via Google.`);
            }
          }
        }

        if (shouldScrapeInstagramNow()) {
          toast.success('PASSO 3/5: Coletando perfil e verificando relevÃ¢ncia do Instagram...');
          addLog(`PASSO 3/5: Verificando Instagram: ${activeInstagramUrl}`);
          const scrapeRes = await sendExtensionMessage(extensionTargetId, {
            action: "scrapeInstagram",
            instagramUrl: activeInstagramUrl,
            restaurantId: restaurant.id,
            collectImages: true,
            feedImageLimit: 12,
            highlightImageLimit: 6
          }, 70000);

          if (scrapeRes && scrapeRes.success) {
            instagramBio = scrapeRes.bio || '';
            instagramFollowers = scrapeRes.followers || 0;
            const scrapedInstagramMenuCandidates = Array.isArray(scrapeRes.linkCandidates)
              ? scrapeRes.linkCandidates
              : (Array.isArray(scrapeRes.bioLinks) ? scrapeRes.bioLinks : []);
            instagramMenuCandidates = mergeInstagramBioLinkCandidates(instagramMenuCandidates, scrapedInstagramMenuCandidates);
            if (instagramMenuCandidates.length > 0) {
              addLog(`Links candidatos coletados no Instagram sem navegaÃ§Ã£o externa: ${instagramMenuCandidates.length}.`);
            }
            const instagramContactPayload = { scrapeRes, instagramBio, instagramMenuCandidates, activeInstagramUrl };

            const socialNameDecision: any = null;
            if (socialNameDecision?.officialName && normalizeText(socialNameDecision.officialName) !== normalizeText(effectiveRestaurant.name)) {
              await updateRestaurantWithSchemaFallback(restaurant.id, {
                name: socialNameDecision.officialName,
                ai_normalized_name: socialNameDecision.officialName,
                google_maps_name: socialNameDecision.rawGoogleName,
                name_cleanup_notes: `IA revisou nome oficial com Instagram: ${socialNameDecision.reason} (confianÃ§a ${Math.round(socialNameDecision.confidence * 100)}%).`,
              });
              addLog(`IA revisou nome com Instagram: ${effectiveRestaurant.name} â†’ ${socialNameDecision.officialName} (${Math.round(socialNameDecision.confidence * 100)}%).`);
              effectiveRestaurant = { ...effectiveRestaurant, name: socialNameDecision.officialName };
            }

            toast.success(`Validando Instagram com IA (Nome: ${effectiveRestaurant.name || initialName}, Bio: ${instagramBio})...`);
            addLog(`Validando Instagram com IA (Bio: ${instagramBio})...`);

            const socialEligibility = await classifyRestaurantEligibilityAI(effectiveRestaurant, { ...(mapsData || {}), bio: instagramBio });
            if (socialEligibility.status === 'ineligible' && socialEligibility.confidence >= 0.8) {
              await markRestaurantIneligible(restaurant, socialEligibility, 'instagram_bio_eligibility_gate');
              toast.error(`${effectiveRestaurant.name || initialName} removido: nÃ£o Ã© restaurante elegÃ­vel.`, { id: toastId });
              fetchRestaurants();
              return;
            }

            const payload = {
              candidates: [{ url: activeInstagramUrl, bio: instagramBio, followers: instagramFollowers, bioLinks: instagramMenuCandidates }],
              restaurantName: effectiveRestaurant.name || '',
              restaurantCity: effectiveRestaurant.city || '',
              restaurantAddress: effectiveRestaurant.address || '',
              restaurantPhone: effectiveRestaurant.phone || restaurant.phone || ''
            };

            const validateRes = await fetch(`/api/local-collector/validate-instagram?restaurantId=${restaurant.id}`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });

            if (validateRes.ok) {
              const valData = await validateRes.json();
              if (valData.isValid) {
                toast.success(`Instagram validado pela IA! (${valData.reason})`);
                addLog(`Instagram VALIDADO pela IA: ${valData.reason}`);
                effectiveRestaurant = await persistRestaurantContacts(
                  restaurant.id,
                  effectiveRestaurant,
                  instagramContactPayload,
                  'instagram_profile',
                  activeInstagramUrl,
                  'Instagram/bio'
                );
                const validatedSocialNameDecision = await decideRestaurantOfficialNameAI(effectiveRestaurant, {
                  ...(mapsData || {}),
                  googleMapsName: mapsData?.name || mapsData?.title || effectiveRestaurant.google_maps_name || effectiveRestaurant.name,
                  bio: instagramBio,
                  website: '',
                });
                if (validatedSocialNameDecision?.officialName && normalizeText(validatedSocialNameDecision.officialName) !== normalizeText(effectiveRestaurant.name)) {
                  await updateRestaurantWithSchemaFallback(restaurant.id, {
                    name: validatedSocialNameDecision.officialName,
                    ai_normalized_name: validatedSocialNameDecision.officialName,
                    google_maps_name: validatedSocialNameDecision.rawGoogleName,
                    name_cleanup_notes: `IA revisou nome oficial com Instagram validado: ${validatedSocialNameDecision.reason} (confianca ${Math.round(validatedSocialNameDecision.confidence * 100)}%).`,
                  });
                  addLog(`IA revisou nome com Instagram validado: ${effectiveRestaurant.name} -> ${validatedSocialNameDecision.officialName} (${Math.round(validatedSocialNameDecision.confidence * 100)}%).`);
                  effectiveRestaurant = { ...effectiveRestaurant, name: validatedSocialNameDecision.officialName };
                }
                const galleryEligibility = hasCityEvidenceForInstagramGallery(activeInstagramUrl, instagramBio, valData.reason || '', instagramMenuCandidates);
                instagramFeedGalleryAllowed = galleryEligibility.allowed;
                instagramFeedGalleryBlockReason = galleryEligibility.allowed
                  ? galleryEligibility.reason
                  : `Instagram validado por identidade, mas sem prova de unidade/cidade; feed e fotos publicas bloqueados. ${galleryEligibility.reason}`;
                if (instagramFeedGalleryAllowed) {
                  addLog(`Feed do Instagram liberado para galeria: ${instagramFeedGalleryBlockReason}`);
                } else {
                  addLog(`Feed do Instagram bloqueado para galeria publica: ${instagramFeedGalleryBlockReason}`);
                }
                toast.success('Baixando foto de perfil (Logo)...');
                addLog(`Baixando foto de perfil (Logo)...`);
                const uploadInstagramLogoDataUrl = async (logoDataUrl: string) => {
                  const parsedLogo = imageDataUrlToBlob(logoDataUrl);
                  if (!parsedLogo) {
                    addLog('Logo do Instagram veio em base64 invalido; tentando URL remota.');
                    return null;
                  }

                  const storagePath = `restaurants/${restaurant.id}/logo_${Date.now()}.${parsedLogo.extension}`;
                  const { error } = await supabase.storage
                    .from('restaurant-images')
                    .upload(storagePath, parsedLogo.blob, { upsert: true, contentType: parsedLogo.contentType });
                  if (error) {
                    addLog(`Erro no upload direto da logo do Instagram: ${error.message}`);
                    return null;
                  }

                  const { data } = supabase.storage.from('restaurant-images').getPublicUrl(storagePath);
                  return data.publicUrl || null;
                };

                if (scrapeRes.logoDataUrl) {
                  try {
                    logoPublicUrl = await uploadInstagramLogoDataUrl(scrapeRes.logoDataUrl);
                    if (logoPublicUrl) {
                      toast.success(`Logo salva com sucesso!`);
                      addLog(`Logo salva com sucesso via imagem capturada pela extensao.`);
                    }
                  } catch (logoErr: any) {
                    addLog(`Erro ao salvar logo capturada pela extensao: ${logoErr.message || logoErr}`);
                  }
                }

                if (!logoPublicUrl && scrapeRes.rawLogoUrl) {
                  const storagePath = `restaurants/${restaurant.id}/logo_${Date.now()}.jpg`;
                  try {
                    const logoRes = await fetch(`/api/local-collector/download-and-upload?url=${encodeURIComponent(scrapeRes.rawLogoUrl)}&path=${encodeURIComponent(storagePath)}`, {
                      method: 'POST'
                    });
                    if (logoRes.ok) {
                      const logoData = await logoRes.json();
                      if (logoData.success && logoData.url) {
                        logoPublicUrl = logoData.url;
                        toast.success(`âœ… Logo salva com sucesso!`);
                        addLog(`Logo salva com sucesso.`);
                      } else {
                        addLog(`Erro ao salvar logo: ${logoData.error || 'sem URL'}`);
                      }
                    } else {
                      addLog(`Falha na requisiÃ§Ã£o de logo: HTTP ${logoRes.status}`);
                    }
                  } catch (logoErr: any) {
                    addLog(`Erro ao baixar logo: ${logoErr.message}`);
                  }
                }

                if (!logoPublicUrl) {
                  addLog('Logo nao foi salva: a extensao nao entregou imagem utilizavel e o download remoto tambem falhou.');
                }

                // Destaques ajudam a encontrar cardapio, mas nao entram na galeria publica.
                if (scrapeRes.highlightImages && scrapeRes.highlightImages.length > 0) {
                  instagramHighlightMenuImageCandidates = [...instagramHighlightMenuImageCandidates, ...scrapeRes.highlightImages];
                  addLog(`${scrapeRes.highlightImages.length} imagem(ns) de destaque guardada(s) somente como candidata(s) para extracao de cardapio.`);
                  addLog('Destaques do Instagram nao entram na galeria publica; galeria usa feed do Instagram e Google.');
                }

                // Coleta feed do Instagram como candidato; salvamento da galeria prioriza Google.
                if (scrapeRes.feedImages && scrapeRes.feedImages.length > 0) {
                  instagramFeedMenuImageCandidates = [...instagramFeedMenuImageCandidates, ...scrapeRes.feedImages];
                  const availableGallerySlots = MAX_PUBLIC_GALLERY_IMAGES - savedGalleryUrls.size;
                  if (availableGallerySlots <= 0) {
                    addLog('Galeria ja atingiu o limite de 8 fotos aprovadas; nao vou salvar mais fotos do feed.');
                  } else if (existingInstagramFeedGalleryCount >= MIN_PUBLIC_GALLERY_IMAGES) {
                    addLog(`Galeria ja possui ${existingInstagramFeedGalleryCount} foto(s) aprovadas do feed do Instagram; nesta revalidacao o feed ficara somente como evidencia de cardapio para evitar duplicatas visuais.`);
                  } else if (!instagramFeedGalleryAllowed) {
                    addLog(`Feed do Instagram mantido apenas como candidato de cardapio; ${scrapeRes.feedImages.length} imagem(ns) nao foram enviadas para galeria porque ${instagramFeedGalleryBlockReason || 'a unidade/cidade nao foi confirmada no perfil.'}`);
                  } else {
                    addLog(`Feed do Instagram validado e guardado como fallback de galeria (${scrapeRes.feedImages.length} imagem(ns)); fotos do Google serao tentadas primeiro para salvar na galeria.`);
                  }
                }


                toast.success('Salvando Instagram como enriquecimento parcial...');
                addLog(`Salvando Instagram no banco sem concluir a validaÃ§Ã£o antes do cardÃ¡pio...`);
                const updates: any = {};
                if (logoPublicUrl) updates.image_url = logoPublicUrl;

                const { data: updatedRest } = await supabase.from('restaurants').select('social_networks').eq('id', restaurant.id).single();
                const currentSocials = updatedRest?.social_networks || [];
                const cleanSocials = (Array.isArray(currentSocials) ? currentSocials : []).filter((s: any) => s && s.platform !== 'instagram');
                cleanSocials.push({ platform: 'instagram', url: activeInstagramUrl, followers: instagramFollowers });
                updates.social_networks = cleanSocials;
                updates.instagram = activeInstagramUrl;
                if (Number(instagramFollowers) > 0) {
                  updates.followers_override = Number(instagramFollowers);
                }

                await supabase.from('restaurants').update(updates).eq('id', restaurant.id);


                toast.success(`âœ… Instagram coletado! Logo e ${instagramFollowers} seguidores salvos.`);
                addLog(`Finalizado. Instagram salvo.`);
              } else {
                toast.error(`Instagram rejeitado pela IA: ${valData.reason || 'DivergÃªncia.'}`);
                addLog(`Instagram REJEITADO: ${valData.reason}`);
                clearRejectedInstagramDerivedData(valData.reason || 'Instagram rejeitado pela IA');
                addLog('Dados derivados do Instagram rejeitado foram descartados desta execucao: bio, links, feed, destaques e candidatos de cardapio.');
              }
            } else {
              toast.error('Erro ao validar Instagram no servidor.');
              clearRejectedInstagramDerivedData('Validacao do Instagram falhou no servidor');
              addLog('Validacao do Instagram falhou no servidor; dados derivados do perfil foram descartados desta execucao.');
            }
          } else {
            toast.error(`Falha ao raspar perfil do Instagram: ${scrapeRes?.error || 'Tente novamente.'}`);
            clearRejectedInstagramDerivedData(scrapeRes?.error || 'Falha ao raspar perfil do Instagram');
            addLog('Falha ao raspar Instagram; perfil nao sera usado como fonte de cardapio ou galeria nesta execucao.');
          }
        } else {
          toast.error('Nenhum link de Instagram encontrado para este restaurante.');
        }

        await fillGalleryFromGoogleFallback();

        toast.success('PASSO 5/5: Extraindo cardÃ¡pio a partir da bio/imagens permitidas...');
        addLog(`PASSO 5/5: Iniciando extraÃ§Ã£o de cardÃ¡pio...`);
        try {
          const normalizeKey = (value: string) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
          const baseName = effectiveRestaurant.name || restaurant.name || '';
          const baseCity = effectiveRestaurant.city || restaurant.city || '';
          const baseNeighborhood = effectiveRestaurant.neighborhood || restaurant.neighborhood || '';
          const baseAddress = effectiveRestaurant.address || restaurant.address || '';
          const cityKey = normalizeKey(baseCity || '');
          const unsafeNonMenuUrlPattern = /casino|poker|bonus|bono|bet\b|betting|aposta|apostas|slot|slots|gambling|holdem|reward\s*code|cupom|coupon|cashback|fidelidade|loyalty|promo(?:cao|coes|Ã¯Â¿Â½Ã¯Â¿Â½o|Ã¯Â¿Â½Ã¯Â¿Â½es)?|promotions?|pagamento|payment|wallet|voucher|gift|viagra|forex|crypto|binary|adult|escort|seo-spam|meta\.ai/i;
          const isSafeMenuUrl = (value: string) => {
            try {
              const parsed = new URL(value);
              const host = parsed.hostname.toLowerCase();
              const pathAndQuery = `${parsed.pathname}${parsed.search}`.toLowerCase();
              const fullUrl = `${host}${pathAndQuery}`;
              const anotaAccessTokenMenu = host.endsWith('anota.ai')
                && parsed.pathname.toLowerCase().startsWith('/login')
                && Boolean(parsed.searchParams.get('access_token'));
              const blockedHost = ['instagram.com', 'threads.net', 'threads.com', 'facebook.com', 'fb.com', 'tiktok.com', 'x.com', 'twitter.com', 'youtube.com', 'meta.com', 'about.meta.com', 'meta.ai']
                .some(domain => host === domain || host.endsWith('.' + domain));
              const blockedPath = !anotaAccessTokenMenu
                && /\/(?:share|sharer|intent|login|auth|account|cart|checkout|promotions?|promos?|cashback|cupom|coupons?|fidelidade|loyalty|pagamento|payment|wallet|orders?|wp-json|feed\b|tag\/|author\/|category\/(?:bookkeeping|contabilidade|blog|noticias|news))|[?&](?:share|u|url)=https?%3a|[?&](?:tab|origin)=[^&]*(?:cashback|promo|cupom|coupon|fidelidade|payment|pagamento)/i.test(pathAndQuery);
              const blockedSpam = unsafeNonMenuUrlPattern.test(fullUrl);
              return !isGoogleMapsUrl(value) && !blockedHost && !blockedPath && !blockedSpam && !isBareGenericMenuPlatformRoot(value);
            } catch (_) { return false; }
          };

          const hasSensitiveMenuUrlParam = (parsed: URL) => (
            [
              'access_token',
              'token',
              'auth',
              'authorization',
              'session',
              'session_id',
              'jwt',
              'code',
              'state',
              'id_token',
              'refresh_token',
            ].some((param) => parsed.searchParams.has(param))
          );

          const cleanPublicMenuUrl = (value: string) => {
            try {
              const parsed = new URL(value);
              const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
              const pathname = parsed.pathname.toLowerCase();
              if (hasSensitiveMenuUrlParam(parsed)) return '';
              if (/^\/(?:login|auth|account|cart|checkout|orders?|pedidos?|promotions?|promos?|cashback|cupom|coupons?|fidelidade|loyalty|pagamento|payment|wallet)\b/i.test(pathname)) {
                return '';
              }
              if (host === 'pedido.anota.ai' || host.endsWith('.anota.ai')) {
                const match = parsed.pathname.match(/^\/loja\/[^/?#]+/i) || parsed.pathname.match(/^\/m\/[^/?#]+/i);
                if (!match) return '';
                return `https://pedido.anota.ai${match[0]}`;
              }
              parsed.hash = '';
              [
                'utm_source',
                'utm_medium',
                'utm_campaign',
                'utm_content',
                'utm_term',
                'fbclid',
                'gclid',
                'from',
                'origin',
                'tab',
              ].forEach((param) => parsed.searchParams.delete(param));
              return parsed.href;
            } catch (_) {
              return '';
            }
          };

          const toPersistableMenuUrl = (...values: Array<string | null | undefined>) => {
            for (const value of values) {
              const clean = cleanPublicMenuUrl(String(value || ''));
              if (clean && isSafeMenuUrl(clean)) return clean;
            }
            return '';
          };

          const isKnownMenuPlatformUrl = (value: string) => {
            try {
              const parsed = new URL(value);
              const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
              const pathAndQuery = `${parsed.pathname}${parsed.search}`.toLowerCase();
              return (
                /(^|\.)saipos\.com$|(^|\.)anota\.ai$|(^|\.)goomer\.app$|(^|\.)goomer\.com\.br$|(^|\.)livemenu\.app$|(^|\.)ola\.click$|(^|\.)ola\.menu$|(^|\.)menudino\.com$|(^|\.)deliverymuch\.com\.br$|(^|\.)deliverydireto\.com\.br$|(^|\.)instadelivery\.com\.br$|(^|\.)aiqfome\.com$|(^|\.)ifood\.com\.br$|(^|\.)cardapioweb\.com$/.test(host)
                || /cardapio|card[a?]pio|menu|delivery|pedido|pedir|loja/i.test(`${host}${pathAndQuery}`)
              );
            } catch (_) {
              return false;
            }
          };
          const isAllowedBioMenuUrl = (value: string) => {
            // Regra geral: URL segura da bio pode ser uma ponte, mas nao sera aceita como cardapio final sem adaptador/auditoria.
            return Boolean(value && isSafeMenuUrl(value));
          };
          const isDirectBioMenuUrl = (value: string) => isAllowedBioMenuUrl(value) && isKnownMenuPlatformUrl(value) && !isLikelyLinkHubUrl(value);
          const isBioBridgeUrl = (value: string) => isAllowedBioMenuUrl(value) && !isDirectBioMenuUrl(value);

          const sendExtensionAction = (action: string, url: string, extra: Record<string, any> = {}, timeoutMs = 120000) => {
            return sendExtensionMessage(extensionTargetId, { action, url, ...extra }, timeoutMs);
          };

          const hasCriticalMenuDetailMiss = (result: any) => {
            if (!result) return false;
            const metrics = result.metrics || {};
            return Boolean(
              result.requiresHuman
              || metrics.optionExtractionMissed
              || Number(metrics.detailGroupHintMissCount || 0) > 0
              || /option_group|adicionais|escolhas|detalhes do anota|item-a-item/i.test(String(result.error || ''))
            );
          };

          const attachVisualMenuAudit = async (evidence: any, sourceUrl: string) => {
            if (!evidence?.success || !sourceUrl || !isSafeMenuUrl(sourceUrl)) return evidence;
            try {
              addLog('Conferindo estrutura visual do cardÃ¡pio com screenshots antes da curadoria IA...');
              const visualEvidence = await sendExtensionAction(
                'auditMenuHybrid',
                sourceUrl,
                { forceScreenshots: true, maxScreenshots: 4 },
                120000
              );
              if (!visualEvidence?.success) return evidence;
              const screenshots = Array.isArray(visualEvidence.screenshots) ? visualEvidence.screenshots : [];
              addLog(`EvidÃªncia visual capturada: ${screenshots.length} screenshot(s) para comparar estrutura/categorias.`);
              return {
                ...evidence,
                visualAuditEvidence: {
                  platform: visualEvidence.platform || evidence.platform || '',
                  finalUrl: visualEvidence.finalUrl || sourceUrl,
                  title: visualEvidence.title || '',
                  metrics: visualEvidence.metrics || null,
                  blockers: visualEvidence.blockers || [],
                  strategy: visualEvidence.strategy || '',
                  screenshotCount: screenshots.length,
                },
                screenshots: screenshots.length
                  ? screenshots
                  : (Array.isArray(evidence.screenshots) ? evidence.screenshots : []),
                visualRawText: visualEvidence.rawText || evidence.rawText || '',
                visualItems: Array.isArray(visualEvidence.items) ? visualEvidence.items.slice(0, 120) : [],
              };
            } catch (visualError: any) {
              addLog(`Aviso: nÃ£o consegui capturar evidÃªncia visual do cardÃ¡pio agora (${visualError.message || visualError}). A pÃ³s-auditoria decidirÃ¡ se precisa recoletar.`);
              return evidence;
            }
          };

          const menuEvidenceLooksUnavailable = (evidence: any) => {
            const haystack = normalizeText([
              evidence?.error,
              evidence?.title,
              evidence?.rawText,
              evidence?.visualRawText,
              evidence?.finalUrl,
              evidence?.sourceUrl,
              evidence?.visualAuditEvidence?.title,
              JSON.stringify(evidence?.visualAuditEvidence?.blockers || []),
            ].filter(Boolean).join(' '));
            return /404|not found|loja nao encontrada|nao esta mais disponivel|indisponivel|pagina nao encontrada|fora do ar|store not found|shop not found|cardapio nao encontrado|cardapio indisponivel/.test(haystack);
          };

          const failedMenuSourceKeys = new Set<string>();
          const menuSourceUrlKey = (value: string) => {
            try {
              const parsed = new URL(value);
              parsed.hash = '';
              ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid']
                .forEach((param) => parsed.searchParams.delete(param));
              const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
              const pathname = parsed.pathname.replace(/\/+$/g, '').toLowerCase();
              return `${host}${pathname}${parsed.search}`.trim();
            } catch (_) {
              return normalizeText(value);
            }
          };

          const validateCandidateUrl = async (sourceUrl: string, sourceLabel = '', discoveryMethod = 'textual_ai_url_selection') => {
            if (!sourceUrl || !isSafeMenuUrl(sourceUrl)) return false;
            const sourceKey = menuSourceUrlKey(sourceUrl);
            if (sourceKey && failedMenuSourceKeys.has(sourceKey)) {
              addLog(`Fonte ja reprovada nesta execucao; pulando nova tentativa: ${sourceUrl}.`);
              return false;
            }
            const previousLearnedSourceUrl = learnedSourceUrl;
            const previousLearnedSourceLabel = learnedSourceLabel;
            const rejectCandidate = () => {
              learnedSourceUrl = previousLearnedSourceUrl;
              learnedSourceLabel = previousLearnedSourceLabel;
              menuEvidence = null;
              return false;
            };
            const rejectAndRememberCandidate = () => {
              if (sourceKey) failedMenuSourceKeys.add(sourceKey);
              return rejectCandidate();
            };
            const rememberUnavailableBioSource = (evidence: any) => {
              if (!menuEvidenceLooksUnavailable(evidence)) return;
              deferredMenuBlocker = {
                error: 'Link da bio encontrado, mas a fonte do cardapio esta fora do ar/indisponivel (404).',
                blocker: 'bio_menu_source_unavailable',
                sourceUrl: learnedSourceUrl || sourceUrl,
                sourceLabel,
                discoveryMethod,
                visualAuditEvidence: evidence?.visualAuditEvidence || null,
              };
              addLog(`Fonte da bio indisponivel/404: ${learnedSourceUrl || sourceUrl}. Vou registrar evidencia visual e continuar com fontes alternativas.`);
            };
            learnedSourceUrl = sourceUrl;
            learnedSourceLabel = sourceLabel || `CardÃ¡pio ${baseCity || 'oficial'}`;
            const nativeResult = await sendExtensionAction('extractMenuPlatform', learnedSourceUrl, {}, 240000);
            if (hasCriticalMenuDetailMiss(nativeResult)) {
              addLog(`Fonte rejeitada para salvar: a coleta profunda detectou detalhes/adicionais incompletos (${nativeResult?.error || learnedSourceUrl}).`);
              return rejectAndRememberCandidate();
            }
            menuEvidence = nativeResult?.success ? nativeResult : await sendExtensionAction('auditMenuHybrid', learnedSourceUrl, {}, 240000);
            if (nativeResult?.requiresHuman || menuEvidence?.requiresHuman) {
              addLog(`Fonte exige intervenÃ§Ã£o/recoleta assistida: ${nativeResult?.error || menuEvidence?.error || learnedSourceUrl}.`);
              rememberUnavailableBioSource(nativeResult);
              rememberUnavailableBioSource(menuEvidence);
              return rejectAndRememberCandidate();
            }
            if (menuEvidence?.success) menuEvidence = await attachVisualMenuAudit(menuEvidence, learnedSourceUrl);
            effectiveRestaurant = await persistRestaurantContacts(
              restaurant.id,
              effectiveRestaurant,
              { sourceUrl: learnedSourceUrl, sourceLabel, nativeResult, menuEvidence },
              'menu_source_validation',
              learnedSourceUrl,
              sourceLabel || discoveryMethod
            );
            if (menuEvidence?.success) {
              const evidenceUrl = String(menuEvidence.finalUrl || menuEvidence.sourceUrl || learnedSourceUrl || '');
              if (evidenceUrl && !isSafeMenuUrl(evidenceUrl)) {
                addLog(`Fonte rejeitada: a navegaÃ§Ã£o terminou em URL insegura/irrelevante (${evidenceUrl}).`);
                return rejectAndRememberCandidate();
              }
              menuEvidence = { ...menuEvidence, sourceUrl: learnedSourceUrl, discoveryMethod };
              const confirmedItems = Array.isArray(menuEvidence.categories)
                ? menuEvidence.categories.reduce((total: number, category: any) => total + (category.items?.length || 0), 0)
                : Number(menuEvidence.metrics?.itemCandidates || 0);
              if (!confirmedItems || confirmedItems < 1) {
                rememberUnavailableBioSource(menuEvidence);
                addLog(`Fonte rejeitada: nenhum item real encontrado em ${learnedSourceUrl}.`);
                return rejectAndRememberCandidate();
              }
              const sourceMetrics = menuEvidence.metrics || {};
              const optionCount = Number(sourceMetrics.optionCount || 0);
              const imageCount = Number(sourceMetrics.imageCount || 0);
              const detailVerification = sourceMetrics.detailVerification || null;
              const detailWarning = detailVerification?.warning
                ? ` Auditoria de detalhes: ${detailVerification.warning}.`
                : '';
              const structuredSummary = optionCount || imageCount
                ? ` (${optionCount} opÃ§Ãµes/adicionais, ${imageCount} imagens).`
                : '.';
              addLog(`Fonte validada: ${confirmedItems} itens candidatos em ${learnedSourceUrl}${structuredSummary}${detailWarning}`);
              return true;
            }
            rememberUnavailableBioSource(nativeResult);
            rememberUnavailableBioSource(menuEvidence);
            return rejectAndRememberCandidate();
          };

          const normalizeCandidateUrl = (value: string) => {
            try {
              const parsed = new URL(value);
              if (parsed.hostname.toLowerCase() === 'l.instagram.com') {
                const target = parsed.searchParams.get('u');
                if (target) return decodeURIComponent(target);
              }
              return parsed.href;
            } catch (_) {
              return '';
            }
          };

          const isInstagramBioCandidate = (candidate: any) => {
            const origin = `${candidate?.source || ''} ${(candidate?.reasons || []).join(' ')} ${candidate?.sourceType || ''}`.toLowerCase();
            const priority = Number(candidate?.sourcePriority || 0);
            return priority >= 70 || /instagram_(bio|links_modal)|bio_|links_modal/.test(origin);
          };

          const runTextualMenuArbiter = async (candidates: any[], reason: string) => {
            effectiveRestaurant = await persistRestaurantContacts(
              restaurant.id,
              effectiveRestaurant,
              candidates,
              'menu_candidate_links',
              '',
              reason
            );
            const menuDomainScore = (value: string) => /saipos|livemenu|ola\.click|olaclick|anota|ifood|menudino|deliverymuch|deliverydireto|instadelivery|goomer|aiqfome|cardapio|menu/i.test(value) ? 35 : 0;
            const cityTokenHit = (candidate: any) => {
              if (!cityKey) return false;
              return normalizeKey(`${candidate.label || ''} ${candidate.url || ''}`).includes(cityKey);
            };
            const cleanCandidates = (Array.isArray(candidates) ? candidates : [])
              .map((candidate: any) => {
                const url = normalizeCandidateUrl(String(candidate.url || candidate.sourceUrl || ''));
                const label = String(candidate.label || candidate.sourceLabel || candidate.title || '');
                return {
                  url,
                  label,
                  kind: isBioBridgeUrl(url) ? 'link_hub' : 'direct_candidate',
                  score: Number(candidate.score || 0)
                    + Number(candidate.sourcePriority || 0)
                    + menuDomainScore(`${url} ${label}`)
                    + (isLikelyLinkHubUrl(url) ? 80 : (isBioBridgeUrl(url) ? 25 : 0))
                    + (candidate.legacy ? 80 : 0)
                    - (candidate.guessed ? 80 : 0)
                    + (cityTokenHit({ url, label }) ? 100 : 0),
                  reasons: candidate.reasons || [],
                  legacy: Boolean(candidate.legacy),
                  guessed: Boolean(candidate.guessed),
                  source: candidate.source || ''
                };
              })
              .filter((candidate: any) => /^https?:\/\//i.test(candidate.url) && isAllowedBioMenuUrl(candidate.url));
            const merged = [...cleanCandidates]
              .filter((candidate, index, list) => candidate.url && list.findIndex(other => other.url === candidate.url) === index)
              .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
              .map((candidate, index) => ({ ...candidate, index }));
            if (!merged.length) return false;
            const executePlannedCandidate = async (candidate: any, method: string) => {
              if (!candidate?.url) return false;
              if (candidate.kind === 'link_hub' || isBioBridgeUrl(candidate.url)) {
                addLog(`IA identificou pÃ¡gina agregadora de links (${candidate.url}). O robÃ´ abrirÃ¡ o hub e a IA escolherÃ¡ o botÃ£o interno correto.`);
                return await runGptNavigationDiscovery(candidate.url, `${method}: ${candidate.label || candidate.url}`);
              }
              return await validateCandidateUrl(candidate.url, candidate.label, method);
            };
            const strongCandidate = merged.find(candidate => cityTokenHit(candidate) && Number(candidate.score || 0) >= 100 && !candidate.guessed)
              || merged.find(candidate => cityTokenHit(candidate) && Number(candidate.score || 0) >= 160)
              || (merged.length === 1 && Number(merged[0].score || 0) >= 35 ? merged[0] : null);
            if (strongCandidate) {
              addLog(`Fonte candidata forte encontrada nos links do Instagram: ${strongCandidate.label || strongCandidate.url}.`);
              const ok = await executePlannedCandidate(strongCandidate, 'instagram_text_link_selection');
              if (ok) return true;
              addLog(`Fonte candidata forte nÃ£o passou na validaÃ§Ã£o: ${strongCandidate.url}.`);
            }
            addLog(`IA textual avaliando ${merged.length} candidato(s) de cardÃ¡pio: ${reason}.`);
            try {
              const response = await fetch('/api/local-collector/ai-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  systemContext: 'VocÃª Ã© o planejador do robÃ´ de coleta. Escolha a prÃ³xima fonte para achar o cardÃ¡pio correto. Se a URL for hub, encurtador ou ponte intermediÃ¡ria da bio, ela NÃƒO Ã© o cardÃ¡pio final: escolha action="open_link_hub" para o robÃ´ abrir e vocÃª decidir o botÃ£o interno da cidade/unidade correta. Se for cardÃ¡pio direto, use action="validate_direct". Responda SOMENTE JSON: {"selected_index":numero,"action":"validate_direct|open_link_hub","confidence":0_a_1,"reason":"curto"}. Nunca escolha redes sociais como destino final. Nunca escolha raiz genÃ©rica de plataforma, como cardapioweb.com/, livemenu.app/ ou pedido.anota.ai/ sem caminho da loja/menu. Prefira cidade/unidade correta e domÃ­nios de cardÃ¡pio/delivery.',
                  message: JSON.stringify({
                    restaurantName: baseName,
                    city: baseCity || '',
                    neighborhood: baseNeighborhood || '',
                    address: baseAddress || '',
                    instagramBio,
                    candidates: merged
                  })
                })
              });
              if (!response.ok) throw new Error('HTTP ' + response.status);
              const payload = await response.json();
              const json = String(payload.reply || '').match(/{[\s\S]*}/)?.[0] || '{}';
              const decision = JSON.parse(json);
              const selected = merged.find(candidate => candidate.index === Number(decision.selected_index));
              const confidence = Number(decision.confidence || 0);
              if (selected && confidence >= 0.5) {
                addLog(`IA textual planejou fonte: ${selected.label || selected.url} (${decision.action || selected.kind}, confianÃ§a ${Math.round(confidence * 100)}%). Motivo: ${decision.reason || 'sem motivo'}.`);
                const plannedSelected = { ...selected, kind: decision.action === 'open_link_hub' ? 'link_hub' : selected.kind };
                if (await executePlannedCandidate(plannedSelected, 'textual_ai_url_selection')) return true;
                const alternates = merged.filter(candidate => candidate.url !== selected.url).slice(0, 3);
                for (const alternate of alternates) {
                  addLog(`Tentando fonte alternativa apÃ³s falha da escolhida: ${alternate.label || alternate.url}.`);
                  if (await executePlannedCandidate(alternate, 'textual_ai_url_selection_alternate')) return true;
                }
              }
              addLog('IA textual nÃ£o teve confianÃ§a suficiente para escolher fonte.');
            } catch (error: any) {
              addLog(`IA textual falhou ao arbitrar fonte: ${error.message || error}.`);
            }
            return false;
          };

          async function runGptNavigationDiscovery(startUrl: string, sourceLabel: string) {
            if (!startUrl || !/^https?:\/\//i.test(startUrl)) return false;
            addLog(`GPT navegador tentando descobrir cardÃ¡pio a partir de ${sourceLabel}...`);
            try {
              const startHost = new URL(startUrl).hostname.toLowerCase();
              const navResult = await sendExtensionAction('navigateWithAI', startUrl, {
                goal: [
                  `Encontrar a URL pÃºblica de cardÃ¡pio/delivery do restaurante "${baseName}".`,
                  baseCity ? `A unidade/cidade correta Ã© ${baseCity}.` : '',
                  baseNeighborhood ? `Bairro/endereÃ§o de referÃªncia: ${baseNeighborhood}.` : '',
                  'Se houver vÃ¡rios links, escolha o cardÃ¡pio da unidade correta.',
                  'NÃ£o aceite a home/raiz genÃ©rica de plataformas como cardapioweb.com, livemenu.app ou pedido.anota.ai; a URL precisa apontar para loja/menu/unidade.',
                  'Se encontrar login, captcha ou bloqueio, peÃ§a intervenÃ§Ã£o humana.',
                  'NÃ£o clique em compra, pedido, pagamento, checkout ou aÃ§Ãµes destrutivas.'
                ].filter(Boolean).join(' '),
                context: {
                  restaurantName: baseName,
                  city: baseCity || '',
                  neighborhood: baseNeighborhood || '',
                  address: baseAddress || '',
                  expectedExternalDestination: true,
                  ignoredDestinationHosts: [startHost]
                },
                maxSteps: 7
              }, 150000);
              effectiveRestaurant = await persistRestaurantContacts(
                restaurant.id,
                effectiveRestaurant,
                navResult,
                'gpt_navigation',
                startUrl,
                sourceLabel
              );

              if (navResult?.requiresHuman) {
                deferredMenuBlocker = navResult;
                addLog(`GPT navegador nao conseguiu concluir agora (${navResult.error || navResult.blocker || 'sem motivo informado'}); vou tentar as outras fontes permitidas antes de pedir intervencao.`);
                return false;
              }

              const finalUrl = String(navResult?.finalUrl || '');
              if (!navResult?.success || !finalUrl || !isSafeMenuUrl(finalUrl)) {
                addLog(`GPT navegador nÃ£o confirmou uma URL segura de cardÃ¡pio: ${navResult?.error || finalUrl || 'sem resultado'}.`);
                return false;
              }

              addLog(`GPT navegador encontrou possÃ­vel fonte: ${finalUrl}. Validando com adaptador/auditoria...`);
              const ok = await validateCandidateUrl(finalUrl, `GPT navegador: ${sourceLabel}`, 'gpt_navigation_discovery');
              if (ok) return true;

              addLog(`Fonte encontrada pelo GPT navegador nÃ£o passou na validaÃ§Ã£o de cardÃ¡pio: ${finalUrl}.`);
              return false;
            } catch (error: any) {
              addLog(`GPT navegador falhou em ${sourceLabel}: ${error.message || error}.`);
              return false;
            }
          }

          const googlePhotoIsRecentEnough = (dateText: string) => {
            const normalized = String(dateText || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
            if (!normalized) return false;
            if (/\b(hoje|today|ontem|yesterday)\b/.test(normalized)) return true;
            const relativeMatch = normalized.match(/\b(\d+)\s*(dia|dias|day|days|semana|semanas|week|weeks|mes|meses|month|months|ano|anos|year|years)\b/);
            if (relativeMatch) {
              const amount = Number(relativeMatch[1]);
              const unit = relativeMatch[2];
              if (/^(dia|dias|day|days|semana|semanas|week|weeks)$/.test(unit)) return amount >= 0;
              if (/^(mes|meses|month|months)$/.test(unit)) return amount <= 12;
              if (/^(ano|anos|year|years)$/.test(unit)) return amount <= 1;
            }
            if (/\b(um|uma|one|a)\s+(ano|year)\b/.test(normalized)) return true;
            const absoluteMatch = normalized.match(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](20\d{2})\b/);
            if (absoluteMatch) {
              const day = Number(absoluteMatch[1]);
              const month = Number(absoluteMatch[2]) - 1;
              const year = Number(absoluteMatch[3]);
              const postedAt = new Date(year, month, day);
              if (!Number.isNaN(postedAt.getTime())) {
                const ageDays = (Date.now() - postedAt.getTime()) / (1000 * 60 * 60 * 24);
                return ageDays >= 0 && ageDays <= 366;
              }
            }
            return /\b(last month|mes passado|semana passada|last week)\b/.test(normalized);
          };

          const runMenuImageExtraction = async (images: any[], source: string, discoveryMethod: string) => {
            const cleanImages = (images || [])
              .map((item: any) => typeof item === 'string' ? item : item?.image || item?.url)
              .filter((value: string, index: number, list: string[]) => /^data:image\/|^https?:\/\//i.test(value || '') && list.indexOf(value) === index)
              .slice(0, 10);
            if (!cleanImages.length) return false;

            addLog(`IA Vision analisando ${cleanImages.length} imagem(ns) candidata(s) de cardÃ¡pio (${source}).`);
            try {
              const response = await fetch('/api/local-collector/extract-menu-from-images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  images: cleanImages,
                  source,
                  sourceUrl: /^instagram_/i.test(source) ? activeInstagramUrl : mapUrl,
                  discoveryMethod
                })
              });
              const data = await response.json().catch(() => ({}));
              if (!response.ok || !data?.success || !data?.menuEvidence) {
                addLog(`IA Vision nÃ£o confirmou cardÃ¡pio em imagens (${source}): ${data?.error || `HTTP ${response.status}`}`);
                return false;
              }
              menuEvidence = data.menuEvidence;
              addLog(`CardÃ¡pio encontrado por imagem (${source}); enviando para OCR/estruturaÃ§Ã£o.`);
              return true;
            } catch (error: any) {
              addLog(`Falha ao analisar imagens de cardÃ¡pio (${source}): ${error.message || error}.`);
              return false;
            }
          };

          let menuEvidence: any = null;
          let learnedSourceUrl = '';
          let learnedSourceLabel = '';
          let requiresHuman: any = null;
          let deferredMenuBlocker: any = null;

          const instagramBioMenuCandidates = instagramMenuCandidates.filter((candidate: any) => isInstagramBioCandidate(candidate));
          if (instagramMenuCandidates.length > instagramBioMenuCandidates.length) {
            addLog(`Descartados ${instagramMenuCandidates.length - instagramBioMenuCandidates.length} link(s) do Instagram que nao vieram da bio/modal oficial.`);
          }
          const instagramDirectMenuCandidates = instagramBioMenuCandidates.filter((candidate: any) => {
            const candidateUrl = normalizeCandidateUrl(String(candidate?.url || candidate?.sourceUrl || ''));
            return candidateUrl && isDirectBioMenuUrl(candidateUrl);
          });
          const instagramLinkHubCandidates = instagramBioMenuCandidates.filter((candidate: any) => {
            const candidateUrl = normalizeCandidateUrl(String(candidate?.url || candidate?.sourceUrl || ''));
            return candidateUrl && isBioBridgeUrl(candidateUrl);
          });

          if (!menuEvidence?.success && activeInstagramUrl && instagramLinkHubCandidates.length > 0) {
            addLog(`Link hub detectado na bio (${instagramLinkHubCandidates[0]?.label || instagramLinkHubCandidates[0]?.url || 'sem rotulo'}). Vou abrir o hub pela rotina nativa e escolher a unidade/cidade correta antes de qualquer fallback.`);
          }


          if (!menuEvidence?.success && activeInstagramUrl && instagramMenuCandidates.length === 0) {
            addLog('Modo seguro anti-abas ativo: descoberta por clique/navegaÃ§Ã£o livre foi bloqueada para evitar abrir mÃºltiplas abas.');
          }

          // Prioridade: descoberta nativa da bio por cidade/domÃ¯Â¿Â½nio. Nao usar Google/site oficial para cardapio.
          if (!menuEvidence?.success && activeInstagramUrl && !requiresHuman) {
            addLog(`Descobrindo na bio o cardÃ¡pio correspondente a ${baseCity || 'cidade cadastrada'}...`);
            const discoveryResult = await sendExtensionAction('scrapeMenuFromInstagram', activeInstagramUrl, {
              instagramUrl: activeInstagramUrl,
              restaurantName: baseName,
              city: baseCity || '',
              neighborhood: baseNeighborhood || '',
              restaurantId: restaurant.id
            }, 180000);

            if (discoveryResult?.success && (discoveryResult.parsedMenu || discoveryResult.rawText)) {
              learnedSourceUrl = discoveryResult.sourceUrl || '';
              learnedSourceLabel = discoveryResult.sourceLabel || '';
              effectiveRestaurant = await persistRestaurantContacts(
                restaurant.id,
                effectiveRestaurant,
                discoveryResult,
                'instagram_bio_menu_discovery',
                learnedSourceUrl || activeInstagramUrl,
                learnedSourceLabel || 'descoberta nativa da bio'
              );
              if (!isSafeMenuUrl(learnedSourceUrl)) {
                throw new Error(`A fonte descoberta nÃ£o Ã© um destino seguro de cardÃ¡pio: ${learnedSourceUrl || 'URL ausente'}`);
              }
              addLog(`CardÃ¡pio de ${baseCity || 'cidade'} selecionado na bio: ${learnedSourceLabel || learnedSourceUrl}`);
              if (!instagramFeedGalleryAllowed && instagramFeedMenuImageCandidates.length > 0) {
                instagramFeedGalleryAllowed = true;
                instagramFeedGalleryBlockReason = '';
                await saveInstagramFeedGalleryAfterUnitMatch(`bio/hub selecionou ${learnedSourceLabel || learnedSourceUrl}`);
              }
              const nativeResult = await sendExtensionAction('extractMenuPlatform', learnedSourceUrl, {}, 240000);
              if (hasCriticalMenuDetailMiss(nativeResult)) {
                await persistMenuStatus(
                  restaurant,
                  'needs_recollection',
                  `Coleta profunda detectou detalhes/adicionais incompletos na fonte ${learnedSourceUrl}. Validar IA deve abrir item por item antes de salvar.`,
                  { nativeResult, learnedSourceUrl, learnedSourceLabel }
                );
                throw new Error(`CardÃ¡pio encontrado, mas a coleta item-a-item estÃ¡ incompleta: ${nativeResult?.error || learnedSourceUrl}`);
              }
              if (nativeResult?.success && Array.isArray(nativeResult.categories) && nativeResult.categories.length > 0) {
                menuEvidence = { ...nativeResult, sourceUrl: learnedSourceUrl, discoveryMethod: discoveryResult.discoveryMethod || 'instagram_bio_city_match' };
                const nativeItems = nativeResult.categories.reduce((total: number, category: any) => total + (category.items?.length || 0), 0);
                addLog(`Adaptador nativo ${nativeResult.platform} confirmou ${nativeItems} itens.`);
                menuEvidence = await attachVisualMenuAudit(menuEvidence, learnedSourceUrl);
              } else {
                const parsedCategories = Array.isArray(discoveryResult.parsedMenu) ? discoveryResult.parsedMenu : [];
                const parsedItemCount = parsedCategories.reduce((total: number, category: any) => total + (Array.isArray(category?.items) ? category.items.length : 0), 0);
                const rawText = String(discoveryResult.rawText || '').trim();
                if (parsedCategories.length > 0 && parsedItemCount > 0) {
                  menuEvidence = {
                    success: true,
                    platform: 'instagram_bio_structured',
                    categories: parsedCategories,
                    rawText,
                    sourceUrl: learnedSourceUrl,
                    discoveryMethod: discoveryResult.discoveryMethod || 'instagram_bio_city_match'
                  };
                  menuEvidence = await attachVisualMenuAudit(menuEvidence, learnedSourceUrl);
                } else {
                  deferredMenuBlocker = {
                    error: nativeResult?.error || 'Link da bio encontrado, mas ainda sem itens de cardapio estruturados.',
                    blocker: 'empty_menu_evidence_from_bio_link',
                    sourceUrl: learnedSourceUrl
                  };
                  addLog(`Link da bio encontrado (${learnedSourceUrl}), mas o adaptador nao retornou itens estruturados; vou continuar com destaques/feed/fotos antes de pedir intervencao.`);
                }
              }
            } else if (discoveryResult?.requiresHuman) {
              if (discoveryResult.blocker === 'instagram_links_unavailable' && instagramBioMenuCandidates.length > 0) {
                addLog(`Descoberta nativa nao conseguiu reler os links na pagina, mas ${instagramBioMenuCandidates.length} link(s) oficial(is) da bio ja estavam preservados pela validacao do Instagram. Vou usar esses links da bio antes de pedir intervencao.`);
                const ok = await runTextualMenuArbiter(instagramBioMenuCandidates, 'links oficiais da bio preservados da validacao do Instagram');
                if (!ok) {
                  deferredMenuBlocker = discoveryResult;
                  addLog(`Links oficiais preservados da bio ainda nao confirmaram cardapio automaticamente (${discoveryResult.error || discoveryResult.blocker || 'sem motivo informado'}); vou tentar destaques/feed/fotos antes de pedir intervencao.`);
                }
              } else {
                deferredMenuBlocker = discoveryResult;
                addLog(`Descoberta nativa nao concluiu agora (${discoveryResult.error || discoveryResult.blocker || 'sem motivo informado'}); vou tentar destaques/feed/fotos permitidas antes de pedir intervencao.`);
              }
            } else if (!discoveryResult?.success) {
              addLog(`Descoberta nativa nÃ£o encontrou cardÃ¡pio: ${discoveryResult?.error || 'sem motivo informado'}.`);
            }
          }

          if (!menuEvidence?.success && activeInstagramUrl && !requiresHuman && instagramDirectMenuCandidates.length > 0) {
            addLog('Bio/hub nao confirmou cardapio; validando somente links diretos comprovados da bio/modal do Instagram.');
            for (const directCandidate of instagramDirectMenuCandidates.slice(0, 3)) {
              const directUrl = normalizeCandidateUrl(String(directCandidate?.url || directCandidate?.sourceUrl || ''));
              const directLabel = String(directCandidate?.label || directCandidate?.sourceLabel || directUrl);
              if (await validateCandidateUrl(directUrl, directLabel, 'instagram_bio_direct_link')) break;
            }
          }
          if (!menuEvidence?.success && activeInstagramUrl && !requiresHuman) {
            addLog('Descoberta nativa completa nÃ£o confirmou o cardÃ¡pio; tentando descoberta rÃ¡pida de links da bio...');
            const linkDiscovery = await sendExtensionAction('discoverInstagramMenuLinks', activeInstagramUrl, {
              instagramUrl: activeInstagramUrl,
              restaurantName: baseName,
              city: baseCity || '',
              neighborhood: baseNeighborhood || '',
              restaurantId: restaurant.id
            }, 45000);

            if (linkDiscovery?.success && isAllowedBioMenuUrl(linkDiscovery.sourceUrl)) {
              const fastLabel = linkDiscovery.sourceLabel || `Cardapio ${baseCity || 'oficial'}`;
              addLog(`Descoberta rapida selecionou fonte da bio: ${fastLabel || linkDiscovery.sourceUrl} (confianca ${Math.round(Number(linkDiscovery.confidence || 0) * 100)}%).`);
              const fastOk = await validateCandidateUrl(linkDiscovery.sourceUrl, fastLabel, 'instagram_bio_fast_link_discovery');
              if (!fastOk) addLog(`Fonte rapida rejeitada apos validacao: ${linkDiscovery.sourceUrl} .`);
            } else {
              addLog(`Descoberta rapida nao confirmou fonte segura da bio: ${linkDiscovery?.error || 'sem motivo informado'}. Links de baixa confianca nao serao usados automaticamente.`);
            }
          }

          if (!menuEvidence?.success) {
            addLog('Links da bio nao confirmaram cardapio completo; tentando imagens permitidas antes de enviar para revisao.');
          }

          if (!menuEvidence?.success && instagramHighlightMenuImageCandidates.length > 0 && !requiresHuman) {
              addLog('Nenhum link de cardapio confirmado; tentando imagens de destaques/galeria do Instagram.');
              await runMenuImageExtraction(instagramHighlightMenuImageCandidates, 'instagram_highlight_menu_image', 'instagram_highlights_gallery_menu_image');
          }

            if (!menuEvidence?.success && instagramFeedMenuImageCandidates.length > 0 && !requiresHuman) {
              addLog('Destaques/galeria nao confirmaram cardapio; tentando imagens do feed do Instagram.');
              await runMenuImageExtraction(instagramFeedMenuImageCandidates, 'instagram_feed_menu_image', 'instagram_feed_menu_image');
            }

            if (!menuEvidence?.success && googleMenuImageCandidates.length > 0 && !requiresHuman) {
              const recentGoogleImages = googleMenuImageCandidates
                .filter((item: any) => googlePhotoIsRecentEnough(item.dateText || item.date || item.age || ''))
                .map((item: any) => item.image || item.url)
                .filter(Boolean);

              if (recentGoogleImages.length > 0) {
                addLog(`Tentando cardapio em ${recentGoogleImages.length} foto(s) recente(s) do Google Maps (ate 1 ano).`);
                await runMenuImageExtraction(recentGoogleImages, 'google_recent_menu_image', 'google_recent_user_photo_menu_image');
              } else {
                addLog('Fotos do Google Maps ignoradas para cardapio: nenhuma tinha data comprovada de ate 1 ano.');
              }
            }

            if (!menuEvidence?.success) {
              addLog('Fontes permitidas nao confirmaram cardapio; busca em Google/site oficial e candidatos externos foram bloqueados pela regra do app.');
            }

          if (!menuEvidence?.success && !requiresHuman) {
            const savedMenuSourceUrl = normalizeCandidateUrl(String(
              effectiveRestaurant?.other_url
              || restaurant?.other_url
              || (effectiveRestaurant as any)?.menuSourceUrl
              || (restaurant as any)?.menuSourceUrl
              || ''
            ));

            if (savedMenuSourceUrl && isDirectBioMenuUrl(savedMenuSourceUrl)) {
              addLog(`Fonte de cardapio ja salva detectada (${savedMenuSourceUrl}). Vou reconciliar a fonte antes de preservar cardapio existente.`);
              const reconciled = await validateCandidateUrl(
                savedMenuSourceUrl,
                String(effectiveRestaurant?.other_url_label || restaurant?.other_url_label || 'Cardapio salvo anteriormente'),
                'saved_menu_source_reconciliation'
              );
              if (!reconciled) {
                addLog('Fonte salva anteriormente nao passou na reconciliacao agora; so entao vou avaliar se existe cardapio estruturado no banco para preservar.');
              }
            }
          }

          let existingStructuredMenuSnapshot: any = null;
          if (!menuEvidence?.success) {
            try {
              const snapshot = await getMenuQualitySnapshot(restaurant.id);
              const categoryCount = Array.isArray(snapshot?.categories) ? snapshot.categories.length : 0;
              const itemCount = Number(snapshot?.itemCount || 0);
              const junkItemCount = Number(snapshot?.junkItemCount || 0);
              if (categoryCount > 0 && itemCount > 0 && junkItemCount < itemCount) {
                existingStructuredMenuSnapshot = snapshot;
                addLog(`Cardapio estruturado existente encontrado no banco: ${itemCount} item(ns) em ${categoryCount} categoria(s). Vou preserva-lo e seguir para a etapa final de fotos.`);
              }
            } catch (snapshotError: any) {
              addLog(`Nao consegui verificar cardapio estruturado existente antes da etapa final: ${snapshotError.message || snapshotError}`);
            }
          }

          if (!menuEvidence?.success && activeInstagramUrl && !requiresHuman && !existingStructuredMenuSnapshot) {
            requiresHuman = {
              error: deferredMenuBlocker?.error || deferredMenuBlocker?.blocker || 'Cardapio nao confirmado pelas fontes permitidas: bio do Instagram, imagens do Instagram ou fotos recentes do Google Maps.',
              blocker: 'allowed_menu_sources_exhausted',
              sourceBlocker: deferredMenuBlocker?.blocker || '',
              sourceUrl: deferredMenuBlocker?.sourceUrl || '',
              sourceLabel: deferredMenuBlocker?.sourceLabel || '',
              visualAuditEvidence: deferredMenuBlocker?.visualAuditEvidence || null,
            };
          }

          if (!menuEvidence?.success) {
            if (existingStructuredMenuSnapshot) {
              await ensureMinimumGalleryForReadyMenu(existingStructuredMenuSnapshot.categories || [], 'cardapio estruturado existente');

              const categoryCount = Array.isArray(existingStructuredMenuSnapshot.categories) ? existingStructuredMenuSnapshot.categories.length : 0;
              const itemCount = Number(existingStructuredMenuSnapshot.itemCount || 0);
              const publicationWarnings = collectPublicationWarnings(effectiveRestaurant);
              const preservedMenuPayload = {
                sourceUrl: learnedSourceUrl || '',
                discoveryMethod: 'existing_structured_menu_preserved',
                platform: '',
                existingStructuredMenu: {
                  categoryCount,
                  itemCount,
                  pricedItemCount: Number(existingStructuredMenuSnapshot.pricedItemCount || 0),
                  priceCoverage: Number(existingStructuredMenuSnapshot.priceCoverage || 0),
                  junkItemCount: Number(existingStructuredMenuSnapshot.junkItemCount || 0),
                  galleryImageCount: savedGalleryUrls.size,
                  minGalleryImageCount: MIN_PUBLIC_GALLERY_IMAGES,
                  googleSearchGalleryCandidateCount: googleSearchGalleryImageCandidates.length,
                  googleMapsGalleryCandidateCount: googleMapsGalleryImageCandidates.length,
                },
                publicationWarnings,
              };

              if (savedGalleryUrls.size < MIN_PUBLIC_GALLERY_IMAGES) {
                await persistMenuStatus(
                  restaurant,
                  'manual_required',
                  `Cardapio estruturado existente preservado (${itemCount} itens), mas a galeria ficou com ${savedGalleryUrls.size}/${MIN_PUBLIC_GALLERY_IMAGES} fotos publicaveis. Intervencao humana necessaria para completar a galeria.`,
                  preservedMenuPayload
                );
                finalMenuStatus = 'manual_required';
                addLog(`Cardapio existente preservado (${itemCount} item(ns)), mas galeria ficou ${savedGalleryUrls.size}/${MIN_PUBLIC_GALLERY_IMAGES}; restaurante segue em revisao ate completar a galeria minima.`);
                toast.warning('Cardapio existente preservado, mas a galeria ficou abaixo do minimo.');
              } else {
                await persistMenuStatus(
                  restaurant,
                  'found',
                  `Cardapio estruturado existente preservado com ${itemCount} itens; Validar IA completou a galeria automaticamente.`,
                  preservedMenuPayload
                );
                finalMenuStatus = 'found';
                if (publicationWarnings.length) {
                  addLog(`Avisos nao bloqueantes para publicacao: ${publicationWarnings.join(' | ')}`);
                  toast.warning(`Pronto com aviso: ${publicationWarnings.join(' | ')}`);
                } else {
                  toast.success('Cardapio existente preservado e galeria completada.');
                }
              }
            } else if (requiresHuman?.blocker === 'allowed_menu_sources_exhausted') {
              const exhaustedReason = requiresHuman?.sourceBlocker === 'bio_menu_source_unavailable'
                ? `Link da bio encontrado, mas a fonte do cardapio esta fora do ar/indisponivel (404): ${requiresHuman.sourceUrl || 'URL nao registrada'}.`
                : 'Nenhuma fonte confiavel de cardapio foi encontrada nas fontes permitidas: bio do Instagram, imagens do Instagram e fotos recentes do Google Maps.';
              await persistMenuStatus(restaurant, 'not_found', exhaustedReason, { requiresHuman });
              finalMenuStatus = 'not_found';
              addLog(exhaustedReason);
              toast.warning('Restaurante validado, mas sem cardapio online confiavel.');
            } else if (requiresHuman) {
              await persistMenuStatus(restaurant, 'manual_required', `Intervencao necessaria: ${requiresHuman.error || requiresHuman.blocker || 'bloqueio/login/captcha'}`, { requiresHuman });
              finalMenuStatus = 'manual_required';
              addLog(`Cardapio nao coletado automaticamente: intervencao humana necessaria (${requiresHuman.error || requiresHuman.blocker || 'bloqueio'}).`);
              toast.warning('Restaurante validado, mas o cardapio exige intervencao humana.');
            } else {
              await persistMenuStatus(restaurant, 'not_found', 'Nenhuma fonte confiavel de cardapio foi encontrada nas fontes permitidas: bio do Instagram, imagens do Instagram e fotos recentes do Google Maps.');
              finalMenuStatus = 'not_found';
              addLog('Restaurante validado, mas nenhum cardapio online confiavel foi encontrado.');
              toast.warning('Restaurante validado, mas sem cardapio online confiavel.');
            }
          }
          if (false && !menuEvidence?.success) {
            if (requiresHuman) {
              throw new Error(`IntervenÃ§Ã£o necessÃ¡ria: ${requiresHuman.error} ApÃ³s o login, execute Validar IA novamente; a aba foi mantida aberta.`);
            }
            throw new Error('Nenhuma fonte confiÃ¡vel de cardÃ¡pio foi encontrada para a cidade correta.');
          }

          if (menuEvidence?.success) {
            const previewResponse = await fetch('/api/local-collector/extract-menu', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ restaurantId: restaurant.id, menuEvidence, dryRun: true })
            });
            const previewResult = await previewResponse.json().catch(() => ({}));
            if (!previewResponse.ok || !previewResult.success) {
              const sourceUnavailableFromBio = deferredMenuBlocker?.blocker === 'bio_menu_source_unavailable';
              const evidenceSource = String(menuEvidence?.discoveryMethod || menuEvidence?.platform || '').toLowerCase();
              const previewFailureText = normalizeText([
                previewResult?.message,
                previewResult?.error,
                previewResult?.reason,
              ].filter(Boolean).join(' '));
              const imageEvidenceDidNotYieldMenu = /instagram_(highlight|feed).*menu_image|google_recent.*menu_image/.test(evidenceSource)
                && /sem categorias|sem itens|sem categorias itens|no categories|no items|menuevidence recebido|categorias itens suficientes|insuficientes/.test(previewFailureText);
              const sourcesExhaustedWithoutPublishableMenu = sourceUnavailableFromBio || imageEvidenceDidNotYieldMenu;
              const blockedStatus = sourcesExhaustedWithoutPublishableMenu
                ? 'not_found'
                : (previewResult?.requiresHuman ? 'manual_required' : 'needs_recollection');
              const blockedReason = sourceUnavailableFromBio
                ? `Link da bio encontrado, mas a fonte do cardapio esta fora do ar/indisponivel (404): ${deferredMenuBlocker.sourceUrl || 'URL nao registrada'}.`
                : imageEvidenceDidNotYieldMenu
                  ? 'Fontes permitidas verificadas, mas nenhuma confirmou cardapio publicavel: bio do Instagram, destaques/feed do Instagram e fotos recentes do Google Maps.'
                : (previewResult.message || previewResult.error || 'A previa do cardapio nao atingiu qualidade para salvar.');
              await persistMenuStatus(
                restaurant,
                blockedStatus,
                blockedReason,
                {
                  sourceUrl: sourceUnavailableFromBio ? (deferredMenuBlocker.sourceUrl || menuEvidence?.sourceUrl || learnedSourceUrl || '') : (menuEvidence?.sourceUrl || learnedSourceUrl || ''),
                  discoveryMethod: menuEvidence?.discoveryMethod || '',
                  platform: menuEvidence?.platform || '',
                  menuEvidence,
                  previewResult,
                  failedBioMenuSource: sourceUnavailableFromBio ? deferredMenuBlocker : null,
                  allowedSourcesExhaustedWithoutMenu: sourcesExhaustedWithoutPublishableMenu,
                }
              );
              finalMenuStatus = blockedStatus;
              addLog(`Previa do cardapio bloqueada antes de salvar: ${blockedReason}`);
            } else {
              addLog(`PrÃ©via estruturada sem salvar: ${previewResult.message || `${previewResult.audit?.itemCount || 0} itens candidatos`}.`);
              addLog('PÃ³s-auditoria IA obrigatÃ³ria: revisando endereÃ§o, cardÃ¡pio e dados antes de liberar para o app.');

              try {
                const finalAudit = await runReadyForAppAudit(restaurant, {
                  menuResult: previewResult,
                  menuEvidence,
                  learnedSourceUrl,
                  effectiveRestaurant,
                  applyMenu: false,
                });

                if (!finalAudit.ready) {
                  const blockedStatus = finalAudit.needsRecollection ? 'needs_recollection' : 'manual_required';
                  await persistMenuStatus(
                    restaurant,
                    blockedStatus,
                    `PÃ³s-auditoria IA bloqueou publicaÃ§Ã£o: ${finalAudit.reason}`,
                    {
                      sourceUrl: menuEvidence?.sourceUrl || learnedSourceUrl || '',
                      discoveryMethod: menuEvidence?.discoveryMethod || '',
                      platform: menuEvidence?.platform || '',
                      extractorAudit: previewResult.audit || null,
                      finalAudit,
                    }
                  );
                  finalMenuStatus = blockedStatus;
                  addLog(`PÃ³s-auditoria IA bloqueou pronto p/ app antes de salvar menu: ${finalAudit.reason}`);
                } else {
                  const aiNormalizedMenu = finalAudit.audit?.normalizedMenu || [];
                  const appliedMenu = await replaceRestaurantMenuFromAudit(restaurant.id, aiNormalizedMenu);
                  const appliedItemCount = appliedMenu.reduce((total: number, category: any) => total + (category.items?.length || 0), 0);
                  if (!appliedItemCount) {
                    await persistMenuStatus(restaurant, 'failed', 'IA aprovou, mas nÃ£o retornou cardÃ¡pio normalizado salvÃ¡vel.', {
                      sourceUrl: menuEvidence?.sourceUrl || learnedSourceUrl || '',
                      discoveryMethod: menuEvidence?.discoveryMethod || '',
                      platform: menuEvidence?.platform || '',
                      extractorAudit: previewResult.audit || null,
                      finalAudit,
                    });
                    throw new Error('IA aprovou, mas nÃ£o retornou cardÃ¡pio normalizado salvÃ¡vel.');
                  }

                  await ensureMinimumGalleryForReadyMenu(appliedMenu, 'cardapio oficial aprovado pela IA');

                  const publicationWarnings = collectPublicationWarnings({
                    ...effectiveRestaurant,
                    ...(finalAudit.audit?.restaurantUpdate || {}),
                  });
                  if (publicationWarnings.length) {
                    addLog(`Avisos nao bloqueantes para publicacao: ${publicationWarnings.join(' | ')}`);
                    toast.warning(`Pronto com aviso: ${publicationWarnings.join(' | ')}`);
                  }

                  const appliedMenuPayload = {
                    sourceUrl: menuEvidence?.sourceUrl || learnedSourceUrl || '',
                    discoveryMethod: menuEvidence?.discoveryMethod || '',
                    platform: menuEvidence?.platform || '',
                    previewAudit: previewResult.audit || null,
                    extractorAudit: previewResult.audit || null,
                    finalAudit,
                    publicationWarnings,
                    aiAppliedMenu: {
                      categoryCount: appliedMenu.length,
                      itemCount: appliedItemCount,
                      galleryImageCount: savedGalleryUrls.size,
                      minGalleryImageCount: MIN_PUBLIC_GALLERY_IMAGES,
                      googleSearchGalleryCandidateCount: googleSearchGalleryImageCandidates.length,
                      googleMapsGalleryCandidateCount: googleMapsGalleryImageCandidates.length,
                    },
                  };

                  if (savedGalleryUrls.size < MIN_PUBLIC_GALLERY_IMAGES) {
                    await persistMenuStatus(
                      restaurant,
                      'manual_required',
                      `Cardapio coletado com ${appliedItemCount} itens, mas a galeria ficou com ${savedGalleryUrls.size}/${MIN_PUBLIC_GALLERY_IMAGES} fotos publicaveis. Intervencao humana necessaria para completar a galeria.`,
                      appliedMenuPayload
                    );
                    finalMenuStatus = 'manual_required';
                    addLog(`Cardapio persistido (${appliedItemCount} item(ns)), mas galeria ficou ${savedGalleryUrls.size}/${MIN_PUBLIC_GALLERY_IMAGES}; restaurante segue em revisao ate completar a galeria minima.`);
                    toast.warning('Cardapio salvo, mas galeria ficou abaixo do minimo.');
                  } else {
                    await persistMenuStatus(
                      restaurant,
                      'found',
                      finalAudit.reason || `CardÃ¡pio normalizado pela IA com ${appliedItemCount} itens.`,
                      appliedMenuPayload
                    );
                    finalMenuStatus = 'found';
                    toast.success('âœ… CardÃ¡pio extraÃ­do com sucesso!');
                  }
                  addLog(`CardÃ¡pio persistido pela curadoria IA: ${appliedItemCount} item(ns) em ${appliedMenu.length} categoria(s), preservando combos/opÃ§Ãµes quando informados.`);
                }
              } catch (finalAuditError: any) {
                await persistMenuStatus(
                  restaurant,
                  'manual_required',
                  `PÃ³s-auditoria IA falhou; revisÃ£o humana obrigatÃ³ria: ${finalAuditError.message || finalAuditError}`,
                  {
                    sourceUrl: menuEvidence?.sourceUrl || learnedSourceUrl || '',
                    discoveryMethod: menuEvidence?.discoveryMethod || '',
                    platform: menuEvidence?.platform || '',
                    extractorAudit: previewResult.audit || null,
                  }
                );
                finalMenuStatus = 'manual_required';
                addLog(`PÃ³s-auditoria IA falhou; nÃ£o vou liberar para o app: ${finalAuditError.message || finalAuditError}`);
              }
            }
          }

            const evidenceSourceUrl = String(menuEvidence?.sourceUrl || menuEvidence?.finalUrl || '');
            const persistableSourceUrl = toPersistableMenuUrl(
              menuEvidence?.publicSourceUrl,
              menuEvidence?.canonicalSourceUrl,
              menuEvidence?.finalUrl,
              learnedSourceUrl,
              evidenceSourceUrl,
            );
            const canPersistLearnedSource = Boolean(
              persistableSourceUrl
              && menuEvidence?.success
            );
            if (canPersistLearnedSource) {
              const publicSourceLabel = `CardÃ¡pio ${baseCity || 'oficial'}`.trim();
              await supabase.from('restaurants').update({
                other_url: persistableSourceUrl,
                other_url_label: publicSourceLabel || learnedSourceLabel || 'CardÃ¡pio oficial'
              }).eq('id', restaurant.id);
              addLog(`Fonte aprendida e salva para as prÃ³ximas execuÃ§Ãµes: ${persistableSourceUrl}`);
            } else if (learnedSourceUrl && !canPersistLearnedSource) {
              addLog(`Fonte candidata nÃ£o foi salva como aprendizado porque nÃ£o virou link pÃºblico reutilizÃ¡vel: ${learnedSourceUrl}`);
            }
        } catch (menuErr: any) {
          toast.error(`Erro ao extrair cardÃ¡pio: ${menuErr.message}`);
          addLog(`Erro ao extrair cardÃ¡pio: ${menuErr.message}`);
          throw menuErr;
        }
      } else {
        throw new Error('ExtensÃ£o inativa. Informe o ID e confirme o status ExtensÃ£o Ativa antes de validar.');
      }

      await ensureRestaurantCoverFromSavedGallery(restaurant.id, 'galeria aprovada antes da conclusao');

      if (finalMenuStatus === 'found') {
        toast.success(`${effectiveRestaurant.name || initialName} pronto para app: cardÃ¡pio estruturado.`, { id: toastId });
        addLog(`ValidaÃ§Ã£o de ${effectiveRestaurant.name || initialName} concluÃ­da: pronto para app.`);
      } else if (finalMenuStatus === 'not_found' || finalMenuStatus === 'manual_required' || finalMenuStatus === 'needs_recollection') {
        toast.warning(`${effectiveRestaurant.name || initialName} processado, mas ainda nÃ£o publicÃ¡vel no app.`, { id: toastId });
        addLog(`ValidaÃ§Ã£o de ${effectiveRestaurant.name || initialName} concluÃ­da sem cardÃ¡pio publicÃ¡vel (${finalMenuStatus}).`);
      } else {
        toast.success(`${effectiveRestaurant.name || initialName} validado com sucesso!`, { id: toastId });
        addLog(`ValidaÃ§Ã£o de ${effectiveRestaurant.name || initialName} concluÃ­da com sucesso.`);
      }
      fetchRestaurants();
    } catch (err: any) {
      toast.error('Erro na validaÃ§Ã£o: ' + err.message);
      addLog(`ValidaÃ§Ã£o falhou para ${initialName}: ${err.message || err}`);
      await persistValidationFailure(restaurant, err);
    } finally {
      setValidatingId(null);
    }
  };

  const openRestaurantEditorById = async (restaurantId: string) => {
    if (!restaurantId) return { success: false, error: 'restaurantId ausente' };
    const existing = restaurants.find(r => r.id === restaurantId);
    if (existing) {
      setSelectedRestaurant(existing);
      setIsDialogOpen(true);
      return { success: true, restaurant: { id: existing.id, name: existing.name || '' } };
    }
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .single();
    if (error || !data) {
      return { success: false, error: error?.message || 'restaurante nao encontrado' };
    }
    setSelectedRestaurant(data);
    setIsDialogOpen(true);
    return { success: true, restaurant: { id: data.id, name: data.name || '' } };
  };

  const normalizeTrainingRequest = (request: TrainingValidateRequest = TRAINING_VALIDATE_BATCH_LIMIT) => {
    const options = typeof request === 'number' ? { limit: request } : (request || {});
    return {
      limit: options.limit ?? TRAINING_VALIDATE_BATCH_LIMIT,
      search: String(options.search || '').trim(),
      force: Boolean(options.force),
      includePublished: Boolean(options.includePublished),
      ids: Array.isArray(options.ids) ? options.ids.filter(Boolean) : [],
    };
  };

  const normalizeTrainingLookup = (value: any) => normalizeText(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const restaurantMatchesTrainingLookup = (restaurant: any, search: string, ids: string[]) => {
    if (ids.length && ids.includes(String(restaurant?.id || ''))) return true;
    if (!search) return ids.length === 0;
    const lookup = normalizeTrainingLookup([
      restaurant?.name,
      restaurant?.google_maps_name,
      restaurant?.address,
      restaurant?.number,
      restaurant?.neighborhood,
      restaurant?.city,
      restaurant?.state,
      restaurant?.instagram,
      restaurant?.other_url,
      restaurant?.external_url,
    ].filter(Boolean).join(' '));
    const terms = normalizeTrainingLookup(search).split(' ').filter(Boolean);
    return terms.length > 0 && terms.every(term => lookup.includes(term));
  };

  const fetchTrainingCandidatesByLookup = async (search: string, ids: string[]) => {
    if (!search && ids.length === 0) return [];
    try {
      let query = supabase
        .from('restaurants')
        .select(VALIDATION_LIST_SELECT)
        .order('created_at', { ascending: false })
        .limit(250);

      if (ids.length) {
        query = query.in('id', ids);
      } else if (cityScope?.name && cityScope?.state) {
        query = query.eq('city', cityScope.name).eq('state', cityScope.state);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).filter((row: any) => restaurantMatchesTrainingLookup(row, search, ids));
    } catch (error: any) {
      addLog(`Modo aprendiz: falha ao buscar candidatos por busca/ID: ${error?.message || error}`);
      return [];
    }
  };

  const handleTrainingValidate = async (request: TrainingValidateRequest = TRAINING_VALIDATE_BATCH_LIMIT) => {
    if (isTrainingValidarIa || isValidating || validatingId) {
      addLog('Modo aprendiz ja esta ocupado com outra validacao; aguarde concluir.');
      return { success: false, error: 'busy', processed: [] };
    }
    let extensionProbe = { ready: isExtensionReady, active: isExtensionActive, compatible: isExtensionCompatible, version: extensionVersion, reason: '' };
    if (!extensionProbe.ready) {
      addLog('Modo aprendiz: extensao ainda nao sincronizada no estado visual; testando ping direto antes de bloquear.');
      extensionProbe = await probeExtensionReadyNow(8000);
    }
    if (!extensionProbe.ready) {
      const reason = extensionProbe.reason || (!extensionProbe.active
        ? 'Extensao inativa.'
        : `Extensao desatualizada/incompleta (${extensionProbe.version || extensionVersion || 'sem versao'}). Versao minima: ${REQUIRED_EXTENSION_VERSION}.`);
      addLog(`Modo aprendiz bloqueado: ${reason}`);
      toast.error(`${reason} Atualize a extensao antes de treinar.`);
      return { success: false, error: reason, processed: [] };
    }

    const options = normalizeTrainingRequest(request);
    const safeLimit = Math.max(1, Math.min(Number(options.limit) || TRAINING_VALIDATE_BATCH_LIMIT, TRAINING_VALIDATE_BATCH_LIMIT));
    const lookupSearch = normalizeTrainingLookup(options.search);
    const loadedLookupCandidates = (lookupSearch || options.ids.length)
      ? restaurants.filter(r => restaurantMatchesTrainingLookup(r, options.search, options.ids))
      : filteredRestaurants;
    const remoteLookupCandidates = (lookupSearch || options.ids.length)
      ? await fetchTrainingCandidatesByLookup(options.search, options.ids)
      : [];
    const candidateMap = new Map<string, any>();
    [...loadedLookupCandidates, ...remoteLookupCandidates].forEach((candidate: any) => {
      if (candidate?.id) candidateMap.set(candidate.id, candidate);
    });
    const candidatePool = Array.from(candidateMap.values());
    const candidates = candidatePool
      .filter(r => r.is_deleted !== true)
      .filter(r => options.includePublished || r.is_published !== true)
      .filter(r => options.force || getMenuStatus(r) !== 'found' || countGalleryImages(r) === 0)
      .slice(0, safeLimit);

    if (candidates.length === 0) {
      const scope = options.search ? ` para "${options.search}"` : ' no filtro atual';
      addLog(`Modo aprendiz: nenhum candidato util${scope}.`);
      toast.info(`Nenhum candidato util${scope} para treinar.`);
      return { success: true, processed: [], message: `nenhum candidato util${scope}` };
    }

    setIsTrainingValidarIa(true);
    setLogs(prev => prev.slice(-40));
    addLog(`Modo aprendiz iniciado: ${candidates.length} restaurante(s), sequencial, sem publicar automaticamente${options.search ? `, busca="${options.search}"` : ''}${options.force ? ', force=true para QA visual dirigido' : ''}.`);

    let successCount = 0;
    let failureCount = 0;
    const processed: any[] = [];
    try {
      for (const restaurant of candidates) {
        const startedAt = new Date().toISOString();
        addLog(`Modo aprendiz validando ${restaurant.name || restaurant.id}...`);
        try {
          await handleSingleValidate({ stopPropagation: () => {} } as React.MouseEvent, restaurant);
          const run = await persistLearningRun(restaurant, startedAt);
          successCount++;
          processed.push({
            id: restaurant.id,
            name: restaurant.name || '',
            success: true,
            lesson: run?.lesson || '',
            before: run?.before || null,
            after: run?.after || null,
          });
          addLog(`Modo aprendiz registrou licao para ${restaurant.name || restaurant.id}.`);
        } catch (error: any) {
          failureCount++;
          const run = await persistLearningRun(restaurant, startedAt, error).catch(() => null);
          processed.push({
            id: restaurant.id,
            name: restaurant.name || '',
            success: false,
            lesson: run?.lesson || 'failed',
            error: error?.message || String(error),
            before: run?.before || null,
            after: run?.after || null,
          });
          addLog(`Modo aprendiz falhou em ${restaurant.name || restaurant.id}: ${error?.message || error}`);
        }
        await new Promise(resolve => window.setTimeout(resolve, AUTO_VALIDATE_ROW_COOLDOWN_MS));
      }
      addLog(`Modo aprendiz concluido: ${successCount} licao(oes), ${failureCount} falha(s).`);
      toast.success(`Modo aprendiz concluido: ${successCount} licao(oes), ${failureCount} falha(s).`);
      fetchRestaurants();
      return { success: true, successCount, failureCount, processed };
    } finally {
      setIsTrainingValidarIa(false);
    }
  };

  useEffect(() => {
    (window as any).__filterFoodTrainValidarIa = (request?: TrainingValidateRequest) => handleTrainingValidate(request);
    (window as any).__filterFoodOpenRestaurantEditor = (restaurantId: string) => openRestaurantEditorById(restaurantId);
    return () => {
      if ((window as any).__filterFoodTrainValidarIa) {
        delete (window as any).__filterFoodTrainValidarIa;
      }
      if ((window as any).__filterFoodOpenRestaurantEditor) {
        delete (window as any).__filterFoodOpenRestaurantEditor;
      }
    };
  }, [filteredRestaurants, isExtensionReady, isTrainingValidarIa, isValidating, validatingId, restaurants, cityScope]);

  const handleApproveBatch = async () => {
    if (activeTab !== 'prontos') {
      toast.info('Abra a aba "Prontos p/ App" para publicar restaurantes.');
      return;
    }
    // Aprova todos os pendentes filtrados atualmente na tela (para nÃ£o aprovar cidades erradas acidentalmente)
    const approveCandidates = filteredRestaurants.filter(r => {
      if (r.is_published === true || r.is_deleted === true || r.ai_validated !== true) return false;
      if (!hasStructuredMenu(r)) return false;
      return true;
    });
    const toApprove = approveCandidates.slice(0, APPROVE_BATCH_LIMIT);

    if (toApprove.length === 0) {
      toast.info('NÃ£o hÃ¡ restaurantes prontos para publicar. O lote agora exige Validar IA + cardÃ¡pio estruturado.');
      return;
    }

    if (approveCandidates.length > APPROVE_BATCH_LIMIT) {
      addLog(`Publicacao em lote limitada a ${APPROVE_BATCH_LIMIT} por clique para manter a tela leve. Restantes: ${approveCandidates.length - APPROVE_BATCH_LIMIT}.`);
      toast.info(`Vou publicar os primeiros ${APPROVE_BATCH_LIMIT} de ${approveCandidates.length}. Clique novamente para continuar.`);
    }
    try {
      setIsApproving(true);
      addLog(`Aprovando lote de ${toApprove.length} restaurantes...`);
      toast.loading(`Aprovando ${toApprove.length} restaurantes...`);

      const ids = toApprove.map(r => r.id);
      const { error } = await supabase
        .from('restaurants')
        .update({ is_published: true })
        .in('id', ids)
        .eq('menu_status', 'found');

      if (error) throw error;

      addLog(`Lote aprovado com sucesso. ${toApprove.length} restaurantes publicados.`);
      toast.success(`${toApprove.length} restaurantes aprovados.`);
      fetchRestaurants();

    } catch (err: any) {
      toast.error('Erro ao aprovar lote: ' + err.message);
    } finally {
      setIsApproving(false);
      toast.dismiss();
    }
  };

  const handleApproveSingle = async (e: React.MouseEvent, restaurant: any) => {
    e.stopPropagation();

    if (restaurant?.is_published === true) {
      toast.info('Esse restaurante jÃ¡ estÃ¡ publicado.');
      return;
    }

    if (restaurant?.ai_validated !== true || !hasStructuredMenu(restaurant) || getMenuStatus(restaurant) !== 'found') {
      toast.warning('Esse restaurante ainda nÃ£o estÃ¡ pronto para publicar.');
      return;
    }

    const eligibility = classifyRestaurantEligibilityLocal(restaurant);
    if (eligibility.status === 'ineligible' && eligibility.confidence >= 0.9) {
      toast.warning(`NÃ£o vou publicar: ${eligibility.reason}`);
      return;
    }

    try {
      setIsApproving(true);
      const { error } = await supabase
        .from('restaurants')
        .update({ is_published: true })
        .eq('id', restaurant.id)
        .eq('menu_status', 'found');

      if (error) throw error;

      addLog(`${restaurant.name || 'Restaurante'} publicado individualmente.`);
      toast.success(`${restaurant.name || 'Restaurante'} publicado.`);
      fetchRestaurants();
    } catch (err: any) {
      toast.error('Erro ao publicar restaurante: ' + (err?.message || err));
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">ValidaÃ§Ã£o de Dados (QA)</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">InspeÃ§Ã£o visual e enriquecimento automatizado antes do CRM.</p>
        </div>
        <div className="flex items-center gap-2">
            {!isExtensionActive && (
              <div className="flex items-center gap-2 mr-2">
                <Input
                  placeholder="ID da ExtensÃ£o"
                  value={extensionId || ''}
                  onChange={e => setExtensionId(e.target.value)}
                  className="w-40 h-10 text-xs"
                />
                <Button variant="secondary" className="h-10 text-xs" onClick={handleSaveExtensionId}>
                  Salvar ID
                </Button>
              </div>
            )}
            {isExtensionReady ? (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm h-10">
                <Check className="w-4 h-4 mr-1.5" />
                ExtensÃ£o Ativa v{extensionVersion || REQUIRED_EXTENSION_VERSION}
              </Badge>
            ) : isExtensionActive ? (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 shadow-sm h-10" title={`Capacidades: ${JSON.stringify(extensionCapabilities || {})}`}>
                <AlertCircle className="w-4 h-4 mr-1.5" />
                Atualize ExtensÃ£o v{extensionVersion || '?'} â†’ {REQUIRED_EXTENSION_VERSION}
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 shadow-sm h-10">
                <AlertCircle className="w-4 h-4 mr-1.5" />
                ExtensÃ£o Inativa
              </Badge>
            )}
            <Button variant="outline" className="h-10 border-indigo-200 text-indigo-700 hover:bg-indigo-50" onClick={handleDownloadExtension}>
              Baixar ExtensÃ£o (ZIP)
            </Button>
          <Button
            onClick={handleAutoValidate}
            disabled={isValidating || !isExtensionReady}
            variant="outline"
            className="border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 font-bold shadow-sm transition-all"
            title={!isExtensionReady ? `Atualize/carregue a extensÃ£o ${REQUIRED_EXTENSION_VERSION}+ antes de validar.` : undefined}
          >
            {isValidating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {isValidating ? 'Validando...' : 'Auto-Validar IA'}
          </Button>
          <Button
            onClick={handleApproveBatch}
            disabled={isApproving || activeTab !== 'prontos' || filteredRestaurants.length === 0}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-md hover:-translate-y-0.5 transition-all"
          >
            {isApproving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            Publicar Prontos
          </Button>
        </div>
      </div>

      {showValidationDiagnostics ? (
        <>
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
        <div className="lg:col-span-2 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4">
          <p className="text-[11px] font-black uppercase tracking-wider text-indigo-500">RÃ©gua do Validar IA</p>
          <h3 className="text-lg font-black text-slate-900 mt-1">
            {cityScope ? `${cityScope.name}/${cityScope.state}` : 'Cidade atual'}
          </h3>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            Fase 1 sÃ³ cria candidatos do Maps. O Validar IA decide elegibilidade, status do Maps,
            cardÃ¡pio e se o restaurante pode ir para o app.
          </p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="rounded-xl bg-white/80 border border-indigo-100 p-2">
              <p className="text-[9px] font-black uppercase text-emerald-600">Validar primeiro</p>
              <p className="text-lg font-black text-slate-900">{operationStats.highPriority}</p>
            </div>
            <div className="rounded-xl bg-white/80 border border-indigo-100 p-2">
              <p className="text-[9px] font-black uppercase text-blue-600">IA decide</p>
              <p className="text-lg font-black text-slate-900">{operationStats.ambiguous}</p>
            </div>
            <div className="rounded-xl bg-white/80 border border-indigo-100 p-2">
              <p className="text-[9px] font-black uppercase text-rose-600">Descarte provÃ¡vel</p>
              <p className="text-lg font-black text-slate-900">{operationStats.autoReject}</p>
            </div>
            <div className="rounded-xl bg-white/80 border border-indigo-100 p-2">
              <p className="text-[9px] font-black uppercase text-indigo-600">Prontos</p>
              <p className="text-lg font-black text-slate-900">{operationStats.readyForApproval}</p>
            </div>
          </div>
          {(operationStats.missingLocation > 0 || operationStats.missingMenuSource > 0) && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">Bloqueios antes do app</p>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                {operationStats.missingLocation > 0
                  ? `${operationStats.missingLocation} candidato(s) ainda sem coordenadas. `
                  : ''}
                {operationStats.missingMenuSource > 0
                  ? `${operationStats.missingMenuSource} sem fonte de cardÃ¡pio/contato validada. `
                  : ''}
                O Validar IA precisa resolver isso antes de publicar.
              </p>
            </div>
          )}
        </div>
        {qaTabs.filter(tab => tab.key !== 'importados').map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`text-left rounded-2xl border p-4 transition-all ${
              activeTab === tab.key
                ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
            title={tab.hint}
          >
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">{tab.label}</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{tab.count}</p>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{tab.hint}</p>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Triagem prÃ©-Validar IA</p>
            <h3 className="text-base font-black text-slate-900">O que a Fase 1 trouxe para a fila</h3>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Esta leitura nÃ£o publica restaurantes: ela prioriza a fila e evita que padarias, mercados, serviÃ§os e negÃ³cios fechados avancem sem evidÃªncia forte.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-2">
          <button
            type="button"
            onClick={() => setActiveTriageFilter('all')}
            className={`rounded-xl border p-3 text-left transition-all ${
              activeTriageFilter === 'all'
                ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
            }`}
            title="Mostrar todas as triagens desta fila de QA."
          >
            <p className="text-[10px] font-black uppercase tracking-wider opacity-80 line-clamp-2">Todas triagens</p>
            <p className="text-xl font-black mt-1">{triageBaseRestaurants.length}</p>
            <p className="text-[10px] mt-1 opacity-80 line-clamp-2">Remove o filtro de triagem.</p>
          </button>
          {triageCards.map(card => (
            <button
              key={card.key}
              type="button"
              onClick={() => setActiveTriageFilter(activeTriageFilter === card.key ? 'all' : card.key)}
              className={`rounded-xl border p-3 text-left transition-all ${card.className} ${
                activeTriageFilter === card.key ? 'ring-2 ring-slate-900/20 shadow-sm scale-[1.01]' : 'hover:shadow-sm hover:-translate-y-0.5'
              }`}
              title={`${card.hint} Clique para filtrar.`}
            >
              <p className="text-[10px] font-black uppercase tracking-wider opacity-80 line-clamp-2">{card.label}</p>
              <p className="text-xl font-black mt-1">{triageStats[card.key] || 0}</p>
              <p className="text-[10px] mt-1 opacity-80 line-clamp-2">{activeTriageFilter === card.key ? 'Filtro ativo' : card.hint}</p>
            </button>
          ))}
        </div>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              {activeTriageCard ? `Filtro ativo: ${activeTriageCard.label}` : 'EstratÃ©gia operacional'}
            </p>
            <p className="text-sm font-semibold text-slate-800 mt-1">
              {activeTriageCard
                ? activeTriageCard.hint
                : 'Priorize provÃ¡veis restaurantes, deixe a IA decidir casos ambÃ­guos e rejeite automaticamente o que for claramente fora do produto.'}
            </p>
          </div>
          {activeTriageCard ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActiveTriageFilter('all')}
              className="rounded-xl bg-white"
            >
              Limpar triagem
            </Button>
          ) : (
            <span className="text-xs font-bold text-slate-500">
              Nenhuma publicaÃ§Ã£o acontece nesta etapa sem Validar IA.
            </span>
          )}
        </div>
      </div>

        </>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Modo leve ativo</p>
            <h3 className="text-base font-black text-slate-900">Diagnosticos de triagem ocultos</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              A fila carrega primeiro com poucos registros. Abra os diagnosticos somente quando precisar investigar categorias, bloqueios ou regras da Fase 1.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowValidationDiagnostics(true)}
            className="rounded-xl bg-white"
          >
            Mostrar diagnosticos
          </Button>
        </div>
      )}

      <div className="flex flex-wrap bg-slate-100 p-1 rounded-lg w-fit gap-1">
        {qaTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${
              activeTab === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
            title={tab.hint}
          >
            {tab.label} <span className="ml-1 text-[11px] text-slate-400">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Terminal de Logs */}
      <div className="mb-6">
        <div className="border-slate-800 shadow-xl shadow-slate-900/20 rounded-2xl overflow-hidden bg-slate-950 text-slate-300 flex flex-col h-[200px]">
          <div className="p-3 border-b border-slate-800/60 bg-[#0A0D14] flex justify-between items-center px-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5 mr-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
              </div>
              <Terminal className="w-4 h-4 text-slate-500" />
              <h3 className="font-mono text-xs font-bold text-slate-400 tracking-wide">bash / qa-logs</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowExtensionTelemetry((value) => !value)}
                className="rounded-full border border-slate-700 px-3 py-1 text-[11px] font-bold text-slate-200 hover:bg-slate-800"
              >
                {showExtensionTelemetry ? 'Ocultar monitor' : 'Monitor extensao'}
              </button>
              {showExtensionTelemetry && (
                <>
                  <button
                    type="button"
                    onClick={refreshExtensionTelemetry}
                    disabled={isLoadingExtensionTelemetry}
                    className="rounded-full border border-slate-700 px-3 py-1 text-[11px] font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                  >
                    {isLoadingExtensionTelemetry ? 'Lendo...' : 'Atualizar'}
                  </button>
                  <button
                    type="button"
                    onClick={clearExtensionTelemetry}
                    className="rounded-full border border-slate-700 px-3 py-1 text-[11px] font-bold text-slate-300 hover:bg-slate-800"
                  >
                    Limpar
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="p-4 overflow-y-auto font-mono text-[13px] leading-relaxed flex-1 space-y-1.5 custom-scrollbar">
            {logs.map((log, index) => {
              const timeMatch = log.match(/^(\[\d{2}:\d{2}:\d{2}\])/);
              const timeStr = timeMatch ? timeMatch[1] : '';
              const msgStr = timeMatch ? log.substring(timeStr.length) : log;

              return (
                <div key={index} className="text-slate-300">
                  <span className="text-slate-500 mr-2">{timeStr}</span>
                  {msgStr}
                </div>
              );
            })}
            <div ref={logsEndRef} />
          </div>
        </div>
        {showExtensionTelemetry && (
          <div className="mt-3 rounded-2xl border border-indigo-100 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-indigo-600">Monitor visual da extensao</p>
                <p className="text-[11px] text-slate-500">Registra abas e URLs vistas pelo Coletor mesmo se o plugin do Codex cair.</p>
              </div>
              <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-700">
                {extensionTelemetry.length} evento(s)
              </span>
            </div>
            <div className="max-h-56 overflow-y-auto rounded-xl bg-slate-50 p-2 text-xs">
              {extensionTelemetry.length === 0 ? (
                <div className="py-6 text-center text-slate-400">Nenhum evento recebido ainda.</div>
              ) : (
                extensionTelemetry.slice(-40).reverse().map((event, index) => {
                  const eventTime = event.ts || event.receivedAt || '';
                  const eventLabel = event.type || 'evento';
                  return (
                    <div key={`${eventTime}-${event.tabId || 'x'}-${index}`} className="mb-1 rounded-lg border border-slate-200 bg-white p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-700">{eventLabel}</span>
                        <span className="shrink-0 text-[10px] text-slate-400">
                          {eventTime ? new Date(eventTime).toLocaleTimeString() : '--:--'}
                        </span>
                      </div>
                      {event.title && <div className="mt-1 truncate text-slate-600">{event.title}</div>}
                      {event.url && <div className="mt-1 break-all font-mono text-[11px] text-indigo-700">{event.url}</div>}
                      <div className="mt-1 text-[10px] text-slate-400">
                        tab {event.tabId ?? '-'} {event.status ? `- ${event.status}` : ''}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="p-4 border-b border-slate-100 flex flex-col gap-3 bg-slate-50/80 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Pesquisar por nome, categoria ou endereÃ§o..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 bg-white border-slate-200 shadow-sm focus-visible:ring-indigo-500"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <div className="font-bold uppercase tracking-wider bg-slate-200/50 px-3 py-1.5 rounded-md">
              {filteredRestaurants.length === 0
                ? '0 registros'
                : `${pageStartIndex + 1}-${pageEndIndex} de ${filteredRestaurants.length}${hasMoreRestaurants ? '+' : ''} registros`}
            </div>
            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600 shadow-sm"
              aria-label="Registros por pÃ¡gina"
            >
              {[20].map(size => (
                <option key={size} value={size}>{size}/pÃ¡gina</option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
            >
              Anterior
            </Button>
            <span className="px-2 font-semibold text-slate-600">
              {safeCurrentPage}/{totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
            >
              PrÃ³xima
            </Button>
                {hasMoreRestaurants && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    disabled={isLoading}
                    onClick={() => setLoadedRowLimit(limit => limit + VALIDATION_FETCH_BATCH_SIZE)}
                  >
                    Carregar mais 20
                  </Button>
                )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-4" />
            <p className="text-slate-500 font-medium">Buscando dados no servidor...</p>
          </div>
        ) : filteredRestaurants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg mb-1">Nenhum registro nesta fila</h3>
            <p className="text-sm text-slate-500 max-w-sm">
              {qaTabs.find(tab => tab.key === activeTab)?.hint || 'Use o Motor de Coleta ou o Validar IA para avanÃ§ar esta cidade.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                  <TableHead className="font-bold text-slate-900 text-[13px]">Restaurante</TableHead>
                  <TableHead className="font-bold text-slate-900 text-[13px]">Triagem</TableHead>
                  <TableHead className="font-bold text-slate-900 text-[13px]">DecisÃ£o QA</TableHead>
                  <TableHead className="text-center font-bold text-slate-900 text-[13px]">Telefone</TableHead>
                  <TableHead className="text-center font-bold text-slate-900 text-[13px]">Instagram</TableHead>
                  <TableHead className="text-center font-bold text-slate-900 text-[13px]">CardÃ¡pio</TableHead>
                  <TableHead className="text-center font-bold text-slate-900 text-[13px]">Galeria</TableHead>
                  <TableHead className="text-center font-bold text-slate-900 text-[13px]">HorÃ¡rio</TableHead>
                  <TableHead className="text-right font-bold text-slate-900 text-[13px]">AÃ§Ã£o</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRestaurants.map((r) => {
                  const qaState = getCachedQaState(r);
                  const triage = getCachedLeadTriage(r);
                  const menuReason = getMenuStatusReason(r);
                  const nameCleanup = normalizeRestaurantDisplayName(r.name || '', {
                    city: r.city,
                    state: r.state,
                    neighborhood: r.neighborhood,
                  });
                  const hasPhone = !!r.phone && r.ai_validated;
                  const hasInsta = (!!r.instagram || !!r.social_networks) && r.ai_validated;
                  const hasMenu = hasStructuredMenu(r);
                  const hasGallery = (!!r.image_url || !!r.cover_image_url) && r.ai_validated;
                  const hasHours = !!r.opening_hours && r.ai_validated;
                  const isReadyForApp = r.ai_validated === true && hasMenu && getMenuStatus(r) === 'found';
                  const menuUrl = `/restaurant/${r.id}/menu`;

                  const StatusDot = ({ active }: { active: boolean }) => (
                    <div className={`w-3.5 h-3.5 rounded-full mx-auto shadow-sm transition-colors duration-500 ${active ? 'bg-emerald-400 ring-2 ring-emerald-50' : 'bg-rose-500 ring-2 ring-rose-50'}`} title={active ? 'ExtraÃ­do e validado pela IA' : 'Pendente de validaÃ§Ã£o ou nÃ£o encontrado'} />
                  );

                  return (
                    <TableRow
                      key={r.id}
                      data-restaurant-id={r.id}
                      data-restaurant-name={nameCleanup.displayName || r.name || ''}
                      className="hover:bg-slate-50/80 cursor-pointer group transition-colors"
                    >
                      <TableCell className="align-middle">
                        <div className="font-medium text-slate-900 text-[14px] group-hover:text-indigo-600 transition-colors">{nameCleanup.displayName || r.name}</div>
                        {nameCleanup.changed && (
                          <div className="text-[11px] text-slate-400 mt-0.5 max-w-[320px] truncate" title={r.name}>
                            Maps: {r.name}
                          </div>
                        )}
                        <div className="flex items-center text-[12px] text-slate-500 mt-1">
                          <span className="truncate max-w-[280px]">{r.address || 'EndereÃ§o nÃ£o disponÃ­vel'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="align-middle min-w-[190px]">
                        <Badge variant="outline" className={`${triage.className} font-black`} title={triage.reason}>
                          {triage.label}
                        </Badge>
                        <div className="text-[11px] text-slate-500 mt-1 max-w-[230px] truncate" title={triage.reason}>
                          {triage.action}
                        </div>
                      </TableCell>
                      <TableCell className="align-middle min-w-[170px]">
                        <Badge variant="outline" className={`${qaState.className} font-black`}>
                          {qaState.label}
                        </Badge>
                        <div className="text-[11px] text-slate-500 mt-1 max-w-[220px] truncate" title={menuReason || qaState.action}>
                          {menuReason || qaState.action}
                        </div>
                      </TableCell>
                      <TableCell className="text-center align-middle">
                        <StatusDot active={hasPhone} />
                      </TableCell>
                      <TableCell className="text-center align-middle">
                        <StatusDot active={hasInsta} />
                      </TableCell>
                      <TableCell className="text-center align-middle">
                        <StatusDot active={hasMenu} />
                      </TableCell>
                      <TableCell className="text-center align-middle">
                        <StatusDot active={hasGallery} />
                      </TableCell>
                      <TableCell className="text-center align-middle">
                        <StatusDot active={hasHours} />
                      </TableCell>
                      <TableCell className="text-right align-middle">
                        <div className="flex justify-end gap-2">
                          {isReadyForApp && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(menuUrl, '_blank');
                              }}
                              className="h-8 px-3 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1.5" /> Ver menu
                            </Button>
                          )}
                          {activeTab === 'prontos' && isReadyForApp && r.is_published !== true && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleApproveSingle(e, r)}
                              disabled={isApproving}
                              className="h-8 px-3 text-xs font-bold text-green-700 hover:text-green-800 hover:bg-green-50"
                            >
                              <Check className="w-3.5 h-3.5 mr-1.5" /> Publicar
                            </Button>
                          )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleSingleValidate(e, r)}
                              data-testid={`validate-ai-${r.id}`}
                              data-restaurant-id={r.id}
                              disabled={validatingId === r.id || !isExtensionReady}
                              title={!isExtensionReady ? `Atualize/carregue a extensÃ£o ${REQUIRED_EXTENSION_VERSION}+ antes de validar.` : undefined}
                              className="h-8 px-3 text-xs font-bold text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            >
                              {validatingId === r.id ? (
                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                              ) : (
                                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                              )}
                              Validar IA
                            </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            data-testid={`edit-restaurant-${r.id}`}
                            data-restaurant-id={r.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRestaurant(r);
                              setIsDialogOpen(true);
                            }}
                            className="h-8 px-3 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                          >
                            <Edit className="w-3.5 h-3.5 mr-1.5" /> Editar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-3 text-xs text-slate-500">
              <span className="font-semibold">
                Mostrando {pageStartIndex + 1}-{pageEndIndex} de {filteredRestaurants.length}{hasMoreRestaurants ? '+' : ''}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage(1)}
                >
                  Primeira
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                >
                  Anterior
                </Button>
                <span className="min-w-[70px] text-center font-bold text-slate-700">
                  {safeCurrentPage}/{totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                >
                  PrÃ³xima
                </Button>
                {hasMoreRestaurants && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    disabled={isLoading}
                    onClick={() => setLoadedRowLimit(limit => limit + VALIDATION_FETCH_BATCH_SIZE)}
                  >
                    Carregar mais 20
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                >
                  Ãšltima
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedRestaurant && (
        <RestaurantDetailsDialog
          restaurant={selectedRestaurant}
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSyncSuccess={async () => {
            setServerQaStats(null);
            let nextTab: ValidationTab | null = null;

            if (selectedRestaurant?.id) {
              const { data: freshRestaurant, error } = await supabase
                .from('restaurants')
                .select(VALIDATION_LIST_SELECT)
                .eq('id', selectedRestaurant.id)
                .maybeSingle();

              if (!error && freshRestaurant) {
                setSelectedRestaurant(freshRestaurant);
                setRestaurants(prevRows => (
                  prevRows.some(row => row.id === freshRestaurant.id)
                    ? prevRows.map(row => row.id === freshRestaurant.id ? freshRestaurant : row)
                    : prevRows
                ));

                const nextStatus = getMenuStatus(freshRestaurant);
                if (freshRestaurant.is_deleted === true) {
                  nextTab = 'rejeitados';
                } else if (freshRestaurant.is_published === true && nextStatus === 'found') {
                  nextTab = 'importados';
                } else if (nextStatus === 'found') {
                  nextTab = 'prontos';
                } else if (MENU_REVIEW_STATUSES.includes(nextStatus || '')) {
                  nextTab = 'revisao';
                } else if (MENU_NO_CARDAPIO_STATUSES.includes(nextStatus || '')) {
                  nextTab = 'sem_cardapio';
                }
              }
            }

            if (nextTab && nextTab !== activeTab) {
              setActiveTab(nextTab);
              return;
            }
            fetchRestaurants();
          }}
        />
      )}
    </div>
  );
}









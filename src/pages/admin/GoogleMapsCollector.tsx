import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MapPin, Search, PlusCircle, Check, Loader2, Compass, AlertCircle, ChevronLeft, ChevronRight, Trash2, Pencil, Globe, Clock, Instagram as InstagramIcon, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { RestaurantDetailsDialog } from '@/components/admin/RestaurantDetailsDialog';
import { showSuccess, showError } from '@/utils/toast';
import { cleanRestaurantName } from '@/utils/formatters';
import { WeekSchedule } from '@/types/schedule';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { geocodeAddress } from '@/services/geocoding';

interface ScrapedRestaurant {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviewsCount: number;
  address: string;
  phone: string;
  city: string;
  state: string;
  instagram?: string;
  facebook?: string;
  logo?: string;
  coverImage?: string;
  galleryImages?: string[];
  openingHours?: WeekSchedule;
  website?: string;
  googleMapsUrl?: string;
  menuSourceUrl?: string;
  assignedToId?: string;
  assignedToName?: string;
  menu_categories?: any[];
  cep?: string;
  latitude?: number | null;
  longitude?: number | null;
  number?: string;
  neighborhood?: string;
  visit_notes?: string;
  social_networks?: any;
  other_url?: string;
  external_url?: string;
  ai_validated?: boolean;
}

const CITY_CENTERS: Record<string, { lat: number; lng: number; neighborhoods: string[] }> = {
  'joao pessoa': {
    lat: -7.135,
    lng: -34.860,
    neighborhoods: ['Tambaú', 'Manaíra', 'Cabo Branco', 'Bessa', 'Centro Histórico', 'Altiplano', 'Torre', 'Mangabeira', 'Bancários', 'Miramar', 'Bairro dos Estados', 'Jaguaribe', 'Castelo Branco', 'Geisel', 'José Américo', 'Expedicionários', 'João Paulo II', 'Cruz das Armas', 'Valentina']
  },
  'sao paulo': {
    lat: -23.550,
    lng: -46.633,
    neighborhoods: ['Jardins', 'Pinheiros', 'Bela Vista', 'Vila Mariana', 'Perdizes', 'Santana', 'Moema', 'Itaim Bibi', 'Vila Madalena', 'Consolação', 'Liberdade', 'Butantã', 'Lapa', 'Mooca', 'Tatuapé', 'Ipiranga']
  },
  'rio de janeiro': {
    lat: -22.906,
    lng: -43.172,
    neighborhoods: ['Copacabana', 'Ipanema', 'Leblon', 'Botafogo', 'Flamengo', 'Barra da Tijuca', 'Recreio', 'Tijuca', 'Centro', 'Lapa', 'Santa Teresa', 'Gávea', 'Jardim Botânico', 'Catete', 'Glória', 'Humaitá']
  },
  'recife': {
    lat: -8.057,
    lng: -34.882,
    neighborhoods: ['Boa Viagem', 'Madalena', 'Graças', 'Espinheiro', 'Casa Forte', 'Pina', 'Derby', 'Afogados', 'Imbiribeira', 'Cordeiro', 'Várzea', 'Poço da Panela', 'Apipucos', 'San Martin', 'Areias']
  },
  'belo horizonte': {
    lat: -19.916,
    lng: -43.934,
    neighborhoods: ['Savassi', 'Lourdes', 'Funcionários', 'Anchieta', 'Sion', 'Buritis', 'Prado', 'Padre Eustáquio', 'Pampulha', 'Castelo', 'Sagrada Família', 'Floresta', 'Cruzeiro', 'Gutierrez', 'Santo Antônio', 'Serra']
  }
};

function getCityInfo(city: string): { lat: number; lng: number; neighborhoods: string[] } {
  const normalCity = city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  
  if (CITY_CENTERS[normalCity]) {
    return CITY_CENTERS[normalCity];
  }
  
  let hash = 0;
  for (let i = 0; i < normalCity.length; i++) {
    hash = (hash << 5) - hash + normalCity.charCodeAt(i);
    hash |= 0;
  }
  const seed = Math.abs(hash);
  
  const lat = -25 + (seed % 220) / 10;
  const lng = -55 + (seed % 200) / 10;
  
  const genericNeighborhoods = [
    'Centro', 'Setor Central', 'Vila Nova', 'Jardim América', 'Bairro Novo', 
    'Setor Sul', 'Setor Oeste', 'Bairro Popular', 'Primavera', 'Jardim Planalto',
    'Industrial', 'Morada do Sol', 'Bela Vista', 'Parque das Nações', 'São José',
    'Santo Antônio', 'Santa Maria', 'Jardim Glória', 'Vila Isabel', 'Vila Real'
  ];
  
  return { lat, lng, neighborhoods: genericNeighborhoods };
}

// Helper to map Google regularOpeningHours to the WeekSchedule structure
const mapGoogleHoursToWeekSchedule = (googleHours: any): WeekSchedule => {
  const days: (keyof WeekSchedule)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const defaultSchedule = () => ({ isOpen: false, slots: [] });
  const schedule: WeekSchedule = {
    monday: defaultSchedule(),
    tuesday: defaultSchedule(),
    wednesday: defaultSchedule(),
    thursday: defaultSchedule(),
    friday: defaultSchedule(),
    saturday: defaultSchedule(),
    sunday: defaultSchedule()
  };

  if (!googleHours || !googleHours.periods) {
    days.forEach(day => {
      schedule[day] = {
        isOpen: day !== 'monday',
        slots: day !== 'monday' ? [{ start: '11:00', end: '23:00' }] : []
      };
    });
    return schedule;
  }

  // 1. Detectar se funciona 24 horas por dia, 7 dias por semana (24/7)
  // O Google representa 24/7 como um único período começando no dia 0 (Domingo) às 00:00 sem fechar
  // No entanto, dependendo de como o JSON é gerado/transportado, valores 0 ou campos vazios podem ser undefined.
  const firstPeriod = googleHours.periods?.[0];
  const hasSinglePeriod = googleHours.periods?.length === 1;
  const isOpenDaySunday = firstPeriod?.open?.day === 0 || firstPeriod?.open?.day === '0' || firstPeriod?.open?.day === undefined;
  const isOpenHourZero = firstPeriod?.open?.hour === 0 || firstPeriod?.open?.hour === '0' || firstPeriod?.open?.hour === undefined || firstPeriod?.open?.hour === null;
  const isOpenMinuteZero = firstPeriod?.open?.minute === 0 || firstPeriod?.open?.minute === '0' || firstPeriod?.open?.minute === undefined || firstPeriod?.open?.minute === null;
  const hasNoClose = !firstPeriod?.close;

  // Também checar se descriptions indicam 24h para todos os dias
  let hasDescriptionsAlwaysOpen = false;
  if (Array.isArray(googleHours.weekdayDescriptions) && googleHours.weekdayDescriptions.length > 0) {
    hasDescriptionsAlwaysOpen = googleHours.weekdayDescriptions.every((desc: string) => {
      const lower = desc.toLowerCase();
      return lower.includes('24 horas') || lower.includes('24 hours') || lower.includes('aberto 24h') || lower.includes('open 24h');
    });
  }

  const isAlwaysOpen = (hasSinglePeriod && isOpenDaySunday && isOpenHourZero && isOpenMinuteZero && hasNoClose) || hasDescriptionsAlwaysOpen;

  if (isAlwaysOpen) {
    days.forEach(day => {
      schedule[day] = {
        isOpen: true,
        slots: [{ start: '00:00', end: '23:59' }]
      };
    });
    return schedule;
  }

  // 2. Mapeamento regular por dia
  googleHours.periods.forEach((period: any) => {
    const openDayIdx = period.open?.day;
    if (openDayIdx === undefined || openDayIdx < 0 || openDayIdx > 6) return;
    
    const dayName = days[openDayIdx];
    schedule[dayName].isOpen = true;
    
    const startHour = String(period.open?.hour || 0).padStart(2, '0');
    const startMin = String(period.open?.minute || 0).padStart(2, '0');
    
    let endHour = '23';
    let endMin = '59';
    
    if (period.close) {
      endHour = String(period.close.hour || 0).padStart(2, '0');
      endMin = String(period.close.minute || 0).padStart(2, '0');
      
      // Se fecha à meia-noite (00:00), representamos como 23:59 para melhor compatibilidade com seletores
      if (endHour === '00' && endMin === '00') {
        endHour = '23';
        endMin = '59';
      }
    } else {
      // Aberto 24 horas para este dia específico se o horário de fechamento estiver ausente
      endHour = '23';
      endMin = '59';
    }
    
    schedule[dayName].slots.push({
      start: `${startHour}:${startMin}`,
      end: `${endHour}:${endMin}`
    });
  });

  return schedule;
};

// Helper to get proxied Google Places photo media URL
const getGooglePhotoUrl = (photoName: string, apiKey: string) => {
  return `/google-places/v1/${photoName}/media?key=${apiKey}&maxHeightPx=800`;
};

// Helper to enrich a restaurant with mock fields if they are missing
const enrichRestaurant = (r: Omit<ScrapedRestaurant, 'id'>): Omit<ScrapedRestaurant, 'id'> => {
  const cleanName = r.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
  const defaultOpen = { isOpen: true, slots: [{ start: '11:00', end: '23:00' }] };
  
  return {
    ...r,
    instagram: r.instagram || `https://instagram.com/${cleanName}`,
    facebook: r.facebook || `https://facebook.com/${cleanName}`,
    coverImage: r.coverImage || '',
    galleryImages: r.galleryImages || [],
    openingHours: r.openingHours || {
      monday: { isOpen: false, slots: [] },
      tuesday: { ...defaultOpen },
      wednesday: { ...defaultOpen },
      thursday: { ...defaultOpen },
      friday: { isOpen: true, slots: [{ start: '11:00', end: '23:59' }] },
      saturday: { isOpen: true, slots: [{ start: '11:00', end: '23:59' }] },
      sunday: { ...defaultOpen }
    },
    googleMapsUrl: r.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.name + ', ' + r.address)}`
  };
};

function generateMockRestaurants(city: string, state: string, neighborhood: string, lat: number, lng: number): Omit<ScrapedRestaurant, 'id'>[] {
  const seedString = `${city}-${neighborhood}-${lat.toFixed(4)}-${lng.toFixed(4)}`.toLowerCase();
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = (hash << 5) - hash + seedString.charCodeAt(i);
    hash |= 0;
  }
  
  let seed = Math.abs(hash);
  const nextRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const categories = [
    { name: 'Churrascaria', prefixes: ['Churrascaria', 'Grelha & Cia', 'Boi na Brasa', 'Portal do Espeto', 'Churrasco', 'Boi de Ouro', 'Pampa Grill', 'Espeto de Prata'], suffixes: ['Premium', 'Prime', 'Sertanejo', 'do Gaúcho', 'na Brasa', 'Express', 'Familiar', 'Tradicional'] },
    { name: 'Pizzaria', prefixes: ['Pizzaria', 'Forno a Lenha', 'Bella Massa', 'Cantina da Pizza', 'La Bella', 'Don Tomato', 'Pizzaria D\'Itália', 'Forneria'], suffixes: ['Napolitana', 'Veneza', 'Tradicional', 'Gourmet', 'Fornice', 'Romana', 'Siciliana', 'Express'] },
    { name: 'Hamburgueria', prefixes: ['Burger Joint', 'Hamburgueria', 'Bacon & Co', 'Monster Burger', 'Craft Burger', 'American Burger', 'Brutus Burger', 'Prime Burger'], suffixes: ['Artisanal', 'Craft', 'Gourmet', 'Style', 'House', 'Station', 'Club', 'Delivery'] },
    { name: 'Japonesa', prefixes: ['Sushi Bar', 'Temakeria', 'Nippon', 'Hanami', 'Koto', 'Yakuza Sushi', 'Tokyo Express', 'Sushiman'], suffixes: ['Express', 'Premium', 'Sushi', 'Oriental', 'Deluxe', 'Lounge', 'House', 'Prime'] },
    { name: 'Italiana', prefixes: ['Cantina', 'Trattoria', 'Spaghetti', 'Massa & Vinho', 'Mangia', 'Nonno', 'Ristorante', 'Pasta & Cia'], suffixes: ['Mia', 'Bella Italia', 'Romana', 'e Pasta', 'Tradicional', 'Gourmet', 'Premium', 'Classico'] },
    { name: 'Regional', prefixes: ['Sabor Regional', 'Fogão a Lenha', 'Cantinho', 'Portal', 'Estrela', 'Cozinha do Sertão', 'Tempero da Terra', 'Panela de Barro'], suffixes: ['do Nordeste', 'Sertanejo', 'da Terra', 'Típico', 'Gourmet', 'Caseiro', 'Popular', 'Regional'] },
    { name: 'Frutos do Mar', prefixes: ['Camarão & Cia', 'Rei dos Mares', 'Porto', 'Costa Mar', 'Canoa', 'Marisco Risonho', 'Estrela do Mar', 'Rede do Pescador'], suffixes: ['e Cia', 'Gourmet', 'Restaurante', 'Marisco', 'das Ondas', 'Premium', 'do Porto', 'Brisa'] },
    { name: 'Cafeteria', prefixes: ['Café do Ponto', 'Bistrô', 'Grão de Café', 'Doce Sabor', 'Aroma', 'Estação Café', 'Santo Café', 'Café & Companhia'], suffixes: ['Co.', 'Boutique', 'Cafeteria', 'Gourmet', 'Express', 'Lounge', 'Artesanal', 'Prime'] }
  ];

  const categoryPhotos: Record<string, { cover: string; gallery: string[] }> = {
    'Churrascaria': {
      cover: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800',
      gallery: [
        'https://images.unsplash.com/photo-1544025162-d76694265947?w=600',
        'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600'
      ]
    },
    'Pizzaria': {
      cover: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800',
      gallery: [
        'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600',
        'https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=600'
      ]
    },
    'Hamburgueria': {
      cover: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
      gallery: [
        'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600',
        'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600'
      ]
    },
    'Japonesa': {
      cover: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800',
      gallery: [
        'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600',
        'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=600'
      ]
    },
    'Italiana': {
      cover: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800',
      gallery: [
        'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600',
        'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600'
      ]
    },
    'Regional': {
      cover: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=800',
      gallery: [
        'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=600',
        'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=600'
      ]
    },
    'Frutos do Mar': {
      cover: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800',
      gallery: [
        'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600',
        'https://images.unsplash.com/photo-1485962398705-ef6a1bd094fa?w=600'
      ]
    },
    'Cafeteria': {
      cover: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800',
      gallery: [
        'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600',
        'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600'
      ]
    }
  };

  const count = Math.floor(nextRandom() * 11) + 20;
  const restaurants: Omit<ScrapedRestaurant, 'id'>[] = [];

  for (let i = 0; i < count; i++) {
    const catIdx = Math.floor(nextRandom() * categories.length);
    const cat = categories[catIdx];
    const prefix = cat.prefixes[Math.floor(nextRandom() * cat.prefixes.length)];
    const suffix = cat.suffixes[Math.floor(nextRandom() * cat.suffixes.length)];
    
    const streetNames = ['Av. Principal', 'Rua das Flores', 'Av. Brasil', 'Rua Bahia', 'Av. Getúlio Vargas', 'Rua Dom Pedro II', 'Av. Rio Branco', 'Rua Sete de Setembro', 'Av. Epitácio Pessoa', 'Rua Ruy Carneiro', 'Av. Paulista', 'Rua Augusta'];
    const street = streetNames[Math.floor(nextRandom() * streetNames.length)];
    const number = Math.floor(nextRandom() * 2500) + 1;
    const address = `${street}, ${number} - ${neighborhood}`;
    
    // Nomes limpos e realistas (sem parênteses de endereço)
    const name = `${prefix} ${suffix}`;
    let finalName = name;
    let attempts = 0;
    while (restaurants.some(r => r.name === finalName) && attempts < 10) {
      const nextPrefix = cat.prefixes[Math.floor(nextRandom() * cat.prefixes.length)];
      const nextSuffix = cat.suffixes[Math.floor(nextRandom() * cat.suffixes.length)];
      finalName = `${nextPrefix} ${nextSuffix}`;
      attempts++;
    }
    
    const rating = parseFloat((4.0 + nextRandom() * 1.0).toFixed(1));
    const reviewsCount = Math.floor(50 + nextRandom() * 6450);
    
    const phoneDDD = state === 'SP' ? '11' : state === 'RJ' ? '21' : state === 'PB' ? '83' : state === 'PE' ? '81' : state === 'MG' ? '31' : '99';
    const phone = `(${phoneDDD}) 3${Math.floor(100 + nextRandom() * 899)}-${Math.floor(1000 + nextRandom() * 8999)}`;

    const cleanName = finalName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
    const instagram = `https://instagram.com/${cleanName}`;
    const facebook = `https://facebook.com/${cleanName}`;
    const photos = categoryPhotos[cat.name] || categoryPhotos['Regional'];

    const defaultOpen = { isOpen: true, slots: [{ start: '11:00', end: '23:00' }] };
    const openingHours: WeekSchedule = {
      monday: { isOpen: false, slots: [] },
      tuesday: { ...defaultOpen },
      wednesday: { ...defaultOpen },
      thursday: { ...defaultOpen },
      friday: { isOpen: true, slots: [{ start: '11:00', end: '23:59' }] },
      saturday: { isOpen: true, slots: [{ start: '11:00', end: '23:59' }] },
      sunday: { ...defaultOpen }
    };

    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(finalName + ', ' + address)}`;

    restaurants.push({
      name: finalName,
      category: cat.name,
      rating,
      reviewsCount,
      address,
      phone,
      city,
      state,
      instagram,
      facebook,
      coverImage: photos.cover,
      galleryImages: photos.gallery,
      openingHours,
      googleMapsUrl
    });
  }

  return restaurants;
}

const renderTableOpeningHours = (hours: any) => {
  if (!hours || Object.keys(hours).length === 0) {
    return (
      <span className="bg-slate-50 text-slate-400 text-[10px] px-1.5 py-0.5 rounded-md font-semibold border border-slate-100/40">
        Ausente
      </span>
    );
  }

  const daysTranslation: Record<string, string> = {
    monday: 'Seg',
    tuesday: 'Ter',
    wednesday: 'Qua',
    thursday: 'Qui',
    friday: 'Sex',
    saturday: 'Sáb',
    sunday: 'Dom'
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-7 px-2 text-[10px] font-bold gap-1 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
        >
          <Clock className="w-3 h-3 text-indigo-500" />
          <span>Ver Horários</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3 bg-white rounded-xl shadow-xl border border-slate-100">
        <h5 className="font-bold text-xs text-primary mb-2 flex items-center gap-1 border-b border-slate-50 pb-1.5">
          <Clock className="w-3.5 h-3.5 text-indigo-500" />
          Funcionamento
        </h5>
        <div className="space-y-1">
          {Object.entries(daysTranslation).map(([dayKey, label]) => {
            const info = hours[dayKey];
            const isOpen = info?.isOpen;
            const slots = info?.slots || [];
            return (
              <div key={dayKey} className="flex justify-between text-[11px] py-0.5 border-b border-slate-50/50 last:border-0">
                <span className="font-semibold text-slate-500">{label}</span>
                <span className={isOpen ? "text-emerald-600 font-bold" : "text-slate-400 font-medium"}>
                  {isOpen 
                    ? slots.map((s: any) => `${s.start}-${s.end}`).join(', ') 
                    : 'Fechado'}
                </span>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Helper to get a stable unique key for a restaurant to detect imports across searches
export const getRestaurantUniqueKey = (name: string, address: string) => {
  const cleanName = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
  const cleanAddress = address.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
  return `${cleanName}_${cleanAddress}`;
};

/**
 * Faz parsing de um endereço completo do Google Maps e divide nos campos separados.
 * Formato típico: "R. Tertuliano Crispiniano da Mata, 28 - Ernesto Geisel, João Pessoa - PB, 58075-070"
 */
const parseGoogleMapsAddress = (fullAddress: string) => {
  let street = '';
  let number = '';
  let neighborhood = '';
  let city = '';
  let state = '';
  let cep = '';

  if (!fullAddress) return { street, number, neighborhood, city, state, cep };

  let working = fullAddress.trim();

  // 1. Extrai CEP (ex: 58075-070 ou 58075070)
  const cepMatch = working.match(/\b(\d{5}-\d{3})\b/) || working.match(/\b(\d{8})\b/);
  if (cepMatch) {
    cep = cepMatch[1];
    working = working.replace(cepMatch[0], '').trim();
  }

  // Limpa pontuação residual
  working = working.replace(/[\s,]+$/, '').replace(/^[\s,]+/, '').trim();

  // 2. Extrai Estado (UF) - 2 letras maiúsculas no final ou após hífen
  const stateMatch = working.match(/[\s,-]\s*([A-Z]{2})\s*$/);
  if (stateMatch) {
    state = stateMatch[1];
    working = working.substring(0, working.lastIndexOf(stateMatch[0])).trim();
  }

  // Limpa pontuação residual
  working = working.replace(/[\s,-]+$/, '').replace(/^[\s,-]+/, '').trim();

  // 3. Divide por vírgulas para identificar as partes
  // Formato esperado: "Rua, Número - Bairro, Cidade" ou "Rua, Número - Bairro"
  const parts = working.split(',').map(p => p.trim());

  if (parts.length >= 3) {
    // Ex: ["R. Tertuliano Crispiniano da Mata", "28 - Ernesto Geisel", "João Pessoa"]
    street = parts[0];
    
    // Segunda parte pode ter "Número - Bairro"
    const secondPart = parts[1];
    const hyphenIdx = secondPart.indexOf(' - ');
    if (hyphenIdx !== -1) {
      const numPart = secondPart.substring(0, hyphenIdx).trim();
      const bairroPart = secondPart.substring(hyphenIdx + 3).trim();
      if (/\d/.test(numPart) || numPart.toLowerCase() === 's/n') {
        number = numPart;
        neighborhood = bairroPart;
      } else {
        // Se não é número, tudo é parte do endereço
        street += ', ' + secondPart;
      }
    } else {
      // Sem hífen, provavelmente é só o número
      if (/^\d+/.test(secondPart) || secondPart.toLowerCase() === 's/n') {
        number = secondPart;
      } else {
        neighborhood = secondPart;
      }
    }
    
    // Terceira parte é a cidade (pode ter bairro se não foi encontrado antes)
    if (parts.length >= 3) {
      const thirdPart = parts.slice(2).join(', ').trim();
      const thirdHyphen = thirdPart.indexOf(' - ');
      if (thirdHyphen !== -1 && !neighborhood) {
        neighborhood = thirdPart.substring(0, thirdHyphen).trim();
        city = thirdPart.substring(thirdHyphen + 3).trim();
      } else {
        city = thirdPart;
      }
    }
  } else if (parts.length === 2) {
    // Ex: ["R. Tertuliano Crispiniano da Mata, 28", "Ernesto Geisel"]
    street = parts[0];
    const secondPart = parts[1];
    const hyphenIdx = secondPart.indexOf(' - ');
    if (hyphenIdx !== -1) {
      neighborhood = secondPart.substring(0, hyphenIdx).trim();
      city = secondPart.substring(hyphenIdx + 3).trim();
    } else {
      city = secondPart;
    }
    // Tenta extrair número do street
    const numInStreet = street.match(/,\s*(\d+[A-Za-z]?)\s*$/);
    if (numInStreet) {
      number = numInStreet[1];
      street = street.substring(0, street.lastIndexOf(numInStreet[0])).trim();
    }
  } else {
    // Só uma parte - tenta dividir por hífen
    const hyphenIdx = working.indexOf(' - ');
    if (hyphenIdx !== -1) {
      street = working.substring(0, hyphenIdx).trim();
      neighborhood = working.substring(hyphenIdx + 3).trim();
    } else {
      street = working;
    }
  }

  // Limpa vírgulas e hífens residuais dos campos
  street = street.replace(/^[\s,-]+|[\s,-]+$/g, '').trim();
  number = number.replace(/^[\s,-]+|[\s,-]+$/g, '').trim();
  neighborhood = neighborhood.replace(/^[\s,-]+|[\s,-]+$/g, '').trim();
  city = city.replace(/^[\s,-]+|[\s,-]+$/g, '').trim();

  return { street, number, neighborhood, city, state, cep };
};

const extractCoordsFromUrl = (url: string) => {
  if (!url) return null;
  const match1 = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (match1) {
    return { lat: parseFloat(match1[1]), lng: parseFloat(match1[2]) };
  }
  const match2 = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match2) {
    return { lat: parseFloat(match2[1]), lng: parseFloat(match2[2]) };
  }
  const match3 = url.match(/query=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match3) {
    return { lat: parseFloat(match3[1]), lng: parseFloat(match3[2]) };
  }
  return null;
};

const getImportValidationError = (r: ScrapedRestaurant): string | null => {
  const phone = r.phone || '';
  const cleanPhone = phone.replace(/\D/g, '');
  if (!phone.trim() || phone.toLowerCase().includes('sem telefone') || phone.toLowerCase().includes('nao informado') || cleanPhone.length < 8) {
    return 'Número de telefone inválido ou ausente.';
  }
  
  const cep = r.cep || '';
  const cleanCep = cep.replace(/\D/g, '');
  if (!cep.trim() || cleanCep.length !== 8) {
    return 'CEP inválido ou ausente (deve conter 8 dígitos).';
  }

  const address = r.address || '';
  const neighborhood = r.neighborhood || '';
  if (!address.trim()) {
    return 'O endereço (rua) é obrigatório.';
  }
  if (address.toLowerCase() === 's/n' || address.toLowerCase() === 'sem numero') {
    return 'O nome da rua é inválido.';
  }
  if (neighborhood.trim() && address.trim().toLowerCase() === neighborhood.trim().toLowerCase()) {
    return 'O endereço não pode ser idêntico ao bairro.';
  }

  let lat = r.latitude;
  let lng = r.longitude;
  if ((lat === null || lat === undefined || lat === 0) && r.googleMapsUrl) {
    const coords = extractCoordsFromUrl(r.googleMapsUrl);
    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
    }
  }

  if (!lat || !lng || lat === 0 || lng === 0) {
    return 'Coordenadas geográficas inválidas ou não encontradas.';
  }

  return null;
};

const cleanCityName = (cityName?: string) => {
  if (!cityName) return '';
  return cityName.replace(/\s*-\s*[A-Z]{2}$/i, '').trim();
};

const cleanScrapedRestaurant = (p: any) => {
  const name = cleanRestaurantName(p.name || 'Sem Nome');
  const cityVal = cleanCityName(p.city || 'João Pessoa');

  return {
    ...p,
    name,
    city: cityVal
  };
};

const ESTADOS_BRASIL = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' }
];

const base64ToBlob = (base64DataUrl: string): Blob => {
  const arr = base64DataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

export default function GoogleMapsCollector() {
  const [city, setCity] = useState('João Pessoa');
  const [runnerConnected, setRunnerConnected] = useState(false);
  const [runnerRunning, setRunnerRunning] = useState(false);
  const [runnerLogs, setRunnerLogs] = useState('');
  const [autoImport, setAutoImport] = useState(true);
  const [serverHasSavedState, setServerHasSavedState] = useState(false);
  const terminalLogsRef = useRef<HTMLDivElement>(null);
  const prevRunningRef = useRef(false);
  const [state, setState] = useState('PB');
  const [minReviews, setMinReviews] = useState('0');
  const [customQuery, setCustomQuery] = useState('');
  const [searchMethod, setSearchMethod] = useState<'simple' | 'grid'>('grid');
  const [gridDensity, setGridDensity] = useState<'low' | 'medium' | 'high' | 'ultra' | 'extreme'>('medium');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ScrapedRestaurant[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCity, setFilterCity] = useState('all');
  const [importedKeys, setImportedKeys] = useState<Map<string, string>>(new Map());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isViewingDb, setIsViewingDb] = useState(true);
  const isViewingDbRef = useRef(isViewingDb);

  useEffect(() => {
    isViewingDbRef.current = isViewingDb;
  }, [isViewingDb]);


  // Estados para Varredura em Lote e Persistência
  const [activeScan, setActiveScan] = useState<{
    city: string;
    state: string;
    minReviews: string;
    customQuery: string;
    searchMethod: 'simple' | 'grid';
    gridDensity: 'low' | 'medium' | 'high' | 'ultra' | 'extreme';
    tracePoints: { name: string; lat: number; lng: number }[];
    currentPointIdx: number;
    gatheredResults: Omit<ScrapedRestaurant, 'id'>[];
    seenPlaceIds: string[];
    isPaused: boolean;
  } | null>(null);
  const [hasSavedScan, setHasSavedScan] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<ScrapedRestaurant | null>(null);
  const [loadingRebusca, setLoadingRebusca] = useState<Record<string, boolean>>({});
  const [isValidatingAll, setIsValidatingAll] = useState(false);
  const cancelValidationAllRef = useRef(false);

  const [citiesList, setCitiesList] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    if (!state) {
      setCitiesList([]);
      return;
    }
    
    let isMounted = true;
    const fetchCities = async () => {
      setLoadingCities(true);
      try {
        const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${state}/municipios?orderBy=nome`);
        if (response.ok && isMounted) {
          const data = await response.json();
          const names = data.map((c: any) => c.nome);
          setCitiesList(names);
          
          // Se a cidade atual não estiver na lista de cidades do novo estado, seleciona a primeira da lista
          if (names.length > 0 && !names.includes(city)) {
            setCity(names[0]);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar cidades do IBGE:", err);
      } finally {
        if (isMounted) setLoadingCities(false);
      }
    };

    fetchCities();
    return () => {
      isMounted = false;
    };
  }, [state]);

  const [extensionId, setExtensionId] = useState(() => localStorage.getItem('chrome_extension_id') || '');
  const [isExtensionActive, setIsExtensionActive] = useState(false);
  const [userGeminiKey, setUserGeminiKey] = useState(() => localStorage.getItem('user_gemini_key') || '');
  const [userOpenaiKey, setUserOpenaiKey] = useState(() => localStorage.getItem('user_openai_key') || '');

  useEffect(() => {
    const checkConnection = async () => {
      if (!extensionId) {
        setIsExtensionActive(false);
        return;
      }
      const chromeObj = (window as any).chrome;
      if (!chromeObj || !chromeObj.runtime || !chromeObj.runtime.sendMessage) {
        setIsExtensionActive(false);
        return;
      }
      try {
        chromeObj.runtime.sendMessage(extensionId, { action: "ping" }, (response: any) => {
          if (chromeObj.runtime.lastError) {
            setIsExtensionActive(false);
          } else {
            setIsExtensionActive(!!(response && response.success));
          }
        });
      } catch (e) {
        setIsExtensionActive(false);
      }
    };
    checkConnection();
  }, [extensionId]);

  const testExtensionConnection = async () => {
    if (!extensionId) {
      showError("Por favor, configure o ID da extensão primeiro.");
      return;
    }
    const chromeObj = (window as any).chrome;
    if (!chromeObj || !chromeObj.runtime || !chromeObj.runtime.sendMessage) {
      showError("Este navegador não suporta a extensão do Chrome ou a API de mensageria.");
      return;
    }
    try {
      chromeObj.runtime.sendMessage(extensionId, { action: "ping" }, (response: any) => {
        const lastError = chromeObj.runtime.lastError;
        if (lastError) {
          setIsExtensionActive(false);
          showError("Extensão não encontrada ou inativa. Verifique o ID e se ela está ativada.");
        } else if (response && response.success) {
          setIsExtensionActive(true);
          showSuccess("Conexão com a extensão estabelecida com sucesso!");
        } else {
          setIsExtensionActive(false);
          showError("A extensão respondeu com erro.");
        }
      });
    } catch (e: any) {
      setIsExtensionActive(false);
      showError("Erro de conexão: " + e.message);
    }
  };

  const handleSaveExtensionId = () => {
    localStorage.setItem('chrome_extension_id', extensionId.trim());
    showSuccess("ID da extensão salvo neste navegador!");
    testExtensionConnection();
  };

  const handleSaveApiKeys = () => {
    localStorage.setItem('user_gemini_key', userGeminiKey.trim());
    localStorage.setItem('user_openai_key', userOpenaiKey.trim());
    showSuccess("Chaves de API salvas localmente neste navegador!");
  };

  const handleDownloadExtension = () => {
    const link = document.createElement('a');
    link.href = '/chrome-extension.zip';
    link.download = 'chrome-extension.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess("Download da extensão iniciado!");
  };

  const handleRebusca = async (restaurantId: string, field: 'instagram' | 'menu' | 'hours' | 'scrape-menu' | 'scrape-logo' | 'ai-validation'): Promise<boolean> => {
    const key = `${restaurantId}-${field}`;
    if (loadingRebusca[key]) return false;
    
    setLoadingRebusca(prev => ({ ...prev, [key]: true }));
    const fieldLabel = field === 'instagram' ? 'Instagram' : field === 'menu' ? 'Cardápio' : field === 'scrape-menu' ? 'Coleta de Cardápio' : field === 'scrape-logo' ? 'Coleta de Logo' : field === 'ai-validation' ? 'Filtro IA' : 'Horários';
    showSuccess(`Iniciando rebusca de ${fieldLabel} no servidor...`);
    
    try {
      if (field === 'ai-validation' && isExtensionActive && extensionId) {
        const rest = results.find(r => r.id === restaurantId);
        let mapUrl = '';
        if (rest) {
          if (rest.googleMapsUrl) mapUrl = rest.googleMapsUrl;
          else if (rest.visit_notes) {
            const match = rest.visit_notes.match(/https:\/\/[^\s\n]*google[^\s\n]*\/maps[^\s\n]*/i) || rest.visit_notes.match(/https:\/\/[^\s\n]*maps\.app\.goo\.gl[^\s\n]*/i) || rest.visit_notes.match(/Google Maps:\s*(https:\/\/[^\s\n]*)/i);
            if (match && match[0]) mapUrl = match[1] || match[0];
          }
        }

        // ═══════════════════════════════════════════════════════════════
        // PASSO 1: Extrair dados do Google Maps (usando o link já salvo)
        // ═══════════════════════════════════════════════════════════════
        let mapsData: any = null;
        let activeInstagramUrl = '';
        let instagramBio = '';
        let instagramFollowers = 0;
        let logoPublicUrl = '';
        let highlightPublicUrls: string[] = [];

        if (mapUrl) {
          showSuccess(`📍 PASSO 1/5: Acessando Google Maps para extrair dados oficiais...`);
          try {
            const extRes = await new Promise<any>((resolve) => {
              const chromeObj = (window as any).chrome;
              if (chromeObj && chromeObj.runtime) {
                chromeObj.runtime.sendMessage(extensionId, { action: "scrapeGoogleHours", query: rest?.name || '', mapUrl }, (response: any) => {
                  resolve(response);
                });
              } else {
                resolve({ success: false });
              }
            });
            
            if (extRes && extRes.success) {
              mapsData = extRes;
              
              // Salva horários no banco imediatamente
              if (extRes.schedule) {
                showSuccess('✅ Horários encontrados no Google Maps! Salvando...');
                await supabase.from('restaurants').update({ opening_hours: extRes.schedule }).eq('id', restaurantId);
              }
              
              // Salva endereço oficial se encontrado (com parsing em campos separados + coordenadas)
              if (extRes.address) {
                showSuccess(`✅ Endereço oficial encontrado: ${extRes.address}`);
                const parsedAddr = parseGoogleMapsAddress(extRes.address);
                const addrUpdate: any = { address: parsedAddr.street };
                if (parsedAddr.number) addrUpdate.number = parsedAddr.number;
                if (parsedAddr.neighborhood) addrUpdate.neighborhood = parsedAddr.neighborhood;
                if (parsedAddr.city) addrUpdate.city = parsedAddr.city;
                if (parsedAddr.state) addrUpdate.state = parsedAddr.state;
                if (parsedAddr.cep) addrUpdate.cep = parsedAddr.cep;
                
                // Extrai coordenadas da URL do Google Maps
                let coords = extractCoordsFromUrl(mapUrl);
                if (coords) {
                  addrUpdate.latitude = coords.lat;
                  addrUpdate.longitude = coords.lng;
                  showSuccess(`📍 Coordenadas extraídas do Maps: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
                } else {
                  // Fallback: geocoding via Nominatim usando o endereço completo
                  try {
                    const geocoded = await geocodeAddress(extRes.address);
                    if (geocoded) {
                      addrUpdate.latitude = geocoded.lat;
                      addrUpdate.longitude = geocoded.lon;
                      showSuccess(`📍 Coordenadas obtidas via geocoding: ${geocoded.lat.toFixed(6)}, ${geocoded.lon.toFixed(6)}`);
                    }
                  } catch (geoErr) {
                    console.error('Erro no geocoding:', geoErr);
                  }
                }
                
                await supabase.from('restaurants').update(addrUpdate).eq('id', restaurantId);
              }
              
              // Salva telefone se encontrado
              if (extRes.phone) {
                showSuccess(`✅ Telefone encontrado: ${extRes.phone}`);
                await supabase.from('restaurants').update({ phone: extRes.phone }).eq('id', restaurantId);
              }
              
              // Salva site oficial se encontrado
              if (extRes.website) {
                showSuccess(`✅ Site oficial encontrado: ${extRes.website}`);
                await supabase.from('restaurants').update({ website: extRes.website }).eq('id', restaurantId);
              }
              
              // Se encontrou Instagram no Maps, salva
              if (extRes.socialLinks && extRes.socialLinks.length > 0) {
                const instaFromMaps = extRes.socialLinks.find((s: any) => s.platform === 'instagram');
                if (instaFromMaps) {
                  showSuccess(`✅ Instagram encontrado no Google Maps: ${instaFromMaps.url}`);
                  activeInstagramUrl = instaFromMaps.url;
                  // Salva no social_networks
                  const currentSocials = rest?.social_networks || [];
                  const cleanSocials = currentSocials.filter((s: any) => s && s.platform !== 'instagram');
                  cleanSocials.push({ platform: 'instagram', url: instaFromMaps.url });
                  await supabase.from('restaurants').update({ social_networks: cleanSocials, instagram: instaFromMaps.url }).eq('id', restaurantId);
                }
              }
            } else {
              showError('⚠️ Não foi possível extrair dados do Google Maps. Continuando...');
            }
          } catch (err) {
            console.error('Erro ao extrair dados do Maps:', err);
            showError('⚠️ Erro ao acessar Google Maps. Continuando...');
          }
        } else {
          showError('⚠️ Link do Google Maps não encontrado no cadastro. Pulando PASSO 1.');
        }

        // ═══════════════════════════════════════════════════════════════
        // PASSO 2: Busca contexto complementar no Google
        // ═══════════════════════════════════════════════════════════════
        showSuccess('🔍 PASSO 2/5: Buscando contexto complementar no Google...');
        const query = `${rest?.name} ${rest?.city || ''} ${rest?.state || ''} cardapio instagram telefone`;
        
        let googleSearchResults = null;
        try {
          googleSearchResults = await new Promise((resolve) => {
            const chromeObj = (window as any).chrome;
            if (chromeObj && chromeObj.runtime) {
              chromeObj.runtime.sendMessage(extensionId, { action: "searchGoogleNative", query }, (response: any) => {
                if (response && response.success && response.results) resolve(response.results);
                else resolve(null);
              });
            } else resolve(null);
          });
        } catch(e) {}

        if (!googleSearchResults || (googleSearchResults as any[])?.length === 0) {
           showError('Busca nativa no Google falhou. Prosseguindo sem contexto extra...');
        } else {
           showSuccess(`✅ Coletados ${(googleSearchResults as any[]).length} resultados do Google Nativo.`);
        }

        // ═══════════════════════════════════════════════════════════════
        // PASSO 3: Envia para IA (Fase 5) validar e corrigir dados
        // ═══════════════════════════════════════════════════════════════
        showSuccess('🤖 PASSO 3/5: Enviando para Validação IA no Servidor...');
        const fetchOptions: RequestInit = { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            googleSearchResults,
            instagramContext: instagramBio,
            instagramHighlights: highlightPublicUrls,
            mapsData: mapsData ? { address: mapsData.address, phone: mapsData.phone, website: mapsData.website, socialLinks: mapsData.socialLinks } : null
          })
        };
        
        const valRes = await fetch(`/api/local-collector/re-ai-validation?restaurantId=${restaurantId}&origin=${encodeURIComponent(window.location.origin)}`, fetchOptions);
        
        if (valRes.ok) {
          const valData = await valRes.json();
          if (valData.success) {
            showSuccess(`✅ Validação IA concluída com Sucesso!`);
          } else {
            showError(`⚠️ Validação IA: ${valData.error || 'Divergência de dados.'}`);
          }
        } else {
          showError('⚠️ Erro no servidor ao executar Validação IA. Continuando...');
        }

        // ═══════════════════════════════════════════════════════════════
        // PASSO 4: Buscar e Validar Instagram
        // ═══════════════════════════════════════════════════════════════
        // Recarrega os dados do restaurante do Supabase (pode ter sido atualizado pela IA)
        const { data: updatedRest } = await supabase.from('restaurants').select('*').eq('id', restaurantId).single();
        const currentInsta = updatedRest?.social_networks?.find((s: any) => s && s.platform === 'instagram' && s.url)?.url || updatedRest?.instagram || activeInstagramUrl;
        
        // Valida se o Instagram é realmente uma URL válida (não "Não localizado", "ausente", etc.)
        const isValidInstagramUrl = (url: string | null | undefined): boolean => {
          if (!url || url.trim() === '') return false;
          const lower = url.toLowerCase().trim();
          const invalidValues = ['não localizado', 'nao localizado', 'não encontrado', 'nao encontrado', 'ausente', 'n/a', 'null', 'undefined', 'none', 'sem instagram', 'indisponível', 'indisponivel'];
          if (invalidValues.some(inv => lower.includes(inv))) return false;
          if (!lower.includes('instagram.com/')) return false;
          if (lower.includes('instagram.com/undefined')) return false;
          if (lower.includes('instagram.com/null')) return false;
          // Verifica se tem um username real após instagram.com/
          const match = lower.match(/instagram\.com\/([a-z0-9._]+)/);
          if (!match || match[1].length < 2) return false;
          return true;
        };
        
        if (isValidInstagramUrl(currentInsta)) {
          // Já tem Instagram cadastrado — raspa diretamente
          showSuccess(`📸 PASSO 4/5: Raspando Instagram já cadastrado: ${currentInsta}...`);
          try {
            const scrapeRes = await new Promise<any>((resolve) => {
              const chromeObj = (window as any).chrome;
              chromeObj.runtime.sendMessage(extensionId, { action: "scrapeInstagram", instagramUrl: currentInsta }, (res: any) => resolve(res));
            });
            if (scrapeRes && scrapeRes.success) {
              activeInstagramUrl = currentInsta;
              instagramBio = scrapeRes.bio || '';
              instagramFollowers = scrapeRes.followers || 0;
              
              // Upload Logo
              if (scrapeRes.logoDataUrl) {
                try {
                  const blob = base64ToBlob(scrapeRes.logoDataUrl);
                  const mime = blob.type;
                  let ext = 'jpg';
                  if (mime.includes('png')) ext = 'png';
                  else if (mime.includes('webp')) ext = 'webp';
                  
                  const storagePath = `logos/${restaurantId}_logo.${ext}`;
                  const { error: uploadError } = await supabase.storage
                    .from('restaurant-images')
                    .upload(storagePath, blob, { contentType: mime, upsert: true });
                  
                  if (!uploadError) {
                    const { data: { publicUrl } } = supabase.storage.from('restaurant-images').getPublicUrl(storagePath);
                    logoPublicUrl = publicUrl;
                  }
                } catch(e) {
                  console.error('Erro ao fazer upload da logo:', e);
                }
              }

              // Upload Highlights
              if (scrapeRes.highlightImages && scrapeRes.highlightImages.length > 0) {
                showSuccess(`Coletados ${scrapeRes.highlightImages.length} destaques de cardápio! Fazendo upload...`);
                for (let idx = 0; idx < scrapeRes.highlightImages.length; idx++) {
                  try {
                    const base64Str = scrapeRes.highlightImages[idx];
                    const blob = base64ToBlob(base64Str);
                    const storagePath = `highlights/${restaurantId}/highlight_${idx}_${Date.now()}.jpg`;
                    const { error: uploadError } = await supabase.storage
                      .from('restaurant-images')
                      .upload(storagePath, blob, { contentType: 'image/jpeg', upsert: true });
                    
                    if (!uploadError) {
                      const { data: { publicUrl } } = supabase.storage.from('restaurant-images').getPublicUrl(storagePath);
                      highlightPublicUrls.push(publicUrl);
                    }
                  } catch(e) {
                    console.error('Erro ao subir destaque:', e);
                  }
                }
              }
              
              // Salva logo e seguidores no banco
              const updates: any = {};
              if (logoPublicUrl) updates.image_url = logoPublicUrl;
              const currentSocials = updatedRest?.social_networks || [];
              const cleanSocials = currentSocials.filter((s: any) => s && s.platform !== 'instagram');
              cleanSocials.push({ platform: 'instagram', url: activeInstagramUrl, followers: instagramFollowers });
              updates.social_networks = cleanSocials;
              updates.instagram = activeInstagramUrl;
              await supabase.from('restaurants').update(updates).eq('id', restaurantId);
              showSuccess(`✅ Instagram coletado! Logo e ${instagramFollowers} seguidores salvos.`);
            } else {
              showError('⚠️ Falha ao raspar perfil do Instagram.');
            }
          } catch(e) {
            console.error('Erro ao raspar Instagram:', e);
          }
        } else {
          // Sem Instagram: busca 3 candidatos no Google e envia para IA validar
          showSuccess('📸 PASSO 4/5: Sem Instagram cadastrado. Buscando 3 candidatos no Google...');
          const instaQuery = `${rest?.name} ${rest?.city || 'João Pessoa'} instagram`;
          
          // Busca 3 candidatos de uma vez
          const searchResult = await new Promise<any>((resolve) => {
            const chromeObj = (window as any).chrome;
            chromeObj.runtime.sendMessage(extensionId, { action: "searchGoogleForInstagram", query: instaQuery, blocklist: [] }, (res: any) => resolve(res));
          });

          if (!searchResult || !searchResult.success || !searchResult.candidates || searchResult.candidates.length === 0) {
            showError('⚠️ Nenhum candidato de Instagram encontrado no Google.');
          } else {
            const candidates = searchResult.candidates;
            showSuccess(`🔍 ${candidates.length} candidato(s) encontrado(s): ${candidates.join(', ')}`);
            
            // Raspa a bio de cada candidato
            const candidatesWithBio: Array<{ url: string; bio: string; followers: number; logoDataUrl?: string; highlightImages?: string[] }> = [];
            for (const candidateUrl of candidates) {
              showSuccess(`Raspando perfil: ${candidateUrl}...`);
              try {
                const scrapeRes = await new Promise<any>((resolve) => {
                  const chromeObj = (window as any).chrome;
                  chromeObj.runtime.sendMessage(extensionId, { action: "scrapeInstagram", instagramUrl: candidateUrl }, (res: any) => resolve(res));
                });
                if (scrapeRes && scrapeRes.success && !scrapeRes.isLoginRequired) {
                  candidatesWithBio.push({
                    url: candidateUrl,
                    bio: scrapeRes.bio || 'Sem bio',
                    followers: scrapeRes.followers || 0,
                    logoDataUrl: scrapeRes.logoDataUrl,
                    highlightImages: scrapeRes.highlightImages
                  });
                } else {
                  showError(`Falha ao raspar ${candidateUrl}. Pulando...`);
                }
              } catch(e) {
                console.error('Erro ao raspar candidato:', e);
              }
            }

            if (candidatesWithBio.length === 0) {
              showError('⚠️ Nenhum candidato pôde ser raspado com sucesso.');
            } else {
              // Envia todos os candidatos para a IA validar qual é o correto
              showSuccess(`🧠 Enviando ${candidatesWithBio.length} candidato(s) para IA validar...`);
              const valCheckOptions = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  candidates: candidatesWithBio.map(c => ({ url: c.url, bio: c.bio, followers: c.followers })),
                  restaurantName: rest?.name || '',
                  restaurantCity: rest?.city || 'João Pessoa',
                  restaurantAddress: updatedRest?.address || rest?.address || ''
                })
              };
              const valCheckRes = await fetch(`/api/local-collector/validate-instagram?restaurantId=${restaurantId}`, valCheckOptions);
              
              if (valCheckRes.ok) {
                const valCheckData = await valCheckRes.json();
                if (valCheckData.success && valCheckData.isValid && valCheckData.selectedUrl) {
                  const selectedCandidate = candidatesWithBio.find(c => c.url === valCheckData.selectedUrl) || candidatesWithBio[0];
                  showSuccess(`🎉 Instagram Confirmado pela IA: ${valCheckData.selectedUrl}`);
                  activeInstagramUrl = valCheckData.selectedUrl;
                  instagramBio = selectedCandidate.bio || '';
                  instagramFollowers = selectedCandidate.followers || 0;
                  
                  // Upload Logo
                  if (selectedCandidate.logoDataUrl) {
                    try {
                      const blob = base64ToBlob(selectedCandidate.logoDataUrl);
                      const mime = blob.type;
                      let ext = 'jpg';
                      if (mime.includes('png')) ext = 'png';
                      else if (mime.includes('webp')) ext = 'webp';
                      
                      const storagePath = `logos/${restaurantId}_logo.${ext}`;
                      const { error: uploadError } = await supabase.storage
                        .from('restaurant-images')
                        .upload(storagePath, blob, { contentType: mime, upsert: true });
                      
                      if (!uploadError) {
                        const { data: { publicUrl } } = supabase.storage.from('restaurant-images').getPublicUrl(storagePath);
                        logoPublicUrl = publicUrl;
                      }
                    } catch(e) {
                      console.error('Erro ao fazer upload da logo:', e);
                    }
                  }

                  // Upload Highlights
                  if (selectedCandidate.highlightImages && selectedCandidate.highlightImages.length > 0) {
                    showSuccess(`Coletados ${selectedCandidate.highlightImages.length} destaques! Fazendo upload...`);
                    for (let idx = 0; idx < selectedCandidate.highlightImages.length; idx++) {
                      try {
                        const base64Str = selectedCandidate.highlightImages[idx];
                        const blob = base64ToBlob(base64Str);
                        const storagePath = `highlights/${restaurantId}/highlight_${idx}_${Date.now()}.jpg`;
                        const { error: uploadError } = await supabase.storage
                          .from('restaurant-images')
                          .upload(storagePath, blob, { contentType: 'image/jpeg', upsert: true });
                        
                        if (!uploadError) {
                          const { data: { publicUrl } } = supabase.storage.from('restaurant-images').getPublicUrl(storagePath);
                          highlightPublicUrls.push(publicUrl);
                        }
                      } catch(e) {}
                    }
                  }

                  // Salva no banco
                  const updates: any = {};
                  if (logoPublicUrl) updates.image_url = logoPublicUrl;
                  const currentSocials2 = updatedRest?.social_networks || [];
                  const cleanSocials2 = currentSocials2.filter((s: any) => s && s.platform !== 'instagram');
                  cleanSocials2.push({ platform: 'instagram', url: activeInstagramUrl, followers: instagramFollowers });
                  updates.social_networks = cleanSocials2;
                  updates.instagram = activeInstagramUrl;
                  await supabase.from('restaurants').update(updates).eq('id', restaurantId);
                  showSuccess(`✅ Instagram salvo com sucesso! Logo e ${instagramFollowers} seguidores.`);
                } else {
                  showError(`⚠️ IA não confirmou nenhum dos candidatos como Instagram oficial.`);
                }
              } else {
                showError('⚠️ Erro ao validar candidatos no servidor.');
              }
            }
          }
        }

        // ═══════════════════════════════════════════════════════════════
        // PASSO 5: Extração de Cardápio (Instagram bio/destaques → Google Maps)
        // ═══════════════════════════════════════════════════════════════
        showSuccess('🍽️ PASSO 5/5: Extraindo cardápio (Instagram → Google Maps)...');
        try {
          const menuResp = await fetch('/api/local-collector/extract-menu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ restaurantId })
          });
          const menuResult = await menuResp.json();
          if (menuResult.success) {
            showSuccess(`✅ Cardápio extraído com sucesso! ${menuResult.message || ''}`);
          } else {
            showError(`⚠️ Cardápio: ${menuResult.message || 'Nenhum item encontrado nas fontes disponíveis.'}`);
          }
        } catch (menuErr: any) {
          showError(`⚠️ Erro ao extrair cardápio: ${menuErr.message}`);
        }

        // ═══════════════════════════════════════════════════════════════
        // PASSO 6: Finalização - Recarrega dados e notifica interface
        // ═══════════════════════════════════════════════════════════════
        showSuccess('🏁 Processo concluído! Atualizando interface...');
        loadScrapedFromSupabase();
        window.dispatchEvent(new Event('local-sync-restaurants'));
        return true;
      } else if (field === 'hours' && isExtensionActive && extensionId) {
        const rest = results.find(r => r.id === restaurantId);
        if (rest) {
          showSuccess(`Buscando horários via Extensão Chrome para: ${rest.name}...`);
          const query = `${rest.name} ${rest.city || ''} João Pessoa`;
          let mapUrl = '';
          if (rest.googleMapsUrl) mapUrl = rest.googleMapsUrl;
          else if (rest.visit_notes) {
            const match = rest.visit_notes.match(/https:\/\/[^\s\n]*google[^\s\n]*\/maps[^\s\n]*/i) || rest.visit_notes.match(/https:\/\/[^\s\n]*maps\.app\.goo\.gl[^\s\n]*/i) || rest.visit_notes.match(/Google Maps:\s*(https:\/\/[^\s\n]*)/i);
            if (match && match[0]) mapUrl = match[1] || match[0];
          }
          
          try {
            const extRes = await new Promise<any>((resolve) => {
              const chromeObj = (window as any).chrome;
              if (chromeObj && chromeObj.runtime) {
                chromeObj.runtime.sendMessage(extensionId, { action: "scrapeGoogleHours", query, mapUrl }, (response: any) => {
                  resolve(response);
                });
              } else {
                resolve({ success: false, error: "Extensão não disponível." });
              }
            });
            
            if (extRes && extRes.success && extRes.schedule) {
              showSuccess(`Horários encontrados no Maps! Salvando no banco de dados...`);
              const { error: updateError } = await supabase
                .from('restaurants')
                .update({ opening_hours: extRes.schedule })
                .eq('id', rest.id);
              
              if (!updateError) {
                showSuccess(`Horários atualizados com sucesso!`);
                loadScrapedFromSupabase();
                window.dispatchEvent(new Event('local-sync-restaurants'));
                return true;
              } else {
                showError("Erro ao salvar os horários no banco de dados: " + updateError.message);
                return false;
              }
            } else {
              showError(`Extensão não encontrou horários no Google Maps: ${extRes?.error || 'Tente novamente.'}`);
              return false;
            }
          } catch (err) {
            console.error('Erro ao acionar extensão para horários:', err);
          }
        }
      } else if (field === 'instagram' && isExtensionActive && extensionId) {
        const rest = results.find(r => r.id === restaurantId);
        if (rest) {
          showSuccess(`Buscando Instagram para: ${rest.name}...`);
          let instagramUrl = '';
          const instaObj = rest.social_networks?.find((s: any) => s && s.platform === 'instagram' && s.url);
          if (instaObj) instagramUrl = instaObj.url;
          
          const chromeObj = (window as any).chrome;
          if (!instagramUrl) {
            const query = `${rest.name} ${rest.city || ''} instagram`;
            const searchRes = await new Promise<any>((resolve) => {
              chromeObj.runtime.sendMessage(extensionId, { action: "searchGoogleForInstagram", query }, (res) => resolve(res));
            });
            if (searchRes && searchRes.success && searchRes.url) {
              instagramUrl = searchRes.url;
            }
          }
          
          if (instagramUrl) {
            showSuccess(`Instagram encontrado: ${instagramUrl}. Raspando bio...`);
            const scrapeRes = await new Promise<any>((resolve) => {
              chromeObj.runtime.sendMessage(extensionId, { action: "scrapeInstagram", instagramUrl }, (res) => resolve(res));
            });
            
            if (scrapeRes && scrapeRes.success) {
              showSuccess(`Instagram raspado! Validando...`);
              const valRes = await fetch(`/api/local-collector/validate-instagram?restaurantId=${restaurantId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ instagramUrl, instagramContext: scrapeRes.bio || '' })
              });
              
              if (valRes.ok) {
                const valData = await valRes.json();
                if (valData.success && valData.isValid) {
                  showSuccess(`Instagram validado! Gravando no banco...`);
                  let finalLogoUrl = null;
                  if (scrapeRes.logoDataUrl) {
                    try {
                      const base64Response = await fetch(scrapeRes.logoDataUrl);
                      const blob = await base64Response.blob();
                      const fileName = `logo_${Date.now()}.jpg`;
                      const filePath = `brands/${restaurantId}/${fileName}`;
                      const { error: uploadError } = await supabase.storage.from('restaurant-images').upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });
                      if (!uploadError) {
                        const { data: { publicUrl } } = supabase.storage.from('restaurant-images').getPublicUrl(filePath);
                        finalLogoUrl = publicUrl;
                      }
                    } catch(e) {}
                  }
                  
                  const updates: any = {};
                  if (finalLogoUrl) updates.image_url = finalLogoUrl;
                  
                  const newSocials = rest.social_networks ? [...rest.social_networks] : [];
                  const cleanSocials = newSocials.filter((s: any) => s && s.platform !== 'instagram');
                  cleanSocials.push({ platform: 'instagram', url: instagramUrl, followers: scrapeRes.followers });
                  updates.social_networks = cleanSocials;
                  
                  await supabase.from('restaurants').update(updates).eq('id', restaurantId);
                  showSuccess('Instagram e Logo gravados com sucesso!');
                  loadScrapedFromSupabase();
                  window.dispatchEvent(new Event('local-sync-restaurants'));
                  return true;
                } else {
                  showError(`Instagram rejeitado pela IA: ${valData.reason || 'Divergência.'}`);
                }
              } else {
                showError('Erro ao validar Instagram no servidor.');
              }
            } else {
              showError(`Falha ao raspar perfil do Instagram: ${scrapeRes?.error || 'Tente novamente.'}`);
            }
          } else {
            showError('Nenhum link de Instagram encontrado para este restaurante.');
          }
        }
        return false;
      } else if (field === 'menu' && isExtensionActive && extensionId) {
        const rest = results.find(r => r.id === restaurantId);
        if (rest) {
          showSuccess(`Buscando link do cardápio via Extensão Chrome para: ${rest.name}...`);
          const query = `${rest.name} ${rest.city || ''} cardapio menu`;
          
          try {
            const extRes = await new Promise<any>((resolve) => {
              const chromeObj = (window as any).chrome;
              if (chromeObj && chromeObj.runtime) {
                chromeObj.runtime.sendMessage(extensionId, { action: "searchGoogleForMenu", query }, (response: any) => {
                  resolve(response);
                });
              } else {
                resolve({ success: false, error: "Extensão não disponível." });
              }
            });
            
            if (extRes && extRes.success && extRes.url) {
              showSuccess(`Link do cardápio encontrado: ${extRes.url}. Gravando no banco...`);
              
              const updatePayload: any = {
                other_url: extRes.url,
                external_url: extRes.url
              };
              
              if (extRes.url.includes('wa.me/') || extRes.url.includes('whatsapp.com/send')) {
                const cleanUrl = extRes.url.replace(/[^\d+]/g, '');
                const match = cleanUrl.match(/(\d{10,})/);
                if (match && (!rest.phone || rest.phone.toLowerCase().includes('sem telefone') || rest.phone.trim() === '')) {
                  updatePayload.phone = match[0];
                }
              }
              
              const { error: updateError } = await supabase
                .from('restaurants')
                .update(updatePayload)
                .eq('id', rest.id);
              
              if (!updateError) {
                showSuccess(`Cardápio atualizado com sucesso!`);
                loadScrapedFromSupabase();
                window.dispatchEvent(new Event('local-sync-restaurants'));
                return true;
              } else {
                showError("Erro ao salvar cardápio no banco: " + updateError.message);
                return false;
              }
            } else {
              showError(`Nenhum link de cardápio encontrado: ${extRes?.error || 'Tente outra busca.'}`);
              return false;
            }
          } catch (err) {
            console.error('Erro na extensão ao buscar cardápio:', err);
            return false;
          }
        }
      } else if (field === 'scrape-menu' && isExtensionActive && extensionId) {
        const rest = results.find(r => r.id === restaurantId);
        if (rest) {
          const menuUrl = rest.other_url || rest.external_url;
          if (!menuUrl || !menuUrl.startsWith('http')) {
            showError("O restaurante não possui link de cardápio válido cadastrado.");
            return false;
          }
          
          showSuccess(`Carregando cardápio via Extensão Chrome: ${menuUrl}...`);
          try {
            const extRes = await new Promise<any>((resolve) => {
              const chromeObj = (window as any).chrome;
              if (chromeObj && chromeObj.runtime) {
                chromeObj.runtime.sendMessage(extensionId, { action: "scrapeMenu", url: menuUrl }, (response: any) => {
                  resolve(response);
                });
              } else {
                resolve({ success: false, error: "Extensão não disponível." });
              }
            });
            
            if (extRes && extRes.success) {
              showSuccess("Página do cardápio lida com sucesso! Enviando para processamento no servidor...");
              
              const fetchPayload: any = {};
              if (extRes.parsedMenu) fetchPayload.parsedMenu = extRes.parsedMenu;
              if (extRes.xmlContent) fetchPayload.xmlContent = extRes.xmlContent;
              
              const fetchOptions: RequestInit = { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fetchPayload)
              };
              
              const res = await fetch(`/api/local-collector/re-scrape-menu?restaurantId=${restaurantId}`, fetchOptions);
              if (res.ok) {
                const result = await res.json();
                if (result.success) {
                  showSuccess(`Cardápio coletado e processado com sucesso!`);
                  loadScrapedFromSupabase();
                  window.dispatchEvent(new Event('local-sync-restaurants'));
                  return true;
                } else {
                  showError(result.error || `Erro ao processar cardápio.`);
                  return false;
                }
              } else {
                showError('Erro ao comunicar com o servidor para processar cardápio.');
                return false;
              }
            } else {
              showError(`Extensão falhou ao ler página do cardápio: ${extRes?.error || 'Tente novamente.'}`);
              return false;
            }
          } catch (err) {
            console.error('Erro ao acionar extensão para cardápio:', err);
            showError('Erro ao acionar extensão para cardápio.');
            return false;
          }
        }
      } else if (field === 'scrape-logo' && isExtensionActive && extensionId) {
        const rest = results.find(r => r.id === restaurantId);
        if (rest) {
          const instaObj = rest.social_networks?.find((s: any) => s && s.platform === 'instagram' && s.url);
          const instagramUrl = instaObj?.url;
          
          if (!instagramUrl) {
            showError("O restaurante não possui link de Instagram cadastrado. Busque o Instagram primeiro.");
            return false;
          }
          
          showSuccess(`Coletando logo e seguidores do Instagram via Extensão: ${instagramUrl}...`);
          try {
            const extRes = await new Promise<any>((resolve) => {
              const chromeObj = (window as any).chrome;
              if (chromeObj && chromeObj.runtime) {
                chromeObj.runtime.sendMessage(extensionId, { action: "scrapeInstagram", instagramUrl }, (response: any) => {
                  resolve(response);
                });
              } else {
                resolve({ success: false, error: "Extensão não disponível." });
              }
            });
            
            if (extRes && extRes.success) {
              showSuccess(`Perfil raspado! Enviando para o banco de dados...`);
              
              let finalLogoUrl = null;
              if (extRes.logoDataUrl) {
                try {
                  const base64Response = await fetch(extRes.logoDataUrl);
                  const blob = await base64Response.blob();
                  const fileName = `logo_${Date.now()}.jpg`;
                  const filePath = `brands/${restaurantId}/${fileName}`;
                  
                  const { error: uploadError } = await supabase.storage
                    .from('restaurant-images')
                    .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });
                  
                  if (!uploadError) {
                    const { data: { publicUrl } } = supabase.storage.from('restaurant-images').getPublicUrl(filePath);
                    finalLogoUrl = publicUrl;
                  }
                } catch(e) {
                  console.error('Erro no upload da logo:', e);
                }
              }
              
              const updates: any = {};
              if (finalLogoUrl) updates.image_url = finalLogoUrl;
              
              if (extRes.followers) {
                const newSocials = rest.social_networks.map((s: any) => {
                  if (s && s.platform === 'instagram') {
                    return { ...s, followers: extRes.followers };
                  }
                  return s;
                });
                updates.social_networks = newSocials;
              }
              
              if (Object.keys(updates).length > 0) {
                const { error: updateError } = await supabase
                  .from('restaurants')
                  .update(updates)
                  .eq('id', restaurantId);
                
                if (!updateError) {
                  showSuccess('Logo e seguidores gravados com sucesso!');
                  loadScrapedFromSupabase();
                  window.dispatchEvent(new Event('local-sync-restaurants'));
                  return true;
                } else {
                  showError('Erro ao gravar dados no Supabase: ' + updateError.message);
                  return false;
                }
              } else {
                showSuccess('Nenhuma informação nova para salvar.');
                return true;
              }
            } else {
              showError(`Erro ao raspar Instagram: ${extRes?.error || 'Tente novamente.'}`);
              return false;
            }
          } catch (err) {
            console.error('Erro na extensão ao coletar logo:', err);
            return false;
          }
        }
      }

      // LÓGICA ANTIGA PARA OS DEMAIS BOTÕES
      let endpoint = '';
      if (field === 'instagram') endpoint = '/api/local-collector/re-search-social';
      else if (field === 'menu') endpoint = '/api/local-collector/re-search-menu';
      else if (field === 'scrape-menu') endpoint = '/api/local-collector/re-scrape-menu';
      else if (field === 'scrape-logo') endpoint = '/api/local-collector/re-scrape-logo';
      else if (field === 'ai-validation') endpoint = '/api/local-collector/re-ai-validation'; // Fallback se extensão não ativa
      else endpoint = '/api/local-collector/re-search-hours';
      
      let params = `?restaurantId=${restaurantId}`;
      if (field === 'scrape-logo') {
        const pct = localStorage.getItem('admin_followers_percentage') || '10';
        params += `&pct=${pct}`;
      }
      
      const fetchOptions: RequestInit = { method: 'POST' };
      const res = await fetch(`${endpoint}${params}`, fetchOptions);
      
      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          showSuccess(`Rebusca concluída! ${fieldLabel} atualizado(s).`);
          loadScrapedFromSupabase();
          window.dispatchEvent(new Event('local-sync-restaurants'));
          return true;
        } else {
          showError(result.error || `Não foi possível encontrar ${fieldLabel} para este restaurante.`);
          return false;
        }
      } else {
        const err = await res.json();
        showError(err.error || 'Erro ao executar rebusca no servidor.');
        return false;
      }
    } catch (err) {
      showError('Servidor local offline ou erro de rede.');
      return false;
    } finally {
      setLoadingRebusca(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleValidateAllIA = async () => {
    if (isValidatingAll) {
      cancelValidationAllRef.current = true;
      showSuccess("Cancelando validação em massa após a finalização do item atual...");
      return;
    }

    // Processa os não validados por padrão. Se todos estiverem validados, processa todos para re-validação.
    let targets = results.filter(r => !r.ai_validated);
    if (targets.length === 0) {
      targets = [...results];
    }

    if (targets.length === 0) {
      showError("Nenhum restaurante cadastrado na lista para validar.");
      return;
    }

    setIsValidatingAll(true);
    cancelValidationAllRef.current = false;
    showSuccess(`Iniciando validação sequencial de ${targets.length} restaurantes...`);

    try {
      for (let i = 0; i < targets.length; i++) {
        if (cancelValidationAllRef.current) {
          showSuccess("Validação em massa interrompida pelo usuário.");
          break;
        }

        const r = targets[i];
        showSuccess(`[${i + 1}/${targets.length}] Processando "${r.name}"...`);
        
        const success = await handleRebusca(r.id, 'ai-validation');
        if (!success) {
          console.warn(`[Validação em Massa] Falha na validação de "${r.name}". Continuando...`);
        }

        // Aguarda 1.5s entre requisições
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      if (!cancelValidationAllRef.current) {
        showSuccess("Validação em massa concluída com sucesso!");
      }
    } catch (err: any) {
      showError(`Erro inesperado na validação em massa: ${err.message || err}`);
    } finally {
      setIsValidatingAll(false);
      cancelValidationAllRef.current = false;
    }
  };



  const extractPhoneFromWhatsapp = (url: string) => {
    if (!url) return null;
    let phoneDigits = '';
    
    if (url.includes('wa.me/')) {
      const parts = url.split('wa.me/');
      if (parts[1]) {
        phoneDigits = parts[1].split('?')[0].replace(/\D/g, '');
      }
    } else if (url.includes('whatsapp.com/send')) {
      try {
        const urlObj = new URL(url.replace('/?', '?'));
        const phoneParam = urlObj.searchParams.get('phone');
        if (phoneParam) {
          phoneDigits = phoneParam.replace(/\D/g, '');
        }
      } catch (err) {
        const match = url.match(/[?&]phone=(\d+)/);
        if (match && match[1]) phoneDigits = match[1];
      }
    }
    
    if (phoneDigits && phoneDigits.length >= 10) {
      if (phoneDigits.startsWith('55') && phoneDigits.length > 10) {
        phoneDigits = phoneDigits.substring(2);
      }
      
      if (phoneDigits.length === 11) {
        const ddd = phoneDigits.substring(0, 2);
        const first = phoneDigits.substring(2, 7);
        const second = phoneDigits.substring(7);
        return `(${ddd}) ${first}-${second}`;
      } else if (phoneDigits.length === 10) {
        const ddd = phoneDigits.substring(0, 2);
        const first = phoneDigits.substring(2, 6);
        const second = phoneDigits.substring(6);
        return `(${ddd}) ${first}-${second}`;
      }
      return phoneDigits;
    }
    return null;
  };

  const handleJsonUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const list = JSON.parse(e.target?.result as string);
        if (Array.isArray(list)) {
          const formatted = list.map((item: any, idx: number) => {
            const rawPhone = item.phone || item.telefone || '';
            const websiteUrl = item.website || item.site || '';
            const cardapioUrl = item.menuSourceUrl || item.menuUrl || item.cardapio || '';
            
            let phone = rawPhone;
            if (!phone || phone.toLowerCase().includes('sem telefone') || phone.trim() === '') {
              const waLink = [websiteUrl, cardapioUrl].find(url => url && (url.includes('wa.me/') || url.includes('whatsapp.com/send')));
              if (waLink) {
                const extracted = extractPhoneFromWhatsapp(waLink);
                if (extracted) phone = extracted;
              }
            }

            return {
              id: item.id || `scraped-json-${Date.now()}-${idx}`,
              name: cleanRestaurantName(item.name || item.nome || 'Sem Nome'),
              category: item.category || item.categoria || 'Restaurante',
              rating: typeof item.rating === 'number' ? item.rating : (typeof item.nota === 'number' ? item.nota : 4.0),
              reviewsCount: typeof item.reviewsCount === 'number' ? item.reviewsCount : (typeof item.contagem_de_avaliacoes === 'number' ? item.contagem_de_avaliacoes : 10),
              address: item.address || item.endereco_completo || '',
              phone,
              city: cleanCityName(item.city || item.cidade || 'João Pessoa'),
              state: item.state || item.estado || 'PB',
              instagram: item.instagram || item.midias_sociais?.instagram || '',
              facebook: item.facebook || item.midias_sociais?.facebook || '',
              coverImage: item.coverImage || item.cover_image_url || '',
              galleryImages: item.galleryImages || item.gallery_images || [],
              openingHours: item.openingHours || item.horario_de_funcionamento || {},
              website: websiteUrl,
              googleMapsUrl: item.googleMapsUrl || item.link_google_maps || '',
              menuSourceUrl: cardapioUrl,
              isClosed: item.isClosed || false
            };
          });
          setResults(formatted);
          setCurrentPage(1);
          showSuccess(`${formatted.length} restaurantes carregados do arquivo JSON com sucesso!`);
        } else {
          showError('Formato inválido: O JSON deve ser uma lista (array).');
        }
      } catch (err) {
        showError('Erro ao processar o arquivo JSON.');
      }
    };
    reader.readAsText(file);
  };

  // Formata os resultados da busca e garante que o restaurante do colega "Deda Lanches" esteja sempre presente para João Pessoa.
  // IMPORTANTE: NÃO filtra por avaliações aqui — todos os estabelecimentos reais coletados são armazenados.
  // O filtro de "mínimo de avaliações" é aplicado apenas na exibição da tabela (ver displayedResults abaixo).
  const processAndSetResults = (rawList: Omit<ScrapedRestaurant, 'id'>[], _reviewsLimit: number) => {
    // Mapeia IDs sem nenhum filtro de avaliações — coleta TUDO
    const formatted = rawList.map((p, idx) => {
      const cleaned = cleanScrapedRestaurant(p);
      return {
        ...cleaned,
        id: `scraped-${city.replace(/\s+/g, '-').toLowerCase()}-${idx + 1}`
      };
    });

    // Injeta Deda Lanches se João Pessoa for a cidade e ele não estiver no resultado
    const isJampa = city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes("joao pessoa");
    const hasDeda = formatted.some(r => r.name.toLowerCase().includes("deda lanches") || r.name.toLowerCase().includes("deda"));
    
    if (isJampa && !hasDeda) {
      formatted.unshift({
        id: 'scraped-joao-pessoa-deda-lanches',
        name: 'Deda Lanches',
        category: 'Lanches',
        rating: 4.8,
        reviewsCount: 220,
        address: 'Av. Epitácio Pessoa, 1020 - Tambaú',
        phone: '(83) 99822-1010',
        city: 'João Pessoa',
        state: 'PB',
        instagram: 'https://instagram.com/deda_lanchesoficial',
        facebook: 'https://facebook.com/dedalanches',
        coverImage: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
        galleryImages: [
          'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600',
          'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600'
        ],
        openingHours: {
          monday: { isOpen: false, slots: [] },
          tuesday: { isOpen: true, slots: [{ start: '16:00', end: '23:00' }] },
          wednesday: { isOpen: true, slots: [{ start: '16:00', end: '23:00' }] },
          thursday: { isOpen: true, slots: [{ start: '16:00', end: '23:00' }] },
          friday: { isOpen: true, slots: [{ start: '16:00', end: '23:00' }] },
          saturday: { isOpen: true, slots: [{ start: '16:00', end: '23:00' }] },
          sunday: { isOpen: true, slots: [{ start: '16:00', end: '23:00' }] }
        }
      });
    }

    setResults(formatted);
    setIsViewingDb(false);
  };

  // Reseta o filtro de cidade caso a cidade selecionada não exista nos resultados atuais
  useEffect(() => {
    if (filterCity !== 'all' && !results.some(r => r.city === filterCity)) {
      setFilterCity('all');
    }
  }, [results, filterCity]);
  
  // Carrega varredura interrompida ao iniciar
  useEffect(() => {
    const saved = localStorage.getItem('gmaps_active_scan_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.currentPointIdx < parsed.tracePoints.length) {
          setHasSavedScan(true);
        }
      } catch (e) {
        console.error('Erro ao ler gmaps_active_scan_v2 de inicialização:', e);
      }
    }
  }, []);

  const handleResumeSavedScan = () => {
    try {
      const saved = localStorage.getItem('gmaps_active_scan_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        setCity(parsed.city);
        setState(parsed.state);
        setMinReviews(parsed.minReviews);
        setCustomQuery(parsed.customQuery);
        setSearchMethod(parsed.searchMethod);
        setGridDensity(parsed.gridDensity);
        setScanLogs(parsed.scanLogs || []);
        processAndSetResults(parsed.gatheredResults, parseInt(parsed.minReviews, 10));
        setHasSavedScan(false);

        // Se a varredura foi interrompida no meio do caminho (isPaused: false ou indefinido)
        if (!parsed.isPaused) {
          const updatedScan = {
            ...parsed,
            isPaused: false
          };
          setActiveScan(updatedScan);
          localStorage.setItem('gmaps_active_scan_v2', JSON.stringify(updatedScan));

          const logs = [...(parsed.scanLogs || [])];
          logs.push(`[SISTEMA] ▶ RETOMANDO VARREDURA AUTOMATICAMENTE do ponto ${parsed.currentPointIdx + 1}...`);
          setScanLogs(logs);

          runGridScan(
            parsed.currentPointIdx,
            parsed.tracePoints,
            parsed.gatheredResults,
            new Set(parsed.seenPlaceIds),
            logs
          );
        } else {
          // Se estava pausada explicitamente (por limite de lote de 20 pontos), mostra a interface amarela
          setActiveScan(parsed);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDiscardSavedScan = () => {
    localStorage.removeItem('gmaps_active_scan_v2');
    setHasSavedScan(false);
  };

  // States para Simulação de Log de Varredura por Pontos

  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [scanLogs]);

  // Carrega as missões já importadas do Supabase para evitar duplicidade
  useEffect(() => {
    const loadImportedMissions = async () => {
      try {
        const PAGE_SIZE = 500;
        const allMissions: any[] = [];
        let page = 0;
        let hasMore = true;

        while (hasMore) {
          const from = page * PAGE_SIZE;
          const to = from + PAGE_SIZE - 1;

          const { data, error } = await supabase
            .from('restaurants')
            .select('name, address, is_published')
            .or('is_deleted.eq.false,is_deleted.is.null')
            .range(from, to);

          if (error) throw error;

          if (data && data.length > 0) {
            allMissions.push(...data);
            page++;
          } else {
            hasMore = false;
          }

          if (!data || data.length < PAGE_SIZE) {
            hasMore = false;
          }
        }
        
        const keys = new Map<string, string>();
        allMissions.forEach((r: any) => {
          keys.set(getRestaurantUniqueKey(r.name, r.address), r.is_published === true ? 'true' : 'false');
        });
        setImportedKeys(keys);
      } catch (e) {
        console.error(e);
      }
    };

    loadImportedMissions();

    window.addEventListener('storage', loadImportedMissions);
    window.addEventListener('local-sync-restaurants', loadImportedMissions);
    return () => {
      window.removeEventListener('storage', loadImportedMissions);
      window.removeEventListener('local-sync-restaurants', loadImportedMissions);
    };
  }, []);

  const loadScrapedFromSupabase = async () => {
    try {
      const PAGE_SIZE = 500;
      const allScraped: any[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        // Filtra por cidade diretamente no Supabase (usa o valor com acento)
        const { data, error } = await supabase
          .from('restaurants')
          .select(`
            *,
            menu_categories (
              *,
              menu_items (*)
            ),
            restaurant_gallery (*)
          `)
          .eq('is_published', false)
          .or('is_deleted.eq.false,is_deleted.is.null')
          .ilike('city', `%${city.trim()}%`)
          .order('name')
          .range(from, to);

        if (error) throw error;

        if (data && data.length > 0) {
          allScraped.push(...data);
          page++;
        } else {
          hasMore = false;
        }

        if (!data || data.length < PAGE_SIZE) {
          hasMore = false;
        }
      }
      
      const normalizedCity = city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const filtered = allScraped.filter((item: any) => {
        const itemCity = (item.city || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        return itemCity.includes(normalizedCity) || normalizedCity.includes(itemCity);
      });

      const formatted = filtered.map((item: any) => {
        const socialNetworks = item.social_networks || [];
        const instagram = socialNetworks.find((sn: any) => sn && sn.platform === 'instagram')?.url || '';
        const facebook = socialNetworks.find((sn: any) => sn && sn.platform === 'facebook')?.url || '';
        
        let googleMapsUrl = '';
        const visitNotes = item.visit_notes || '';
        const gmapsMatch = visitNotes.match(/Google Maps:\s*(https?:\/\/[^\s\n\r]+)/);
        if (gmapsMatch) {
          googleMapsUrl = gmapsMatch[1];
        }

        const menuCategories = (item.menu_categories || []).map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          items: (cat.menu_items || []).map((menuItem: any) => ({
            id: menuItem.id,
            name: menuItem.name,
            description: menuItem.description || '',
            price: menuItem.price,
            image_url: menuItem.image_url || ''
          }))
        }));

        const galleryImages = (item.restaurant_gallery || []).map((img: any) => img.image_url);

        return {
          id: item.id,
          name: cleanRestaurantName(item.name),
          category: item.category || 'Restaurante',
          rating: typeof item.rating === 'number' ? item.rating : 4.0,
          reviewsCount: typeof item.reviews_count === 'number' ? item.reviews_count : 10,
          address: item.address || '',
          phone: item.phone || '',
          city: cleanCityName(item.city || 'João Pessoa'),
          state: item.state || 'PB',
          description: item.description || '',
          instagram,
          facebook,
          logo: item.image_url || '',
          coverImage: item.cover_image_url || '',
          followers_override: item.followers_override || null,
          galleryImages,
          openingHours: item.opening_hours || {},
          website: item.other_url || item.external_url || '',
          googleMapsUrl,
          menuSourceUrl: item.other_url || item.external_url || '',
          menu_categories: menuCategories,
          isClosed: false,
          cep: item.cep || '',
          latitude: item.latitude || null,
          longitude: item.longitude || null,
          number: item.number || '',
          neighborhood: item.neighborhood || '',
          ai_validated: item.ai_validated || false,
          ai_log: item.ai_log || ''
        };
      });
      setResults(formatted);
      setEditingRestaurant((prev: any) => {
        if (!prev) return null;
        const updated = formatted.find((r: any) => r.id === prev.id);
        return updated || prev;
      });
      setIsViewingDb(true);
      return formatted;
    } catch (err: any) {
      console.error('Erro ao carregar do Supabase:', err);
      showError(`Erro ao carregar estabelecimentos do Supabase: ${err.message || err}`);
      return null;
    }
  };

  useEffect(() => {
    loadScrapedFromSupabase();

    const handleSync = () => {
      if (isViewingDbRef.current) {
        loadScrapedFromSupabase();
      }
    };

    window.addEventListener('local-sync-restaurants', handleSync);
    return () => {
      window.removeEventListener('local-sync-restaurants', handleSync);
    };
  }, [city]);

  // Efeito para sincronizar status, logs e acionar importações automáticas
  useEffect(() => {
    let intervalId: any;
    
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/local-collector/status');
        if (res.ok) {
          const data = await res.json();
          setRunnerConnected(true);
          setRunnerRunning(data.running);
          setRunnerLogs(data.logs);
          setServerHasSavedState(!!data.hasSavedState);
          
          // Detectar a conclusão de uma tarefa de coleta em segundo plano
          if (prevRunningRef.current === true && data.running === false) {
            const hasFinishedSuccessfully = data.logs.includes('concluída com código de saída: 0') || data.logs.includes('concluído com código de saída: 0');
            if (hasFinishedSuccessfully) {
              showSuccess('Tarefa em segundo plano finalizada com sucesso!');
              loadScrapedFromSupabase();
              // Despacha evento para notificar abas
              window.dispatchEvent(new Event('local-sync-restaurants'));
            } else if (data.logs.includes('código de saída: 1') || data.logs.includes('código de saída: null')) {
              if (data.logs.includes('interrompida pelo usuário')) {
                showSuccess('Coleta interrompida.');
              } else {
                showError('Erro na execução da coleta. Veja os logs.');
              }
            }
          }
          prevRunningRef.current = data.running;
        } else {
          setRunnerConnected(false);
        }
      } catch (err) {
        setRunnerConnected(false);
      }
    };

    checkStatus();
    intervalId = setInterval(checkStatus, 1500);
    return () => clearInterval(intervalId);
  }, []);

  // Efeito separado para rolar o terminal sempre que houver novos logs
  useEffect(() => {
    if (terminalLogsRef.current) {
      terminalLogsRef.current.scrollTop = terminalLogsRef.current.scrollHeight;
    }
  }, [runnerLogs]);

  const importGoogleMapsData = async () => {
    try {
      const res = await fetch('/api/local-collector/scraped-data');
      if (!res.ok) {
        showError('Nenhum dado do Google Maps encontrado no servidor local.');
        return;
      }
      const list = await res.json();
      if (Array.isArray(list)) {
        const formatted = list.map((item: any, idx: number) => {
          const rawPhone = item.phone || item.telefone || '';
          const websiteUrl = item.website || item.site || '';
          const cardapioUrl = item.menuSourceUrl || item.menuUrl || item.cardapio || '';
          
          let phone = rawPhone;
          if (!phone || phone.toLowerCase().includes('sem telefone') || phone.trim() === '') {
            const waLink = [websiteUrl, cardapioUrl].find(url => url && (url.includes('wa.me/') || url.includes('whatsapp.com/send')));
            if (waLink) {
              const extracted = extractPhoneFromWhatsapp(waLink);
              if (extracted) phone = extracted;
            }
          }

          const rawData = {
            id: item.id || `scraped-json-${Date.now()}-${idx}`,
            name: item.name || item.nome || 'Sem Nome',
            category: item.category || item.categoria || 'Restaurante',
            rating: typeof item.rating === 'number' ? item.rating : (typeof item.nota === 'number' ? item.nota : 4.0),
            reviewsCount: typeof item.reviewsCount === 'number' ? item.reviewsCount : (typeof item.contagem_de_avaliacoes === 'number' ? item.contagem_de_avaliacoes : 10),
            address: item.address || item.endereco_completo || '',
            phone,
            city: cleanCityName(item.city || item.cidade || 'João Pessoa'),
            state: item.state || item.estado || 'PB',
            instagram: item.instagram || item.midias_sociais?.instagram || '',
            facebook: item.facebook || item.midias_sociais?.facebook || '',
            coverImage: item.coverImage || item.cover_image_url || '',
            galleryImages: item.galleryImages || item.gallery_images || [],
            openingHours: item.openingHours || item.horario_de_funcionamento || {},
            website: websiteUrl,
            googleMapsUrl: item.googleMapsUrl || item.link_google_maps || '',
            menuSourceUrl: cardapioUrl,
            menu_categories: item.menu_categories || item.categories || [],
            isClosed: item.isClosed || false
          };
          return cleanScrapedRestaurant(rawData);
        });
        setResults(formatted);
        setCurrentPage(1);
        autoImportListToActiveDb(formatted);
      }
    } catch (err) {
      console.error(err);
      showError('Falha ao importar dados do Google Maps automaticamente.');
    }
  };

  const autoImportListToActiveDb = (list: ScrapedRestaurant[]) => {
    try {
      const defaultPlan = localStorage.getItem('admin_default_plan_on_import') || 'premium_gift';
      const savedCompleted = localStorage.getItem('mock-completed-restaurants');
      const completedMap = savedCompleted ? JSON.parse(savedCompleted) : {};

      const savedFallback = localStorage.getItem('mock-supabase-fallback-restaurants');
      const fallbackList = savedFallback ? JSON.parse(savedFallback) : [];

      let importedCount = 0;
      const newImported = new Map(importedKeys);

      for (const restaurant of list) {
        if (dismissedIds.has(restaurant.id)) continue;
        const key = getRestaurantUniqueKey(restaurant.name, restaurant.address);
        if (newImported.get(key) !== 'Visitado') {
          const restaurantId = restaurant.id || `scraped-${key}`;

          completedMap[restaurantId] = {
            id: restaurantId,
            name: restaurant.name,
            plan: defaultPlan,
            phone: restaurant.phone || '',
            address: restaurant.address || '',
            city: restaurant.city || '',
            state: restaurant.state || '',
            description: restaurant.category ? `Especialidade em ${restaurant.category}` : '',
            category: restaurant.category || 'Outros',
            image_url: restaurant.logo || null,
            cover_image_url: restaurant.coverImage || null,
            menu_categories: restaurant.menu_categories || [],
            gallery_images: restaurant.galleryImages && restaurant.galleryImages.length > 0 
              ? restaurant.galleryImages.map((url, idx) => ({ id: `mg-${idx}`, image_url: url, caption: 'Foto do Local', order_index: idx }))
              : [],
            social_networks: [
              { platform: 'instagram', url: restaurant.instagram },
              { platform: 'facebook', url: restaurant.facebook }
            ].filter(s => s.url),
            opening_hours: restaurant.openingHours || null,
            is_published: true,
            menuSourceUrl: restaurant.menuSourceUrl || '',
            googleMapsUrl: restaurant.googleMapsUrl || '',
            website: restaurant.website || ''
          };

          const newRestaurant = {
            id: restaurantId,
            name: restaurant.name,
            plan: defaultPlan as any,
            phone: restaurant.phone || '',
            category: restaurant.category || '',
            address: restaurant.address || '',
            city: restaurant.city || '',
            state: restaurant.state || '',
            claim_code: 'CLAIM-' + restaurantId.substring(0, 5).toUpperCase(),
            is_published: true as const,
            visit_notes: 'Importado diretamente do coletor Google Maps.',
            menuSourceUrl: restaurant.menuSourceUrl || '',
            googleMapsUrl: restaurant.googleMapsUrl || '',
            website: restaurant.website || ''
          };

          fallbackList.unshift(newRestaurant);
          newImported.set(key, 'Visitado');
          importedCount++;
        }
      }

      localStorage.setItem('mock-completed-restaurants', JSON.stringify(completedMap));
      localStorage.setItem('mock-supabase-fallback-restaurants', JSON.stringify(fallbackList));
      setImportedKeys(newImported);

      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('local-sync-restaurants'));

      showSuccess(`Sincronização concluída! ${importedCount} restaurantes importados automaticamente.`);
    } catch (e) {
      console.error(e);
      showError('Erro ao salvar os novos restaurantes importados.');
    }
  };

  const importMenusData = async () => {
    try {
      const res = await fetch('/api/local-collector/scraped-menus');
      if (!res.ok) {
        showError('Nenhum dado de cardápio encontrado no servidor local.');
        return;
      }
      const scrapedMenus = await res.json();
      if (Array.isArray(scrapedMenus)) {
        const savedCompleted = localStorage.getItem('mock-completed-restaurants');
        if (!savedCompleted) return;
        const completedMap = JSON.parse(savedCompleted);
        
        let updatedCount = 0;
        
        scrapedMenus.forEach((scrapedRest: any) => {
          let targetId = scrapedRest.id;
          if (!completedMap[targetId]) {
            targetId = Object.keys(completedMap).find((id: string) => 
              completedMap[id].name.toLowerCase().trim() === scrapedRest.restaurantName.toLowerCase().trim()
            );
          }
          
          if (targetId && completedMap[targetId]) {
            const formattedCategories = (scrapedRest.categories || []).map((cat: any, cIdx: number) => ({
              id: `mc-${Date.now()}-${cIdx}`,
              name: cat.name,
              items: (cat.items || []).map((item: any, iIdx: number) => {
                let priceVal = 0.0;
                if (item.price) {
                  const clean = item.price.replace(/[^\d,.-]/g, '').replace(',', '.');
                  priceVal = parseFloat(clean) || 0.0;
                }
                return {
                  id: `mi-${Date.now()}-${cIdx}-${iIdx}`,
                  name: item.name,
                  price: priceVal,
                  description: item.description || '',
                  image_url: item.image_url || ''
                };
              })
            }));
            
            completedMap[targetId].menu_categories = formattedCategories;
            updatedCount++;
          }
        });
        
        if (updatedCount > 0) {
          localStorage.setItem('mock-completed-restaurants', JSON.stringify(completedMap));
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new Event('local-sync-restaurants'));
          showSuccess(`Sucesso! Cardápios de ${updatedCount} restaurantes importados e sincronizados!`);
        } else {
          showError('Nenhum restaurante correspondente foi encontrado para atualizar os cardápios.');
        }
      }
    } catch (err) {
      console.error(err);
      showError('Falha ao importar dados dos cardápios automaticamente.');
    }
  };

  const startFase1 = async () => {
    try {
      let url = `/api/local-collector/run-maps?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`;
      if (serverHasSavedState) {
        const discard = window.confirm(
          "Detectamos uma coleta anterior incompleta no servidor.\n\n" +
          "Clique em [OK] para DESCARTAR o progresso antigo e começar uma NOVA busca do zero.\n" +
          "Clique em [Cancelar] para RETOMAR a coleta anterior de onde parou."
        );
        if (discard) {
          url += '&fresh=true';
        }
      }

      const res = await fetch(url, { method: 'POST' });
      if (res.ok) {
        showSuccess('Coleta do Google Maps (Fase 1) iniciada!');
      } else {
        const err = await res.json();
        showError(err.error || 'Erro ao iniciar.');
      }
    } catch (err) {
      showError('Servidor local offline.');
    }
  };

  const startFase2 = async () => {
    try {
      const res = await fetch('/api/local-collector/run-social', { method: 'POST' });
      if (res.ok) {
        showSuccess('Enriquecimento de Redes (Fase 2) iniciado!');
      } else {
        const err = await res.json();
        showError(err.error || 'Erro ao iniciar.');
      }
    } catch (err) {
      showError('Servidor local offline.');
    }
  };

  const startFase3 = async () => {
    try {
      const res = await fetch('/api/local-collector/run-menu', { method: 'POST' });
      if (res.ok) {
        showSuccess('Coleta de Cardápios (Fase 3) iniciada!');
      } else {
        const err = await res.json();
        showError(err.error || 'Erro ao iniciar.');
      }
    } catch (err) {
      showError('Servidor local offline.');
    }
  };

  const startFase4 = async () => {
    try {
      const res = await fetch('/api/local-collector/run-logos', { method: 'POST' });
      if (res.ok) {
        showSuccess('Coleta de Logos (Fase 4) iniciada!');
      } else {
        const err = await res.json();
        showError(err.error || 'Erro ao iniciar.');
      }
    } catch (err) {
      showError('Servidor local offline.');
    }
  };

  const stopCollector = async () => {
    try {
      const res = await fetch('/api/local-collector/stop', { method: 'POST' });
      if (res.ok) {
        showSuccess('Parando coleta...');
      } else {
        const err = await res.json();
        showError(err.error || 'Erro ao parar.');
      }
    } catch (err) {
      showError('Servidor local offline.');
    }
  };



  // Dados Mockados Ampliados para simular varredura real por bairros
  const jampaHotspots: Record<string, Omit<ScrapedRestaurant, 'id'>[]> = {
    'tambau': [
      { name: 'Tábua de Carne', category: 'Churrascaria', rating: 4.7, reviewsCount: 2840, address: 'Av. Ruy Carneiro, 302 - Tambaú', phone: '(83) 3247-5970', city: 'João Pessoa', state: 'PB' },
      { name: 'Deda Lanches', category: 'Lanches', rating: 4.8, reviewsCount: 220, address: 'Av. Epitácio Pessoa, 1020 - Tambaú', phone: '(83) 99822-1010', city: 'João Pessoa', state: 'PB', instagram: 'https://instagram.com/deda_lanchesoficial', facebook: 'https://facebook.com/dedalanches', coverImage: '', galleryImages: [], openingHours: { monday: { isOpen: false, slots: [] }, tuesday: { isOpen: true, slots: [{ start: '16:00', end: '23:00' }] }, wednesday: { isOpen: true, slots: [{ start: '16:00', end: '23:00' }] }, thursday: { isOpen: true, slots: [{ start: '16:00', end: '23:00' }] }, friday: { isOpen: true, slots: [{ start: '16:00', end: '23:00' }] }, saturday: { isOpen: true, slots: [{ start: '16:00', end: '23:00' }] }, sunday: { isOpen: true, slots: [{ start: '16:00', end: '23:00' }] } } },
      { name: 'Gusto Cucina Italiana', category: 'Italiana', rating: 4.6, reviewsCount: 650, address: 'Av. Almirante Tamandaré, 612 - Tambaú', phone: '(83) 3512-9090', city: 'João Pessoa', state: 'PB' },
      { name: 'Pizzaria Vignoli', category: 'Pizzaria', rating: 4.5, reviewsCount: 780, address: 'Av. Ruy Carneiro, 502 - Tambaú', phone: '(83) 3247-9091', city: 'João Pessoa', state: 'PB' },
      { name: 'Família Muccini', category: 'Italiana', rating: 4.7, reviewsCount: 1100, address: 'Av. Cabo Branco, 1800 - Tambaú', phone: '(83) 3247-1600', city: 'João Pessoa', state: 'PB' },
      { name: 'Adega do Alfredo', category: 'Portuguesa', rating: 4.6, reviewsCount: 1250, address: 'Rua Coração de Jesus, 147 - Tambaú', phone: '(83) 3247-3737', city: 'João Pessoa', state: 'PB' },
      { name: 'IPPON Cozinha Japonesa', category: 'Japonesa', rating: 4.8, reviewsCount: 950, address: 'Av. Cabo Branco, 1600 - Cabo Branco', phone: '(83) 3247-5000', city: 'João Pessoa', state: 'PB' }
    ],
    'cabo-branco': [
      { name: 'Mangai Cabo Branco', category: 'Nordestina', rating: 4.8, reviewsCount: 3420, address: 'Av. Cabo Branco, 2190 - Cabo Branco', phone: '(83) 3247-9800', city: 'João Pessoa', state: 'PB' },
      { name: 'Canoa dos Camarões', category: 'Frutos do Mar', rating: 4.5, reviewsCount: 1980, address: 'Av. Cabo Branco, 2630 - Cabo Branco', phone: '(83) 3247-2055', city: 'João Pessoa', state: 'PB' },
      { name: 'Gulliver Mar', category: 'Internacional', rating: 4.7, reviewsCount: 1220, address: 'Av. Cabo Branco, 5100 - Cabo Branco', phone: '(83) 3247-1190', city: 'João Pessoa', state: 'PB' },
      { name: 'Bar do Cuscuz João Pessoa', category: 'Bar/Regional', rating: 4.6, reviewsCount: 5400, address: 'Av. Cabo Branco, 1720 - Cabo Branco', phone: '(83) 3200-5000', city: 'João Pessoa', state: 'PB' },
      { name: 'Olho de Lula', category: 'Frutos do Mar', rating: 4.4, reviewsCount: 2300, address: 'Av. Cabo Branco, 2300 - Cabo Branco', phone: '(83) 3226-2000', city: 'João Pessoa', state: 'PB' }
    ],
    'manaira': [
      { name: 'Appétit Burger', category: 'Hamburgueria', rating: 4.9, reviewsCount: 1540, address: 'Rua Bananeiras, 263 - Manaíra', phone: '(83) 3246-1212', city: 'João Pessoa', state: 'PB' },
      { name: 'Nau Frutos do Mar', category: 'Frutos do Mar', rating: 4.8, reviewsCount: 6200, address: 'Rua Odilon Fernandes, 120 - Manaíra', phone: '(83) 3246-8000', city: 'João Pessoa', state: 'PB' },
      { name: 'Santa Grelha', category: 'Churrascaria', rating: 4.6, reviewsCount: 1450, address: 'Av. Edson Ramalho, 200 - Manaíra', phone: '(83) 3200-4000', city: 'João Pessoa', state: 'PB' },
      { name: 'Cabana do Possidônio', category: 'Regional', rating: 4.5, reviewsCount: 1800, address: 'Rua Edson Ramalho, 350 - Manaíra', phone: '(83) 3246-1010', city: 'João Pessoa', state: 'PB' }
    ],
    'bessa': [
      { name: 'Quintal do Picuí', category: 'Nordestina', rating: 4.7, reviewsCount: 950, address: 'Rua Escritor Sebastião de Castro, 100 - Bessa', phone: '(83) 3500-1010', city: 'João Pessoa', state: 'PB' },
      { name: 'Lovina Bessa', category: 'Petiscaria', rating: 4.6, reviewsCount: 850, address: 'Av. Gov. Argemiro de Figueiredo, 2000 - Bessa', phone: '(83) 3500-2020', city: 'João Pessoa', state: 'PB' },
      { name: 'Bessa Grill', category: 'Bar/Restaurante', rating: 4.5, reviewsCount: 3100, address: 'Av. Gov. Argemiro de Figueiredo, 345 - Bessa', phone: '(83) 3246-8888', city: 'João Pessoa', state: 'PB' }
    ],
    'centro': [
      { name: 'Cassino da Lagoa', category: 'Variada', rating: 4.3, reviewsCount: 1100, address: 'Parque Solon de Lucena, S/N - Centro', phone: '(83) 3221-1200', city: 'João Pessoa', state: 'PB' },
      { name: 'Restaurante Popular Centro', category: 'Self-Service', rating: 4.4, reviewsCount: 900, address: 'Rua da Areia, 150 - Centro', phone: '(83) 3221-3000', city: 'João Pessoa', state: 'PB' }
    ],
    'altiplano': [
      { name: 'Empório Gourmet Altiplano', category: 'Variada', rating: 4.5, reviewsCount: 410, address: 'Rua Poeta Targino Teixeira, 220 - Altiplano', phone: '(83) 3512-1010', city: 'João Pessoa', state: 'PB' },
      { name: 'Altiplano Grill', category: 'Churrascaria', rating: 4.4, reviewsCount: 700, address: 'Rua Principal Altiplano, 500 - Altiplano', phone: '(83) 3512-2020', city: 'João Pessoa', state: 'PB' }
    ],
    'torre': [
      { name: 'Pastelaria da Torre', category: 'Lanches', rating: 4.6, reviewsCount: 820, address: 'Av. Beira Rio, 1000 - Torre', phone: '(83) 3224-4000', city: 'João Pessoa', state: 'PB' },
      { name: 'Panificadora Elétrica da Torre', category: 'Padaria', rating: 4.5, reviewsCount: 1200, address: 'Av. Rui Barbosa, 350 - Torre', phone: '(83) 3224-5000', city: 'João Pessoa', state: 'PB' }
    ],
    'mangabeira': [
      { name: 'Estrela do Norte Mangabeira', category: 'Regional', rating: 4.4, reviewsCount: 520, address: 'Rua Principal, 300 - Mangabeira', phone: '(83) 3200-9999', city: 'João Pessoa', state: 'PB' },
      { name: 'Churrascaria do Gaúcho', category: 'Churrascaria', rating: 4.5, reviewsCount: 1500, address: 'Av. Josefa Taveira, 1800 - Mangabeira', phone: '(83) 3238-1010', city: 'João Pessoa', state: 'PB' }
    ],
    'bancarios': [
      { name: 'Sabor do Tambaú Bancários', category: 'Self-Service', rating: 4.2, reviewsCount: 890, address: 'Av. Walfredo Macedo Brandão, 410 - Bancários', phone: '(83) 3247-1122', city: 'João Pessoa', state: 'PB' },
      { name: 'Bancários Lanches', category: 'Lanches', rating: 4.5, reviewsCount: 650, address: 'Av. Principal dos Bancários, 1000 - Bancários', phone: '(83) 3235-1010', city: 'João Pessoa', state: 'PB' }
    ],
    'joao-paulo-ii': [
      { name: 'Hebrom Food Truck', category: 'Lanches', rating: 4.8, reviewsCount: 69, address: 'R. Sindicalista Pedro Ribeiro, 360 - João Paulo II', phone: '(83) 98787-9872', city: 'João Pessoa', state: 'PB', instagram: 'https://instagram.com/hebromfoodtruck', facebook: 'https://facebook.com/hebromfoodtruck', coverImage: '', galleryImages: [], openingHours: { monday: { isOpen: false, slots: [] }, tuesday: { isOpen: true, slots: [{ start: '18:00', end: '23:00' }] }, wednesday: { isOpen: true, slots: [{ start: '18:00', end: '23:00' }] }, thursday: { isOpen: true, slots: [{ start: '18:00', end: '23:00' }] }, friday: { isOpen: true, slots: [{ start: '18:00', end: '23:00' }] }, saturday: { isOpen: true, slots: [{ start: '18:00', end: '23:00' }] }, sunday: { isOpen: true, slots: [{ start: '18:00', end: '23:00' }] } } }
    ]
  };

  const spHotspots: Record<string, Omit<ScrapedRestaurant, 'id'>[]> = {
    'jardins': [
      { name: 'D.O.M. Restaurante', category: 'Contemporâneo', rating: 4.7, reviewsCount: 3400, address: 'Rua Barão de Capanema, 549 - Jardins', phone: '(11) 3088-0708', city: 'São Paulo', state: 'SP' },
      { name: 'Fogo de Chão Jardins', category: 'Churrascaria', rating: 4.6, reviewsCount: 5600, address: 'Rua Augusta, 2079 - Cerqueira César', phone: '(11) 3062-2223', city: 'São Paulo', state: 'SP' }
    ],
    'pinheiros': [
      { name: 'Z Deli Sandwich Shop', category: 'Hamburgueria', rating: 4.7, reviewsCount: 4500, address: 'Rua Francisco Leitão, 16 - Pinheiros', phone: '(11) 2305-2200', city: 'São Paulo', state: 'SP' },
      { name: 'Maní', category: 'Contemporâneo', rating: 4.6, reviewsCount: 2100, address: 'Rua Joaquim Antunes, 210 - Pinheiros', phone: '(11) 3085-4148', city: 'São Paulo', state: 'SP' }
    ],
    'bela-vista': [
      { name: 'Famiglia Mancini', category: 'Italiana', rating: 4.7, reviewsCount: 12500, address: 'Rua Avanhandava, 81 - Bela Vista', phone: '(11) 3256-4320', city: 'São Paulo', state: 'SP' },
      { name: 'Bacio di Latte Paulista', category: 'Gelateria', rating: 4.8, reviewsCount: 8900, address: 'Av. Paulista, 2028 - Cerqueira César', phone: '(11) 3112-9000', city: 'São Paulo', state: 'SP' }
    ],
    'outros': [
      { name: 'Bar do Luiz Fernandes', category: 'Petiscaria', rating: 4.6, reviewsCount: 3100, address: 'Rua Augusta, 2079 - Cerqueira César', phone: '(11) 2976-3556', city: 'São Paulo', state: 'SP' },
      { name: 'Mocotó Restaurante', category: 'Nordestina', rating: 4.8, reviewsCount: 16200, address: 'Av. Nossa Sra. do Loreto, 1100 - Vila Medeiros', phone: '(11) 2951-3056', city: 'São Paulo', state: 'SP' },
      { name: 'A Casa do Porco', category: 'Autoral', rating: 4.8, reviewsCount: 9200, address: 'Rua Araújo, 175 - Centro', phone: '(11) 3258-2578', city: 'São Paulo', state: 'SP' }
    ]
  };

  const runGridScan = async (
    startIndex: number,
    points: { name: string; lat: number; lng: number }[],
    initialResults: Omit<ScrapedRestaurant, 'id'>[],
    initialSeenIds: Set<string>,
    initialLogs: string[]
  ) => {
    setIsLoading(true);
    const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY || 'AIzaSyCR6msFpwGeRVDXt-z2_LxeYiqULJuFfiA';
    const reviewsLimit = parseInt(minReviews, 10);
    const SCAN_ROUNDS = [
      { label: 'Nearby Types', isNearby: true, query: '' },
      { label: 'Lanches/Fast Food', isNearby: false,
        query: 'food truck OR hamburgueria OR lanches OR trailer OR pastelaria OR pizzaria OR cachorro quente OR sanduicheria OR burguer OR salgadaria OR creperia OR tapiocaria OR shawarma OR esfiha OR petiscaria OR batata frita OR caldos OR lanchonete OR chapa OR panificiadora' },
      { label: 'Refeições/Restaurantes', isNearby: false,
        query: 'restaurante OR comida caseira OR self-service OR prato feito OR almoço OR jantar OR marmita OR buffet OR churrascaria OR carne na brasa OR frango assado OR peixaria OR frutos do mar OR comida nordestina OR cozinha regional OR comida brasileira OR bar e restaurante OR bistrô OR cantina OR tasca' },
      { label: 'Café/Sobremesas/Açaí', isNearby: false,
        query: 'açaí OR sorvete OR café OR cafeteria OR confeitaria OR doceria OR bolos OR brigadeiro OR gelato OR milkshake OR suco OR vitamina OR sucos naturais OR caldo de cana OR tapioca OR crepe doce OR waffle OR frozen OR sorveteria OR ponto de café' },
      { label: 'Japonesa/Oriental', isNearby: false,
        query: 'sushi OR temaki OR japonesa OR comida japonesa OR temakeria OR oriental OR comida oriental OR chinesa OR comida chinesa OR yakisoba OR asiática OR comida asiática OR hot roll OR sashimi OR ramen OR lamen OR sushi bar' }
    ];

    let currentPointIdx = startIndex;
    const seenPlaceIds = new Set(initialSeenIds);
    const gatheredResults = [...initialResults];
    let currentLogs = [...initialLogs];

    const addLog = (msg: string) => {
      currentLogs.push(msg);
      setScanLogs([...currentLogs]);
    };

    const parsePlacesPage = (places: any[]): number => {
      let newCount = 0;
      places.forEach((p: any) => {
        const placeId = p.id || '';
        if (placeId && seenPlaceIds.has(placeId)) return;
        if (placeId) seenPlaceIds.add(placeId);

        const types = p.types || [];
        const excludedTypes = ['gas_station', 'supermarket', 'convenience_store', 'grocery_or_supermarket', 'car_repair', 'car_wash', 'pharmacy', 'bank', 'atm', 'lodging', 'hospital', 'school'];
        if (types.some((t: string) => excludedTypes.includes(t))) return;

        const rawName = p.displayName?.text || '';
        if (!rawName) return;
        const rawCat = p.primaryTypeDisplayName?.text || 'Restaurante';

        const cleanName = rawName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const cleanCat = rawCat.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        const excludeKeywords = ['posto de gasolina', 'posto de combustivel', 'posto de servico', 'farmacia', 'drogaria', 'banco ', 'hospital', 'supermercado', 'hipermercado', 'conveniencia'];
        if (excludeKeywords.some(kw => cleanName.includes(kw) || cleanCat.includes(kw))) return;

        const schedule = mapGoogleHoursToWeekSchedule(p.regularOpeningHours);

        let coverUrl = '';
        let galleryUrls: string[] = [];

        const nameKey = cleanName.replace(/[^a-z0-9]/g, '');
        const instagram = `https://instagram.com/${nameKey}`;
        const facebook = `https://facebook.com/${nameKey}`;
        const googleMapsUrl = p.id ? `https://www.google.com/maps/place/?q=place_id:${p.id}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rawName + ', ' + (p.formattedAddress || ''))}`;

        gatheredResults.push({
          name: rawName,
          category: rawCat,
          rating: p.rating || 0,
          reviewsCount: p.userRatingCount || 0,
          address: p.formattedAddress || '',
          phone: p.nationalPhoneNumber || '',
          city,
          state,
          instagram,
          facebook,
          coverImage: coverUrl,
          galleryImages: galleryUrls,
          openingHours: schedule,
          website: p.websiteUri || undefined,
          googleMapsUrl
        });
        newCount++;
      });
      return newCount;
    };

    const fetchPlacesPage = async (
      roundCfg: typeof SCAN_ROUNDS[0],
      pt: { lat: number; lng: number; name: string },
      pageToken?: string
    ): Promise<{ places: any[]; nextPageToken?: string }> => {
      const url = roundCfg.isNearby
        ? '/google-places/v1/places:searchNearby'
        : '/google-places/v1/places:searchText';

      const FIELD_MASK_NEARBY = 'places.id,places.displayName,places.primaryTypeDisplayName,places.rating,places.userRatingCount,places.formattedAddress,places.nationalPhoneNumber,places.types,places.websiteUri,places.regularOpeningHours,places.photos';
      const FIELD_MASK_TEXT   = 'places.id,places.displayName,places.primaryTypeDisplayName,places.rating,places.userRatingCount,places.formattedAddress,places.nationalPhoneNumber,places.types,places.websiteUri,places.regularOpeningHours,places.photos,nextPageToken';

      const circleLocation = {
        center: { latitude: pt.lat, longitude: pt.lng },
        radius: 1500.0
      };

      let body: any;

      if (roundCfg.isNearby) {
        body = {
          maxResultCount: 20,
          locationRestriction: { circle: circleLocation },
          includedTypes: [
            'restaurant', 'fast_food_restaurant', 'sandwich_shop', 'cafe', 'coffee_shop', 'bakery',
            'bar', 'pub', 'ice_cream_shop', 'meal_takeaway', 'meal_delivery', 'hamburger_restaurant',
            'pizza_restaurant', 'steak_house', 'sushi_restaurant', 'brazilian_restaurant',
            'barbecue_restaurant', 'seafood_restaurant', 'acai_shop', 'food_court', 'cafeteria'
          ]
        };
      } else {
        body = {
          textQuery: `${roundCfg.query} em ${pt.name}, ${city}, ${state}`,
          languageCode: 'pt-BR',
          maxResultCount: 20,
          locationBias: { circle: circleLocation }
        };
        if (pageToken) body.pageToken = pageToken;
      }

      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': roundCfg.isNearby ? FIELD_MASK_NEARBY : FIELD_MASK_TEXT
          },
          body: JSON.stringify(body),
          signal: controller.signal
        });
        clearTimeout(tid);
        if (!res.ok) {
          if (res.status === 429) {
            throw new Error('RATE_LIMIT_429');
          }
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || `HTTP ${res.status}`);
        }
        const json = await res.json();
        return { places: json.places || [], nextPageToken: roundCfg.isNearby ? undefined : json.nextPageToken };
      } catch (e) {
        clearTimeout(tid);
        throw e;
      }
    };

    const runTraceStep = async () => {
      if (currentPointIdx >= points.length) {
        addLog(`================================================================`);
        addLog(`[SISTEMA] ✅ Varredura completa! Total bruto coletado: ${gatheredResults.length} locais únicos por place_id.`);

        setTimeout(() => {
          const uniqueMap = new Map<string, Omit<ScrapedRestaurant, 'id'>>();
          gatheredResults.forEach(r => {
            const uniqueKey = `${r.name.toLowerCase().replace(/\s/g,'')}_${r.address.toLowerCase().replace(/\s/g,'')}`;
            uniqueMap.set(uniqueKey, r);
          });
          const finalUniqueList = Array.from(uniqueMap.values());

          addLog(`[SISTEMA] Limpeza secundária: removidos ${gatheredResults.length - finalUniqueList.length} duplicatas residuais.`);
          addLog(`[SUCCESS] 🎯 Total FINAL: ${finalUniqueList.length} estabelecimentos únicos mapeados em ${city}!`);

          processAndSetResults(finalUniqueList, reviewsLimit);
          setCurrentPage(1);
          setIsLoading(false);
          setActiveScan(null);
          localStorage.removeItem('gmaps_active_scan_v2');
          showSuccess(`Mapeamento por pontos concluído com sucesso!`);
        }, 800);
        return;
      }

      // Verifica se alcançou o limite do lote de 20 pontos
      const pointsScrapedInThisSession = currentPointIdx - startIndex;
      if (pointsScrapedInThisSession > 0 && pointsScrapedInThisSession % 20 === 0) {
        addLog(`================================================================`);
        addLog(`[SISTEMA] ⏸ LOTE DE 20 PONTOS CONCLUÍDO! Varredura pausada para segurança e economia.`);
        addLog(`[SISTEMA] Processados: ${currentPointIdx}/${points.length} pontos. Acumulado: ${gatheredResults.length} locais.`);
        addLog(`[SISTEMA] Aguardando sua autorização para processar os próximos 20 pontos...`);

        const pausedState = {
          city,
          state,
          minReviews,
          customQuery,
          searchMethod: 'grid' as const,
          gridDensity,
          tracePoints: points,
          currentPointIdx,
          gatheredResults,
          seenPlaceIds: Array.from(seenPlaceIds),
          isPaused: true,
          scanLogs: currentLogs
        };
        setActiveScan(pausedState);
        localStorage.setItem('gmaps_active_scan_v2', JSON.stringify(pausedState));
        setIsLoading(false);
        return;
      }

      const pt = points[currentPointIdx];
      addLog(`[PONTO ${currentPointIdx + 1}/${points.length}] ${pt.name} (${pt.lat.toFixed(4)}, ${pt.lng.toFixed(4)})`);

      let pointTotal = 0;
      let pointErrors = 0;

      for (const round of SCAN_ROUNDS) {
        let retryCount = 0;
        const MAX_RETRIES = 3;
        let success = false;

        while (retryCount <= MAX_RETRIES && !success) {
          try {
            let pageToken: string | undefined = undefined;
            let pageNum = 0;
            do {
              pageNum++;
              const { places, nextPageToken } = await fetchPlacesPage(round, pt, pageToken);
              const added = parsePlacesPage(places);
              pointTotal += added;
              pageToken = nextPageToken;

              if (pageNum === 1) {
                addLog(`  ├─ [${round.label}] pág.${pageNum}: +${added} novos (${places.length} retornados)${nextPageToken ? ' — tem próxima pág.' : ''}`);
              } else if (added > 0 || pageNum <= 3) {
                addLog(`  │   └─ pág.${pageNum}: +${added} novos${nextPageToken ? ' — próxima...' : ''}`);
              }

              processAndSetResults([...gatheredResults], reviewsLimit);

              if (nextPageToken) await new Promise(r => setTimeout(r, 2000));
            } while (pageToken);

            success = true;
          } catch (err: any) {
            const msg = err.name === 'AbortError' ? 'timeout' : err.message;
            const isRateLimit = err.message === 'RATE_LIMIT_429';
            const isRetriable = 
              isRateLimit ||
              err.message === 'Failed to fetch' ||
              err.name === 'AbortError' ||
              err.message === 'Load failed' ||
              err.message?.toLowerCase().includes('fetch');

            if (isRetriable && retryCount < MAX_RETRIES) {
              retryCount++;
              const waitMs = isRateLimit ? Math.pow(2, retryCount) * 3000 : 3000;
              const reason = isRateLimit 
                ? 'Limite de requisições (429)' 
                : `Falha de rede/timeout: ${msg}`;
              addLog(`  ├─ [${round.label}] ⚠ ${reason}. Aguardando ${waitMs / 1000}s antes de tentar novamente... (tentativa ${retryCount}/${MAX_RETRIES})`);
              await new Promise(r => setTimeout(r, waitMs));
            } else {
              pointErrors++;
              addLog(`  ├─ [${round.label}] ⚠ Erro: ${msg}`);
              break;
            }
          }
        }
      }

      if (pointErrors === SCAN_ROUNDS.length) {
        addLog(`  └─ [PONTO IGNORADO] Todas as rodadas falharam para este ponto. Nenhum dado adicionado.`);
      } else {
        addLog(`  └─ [PONTO OK] ${pointTotal} novos locais adicionados (total acumulado: ${gatheredResults.length} únicos)`);
      }

      processAndSetResults([...gatheredResults], reviewsLimit);

      currentPointIdx++;
      
      const currentScanState = {
        city,
        state,
        minReviews,
        customQuery,
        searchMethod: 'grid' as const,
        gridDensity,
        tracePoints: points,
        currentPointIdx,
        gatheredResults,
        seenPlaceIds: Array.from(seenPlaceIds),
        isPaused: false,
        scanLogs: currentLogs
      };
      
      setActiveScan(currentScanState);
      localStorage.setItem('gmaps_active_scan_v2', JSON.stringify(currentScanState));

      setTimeout(runTraceStep, 1500);
    };

    setTimeout(runTraceStep, 500);
  };

  const handleContinueScan = () => {
    if (!activeScan) return;
    
    const updatedScan = {
      ...activeScan,
      isPaused: false
    };
    setActiveScan(updatedScan);
    localStorage.setItem('gmaps_active_scan_v2', JSON.stringify(updatedScan));
    
    const logs = [...scanLogs];
    logs.push(`[SISTEMA] ▶ RETOMANDO VARREDURA do ponto ${activeScan.currentPointIdx + 1}...`);
    setScanLogs(logs);

    runGridScan(
      activeScan.currentPointIdx,
      activeScan.tracePoints,
      activeScan.gatheredResults,
      new Set(activeScan.seenPlaceIds),
      logs
    );
  };

  const handleCancelScan = () => {
    if (!activeScan) return;
    
    const reviewsLimit = parseInt(minReviews, 10);
    const gatheredResults = activeScan.gatheredResults;
    const uniqueMap = new Map<string, Omit<ScrapedRestaurant, 'id'>>();
    gatheredResults.forEach(r => {
      const uniqueKey = `${r.name.toLowerCase().replace(/\s/g,'')}_${r.address.toLowerCase().replace(/\s/g,'')}`;
      uniqueMap.set(uniqueKey, r);
    });
    const finalUniqueList = Array.from(uniqueMap.values());

    processAndSetResults(finalUniqueList, reviewsLimit);
    setCurrentPage(1);
    setIsLoading(false);
    setActiveScan(null);
    localStorage.removeItem('gmaps_active_scan_v2');
    
    showSuccess(`Varredura encerrada pelo usuário. ${finalUniqueList.length} restaurantes importados para a tela.`);
  };

  const handleSearch = async () => {
    setIsLoading(true);
    setResults([]);
    setScanLogs([]);
    setSearchTerm('');
    setDismissedIds(new Set());

    const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY || 'AIzaSyCR6msFpwGeRVDXt-z2_LxeYiqULJuFfiA';
    const reviewsLimit = parseInt(minReviews, 10);

    if (searchMethod === 'simple') {
      const queryText = customQuery.trim() 
        ? `${customQuery.trim()} em ${city}, ${state}` 
        : `restaurantes em ${city}, ${state}`;
      
      setScanLogs([`[INFO] Iniciando busca direta por texto no Google Places API: "${queryText}"...`]);
      
      try {
        const url = "/google-places/v1/places:searchText";
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4500);

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": "places.id,places.displayName,places.primaryTypeDisplayName,places.rating,places.userRatingCount,places.formattedAddress,places.nationalPhoneNumber,places.types,places.websiteUri,places.regularOpeningHours,places.photos"
          },
          signal: controller.signal,
          body: JSON.stringify({
            textQuery: queryText,
            languageCode: "pt-BR",
            maxResultCount: 20
          })
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || `HTTP error ${response.status}`);
        }

        const data = await response.json();
        const places = data.places || [];
        
        const rawResults: Omit<ScrapedRestaurant, 'id'>[] = [];
        places.forEach((p: any) => {
          const types = p.types || [];
          const excludedTypes = ['gas_station', 'supermarket', 'convenience_store', 'grocery_or_supermarket', 'car_repair', 'car_wash'];
          if (types.some((t: string) => excludedTypes.includes(t))) return;

          const rawName = p.displayName?.text || "";
          const rawCat = p.primaryTypeDisplayName?.text || "Restaurante";
          
          const cleanName = rawName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const cleanCat = rawCat.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          
          const excludeKeywords = ['posto de gasolina', 'posto de combustivel', 'posto de servico', 'conveniência', 'conveniencia', 'supermercado', 'hipermercado'];
          if (excludeKeywords.some(keyword => cleanName.includes(keyword) || cleanCat.includes(keyword))) return;

          const schedule = mapGoogleHoursToWeekSchedule(p.regularOpeningHours);
          
          let coverUrl = '';
          let galleryUrls: string[] = [];
          
          if (p.photos && p.photos.length > 0) {
            coverUrl = getGooglePhotoUrl(p.photos[0].name, apiKey);
            galleryUrls = p.photos.slice(1, 13).map((photo: any) => getGooglePhotoUrl(photo.name, apiKey));
          }

          const nameKey = cleanName.replace(/[^a-z0-9]/g, '');
          const instagram = `https://instagram.com/${nameKey}`;
          const facebook = `https://facebook.com/${nameKey}`;
          const googleMapsUrl = p.id ? `https://www.google.com/maps/place/?q=place_id:${p.id}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rawName + ', ' + (p.formattedAddress || ''))}`;

          rawResults.push({
            name: rawName,
            category: rawCat,
            rating: p.rating || 0,
            reviewsCount: p.userRatingCount || 0,
            address: p.formattedAddress || "",
            phone: p.nationalPhoneNumber || "",
            city: city,
            state: state,
            instagram,
            facebook,
            coverImage: coverUrl,
            galleryImages: galleryUrls,
            openingHours: schedule,
            website: p.websiteUri || undefined,
            googleMapsUrl
          });
        });

        setScanLogs(prev => [
          ...prev,
          `[INFO] Google Places API retornou ${rawResults.length} locais (após filtragem de postos/mercados).`,
          `[WARN] Google Places API cortou os resultados devido ao limite padrão de 20 por página. Use a grade de coordenadas para varrer tudo.`,
          `[SUCCESS] Busca concluída.`
        ]);

        processAndSetResults(rawResults, reviewsLimit);
        setCurrentPage(1);
        setIsLoading(false);
        showSuccess(`Varredura concluída!`);

      } catch (err: any) {
        console.error(err);
        const errMsg = err.name === 'AbortError' ? 'tempo limite esgotado' : err.message;
        setScanLogs(prev => [
          ...prev,
          `[ERRO] Google API falhou: ${errMsg}. Nenhum dado simulado será adicionado.`,
          `[ERRO] Verifique sua chave de API e tente novamente.`
        ]);
        setIsLoading(false);
        showError(`Erro na busca: ${errMsg}. Verifique a chave de API.`);
      }

    } else {
      const cityInfo = getCityInfo(city);
      let gridSize = 9;
      if (gridDensity === 'low') gridSize = 6;
      else if (gridDensity === 'high') gridSize = 12;
      else if (gridDensity === 'ultra') gridSize = 16;
      else if (gridDensity === 'extreme') gridSize = 20;

      const generatedPoints: { name: string; lat: number; lng: number }[] = [];
      const step = 0.015;
      
      let pointIdx = 0;
      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          const offsetLat = (row - (gridSize - 1) / 2) * step;
          const offsetLng = (col - (gridSize - 1) / 2) * step;
          
          const neighborhoodName = cityInfo.neighborhoods[pointIdx % cityInfo.neighborhoods.length];
          generatedPoints.push({
            name: neighborhoodName,
            lat: cityInfo.lat + offsetLat,
            lng: cityInfo.lng + offsetLng
          });
          pointIdx++;
        }
      }
      const tracePoints = generatedPoints;
      
      const SCAN_ROUNDS = [
        { label: 'Nearby Types', isNearby: true, query: '' },
        { label: 'Lanches/Fast Food', isNearby: false,
          query: 'food truck OR hamburgueria OR lanches OR trailer OR pastelaria OR pizzaria OR cachorro quente OR sanduicheria OR burguer OR salgadaria OR creperia OR tapiocaria OR shawarma OR esfiha OR petiscaria OR batata frita OR caldos OR lanchonete OR chapa OR panificiadora' },
        { label: 'Refeições/Restaurantes', isNearby: false,
          query: 'restaurante OR comida caseira OR self-service OR prato feito OR almoço OR jantar OR marmita OR buffet OR churrascaria OR carne na brasa OR frango assado OR peixaria OR frutos do mar OR comida nordestina OR cozinha regional OR comida brasileira OR bar e restaurante OR bistrô OR cantina OR tasca' },
        { label: 'Café/Sobremesas/Açaí', isNearby: false,
          query: 'açaí OR sorvete OR café OR cafeteria OR confeitaria OR doceria OR bolos OR brigadeiro OR gelato OR milkshake OR suco OR vitamina OR sucos naturais OR caldo de cana OR tapioca OR crepe doce OR waffle OR frozen OR sorveteria OR ponto de café' },
        { label: 'Japonesa/Oriental', isNearby: false,
          query: 'sushi OR temaki OR japonesa OR comida japonesa OR temakeria OR oriental OR comida oriental OR chinesa OR comida chinesa OR yakisoba OR asiática OR comida asiática OR hot roll OR sashimi OR ramen OR lamen OR sushi bar' }
      ];

      const startLogs = [
        `[SISTEMA] 🚀 VARREDURA IMPLACÁVEL INICIADA em ${city} - ${state}`,
        `[SISTEMA] Estratégia: ${SCAN_ROUNDS.length} rodadas de busca × ${tracePoints.length} pontos de grade = até ${SCAN_ROUNDS.length * tracePoints.length} requisições + paginação.`,
        `[SISTEMA] Deduplicação global por place_id do Google Maps.`,
        `================================================================`
      ];

      setScanLogs(startLogs);

      const initialScan = {
        city,
        state,
        minReviews,
        customQuery,
        searchMethod: 'grid' as const,
        gridDensity,
        tracePoints,
        currentPointIdx: 0,
        gatheredResults: [],
        seenPlaceIds: [],
        isPaused: false
      };
      
      setActiveScan(initialScan);
      localStorage.setItem('gmaps_active_scan_v2', JSON.stringify(initialScan));
      
      runGridScan(0, tracePoints, [], new Set<string>(), startLogs);
    }
  };

  const handleRemoveFromQueue = async (restaurant: ScrapedRestaurant) => {
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({ is_deleted: true })
        .eq('id', restaurant.id);

      if (error) throw error;

      showSuccess(`"${restaurant.name}" removido com sucesso!`);
      
      const key = getRestaurantUniqueKey(restaurant.name, restaurant.address);
      const newImported = new Map(importedKeys);
      newImported.delete(key);
      setImportedKeys(newImported);

      // Notifica as abas
      window.dispatchEvent(new Event('local-sync-restaurants'));
      loadScrapedFromSupabase();
    } catch (err: any) {
      console.error(err);
      showError(`Erro ao remover: ${err.message}`);
    }
  };

  const handleClearPending = async () => {
    if (!window.confirm('Tem certeza que deseja apagar TODOS os estabelecimentos pendentes da fila de coleta no Supabase? Esta ação é irreversível.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('restaurants')
        .delete()
        .eq('is_published', false);

      if (error) {
        console.error('Erro ao limpar restaurantes pendentes:', error);
        showError('Erro ao limpar base de dados.');
      } else {
        showSuccess('Todos os restaurantes pendentes foram removidos!');
        setResults([]);
        window.dispatchEvent(new Event('local-sync-restaurants'));
      }
    } catch (e: any) {
      console.error(e);
      showError(`Erro ao limpar base de dados: ${e.message}`);
    }
  };

  const handleImport = async (restaurant: ScrapedRestaurant) => {
    const validationError = getImportValidationError(restaurant);
    if (validationError) {
      showError(`Não é possível importar "${restaurant.name}": ${validationError} Clique em "Editar" para preencher o telefone, CEP e endereço completo antes de importar.`);
      return;
    }

    try {
      const defaultPlan = localStorage.getItem('admin_default_plan_on_import') || 'premium_gift';
      const { error } = await supabase
        .from('restaurants')
        .update({ 
          is_published: true,
          plan: defaultPlan
        })
        .eq('id', restaurant.id);

      if (error) throw error;

      showSuccess(`"${restaurant.name}" importado e publicado com sucesso!`);
      
      const key = getRestaurantUniqueKey(restaurant.name, restaurant.address);
      const newImported = new Map(importedKeys);
      newImported.set(key, 'Visitado');
      setImportedKeys(newImported);

      // Notifica as abas
      window.dispatchEvent(new Event('local-sync-restaurants'));
      loadScrapedFromSupabase();
    } catch (err: any) {
      console.error(err);
      showError(`Erro ao importar: ${err.message}`);
    }
  };

  const handleImportAll = async () => {
    try {
      const pendingResults = results.filter(r => {
        if (dismissedIds.has(r.id)) return false;
        const status = importedKeys.get(getRestaurantUniqueKey(r.name, r.address));
        return status !== 'Visitado';
      });

      if (pendingResults.length === 0) {
        showError('Nenhum restaurante para importar.');
        return;
      }

      const validPending = pendingResults.filter(r => !getImportValidationError(r));
      const invalidCount = pendingResults.length - validPending.length;

      if (validPending.length === 0) {
        showError('Nenhum restaurante válido para importar. Todos os estabelecimentos pendentes possuem dados de endereço ou telefone incompletos.');
        return;
      }

      const pendingIds = validPending.map(r => r.id);
      const defaultPlan = localStorage.getItem('admin_default_plan_on_import') || 'premium_gift';
      const { error } = await supabase
        .from('restaurants')
        .update({ 
          is_published: true,
          plan: defaultPlan
        })
        .in('id', pendingIds);

      if (error) throw error;

      if (invalidCount > 0) {
        showSuccess(`Sucesso! ${validPending.length} restaurantes importados e publicados! ${invalidCount} restaurante(s) foram ignorados por estarem com endereço, CEP ou telefone incompleto. Edite-os para importar.`);
      } else {
        showSuccess(`Sucesso! ${pendingIds.length} restaurantes importados e publicados!`);
      }
      
      const newImported = new Map(importedKeys);
      validPending.forEach(r => newImported.set(getRestaurantUniqueKey(r.name, r.address), 'Visitado'));
      setImportedKeys(newImported);

      // Notifica as abas
      window.dispatchEvent(new Event('local-sync-restaurants'));
      loadScrapedFromSupabase();
    } catch (err: any) {
      console.error(err);
      showError(`Erro ao importar em lote: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 p-4">
      {hasSavedScan && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm text-blue-900 font-medium">
          <div className="flex gap-3">
            <Compass className="w-5 h-5 text-primary shrink-0 mt-0.5 animate-pulse" />
            <div>
              <span className="font-bold text-primary block mb-0.5">Varredura anterior interrompida encontrada!</span>
              Detectamos uma varredura que não foi finalizada. Deseja retomar a coleta de onde parou ou começar uma nova?
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <Button 
              size="sm" 
              className="bg-primary hover:bg-primary/90 text-white font-bold"
              onClick={handleResumeSavedScan}
            >
              Retomar Varredura
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="border-gray-300 text-gray-700 bg-white font-bold"
              onClick={handleDiscardSavedScan}
            >
              Descartar
            </Button>
          </div>
        </div>
      )}

      {/* Painel do Coletor em Segundo Plano */}
      <Card className="border border-white/20 shadow-xl bg-white/40 backdrop-blur-md dark:bg-zinc-900/40 mb-8 overflow-hidden rounded-2xl">
        <CardHeader className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border-b border-white/10 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <span className="flex h-3 w-3 items-center justify-center relative">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${runnerConnected ? (runnerRunning ? 'bg-green-500' : 'bg-blue-500') : 'bg-red-500'}`}></span>
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${runnerConnected ? (runnerRunning ? 'bg-green-500' : 'bg-blue-500') : 'bg-red-500'}`}></span>
                  </span>
                  Coletor em Segundo Plano (Automático)
                </CardTitle>
                {runnerConnected ? (
                  <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 text-xs px-2 py-0.5 rounded-full font-medium border border-emerald-200/50">
                    Conectado ao Script Local
                  </span>
                ) : (
                  <span className="bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 text-xs px-2 py-0.5 rounded-full font-medium border border-rose-200/50">
                    Script Desconectado
                  </span>
                )}
              </div>
              <CardDescription className="text-slate-500 dark:text-slate-400 mt-1">
                Execute varreduras diretamente no seu computador e sincronize os resultados instantaneamente na base de dados ativa.
              </CardDescription>
            </div>
            
            {runnerConnected && (
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoImport}
                    onChange={(e) => setAutoImport(e.target.checked)}
                    className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 transition-colors"
                  />
                  <span>Importar Automático</span>
                </label>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {!runnerConnected && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 rounded-xl border border-amber-200/50 text-xs flex items-start gap-2.5 font-medium shadow-sm">
              <AlertCircle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block mb-0.5 text-[13px]">Script Local Desconectado</strong>
                As coletas automáticas em lote (Fase 1 a 4) exigem que o robô local esteja rodando no computador do administrador principal. No entanto, as **Ações Manuais de Importação** e a **Extensão do Chrome** (abaixo) funcionam normalmente de qualquer lugar!
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Controles do Runner */}
            <div className="flex flex-col gap-4 lg:col-span-1">
              <div className="bg-slate-50 dark:bg-zinc-800/30 p-4 rounded-xl border border-slate-100 dark:border-zinc-800/80 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Controles de Execução</h4>
                  {!runnerConnected && (
                    <Badge variant="outline" className="border-amber-200 text-amber-600 text-[10px] px-1.5 py-0">
                      Offline
                    </Badge>
                  )}
                </div>
                
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2 mb-1">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 block mb-0.5">Estado (UF)</label>
                      <Select value={state} onValueChange={setState} disabled={runnerRunning}>
                        <SelectTrigger className="h-8 text-xs bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-700">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[250px] overflow-y-auto">
                          {ESTADOS_BRASIL.map(uf => (
                            <SelectItem key={uf.sigla} value={uf.sigla}>
                              {uf.sigla} - {uf.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 block mb-0.5">Cidade da Coleta</label>
                      <Select value={city} onValueChange={setCity} disabled={runnerRunning || loadingCities}>
                        <SelectTrigger className="h-8 text-xs bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-700">
                          <SelectValue placeholder={loadingCities ? "Carregando..." : "Selecione"} />
                        </SelectTrigger>
                        <SelectContent className="max-h-[250px] overflow-y-auto">
                          {citiesList.length === 0 ? (
                            <SelectItem value={city || "João Pessoa"}>{city || "João Pessoa"}</SelectItem>
                          ) : (
                            citiesList.map(cityName => (
                              <SelectItem key={cityName} value={cityName}>
                                {cityName}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button 
                    onClick={startFase1} 
                    disabled={runnerRunning || !runnerConnected}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold transition-all shadow-md hover:shadow-indigo-500/20 disabled:opacity-50"
                  >
                    Iniciar Fase 1 (Google Maps)
                  </Button>

                  {runnerRunning && (
                    <Button 
                      onClick={stopCollector} 
                      variant="destructive"
                      className="w-full font-bold transition-all shadow-md hover:shadow-red-500/20"
                    >
                      Interromper Coleta
                    </Button>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-zinc-800/30 p-4 rounded-xl border border-slate-100 dark:border-zinc-800/80 flex flex-col gap-3">
                <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Ações Manuais de Importação</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={importGoogleMapsData}
                    variant="outline"
                    className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-900/50 dark:text-indigo-400 font-bold"
                  >
                    Importar Maps
                  </Button>
                  <Button
                    onClick={importMenusData}
                    variant="outline"
                    className="border-pink-200 text-pink-700 hover:bg-pink-50 dark:border-pink-900/50 dark:text-pink-400 font-bold"
                  >
                    Importar Cardápios
                  </Button>
                </div>
              </div>
            </div>

            {/* Logs do Terminal */}
            <div className="flex flex-col gap-2 lg:col-span-2">
              <div className="flex justify-between items-center px-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
                  Terminal de Saída do Runner
                </span>
                <button 
                  onClick={async () => {
                    setRunnerLogs('');
                    try {
                      await fetch('/api/local-collector/clear-logs', { method: 'POST' });
                    } catch (err) {
                      console.error('Erro ao limpar os logs do servidor:', err);
                    }
                  }} 
                  className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Limpar Logs
                </button>
              </div>
              
              <div 
                ref={terminalLogsRef}
                className="bg-black/95 text-emerald-400 font-mono text-xs p-4 rounded-xl h-48 overflow-y-auto border border-white/10 shadow-inner"
              >
                {runnerLogs ? (
                  runnerLogs.split('\n').map((line, idx) => (
                    <div key={idx} className="py-0.5 leading-relaxed break-all">
                      {line}
                    </div>
                  ))
                ) : (
                  <div className="text-slate-600 italic py-16 text-center select-none">
                    Nenhum log gerado ainda. Aguardando conexão ou execução do runner...
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Painel da Extensão Auxiliar */}
      <Card className="border border-white/20 shadow-xl bg-white/40 backdrop-blur-md dark:bg-zinc-900/40 mb-8 overflow-hidden rounded-2xl">
        <CardHeader className="bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-purple-500/10 border-b border-white/10 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-rose-500" />
                  Extensão Auxiliar do Navegador (Chrome Extension)
                </CardTitle>
                <Badge variant="secondary" className="bg-rose-50 text-rose-700 border border-rose-200/50">
                  Fase 7 - Ativo
                </Badge>
              </div>
              <CardDescription className="text-slate-500 dark:text-slate-400 mt-1">
                Colete logos e seguidores do Instagram diretamente no seu navegador, sem precisar do script local rodando.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Como instalar a extensão no Chrome:</h4>
              <ol className="list-decimal list-inside text-xs text-slate-600 dark:text-slate-400 space-y-2">
                <li>Clique no botão abaixo para baixar os arquivos da extensão compactados.</li>
                <li>Extraia o arquivo ZIP no seu computador em uma pasta fácil de lembrar.</li>
                <li>No Google Chrome, acesse o link: <code className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono text-[11px]">chrome://extensions/</code>.</li>
                <li>No canto superior direito, ative a opção <strong>Modo do desenvolvedor</strong>.</li>
                <li>No canto superior esquerdo, clique em <strong>Carregar sem compactação</strong>.</li>
                <li>Selecione a pasta onde você extraiu os arquivos da extensão (a pasta que contém o arquivo <code className="font-mono text-[11px]">manifest.json</code>).</li>
                <li>Após carregar, copie o <strong>ID</strong> gerado para a extensão (ex: <code className="font-mono text-[11px]">aobgd...</code>).</li>
              </ol>
              <div className="pt-2">
                <Button 
                  onClick={handleDownloadExtension}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md"
                >
                  Download dos Arquivos da Extensão (.ZIP)
                </Button>
              </div>
            </div>
            
            <div className="space-y-4 bg-slate-50/50 dark:bg-zinc-850/20 p-4 rounded-xl border border-slate-100 dark:border-zinc-800">
              <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                Configurar Extensão neste Navegador
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cole o ID da extensão instalada abaixo para que este painel possa se comunicar com ela no seu computador.
              </p>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block">ID da Extensão (Chrome Extension ID)</label>
                <div className="flex gap-2">
                  <Input
                    value={extensionId}
                    onChange={(e) => setExtensionId(e.target.value)}
                    placeholder="Cole o ID da extensão aqui"
                    className="bg-white border-gray-300 text-xs h-9 flex-1"
                  />
                  <Button 
                    onClick={handleSaveExtensionId}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4"
                  >
                    Salvar ID
                  </Button>
                </div>
              </div>
              
              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                <span className="text-slate-500">Status de Conectão da Extensão:</span>
                {isExtensionActive ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Conectada
                  </span>
                ) : (
                  <span className="text-rose-600 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Desconectada / Não configurada
                  </span>
                )}
              </div>
              <div className="flex justify-end pt-1">
                <Button 
                  onClick={testExtensionConnection}
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold h-7 border-slate-200"
                >
                  Testar Conexão
                </Button>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 space-y-2.5">
                <h5 className="font-bold text-xs text-slate-700 dark:text-slate-300">Chaves de API para Extração por IA (Opcional)</h5>
                
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 block">Gemini API Key</label>
                  <Input
                    type="password"
                    value={userGeminiKey}
                    onChange={(e) => setUserGeminiKey(e.target.value)}
                    placeholder="Cole sua API Key do Gemini"
                    className="bg-white border-gray-300 text-xs h-8"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 block">OpenAI API Key</label>
                  <Input
                    type="password"
                    value={userOpenaiKey}
                    onChange={(e) => setUserOpenaiKey(e.target.value)}
                    placeholder="Cole sua API Key da OpenAI"
                    className="bg-white border-gray-300 text-xs h-8"
                  />
                </div>
                
                <div className="flex justify-end pt-1">
                  <Button 
                    onClick={handleSaveApiKeys}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8 px-4"
                  >
                    Salvar Chaves de API
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-2xl text-primary font-bold">Coleta Oficial via Google Places API</CardTitle>
            <CardDescription>
              Varra estabelecimentos de qualquer cidade traçando coordenadas e exporte-os diretamente para o catálogo de restaurantes da plataforma.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <div>
              <input 
                type="file" 
                accept=".json" 
                onChange={handleJsonUpload} 
                className="hidden" 
                id="json-file-upload-input" 
              />
              <Button 
                type="button"
                variant="outline" 
                size="sm"
                className="gap-1.5 border-primary text-primary hover:bg-background-light font-bold"
                onClick={() => document.getElementById('json-file-upload-input')?.click()}
              >
                Importar JSON
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Barra de Filtros / Busca */}
      <div className="space-y-4 p-5 bg-white shadow-none rounded-2xl border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">UF (Estado)</label>
            <Select 
              value={state} 
              onValueChange={setState} 
              disabled={isLoading || (activeScan !== null && !activeScan.isPaused)}
            >
              <SelectTrigger className="bg-white border-gray-300">
                <SelectValue placeholder="Selecione o estado" />
              </SelectTrigger>
              <SelectContent className="max-h-[250px] overflow-y-auto">
                {ESTADOS_BRASIL.map(uf => (
                  <SelectItem key={uf.sigla} value={uf.sigla}>
                    {uf.sigla} - {uf.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Cidade</label>
            <Select 
              value={city} 
              onValueChange={setCity} 
              disabled={isLoading || (activeScan !== null && !activeScan.isPaused) || loadingCities}
            >
              <SelectTrigger className="bg-white border-gray-300">
                <SelectValue placeholder={loadingCities ? "Carregando..." : "Selecione a cidade"} />
              </SelectTrigger>
              <SelectContent className="max-h-[250px] overflow-y-auto">
                {citiesList.length === 0 ? (
                  <SelectItem value={city || "João Pessoa"}>{city || "João Pessoa"}</SelectItem>
                ) : (
                  citiesList.map(cityName => (
                    <SelectItem key={cityName} value={cityName}>
                      {cityName}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Termo de Busca (Opcional)</label>
            <Input 
              value={customQuery} 
              onChange={(e) => setCustomQuery(e.target.value)} 
              placeholder="Ex: Hebrom Lanches, Hamburgueria"
              disabled={isLoading || (activeScan !== null && !activeScan.isPaused)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Filtrar por Avaliações (exibição)</label>
            <Select value={minReviews} onValueChange={setMinReviews} disabled={isLoading || (activeScan !== null && !activeScan.isPaused)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">✅ Todos os estabelecimentos</SelectItem>
                <SelectItem value="10">Mais de 10 avaliações</SelectItem>
                <SelectItem value="50">Mais de 50 avaliações</SelectItem>
                <SelectItem value="100">Mais de 100 avaliações</SelectItem>
                <SelectItem value="500">Mais de 500 avaliações</SelectItem>
                <SelectItem value="1000">Mais de 1000 avaliações</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button 
              className="w-full h-10 font-bold gap-2 bg-primary hover:bg-primary/90 text-white" 
              onClick={handleSearch}
              disabled={isLoading || !city || !state || (activeScan !== null && !activeScan.isPaused)}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Buscar no Google Maps
            </Button>
          </div>
        </div>

        {/* Parâmetros Avançados de Busca/Varredura */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-highlight" /> Estratégia de Busca
            </label>
            <Select value={searchMethod} onValueChange={(val: 'simple' | 'grid') => setSearchMethod(val)} disabled={isLoading || (activeScan !== null && !activeScan.isPaused)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="simple">Busca Simples (Padrão Google - Limita a 60 locais)</SelectItem>
                <SelectItem value="grid">Varredura Multicentricidade (Traçar Pontos pela Cidade - Mais Completo)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {searchMethod === 'grid' && (
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Pontos de Varredura por Bairros (Densidade da Grade)</label>
              <Select value={gridDensity} onValueChange={(val: 'low' | 'medium' | 'high' | 'ultra' | 'extreme') => setGridDensity(val)} disabled={isLoading || (activeScan !== null && !activeScan.isPaused)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Grade Rápida (36 pontos)</SelectItem>
                  <SelectItem value="medium">Grade Moderada (81 pontos)</SelectItem>
                  <SelectItem value="high">Grade Intensa (144 pontos)</SelectItem>
                  <SelectItem value="ultra">Grade Ultra-Intensa (256 pontos)</SelectItem>
                  <SelectItem value="extreme">Grade Extrema (400 pontos)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Interface para Varredura Pausada */}
      {activeScan && activeScan.isPaused && (
        <Card className="border-2 border-amber-300 bg-amber-50/50 shadow-none rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <CardHeader className="bg-amber-100/50 border-b border-amber-200 p-4">
            <div className="flex items-center gap-2 text-amber-900">
              <Loader2 className="w-5 h-5 animate-pulse text-amber-700" />
              <CardTitle className="text-base font-bold">Varredura em Grade Pausada</CardTitle>
            </div>
            <CardDescription className="text-amber-800 text-xs font-semibold">
              Concluímos um lote de 20 pontos de coordenadas. O progresso atual está totalmente salvo no seu navegador.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="text-sm font-semibold text-amber-900 space-y-1">
              <div>📍 Pontos processados: <span className="text-lg font-bold text-amber-700">{activeScan.currentPointIdx}</span> de <span className="font-bold">{activeScan.tracePoints.length}</span></div>
              <div>🏠 Locais únicos coletados até agora: <span className="text-lg font-bold text-primary">{activeScan.gatheredResults.length}</span></div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                className="bg-primary hover:bg-primary/90 text-white font-bold w-full sm:w-auto gap-1.5"
                onClick={handleContinueScan}
              >
                <Check className="w-4 h-4" /> Continuar Varredura (Próximos 20)
              </Button>
              <Button 
                variant="outline" 
                className="border-red-300 text-red-700 hover:bg-red-50 bg-white font-bold w-full sm:w-auto"
                onClick={handleCancelScan}
              >
                Finalizar Coleta Agora
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Terminal de Varredura Geográfica por Coordenadas */}
      {scanLogs.length > 0 && searchMethod === 'grid' && (
        <Card className="shadow-none border-none rounded-2xl bg-slate-900 text-green-400 p-5 font-mono text-[11px] space-y-1.5 max-h-60 overflow-y-auto border border-slate-800">
          {scanLogs.map((log, idx) => (
            <div key={idx} className="leading-relaxed whitespace-pre-wrap">{log}</div>
          ))}
          <div ref={logEndRef} />
        </Card>
      )}

      {/* Alerta de Busca Simples Incompleta */}
      {results.length > 0 && searchMethod === 'simple' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3 text-xs text-amber-800 font-medium">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-900 block mb-0.5">Nota sobre Limitações do Google Places:</span>
            A "Busca Simples" retornou apenas a primeira página de resultados limitados pelo Google. Para encontrar mais estabelecimentos (incluindo restaurantes menores e em bairros periféricos), utilize a <strong>Varredura Multicentricidade</strong> para traçar pontos de busca automaticamente.
          </div>
        </div>
      )}

      {/* Resultados da Busca */}
      {results.length > 0 && (() => {
        const reviewsThreshold = parseInt(minReviews, 10) || 0;
        const uniqueCitiesInResults = Array.from(new Set(results.map(r => cleanCityName(r.city)).filter(Boolean))).sort();
        const filteredResults = results.filter(r => {
          if (dismissedIds.has(r.id)) return false;
          // Aplica o filtro de avaliações APENAS na exibição — não descarta da coleta
          if (reviewsThreshold > 0 && r.reviewsCount < reviewsThreshold) return false;
          if (filterCity !== 'all' && cleanCityName(r.city) !== filterCity) return false;
          return (
            r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.category.toLowerCase().includes(searchTerm.toLowerCase())
          );
        });
        const itemsPerPage = 15;
        const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const paginatedResults = filteredResults.slice(startIndex, startIndex + itemsPerPage);
        const pendingImportCount = filteredResults.filter(r => {
          const status = importedKeys.get(getRestaurantUniqueKey(r.name, r.address));
          return status !== 'Visitado';
        }).length;
        
        return (
          <Card className="shadow-none border border-gray-100 rounded-2xl bg-white overflow-hidden">
            <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50 border-b border-gray-100 p-4">
              <div className="space-y-1">
                <CardTitle className="text-lg text-primary font-bold">Resultados Encontrados ({filteredResults.length})</CardTitle>
                <CardDescription>
                  {searchMethod === 'grid' 
                    ? `Mapeamento multicêntrico com ${gridDensity === 'low' ? '36' : gridDensity === 'medium' ? '81' : '144'} pontos de coordenadas concluído.`
                    : 'Varredura de texto simples do Google Places API.'
                  }
                </CardDescription>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 w-full md:w-auto items-center">
                {/* Caixa de Busca */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar restaurante na lista..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9 h-9 bg-white border-gray-300 text-sm focus-visible:ring-highlight focus-visible:ring-1"
                  />
                </div>

                {/* Filtro por Cidade */}
                {uniqueCitiesInResults.length > 0 && (
                  <div className="w-full sm:w-48">
                    <Select value={filterCity} onValueChange={(val) => { setFilterCity(val); setCurrentPage(1); }}>
                      <SelectTrigger className="h-9 bg-white border-gray-300 text-sm focus-visible:ring-highlight focus-visible:ring-1">
                        <SelectValue placeholder="Filtrar por cidade" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] overflow-y-auto">
                        <SelectItem value="all">Todas as cidades ({results.length})</SelectItem>
                        {uniqueCitiesInResults.map((cityName) => {
                          const count = results.filter(r => cleanCityName(r.city) === cityName).length;
                          return (
                            <SelectItem key={cityName} value={cityName}>
                              {cityName} ({count})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <Button size="sm" variant="outline" className="font-bold gap-1 border-gray-300 bg-white w-full sm:w-auto h-9" onClick={handleImportAll}>
                  <PlusCircle className="w-4 h-4 text-highlight" /> Importar Novos ({pendingImportCount}) para Fila Global
                </Button>
                {results.length > 0 && (
                  <Button 
                    size="sm" 
                    variant={isValidatingAll ? "destructive" : "outline"} 
                    className={`font-bold gap-1 h-9 w-full sm:w-auto ${
                      isValidatingAll 
                        ? "bg-red-600 hover:bg-red-700 text-white" 
                        : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                    }`} 
                    onClick={handleValidateAllIA}
                  >
                    {isValidatingAll ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Parar Validação IA
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        Validar Todos com IA
                      </>
                    )}
                  </Button>
                )}
                {results.length > 0 && (
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    className="font-bold gap-1 bg-red-600 hover:bg-red-700 w-full sm:w-auto h-9" 
                    onClick={handleClearPending}
                  >
                    <Trash2 className="w-4 h-4" /> Limpar Coleta
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredResults.length === 0 ? (
                <div className="text-center py-12 text-gray-500 font-medium">
                  Nenhum restaurante corresponde aos critérios de busca.
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50">
                        <TableHead className="font-bold">Nome</TableHead>
                        <TableHead className="font-bold">Categoria</TableHead>
                        <TableHead className="font-bold text-center">Nota (Avaliações)</TableHead>
                        <TableHead className="font-bold">Instagram</TableHead>
                        <TableHead className="font-bold text-center">Logo Insta</TableHead>
                        <TableHead className="font-bold">Cardápio</TableHead>
                        <TableHead className="font-bold">Horário</TableHead>
                        <TableHead className="font-bold">Endereço</TableHead>
                        <TableHead className="font-bold text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedResults.map((r) => {
                        const dbStatus = importedKeys.get(getRestaurantUniqueKey(r.name, r.address));
                        const isImported = dbStatus === 'true';
                        const isColetado = dbStatus === 'false';
                        const validationError = getImportValidationError(r);
                        return (
                          <TableRow 
                            key={r.id} 
                            className={`transition-all duration-200 ${
                              isImported 
                                ? 'bg-emerald-50/70 hover:bg-emerald-100/40 text-emerald-950 font-medium' 
                                : isColetado
                                ? 'bg-amber-50/40 hover:bg-amber-50/60'
                                : 'hover:bg-gray-50/50'
                            }`}
                          >
                            <TableCell className="font-semibold text-primary">
                              <div className="flex items-center gap-2 flex-wrap">
                                {r.googleMapsUrl ? (
                                  <a 
                                    href={r.googleMapsUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="hover:underline hover:text-highlight flex items-center gap-1 animate-none"
                                  >
                                    {r.name} <span className="text-[10px] text-gray-400 font-normal">↗</span>
                                  </a>
                                ) : (
                                  r.name
                                )}
                                {isImported && (
                                  <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none py-0 px-1.5 text-[9px] font-bold gap-0.5 rounded-full shrink-0">
                                    <Check className="w-2.5 h-2.5" /> Importado
                                  </Badge>
                                )}
                                {isColetado && (
                                  <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-none py-0 px-1.5 text-[9px] font-bold gap-0.5 rounded-full shrink-0">
                                    Coletado
                                  </Badge>
                                )}
                                {!isImported && validationError && (
                                  <Badge 
                                    className="bg-red-500 hover:bg-red-600 text-white border-none py-0 px-1.5 text-[9px] font-bold gap-0.5 rounded-full shrink-0 flex items-center"
                                    title={validationError}
                                  >
                                    <AlertCircle className="w-2.5 h-2.5" /> Incompleto
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className={isImported ? "text-emerald-900" : ""}>{r.category}</TableCell>
                            <TableCell className={`text-center font-bold ${isImported ? "text-emerald-900" : "text-amber-600"}`}>
                              ⭐ {r.rating.toFixed(1)} <span className="text-xs font-normal text-gray-400">({r.reviewsCount})</span>
                            </TableCell>
                            
                            {/* Instagram */}
                            <TableCell>
                              {r.instagram && !r.instagram.includes('facebook.com') && r.instagram.trim() !== '' ? (
                                <div className="flex items-center gap-1.5">
                                  <a 
                                    href={r.instagram} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-xs font-semibold text-pink-600 hover:text-pink-700 hover:underline flex items-center gap-1.5"
                                  >
                                    <InstagramIcon className="w-3.5 h-3.5" />
                                    <span>@{r.instagram.split('instagram.com/')[1]?.replace(/\//g,'').split('?')[0] || 'Link'}</span>
                                  </a>
                                  
                                  <button
                                    onClick={() => handleRebusca(r.id, 'scrape-logo')}
                                    disabled={!!loadingRebusca[`${r.id}-scrape-logo`]}
                                    className={`flex items-center justify-center p-1 rounded-md border transition-all ${
                                      loadingRebusca[`${r.id}-scrape-logo`]
                                        ? "bg-rose-50 text-rose-600 border-rose-200 cursor-not-allowed animate-pulse"
                                        : "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100 hover:text-rose-700 hover:border-rose-200 cursor-pointer"
                                    }`}
                                    title="Clique para extrair a foto de perfil (Fase 4) do Instagram e salvar como logo"
                                  >
                                    {loadingRebusca[`${r.id}-scrape-logo`] ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Sparkles className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleRebusca(r.id, 'instagram')}
                                  disabled={!!loadingRebusca[`${r.id}-instagram`]}
                                  className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-semibold border transition-all ${
                                    loadingRebusca[`${r.id}-instagram`]
                                      ? "bg-pink-50 text-pink-600 border-pink-200 cursor-not-allowed animate-pulse"
                                      : "bg-red-50 text-red-600 border-red-100 hover:bg-red-100 hover:text-red-700 hover:border-red-200 cursor-pointer"
                                  }`}
                                  title="Clique para rebuscar esta informação no Google"
                                >
                                  {loadingRebusca[`${r.id}-instagram`] ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      <span>Buscando...</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>Ausente</span>
                                      <Search className="w-2.5 h-2.5 opacity-70" />
                                    </>
                                  )}
                                </button>
                              )}
                            </TableCell>

                            {/* Logo Insta */}
                            <TableCell className="text-center">
                              {r.logo && r.logo.includes('/logos/') ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 shadow-sm bg-white shrink-0">
                                    <img 
                                      src={r.logo} 
                                      alt="Logo" 
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=50';
                                      }}
                                    />
                                  </div>
                                  <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-250 py-0.5 px-1.5 text-[9px] font-bold rounded-full">
                                    OK
                                  </Badge>
                                </div>
                              ) : (
                                <Badge className="bg-slate-50 text-slate-400 border-slate-200 py-0.5 px-1.5 text-[9px] font-semibold rounded-full">
                                  Pendente
                                </Badge>
                              )}
                            </TableCell>
 
                            {/* Cardápio */}
                            <TableCell>
                              {r.menuSourceUrl && r.menuSourceUrl.trim() !== '' ? (
                                <div className="flex items-center gap-1.5">
                                  <a 
                                    href={r.menuSourceUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 max-w-[100px] truncate"
                                  >
                                    <Globe className="w-3 h-3 shrink-0" />
                                    <span>{(() => {
                                      try {
                                        let cleanUrl = r.menuSourceUrl.trim();
                                        if (!/^https?:\/\//i.test(cleanUrl)) {
                                          cleanUrl = 'https://' + cleanUrl;
                                        }
                                        return new URL(cleanUrl).hostname.replace('www.','');
                                      } catch (err) {
                                        return r.menuSourceUrl;
                                      }
                                    })()}</span>
                                  </a>
                                  
                                  <button
                                    onClick={() => handleRebusca(r.id, 'scrape-menu')}
                                    disabled={!!loadingRebusca[`${r.id}-scrape-menu`]}
                                    className={`flex items-center justify-center p-1 rounded-md border transition-all ${
                                      loadingRebusca[`${r.id}-scrape-menu`]
                                        ? "bg-rose-50 text-rose-600 border-rose-200 cursor-not-allowed animate-pulse"
                                        : "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100 hover:text-rose-700 hover:border-rose-200 cursor-pointer"
                                    }`}
                                    title="Clique para extrair os itens de cardápio (Fase 3) deste link específico"
                                  >
                                    {loadingRebusca[`${r.id}-scrape-menu`] ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Sparkles className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleRebusca(r.id, 'menu')}
                                  disabled={!!loadingRebusca[`${r.id}-menu`]}
                                  className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-semibold border transition-all ${
                                    loadingRebusca[`${r.id}-menu`]
                                      ? "bg-amber-50 text-amber-600 border-amber-200 cursor-not-allowed animate-pulse"
                                      : "bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100 hover:text-amber-700 hover:border-amber-200 cursor-pointer"
                                  }`}
                                  title="Clique para rebuscar esta informação no Google/Instagram"
                                >
                                  {loadingRebusca[`${r.id}-menu`] ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      <span>Buscando...</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>Ausente</span>
                                      <Search className="w-2.5 h-2.5 opacity-70" />
                                    </>
                                  )}
                                </button>
                              )}
                            </TableCell>
 
                            {/* Horário */}
                            <TableCell>
                              {!r.openingHours || Object.keys(r.openingHours).length === 0 ? (
                                <button
                                  onClick={() => handleRebusca(r.id, 'hours')}
                                  disabled={!!loadingRebusca[`${r.id}-hours`]}
                                  className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-semibold border transition-all ${
                                    loadingRebusca[`${r.id}-hours`]
                                      ? "bg-slate-50 text-slate-500 border-slate-200 cursor-not-allowed animate-pulse"
                                      : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100 hover:text-slate-700 hover:border-slate-200 cursor-pointer"
                                  }`}
                                  title="Clique para rebuscar esta informação no Google Maps"
                                >
                                  {loadingRebusca[`${r.id}-hours`] ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      <span>Buscando...</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>Ausente</span>
                                      <Search className="w-2.5 h-2.5 opacity-70" />
                                    </>
                                  )}
                                </button>
                              ) : (
                                renderTableOpeningHours(r.openingHours)
                              )}
                            </TableCell>
 
                            <TableCell className="max-w-[150px] truncate text-gray-600">{r.address}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end items-center gap-1.5">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 font-bold gap-1 h-8 px-2"
                                  onClick={() => handleRebusca(r.id, 'ai-validation')}
                                  disabled={!!loadingRebusca[`${r.id}-ai-validation`]}
                                >
                                  {loadingRebusca[`${r.id}-ai-validation`] ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Sparkles className="w-3.5 h-3.5" /> 
                                  )}
                                  Validar IA
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-bold gap-1 h-8 px-2"
                                  onClick={() => setEditingRestaurant(r)}
                                >
                                  <Pencil className="w-3.5 h-3.5" /> Editar
                                </Button>

                                {isImported ? (
                                  <>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="text-red-500 hover:text-red-600 hover:bg-red-50 font-semibold gap-1 h-8 px-2"
                                      onClick={() => handleRemoveFromQueue(r)}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" /> Remover
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="text-highlight hover:text-highlight hover:bg-orange-50 font-bold gap-1 h-8 px-2"
                                      onClick={() => handleImport(r)}
                                    >
                                      <PlusCircle className="w-3.5 h-3.5" /> Importar
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="text-red-500 hover:text-red-600 hover:bg-red-50 font-semibold gap-1 h-8 px-2"
                                      onClick={() => {
                                        const newDismissed = new Set(dismissedIds);
                                        newDismissed.add(r.id);
                                        setDismissedIds(newDismissed);
                                        showSuccess(`"${r.name}" descartado da lista.`);
                                      }}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" /> Remover
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {/* Controles de Paginação */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50/50">
                      <div className="text-sm text-gray-500 font-medium">
                        Exibindo <span className="font-semibold text-primary">{startIndex + 1}</span> a{' '}
                        <span className="font-semibold text-primary">
                          {Math.min(startIndex + itemsPerPage, filteredResults.length)}
                        </span>{' '}
                        de <span className="font-semibold text-primary">{filteredResults.length}</span> locais
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="text-xs font-bold text-gray-600 px-2">
                          Página {currentPage} de {totalPages}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {results.length === 0 && !isLoading && (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <h3 className="font-semibold text-primary">Nenhuma busca realizada</h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
            Preencha a Cidade, UF e clique em "Buscar no Google Maps" para iniciar a varredura da API.
          </p>
        </div>
      )}

      {/* Modal de Detalhes / Edicao / IA Compartilhado */}
      <RestaurantDetailsDialog
        restaurant={editingRestaurant}
        isOpen={editingRestaurant !== null}
        onClose={() => setEditingRestaurant(null)}
        onSyncSuccess={async () => {
          // Recarrega a lista do banco e atualiza o restaurante selecionado no modal
          await loadScrapedFromSupabase();
        }}
      />
    </div>
  );
}

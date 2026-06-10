import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Trash2, 
  Search, 
  RefreshCw, 
  AlertTriangle, 
  Eye, 
  Globe, 
  Phone, 
  MapPin, 
  Instagram, 
  Facebook, 
  Link as LinkIcon, 
  Clock,
  ExternalLink,
  Database,
  CloudUpload,
  Save,
  Plus,
  Trash,
  Sparkles,
  PlusCircle,
  XCircle,
  Edit2
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { getDeterministicUUID } from '@/hooks/useAdminRestaurants';

const getRestaurantUniqueKey = (name: string, address: string) => {
  const cleanName = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
  const cleanAddress = address.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
  return `${cleanName}_${cleanAddress}`;
};

const cleanPhone = (phone: string) => {
  if (!phone) return '';
  return phone.replace(/[^\d+]/g, '');
};

const cleanAddress = (address: string) => {
  if (!address) return '';
  return address.trim();
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

const parseAddressString = (addressStr: string) => {
  let street = '';
  let number = 'S/N';
  let neighborhood = '';
  let city = '';
  let state = '';
  let cep = '';

  if (!addressStr) return { street, number, neighborhood, city, state, cep };

  let working = addressStr.trim();

  // 1. Extract CEP (e.g. 58039-021 or 58039021)
  const cepMatch = working.match(/\b\d{5}-\d{3}\b|\b\d{8}\b/);
  if (cepMatch) {
    cep = cepMatch[0];
    working = working.replace(cep, '').trim();
  }

  // 2. Extract State (UF) (e.g. PB, SP...) near the end
  const stateMatch = working.match(/[\s,-]\b([A-Z]{2})\b\s*$/) || working.match(/\b([A-Z]{2})\b\s*$/);
  if (stateMatch) {
    state = stateMatch[1];
    working = working.substring(0, working.lastIndexOf(stateMatch[0])).trim();
  }

  // Remove trailing/leading punctuation
  working = working.replace(/[\s,-]+$/, '').replace(/^[\s,-]+/, '').trim();

  // 3. Extract Street and Number
  const firstCommaIdx = working.indexOf(',');
  if (firstCommaIdx !== -1) {
    street = working.substring(0, firstCommaIdx).trim();
    const rest = working.substring(firstCommaIdx + 1).trim();
    
    const numMatch = rest.match(/^([^,-]+)/);
    if (numMatch) {
      const possibleNum = numMatch[1].trim();
      if (/\d/.test(possibleNum) || possibleNum.toLowerCase() === 's/n') {
        number = possibleNum;
        working = rest.substring(possibleNum.length).trim();
      } else {
        number = 'S/N';
        working = rest;
      }
    } else {
      working = rest;
    }
  } else {
    const firstHyphenIdx = working.indexOf('-');
    if (firstHyphenIdx !== -1) {
      street = working.substring(0, firstHyphenIdx).trim();
      working = working.substring(firstHyphenIdx).trim();
    } else {
      street = working;
      working = '';
    }
  }

  working = working.replace(/^[\s,-]+/, '').replace(/[\s,-]+$/, '').trim();

  // 4. Extract Neighborhood (Bairro) and City
  if (working) {
    const splitIdx = working.indexOf(',') !== -1 ? working.indexOf(',') : working.indexOf('-');
    if (splitIdx !== -1) {
      neighborhood = working.substring(0, splitIdx).trim();
      city = working.substring(splitIdx + 1).replace(/^[\s,-]+/, '').trim();
    } else {
      city = working;
    }
  }

  return { street, number, neighborhood, city, state, cep };
};


export default function ExportedRestaurants() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<any | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const [syncedIds, setSyncedIds] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<any | null>(null);
  const [aiPastedContent, setAiPastedContent] = useState('');
  const [isExtractingAI, setIsExtractingAI] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncingStatus, setSyncingStatus] = useState<string | null>(null);
  const [activeDialogTab, setActiveDialogTab] = useState<string>('preview');
  const [newGalleryUrl, setNewGalleryUrl] = useState('');
  const [aiModel, setAiModel] = useState<'gemini' | 'openai'>('gemini');

  const hasNoPhone = (r: any) => !r.phone || r.phone.trim() === '' || r.phone.toLowerCase().includes('sem telefone');
  
  const hasNoInstagram = (r: any) => {
    if (r.instagram) return r.instagram.trim() === '' || r.instagram.includes('facebook.com') || r.instagram.includes('instagram.com/p/');
    if (r.social_networks) {
      const net = r.social_networks.find((s: any) => s.platform === 'instagram');
      return !net || !net.url || net.url.trim() === '';
    }
    return true;
  };

  const hasNoMenu = (r: any) => !r.menuSourceUrl || r.menuSourceUrl.trim() === '';

  const hasNoStructuredMenu = (r: any) => {
    const categories = r.menu_categories || r.menuCategories || [];
    if (categories.length === 0) return true;
    return !categories.some((c: any) => {
      const items = c.items || c.menu_items || [];
      return items.length > 0;
    });
  };

  const hasNoHours = (r: any) => {
    const hours = r.openingHours || r.opening_hours;
    if (!hours) return true;
    const days = Object.values(hours);
    if (days.length === 0) return true;
    return !days.some((d: any) => d.isOpen === true);
  };

  const mapSupabaseToLocal = (dbItem: any) => {
    const socialNetworks = dbItem.social_networks || [];
    const instagram = socialNetworks.find((sn: any) => sn && sn.platform === 'instagram')?.url || '';
    const facebook = socialNetworks.find((sn: any) => sn && sn.platform === 'facebook')?.url || '';

    const menuCategories = (dbItem.menu_categories || []).map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      items: (cat.menu_items || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        price: item.price,
        image_url: item.image_url || ''
      }))
    }));

    let googleMapsUrl = '';
    const visitNotes = dbItem.visit_notes || '';
    const gmapsMatch = visitNotes.match(/Google Maps:\s*(https?:\/\/[^\s\n\r]+)/);
    if (gmapsMatch) {
      googleMapsUrl = gmapsMatch[1];
    }

    return {
      id: dbItem.id,
      name: dbItem.name,
      category: dbItem.category || '',
      phone: dbItem.phone || '',
      cep: dbItem.cep || '',
      address: dbItem.address || '',
      number: dbItem.number || '',
      neighborhood: dbItem.neighborhood || '',
      city: dbItem.city || '',
      state: dbItem.state || '',
      description: dbItem.description || '',
      logo: dbItem.image_url || '',
      coverImage: dbItem.cover_image_url || '',
      cover_image_url: dbItem.cover_image_url || '',
      visit_status: dbItem.visit_status || 'Pendente',
      visit_notes: dbItem.visit_notes || '',
      claim_code: dbItem.claim_code || '',
      openingHours: dbItem.opening_hours || null,
      opening_hours: dbItem.opening_hours || null,
      social_networks: socialNetworks,
      instagram: instagram,
      facebook: facebook,
      website: instagram || dbItem.other_url || dbItem.external_url || '',
      menuSourceUrl: dbItem.other_url || dbItem.external_url || '',
      menuUrl: dbItem.other_url || dbItem.external_url || '',
      latitude: dbItem.latitude,
      longitude: dbItem.longitude,
      menu_categories: menuCategories,
      rating: typeof dbItem.rating === 'number' ? dbItem.rating : 4.0,
      reviewsCount: typeof dbItem.reviews_count === 'number' ? dbItem.reviews_count : 10,
      googleMapsUrl
    };
  };

  const loadRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select(`
          *,
          menu_categories (
            *,
            menu_items (*)
          )
        `)
        .eq('visit_status', 'Visitado')
        .or('is_deleted.eq.false,is_deleted.is.null')
        .order('name');
        
      if (error) throw error;

      if (data) {
        const mappedList = data.map(mapSupabaseToLocal);
        setRestaurants(mappedList);
        
        // Todos do Supabase são considerados sincronizados
        const syncedSet = new Set(data.map(item => item.id));
        setSyncedIds(syncedSet);
      } else {
        setRestaurants([]);
        setSyncedIds(new Set());
      }
    } catch (e) {
      console.error(e);
      showError('Erro ao carregar os restaurantes do Supabase.');
    }
  };

  useEffect(() => {
    loadRestaurants();

    const handleSync = () => {
      loadRestaurants();
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('local-sync-restaurants', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('local-sync-restaurants', handleSync);
    };
  }, []);

  const handleRemove = async (restaurant: any) => {
    if (!window.confirm(`Tem certeza que deseja remover o restaurante "${restaurant.name}"?`)) {
      return;
    }

    try {
      const uuid = getDeterministicUUID(restaurant.id);
      const { error: deleteError } = await supabase
        .from('restaurants')
        .update({ is_deleted: true })
        .eq('id', uuid);

      if (deleteError) {
        console.error('Erro ao remover do Supabase:', deleteError);
        showError('Erro ao remover do banco de dados.');
      } else {
        showSuccess(`"${restaurant.name}" removido com sucesso!`);
        setSelectedRestaurant(null);
        loadRestaurants();
        
        // Também avisa a aba de coleta para recarregar
        window.dispatchEvent(new Event('local-sync-restaurants'));
      }
    } catch (e) {
      console.error(e);
      showError('Erro ao remover o restaurante.');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Tem certeza que deseja apagar TODOS os estabelecimentos do Supabase? Esta ação é irreversível.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('restaurants')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) {
        console.error('Erro ao limpar Supabase:', error);
        showError('Erro ao limpar Supabase.');
      } else {
        showSuccess('Todos os restaurantes foram removidos do Supabase!');
        loadRestaurants();
        window.dispatchEvent(new Event('local-sync-restaurants'));
      }
    } catch (e) {
      console.error(e);
      showError('Erro ao limpar base do Supabase.');
    }
  };

  const syncSingleToSupabase = async (restaurant: any): Promise<boolean> => {
    try {
      const uuidId = getDeterministicUUID(restaurant.id);
      
      let latitude = null;
      let longitude = null;
      if (restaurant.googleMapsUrl) {
        const coords = extractCoordsFromUrl(restaurant.googleMapsUrl);
        if (coords) {
          latitude = coords.lat;
          longitude = coords.lng;
        }
      }

      let visitNotes = restaurant.visit_notes || `Fonte Cardápio: ${restaurant.menuSourceUrl || 'Não informado'}`;
      if (restaurant.googleMapsUrl) {
        if (visitNotes.includes('Google Maps:')) {
          visitNotes = visitNotes.replace(/Google Maps:\s*(https?:\/\/[^\s]+)/, `Google Maps: ${restaurant.googleMapsUrl}`);
        } else {
          visitNotes = `${visitNotes}\nGoogle Maps: ${restaurant.googleMapsUrl}`.trim();
        }
      }

      // Prepara objeto restaurante
      const restaurantData: any = {
        id: uuidId,
        name: restaurant.name,
        plan: restaurant.plan || 'free',
        phone: cleanPhone(restaurant.phone || ''),
        cep: restaurant.cep || '',
        address: cleanAddress(restaurant.address || ''),
        number: restaurant.number || '',
        neighborhood: restaurant.neighborhood || '',
        city: restaurant.city || '',
        state: restaurant.state || '',
        description: restaurant.description || '',
        category: restaurant.category || '',
        image_url: restaurant.logo || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100',
        cover_image_url: restaurant.coverImage || restaurant.cover_image_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
        visit_status: 'Visitado',
        visit_notes: visitNotes,
        claim_code: restaurant.claim_code || 'CLAIM-' + uuidId.substring(0, 5).toUpperCase(),
        opening_hours: restaurant.openingHours || restaurant.opening_hours || null,
        social_networks: restaurant.social_networks || [
          { platform: 'instagram', url: restaurant.instagram || '' },
          { platform: 'facebook', url: restaurant.facebook || '' }
        ].filter((s: any) => s.url),
        rating: restaurant.rating || null,
        reviews_count: restaurant.reviewsCount || null
      };

      if (latitude !== null) restaurantData.latitude = latitude;
      if (longitude !== null) restaurantData.longitude = longitude;

      // 1. Upsert Restaurant
      const { error: restError } = await supabase
        .from('restaurants')
        .upsert(restaurantData);

      if (restError) throw restError;

      // 2. Limpar categorias antigas para recriar (cascade delete limpará pratos)
      const { error: deleteCatError } = await supabase
        .from('menu_categories')
        .delete()
        .eq('restaurant_id', uuidId);

      if (deleteCatError) {
        console.warn("Erro ao limpar categorias antigas no Supabase:", deleteCatError.message);
      }

      // 3. Inserir Categorias e Pratos
      const categories = restaurant.menu_categories || restaurant.menuCategories || [];
      for (let catIdx = 0; catIdx < categories.length; catIdx++) {
        const cat = categories[catIdx];
        const catUuid = getDeterministicUUID(cat.id || `cat-${cat.name}-${catIdx}`);

        const { error: catError } = await supabase
          .from('menu_categories')
          .insert({
            id: catUuid,
            restaurant_id: uuidId,
            name: cat.name,
            order_index: catIdx,
            is_active: true
          });

        if (catError) throw catError;

        const items = cat.items || cat.menu_items || [];
        if (items.length > 0) {
          const itemsToInsert = items.map((item: any, itemIdx: number) => {
            let priceVal = 0;
            if (typeof item.price === 'number') {
              priceVal = item.price;
            } else if (item.price) {
              const cleaned = String(item.price).replace(/[^\d.,]/g, '').replace(',', '.');
              priceVal = parseFloat(cleaned) || 0;
            }
            return {
              id: getDeterministicUUID(item.id || `item-${item.name}-${itemIdx}`),
              category_id: catUuid,
              name: item.name,
              description: item.description || '',
              price: priceVal,
              image_url: item.image_url || '',
              order_index: itemIdx,
              is_active: true
            };
          });

          const { error: itemsError } = await supabase
            .from('menu_items')
            .insert(itemsToInsert);

          if (itemsError) throw itemsError;
        }
      }

      // 4. Inserir Galeria de Fotos
      const gallery = restaurant.gallery_images || restaurant.galleryImages || [];
      if (gallery.length > 0) {
        await supabase.from('restaurant_gallery').delete().eq('restaurant_id', uuidId);

        const galleryToInsert = gallery.map((img: any, idx: number) => {
          const imgUrl = typeof img === 'string' ? img : (img.image_url || img.url || '');
          return {
            restaurant_id: uuidId,
            image_url: imgUrl,
            caption: img.caption || 'Foto do Local',
            order_index: idx
          };
        }).filter((g: any) => g.image_url);

        if (galleryToInsert.length > 0) {
          const { error: galleryError } = await supabase
            .from('restaurant_gallery')
            .insert(galleryToInsert);
            
          if (galleryError) console.warn("Erro ao salvar fotos da galeria:", galleryError.message);
        }
      }

      return true;
    } catch (err: any) {
      console.error(`Erro ao sincronizar restaurante "${restaurant.name}":`, err);
      return false;
    }
  };

  const handleSyncSingle = async (restaurant: any) => {
    const syncToast = showSuccess(`Sincronizando "${restaurant.name}" com o Supabase...`);
    const success = await syncSingleToSupabase(restaurant);
    if (success) {
      showSuccess(`"${restaurant.name}" sincronizado com sucesso!`);
      loadRestaurants();
    } else {
      showError(`Falha ao sincronizar "${restaurant.name}". Verifique o console.`);
    }
  };

  const handleSyncAll = async () => {
    if (restaurants.length === 0) {
      showError('Nenhum restaurante para sincronizar.');
      return;
    }

    if (!window.confirm(`Deseja sincronizar todos os ${restaurants.length} restaurantes com o Supabase em lote?`)) {
      return;
    }

    setIsSyncingAll(true);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < restaurants.length; i++) {
      const r = restaurants[i];
      setSyncingStatus(`Sincronizando ${i + 1}/${restaurants.length}: ${r.name}`);
      try {
        const success = await syncSingleToSupabase(r);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        console.error(err);
        failCount++;
      }
    }

    setIsSyncingAll(false);
    setSyncingStatus(null);
    loadRestaurants();

    if (successCount > 0) {
      showSuccess(`${successCount} restaurante(s) sincronizado(s) no Supabase!`);
    }
    if (failCount > 0) {
      showError(`${failCount} restaurante(s) falharam na sincronização.`);
    }
  };

  const handleAIExtraction = async () => {
    if (!aiPastedContent.trim()) {
      showError('Cole o texto do cardápio bruto ou HTML antes de processar.');
      return;
    }

    const apiKey = aiModel === 'gemini' 
      ? import.meta.env.VITE_GEMINI_API_KEY 
      : import.meta.env.VITE_OPENAI_API_KEY;

    if (!apiKey) {
      showError(`Chave API para ${aiModel === 'gemini' ? 'Gemini' : 'OpenAI'} não está configurada no ambiente.`);
      return;
    }

    setIsExtractingAI(true);
    try {
      const prompt = `Você é um assistente de IA especialista em cardápios de restaurantes.
Analise o seguinte texto bruto extraído de um cardápio (por exemplo, via transcrição ou OCR, ou o código fonte HTML/texto contendo links de imagens dos pratos) e organize-o em categorias, itens, descrições, preços e imagens dos pratos.

Regras importantes:
1. Identifique as categorias de forma lógica (ex: "Entradas", "Pratos Principais", "Hambúrgueres", "Bebidas", "Sobremesas").
2. Para cada item, extraia o nome, a descrição (ingredientes, detalhes de tamanho, acompanhamentos) e o preço.
3. Se houver links de imagem associados aos pratos no texto/código fonte colado (ex: URLs de imagem terminando em .png, .jpg, .jpeg, etc. ou atributos src de tags img), extraia-os exatamente no campo "image_url". Se não houver, deixe como string vazia.
4. Formate o preço estritamente como um número (ex: se for R$ 35,90 ou 35.90, retorne 35.90. Se for 12, retorne 12.00). Não inclua o símbolo "R$".
5. Remova qualquer texto irrelevante ou de rodapé.
6. Retorne a resposta estritamente no formato JSON, seguindo este esquema:
[
  {
    "name": "Nome da Categoria",
    "items": [
      {
        "name": "Nome do Prato",
        "description": "Descrição detalhada ou ingredientes",
        "price": 35.90,
        "image_url": "URL da imagem encontrada para o prato ou string vazia"
      }
    ]
  }
]

Texto bruto do cardápio:
${aiPastedContent}
`;

      let text = '';
      if (aiModel === 'openai') {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }]
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error?.message || `Erro HTTP OpenAI: ${response.status}`);
        }

        const result = await response.json();
        text = result.choices?.[0]?.message?.content || '';
      } else {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              responseMimeType: "application/json"
            }
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error?.message || `Erro HTTP Gemini: ${response.status}`);
        }

        const result = await response.json();
        text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }

      if (text.includes('```json')) {
        text = text.split('```json')[1].split('```')[0].trim();
      } else if (text.includes('```')) {
        text = text.split('```')[1].split('```')[0].trim();
      }

      let parsed = JSON.parse(text);

      if (!Array.isArray(parsed) && parsed && typeof parsed === 'object') {
        const arrayKey = Object.keys(parsed).find(key => Array.isArray(parsed[key]));
        if (arrayKey) {
          parsed = parsed[arrayKey];
        } else {
          throw new Error('Formato retornado pela IA não é compatível com uma lista.');
        }
      }

      if (!Array.isArray(parsed)) {
        throw new Error('A resposta da IA não retornou uma lista.');
      }

      const formattedCategories = parsed.map((cat: any, cIdx: number) => ({
        id: `cat-${Date.now()}-${cIdx}-${Math.random().toString(36).substring(2, 5)}`,
        name: cat.name || 'Outros',
        items: (cat.items || []).map((item: any, iIdx: number) => ({
          id: `item-${Date.now()}-${cIdx}-${iIdx}-${Math.random().toString(36).substring(2, 5)}`,
          name: item.name || '',
          description: item.description || '',
          price: item.price ? Number(item.price) : 0,
          image_url: item.image_url || ''
        }))
      }));

      setEditedData((prev: any) => ({
        ...prev,
        menu_categories: formattedCategories
      }));

      showSuccess(`Sucesso! IA extraiu ${formattedCategories.length} categorias do cardápio.`);
      setAiPastedContent('');
      setActiveDialogTab('edit'); // Redireciona para o formulário de edição para visualizar
    } catch (e: any) {
      console.error(e);
      showError(`Falha na extração de IA: ${e.message || 'Verifique o formato e as chaves de API.'}`);
    } finally {
      setIsExtractingAI(false);
    }
  };

  const handleSaveLocal = async () => {
    if (!editedData) return;

    try {
      // Salva diretamente no Supabase em tempo real!
      const success = await syncSingleToSupabase(editedData);
      if (success) {
        showSuccess('Alterações salvas no Supabase!');
        setSelectedRestaurant(editedData);
        setIsEditing(false);
        loadRestaurants();
      } else {
        showError('Erro ao sincronizar com o banco de dados.');
      }
    } catch (e) {
      console.error(e);
      showError('Erro ao salvar no Supabase.');
    }
  };

  const handleValidateAndSave = async () => {
    if (!editedData) return;

    const finalData = {
      ...editedData,
      visit_status: 'Visitado'
    };

    const syncToast = showSuccess('Salvando e validando restaurante no Supabase...');
    const success = await syncSingleToSupabase(finalData);

    if (success) {
      showSuccess('Restaurante validado e publicado no catálogo público!');
      setSelectedRestaurant(finalData);
      setIsEditing(false);
      loadRestaurants();
    } else {
      showError('Erro ao sincronizar com o banco de dados.');
    }
  };

  const handleDeleteMenu = () => {
    if (!window.confirm('Deseja realmente excluir todo o cardápio deste restaurante?')) return;
    setEditedData((prev: any) => ({
      ...prev,
      menu_categories: []
    }));
    showSuccess('Cardápio limpo no formulário de edição.');
  };

  const handleDeleteRestaurant = () => {
    if (selectedRestaurant) {
      handleRemove(selectedRestaurant);
    }
  };

  // Funções de manipulação do cardápio estruturado no Form
  const handleEditCategoryName = (catId: string, name: string) => {
    setEditedData((prev: any) => ({
      ...prev,
      menu_categories: prev.menu_categories.map((c: any) => c.id === catId ? { ...c, name } : c)
    }));
  };

  const handleAddCategory = () => {
    const newCat = {
      id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      name: 'Nova Categoria',
      items: []
    };
    setEditedData((prev: any) => ({
      ...prev,
      menu_categories: [...(prev.menu_categories || []), newCat]
    }));
  };

  const handleRemoveCategory = (catId: string) => {
    setEditedData((prev: any) => ({
      ...prev,
      menu_categories: prev.menu_categories.filter((c: any) => c.id !== catId)
    }));
  };

  const handleAddItem = (catId: string) => {
    const newItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      name: '',
      price: 0,
      description: '',
      image_url: ''
    };
    setEditedData((prev: any) => ({
      ...prev,
      menu_categories: prev.menu_categories.map((c: any) => {
        if (c.id === catId) {
          return {
            ...c,
            items: [...(c.items || []), newItem]
          };
        }
        return c;
      })
    }));
  };

  const handleRemoveItem = (catId: string, itemId: string) => {
    setEditedData((prev: any) => ({
      ...prev,
      menu_categories: prev.menu_categories.map((c: any) => {
        if (c.id === catId) {
          return {
            ...c,
            items: c.items.filter((item: any) => item.id !== itemId)
          };
        }
        return c;
      })
    }));
  };

  const handleEditItem = (catId: string, itemId: string, field: string, val: any) => {
    setEditedData((prev: any) => ({
      ...prev,
      menu_categories: prev.menu_categories.map((c: any) => {
        if (c.id === catId) {
          return {
            ...c,
            items: c.items.map((item: any) => {
              if (item.id === itemId) {
                if (field === 'price') {
                  const cleaned = String(val).replace(/[^\d.,]/g, '').replace(',', '.');
                  return { ...item, price: parseFloat(cleaned) || 0 };
                }
                return { ...item, [field]: val };
              }
              return item;
            })
          };
        }
        return c;
      })
    }));
  };

  // Funções de horários no Form
  const handleEditHoursToggle = (day: string, checked: boolean) => {
    setEditedData((prev: any) => {
      const hours = prev.openingHours || prev.opening_hours || {};
      const dayInfo = hours[day] || { isOpen: false, slots: [] };
      const newHours = {
        ...hours,
        [day]: {
          ...dayInfo,
          isOpen: checked,
          slots: checked && dayInfo.slots.length === 0 ? [{ start: '11:00', end: '22:00' }] : dayInfo.slots
        }
      };
      return {
        ...prev,
        openingHours: newHours,
        opening_hours: newHours
      };
    });
  };

  const handleEditHoursSlot = (day: string, index: number, field: string, val: string) => {
    setEditedData((prev: any) => {
      const hours = prev.openingHours || prev.opening_hours || {};
      const dayInfo = hours[day] || { isOpen: true, slots: [] };
      const updatedSlots = [...dayInfo.slots];
      if (updatedSlots.length === 0) {
        updatedSlots.push({ start: '11:00', end: '22:00' });
      }
      updatedSlots[index] = {
        ...updatedSlots[index],
        [field]: val
      };
      const newHours = {
        ...hours,
        [day]: {
          ...dayInfo,
          slots: updatedSlots
        }
      };
      return {
        ...prev,
        openingHours: newHours,
        opening_hours: newHours
      };
    });
  };

  // Galeria de fotos
  const handleAddGalleryUrl = () => {
    if (!newGalleryUrl.trim()) return;
    setEditedData((prev: any) => {
      const gallery = prev.gallery_images || prev.galleryImages || [];
      const newGallery = [...gallery, newGalleryUrl.trim()];
      return {
        ...prev,
        galleryImages: newGallery,
        gallery_images: newGallery
      };
    });
    setNewGalleryUrl('');
    showSuccess('Link de foto adicionado!');
  };

  const handleRemoveGalleryUrl = (index: number) => {
    setEditedData((prev: any) => {
      const gallery = prev.gallery_images || prev.galleryImages || [];
      const newGallery = gallery.filter((_: any, idx: number) => idx !== index);
      return {
        ...prev,
        galleryImages: newGallery,
        gallery_images: newGallery
      };
    });
  };

  const filteredRestaurants = restaurants.filter(r => {
    const matchesSearch = 
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.category.toLowerCase().includes(searchTerm.toLowerCase());
      
    if (!matchesSearch) return false;
    
    if (filterType === 'missing_any') {
      return hasNoPhone(r) || hasNoInstagram(r) || hasNoMenu(r) || hasNoHours(r) || hasNoStructuredMenu(r);
    }
    if (filterType === 'missing_phone') {
      return hasNoPhone(r);
    }
    if (filterType === 'missing_instagram') {
      return hasNoInstagram(r);
    }
    if (filterType === 'missing_menu') {
      return hasNoMenu(r);
    }
    if (filterType === 'missing_hours') {
      return hasNoHours(r);
    }
    if (filterType === 'unstructured_menu') {
      return !hasNoMenu(r) && hasNoStructuredMenu(r);
    }
    if (filterType === 'completed') {
      return !hasNoPhone(r) && !hasNoInstagram(r) && !hasNoMenu(r) && !hasNoHours(r) && !hasNoStructuredMenu(r);
    }
    if (filterType === 'synced') {
      return syncedIds.has(getDeterministicUUID(r.id));
    }
    if (filterType === 'unsynced') {
      return !syncedIds.has(getDeterministicUUID(r.id));
    }
    
    return true;
  });

  const getSocialUrl = (restaurant: any, platform: string) => {
    if (platform === 'instagram' && restaurant.instagram) return restaurant.instagram;
    if (platform === 'facebook' && restaurant.facebook) return restaurant.facebook;
    if (restaurant.social_networks) {
      const net = restaurant.social_networks.find((s: any) => s.platform === platform);
      return net?.url || '';
    }
    return '';
  };

  const renderOpeningHours = (hours: any) => {
    if (!hours) return <p className="text-gray-400 text-xs font-semibold">Sem horários informados</p>;
    
    const daysTranslation: Record<string, string> = {
      monday: 'Segunda-feira',
      tuesday: 'Terça-feira',
      wednesday: 'Quarta-feira',
      thursday: 'Quinta-feira',
      friday: 'Sexta-feira',
      saturday: 'Sábado',
      sunday: 'Domingo'
    };

    return (
      <div className="grid grid-cols-1 gap-1.5 bg-gray-50 p-4 rounded-2xl border border-gray-100">
        {Object.entries(daysTranslation).map(([dayKey, label]) => {
          const info = hours[dayKey];
          const isOpen = info?.isOpen;
          const slots = info?.slots || [];
          return (
            <div key={dayKey} className="flex justify-between text-xs py-1 border-b border-gray-100 last:border-0 last:pb-0">
              <span className="font-bold text-gray-600">{label}</span>
              <span className={isOpen ? "text-emerald-600 font-bold" : "text-gray-400 font-medium"}>
                {isOpen 
                  ? slots.map((s: any) => `${s.start} - ${s.end}`).join(', ') 
                  : 'Fechado'}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const openDetails = (restaurant: any) => {
    let parsedAddress = {
      street: restaurant.address || '',
      number: restaurant.number || '',
      neighborhood: restaurant.neighborhood || '',
      city: restaurant.city || '',
      state: restaurant.state || '',
      cep: restaurant.cep || ''
    };
    
    // Auto-parse if cep/number/neighborhood are empty but address contains full address string
    if (!restaurant.cep && restaurant.address && (restaurant.address.includes(',') || restaurant.address.includes('-'))) {
      const parsed = parseAddressString(restaurant.address);
      parsedAddress = {
        street: parsed.street || restaurant.address || '',
        number: parsed.number || restaurant.number || 'S/N',
        neighborhood: parsed.neighborhood || restaurant.neighborhood || '',
        city: parsed.city || restaurant.city || '',
        state: parsed.state || restaurant.state || '',
        cep: parsed.cep || restaurant.cep || ''
      };
    }
    
    const formattedRestaurant = {
      ...restaurant,
      address: parsedAddress.street,
      number: parsedAddress.number,
      neighborhood: parsedAddress.neighborhood,
      city: parsedAddress.city,
      state: parsedAddress.state,
      cep: parsedAddress.cep
    };

    setSelectedRestaurant(formattedRestaurant);
    setEditedData(JSON.parse(JSON.stringify(formattedRestaurant)));
    setIsEditing(false);
    setActiveDialogTab('preview');
  };

  const daysTranslation: Record<string, string> = {
    monday: 'Segunda-feira',
    tuesday: 'Terça-feira',
    wednesday: 'Quarta-feira',
    thursday: 'Quinta-feira',
    friday: 'Sexta-feira',
    saturday: 'Sábado',
    sunday: 'Domingo'
  };

  return (
    <div className="space-y-6 p-4">
      {/* Header Info */}
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-6 h-6 text-primary" />
              <CardTitle className="text-2xl text-primary font-bold">Restaurantes Importados</CardTitle>
            </div>
            <CardDescription className="mt-1">
              Visualize, edite e sincronize os estabelecimentos e cardápios coletados pelo robô direto no Supabase.
            </CardDescription>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={loadRestaurants} className="gap-1 border-gray-300 font-semibold bg-white w-full sm:w-auto">
              <RefreshCw className="w-3.5 h-3.5" /> Atualizar
            </Button>
            <Button 
              size="sm" 
              onClick={handleSyncAll}
              disabled={isSyncingAll || restaurants.length === 0}
              className="gap-1 font-bold bg-[#022D68] text-white hover:bg-[#022D68]/95 w-full sm:w-auto"
            >
              <CloudUpload className="w-3.5 h-3.5" /> Sincronizar Tudo
            </Button>
            {restaurants.length > 0 && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleClearAll} 
                className="gap-1 font-bold w-full sm:w-auto bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-3.5 h-3.5" /> Limpar Fila
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Sync Status Banner */}
      {isSyncingAll && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="py-4 flex items-center gap-3">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
            <p className="text-sm font-semibold text-blue-800">{syncingStatus || 'Sincronizando estabelecimentos...'}</p>
          </CardContent>
        </Card>
      )}

      {/* Barra de Busca e Filtros */}
      <div className="flex flex-col gap-4 p-5 bg-white shadow-soft-md rounded-2xl border border-gray-100">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nome, categoria ou endereço..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 bg-white border-gray-300 text-sm focus-visible:ring-highlight"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button 
            variant={filterType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('all')}
            className={`font-semibold rounded-full ${filterType === 'all' ? 'bg-[#022D68] text-white hover:bg-[#022D68]/95' : 'border-gray-200 text-slate-600 bg-white'}`}
          >
            Todos ({restaurants.length})
          </Button>
          <Button 
            variant={filterType === 'completed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('completed')}
            className={`font-semibold rounded-full ${filterType === 'completed' ? 'bg-[#022D68] text-white hover:bg-[#022D68]/95' : 'border-gray-200 text-slate-600 bg-white'}`}
          >
            Completos ✨ ({restaurants.filter(r => !hasNoPhone(r) && !hasNoInstagram(r) && !hasNoMenu(r) && !hasNoHours(r) && !hasNoStructuredMenu(r)).length})
          </Button>
          <Button 
            variant={filterType === 'unstructured_menu' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('unstructured_menu')}
            className={`font-semibold rounded-full ${filterType === 'unstructured_menu' ? 'bg-[#022D68] text-white hover:bg-[#022D68]/95' : 'border-gray-200 text-slate-600 bg-white'}`}
          >
            Cardápio Não Estruturado ({restaurants.filter(r => !hasNoMenu(r) && hasNoStructuredMenu(r)).length})
          </Button>
          <Button 
            variant={filterType === 'missing_menu' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('missing_menu')}
            className={`font-semibold rounded-full ${filterType === 'missing_menu' ? 'bg-[#022D68] text-white hover:bg-[#022D68]/95' : 'border-gray-200 text-slate-600 bg-white'}`}
          >
            Sem Link Cardápio ({restaurants.filter(r => hasNoMenu(r)).length})
          </Button>
          <Button 
            variant={filterType === 'missing_phone' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('missing_phone')}
            className={`font-semibold rounded-full ${filterType === 'missing_phone' ? 'bg-[#022D68] text-white hover:bg-[#022D68]/95' : 'border-gray-200 text-slate-600 bg-white'}`}
          >
            Sem Telefone ({restaurants.filter(r => hasNoPhone(r)).length})
          </Button>
          <Button 
            variant={filterType === 'synced' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('synced')}
            className={`font-semibold rounded-full ${filterType === 'synced' ? 'bg-[#022D68] text-white hover:bg-[#022D68]/95' : 'border-gray-200 text-slate-600 bg-white'}`}
          >
            Sincronizados Supabase ({restaurants.filter(r => syncedIds.has(getDeterministicUUID(r.id))).length})
          </Button>
          <Button 
            variant={filterType === 'unsynced' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('unsynced')}
            className={`font-semibold rounded-full ${filterType === 'unsynced' ? 'bg-[#022D68] text-white hover:bg-[#022D68]/95' : 'border-gray-200 text-slate-600 bg-white'}`}
          >
            Pendente Sincronia ({restaurants.filter(r => !syncedIds.has(getDeterministicUUID(r.id))).length})
          </Button>
        </div>
      </div>

      {/* Lista de Estabelecimentos */}
      <Card className="shadow-soft-lg border border-gray-100 rounded-2xl bg-white overflow-hidden">
        <CardContent className="p-0">
          {filteredRestaurants.length === 0 ? (
            <div className="text-center py-16 text-gray-500 font-medium">
              <Search className="w-12 h-12 text-gray-200 mx-auto mb-2" />
              Nenhum restaurante importado corresponde aos filtros aplicados.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead className="font-bold">Restaurante</TableHead>
                  <TableHead className="font-bold">Contato</TableHead>
                  <TableHead className="font-bold">Cardápio</TableHead>
                  <TableHead className="font-bold text-center">Horários</TableHead>
                  <TableHead className="font-bold text-center">Banco de Dados</TableHead>
                  <TableHead className="font-bold text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRestaurants.map((r) => {
                  const uuid = getDeterministicUUID(r.id);
                  const isSynced = syncedIds.has(uuid);
                  const hasMenuLink = !hasNoMenu(r);
                  const hasStructured = !hasNoStructuredMenu(r);

                  return (
                    <TableRow key={r.id} className="hover:bg-gray-50/50">
                      <TableCell className="font-semibold text-primary">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 flex-wrap">
                            {r.googleMapsUrl ? (
                              <a 
                                href={r.googleMapsUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="hover:underline hover:text-highlight flex items-center gap-1 text-sm font-bold text-slate-800"
                              >
                                {r.name} <ExternalLink className="w-3 h-3 text-gray-400" />
                              </a>
                            ) : (
                              <span className="text-sm font-bold text-slate-800">{r.name}</span>
                            )}
                            {r.isClosed && (
                              <Badge className="bg-red-50 text-red-700 border border-red-200 text-[10px] py-0 px-1.5 h-4 font-bold rounded-md">
                                FECHADO
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 font-medium">{r.category} • {r.city}/{r.state}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-xs">
                          {hasNoPhone(r) ? (
                            <span className="text-red-500 font-bold">Sem telefone</span>
                          ) : (
                            <span className="flex items-center gap-1 font-semibold text-slate-700">
                              <Phone className="w-3 h-3 text-slate-400" /> {r.phone}
                            </span>
                          )}
                          <div className="flex items-center gap-1.5">
                            {getSocialUrl(r, 'instagram') && (
                              <a href={getSocialUrl(r, 'instagram')} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:text-pink-800">
                                <Instagram className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {getSocialUrl(r, 'facebook') && (
                              <a href={getSocialUrl(r, 'facebook')} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                                <Facebook className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {r.website && (
                              <a href={r.website} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-slate-800">
                                <Globe className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {!hasMenuLink ? (
                            <Badge className="bg-red-50 text-red-700 border border-red-200 text-[10px] py-0.5 rounded-md font-bold w-fit">Sem link</Badge>
                          ) : hasStructured ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] py-0.5 rounded-md font-bold w-fit">Estruturado ✨</Badge>
                          ) : (
                            <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] py-0.5 rounded-md font-bold w-fit">Não estruturado</Badge>
                          )}
                          {hasMenuLink && (
                            <a href={r.menuSourceUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5 font-bold truncate max-w-[120px]">
                              Ver fonte <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {hasNoHours(r) ? (
                          <Badge className="bg-red-50 text-red-600 border border-red-200 text-[10px] py-0.5 font-semibold">Não possui</Badge>
                        ) : (
                          <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] py-0.5 font-bold">Cadastrado</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {isSynced ? (
                          <Badge className="bg-green-100 text-green-800 border-none font-bold gap-1 text-[10px] py-0.5 px-2">
                            <Database className="w-3 h-3" /> Sincronizado
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-500 border-none font-semibold text-[10px] py-0.5 px-2">
                            Pendente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => openDetails(r)}
                            className="h-8 border-gray-200 text-slate-700 font-semibold text-xs gap-1 hover:bg-slate-50"
                          >
                            <Eye className="w-3.5 h-3.5" /> Detalhes
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => handleSyncSingle(r)}
                            className="h-8 bg-[#022D68] text-white font-semibold text-xs gap-1 hover:bg-[#022D68]/95"
                          >
                            <CloudUpload className="w-3.5 h-3.5" /> Sincronizar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleRemove(r)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes / Edição / IA */}
      <Dialog open={selectedRestaurant !== null} onOpenChange={(open) => { if (!open) setSelectedRestaurant(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 bg-white rounded-3xl">
          <DialogHeader className="p-6 pb-2 border-b border-gray-100 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
                {selectedRestaurant?.name}
                {selectedRestaurant && syncedIds.has(getDeterministicUUID(selectedRestaurant.id)) ? (
                  <Badge className="bg-green-100 text-green-800 border-none font-bold text-[10px] py-0.5">Sincronizado</Badge>
                ) : (
                  <Badge className="bg-slate-100 text-slate-500 border-none font-semibold text-[10px] py-0.5">Local</Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs mt-1">
                {selectedRestaurant?.category} • ID: {selectedRestaurant?.id}
              </DialogDescription>
            </div>
          </DialogHeader>

          <Tabs value={activeDialogTab} onValueChange={setActiveDialogTab} className="flex-1 overflow-hidden flex flex-col">
            <div className="px-6 bg-slate-50 border-b border-gray-100 flex items-center justify-between">
              <TabsList className="bg-transparent h-auto py-1 shadow-none border-b-0 rounded-none">
                <TabsTrigger value="preview" disabled={isEditing} className="py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-sm">
                  Visualização
                </TabsTrigger>
                <TabsTrigger value="edit" className="py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-sm">
                  Edição {isEditing && '*'}
                </TabsTrigger>
                <TabsTrigger value="ai" className="py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-semibold text-sm text-purple-700 gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Extração via IA
                </TabsTrigger>
              </TabsList>
              
              {!isEditing && activeDialogTab === 'edit' && (
                <Button 
                  size="sm" 
                  onClick={() => setIsEditing(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-8 gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Habilitar Edição
                </Button>
              )}
            </div>

            <ScrollArea className="flex-1 p-6 overflow-y-auto max-h-[55vh]">
              {/* Tab 1: Preview */}
              <TabsContent value="preview" className="m-0 space-y-6">
                {selectedRestaurant && (
                  <>
                    {/* Imagem de Capa e Logo */}
                    <div className="relative h-44 bg-slate-100 rounded-3xl overflow-hidden border border-gray-150">
                      <img 
                        src={selectedRestaurant.coverImage || selectedRestaurant.cover_image_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800'} 
                        alt="Capa"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute left-6 bottom-4 w-20 h-20 rounded-2xl overflow-hidden border-2 border-white bg-white shadow-md">
                        <img 
                          src={selectedRestaurant.logo || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100'} 
                          alt="Logo"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Dados Gerais */}
                      <div className="space-y-4">
                        <h3 className="font-bold text-sm text-primary uppercase tracking-wider">Informações Gerais</h3>
                        <div className="space-y-2 text-xs">
                          <p>
                            <span className="font-bold text-gray-500">Endereço:</span>{' '}
                            {selectedRestaurant.address}
                            {selectedRestaurant.number ? `, ${selectedRestaurant.number}` : ''}
                            {selectedRestaurant.neighborhood ? ` - ${selectedRestaurant.neighborhood}` : ''}
                            , {selectedRestaurant.city} - {selectedRestaurant.state}
                            {selectedRestaurant.cep ? `, ${selectedRestaurant.cep}` : ''}
                          </p>
                          <p><span className="font-bold text-gray-500">Telefone:</span> {hasNoPhone(selectedRestaurant) ? <span className="text-red-500 font-semibold">Não informado</span> : selectedRestaurant.phone}</p>
                          <p>
                            <span className="font-bold text-gray-500">Links Sociais:</span>
                            <span className="inline-flex items-center gap-2 ml-2">
                              {getSocialUrl(selectedRestaurant, 'instagram') && (
                                <a href={getSocialUrl(selectedRestaurant, 'instagram')} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:underline inline-flex items-center gap-0.5">
                                  Instagram <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                              {getSocialUrl(selectedRestaurant, 'facebook') && (
                                <a href={getSocialUrl(selectedRestaurant, 'facebook')} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-0.5">
                                  Facebook <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                              {selectedRestaurant.website && (
                                <a href={selectedRestaurant.website} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:underline inline-flex items-center gap-0.5">
                                  Website <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </span>
                          </p>
                          <p><span className="font-bold text-gray-500">Google Maps:</span> {selectedRestaurant.googleMapsUrl ? <a href={selectedRestaurant.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Ver no Maps ↗</a> : 'Não cadastrado'}</p>
                          <p><span className="font-bold text-gray-500">Descrição:</span> {selectedRestaurant.description || 'Nenhuma descrição fornecida.'}</p>
                        </div>

                        {/* Galeria de Fotos */}
                        <div className="space-y-2">
                          <h3 className="font-bold text-sm text-primary uppercase tracking-wider">Galeria de Fotos</h3>
                          {selectedRestaurant.galleryImages && selectedRestaurant.galleryImages.length > 0 ? (
                            <div className="flex gap-2 overflow-x-auto py-1">
                              {selectedRestaurant.galleryImages.map((img: string, idx: number) => (
                                <div key={idx} className="w-24 h-16 rounded-xl overflow-hidden shrink-0 border border-gray-200">
                                  <img src={img} alt={`Galeria ${idx}`} className="w-full h-full object-cover" />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400">Nenhuma imagem na galeria local.</p>
                          )}
                        </div>
                      </div>

                      {/* Horários */}
                      <div className="space-y-4">
                        <h3 className="font-bold text-sm text-primary uppercase tracking-wider">Horários de Funcionamento</h3>
                        {renderOpeningHours(selectedRestaurant.openingHours || selectedRestaurant.opening_hours)}
                      </div>
                    </div>

                    {/* Cardápio Estruturado */}
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                      <h3 className="font-bold text-sm text-primary uppercase tracking-wider">Cardápio Estruturado</h3>
                      {selectedRestaurant.menu_categories && selectedRestaurant.menu_categories.length > 0 ? (
                        <div className="space-y-4">
                          {selectedRestaurant.menu_categories.map((cat: any) => (
                            <div key={cat.id || cat.name} className="border border-gray-150 rounded-2xl p-4 bg-slate-50/50">
                              <h4 className="font-bold text-sm text-slate-800 mb-2 border-b border-gray-200 pb-1">{cat.name}</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {(cat.items || cat.menu_items || []).map((item: any) => (
                                  <div key={item.id || item.name} className="flex gap-3 bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm items-start">
                                    {item.image_url && (
                                      <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-150 border border-gray-100">
                                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-start gap-2">
                                        <h5 className="font-bold text-xs text-slate-800 truncate">{item.name}</h5>
                                        <span className="text-xs font-bold text-emerald-600 shrink-0">
                                          {typeof item.price === 'number' && item.price > 0 
                                            ? `R$ ${item.price.toFixed(2).replace('.', ',')}` 
                                            : 'Sob consulta'}
                                        </span>
                                      </div>
                                      {item.description && (
                                        <p className="text-[10px] text-gray-500 font-medium mt-1 leading-normal line-clamp-2">
                                          {item.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-gray-200">
                          <p className="text-xs text-gray-500 font-bold">Nenhum cardápio estruturado.</p>
                          {selectedRestaurant.menuSourceUrl && (
                            <p className="text-[10px] text-gray-400 mt-1">
                              Possui link de origem:{' '}
                              <a href={selectedRestaurant.menuSourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-bold">
                                {selectedRestaurant.menuSourceUrl}
                              </a>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </TabsContent>

              {/* Tab 2: Edit Form */}
              <TabsContent value="edit" className="m-0 space-y-6">
                {!isEditing ? (
                  <div className="text-center py-12 bg-slate-50 border border-dashed border-gray-200 rounded-3xl space-y-3">
                    <p className="text-sm text-gray-500 font-bold">O modo de edição está desabilitado.</p>
                    <Button 
                      size="sm" 
                      onClick={() => setIsEditing(true)}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Habilitar Edição
                    </Button>
                  </div>
                ) : editedData && (
                  <div className="space-y-6">
                    {/* Infos Gerais Formulário */}
                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-gray-150 space-y-4">
                      <h4 className="font-bold text-sm text-primary uppercase tracking-wider mb-2 border-b border-gray-250 pb-1">Cadastro Básico</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="edit-name" className="text-xs font-bold">Nome do Restaurante</Label>
                          <Input 
                            id="edit-name"
                            value={editedData.name}
                            onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
                            className="bg-white border-gray-300 text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="edit-category" className="text-xs font-bold">Categoria (tipo de cozinha)</Label>
                          <Input 
                            id="edit-category"
                            value={editedData.category}
                            onChange={(e) => setEditedData({ ...editedData, category: e.target.value })}
                            className="bg-white border-gray-300 text-xs h-9"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-1 md:col-span-2">
                          <Label htmlFor="edit-address" className="text-xs font-bold">Rua / Logradouro</Label>
                          <Input 
                            id="edit-address"
                            value={editedData.address || ''}
                            onChange={(e) => setEditedData({ ...editedData, address: e.target.value })}
                            className="bg-white border-gray-300 text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="edit-number" className="text-xs font-bold">Número</Label>
                          <Input 
                            id="edit-number"
                            value={editedData.number || ''}
                            onChange={(e) => setEditedData({ ...editedData, number: e.target.value })}
                            className="bg-white border-gray-300 text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="edit-phone" className="text-xs font-bold">Telefone</Label>
                          <Input 
                            id="edit-phone"
                            value={editedData.phone || ''}
                            onChange={(e) => setEditedData({ ...editedData, phone: e.target.value })}
                            className="bg-white border-gray-300 text-xs h-9"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="edit-neighborhood" className="text-xs font-bold">Bairro</Label>
                          <Input 
                            id="edit-neighborhood"
                            value={editedData.neighborhood || ''}
                            onChange={(e) => setEditedData({ ...editedData, neighborhood: e.target.value })}
                            className="bg-white border-gray-300 text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="edit-city" className="text-xs font-bold">Cidade</Label>
                          <Input 
                            id="edit-city"
                            value={editedData.city || ''}
                            onChange={(e) => setEditedData({ ...editedData, city: e.target.value })}
                            className="bg-white border-gray-300 text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="edit-state" className="text-xs font-bold">Estado (UF)</Label>
                          <Input 
                            id="edit-state"
                            value={editedData.state || ''}
                            onChange={(e) => setEditedData({ ...editedData, state: e.target.value })}
                            className="bg-white border-gray-300 text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="edit-cep" className="text-xs font-bold">CEP</Label>
                          <Input 
                            id="edit-cep"
                            value={editedData.cep || ''}
                            onChange={(e) => setEditedData({ ...editedData, cep: e.target.value })}
                            className="bg-white border-gray-300 text-xs h-9"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="edit-instagram" className="text-xs font-bold">Instagram URL</Label>
                          <Input 
                            id="edit-instagram"
                            value={editedData.instagram || getSocialUrl(editedData, 'instagram') || ''}
                            onChange={(e) => setEditedData({ ...editedData, instagram: e.target.value })}
                            className="bg-white border-gray-300 text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="edit-facebook" className="text-xs font-bold">Facebook URL</Label>
                          <Input 
                            id="edit-facebook"
                            value={editedData.facebook || getSocialUrl(editedData, 'facebook') || ''}
                            onChange={(e) => setEditedData({ ...editedData, facebook: e.target.value })}
                            className="bg-white border-gray-300 text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="edit-website" className="text-xs font-bold">Site Oficial</Label>
                          <Input 
                            id="edit-website"
                            value={editedData.website || ''}
                            onChange={(e) => setEditedData({ ...editedData, website: e.target.value })}
                            className="bg-white border-gray-300 text-xs h-9"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="edit-maps" className="text-xs font-bold">Link Google Maps</Label>
                          <Input 
                            id="edit-maps"
                            value={editedData.googleMapsUrl || ''}
                            onChange={(e) => setEditedData({ ...editedData, googleMapsUrl: e.target.value })}
                            className="bg-white border-gray-300 text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="edit-menu-source" className="text-xs font-bold">Link Origem Cardápio (menuSourceUrl)</Label>
                          <Input 
                            id="edit-menu-source"
                            value={editedData.menuSourceUrl || ''}
                            onChange={(e) => setEditedData({ ...editedData, menuSourceUrl: e.target.value })}
                            className="bg-white border-gray-300 text-xs h-9"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="edit-logo" className="text-xs font-bold">Link Imagem da Logo</Label>
                          <Input 
                            id="edit-logo"
                            value={editedData.logo || ''}
                            onChange={(e) => setEditedData({ ...editedData, logo: e.target.value })}
                            className="bg-white border-gray-300 text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="edit-cover" className="text-xs font-bold">Link Imagem de Capa</Label>
                          <Input 
                            id="edit-cover"
                            value={editedData.coverImage || editedData.cover_image_url || ''}
                            onChange={(e) => setEditedData({ ...editedData, coverImage: e.target.value, cover_image_url: e.target.value })}
                            className="bg-white border-gray-300 text-xs h-9"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="edit-description" className="text-xs font-bold">Sobre o Restaurante (Descrição)</Label>
                        <Textarea 
                          id="edit-description"
                          value={editedData.description || ''}
                          onChange={(e) => setEditedData({ ...editedData, description: e.target.value })}
                          className="bg-white border-gray-300 text-xs min-h-[60px]"
                        />
                      </div>
                    </div>

                    {/* Horários Formulário */}
                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-gray-150 space-y-4">
                      <h4 className="font-bold text-sm text-primary uppercase tracking-wider mb-2 border-b border-gray-250 pb-1">Funcionamento semanal</h4>
                      
                      <div className="grid grid-cols-1 gap-2.5">
                        {Object.entries(daysTranslation).map(([dayKey, label]) => {
                          const hours = editedData.openingHours || editedData.opening_hours || {};
                          const dayInfo = hours[dayKey] || { isOpen: false, slots: [] };
                          const slot = dayInfo.slots?.[0] || { start: '11:00', end: '22:00' };

                          return (
                            <div key={dayKey} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-white border border-gray-100 rounded-xl gap-2">
                              <div className="flex items-center gap-2 shrink-0">
                                <Checkbox 
                                  id={`edit-hours-check-${dayKey}`}
                                  checked={dayInfo.isOpen}
                                  onCheckedChange={(checked) => handleEditHoursToggle(dayKey, !!checked)}
                                />
                                <Label htmlFor={`edit-hours-check-${dayKey}`} className="text-xs font-bold cursor-pointer">{label}</Label>
                              </div>
                              
                              {dayInfo.isOpen && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">Horário:</span>
                                  <Input 
                                    value={slot.start}
                                    placeholder="11:00"
                                    onChange={(e) => handleEditHoursSlot(dayKey, 0, 'start', e.target.value)}
                                    className="w-16 h-8 text-center text-xs p-1"
                                  />
                                  <span className="text-xs text-gray-400">até</span>
                                  <Input 
                                    value={slot.end}
                                    placeholder="22:00"
                                    onChange={(e) => handleEditHoursSlot(dayKey, 0, 'end', e.target.value)}
                                    className="w-16 h-8 text-center text-xs p-1"
                                  />
                                </div>
                              )}
                              {!dayInfo.isOpen && (
                                <span className="text-xs text-gray-400 italic">Fechado</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Galeria Formulário */}
                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-gray-150 space-y-4">
                      <h4 className="font-bold text-sm text-primary uppercase tracking-wider mb-2 border-b border-gray-250 pb-1">Galeria de Fotos</h4>
                      
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Colar URL de imagem da fachada ou prato..."
                          value={newGalleryUrl}
                          onChange={(e) => setNewGalleryUrl(e.target.value)}
                          className="bg-white border-gray-300 text-xs h-9 flex-1"
                        />
                        <Button size="sm" onClick={handleAddGalleryUrl} className="bg-slate-700 text-white font-bold h-9">
                          <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                        </Button>
                      </div>

                      {/* Lista de Imagens na Galeria */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {((editedData.gallery_images || editedData.galleryImages || []) as string[]).map((url, idx) => (
                          <div key={idx} className="relative group h-20 bg-slate-100 rounded-xl overflow-hidden border border-gray-200">
                            <img src={url} alt={`Galeria ${idx}`} className="w-full h-full object-cover" />
                            <Button
                              type="button"
                              onClick={() => handleRemoveGalleryUrl(idx)}
                              className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 shadow shadow-black/30 opacity-80 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Cardápio Formulário */}
                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-gray-150 space-y-6">
                      <div className="flex justify-between items-center border-b border-gray-250 pb-2">
                        <h4 className="font-bold text-sm text-primary uppercase tracking-wider">Cardápio Estruturado</h4>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleAddCategory} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                            <PlusCircle className="w-3.5 h-3.5 mr-1" /> Nova Categoria
                          </Button>
                          <Button size="sm" variant="destructive" onClick={handleDeleteMenu} className="font-bold bg-red-600 hover:bg-red-700">
                            <Trash className="w-3.5 h-3.5 mr-1" /> Excluir Cardápio
                          </Button>
                        </div>
                      </div>

                      {/* Loop de Categorias */}
                      {editedData.menu_categories && editedData.menu_categories.length > 0 ? (
                        <div className="space-y-6">
                          {editedData.menu_categories.map((cat: any) => (
                            <div key={cat.id} className="bg-white p-4 border border-gray-200 rounded-2xl space-y-3 shadow-sm">
                              {/* Categoria Header */}
                              <div className="flex justify-between items-center gap-3 border-b border-gray-100 pb-2">
                                <div className="flex-1">
                                  <Input 
                                    value={cat.name}
                                    placeholder="Nome da categoria (ex: Entradas, Bebidas...)"
                                    onChange={(e) => handleEditCategoryName(cat.id, e.target.value)}
                                    className="font-bold text-xs h-8 bg-slate-50 border-gray-200 focus-visible:bg-white"
                                  />
                                </div>
                                <div className="flex gap-1">
                                  <Button size="sm" onClick={() => handleAddItem(cat.id)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold h-8">
                                    <Plus className="w-3 h-3 mr-0.5" /> Item
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleRemoveCategory(cat.id)} className="text-red-500 hover:bg-red-50 h-8">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>

                              {/* Loop de Itens da Categoria */}
                              <div className="space-y-3 pl-0 sm:pl-3">
                                {(cat.items || cat.menu_items || []).map((item: any) => (
                                  <div key={item.id} className="relative p-3 bg-slate-50/50 hover:bg-slate-50 border border-gray-150 rounded-xl grid grid-cols-1 sm:grid-cols-4 gap-3 items-start">
                                    <div className="sm:col-span-2 space-y-2">
                                      <Input 
                                        value={item.name}
                                        placeholder="Nome do Prato/Bebida"
                                        onChange={(e) => handleEditItem(cat.id, item.id, 'name', e.target.value)}
                                        className="font-semibold text-xs h-8 bg-white border-gray-300"
                                      />
                                      <Textarea 
                                        value={item.description}
                                        placeholder="Descrição dos ingredientes, acompanhamentos..."
                                        onChange={(e) => handleEditItem(cat.id, item.id, 'description', e.target.value)}
                                        className="text-xs min-h-[40px] bg-white border-gray-300"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Input 
                                        value={item.price || ''}
                                        placeholder="Preço (ex: 35.90)"
                                        onChange={(e) => handleEditItem(cat.id, item.id, 'price', e.target.value)}
                                        className="text-xs h-8 bg-white border-gray-300 font-bold"
                                      />
                                      <Input 
                                        value={item.image_url || ''}
                                        placeholder="Link Foto Prato"
                                        onChange={(e) => handleEditItem(cat.id, item.id, 'image_url', e.target.value)}
                                        className="text-[10px] h-8 bg-white border-gray-300"
                                      />
                                    </div>
                                    <div className="flex justify-end sm:justify-center items-center h-full sm:pt-4">
                                      <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        onClick={() => handleRemoveItem(cat.id, item.id)}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-100"
                                      >
                                        <XCircle className="w-4 h-4 mr-0.5" /> Excluir
                                      </Button>
                                    </div>
                                  </div>
                                ))}

                                {(cat.items || cat.menu_items || []).length === 0 && (
                                  <p className="text-[11px] text-gray-400 italic text-center py-2">Esta categoria não tem nenhum prato.</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 text-center py-6">Nenhuma categoria ou prato criado. Clique em "Nova Categoria" para começar!</p>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Tab 3: AI Textbox */}
              <TabsContent value="ai" className="m-0 space-y-4">
                <div className="space-y-2">
                  <h4 className="font-bold text-sm text-purple-900">Extrator Manual com IA</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Copie e cole o texto bruto do cardápio ou o código-fonte HTML da página de cardápio digital do restaurante. 
                    Nossa inteligência artificial estruturará automaticamente em categorias, pratos, preços, descrições e identificará links de imagens.
                  </p>
                </div>

                <div className="flex items-center gap-4 py-2 border-y border-gray-100 bg-slate-50 px-4 rounded-xl">
                  <span className="text-xs font-bold text-gray-600">Modelo de IA:</span>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold flex items-center gap-1 cursor-pointer">
                      <input 
                        type="radio" 
                        name="aiModel" 
                        value="gemini"
                        checked={aiModel === 'gemini'}
                        onChange={() => setAiModel('gemini')}
                      /> Gemini 1.5 Flash
                    </label>
                    <label className="text-xs font-semibold flex items-center gap-1 cursor-pointer ml-3">
                      <input 
                        type="radio" 
                        name="aiModel" 
                        value="openai"
                        checked={aiModel === 'openai'}
                        onChange={() => setAiModel('openai')}
                      /> OpenAI GPT-4o-mini
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="ai-pasted-menu" className="text-xs font-bold">Conteúdo do Cardápio (Texto ou HTML)</Label>
                  <Textarea 
                    id="ai-pasted-menu"
                    value={aiPastedContent}
                    onChange={(e) => setAiPastedContent(e.target.value)}
                    placeholder="Cole o cardápio bruto aqui..."
                    className="min-h-[220px] bg-slate-50 border-gray-300 text-xs font-mono"
                  />
                </div>

                <div className="flex justify-end">
                  <Button 
                    onClick={handleAIExtraction}
                    disabled={isExtractingAI}
                    className="bg-purple-700 text-white hover:bg-purple-800 font-bold h-10 gap-1.5 shadow-md shadow-purple-200"
                  >
                    {isExtractingAI ? (
                      <>
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                        Extraindo dados...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" /> Extrair via IA
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </ScrollArea>

            {/* Dialog Footer Actions */}
            <div className="p-6 border-t border-gray-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4 rounded-b-3xl">
              <div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDeleteRestaurant}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200 font-bold h-9"
                >
                  <Trash className="w-3.5 h-3.5 mr-1" /> Excluir Estabelecimento
                </Button>
              </div>

              <div className="flex gap-2 w-full sm:w-auto justify-end">
                {isEditing ? (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsEditing(false)} 
                      className="border-gray-300 font-semibold h-9"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleSaveLocal}
                      className="border-blue-400 text-blue-700 hover:bg-blue-50 font-bold h-9 gap-1"
                    >
                      <Save className="w-3.5 h-3.5" /> Salvar Local
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={handleValidateAndSave}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Validar e Salvar no Supabase
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSelectedRestaurant(null)}
                      className="border-gray-300 font-semibold h-9"
                    >
                      Fechar
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => setIsEditing(true)}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold h-9 gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Editar
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trash2, 
  Search, 
  Eye, 
  Globe, 
  Instagram, 
  Facebook, 
  Clock,
  ExternalLink,
  Save,
  Plus,
  Trash,
  Sparkles,
  PlusCircle,
  XCircle,
  Edit2,
  Pencil,
  Image,
  Upload,
  Loader2,
  Play,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { CATEGORIES } from '@/constants/categories';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getDeterministicUUID } from '@/hooks/useAdminRestaurants';
import { geocodeAddress } from '@/services/geocoding';


// Utility functions copied from ExportedRestaurants.tsx
const cleanPhone = (phone: string) => {
  if (!phone) return '';
  return phone.replace(/[^\d+]/g, '');
};

const cleanAddress = (address: string) => {
  if (!address) return '';
  return address.trim();
};

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const cleanPrefixes = (name: string) => {
  if (!name) return '';
  return name.replace(/^[\d\w\s]+:\s*/i, '').trim();
};

const enrichMenuItemsWithAI = async (
  restaurantName: string,
  categoryName: string,
  items: any[],
  apiKey: string,
  isOpenAI: boolean
) => {
  if (!apiKey || items.length === 0) return;

  try {
    const listForPrompt = items.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description || ''
    }));

    const promptText = `Você receberá uma lista de pratos da categoria "${categoryName}" do restaurante "${restaurantName}" no formato JSON.
Sua tarefa é analisar o contexto e sugerir um nome de exibição otimizado para a BUSCA GLOBAL (searchDisplayName) para cada um deles.
Regras:
1. Nomes genéricos como "Filé" em uma categoria "Saladas" devem ser transformados em "Salada com Filé".
2. Nomes genéricos como "Frango" em uma categoria "Saladas" devem ser transformados em "Salada de Frango".
3. Se o nome contiver prefixos redundantes como "011: Pizza", remova-os (retornando apenas "Pizza").
4. Apenas corrija se necessário. Se o nome já for descritivo e claro, retorne-o exatamente como está (em Title Case).
5. O nome deve ser curto (máximo 40 caracteres).
6. Retorne APENAS um array JSON válido sem markdown ou blocos de código. Exemplo: {"results": [{"id": "...", "searchDisplayName": "..."}]}.

JSON:
${JSON.stringify(listForPrompt, null, 2)}`;

    let jsonText = '';

    if (isOpenAI) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          response_format: { type: "json_object" },
          messages: [
            { role: 'user', content: promptText }
          ]
        })
      });
      if (!response.ok) throw new Error(`OpenAI HTTP ${response.status}`);
      const data = await response.json();
      jsonText = data.choices?.[0]?.message?.content || '';
    } else {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });
      if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`);
      const data = await response.json();
      jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    if (!jsonText) return;

    const cleanedJsonText = jsonText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(cleanedJsonText);
    const results = parsed.results || parsed;

    if (Array.isArray(results)) {
      for (const res of results) {
        if (res.id && res.searchDisplayName) {
          await supabase
            .from('menu_items')
            .update({ search_display_name: res.searchDisplayName })
            .eq('id', res.id);
        }
      }
      console.log(`[IA 2º Plano] Sanitização de busca concluída para a categoria ${categoryName}.`);
    }
  } catch (err) {
    console.warn("Erro ao enriquecer nomes de cardápio com IA em 2º plano:", err);
  }
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

const daysTranslation: Record<string, string> = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo'
};

const hasNoPhone = (r: any) => !r.phone || r.phone.trim() === '' || r.phone.toLowerCase().includes('sem telefone');

const getSocialUrl = (restaurant: any, platform: string) => {
  if (platform === 'instagram' && restaurant.instagram) return restaurant.instagram;
  if (platform === 'facebook' && restaurant.facebook) return restaurant.facebook;
  if (restaurant.social_networks) {
    const net = restaurant.social_networks.find((s: any) => s.platform === platform);
    return net?.url || '';
  }
  return '';
};

const isVideoUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  const cleanUrl = url.split(/[?#]/)[0].toLowerCase();
  return (
    cleanUrl.endsWith('.mp4') ||
    cleanUrl.endsWith('.webm') ||
    cleanUrl.endsWith('.ogg') ||
    cleanUrl.endsWith('.mov') ||
    cleanUrl.endsWith('.quicktime') ||
    url.includes('/video/') ||
    url.includes('_video')
  );
};

const renderOpeningHours = (hours: any) => {
  if (!hours) return <p className="text-gray-400 text-xs font-semibold">Sem horários informados</p>;
  
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

const checkExtensionInstalled = (extensionId: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const chromeObj = (window as any).chrome;
    if (!chromeObj || !chromeObj.runtime || !chromeObj.runtime.sendMessage) {
      resolve(false);
      return;
    }
    try {
      chromeObj.runtime.sendMessage(extensionId, { action: "ping" }, (response: any) => {
        const lastError = chromeObj.runtime.lastError;
        if (lastError) {
          resolve(false);
        } else {
          resolve(!!(response && response.success));
        }
      });
    } catch (e) {
      resolve(false);
    }
  });
};

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

const downloadExternalImage = async (url: string): Promise<string> => {
  let useExtension = false;
  const extId = localStorage.getItem('chrome_extension_id')?.trim();
  if (extId) {
    const isInstalled = await checkExtensionInstalled(extId);
    if (isInstalled) {
      useExtension = true;
    }
  }

  if (useExtension && extId) {
    const isInstagramPost = /instagram\.com\/(p|reel)\//i.test(url) || /instagr\.am\/(p|reel)\//i.test(url);
    console.log("Baixando imagem via extensão:", url, "Insta Post?", isInstagramPost);
    const chromeObj = (window as any).chrome;
    return new Promise((resolve, reject) => {
      chromeObj.runtime.sendMessage(
        extId,
        isInstagramPost ? { action: "scrapeInstagramPost", url } : { action: "downloadImage", url },
        (response: any) => {
          const lastError = chromeObj.runtime.lastError;
          if (lastError) {
            reject(new Error("Erro na extensão: " + lastError.message));
          } else if (response && response.success && response.logoDataUrl) {
            resolve(response.logoDataUrl);
          } else {
            reject(new Error(response?.error || "Erro ao baixar imagem via extensão."));
          }
        }
      );
    });
  }

  throw new Error("extension_not_available");
};

interface RestaurantDetailsDialogProps {
  restaurant: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSyncSuccess: () => void;
}

const normalizeCategory = (category: string | null | undefined): string => {
  if (!category) return 'Outros';
  const clean = category.toLowerCase().trim();
  
  if (clean.includes('hambúrg') || clean.includes('burg') || clean.includes('lanche') || clean.includes('cachorro-quente') || clean.includes('diner')) {
    return 'Hamburgueria';
  }
  if (clean.includes('pizza')) {
    return 'Pizzaria';
  }
  if (clean.includes('café') || clean.includes('cafeteria') || clean.includes('padaria') || clean.includes('casa de chá')) {
    return 'Cafeteria';
  }
  if (clean.includes('doce') || clean.includes('confeitaria') || clean.includes('doceria') || clean.includes('sobremesa') || clean.includes('chocolate') || clean.includes('bolo')) {
    return 'Doceria / Sobremesas';
  }
  if (clean.includes('churrasc') || clean.includes('grill') || clean.includes('carne')) {
    return 'Churrascaria';
  }
  if (clean.includes('sushi') || clean.includes('japones')) {
    return 'Japonesa';
  }
  if (clean.includes('massa') || clean.includes('italiana') || clean.includes('risoto')) {
    return 'Italiana';
  }
  if (clean.includes('bar') || clean.includes('pub') || clean.includes('petiscaria') || clean.includes('cervejaria')) {
    return 'Bar';
  }
  if (clean.includes('açaí') || clean.includes('acai') || clean.includes('sorvete')) {
    return 'Açaí / Sorveteria';
  }
  if (clean.includes('saudável') || clean.includes('saudavel') || clean.includes('salada') || clean.includes('fit') || clean.includes('vegano') || clean.includes('vegetariano')) {
    return 'Saudável / Fit';
  }
  if (clean.includes('restaurante') || clean.includes('comida') || clean.includes('almoço')) {
    return 'Restaurante';
  }
  
  return 'Outros';
};

export function RestaurantDetailsDialog({ restaurant, isOpen, onClose, onSyncSuccess }: RestaurantDetailsDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<any | null>(null);
  const [aiPastedContent, setAiPastedContent] = useState('');
  const [isExtractingAI, setIsExtractingAI] = useState(false);
  const [aiHoursPastedContent, setAiHoursPastedContent] = useState('');
  const [isExtractingHoursAI, setIsExtractingHoursAI] = useState(false);
  const [activeDialogTab, setActiveDialogTab] = useState<string>('preview');
  const [newGalleryUrl, setNewGalleryUrl] = useState('');
  const [aiModel, setAiModel] = useState<'gemini' | 'openai'>('gemini');
  const [expandedPreviewItems, setExpandedPreviewItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (restaurant && isOpen) {
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
        cep: parsedAddress.cep,
        category: normalizeCategory(restaurant.category)
      };

      setEditedData(JSON.parse(JSON.stringify(formattedRestaurant)));
      setIsEditing(false);
      setActiveDialogTab('preview');
      setAiPastedContent('');
      setAiHoursPastedContent('');
      setNewGalleryUrl('');
      setLogoTimestamp(Date.now());
      setCoverTimestamp(Date.now());
    } else {
      setEditedData(null);
    }
  }, [restaurant, isOpen]);

  const [isScrapingLogo, setIsScrapingLogo] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [isAddingGallery, setIsAddingGallery] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverError, setCoverError] = useState(false);
  const [isUploadingLogoFile, setIsUploadingLogoFile] = useState(false);

  const [logoTimestamp, setLogoTimestamp] = useState<number>(Date.now());
  const [coverTimestamp, setCoverTimestamp] = useState<number>(Date.now());

  const getLogoSrc = (url: string) => {
    if (!url) return '';
    if (url.includes('supabase.co')) {
      return `${url}${url.includes('?') ? '&' : '?'}t=${logoTimestamp}`;
    }
    return url;
  };

  const getCoverSrc = (url: string) => {
    if (!url) return '';
    if (url.includes('supabase.co')) {
      return `${url}${url.includes('?') ? '&' : '?'}t=${coverTimestamp}`;
    }
    return url;
  };

  useEffect(() => {
    setLogoError(false);
  }, [editedData?.logo]);

  useEffect(() => {
    setCoverError(false);
  }, [editedData?.coverImage, editedData?.cover_image_url]);

  const handleScrapeInstagramLogoAndFollowers = async () => {
    if (isScrapingLogo) return;
    if (!editedData || !editedData.id) {
      showError("Dados do restaurante não disponíveis.");
      return;
    }

    const rawInstagram = editedData.instagram || getSocialUrl(editedData, 'instagram') || '';
    if (!rawInstagram.trim()) {
      showError("Por favor, informe a URL do Instagram antes de iniciar a coleta.");
      return;
    }

    setIsScrapingLogo(true);
    showSuccess("Iniciando coleta de logo e seguidores do Instagram...");

    try {
      const restaurantId = editedData.id;
      const uuidId = getDeterministicUUID(restaurantId);
      
      const currentSocials = (editedData.social_networks || [
        { platform: 'instagram', url: rawInstagram.trim() },
        { platform: 'facebook', url: editedData.facebook || getSocialUrl(editedData, 'facebook') || '' }
      ]).map((s: any) => {
        if (s && s.platform === 'instagram') {
          return { ...s, url: rawInstagram.trim() };
        }
        return s;
      }).filter((s: any) => s && s.url);

      // Se não havia instagram na lista de redes sociais, adiciona
      if (!currentSocials.some((s: any) => s && s.platform === 'instagram')) {
        currentSocials.push({ platform: 'instagram', url: rawInstagram.trim() });
      }

      const { error: updateInstaError } = await supabase
        .from('restaurants')
        .update({ social_networks: currentSocials })
        .eq('id', uuidId);

      if (updateInstaError) {
        console.warn("Aviso ao atualizar Instagram no Supabase:", updateInstaError.message);
      }

      // Tenta usar a extensão do Chrome se estiver instalada e configurada
      let useExtension = false;
      const extId = localStorage.getItem('chrome_extension_id')?.trim();
      if (extId) {
        const isInstalled = await checkExtensionInstalled(extId);
        if (isInstalled) {
          useExtension = true;
        }
      }

      if (useExtension && extId) {
        console.log("Usando extensão do Chrome para raspagem:", extId);
        const chromeObj = (window as any).chrome;
        
        chromeObj.runtime.sendMessage(
          extId, 
          { action: "scrapeInstagram", instagramUrl: rawInstagram.trim() },
          async (response: any) => {
            const lastError = chromeObj.runtime.lastError;
            if (lastError) {
              setIsScrapingLogo(false);
              showError("Erro na comunicação com a extensão: " + lastError.message);
              return;
            }
            
            if (response && response.success) {
              let publicUrl = editedData.logo;
              
              if (response.logoDataUrl) {
                try {
                  const blob = base64ToBlob(response.logoDataUrl);
                  const mime = blob.type;
                  let ext = 'jpg';
                  if (mime.includes('png')) ext = 'png';
                  else if (mime.includes('webp')) ext = 'webp';
                  else if (mime.includes('gif')) ext = 'gif';
                  
                  const storagePath = `logos/${uuidId}_logo.${ext}`;
                  
                  const { error: uploadError } = await supabase.storage
                    .from('restaurant-images')
                    .upload(storagePath, blob, {
                      contentType: mime,
                      upsert: true
                    });
                    
                  if (uploadError) throw uploadError;
                  
                  const { data: { publicUrl: newUrl } } = supabase.storage
                    .from('restaurant-images')
                    .getPublicUrl(storagePath);
                    
                  publicUrl = newUrl;
                } catch (uploadErr: any) {
                  console.error("Erro ao subir imagem no Supabase:", uploadErr);
                  showError("Logo coletada, mas erro no upload: " + uploadErr.message);
                }
              }
              
              // Atualizar no banco
              const updateObj: any = {};
              if (publicUrl) {
                updateObj.image_url = publicUrl;
              }
              let finalFollowers = null;
              if (response.followers !== undefined && response.followers !== null) {
                const pct = parseFloat(localStorage.getItem('admin_followers_percentage') || '10');
                finalFollowers = Math.round((response.followers * pct) / 100);
                updateObj.followers_override = finalFollowers;
              }
              
              if (Object.keys(updateObj).length > 0) {
                const { error: dbUpdateError } = await supabase
                   .from('restaurants')
                  .update(updateObj)
                  .eq('id', uuidId);
                  
                if (dbUpdateError) {
                  showError("Erro ao salvar no banco: " + dbUpdateError.message);
                } else {
                  showSuccess("Coleta de logo e seguidores concluída via Extensão!");
                  setLogoTimestamp(Date.now());
                  window.dispatchEvent(new Event('local-sync-restaurants'));
                  localStorage.setItem('local-sync-restaurants-trigger', Date.now().toString());
                  setEditedData((prev: any) => ({
                    ...prev,
                    logo: publicUrl || prev.logo,
                    image_url: publicUrl || prev.image_url,
                    followers_override: response.followers !== undefined ? finalFollowers : prev.followers_override
                  }));
                  onSyncSuccess();
                }
              }
            } else if (response && response.isLoginRequired) {
              showError("Login do Instagram necessário! A aba do Instagram foi aberta. Faça login e clique no botão novamente.");
            } else {
              showError(response?.error || "Erro desconhecido na extensão.");
            }
            setIsScrapingLogo(false);
          }
        );
      } else {
        // Fallback para o robô local /api
        const res = await fetch(`/api/local-collector/re-scrape-logo?restaurantId=${restaurantId}`, { method: 'POST' });
        
        if (res.ok) {
          const result = await res.json();
          if (result.success) {
            showSuccess("Coleta de logo e seguidores concluída com sucesso!");
            setLogoTimestamp(Date.now());
            window.dispatchEvent(new Event('local-sync-restaurants'));
            localStorage.setItem('local-sync-restaurants-trigger', Date.now().toString());
            
            let finalFollowers = undefined;
            if (result.followers !== undefined && result.followers !== null) {
              const pct = parseFloat(localStorage.getItem('admin_followers_percentage') || '10');
              finalFollowers = Math.round((result.followers * pct) / 100);
            }

            setEditedData((prev: any) => ({
              ...prev,
              logo: result.url || prev.logo,
              image_url: result.url || prev.image_url,
              followers_override: finalFollowers !== undefined ? finalFollowers : prev.followers_override
            }));
            
            onSyncSuccess();
          } else {
            showError(result.error || "Não foi possível coletar os dados do Instagram.");
          }
        } else {
          const err = await res.json();
          showError(err.error || "Erro ao executar coleta no servidor.");
        }
        setIsScrapingLogo(false);
      }
    } catch (err: any) {
      if (err.message && err.message.includes('fetch')) {
        showError("Servidor local offline. Para coletar direto do seu navegador, instale a Extensão do Chrome e insira o ID no painel.");
      } else {
        showError(err.message || "Erro desconhecido ao tentar coletar.");
      }
      setIsScrapingLogo(false);
    }
  };

  const syncSingleToSupabase = async (updatedRest: any): Promise<boolean> => {
    try {
      const uuidId = getDeterministicUUID(updatedRest.id);
      
      const ensureSupabaseImageUrl = async (originalUrl: string, storagePath: string): Promise<string> => {
        if (!originalUrl || !originalUrl.startsWith('http') || originalUrl.includes('supabase.co')) {
          return originalUrl;
        }
        
        try {
          const res = await fetch(`/api/local-collector/download-and-upload?url=${encodeURIComponent(originalUrl)}&path=${encodeURIComponent(storagePath)}`, {
            method: 'POST'
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.url) {
              return data.url;
            }
          }
        } catch (e) {
          console.warn('Erro ao processar download-and-upload:', e);
        }
        return originalUrl;
      };

      const getExtension = (url: string) => {
        const match = url.split(/[?#]/)[0].match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
        return match ? match[1].toLowerCase() : 'jpg';
      };

      let latitude = updatedRest.latitude !== undefined && updatedRest.latitude !== null ? updatedRest.latitude : null;
      let longitude = updatedRest.longitude !== undefined && updatedRest.longitude !== null ? updatedRest.longitude : null;

      // Se as coordenadas não estão definidas ou são zero, tentamos geocodificar o endereço completo
      if (latitude === null || longitude === null || latitude === 0 || longitude === 0) {
        const addrParts = [];
        if (updatedRest.address) {
          if (updatedRest.number) {
            addrParts.push(`${updatedRest.address}, ${updatedRest.number}`);
          } else {
            addrParts.push(updatedRest.address);
          }
        }
        if (updatedRest.neighborhood) addrParts.push(updatedRest.neighborhood);
        if (updatedRest.city) {
          if (updatedRest.state) {
            addrParts.push(`${updatedRest.city} - ${updatedRest.state}`);
          } else {
            addrParts.push(updatedRest.city);
          }
        }
        if (updatedRest.cep) addrParts.push(updatedRest.cep);
        
        const fullAddress = addrParts.join(', ');
        if (fullAddress.trim()) {
          try {
            console.log(`[syncSingleToSupabase] Tentando geocodificar endereço completo: "${fullAddress}"`);
            const coords = await geocodeAddress(fullAddress);
            if (coords) {
              latitude = coords.lat;
              longitude = coords.lon;
            }
          } catch (e) {
            console.warn('Erro ao geocodificar no sync:', e);
          }
        }
      }

      // Se ainda não temos coordenadas, tentamos extrair do googleMapsUrl
      if ((latitude === null || longitude === null || latitude === 0 || longitude === 0) && updatedRest.googleMapsUrl) {
        const coords = extractCoordsFromUrl(updatedRest.googleMapsUrl);
        if (coords) {
          latitude = coords.lat;
          longitude = coords.lng;
        }
      }

      let visitNotes = updatedRest.visit_notes || `Fonte Cardápio: ${updatedRest.menuSourceUrl || 'Não informado'}`;
      if (updatedRest.googleMapsUrl) {
        if (visitNotes.includes('Google Maps:')) {
          visitNotes = visitNotes.replace(/Google Maps:\s*(https?:\/\/[^\s]+)/, `Google Maps: ${updatedRest.googleMapsUrl}`);
        } else {
          visitNotes = `${visitNotes}\nGoogle Maps: ${updatedRest.googleMapsUrl}`.trim();
        }
      }

      // Prepara objeto restaurante
      const restaurantData: any = {
        id: uuidId,
        name: updatedRest.name,
        plan: updatedRest.plan || 'free',
        phone: cleanPhone(updatedRest.phone || ''),
        cep: updatedRest.cep || '',
        address: cleanAddress(updatedRest.address || ''),
        number: updatedRest.number || '',
        neighborhood: updatedRest.neighborhood || '',
        city: updatedRest.city || '',
        state: updatedRest.state || '',
        description: updatedRest.description || '',
        category: updatedRest.category || '',
        image_url: updatedRest.logo || null,
        cover_image_url: updatedRest.coverImage || updatedRest.cover_image_url || null,
        visit_status: updatedRest.visit_status || 'Pendente',
        visit_notes: visitNotes,
        claim_code: updatedRest.claim_code || 'CLAIM-' + uuidId.substring(0, 5).toUpperCase(),
        opening_hours: updatedRest.openingHours || updatedRest.opening_hours || null,
        social_networks: updatedRest.social_networks || [
          { platform: 'instagram', url: updatedRest.instagram || '' },
          { platform: 'facebook', url: updatedRest.facebook || '' }
        ].filter((s: any) => s.url),
        rating: updatedRest.rating || null,
        reviews_count: updatedRest.reviewsCount || null,
        followers_override: updatedRest.followers_override !== undefined ? updatedRest.followers_override : null
      };

      if (latitude !== null) restaurantData.latitude = latitude;
      if (longitude !== null) restaurantData.longitude = longitude;

      // 1. Upsert Restaurant
      const { error: restError } = await supabase
        .from('restaurants')
        .upsert(restaurantData);

      if (restError) throw restError;

      // 2. Limpar categorias e pratos antigos
      const { data: existingCats } = await supabase
        .from('menu_categories')
        .select('id')
        .eq('restaurant_id', uuidId);
      
      if (existingCats && existingCats.length > 0) {
        const catIds = existingCats.map(c => c.id);
        const { error: deleteItemsError } = await supabase
          .from('menu_items')
          .delete()
          .in('category_id', catIds);
        if (deleteItemsError) {
          console.warn("Erro ao limpar itens de cardápio no Supabase:", deleteItemsError.message);
        }
      }

      const { error: deleteCatError } = await supabase
        .from('menu_categories')
        .delete()
        .eq('restaurant_id', uuidId);

      if (deleteCatError) {
        console.warn("Erro ao limpar categorias antigas no Supabase:", deleteCatError.message);
      }

      // 3. Inserir Categorias e Pratos
      const categories = updatedRest.menu_categories || updatedRest.menuCategories || [];
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
          const itemsToInsert = [];
          for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
            const item = items[itemIdx];
            const itemId = getDeterministicUUID(item.id || `item-${item.name}-${itemIdx}`);
            let priceVal = 0;
            if (typeof item.price === 'number') {
              priceVal = item.price;
            } else if (item.price) {
              const cleaned = String(item.price).replace(/[^\d.,]/g, '').replace(',', '.');
              priceVal = parseFloat(cleaned) || 0;
            }

            let finalImgUrl = item.image_url || '';
            if (finalImgUrl) {
              const ext = getExtension(finalImgUrl);
              const storagePath = `menu-items/${uuidId}/${itemId}_item.${ext}`;
              finalImgUrl = await ensureSupabaseImageUrl(finalImgUrl, storagePath);
            }

            const sanitizedName = toTitleCase(cleanPrefixes(item.name));

            itemsToInsert.push({
              id: itemId,
              category_id: catUuid,
              name: item.name,
              description: item.description || '',
              price: priceVal,
              image_url: finalImgUrl,
              order_index: itemIdx,
              is_active: true,
              search_display_name: sanitizedName
            });
          }

          const { error: itemsError } = await supabase
            .from('menu_items')
            .insert(itemsToInsert);

          if (itemsError) throw itemsError;

          // Enriquecer nomes de cardápio com IA em segundo plano (fire-and-forget)
          const apiKey = aiModel === 'gemini'
            ? (import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('user_gemini_key') || '')
            : (import.meta.env.VITE_OPENAI_API_KEY || localStorage.getItem('user_openai_key') || '');

          if (apiKey) {
            enrichMenuItemsWithAI(
              updatedRest.name || '',
              cat.name || '',
              itemsToInsert,
              apiKey,
              aiModel === 'openai'
            );
          }
        }
      }

      // 4. Inserir Galeria de Fotos
      const gallery = updatedRest.gallery_images || updatedRest.galleryImages || [];
      if (gallery.length > 0) {
        await supabase.from('restaurant_gallery').delete().eq('restaurant_id', uuidId);

        const galleryToInsert = [];
        for (let idx = 0; idx < gallery.length; idx++) {
          const img = gallery[idx];
          let imgUrl = typeof img === 'string' ? img : (img.image_url || img.url || '');
          
          if (imgUrl) {
            const ext = getExtension(imgUrl);
            const storagePath = `gallery/${uuidId}/${idx}_photo.${ext}`;
            imgUrl = await ensureSupabaseImageUrl(imgUrl, storagePath);

            galleryToInsert.push({
              restaurant_id: uuidId,
              image_url: imgUrl,
              caption: typeof img === 'object' && img.caption ? img.caption : 'Foto do Local',
              order_index: idx
            });
          }
        }

        if (galleryToInsert.length > 0) {
          const { error: galleryError } = await supabase
            .from('restaurant_gallery')
            .insert(galleryToInsert);
            
          if (galleryError) console.warn("Erro ao salvar fotos da galeria:", galleryError.message);
        }
      }

      return true;
    } catch (err: any) {
      console.error(`Erro ao sincronizar restaurante "${updatedRest.name}":`, err);
      return false;
    }
  };

  const getDetailsValidationError = (r: any): string | null => {
    const phone = r.phone || '';
    const cleanPhoneStr = phone.replace(/\D/g, '');
    if (!phone.trim() || phone.toLowerCase().includes('sem telefone') || phone.toLowerCase().includes('nao informado') || cleanPhoneStr.length < 8) {
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

    return null;
  };

  const runGeocodingAndValidate = async (data: any) => {
    // 1. Validar campos básicos
    const basicError = getDetailsValidationError(data);
    if (basicError) {
      showError(basicError);
      return null;
    }

    // 2. Resolver coordenadas
    let latitude = data.latitude !== undefined && data.latitude !== null ? data.latitude : null;
    let longitude = data.longitude !== undefined && data.longitude !== null ? data.longitude : null;

    // Se coordenadas forem nulas ou zero, tentamos extrair do googleMapsUrl
    if ((latitude === null || longitude === null || latitude === 0 || longitude === 0) && data.googleMapsUrl) {
      const coords = extractCoordsFromUrl(data.googleMapsUrl);
      if (coords) {
        latitude = coords.lat;
        longitude = coords.lng;
      }
    }

    // Se ainda não temos coordenadas, tentamos geocodificar o endereço completo
    if (latitude === null || longitude === null || latitude === 0 || longitude === 0) {
      const addrParts = [];
      if (data.address) {
        if (data.number) {
          addrParts.push(`${data.address}, ${data.number}`);
        } else {
          addrParts.push(data.address);
        }
      }
      if (data.neighborhood) addrParts.push(data.neighborhood);
      if (data.city) {
        if (data.state) {
          addrParts.push(`${data.city} - ${data.state}`);
        } else {
          addrParts.push(data.city);
        }
      }
      if (data.cep) addrParts.push(data.cep);
      
      const fullAddress = addrParts.join(', ');
      if (fullAddress.trim()) {
        try {
          console.log(`[Validation] Tentando geocodificar: "${fullAddress}"`);
          const coords = await geocodeAddress(fullAddress);
          if (coords) {
            latitude = coords.lat;
            longitude = coords.lon;
            console.log(`[Validation] Geocodificação bem-sucedida: lat=${latitude}, lon=${longitude}`);
          }
        } catch (e) {
          console.warn('Erro ao geocodificar no validador:', e);
        }
      }
    }

    // 3. Validar coordenadas
    if (!latitude || !longitude || latitude === 0 || longitude === 0) {
      showError('Não foi possível obter as coordenadas exatas para o endereço informado. Verifique o CEP/endereço.');
      return null;
    }

    return {
      ...data,
      latitude,
      longitude
    };
  };

  const handleSaveLocal = async () => {
    if (!editedData) return;

    try {
      const validatedData = await runGeocodingAndValidate(editedData);
      if (!validatedData) return;

      const success = await syncSingleToSupabase(validatedData);
      if (success) {
        showSuccess('Alterações salvas no Supabase!');
        setIsEditing(false);
        window.dispatchEvent(new Event('local-sync-restaurants'));
        localStorage.setItem('local-sync-restaurants-trigger', Date.now().toString());
        onSyncSuccess();
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

    try {
      const validatedData = await runGeocodingAndValidate(editedData);
      if (!validatedData) return;

      const success = await syncSingleToSupabase(validatedData);

      if (success) {
        showSuccess('Alterações salvas com sucesso no Supabase!');
        setIsEditing(false);
        window.dispatchEvent(new Event('local-sync-restaurants'));
        localStorage.setItem('local-sync-restaurants-trigger', Date.now().toString());
        onSyncSuccess();
        onClose();
      } else {
        showError('Erro ao sincronizar com o banco de dados.');
      }
    } catch (e) {
      console.error(e);
      showError('Erro ao salvar no Supabase.');
    }
  };

  const handleDeleteRestaurant = async () => {
    if (!editedData) return;
    if (!window.confirm(`Tem certeza que deseja remover o restaurante "${editedData.name}"?`)) {
      return;
    }

    try {
      const uuid = getDeterministicUUID(editedData.id);
      const { error: deleteError } = await supabase
        .from('restaurants')
        .update({ is_deleted: true })
        .eq('id', uuid);

      if (deleteError) {
        console.error('Erro ao remover do Supabase:', deleteError);
        showError('Erro ao remover do banco de dados.');
      } else {
        showSuccess(`"${editedData.name}" removido com sucesso!`);
        window.dispatchEvent(new Event('local-sync-restaurants'));
        localStorage.setItem('local-sync-restaurants-trigger', Date.now().toString());
        onClose();
        onSyncSuccess();
      }
    } catch (e) {
      console.error(e);
      showError('Erro ao remover o restaurante.');
    }
  };

  const handleAIExtraction = async () => {
    const content = aiPastedContent.trim();
    if (!content) {
      showError('Cole o texto do cardápio bruto ou HTML antes de processar.');
      return;
    }

    const isUrl = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,6}(\/\S*)?$/i.test(content);
    if (isUrl) {
      const formattedUrl = /^https?:\/\//i.test(content) ? content : `https://${content}`;
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      const extId = localStorage.getItem('chrome_extension_id')?.trim();
      let useExtension = false;
      
      setIsExtractingAI(true);
      try {
        if (extId) {
          useExtension = await checkExtensionInstalled(extId);
        }

        if (!isLocalhost && !useExtension) {
          throw new Error('A extração direta por URL em nuvem (Vercel) precisa da Extensão do Chrome instalada e configurada com o ID correspondente no menu da extensão. Caso contrário, copie o texto do cardápio e cole aqui.');
        }

        // 1. Atualizar o link no Supabase
        const { error: updateError } = await supabase
          .from('restaurants')
          .update({
            other_url: formattedUrl,
            external_url: formattedUrl
          })
          .eq('id', restaurant.id);

        if (updateError) throw updateError;

        if (useExtension && extId) {
          showSuccess('Link detectado! Coletando o cardápio através da extensão do Chrome...');
          
          const chromeObj = (window as any).chrome;
          const scrapeResult: any = await new Promise((resolve, reject) => {
            chromeObj.runtime.sendMessage(
              extId,
              { action: "scrapeMenu", url: formattedUrl },
              (response: any) => {
                const lastError = chromeObj.runtime.lastError;
                if (lastError) {
                  reject(new Error("Erro na extensão: " + lastError.message));
                } else if (response && response.success) {
                  resolve(response);
                } else {
                  reject(new Error(response?.error || "Falha na extração pela extensão."));
                }
              }
            );
          });

          const xmlContent = scrapeResult.xmlContent;
          if (!xmlContent || xmlContent.trim() === '<menu>\n</menu>' || xmlContent.trim() === '<menu></menu>') {
            throw new Error("Nenhum prato ou categoria foi detectado na página pela extensão.");
          }

          showSuccess('Cardápio coletado pela extensão! Processando com IA do navegador...');

          // Agora rodar a IA do navegador no xmlContent
          const apiKey = aiModel === 'gemini' 
            ? (import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('user_gemini_key') || '')
            : (import.meta.env.VITE_OPENAI_API_KEY || localStorage.getItem('user_openai_key') || '');

          if (!apiKey) {
            throw new Error(`Chave API para ${aiModel === 'gemini' ? 'Gemini' : 'OpenAI'} não configurada.`);
          }

          const prompt = `Você é um assistente de IA especialista em cardápios de restaurantes.
Analise a seguinte estrutura XML contendo elementos de categorias e itens de pratos extraídos do site de um cardápio. Organize tudo em categorias, itens, descrições, preços e imagens dos pratos.

Regras importantes:
1. Identifique as categorias de forma lógica (ex: "Entradas", "Pratos Principais", "Hambúrgueres", "Bebidas", "Sobremesas").
2. Para cada item, extraia o nome, a descrição (ingredientes, detalhes de tamanho, acompanhamentos) e o preço.
3. Se houver tags <image> associadas aos itens de prato, extraia a URL exata da imagem no campo "image_url". Se não houver, deixe como string vazia.
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
        "image_url": "URL da imagem ou string vazia"
      }
    ]
  }
]

Estrutura XML do cardápio:
${xmlContent}
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

          showSuccess(`Sucesso! Extensão + IA extraíram ${formattedCategories.length} categorias do cardápio.`);
          setAiPastedContent('');
          setIsEditing(true); // Habilita o modo de edição para mostrar o cardápio
          setActiveDialogTab('edit'); // Redireciona para o formulário de edição para visualizar

        } else {
          // Fallback para o robô do servidor local
          showSuccess('Iniciando o robô extrator local...');
          const res = await fetch(`/api/local-collector/re-scrape-menu?restaurantId=${restaurant.id}`, {
            method: 'POST'
          });

          if (!res.ok) {
            throw new Error('Falha na comunicação com o servidor local.');
          }

          const data = await res.json();
          if (data.success) {
            showSuccess('Cardápio extraído com sucesso pelo robô local!');
            
            // Buscar os dados atualizados do restaurante direto do Supabase
            const { data: updatedRest, error: fetchError } = await supabase
              .from('restaurants')
              .select(`
                *,
                menu_categories (
                  *,
                  menu_items (*)
                ),
                restaurant_gallery (*)
              `)
              .eq('id', restaurant.id)
              .maybeSingle();

            if (!fetchError && updatedRest) {
              const socialNetworks = updatedRest.social_networks || [];
              const instagram = socialNetworks.find((sn: any) => sn && sn.platform === 'instagram')?.url || '';
              const facebook = socialNetworks.find((sn: any) => sn && sn.platform === 'facebook')?.url || '';
              
              const menuCategories = (updatedRest.menu_categories || []).map((cat: any) => ({
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
              
              const galleryImages = (updatedRest.restaurant_gallery || []).map((img: any) => img.image_url);

              const mapped = {
                ...restaurant,
                id: updatedRest.id,
                name: updatedRest.name,
                phone: updatedRest.phone || '',
                cep: updatedRest.cep || '',
                address: updatedRest.address || '',
                number: updatedRest.number || '',
                neighborhood: updatedRest.neighborhood || '',
                city: updatedRest.city || '',
                state: updatedRest.state || '',
                description: updatedRest.description || '',
                logo: updatedRest.image_url || '',
                coverImage: updatedRest.cover_image_url || '',
                cover_image_url: updatedRest.cover_image_url || '',
                openingHours: updatedRest.opening_hours || null,
                opening_hours: updatedRest.opening_hours || null,
                social_networks: socialNetworks,
                instagram,
                facebook,
                menuSourceUrl: updatedRest.other_url || updatedRest.external_url || '',
                menuUrl: updatedRest.other_url || updatedRest.external_url || '',
                menu_categories: menuCategories,
                galleryImages
              };

              setEditedData(mapped);
              setIsEditing(true);
              setActiveDialogTab('edit');
            }

            onSyncSuccess();
          } else {
            showError('O robô local falhou ao processar o cardápio: ' + (data.error || 'Erro desconhecido.'));
          }
        }
      } catch (err: any) {
        showError('Erro ao executar a extração: ' + err.message);
      } finally {
        setIsExtractingAI(false);
      }
      return;
    }

    const apiKey = aiModel === 'gemini' 
      ? (import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('user_gemini_key') || '')
      : (import.meta.env.VITE_OPENAI_API_KEY || localStorage.getItem('user_openai_key') || '');

    if (!apiKey) {
      showError(`Chave API para ${aiModel === 'gemini' ? 'Gemini' : 'OpenAI'} não está configurada. Insira a chave no painel de configuração da Extensão.`);
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
      setIsEditing(true); // Habilita o modo de edição para mostrar o cardápio
      setActiveDialogTab('edit'); // Redireciona para o formulário de edição para visualizar
    } catch (e: any) {
      console.error(e);
      showError(`Falha na extração de IA: ${e.message || 'Verifique o formato e as chaves de API.'}`);
    } finally {
      setIsExtractingAI(false);
    }
  };

  const handleAIHoursExtraction = async () => {
    if (!aiHoursPastedContent.trim()) {
      showError('Cole o texto dos horários de funcionamento antes de processar.');
      return;
    }

    const apiKey = aiModel === 'gemini' 
      ? (import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('user_gemini_key') || '')
      : (import.meta.env.VITE_OPENAI_API_KEY || localStorage.getItem('user_openai_key') || '');

    if (!apiKey) {
      showError(`Chave API para ${aiModel === 'gemini' ? 'Gemini' : 'OpenAI'} não está configurada. Insira a chave no painel de configuração da Extensão.`);
      return;
    }

    setIsExtractingHoursAI(true);
    try {
      const prompt = `Você é um assistente de IA especialista em dados de horários de funcionamento de estabelecimentos.
Analise o seguinte texto bruto contendo horários de funcionamento de um restaurante e formate-o no JSON correto esperado pelo nosso sistema.

Regras importantes:
1. Os dias da semana no JSON final devem ser estritamente em inglês como chaves: "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday".
2. Para cada dia da semana, se o restaurante estiver aberto nesse dia, defina "isOpen": true e inclua o slot de horário no array "slots" com "start" e "end" formatados como HH:MM (24 horas, ex: "11:00" ou "22:30").
3. Se o dia for explicitamente fechado ou não mencionado em dias de funcionamento normais, defina "isOpen": false e "slots": [].
4. Se houver mais de um período de funcionamento no mesmo dia (ex: almoço 11:30 às 14:30 e jantar 18:00 às 22:00), adicione os slots correspondentes no array "slots".
5. Retorne a resposta estritamente no formato JSON, sem qualquer outro texto ou explicações, no seguinte esquema:
{
  "monday": { "isOpen": true, "slots": [{ "start": "11:00", "end": "22:00" }] },
  "tuesday": { "isOpen": true, "slots": [{ "start": "11:00", "end": "22:00" }] },
  "wednesday": { "isOpen": true, "slots": [{ "start": "11:00", "end": "22:00" }] },
  "thursday": { "isOpen": true, "slots": [{ "start": "11:00", "end": "22:00" }] },
  "friday": { "isOpen": true, "slots": [{ "start": "11:00", "end": "23:00" }] },
  "saturday": { "isOpen": true, "slots": [{ "start": "11:00", "end": "23:00" }] },
  "sunday": { "isOpen": false, "slots": [] }
}

Texto bruto com os horários colados:
${aiHoursPastedContent}
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

      const parsed = JSON.parse(text);

      const validDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
      const validatedHours: any = {};
      validDays.forEach(day => {
        if (parsed && parsed[day]) {
          validatedHours[day] = {
            isOpen: !!parsed[day].isOpen,
            slots: Array.isArray(parsed[day].slots) ? parsed[day].slots.map((s: any) => ({
              start: s.start || '11:00',
              end: s.end || '22:00'
            })) : []
          };
        } else {
          validatedHours[day] = { isOpen: false, slots: [] };
        }
      });

      setEditedData((prev: any) => ({
        ...prev,
        opening_hours: validatedHours,
        openingHours: validatedHours
      }));

      showSuccess(`Sucesso! Horários de funcionamento extraídos e preenchidos pela IA.`);
      setAiHoursPastedContent('');
    } catch (e: any) {
      console.error(e);
      showError(`Falha na extração de horários: ${e.message || 'Verifique o formato e as chaves de API.'}`);
    } finally {
      setIsExtractingHoursAI(false);
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

  const handleEditHoursToggle = (day: string, checked: boolean) => {
    setEditedData((prev: any) => {
      const hours = prev.openingHours || prev.opening_hours || {};
      const dayInfo = hours[day] || { isOpen: false, slots: [] };
      const newHours = {
        ...hours,
        [day]: {
          ...dayInfo,
          isOpen: checked,
          slots: checked && (!dayInfo.slots || dayInfo.slots.length === 0) ? [{ start: '11:00', end: '22:00' }] : (dayInfo.slots || [])
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
      const updatedSlots = [...(dayInfo.slots || [])];
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

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingLogoFile(true);
    try {
      const uuidId = getDeterministicUUID(editedData.id);
      const ext = file.name.split('.').pop() || 'jpg';
      const storagePath = `logos/${uuidId}_logo.${ext}`;

      const { data, error } = await supabase.storage
        .from('restaurant-images')
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: true
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('restaurant-images')
        .getPublicUrl(storagePath);

      setEditedData((prev: any) => ({
        ...prev,
        logo: publicUrl,
        image_url: publicUrl
      }));
      setLogoTimestamp(Date.now());
      showSuccess('Imagem da logo enviada com sucesso!');
    } catch (err: any) {
      showError('Erro ao enviar imagem da logo: ' + err.message);
    } finally {
      setIsUploadingLogoFile(false);
      event.target.value = '';
    }
  };

  const processLogoUrl = async (url: string) => {
    if (!url || !url.startsWith('http') || url.includes('supabase.co')) {
      setEditedData((prev: any) => ({ ...prev, logo: url, image_url: url }));
      return;
    }

    setLogoError(false);
    setIsScrapingLogo(true); // Reusar o estado de loading de logo
    try {
      const uuidId = getDeterministicUUID(editedData.id);
      
      const getExtension = (u: string) => {
        const match = u.split(/[?#]/)[0].match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
        return match ? match[1].toLowerCase() : 'jpg';
      };
      const ext = getExtension(url);
      const storagePath = `logos/${uuidId}_logo.${ext}`;

      let blob: Blob | null = null;
      
      try {
        const base64Data = await downloadExternalImage(url);
        blob = base64ToBlob(base64Data);
      } catch (err: any) {
        if (err.message !== "extension_not_available") {
          console.warn("Erro ao baixar via extensão:", err);
        }
        
        const res = await fetch(`/api/local-collector/download-and-upload?url=${encodeURIComponent(url)}&path=${encodeURIComponent(storagePath)}`, {
          method: 'POST'
        });
        if (res.ok) {
          const uploadResult = await res.json();
          if (uploadResult.success && uploadResult.url) {
            setEditedData((prev: any) => ({
              ...prev,
              logo: uploadResult.url,
              image_url: uploadResult.url
            }));
            setLogoTimestamp(Date.now());
            showSuccess('Logo baixada e hospedada no Supabase!');
            return;
          }
        }
        throw new Error("Falha no download da logo.");
      }

      if (blob) {
        const { error: uploadError } = await supabase.storage
          .from('restaurant-images')
          .upload(storagePath, blob, {
            contentType: blob.type,
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl: newUrl } } = supabase.storage
          .from('restaurant-images')
          .getPublicUrl(storagePath);

        setEditedData((prev: any) => ({
          ...prev,
          logo: newUrl,
          image_url: newUrl
        }));
        setLogoTimestamp(Date.now());
        showSuccess('Logo baixada e hospedada no Supabase via Extensão!');
      }
    } catch (e: any) {
      console.error(e);
      setEditedData((prev: any) => ({ ...prev, logo: url, image_url: url }));
      setLogoError(true);
      showError("Erro ao processar imagem da logo: " + e.message);
    } finally {
      setIsScrapingLogo(false);
    }
  };

  const processCoverUrl = async (url: string) => {
    if (!url || !url.startsWith('http') || url.includes('supabase.co')) {
      setEditedData((prev: any) => ({ ...prev, coverImage: url, cover_image_url: url }));
      return;
    }

    setCoverError(false);
    setIsUploadingCover(true);
    try {
      const uuidId = getDeterministicUUID(editedData.id);
      
      const getExtension = (u: string) => {
        const match = u.split(/[?#]/)[0].match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
        return match ? match[1].toLowerCase() : 'jpg';
      };
      const ext = getExtension(url);
      const storagePath = `covers/${uuidId}_cover.${ext}`;

      let blob: Blob | null = null;
      
      try {
        const base64Data = await downloadExternalImage(url);
        blob = base64ToBlob(base64Data);
      } catch (err: any) {
        if (err.message !== "extension_not_available") {
          console.warn("Erro ao baixar via extensão:", err);
        }
        const res = await fetch(`/api/local-collector/download-and-upload?url=${encodeURIComponent(url)}&path=${encodeURIComponent(storagePath)}`, {
          method: 'POST'
        });
        if (res.ok) {
          const uploadResult = await res.json();
          if (uploadResult.success && uploadResult.url) {
            setEditedData((prev: any) => ({
              ...prev,
              coverImage: uploadResult.url,
              cover_image_url: uploadResult.url
            }));
            setCoverTimestamp(Date.now());
            showSuccess('Imagem de capa baixada e hospedada no Supabase!');
            return;
          }
        }
        throw new Error("Falha no download da capa.");
      }

      if (blob) {
        const { error: uploadError } = await supabase.storage
          .from('restaurant-images')
          .upload(storagePath, blob, {
            contentType: blob.type,
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl: newUrl } } = supabase.storage
          .from('restaurant-images')
          .getPublicUrl(storagePath);

        setEditedData((prev: any) => ({
          ...prev,
          coverImage: newUrl,
          cover_image_url: newUrl
        }));
        setCoverTimestamp(Date.now());
        showSuccess('Imagem de capa baixada e hospedada no Supabase via Extensão!');
      }
    } catch (e: any) {
      console.error(e);
      setEditedData((prev: any) => ({ ...prev, coverImage: url, cover_image_url: url }));
      setCoverError(true);
      showError("Erro ao processar imagem de capa: " + e.message);
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingCover(true);
    try {
      const uuidId = getDeterministicUUID(editedData.id);
      const ext = file.name.split('.').pop() || 'jpg';
      const storagePath = `covers/${uuidId}_cover.${ext}`;

      const { data, error } = await supabase.storage
        .from('restaurant-images')
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: true
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('restaurant-images')
        .getPublicUrl(storagePath);

      setEditedData((prev: any) => ({
        ...prev,
        coverImage: publicUrl,
        cover_image_url: publicUrl
      }));
      setCoverTimestamp(Date.now());
      
      showSuccess('Imagem de capa enviada com sucesso!');
    } catch (err: any) {
      showError('Erro ao enviar imagem de capa: ' + err.message);
    } finally {
      setIsUploadingCover(false);
      event.target.value = '';
    }
  };

  const handleAddGalleryUrl = async () => {
    if (!newGalleryUrl.trim()) return;
    if (isAddingGallery) return;

    setIsAddingGallery(true);
    try {
      const urlToProcess = newGalleryUrl.trim();
      const uuidId = getDeterministicUUID(editedData.id);

      const getExtension = (url: string) => {
        const match = url.split(/[?#]/)[0].match(/\.(jpg|jpeg|png|gif|webp|svg|mp4|webm|ogg|mov)$/i);
        return match ? match[1].toLowerCase() : 'jpg';
      };
      const ext = getExtension(urlToProcess);
      const uniqueId = Date.now();
      const storagePath = `gallery/${uuidId}/${uniqueId}_photo.${ext}`;

      let finalImageUrl = '';
      let blob: Blob | null = null;
      let extensionError: any = null;

      try {
        const base64Data = await downloadExternalImage(urlToProcess);
        blob = base64ToBlob(base64Data);
      } catch (err: any) {
        extensionError = err;
        if (err.message !== "extension_not_available") {
          console.warn("Erro ao baixar via extensão:", err);
        }
        const res = await fetch(`/api/local-collector/download-and-upload?url=${encodeURIComponent(urlToProcess)}&path=${encodeURIComponent(storagePath)}`, {
          method: 'POST'
        });
        if (res.ok) {
          const uploadResult = await res.json();
          if (uploadResult.success && uploadResult.url) {
            finalImageUrl = uploadResult.url;
          }
        }
      }

      if (blob) {
        const { error: uploadError } = await supabase.storage
          .from('restaurant-images')
          .upload(storagePath, blob, {
            contentType: blob.type,
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl: newUrl } } = supabase.storage
          .from('restaurant-images')
          .getPublicUrl(storagePath);

        finalImageUrl = newUrl;
      }

      if (finalImageUrl) {
        // Inserir registro diretamente na tabela restaurant_gallery
        const currentGallery = editedData.gallery_images || editedData.galleryImages || [];
        const nextIndex = currentGallery.length;

        const { error: insertError } = await supabase
          .from('restaurant_gallery')
          .insert({
            restaurant_id: uuidId,
            image_url: finalImageUrl,
            caption: 'Foto do Local',
            order_index: nextIndex
          });

        if (insertError) {
          console.warn("Aviso ao salvar foto na tabela restaurant_gallery:", insertError.message);
        }

        // Atualizar o estado local de forma reativa
        setEditedData((prev: any) => {
          const gallery = prev.gallery_images || prev.galleryImages || [];
          const newGallery = [...gallery, finalImageUrl];
          return {
            ...prev,
            galleryImages: newGallery,
            gallery_images: newGallery
          };
        });

        setNewGalleryUrl('');
        showSuccess('Foto baixada e adicionada à galeria!');
      } else {
        if (extensionError) {
          if (extensionError.message === "extension_not_available") {
            showError('Extensão auxiliar do Chrome não configurada ou inativa. Configure o ID nas configurações.');
          } else {
            showError('Erro ao baixar imagem via extensão: ' + extensionError.message);
          }
        } else {
          showError('Não foi possível fazer download e upload desta foto. Certifique-se de que o link é válido e público.');
        }
      }
    } catch (err: any) {
      showError('Erro ao adicionar foto: ' + err.message);
    } finally {
      setIsAddingGallery(false);
    }
  };

  const handleRemoveGalleryUrl = async (index: number) => {
    const gallery = editedData.gallery_images || editedData.galleryImages || [];
    const targetImgUrl = gallery[index];
    
    if (targetImgUrl) {
      try {
        const uuidId = getDeterministicUUID(editedData.id);
        const { error: deleteError } = await supabase
          .from('restaurant_gallery')
          .delete()
          .eq('restaurant_id', uuidId)
          .eq('image_url', targetImgUrl);

        if (deleteError) {
          console.warn("Aviso ao deletar imagem da galeria no Supabase:", deleteError.message);
        }
      } catch (e) {
        console.warn("Erro ao deletar imagem da galeria:", e);
      }
    }

    setEditedData((prev: any) => {
      const currentGallery = prev.gallery_images || prev.galleryImages || [];
      const newGallery = currentGallery.filter((_: any, idx: number) => idx !== index);
      return {
        ...prev,
        galleryImages: newGallery,
        gallery_images: newGallery
      };
    });
    showSuccess('Foto removida!');
  };

  if (!restaurant) return null;

  const isSynced = restaurant.visit_status === 'Visitado';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 bg-white rounded-3xl">
        <DialogHeader className="p-6 pb-2 border-b border-gray-100 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
              {restaurant.name}
              {isSynced ? (
                <Badge className="bg-green-100 text-green-800 border-none font-bold text-[10px] py-0.5">Sincronizado</Badge>
              ) : (
                <Badge className="bg-slate-100 text-slate-500 border-none font-semibold text-[10px] py-0.5">Pendente (Local)</Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs mt-1">
              {restaurant.category} • ID: {restaurant.id}
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
              {restaurant && (
                <>
                  {/* Imagem de Capa e Logo */}
                  <div className="relative h-44 bg-slate-100 rounded-3xl overflow-hidden border border-gray-150">
                    {(restaurant.coverImage || restaurant.cover_image_url) ? (
                      <img 
                        key={`${restaurant.coverImage || restaurant.cover_image_url}_${coverTimestamp}`}
                        src={getCoverSrc(restaurant.coverImage || restaurant.cover_image_url)} 
                        alt="Capa"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-50 text-gray-400">
                        <span className="text-xs font-semibold">Sem Imagem de Capa</span>
                      </div>
                    )}
                    <div className="absolute left-6 bottom-4 w-20 h-20 rounded-2xl overflow-hidden border-2 border-white bg-white shadow-md flex items-center justify-center">
                      {(restaurant.logo || restaurant.image_url) ? (
                        <img 
                          key={`${restaurant.logo || restaurant.image_url}_${logoTimestamp}`}
                          src={getLogoSrc(restaurant.logo || restaurant.image_url)} 
                          alt="Logo"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-gray-400 p-1 text-center">
                          <span className="text-[9px] font-bold leading-tight">Sem Logo</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Dados Gerais */}
                    <div className="space-y-4">
                      <h3 className="font-bold text-sm text-primary uppercase tracking-wider">Informações Gerais</h3>
                      <div className="space-y-2 text-xs">
                        <p>
                          <span className="font-bold text-gray-500">Endereço:</span>{' '}
                          {restaurant.address}
                          {restaurant.number ? `, ${restaurant.number}` : ''}
                          {restaurant.neighborhood ? ` - ${restaurant.neighborhood}` : ''}
                          , {restaurant.city} - {restaurant.state}
                          {restaurant.cep ? `, ${restaurant.cep}` : ''}
                        </p>
                        <p><span className="font-bold text-gray-500">Telefone:</span> {hasNoPhone(restaurant) ? <span className="text-red-500 font-semibold">Não informado</span> : restaurant.phone}</p>
                        <p>
                          <span className="font-bold text-gray-500">Links Sociais:</span>
                          <span className="inline-flex items-center gap-2 ml-2">
                            {getSocialUrl(restaurant, 'instagram') && (
                              <a href={getSocialUrl(restaurant, 'instagram')} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:underline inline-flex items-center gap-0.5">
                                Instagram <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                            {getSocialUrl(restaurant, 'facebook') && (
                              <a href={getSocialUrl(restaurant, 'facebook')} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-0.5">
                                Facebook <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                            {restaurant.website && (
                              <a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:underline inline-flex items-center gap-0.5">
                                Website <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </span>
                        </p>
                        <p><span className="font-bold text-gray-500">Google Maps:</span> {restaurant.googleMapsUrl ? <a href={restaurant.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Ver no Maps ↗</a> : 'Não cadastrado'}</p>
                        <p><span className="font-bold text-gray-500">Descrição:</span> {restaurant.description || 'Nenhuma descrição fornecida.'}</p>
                      </div>

                      {/* Galeria de Fotos */}
                      <div className="space-y-2">
                        <h3 className="font-bold text-sm text-primary uppercase tracking-wider">Galeria de Fotos</h3>
                        {restaurant.galleryImages && restaurant.galleryImages.length > 0 ? (
                          <div className="flex gap-2 overflow-x-auto py-1">
                            {restaurant.galleryImages.map((img: string, idx: number) => (
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
                      {renderOpeningHours(restaurant.openingHours || restaurant.opening_hours)}
                    </div>
                  </div>

                  {/* Cardápio Estruturado */}
                  <div className="space-y-4 pt-4 border-t border-gray-100">
                    <h3 className="font-bold text-sm text-primary uppercase tracking-wider">Cardápio Estruturado</h3>
                    {restaurant.menu_categories && restaurant.menu_categories.length > 0 ? (
                      <div className="space-y-4">
                        {restaurant.menu_categories.map((cat: any) => (
                          <div key={cat.id || cat.name} className="border border-gray-150 rounded-2xl p-4 bg-slate-50/50">
                            <h4 className="font-bold text-sm text-slate-800 mb-2 border-b border-gray-200 pb-1">{cat.name}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {(cat.items || cat.menu_items || []).map((item: any) => {
                                let descText = item.description || '';
                                let options: any[] = [];
                                
                                try {
                                  if (item.description && item.description.startsWith('{')) {
                                    const parsed = JSON.parse(item.description);
                                    descText = parsed.description || '';
                                    options = parsed.options || [];
                                  }
                                } catch (e) {
                                  // ignore
                                }

                                const isExpanded = !!expandedPreviewItems[item.id];

                                return (
                                  <div key={item.id || item.name} className="flex flex-col bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm gap-2">
                                    <div className="flex gap-3 items-start">
                                      {item.image_url && (
                                        <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-150 border border-gray-100">
                                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                        </div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-2">
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <h5 className="font-bold text-xs text-slate-800 truncate">{item.name}</h5>
                                            {options.length > 0 && (
                                              <button
                                                onClick={() => setExpandedPreviewItems(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                                className="p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                                              >
                                                {isExpanded ? (
                                                  <ChevronUp className="w-3.5 h-3.5" />
                                                ) : (
                                                  <ChevronDown className="w-3.5 h-3.5" />
                                                )}
                                              </button>
                                            )}
                                          </div>
                                          <span className="text-xs font-bold text-emerald-600 shrink-0">
                                            {typeof item.price === 'number' && item.price > 0 
                                              ? `R$ ${item.price.toFixed(2).replace('.', ',')}` 
                                              : 'Sob consulta'}
                                          </span>
                                        </div>
                                        {descText && (
                                          <p className="text-[10px] text-gray-500 font-medium mt-1 leading-normal line-clamp-2">
                                            {descText}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {options.length > 0 && isExpanded && (
                                      <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg space-y-2 text-[10px]">
                                        {options.map((optGroup, gIdx) => (
                                          <div key={gIdx} className="space-y-1">
                                            <p className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider">{optGroup.title}</p>
                                            <div className="grid grid-cols-1 gap-1 text-[10px]">
                                              {optGroup.itens.map((opt: any, oIdx: number) => (
                                                <div key={oIdx} className="flex justify-between items-center bg-white px-2 py-1 rounded border border-slate-150 shadow-sm">
                                                  <span className="font-medium text-slate-700">{opt.name}</span>
                                                  {opt.price > 0 ? (
                                                    <span className="font-bold text-[#EF2A39]">
                                                      +R$ {opt.price.toFixed(2).replace('.', ',')}
                                                    </span>
                                                  ) : (
                                                    <span className="font-bold text-emerald-600 bg-emerald-50 px-1 rounded-[3px]">
                                                      Incluso
                                                    </span>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-gray-200">
                        <p className="text-xs text-gray-500 font-bold">Nenhum cardápio estruturado.</p>
                        {restaurant.menuSourceUrl && (
                          <p className="text-[10px] text-gray-400 mt-1">
                            Possui link de origem:{' '}
                            <a href={restaurant.menuSourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-bold">
                              {restaurant.menuSourceUrl}
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
                        <Select 
                          value={CATEGORIES.includes(editedData.category) ? editedData.category : 'Outros'}
                          onValueChange={(val) => setEditedData({ ...editedData, category: val })}
                        >
                          <SelectTrigger id="edit-category" className="bg-white border-gray-300 text-xs h-9">
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat} className="text-xs">
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="edit-instagram" className="text-xs font-bold">Instagram URL</Label>
                        <div className="flex gap-1">
                          <Input 
                            id="edit-instagram"
                            value={editedData.instagram || getSocialUrl(editedData, 'instagram') || ''}
                            onChange={(e) => setEditedData({ ...editedData, instagram: e.target.value })}
                            className="bg-white border-gray-300 text-xs h-9 flex-1"
                            placeholder="Link do perfil"
                          />
                          <Button 
                            type="button"
                            size="sm"
                            onClick={handleScrapeInstagramLogoAndFollowers}
                            disabled={isScrapingLogo}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-9 px-2 shadow-sm shrink-0"
                            title="Coletar logo e seguidores do Instagram"
                          >
                            {isScrapingLogo ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                            ) : (
                              <Sparkles className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="edit-followers" className="text-xs font-bold">Seguidores Instagram</Label>
                        <Input 
                          id="edit-followers"
                          type="number"
                          value={editedData.followers_override === null || editedData.followers_override === undefined ? '' : editedData.followers_override}
                          onChange={(e) => setEditedData({ ...editedData, followers_override: e.target.value === '' ? null : parseInt(e.target.value) })}
                          className="bg-white border-gray-300 text-xs h-9 font-semibold"
                          placeholder="Qtd. seguidores"
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

                    {/* Identidade Visual - Logo e Capa */}
                    <div className="bg-slate-50/50 p-5 rounded-2xl border border-gray-150 space-y-6">
                      <h4 className="font-bold text-sm text-primary uppercase tracking-wider mb-2 border-b border-gray-250 pb-1">Identidade Visual (Logo e Capa)</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Seção da Logo */}
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
                          <Label className="text-xs font-bold text-slate-700 block">Logo do Restaurante</Label>
                          
                          <div className="flex gap-4 items-center">
                            {/* Preview Circular */}
                            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/20 shrink-0 bg-slate-100 flex items-center justify-center shadow-inner relative">
                              {isScrapingLogo || isUploadingLogoFile ? (
                                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                                  <span className="animate-spin inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                                </div>
                              ) : null}
                              {editedData.logo && !logoError ? (
                                <img 
                                  key={`${editedData.logo}_${logoTimestamp}`}
                                  src={getLogoSrc(editedData.logo)} 
                                  alt="Logo" 
                                  className="w-full h-full object-cover" 
                                  onError={() => setLogoError(true)}
                                />
                              ) : (
                                <div className={`w-full h-full flex items-center justify-center ${editedData.logo ? 'bg-red-50 text-red-500' : 'text-gray-400'}`}>
                                  <span className="text-[10px] font-bold text-center leading-none">
                                    {editedData.logo ? "Inválida" : "Sem Logo"}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex-1 space-y-2">
                              <input 
                                type="file" 
                                id="logo-file-upload" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={handleLogoUpload}
                              />
                              <Button 
                                type="button"
                                size="sm"
                                onClick={() => document.getElementById('logo-file-upload')?.click()}
                                disabled={isUploadingLogoFile || isScrapingLogo}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-9 gap-2 shadow-sm text-xs"
                              >
                                {isUploadingLogoFile ? (
                                  <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                                ) : (
                                  <Upload className="w-4 h-4" />
                                )}
                                Fazer Upload Manual
                              </Button>

                              <Button 
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={handleScrapeInstagramLogoAndFollowers}
                                disabled={isScrapingLogo || isUploadingLogoFile}
                                className="w-full border-gray-300 text-xs font-semibold h-9 gap-1.5"
                                title="Buscar imagem do perfil do Instagram configurado acima"
                              >
                                {isScrapingLogo ? (
                                  <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                                ) : (
                                  <Sparkles className="w-3.5 h-3.5 text-pink-600" />
                                )}
                                Coletar via Robô (Instagram)
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-1 pt-1">
                            <span className="text-[10px] text-gray-500 font-bold block">Ou cole o link direto da imagem:</span>
                            <Input 
                              id="edit-logo"
                              value={editedData.logo || ''}
                              onChange={(e) => setEditedData({ ...editedData, logo: e.target.value })}
                              onBlur={(e) => processLogoUrl(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  processLogoUrl((e.target as HTMLInputElement).value);
                                }
                              }}
                              className="bg-white border-gray-300 text-[11px] h-8"
                              placeholder="https://exemplo.com/logo.png"
                            />
                          </div>
                        </div>

                        {/* Seção da Capa */}
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
                          <Label className="text-xs font-bold text-slate-700 block">Imagem de Capa (Banner)</Label>
                          
                          <div className="flex gap-4 items-center">
                            {/* Preview Retangular */}
                            <div className="w-24 h-16 rounded-lg overflow-hidden border-2 border-primary/20 shrink-0 bg-slate-100 flex items-center justify-center shadow-inner relative">
                              {isUploadingCover ? (
                                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                                  <span className="animate-spin inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                                </div>
                              ) : null}
                              {(editedData.coverImage || editedData.cover_image_url) && !coverError ? (
                                <img 
                                  key={`${(editedData.coverImage || editedData.cover_image_url)}_${coverTimestamp}`}
                                  src={getCoverSrc(editedData.coverImage || editedData.cover_image_url)} 
                                  alt="Capa" 
                                  className="w-full h-full object-cover" 
                                  onError={() => setCoverError(true)}
                                />
                              ) : (
                                <div className={`w-full h-full flex items-center justify-center ${(editedData.coverImage || editedData.cover_image_url) ? 'bg-red-50 text-red-500' : 'text-gray-400'}`}>
                                  <span className="text-[10px] font-bold text-center leading-none">
                                    {(editedData.coverImage || editedData.cover_image_url) ? "Inválida" : "Sem Capa"}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex-1 space-y-2">
                              <input 
                                type="file" 
                                id="cover-file-upload" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={handleCoverUpload}
                              />
                              <Button 
                                type="button"
                                size="sm"
                                onClick={() => document.getElementById('cover-file-upload')?.click()}
                                disabled={isUploadingCover}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-9 gap-2 shadow-sm text-xs"
                              >
                                {isUploadingCover ? (
                                  <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                                ) : (
                                  <Upload className="w-4 h-4" />
                                )}
                                Fazer Upload Manual
                              </Button>
                              
                              <div className="text-[10px] text-gray-400 text-center font-medium pt-1">
                                Banner retangular widescreen (16:9) recomendado
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1 pt-1">
                            <span className="text-[10px] text-gray-500 font-bold block">Ou cole o link direto da capa:</span>
                            <Input 
                              id="edit-cover"
                              value={editedData.coverImage || editedData.cover_image_url || ''}
                              onChange={(e) => setEditedData({ ...editedData, coverImage: e.target.value, cover_image_url: e.target.value })}
                              onBlur={(e) => processCoverUrl(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  processCoverUrl((e.target as HTMLInputElement).value);
                                }
                              }}
                              className="bg-white border-gray-300 text-[11px] h-8"
                              placeholder="https://exemplo.com/banner.png"
                            />
                          </div>
                        </div>
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

                    {/* IA Horários Input */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3 shadow-sm mb-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="ai-hours-paste" className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#EF2A39]" />
                          Preencher Horários por IA
                        </Label>
                        <span className="text-[10px] text-slate-400 font-semibold">Gemini / GPT</span>
                      </div>
                      <Textarea 
                        id="ai-hours-paste"
                        placeholder="Cole o texto bruto de horários do restaurante aqui. Ex: 'Segunda a Sexta das 11h às 23h. Sábado das 12h às 00h. Domingo fechado.'"
                        value={aiHoursPastedContent}
                        onChange={(e) => setAiHoursPastedContent(e.target.value)}
                        className="bg-[#F9FAFB] border-gray-300 text-xs min-h-[50px] placeholder:text-gray-400"
                        disabled={isExtractingHoursAI}
                      />
                      <div className="flex justify-end">
                        <Button 
                          size="sm"
                          type="button"
                          onClick={handleAIHoursExtraction}
                          disabled={isExtractingHoursAI || !aiHoursPastedContent.trim()}
                          className="bg-[#EF2A39] hover:bg-[#EF2A39]/90 text-white font-bold h-8.5 rounded-lg active:scale-95 transition-all text-xs border-none shadow-none"
                        >
                          {isExtractingHoursAI ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                              Processando Horários...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 mr-1 text-white fill-white" />
                              Extrair Horários
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    
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
                      <Button 
                        size="sm" 
                        onClick={handleAddGalleryUrl} 
                        disabled={isAddingGallery}
                        className="bg-slate-700 text-white font-bold h-9 min-w-[100px]"
                      >
                        {isAddingGallery ? (
                          <>
                            <span className="animate-spin inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full mr-1" />
                            Adicionando
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Lista de Imagens na Galeria */}
                     <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                       {((editedData.gallery_images || editedData.galleryImages || []) as string[]).map((url, idx) => (
                         <div key={idx} className="relative group h-20 bg-slate-100 rounded-xl overflow-hidden border border-gray-250">
                            {isVideoUrl(url) ? (
                              <div className="relative w-full h-full">
                                <video 
                                  src={url}
                                  muted
                                  playsInline
                                  preload="metadata"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-10">
                                  <Play className="w-5 h-5 text-white fill-white" />
                                </div>
                              </div>
                            ) : (
                              <img 
                                key={url}
                                src={url} 
                                alt={`Galeria ${idx}`} 
                                className="w-full h-full object-cover" 
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  const parent = (e.target as HTMLImageElement).parentElement;
                                  if (parent && !parent.querySelector('.img-error-fallback')) {
                                    const fallback = document.createElement('div');
                                    fallback.className = 'img-error-fallback flex items-center justify-center w-full h-full bg-red-50 text-red-500';
                                    fallback.innerHTML = '<span class="text-[8px] font-bold text-center">Erro imagem</span>';
                                    parent.appendChild(fallback);
                                  }
                                }}
                              />
                            )}
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
                                <div key={item.id} className="relative p-3 bg-slate-50/50 hover:bg-slate-50 border border-gray-150 rounded-xl flex flex-col sm:flex-row gap-3 items-start">
                                  {/* Pré-visualização da Imagem do Prato */}
                                  <div key={item.image_url || 'no-image'} className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-gray-250 bg-slate-100 flex items-center justify-center self-center sm:self-start shadow-inner">
                                    {item.image_url ? (
                                      <img 
                                        src={item.image_url} 
                                        alt={item.name || 'Foto do prato'} 
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).style.display = 'none';
                                          const parent = (e.target as HTMLImageElement).parentElement;
                                          if (parent && !parent.querySelector('.img-error-fallback')) {
                                            const fallback = document.createElement('div');
                                            fallback.className = 'img-error-fallback flex flex-col items-center justify-center p-1 text-center w-full h-full bg-red-50 text-red-400';
                                            fallback.innerHTML = '<span class="text-[8px] font-bold leading-tight">Link inválido</span>';
                                            parent.appendChild(fallback);
                                          }
                                        }}
                                      />
                                    ) : (
                                      <div className="flex flex-col items-center justify-center text-gray-400">
                                        <Image className="w-5 h-5 mb-0.5 text-gray-300" />
                                        <span className="text-[9px] font-bold">Sem Foto</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Inputs do Item */}
                                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3 items-start w-full">
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
                    onClick={onClose}
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
  );
}

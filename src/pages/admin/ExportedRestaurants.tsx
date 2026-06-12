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
/* Dialog import replaced */
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RestaurantDetailsDialog } from '@/components/admin/RestaurantDetailsDialog';
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
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncingStatus, setSyncingStatus] = useState<string | null>(null);

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

    const galleryImages = (dbItem.restaurant_gallery || []).map((img: any) => img.image_url);

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
      followers_override: dbItem.followers_override || null,
      visit_status: dbItem.visit_status || 'Pendente',
      visit_notes: visitNotes,
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
      googleMapsUrl,
      galleryImages
    };
  };

  const loadRestaurants = async () => {
    try {
      const PAGE_SIZE = 999;
      const allImported: any[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

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
          .eq('visit_status', 'Visitado')
          .or('is_deleted.eq.false,is_deleted.is.null')
          .order('name')
          .range(from, to);

        if (error) throw error;

        if (data && data.length > 0) {
          allImported.push(...data);
          page++;
        } else {
          hasMore = false;
        }

        if (!data || data.length < PAGE_SIZE) {
          hasMore = false;
        }
      }

      const mappedList = allImported.map(mapSupabaseToLocal);
      setRestaurants(mappedList);
      
      // Todos do Supabase são considerados sincronizados
      const syncedSet = new Set(allImported.map(item => item.id));
      setSyncedIds(syncedSet);
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
        image_url: restaurant.logo || null,
        cover_image_url: restaurant.coverImage || restaurant.cover_image_url || null,
        visit_status: 'Visitado',
        visit_notes: visitNotes,
        claim_code: restaurant.claim_code || 'CLAIM-' + uuidId.substring(0, 5).toUpperCase(),
        opening_hours: restaurant.openingHours || restaurant.opening_hours || null,
        social_networks: restaurant.social_networks || [
          { platform: 'instagram', url: restaurant.instagram || '' },
          { platform: 'facebook', url: restaurant.facebook || '' }
        ].filter((s: any) => s.url),
        rating: restaurant.rating || null,
        reviews_count: restaurant.reviewsCount || null,
        followers_override: restaurant.followers_override !== undefined ? restaurant.followers_override : null
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

  // Handlers locais de IA, edicao e galeria removidos (movidos para RestaurantDetailsDialog)

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
    setSelectedRestaurant(restaurant);
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
      {/* Modal de Detalhes / Edicao / IA Compartilhado */}
      <RestaurantDetailsDialog
        restaurant={selectedRestaurant}
        isOpen={selectedRestaurant !== null}
        onClose={() => setSelectedRestaurant(null)}
        onSyncSuccess={loadRestaurants}
      />
    </div>
  );
}

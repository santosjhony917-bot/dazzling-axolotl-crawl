import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
  "content": "I will modify the imports and helper functions in `src/pages/admin/ExportedRestaurants.tsx`. I will also mark these tasks as completed/in-progress in `task.md`.",
  "thinking": "**Analyzing Restaurant Imports**\n\nI'm currently focused on `ExportedRestaurants.tsx`, specifically lines 1 to 35. I'm taking stock of the imports, state declarations, and helper functions within. My goal is to determine what aspects require modifications to suit the new approach. I'm prioritizing the replacement of state declarations and related functions for now.\n\n\n**Updating Component Imports**\n\nI've been meticulously updating the import statements within `ExportedRestaurants.tsx`. I'm replacing the existing imports with a more comprehensive and current set. I've successfully added several new `lucide-react` icons and imported UI components like `Label`, `Textarea`, `Checkbox`, `ScrollArea`, and `Tabs` components to expand the UI's capabilities.\n\n\n**Refactoring State Declarations**\n\nI'm currently replacing the state declarations and related functions within `ExportedRestaurants.tsx`. I've added new state variables related to syncing, editing, and AI data extraction, along with cleaning functions for phone numbers and addresses. The goal is to update the state management to support the new features and logic.\n\n\n**Evaluating Data Cleaning Functions**\n\nI'm now diving int
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
        "TargetFile": "\"c:\\\\Users\\\\meuno\\\\Downloads\\\\dazzling-axolotl-crawl-main\\\\dazzling-axolotl-crawl-main\\\\src\\\\pages\\\\admin\\\\ExportedRestaurants.tsx\""
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
// MISSING LINE 30
const getRestaurantUniqueKey = (name: string, address: string) => {
  const cleanName = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
  const cleanAddress = address.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
  return `${cleanName}_${cleanAddress}`;
};
// MISSING LINE 36
export default function ExportedRestaurants() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<any | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
// MISSING LINE 42
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
    if (!r.menu_categories || r.menu_categories.length === 0) return true;
    return !r.menu_categories.some((c: any) => c.items && c.items.length > 0);
  };
  const hasNoHours = (r: any) => {
    if (!r.opening_hours) return true;
    const days = Object.values(r.opening_hours);
    if (days.length === 0) return true;
    return !days.some((d: any) => d.isOpen === true);
  };
// MISSING LINE 63
  const loadRestaurants = () => {
    try {
      const saved = localStorage.getItem('mock-completed-res
// MISSING LINE 67
// MISSING LINE 68
// MISSING LINE 69
// MISSING LINE 70
// MISSING LINE 71
// MISSING LINE 72
// MISSING LINE 73
// MISSING LINE 74
// MISSING LINE 75
// MISSING LINE 76
// MISSING LINE 77
// MISSING LINE 78
// MISSING LINE 79
// MISSING LINE 80
// MISSING LINE 81
// MISSING LINE 82
// MISSING LINE 83
// MISSING LINE 84
// MISSING LINE 85
// MISSING LINE 86
// MISSING LINE 87
// MISSING LINE 88
// MISSING LINE 89
// MISSING LINE 90
// MISSING LINE 91
// MISSING LINE 92
// MISSING LINE 93
// MISSING LINE 94
// MISSING LINE 95
// MISSING LINE 96
// MISSING LINE 97
// MISSING LINE 98
// MISSING LINE 99
// MISSING LINE 100
// MISSING LINE 101
// MISSING LINE 102
// MISSING LINE 103
// MISSING LINE 104
// MISSING LINE 105
// MISSING LINE 106
// MISSING LINE 107
// MISSING LINE 108
// MISSING LINE 109
// MISSING LINE 110
// MISSING LINE 111
// MISSING LINE 112
// MISSING LINE 113
// MISSING LINE 114
// MISSING LINE 115
// MISSING LINE 116
// MISSING LINE 117
// MISSING LINE 118
// MISSING LINE 119
// MISSING LINE 120
// MISSING LINE 121
// MISSING LINE 122
// MISSING LINE 123
// MISSING LINE 124
// MISSING LINE 125
// MISSING LINE 126
// MISSING LINE 127
// MISSING LINE 128
// MISSING LINE 129
// MISSING LINE 130
// MISSING LINE 131
// MISSING LINE 132
// MISSING LINE 133
// MISSING LINE 134
// MISSING LINE 135
// MISSING LINE 136
// MISSING LINE 137
// MISSING LINE 138
// MISSING LINE 139
// MISSING LINE 140
// MISSING LINE 141
// MISSING LINE 142
// MISSING LINE 143
// MISSING LINE 144
// MISSING LINE 145
// MISSING LINE 146
// MISSING LINE 147
// MISSING LINE 148
// MISSING LINE 149
// MISSING LINE 150
// MISSING LINE 151
// MISSING LINE 152
// MISSING LINE 153
// MISSING LINE 154
// MISSING LINE 155
// MISSING LINE 156
// MISSING LINE 157
        const updatedFallback = fallbackList.filter((r: any) => !r.id.startsWith('scraped-'));
        localStorage.setItem('mock-supabase-fallback-restaurants', JSON.stringify(updatedFallback));
      }
// MISSING LINE 161
      // Sync and notify
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('local-sync-restaurants'));
// MISSING LINE 165
      showSuccess('Todos os restaurantes importados foram removidos da plataforma!');
      setSelectedRestaurant(null);
    } catch (e) {
      console.error(e);
      showError('Erro ao remover os restaurantes.');
    }
  };
// MISSING LINE 173
  const getSocialUrl = (restaurant: any, platform: string) => {
    if (platform === 'instagram' && restaurant.instagram) return restaurant.instagram;
    if (platform === 'facebook' && restaurant.facebook) return restaurant.facebook;
    if (restaurant.social_networks) {
      const net = restaurant.social_networks.find((s: any) => s.platform === platform);
      return net?.url || '';
    }
    return '';
  };
// MISSING LINE 183
  const renderOpeningHours = (hours: any) => {
    if (!hours) return <p className="text-gray-500 text-xs font-semibold">Não informado</p>;
    
    const daysTranslation: Record<string, string> = {
      monday: 'Segunda-feira',
      tuesday: 'Terça-feira',
      wednesday: 'Quarta-feira',
      thursday: 'Quinta-feira',
      friday: 'Sexta-feira',
      saturday: 'Sábado',
      sunday: 'Domingo'
    };
// MISSING LINE 196
    return (
      <div className="grid grid-cols-1 gap-1.5 bg-gray-50 p-4 rounded-2xl border border-gray-100">
        {Object.entries(daysTranslation).map(([dayKey, label]) => {
          const info = hours[dayKey];
// MISSING LINE 201
// MISSING LINE 202
// MISSING LINE 203
// MISSING LINE 204
// MISSING LINE 205
// MISSING LINE 206
// MISSING LINE 207
// MISSING LINE 208
// MISSING LINE 209
// MISSING LINE 210
// MISSING LINE 211
// MISSING LINE 212
// MISSING LINE 213
// MISSING LINE 214
    const matchesSearch = 
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.category.toLowerCase().includes(searchTerm.toLowerCase());
      
    if (!matchesSearch) return false;
    
    if (filterType === 'missing_any') {
      return hasNoPhone(r) || hasNoInstagram(r) || hasNoMenu(r) || hasNoHours(r);
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
    if (filterType === 'completed') {
      return !hasNoPhone(r) && !hasNoInstagram(r) && !hasNoMenu(r) && !hasNoHours(r);
    }
    
    return true;
  });
// MISSING LINE 243
  const instagramUrl = selectedRestaurant ? getSocialUrl(selectedRestaurant, 'instagram') : '';
  const facebookUrl = selectedRestaurant ? getSocialUrl(selectedRestaurant, 'facebook') : '';
// MISSING LINE 246
// MISSING LINE 247
// MISSING LINE 248
// MISSING LINE 249
// MISSING LINE 250
// MISSING LINE 251
// MISSING LINE 252
// MISSING LINE 253
// MISSING LINE 254
// MISSING LINE 255
// MISSING LINE 256
// MISSING LINE 257
// MISSING LINE 258
// MISSING LINE 259
// MISSING LINE 260
// MISSING LINE 261
// MISSING LINE 262
// MISSING LINE 263
// MISSING LINE 264
// MISSING LINE 265
// MISSING LINE 266
// MISSING LINE 267
// MISSING LINE 268
// MISSING LINE 269
        showSuccess(`"${restaurant.name}" sincronizado com sucesso com o Supabase!`);
        const newSynced = new Set(syncedIds);
        newSynced.add(getDeterministicUUID(restaurant.id));
        setSyncedIds(newSynced);
      } else {
        showError(`Falha ao sincronizar "${restaurant.name}". Verifique os logs do console.`);
      }
    } catch (e) {
      console.error(e);
      showError('Erro inesperado na sincronização.');
    }
  };
// MISSING LINE 282
  const handleSyncAll = async () => {
    if (restaurants.length === 0) return;
    
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
            className="rounded-xl font-semibold text-xs h-8"
        console.error(err);
            Todos ({restaurants.length})
          </Button>
            className="rounded-xl font-semibold text-xs h-8"
            variant={filterType === 'completed' ? 'default' : 'outline'} 
            Todos ({restaurants.length})
            onClick={() => setFilterType('completed')}
            className="rounded-xl font-semibold text-xs h-8 border-gray-300 bg-white text-emerald-700 hover:bg-emerald-50"
            variant={filterType === 'completed' ? 'default' : 'outline'} 
            Dados Completos ({restaurants.filter(r => !hasNoPhone(r) && !hasNoInstagram(r) && !hasNoMenu(r) && !hasNoHours(r)).length})
      showSuccess(`${successCount} restaurante(s) sincronizado(s) com sucesso no Supabase!`);
            className="rounded-xl font-semibold text-xs h-8 border-gray-300 bg-white text-emerald-700 hover:bg-emerald-50"
            variant={filterType === 'missing_any' ? 'default' : 'outline'} 
            Dados Completos ({restaurants.filter(r => !hasNoPhone(r) && !hasNoInstagram(r) && !hasNoMenu(r) && !hasNoHours(r)).length})
            onClick={() => setFilterType('missing_any')}
            className="rounded-xl font-semibold text-xs h-8 border-gray-300 bg-white text-amber-700 hover:bg-amber-50"
            variant={filterType === 'missing_any' ? 'default' : 'outline'} 
            Qualquer Pendência ({restaurants.filter(r => hasNoPhone(r) || hasNoInstagram(r) || hasNoMenu(r) || hasNoHours(r)).length})
            onClick={() => setFilterType('missing_any')}
            className="rounded-xl font-semibold text-xs h-8 border-gray-300 bg-white text-amber-700 hover:bg-amber-50"
            variant={filterType === 'missing_instagram' ? 'default' : 'outline'} 
            Qualquer Pendência ({restaurants.filter(r => hasNoPhone(r) || hasNoInstagram(r) || hasNoMenu(r) || hasNoHours(r)).length})
        const list = Object.values(parsed).filter((r: any) => r.id && r.id.startsWith('scraped-'));
            className="rounded-xl font-semibold text-xs h-8 border-gray-300 bg-white text-rose-700 hover:bg-rose-50"
            variant={filterType === 'missing_instagram' ? 'default' : 'outline'} 
        if (list.length > 0) {
          const uuids = list.map((r: any) => getDeterministicUUID(r.id));
            className="rounded-xl font-semibold text-xs h-8 border-gray-300 bg-white text-rose-700 hover:bg-rose-50"
            .from('restaurants')
            Sem Instagram ({restaurants.filter(hasNoInstagram).length})
            .in('id', uuids);
          <Button 
            variant={filterType === 'missing_menu' ? 'default' : 'outline'} 
            const syncedSet = new Set(data.map(item => item.id));
            onClick={() => setFilterType('missing_menu')}
            className="rounded-xl font-semibold text-xs h-8 border-gray-300 bg-white text-orange-700 hover:bg-orange-50"
            console.error('Erro ao buscar sincronizados:', error);
            Sem Cardápio ({restaurants.filter(hasNoMenu).length})
          </Button>
          setSyncedIds(new Set());
        }
      } else {
        setRestaurants([]);
        setSyncedIds(new Set());
      }
    } catch (e) {
      console.error(e);
      showError('Erro ao carregar restaurantes importados.');
    }
  };
// MISSING LINE 351
  useEffect(() => {
    loadRestaurants();
// MISSING LINE 354
    window.addEventListener('storage', loadRestaurants);
    window.addEventListener('local-sync-restaurants', loadRestaurants);
// MISSING LINE 357
    return () => {
      window.removeEventListener('storage', loadRestaurants);
      window.removeEventListener('local-sync-restaurants', loadRestaurants);
    };
  }, []);
// MISSING LINE 363
  const handleRemove = (restaurant: any) => {
    try {
      const key = getRestaurantUniqueKey(restaurant.name, restaurant.address);
      const restaurantId = restaurant.id;
// MISSING LINE 368
      // 1. Remove from mock-completed-restaurants
      const savedCompleted = localStorage.getItem('mock-completed-restaurants');
      if (savedCompleted) {
        const completedMap = JSON.parse(savedCompleted);
        delete completedMap[restaurantId];
        Object.keys(completedMap).forEach((id: string) => {
          const r = completedMap[id];
          if (getRestaurantUniqueKey(r.name, r.address) === key) {
            delete completedMap[id];
          }
        });
        localStorage.setItem('mock-completed-restaurants', JSON.stringify(completedMap));
      }
// MISSING LINE 382
      // 2. Remove from mock-supabase-fallback-restaurants
      const savedFallback = localStorage.getItem('mock-supabase-fallback-restaurants');
      if (savedFallback) {
        const fallbackList = JSON.parse(savedFallback);
        const updatedFallback = fallbackList.filter((r: any) => 
          r.id !== restaurantId && getRestaurantUniqueKey(r.name, r.address) !== key
        );
        localStorage.setItem('mock-supabase-fallback-restaurants', JSON.stringify(updatedFallback));
                        </a>
                      ) : (
                        r.name
                      )}
                    </TableCell>
                    <TableCell>{r.category || 'Outros'}</TableCell>
                    <TableCell className="text-gray-600 font-medium">{r.phone || 'Sem Telefone'}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-gray-500 font-medium">{r.address}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {hasNoPhone(r) && (
                          <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 text-[10px] py-0.5 font-bold">
                          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] py-0.5 font-bold">
                            Sem Insta
                          </Badge>
                        {hasNoInstagram(r) && (
                          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] py-0.5 font-bold">
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[10px] py-0.5 font-bold">
                            Sem Cardápio
                          </Badge>
                        {hasNoMenu(r) && (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[10px] py-0.5 font-bold">
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] py-0.5 font-bold">
      const savedCompleted = localStorage.getItem('mock-completed-restaurants');
                          </Badge>
        const completedMap = JSON.parse(savedCompleted);
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] py-0.5 font-bold">
                          <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px] py-0.5 font-bold">
                            Completo ✨
                          </Badge>
                        {!hasNoPhone(r) && !hasNoInstagram(r) && !hasNoMenu(r) && !hasNoHours(r) && (
                          <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px] py-0.5 font-bold">
                            Completo ✨
                    <TableCell className="text-right">
      // 2. mock-supabase-fallback-restaurants: remove scraped- ones
      const savedFallback = localStorage.getItem('mock-supabase-fallback-restaurants');
                          size="sm" 
        const fallbackList = JSON.parse(savedFallback);
                          className="text-primary hover:text-primary-dark hover:bg-gray-50 font-bold gap-1"
        localStorage.setItem('mock-supabase-fallback-restaurants', JSON.stringify(updatedFallback));
                          size="sm" 
                          variant="ghost" 
                          className="text-primary hover:text-primary-dark hover:bg-gray-50 font-bold gap-1"
                          onClick={() => setSelectedRestaurant(r)}
      window.dispatchEvent(new Event('local-sync-restaurants'));
// MISSING LINE 436
      showSuccess('Todos os restaurantes importados foram removidos da plataforma!');
      setSelectedRestaurant(null);
    } catch (e) {
      console.error(e);
      showError('Erro ao remover os restaurantes.');
    }
  };
// MISSING LINE 444
  const getSocialUrl = (restaurant: any, platform: string) => {
    if (platform === 'instagram' && restaurant.instagram) return restaurant.instagram;
    if (platform === 'facebook' && restaurant.facebook) return restaurant.facebook;
    if (restaurant.social_networks) {
      const net = restaurant.social_networks.find((s: any) => s.platform === platform);
      return net?.url || '';
// MISSING LINE 451
// MISSING LINE 452
// MISSING LINE 453
// MISSING LINE 454
// MISSING LINE 455
// MISSING LINE 456
// MISSING LINE 457
// MISSING LINE 458
// MISSING LINE 459
// MISSING LINE 460
// MISSING LINE 461
// MISSING LINE 462
// MISSING LINE 463
// MISSING LINE 464
// MISSING LINE 465
// MISSING LINE 466
// MISSING LINE 467
// MISSING LINE 468
// MISSING LINE 469
// MISSING LINE 470
// MISSING LINE 471
// MISSING LINE 472
// MISSING LINE 473
// MISSING LINE 474
// MISSING LINE 475
// MISSING LINE 476
// MISSING LINE 477
// MISSING LINE 478
// MISSING LINE 479
// MISSING LINE 480
// MISSING LINE 481
// MISSING LINE 482
// MISSING LINE 483
// MISSING LINE 484
// MISSING LINE 485
// MISSING LINE 486
// MISSING LINE 487
// MISSING LINE 488
// MISSING LINE 489
// MISSING LINE 490
// MISSING LINE 491
// MISSING LINE 492
// MISSING LINE 493
// MISSING LINE 494
// MISSING LINE 495
// MISSING LINE 496
// MISSING LINE 497
// MISSING LINE 498
// MISSING LINE 499
// MISSING LINE 500
// MISSING LINE 501
// MISSING LINE 502
// MISSING LINE 503
// MISSING LINE 504
// MISSING LINE 505
// MISSING LINE 506
// MISSING LINE 507
// MISSING LINE 508
// MISSING LINE 509
// MISSING LINE 510
// MISSING LINE 511
// MISSING LINE 512
// MISSING LINE 513
// MISSING LINE 514
// MISSING LINE 515
// MISSING LINE 516
// MISSING LINE 517
// MISSING LINE 518
// MISSING LINE 519
// MISSING LINE 520
// MISSING LINE 521
// MISSING LINE 522
// MISSING LINE 523
// MISSING LINE 524
// MISSING LINE 525
// MISSING LINE 526
// MISSING LINE 527
// MISSING LINE 528
// MISSING LINE 529
// MISSING LINE 530
// MISSING LINE 531
// MISSING LINE 532
// MISSING LINE 533
// MISSING LINE 534
// MISSING LINE 535
// MISSING LINE 536
// MISSING LINE 537
// MISSING LINE 538
// MISSING LINE 539
// MISSING LINE 540
// MISSING LINE 541
// MISSING LINE 542
// MISSING LINE 543
// MISSING LINE 544
// MISSING LINE 545
// MISSING LINE 546
// MISSING LINE 547
// MISSING LINE 548
// MISSING LINE 549
          id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: cat.name,
          items: (cat.items || []).map((item: any) => ({
            id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: item.name,
            price: typeof item.price === 'number' ? item.price : parsePrice(String(item.price)),
            description: item.description || '',
            image_url: item.image_url || ''
          }))
        }));
        
        setEditedData((prev: any) => ({
          ...prev,
          menu_categories: formattedCategories
        }));
        
        showSuccess(`Cardápio extraído com sucesso! ${formattedCategories.length} categorias identificadas.`);
      } else {
        showError('A IA não conseguiu identificar nenhuma categoria ou prato neste texto.');
                  <h3 className="font-bold text-sm text-primary uppercase tracking-wider">Fase 2: Coleta de Cardápio</h3>
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                      O robô identificou o seguinte link de cardápio digital ou arquivo de cardápio para este estabelecimento:
                    </p>
                    {selectedRestaurant.menuSourceUrl ? (
                      <a 
                        href={selectedRestaurant.menuSourceUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center justify-between p-3.5 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 rounded-2xl transition-all text-xs font-bold text-emerald-800"
      const key = getRestaurantUniqueKey(restaurant.name, restaurant.address);
                        <span className="flex items-center gap-2 truncate max-w-[90%]"><LinkIcon className="w-4 h-4 text-emerald-600 shrink-0" /> {selectedRestaurant.menuSourceUrl}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
      // 1. Remove from mock-completed-restaurants
      const savedCompleted = localStorage.getItem('mock-completed-restaurants');
                      <p className="text-xs text-amber-600 font-bold bg-amber-50 p-3 rounded-xl border border-amber-100 flex items-center gap-2">
                        ⚠️ Nenhum link de cardápio (menuSourceUrl) foi coletado pelo robô para este restaurante.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
// MISSING LINE 599
// MISSING LINE 600
// MISSING LINE 601
// MISSING LINE 602
// MISSING LINE 603
// MISSING LINE 604
// MISSING LINE 605
// MISSING LINE 606
// MISSING LINE 607
// MISSING LINE 608
// MISSING LINE 609
// MISSING LINE 610
// MISSING LINE 611
// MISSING LINE 612
// MISSING LINE 613
// MISSING LINE 614
// MISSING LINE 615
// MISSING LINE 616
// MISSING LINE 617
// MISSING LINE 618
// MISSING LINE 619
// MISSING LINE 620
// MISSING LINE 621
// MISSING LINE 622
// MISSING LINE 623
// MISSING LINE 624
// MISSING LINE 625
// MISSING LINE 626
// MISSING LINE 627
// MISSING LINE 628
// MISSING LINE 629
// MISSING LINE 630
        Object.keys(completedMap).forEach((id: string) => {
          if (id.startsWith('scraped-')) {
            delete completedMap[id];
          }
        });
        localStorage.setItem('mock-completed-restaurants', JSON.stringify(completedMap));
      }
                                      <span className="text-xs font-bold text-emerald-600 shrink-0">
                                        {typeof item.price === 'number' && item.price > 0 
                                          ? `R$ ${item.price.toFixed(2).replace('.', ',')}` 
                                          : 'Sob consulta'}
        const fallbackList = JSON.parse(savedFallback);
        const updatedFallback = fallbackList.filter((r: any) => !r.id.startsWith('scraped-'));
        localStorage.setItem('mock-supabase-fallback-restaurants', JSON.stringify(updatedFallback));
                                      <p className="text-[11px] text-gray-500 font-medium mt-1 leading-relaxed line-clamp-2">
                                        {item.description}
                                      </p>
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('local-sync-restaurants'));
                                </div>
      showSuccess('Todos os restaurantes importados foram removidos da plataforma!');
      setSelectedRestaurant(null);
                              <p className="text-xs text-gray-400 text-center py-2">Nenhum prato nesta categoria.</p>
                            )}
      showError('Erro ao remover os restaurantes.');
                        </div>
                      ))}
                    </div>
  const getSocialUrl = (restaurant: any, platform: string) => {
                    <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      <p className="text-xs text-gray-500 font-bold">Nenhum prato ou categoria cadastrada ainda.</p>
                      <p className="text-[10px] text-gray-400 mt-1">Execute a coleta de cardápios (Fase 3) ou faça a importação do arquivo scraped_menus.json.</p>
      const net = restaurant.social_networks.find((s: any) => s.platform === platform);
      return net?.url || '';
                </div>
              </div>
            </>
          )}
  const renderOpeningHours = (hours: any) => {
    if (!hours) return <p className="text-gray-500 text-xs font-semibold">Não informado</p>;
    </div>
    const daysTranslation: Record<string, string> = {
      monday: 'Segunda-feira',
      tuesday: 'Terça-feira',
      wednesday: 'Quarta-feira',
      thursday: 'Quinta-feira',
      friday: 'Sexta-feira',
      saturday: 'Sábado',
      sunday: 'Domingo'
    };
// MISSING LINE 681
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
// MISSING LINE 702
  const filteredRestaurants = restaurants.filter(r => {
    const matchesSearch = 
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.category.toLowerCase().includes(searchTerm.toLowerCase());
      
    if (!matchesSearch) return false;
    
    if (filterType === 'missing_any') {
      return hasNoPhone(r) || hasNoInstagram(r) || hasNoMenu(r) || hasNoStructuredMenu(r) || hasNoHours(r);
    }
    if (filterType === 'missing_phone') {
      return hasNoPhone(r);
    }
    if (filterType === 'missing_instagram') {
      return hasNoInstagram(r);
    }
    if (filterType === 'missing_menu') {
      return hasNoMenu(r) || hasNoStructuredMenu(r);
    }
    if (filterType === 'missing_hours') {
      return hasNoHours(r);
    }
    if (filterType === 'completed') {
      return !hasNoPhone(r) && !hasNoInstagram(r) && !hasNoMenu(r) && !hasNoStructuredMenu(r) && !hasNoHours(r);
    }
    
    return true;
  });
// MISSING LINE 732
  const instagramUrl = selectedRestaurant ? getSocialUrl(selectedRestaurant, 'instagram') : '';
  const facebookUrl = selectedRestaurant ? getSocialUrl(selectedRestaurant, 'facebook') : '';
            </Table>
          )}
    <div className="space-y-6 p-4">
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      {/* Modal Dialog de Detalhes do Restaurante */}
            <CardTitle className="text-2xl text-primary font-bold">Restaurantes Importados do Coletor</CardTitle>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
              Visualize, filtre e gerencie todos os restaurantes importados diretamente para o catálogo ativo da plataforma.
            </CardDescription>
              <DialogHeader className="border-b border-gray-100 pb-4 mb-4">
                <div className="flex items-start gap-4">
            <Button variant="outline" size="sm" onClick={loadRestaurants} className="gap-1 border-gray-300 font-semibold bg-white w-full sm:w-auto">
              <RefreshCw className="w-3.5 h-3.5" /> Atualizar
                    alt="Logo" 
                    className="w-16 h-16 rounded-2xl border object-cover bg-gray-50"
              <Button 
                variant="destructive" 
                    <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
                      {selectedRestaurant.name}
                className="gap-1 font-bold w-full sm:w-auto bg-red-600 hover:bg-red-700"
                    <DialogDescription className="text-sm text-gray-500 font-semibold mt-1">
                      Categoria: {selectedRestaurant.category || 'Outros'}
                    </DialogDescription>
                  </div>
                </div>
// MISSING LINE 761
// MISSING LINE 762
// MISSING LINE 763
// MISSING LINE 764
// MISSING LINE 765
// MISSING LINE 766
// MISSING LINE 767
// MISSING LINE 768
// MISSING LINE 769
// MISSING LINE 770
// MISSING LINE 771
// MISSING LINE 772
// MISSING LINE 773
// MISSING LINE 774
// MISSING LINE 775
// MISSING LINE 776
// MISSING LINE 777
// MISSING LINE 778
// MISSING LINE 779
// MISSING LINE 780
// MISSING LINE 781
// MISSING LINE 782
// MISSING LINE 783
// MISSING LINE 784
// MISSING LINE 785
// MISSING LINE 786
// MISSING LINE 787
// MISSING LINE 788
// MISSING LINE 789
// MISSING LINE 790
// MISSING LINE 791
// MISSING LINE 792
// MISSING LINE 793
// MISSING LINE 794
// MISSING LINE 795
// MISSING LINE 796
// MISSING LINE 797
// MISSING LINE 798
// MISSING LINE 799
// MISSING LINE 800
// MISSING LINE 801
// MISSING LINE 802
// MISSING LINE 803
// MISSING LINE 804
// MISSING LINE 805
// MISSING LINE 806
// MISSING LINE 807
// MISSING LINE 808
// MISSING LINE 809
// MISSING LINE 810
// MISSING LINE 811
// MISSING LINE 812
// MISSING LINE 813
// MISSING LINE 814
// MISSING LINE 815
// MISSING LINE 816
          <Button 
            variant={filterType === 'missing_menu' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setFilterType('missing_menu')}
            className="rounded-xl font-semibold text-xs h-8 border-gray-300 bg-white text-orange-700 hover:bg-orange-50"
          >
            Sem Cardápio ({restaurants.filter(r => hasNoMenu(r) || hasNoStructuredMenu(r)).length})
          </Button>
          <Button 
            variant={filterType === 'missing_phone' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setFilterType('missing_phone')}
            className="rounded-xl font-semibold text-xs h-8 border-gray-300 bg-white text-sky-700 hover:bg-sky-50"
          >
            Sem Telefone ({restaurants.filter(hasNoPhone).length})
          </Button>
          <Button 
            variant={filterType === 'missing_hours' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setFilterType('missing_hours')}
            className="rounded-xl font-semibold text-xs h-8 border-gray-300 bg-white text-purple-700 hover:bg-purple-50"
          >
            Sem Horários ({restaurants.filter(hasNoHours).length})
          </Button>
        </div>
      </div>
// MISSING LINE 843
      {/* Lista de Importados */}
      <Card className="shadow-none border border-gray-100 rounded-2xl bg-white overflow-hidden">
        <CardContent className="p-0">
          {filteredRestaurants.length === 0 ? (
            <div className="text-center py-16 text-gray-500 font-medium">
              <Search className="w-12 h-12 text-gray-200 mx-auto mb-2" />
              Nenhum restaurante importado encontrado com o filtro atual.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead className="font-bold">Nome</TableHead>
                  <TableHead className="font-bold">Categoria</TableHead>
                  <TableHead className="font-bold">Telefone</TableHead>
                  <TableHead className="font-bold">Endereço</TableHead>
                  <TableHead className="font-bold text-center">Dados Faltantes</TableHead>
                  <TableHead className="font-bold text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRestaurants.map((r) => (
                  <TableRow key={r.id} className="hover:bg-gray-50/50">
                    <TableCell className="font-semibold text-primary">
                      {r.googleMapsUrl ? (
                        <a 
                          href={r.googleMapsUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="hover:underline hover:text-highlight flex items-center gap-1"
                        >
                          {r.name} <span className="text-[10px] text-gray-400 font-normal">↗</span>
          
// MISSING LINE 877
// MISSING LINE 878
// MISSING LINE 879
// MISSING LINE 880
// MISSING LINE 881
// MISSING LINE 882
// MISSING LINE 883
// MISSING LINE 884
// MISSING LINE 885
// MISSING LINE 886
// MISSING LINE 887
// MISSING LINE 888
// MISSING LINE 889
// MISSING LINE 890
// MISSING LINE 891
// MISSING LINE 892
// MISSING LINE 893
// MISSING LINE 894
// MISSING LINE 895
// MISSING LINE 896
// MISSING LINE 897
// MISSING LINE 898
// MISSING LINE 899
                        )}
                        {!hasNoMenu(r) && hasNoStructuredMenu(r) && (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] py-0.5 font-bold">
                            Não Estruturado
                          </Badge>
                        )}
                        {hasNoHours(r) && (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] py-0.5 font-bold">
                            Sem Horas
                          </Badge>
                        )}
                        {!hasNoPhone(r) && !hasNoInstagram(r) && !hasNoMenu(r) && !hasNoStructuredMenu(r) && !hasNoHours(r) && (
                          <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px] py-0.5 font-bold">
                            Completo ✨
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-primary hover:text-primary-dark hover:bg-gray-50 font-bold gap-1"
                          onClick={() => setSelectedRestaurant(r)}
                        >
                          <Eye className="w-4 h-4" /> Detalhes
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 font-bold gap-1"
                          onClick={() => handleRemove(r)}
                        >
                          <Trash2 className="w-4 h-4" /> Remover
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
// MISSING LINE 945
      {/* Modal Dialog de Detalhes do Restaurante */}
      <Dialog open={selectedRestaurant !== null} onOpenChange={(open) => !open && setSelectedRestaurant(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
          {selectedRestaurant && (
            <>
// MISSING LINE 951
// MISSING LINE 952
// MISSING LINE 953
// MISSING LINE 954
// MISSING LINE 955
// MISSING LINE 956
// MISSING LINE 957
// MISSING LINE 958
// MISSING LINE 959
// MISSING LINE 960
// MISSING LINE 961
// MISSING LINE 962
// MISSING LINE 963
// MISSING LINE 964
// MISSING LINE 965
// MISSING LINE 966
// MISSING LINE 967
// MISSING LINE 968
// MISSING LINE 969
// MISSING LINE 970
// MISSING LINE 971
// MISSING LINE 972
// MISSING LINE 973
// MISSING LINE 974
// MISSING LINE 975
// MISSING LINE 976
// MISSING LINE 977
// MISSING LINE 978
// MISSING LINE 979
// MISSING LINE 980
// MISSING LINE 981
// MISSING LINE 982
// MISSING LINE 983
// MISSING LINE 984
// MISSING LINE 985
// MISSING LINE 986
// MISSING LINE 987
// MISSING LINE 988
// MISSING LINE 989
// MISSING LINE 990
// MISSING LINE 991
// MISSING LINE 992
// MISSING LINE 993
// MISSING LINE 994
// MISSING LINE 995
// MISSING LINE 996
// MISSING LINE 997
// MISSING LINE 998
// MISSING LINE 999
// MISSING LINE 1000
// MISSING LINE 1001
// MISSING LINE 1002
// MISSING LINE 1003
// MISSING LINE 1004
// MISSING LINE 1005
// MISSING LINE 1006
// MISSING LINE 1007
// MISSING LINE 1008
// MISSING LINE 1009
// MISSING LINE 1010
// MISSING LINE 1011
// MISSING LINE 1012
// MISSING LINE 1013
// MISSING LINE 1014
// MISSING LINE 1015
// MISSING LINE 1016
// MISSING LINE 1017
// MISSING LINE 1018
// MISSING LINE 1019
// MISSING LINE 1020
// MISSING LINE 1021
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {facebookUrl && (
                      <a 
                        href={facebookUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center justify-between p-3 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 rounded-2xl transition-all text-xs font-bold text-blue-700"
                      >
                        <span className="flex items-center gap-2"><Facebook className="w-4 h-4 text-blue-500" /> Facebook</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {selectedRestaurant.website && (
                      <a 
                        href={selectedRestaurant.website} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 border border-gray-200 rounded-2xl transition-all text-xs font-bold text-gray-700"
                      >
                        <span className="flex items-center gap-2"><Globe className="w-4 h-4 text-gray-500" /> Website Oficial</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {selectedRestaurant.googleMapsUrl && (
                      <a 
                        href={selectedRestaurant.googleMapsUrl} 
                        target="_blank" 

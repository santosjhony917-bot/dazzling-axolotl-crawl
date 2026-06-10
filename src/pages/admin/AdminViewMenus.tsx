import React, { useState, useEffect, useCallback } from 'react';
import { Search, Upload, X, ChevronDown, ChevronRight, DollarSign, Image, ExternalLink, Trash2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AdminAreaHeader from '@/components/admin/AdminAreaHeader';

const STORAGE_KEY = 'admin-scraped-menus';

interface MenuItem {
  name: string;
  price: string;
  description: string;
  image_url: string;
}

interface MenuCategory {
  name: string;
  items: MenuItem[];
}

interface MenuData {
  restaurantId: string;
  restaurantName: string;
  restaurantCategory: string;
  menuSourceUrl: string;
  categories: MenuCategory[];
}

function parsePriceValue(priceStr: string): number {
  if (!priceStr) return Infinity;
  const cleaned = priceStr.replace(/[R$\s.]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? Infinity : num;
}

function AdminViewMenus() {
  const [menus, setMenus] = useState<MenuData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRestaurants, setExpandedRestaurants] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setMenus(parsed);
      }
    } catch {}
  }, []);

  const saveToStorage = useCallback((data: MenuData[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setMenus(data);
  }, []);

  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          saveToStorage(parsed);
        } else {
          alert('Formato inválido: o JSON deve ser um array de cardápios.');
        }
      } catch {
        alert('Erro ao ler o arquivo JSON.');
      }
    };
    reader.readAsText(file);
  }, [saveToStorage]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.json')) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    e.target.value = '';
  }, [handleFileUpload]);

  const clearAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setMenus([]);
  }, []);

  const syncWithCatalog = useCallback(() => {
    try {
      const savedCompleted = localStorage.getItem('mock-completed-restaurants');
      if (!savedCompleted) {
        alert('Nenhum restaurante cadastrado no catálogo ativo ainda para associar os cardápios.');
        return;
      }
      
      const completedMap = JSON.parse(savedCompleted);
      let updatedCount = 0;
      
      menus.forEach(menu => {
        const restaurantId = menu.restaurantId;
        let matchedKey = null;
        
        if (completedMap[restaurantId]) {
          matchedKey = restaurantId;
        } else {
          const cleanMenuName = menu.restaurantName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s/g, '');
          const matchKey = Object.keys(completedMap).find(key => {
            const r = completedMap[key];
            const cleanRestName = r.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s/g, '');
            return cleanRestName === cleanMenuName;
          });
          if (matchKey) matchedKey = matchKey;
        }
        
        if (matchedKey) {
          completedMap[matchedKey].menu_categories = menu.categories.map(cat => ({
            name: cat.name,
            items: cat.items.map((item, idx) => ({
              id: `item-${idx}-${Date.now()}`,
              name: item.name,
              price: parsePriceValue(item.price) === Infinity ? 0 : parsePriceValue(item.price),
              description: item.description || '',
              image_url: item.image_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300'
            }))
          }));
          updatedCount++;
        }
      });
      
      if (updatedCount > 0) {
        localStorage.setItem('mock-completed-restaurants', JSON.stringify(completedMap));
        
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('local-sync-restaurants'));
        
        alert(`Sincronização concluída! ${updatedCount} cardápios foram mesclados aos restaurantes ativos do catálogo.`);
      } else {
        alert('Nenhum restaurante ativo correspondente foi encontrado para associar estes cardápios. Certifique-se de que os restaurantes foram importados primeiro.');
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao realizar a sincronização.');
    }
  }, [menus]);

  const removeMenu = useCallback((restaurantId: string) => {
    const updated = menus.filter(m => m.restaurantId !== restaurantId);
    saveToStorage(updated);
  }, [menus, saveToStorage]);

  const toggleRestaurant = (id: string) => {
    setExpandedRestaurants(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleCategory = (key: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const filteredMenus = menus.filter(m =>
    !searchQuery ||
    m.restaurantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.restaurantCategory?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalItems = menus.reduce(
    (sum, m) => sum + m.categories.reduce((s, c) => s + c.items.length, 0),
    0
  );

  return (
    <div className="space-y-6">
      <AdminAreaHeader
        title="Cardápios Coletados"
        description={`Visualize os cardápios extraídos dos sites dos restaurantes`}
      />

      {/* Upload Area */}
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging ? 'border-primary bg-primary/5' : 'border-gray-300'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <CardContent className="py-8 text-center">
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium mb-2">
            {menus.length > 0
              ? `${menus.length} restaurantes importados (${totalItems} itens)`
              : 'Importe o scraped_menus.json'}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Arraste o arquivo aqui ou clique para selecionar
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => document.getElementById('menu-file-input')?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Selecionar Arquivo
            </Button>
            {menus.length > 0 && (
              <>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={syncWithCatalog}>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Sincronizar no Catálogo
                </Button>
                <Button variant="destructive" onClick={clearAll}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpar Tudo
                </Button>
              </>
            )}
          </div>
          <input
            id="menu-file-input"
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileSelect}
          />
        </CardContent>
      </Card>

      {/* Search Bar */}
      {menus.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar restaurante ou categoria..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Menu List */}
      {filteredMenus.length === 0 && menus.length > 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            Nenhum restaurante encontrado para "{searchQuery}"
          </CardContent>
        </Card>
      )}

      {filteredMenus.length === 0 && menus.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">Nenhum cardápio importado</p>
            <p className="text-sm">Execute o menu_scraper.cjs e importe o scraped_menus.json</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {filteredMenus.map((menu) => {
          const isExpanded = expandedRestaurants.has(menu.restaurantId);
          const itemCount = menu.categories.reduce((s, c) => s + c.items.length, 0);

          return (
            <Card key={menu.restaurantId}>
              <CardHeader
                className="cursor-pointer hover:bg-gray-50 transition-colors flex flex-row items-center justify-between"
                onClick={() => toggleRestaurant(menu.restaurantId)}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                  <div>
                    <CardTitle className="text-lg">{menu.restaurantName}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {menu.restaurantCategory && (
                        <Badge variant="secondary">{menu.restaurantCategory}</Badge>
                      )}
                      <Badge variant="outline">
                        {menu.categories.length} categorias
                      </Badge>
                      <Badge variant="outline">
                        {itemCount} itens
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {menu.menuSourceUrl && (
                    <a
                      href={menu.menuSourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button variant="ghost" size="icon" className="text-blue-500">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </a>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-400 hover:text-red-600"
                    onClick={(e) => { e.stopPropagation(); removeMenu(menu.restaurantId); }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent>
                  {menu.categories.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Nenhuma categoria encontrada</p>
                  ) : (
                    <div className="space-y-3">
                      {menu.categories.map((cat) => {
                        const catKey = `${menu.restaurantId}-${cat.name}`;
                        const isCatExpanded = expandedCategories.has(catKey);

                        return (
                          <Card key={cat.name} className="border border-gray-200">
                            <CardHeader
                              className="py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={() => toggleCategory(catKey)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {isCatExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                  )}
                                  <span className="font-medium">{cat.name}</span>
                                  <Badge variant="outline" className="ml-2">
                                    {cat.items.length} itens
                                  </Badge>
                                </div>
                              </div>
                            </CardHeader>

                            {isCatExpanded && (
                              <CardContent className="pt-0 pb-3">
                                {cat.items.length === 0 ? (
                                  <p className="text-gray-400 text-sm pl-6">Nenhum item</p>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-6">
                                    {cat.items.map((item, idx) => (
                                      <div
                                        key={`${item.name}-${idx}`}
                                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all"
                                      >
                                        {item.image_url && (
                                          <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                                            <img
                                              src={item.image_url}
                                              alt={item.name}
                                              className="w-full h-full object-cover"
                                              onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                              }}
                                            />
                                          </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-start justify-between gap-2">
                                            <p className="font-medium text-sm truncate">{item.name}</p>
                                            {item.price && (
                                              <span className="text-sm font-semibold text-green-600 whitespace-nowrap flex items-center gap-0.5">
                                                <DollarSign className="w-3 h-3" />
                                                {item.price}
                                              </span>
                                            )}
                                          </div>
                                          {item.description && (
                                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                              {item.description}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </CardContent>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default AdminViewMenus;

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, Plus, AlertTriangle, Loader2, UtensilsCrossed, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';
import { saveUploadRecord } from '@/utils/uploadHistory'; // NOVO IMPORT

// Define a estrutura de dados para a Fase 3
interface MenuItemDataPhase3 {
  id: string;
  restaurantId: string;
  categoryName: string;
  itemName: string;
  description: string;
  price: string; // Mantido como string para entrada de planilha
  imageUrl: string;
  status: 'pending' | 'error' | 'success';
}

// Colunas da planilha
const columns = [
  { key: 'restaurantId', label: 'ID do Restaurante (UUID)' },
  { key: 'categoryName', label: 'Nome da Categoria' },
  { key: 'itemName', label: 'Nome do Item' },
  { key: 'description', label: 'Descrição' },
  { key: 'price', label: 'Preço (Ex: 19.90)' },
  { key: 'imageUrl', label: 'URL da Imagem (Opcional)' },
];

const initialRow: MenuItemDataPhase3 = {
  id: 'temp-0',
  restaurantId: '',
  categoryName: '',
  itemName: '',
  description: '',
  price: '',
  imageUrl: '',
  status: 'pending',
};

// Chave de persistência
const STORAGE_KEY = 'admin_upload_phase3_data';

// Função para carregar dados do localStorage
const loadInitialRows = (): MenuItemDataPhase3[] => {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      if (Array.isArray(parsedData) && parsedData.length > 0) {
        return parsedData.map(row => ({ ...row, id: row.id || `temp-${Math.random()}`, status: 'pending' }));
      }
    }
  } catch (e) {
    console.error("Failed to load data from localStorage:", e);
  }
  return [{ ...initialRow, id: 'temp-0' }];
};

const UploadPhase3: React.FC = () => {
  const [rows, setRows] = useState<MenuItemDataPhase3[]>(loadInitialRows);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 1. Fetch existing restaurants (for reference/validation)
  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name')
        .limit(1000);

      if (error) throw error;
      setRestaurants(data as Restaurant[]);
    } catch (e) {
      showError("Falha ao carregar lista de restaurantes.");
      console.error("Fetch Restaurants Error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);
  
  // Efeito para salvar o estado no localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    } catch (e) {
      console.error("Failed to save data to localStorage:", e);
    }
  }, [rows]);

  const handleUpdateCell = useCallback((id: string, key: keyof MenuItemDataPhase3, value: string) => {
    setRows(prevRows => 
      prevRows.map(row => (row.id === id ? { ...row, [key]: value, status: 'pending' } : row))
    );
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[id];
      return newErrors;
    });
  }, []);

  const handleAddRow = () => {
    setRows(prevRows => [...prevRows, { ...initialRow, id: `temp-${Math.random()}` }]);
  };

  const handleColumnPaste = useCallback((
    e: React.ClipboardEvent<HTMLInputElement>, 
    rowIndex: number, 
    key: keyof MenuItemDataPhase3
  ) => {
    const pasteData = e.clipboardData.getData('text');
    const values = pasteData.split('\n').map(v => v.trim());
    
    if (values.length === 0) return;
    
    e.preventDefault();
    
    setRows(prevRows => {
      const newRows = [...prevRows];
      
      for (let i = 0; i < values.length; i++) {
        const targetIndex = rowIndex + i;
        const value = values[i];
        
        if (targetIndex < newRows.length) {
          newRows[targetIndex] = { ...newRows[targetIndex], [key]: value, status: 'pending' };
        } else {
          const newRow: MenuItemDataPhase3 = { ...initialRow, id: `temp-${Math.random()}`, [key]: value, status: 'pending' };
          newRows.push(newRow);
        }
      }
      
      return newRows;
    });
    
    showSuccess(`Colados ${values.length} valores na coluna ${columns.find(c => c.key === key)?.label}.`);
  }, []);

  const validateAndCleanData = useCallback((): { validRows: MenuItemDataPhase3[], newErrors: Record<string, string> } => {
    const newErrors: Record<string, string> = {};
    const validRows: MenuItemDataPhase3[] = [];
    const existingRestaurantIds = new Set(restaurants.map(r => r.id));

    rows.forEach((row, index) => {
      const rowErrors: string[] = [];
      
      if (!row.restaurantId.trim()) {
        rowErrors.push('ID do Restaurante obrigatório');
      } else if (!existingRestaurantIds.has(row.restaurantId.trim())) {
        rowErrors.push('ID do Restaurante não encontrado');
      }
      if (!row.categoryName.trim()) {
        rowErrors.push('Nome da Categoria obrigatório');
      }
      if (!row.itemName.trim()) {
        rowErrors.push('Nome do Item obrigatório');
      }
      
      const price = parseFloat(row.price.replace(',', '.'));
      if (isNaN(price) || price <= 0) {
        rowErrors.push('Preço inválido ou zero');
      }
      
      if (row.imageUrl.trim() && !row.imageUrl.startsWith('http')) {
        rowErrors.push('URL da Imagem inválida');
      }

      if (rowErrors.length > 0) {
        newErrors[row.id] = `Linha ${index + 1}: ${rowErrors.join(', ')}`;
      } else {
        validRows.push(row);
      }
    });
    
    return { validRows, newErrors };
  }, [rows, restaurants]);

  const handleUpload = useCallback(async () => {
    setIsUploading(true);
    const { validRows, newErrors } = validateAndCleanData();
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0 || validRows.length === 0) {
      showError("Corrija os erros e garanta que haja dados válidos para upload.");
      setIsUploading(false);
      return;
    }
    
    let categoriesCreated = 0;
    let itemsInserted = 0;
    const categoryMap = new Map<string, string>(); // Key: restaurantId_categoryName, Value: categoryId

    try {
      // 1. Processar Categorias (Upsert)
      const categoriesToProcess = validRows.map(row => ({
        restaurant_id: row.restaurantId,
        name: row.categoryName.trim(),
      }));
      
      // Agrupa categorias únicas por restaurante
      const uniqueCategories = Array.from(new Set(categoriesToProcess.map(c => `${c.restaurant_id}_${c.name}`)))
        .map(key => {
          const [restaurant_id, name] = key.split('_');
          return { restaurant_id, name };
        });

      // Busca categorias existentes para evitar duplicação e obter IDs
      const { data: existingCategories, error: fetchCatError } = await supabase
        .from('menu_categories')
        .select('id, restaurant_id, name');
        
      if (fetchCatError) throw fetchCatError;
      
      // Mapeia categorias existentes
      existingCategories.forEach(cat => {
        categoryMap.set(`${cat.restaurant_id}_${cat.name}`, cat.id);
      });

      // Insere novas categorias
      const newCategoriesToInsert = uniqueCategories.filter(cat => 
        !categoryMap.has(`${cat.restaurant_id}_${cat.name}`)
      );
      
      if (newCategoriesToInsert.length > 0) {
        const { data: insertedCats, error: insertCatError } = await supabase
          .from('menu_categories')
          .insert(newCategoriesToInsert)
          .select('id, restaurant_id, name');
          
        if (insertCatError) throw insertCatError;
        
        insertedCats.forEach(cat => {
          categoryMap.set(`${cat.restaurant_id}_${cat.name}`, cat.id);
        });
        categoriesCreated = insertedCats.length;
      }
      
      // 2. Processar Itens do Cardápio
      const itemsToInsert = validRows.map(row => {
        const categoryKey = `${row.restaurantId}_${row.categoryName.trim()}`;
        const categoryId = categoryMap.get(categoryKey);
        
        if (!categoryId) {
          // Isso não deve acontecer se a lógica de categoria estiver correta
          throw new Error(`Categoria ID não encontrada para ${row.categoryName} no restaurante ${row.restaurantId}`);
        }
        
        return {
          category_id: categoryId,
          name: row.itemName.trim(),
          description: row.description.trim() || null,
          price: parseFloat(row.price.replace(',', '.')),
          image_url: row.imageUrl.trim() || null,
          is_active: true,
          order_index: 0, // Padrão
        };
      });
      
      // Insere todos os itens
      const { error: insertItemError } = await supabase
        .from('menu_items')
        .insert(itemsToInsert);

      if (insertItemError) throw insertItemError;
      
      itemsInserted = itemsToInsert.length;
      
      showSuccess(`Upload concluído! ${categoriesCreated} categorias criadas e ${itemsInserted} itens inseridos.`);
      
      // SALVAR REGISTRO DE UPLOAD
      saveUploadRecord({
        phase: 3,
        successCount: itemsInserted,
        details: `Inserção de ${itemsInserted} itens em ${categoriesCreated} categorias.`,
      });
      
      // Limpa a planilha e o localStorage após o upload bem-sucedido
      setRows([{ ...initialRow, id: 'temp-0' }]); 
      localStorage.removeItem(STORAGE_KEY);
      
    } catch (e) {
      console.error("Supabase Bulk Insert Error (Phase 3):", e);
      showError(`Falha ao fazer upload: ${(e as Error).message}`);
    } finally {
      setIsUploading(false);
    }
  }, [rows, validateAndCleanData]);

  const validRowCount = useMemo(() => {
    const { validRows } = validateAndCleanData();
    return validRows.length;
  }, [validateAndCleanData]);

  if (loading) {
    return (
      <Card className="p-6 shadow-lg border-none rounded-xl bg-white dark:bg-gray-800 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-primary">Carregando dados de referência...</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 shadow-lg border-none rounded-xl bg-white dark:bg-gray-800">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-2xl font-bold text-primary">Fase 3: Cardápio em Massa</CardTitle>
        <CardDescription className="text-gray-600">
          Insira os dados do cardápio. As categorias serão criadas automaticamente se não existirem.
        </CardDescription>
      </CardHeader>
      
      <div className="space-y-6">
        {/* Dica de Referência */}
        <Alert className="border-dashed text-sm">
          <UtensilsCrossed className="h-4 w-4" />
          <AlertTitle>Restaurantes Disponíveis</AlertTitle>
          <AlertDescription className="max-h-24 overflow-y-auto">
            IDs: {restaurants.map(r => `${r.name} (${r.id.substring(0, 8)}...)`).join(' | ')}
          </AlertDescription>
        </Alert>

        {/* Tabela de Entrada de Dados */}
        <div className="overflow-x-auto">
          <div className="min-w-[1200px]">
            {/* Cabeçalho da Tabela */}
            <div className="grid grid-cols-6 bg-gray-100 dark:bg-gray-700 p-2 rounded-t-lg font-semibold text-sm text-primary dark:text-white">
              {columns.map(col => (
                <div key={col.key} className="px-2 truncate">{col.label}</div>
              ))}
            </div>
            
            {/* Linhas de Dados */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-b-lg">
              {rows.map((row, index) => (
                <div 
                  key={row.id} 
                  className={cn(
                    "grid grid-cols-6 border-b border-gray-100 dark:border-gray-700 last:border-b-0",
                    errors[row.id] && "bg-red-50 dark:bg-red-900/20"
                  )}
                >
                  {columns.map(col => (
                    <Input
                      key={col.key}
                      value={row[col.key as keyof MenuItemDataPhase3] || ''}
                      onChange={(e) => handleUpdateCell(row.id, col.key as keyof MenuItemDataPhase3, e.target.value)}
                      onPaste={(e) => handleColumnPaste(e, index, col.key as keyof MenuItemDataPhase3)}
                      className="h-10 border-none rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-sm"
                      placeholder={col.label}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button 
            onClick={handleAddRow} 
            variant="outline" 
            disabled={isUploading}
            className="border-primary text-primary hover:bg-primary/5"
          >
            <Plus className="h-4 w-4 mr-2" /> Adicionar Linha
          </Button>
          <Button 
            onClick={() => setErrors(validateAndCleanData().newErrors)} 
            disabled={isUploading}
            className="bg-gray-200 text-primary hover:bg-gray-300"
          >
            Analisar Dados
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={isUploading || Object.keys(errors).length > 0 || validRowCount === 0}
            className="bg-highlight hover:bg-highlight/90"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" /> Fazer Upload ({validRowCount})
              </>
            )}
          </Button>
        </div>

        {/* Área de Erros */}
        {Object.keys(errors).length > 0 && (
          <Alert variant="destructive" className="bg-red-50 border-red-300 text-red-700">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erros encontrados:</AlertTitle>
            <AlertDescription className="space-y-1">
              {Object.keys(errors).map(key => (
                <p key={key} className="text-sm">{errors[key]}</p>
              ))}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </Card>
  );
};

export default UploadPhase3;
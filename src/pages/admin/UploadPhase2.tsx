import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, Plus, AlertTriangle, Loader2, MapPin, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { geocodeAddress, formatCEP } from '@/services/geocoding';
import axios from 'axios';
import { saveUploadRecord } from '@/utils/uploadHistory';
import { Restaurant } from '@/types/supabase'; // Importando o tipo Restaurant

// Define a estrutura de dados para a Fase 2
interface RestaurantDataPhase2 {
  id: string | null; // Pode ser null se for uma nova linha
  name: string; // Nome do Restaurante (agora editável/colável)
  externalUrl: string; // Chave de ligação (URL Externa)
  cep: string;
  address: string; // Rua/Avenida
  number: string;
  complement: string;
  reference_point: string;
  neighborhood: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  isGeocoded: boolean;
}

// Colunas da planilha (Ajustadas para permitir colagem em todas as colunas de dados)
const columns = [
  { key: 'externalUrl', label: 'URL Externa (Chave)', width: '150px' }, // Chave de busca
  { key: 'name', label: 'Nome do Restaurante', width: '150px' },
  { key: 'cep', label: 'CEP', width: '100px' },
  { key: 'address', label: 'Rua/Avenida', width: '180px' },
  { key: 'number', label: 'Número', width: '80px' },
  { key: 'complement', label: 'Complemento', width: '120px' },
  { key: 'reference_point', label: 'Ponto de Referência', width: '150px' },
  { key: 'neighborhood', label: 'Bairro', width: '150px' },
  { key: 'city', label: 'Cidade', width: '150px' },
  { key: 'state', label: 'UF', width: '80px' },
];

// Chave de persistência
const STORAGE_KEY = 'admin_upload_phase2_data';

// Função utilitária para gerar um ID temporário
let rowIdCounter = 0;
const generateRowId = () => `temp-${Math.random()}-${rowIdCounter++}`;

const initialRow: RestaurantDataPhase2 = {
  id: null,
  name: '',
  externalUrl: '',
  cep: '',
  address: '',
  number: '',
  complement: '',
  reference_point: '',
  neighborhood: '',
  city: '',
  state: '',
  latitude: null,
  longitude: null,
  isGeocoded: false,
};

// Função para carregar dados do localStorage
const loadPersistedRows = (): RestaurantDataPhase2[] | null => {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      if (Array.isArray(parsedData) && parsedData.length > 0) {
        return parsedData.map(row => ({ 
            ...initialRow,
            ...row, 
            id: row.id || null, // ID pode ser null se for novo
            isGeocoded: !!row.latitude && !!row.longitude 
        }));
      }
    }
  } catch (e) {
    console.error("Failed to load data from localStorage:", e);
  }
  return null;
};

const UploadPhase2: React.FC = () => {
  const [rows, setRows] = useState<RestaurantDataPhase2[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Mapeamento de URL Externa para ID e Nome (para validação e preenchimento)
  const [urlToRestaurantData, setUrlToRestaurantData] = useState<Map<string, { id: string, name: string, isGeocoded: boolean }>>(new Map());

  // 1. Fetch Existing Restaurants (para preencher e validar)
  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    setErrors({});
    
    // Tenta carregar dados persistidos
    const persistedRows = loadPersistedRows();
    if (persistedRows) {
        setRows(persistedRows);
    }
    
    try {
      // Busca todos os restaurantes com URL externa e status de geocodificação
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, external_url, latitude, longitude')
        .not('external_url', 'is', null)
        .limit(1000);

      if (error) throw error;

      const newUrlMap = new Map<string, { id: string, name: string, isGeocoded: boolean }>();
      data.forEach(r => {
        if (r.external_url) {
          newUrlMap.set(r.external_url, { 
            id: r.id, 
            name: r.name, 
            isGeocoded: !!r.latitude && !!r.longitude 
          });
        }
      });
      setUrlToRestaurantData(newUrlMap);
      
      // Se não houver dados persistidos, inicializa com os que precisam de geocodificação
      if (!persistedRows) {
          const rowsToGeocode = data
            .filter(r => !r.latitude || !r.longitude)
            .map(r => ({
                ...initialRow,
                id: r.id,
                name: r.name,
                externalUrl: r.external_url || '',
                isGeocoded: false,
            }));
          
          if (rowsToGeocode.length > 0) {
              setRows(rowsToGeocode);
          } else {
              setRows([initialRow]); // Adiciona uma linha vazia para colagem manual
          }
      }
      
    } catch (e) {
      showError("Falha ao carregar dados de referência para a Fase 2.");
      console.error("Fetch Phase 2 Error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);
  
  // Efeito para salvar o estado no localStorage sempre que 'rows' mudar
  useEffect(() => {
    try {
      if (rows.length > 0 && !loading) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
      }
    } catch (e) {
      console.error("Failed to save data to localStorage:", e);
    }
  }, [rows, loading]);


  // 2. Handle Cell Update and CEP Lookup
  const handleUpdateCell = useCallback(async (id: string, key: keyof RestaurantDataPhase2, value: string) => {
    let newValue = value;
    
    if (key === 'cep') {
      newValue = formatCEP(value);
    }
    
    setRows(prevRows => 
      prevRows.map(row => {
        if (row.id === id) {
          const updatedRow = { ...row, [key]: newValue, isGeocoded: false };
          
          // Se a URL Externa for alterada, tenta preencher o nome e o ID
          if (key === 'externalUrl') {
            const data = urlToRestaurantData.get(newValue.trim());
            updatedRow.name = data?.name || updatedRow.name;
            updatedRow.id = data?.id || null;
          }
          return updatedRow;
        }
        return row;
      })
    );
    
    // Se for CEP, tenta buscar o endereço via ViaCEP
    if (key === 'cep' && formatCEP(value).replace(/\D/g, '').length === 8) {
      const cleanedCep = formatCEP(value).replace(/\D/g, '');
      try {
        const response = await axios.get(`https://viacep.com.br/ws/${cleanedCep}/json/`);
        const data = response.data;

        if (!data.erro) {
          setRows(prevRows => 
            prevRows.map(row => 
              row.id === id ? { 
                ...row, 
                address: data.logradouro || row.address,
                neighborhood: data.bairro || row.neighborhood,
                city: data.localidade || row.city,
                state: data.uf || row.state,
                isGeocoded: false,
              } : row
            )
          );
          showSuccess(`CEP preenchido para ${id}.`);
        }
      } catch (e) {
        // Ignora erros de CEP, o usuário pode preencher manualmente
      }
    }
  }, [urlToRestaurantData]);

  // 3. Handle Column Paste
  const handleColumnPaste = useCallback((
    e: React.ClipboardEvent<HTMLInputElement>, 
    rowIndex: number, 
    key: keyof RestaurantDataPhase2
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
          let finalValue = value;
          if (key === 'cep') {
            finalValue = formatCEP(value);
          }
          
          const updatedRow = { ...newRows[targetIndex], [key]: finalValue, isGeocoded: false };
          
          // Se colarmos na coluna URL, tentamos preencher o nome e o ID
          if (key === 'externalUrl') {
            const data = urlToRestaurantData.get(finalValue.trim());
            updatedRow.name = data?.name || updatedRow.name;
            updatedRow.id = data?.id || null;
          }
          
          newRows[targetIndex] = updatedRow;
        } else {
          // Adiciona nova linha se a colagem for além do final da tabela
          const newRow: RestaurantDataPhase2 = { ...initialRow, id: generateRowId(), [key]: value, isGeocoded: false };
          
          if (key === 'externalUrl') {
            const data = urlToRestaurantData.get(value.trim());
            newRow.name = data?.name || newRow.name;
            newRow.id = data?.id || null;
          }
          newRows.push(newRow);
        }
      }
      
      return newRows;
    });
    
    showSuccess(`Colados ${values.length} valores na coluna ${columns.find(c => c.key === key)?.label}.`);
  }, [urlToRestaurantData]);
  
  const handleAddRow = () => {
    setRows(prevRows => [...prevRows, { ...initialRow, id: generateRowId() }]);
  };


  // 4. Geocode and Upload Logic
  const handleGeocodeAndUpload = useCallback(async () => {
    setIsUploading(true);
    const newErrors: Record<string, string> = {};
    const updates: RestaurantDataPhase2[] = [];
    let successCount = 0;
    let insertCount = 0;

    // Filtra linhas que têm URL Externa válida e precisam de processamento
    const rowsToProcess = rows.filter(r => r.externalUrl && !r.isGeocoded);

    for (const row of rowsToProcess) {
      const fullAddress = `${row.address}, ${row.number}, ${row.neighborhood}, ${row.city}, ${row.state}, ${row.cep}`;
      
      if (!row.address || !row.number || !row.city || !row.state || !row.cep || !row.name) {
        newErrors[row.id || row.externalUrl] = `Dados de endereço ou nome incompletos para ${row.name || row.externalUrl}.`;
        continue;
      }

      let geocoded = null;
      try {
        geocoded = await geocodeAddress(fullAddress);
      } catch (e) {
        newErrors[row.id || row.externalUrl] = `Erro de geocodificação para ${row.name}.`;
        continue;
      }
      
      if (!geocoded) {
        newErrors[row.id || row.externalUrl] = `Falha na geocodificação para ${row.name}.`;
        continue;
      }
      
      // Se a geocodificação for bem-sucedida
      const updatePayload = {
        cep: row.cep,
        address: row.address,
        number: row.number,
        neighborhood: row.neighborhood,
        city: row.city,
        state: row.state,
        latitude: geocoded.lat,
        longitude: geocoded.lon,
      };
      
      const existingData = urlToRestaurantData.get(row.externalUrl);
      
      if (existingData) {
        // UPDATE (Restaurante já existe)
        const { error } = await supabase
          .from('restaurants')
          .update(updatePayload)
          .eq('id', existingData.id);
          
        if (error) {
          newErrors[row.id || row.externalUrl] = `Falha no DB (UPDATE) para ${row.name}: ${error.message}`;
        } else {
          successCount++;
        }
      } else {
        // INSERT (Restaurante não existe - Fase 1 pulada)
        const insertPayload: Partial<Restaurant> = {
          ...updatePayload,
          name: row.name,
          external_url: row.externalUrl,
          plan: 'free', // Padrão
        };
        
        const { error } = await supabase
          .from('restaurants')
          .insert([insertPayload]);
          
        if (error) {
          newErrors[row.id || row.externalUrl] = `Falha no DB (INSERT) para ${row.name}: ${error.message}`;
        } else {
          insertCount++;
        }
      }
    }
    
    setErrors(newErrors);

    if (successCount > 0 || insertCount > 0) {
      const totalProcessed = successCount + insertCount;
      showSuccess(`${totalProcessed} restaurantes processados. ${insertCount} inseridos, ${successCount} atualizados.`);
      
      // SALVAR REGISTRO DE UPLOAD
      saveUploadRecord({
        phase: 2,
        successCount: totalProcessed,
        details: `Geocodificação: ${insertCount} inseridos, ${successCount} atualizados.`,
      });
    } else if (Object.keys(newErrors).length === 0) {
        showSuccess("Nenhum restaurante novo para processar.");
    }

    setIsUploading(false);
    localStorage.removeItem(STORAGE_KEY); // Limpa o cache após o upload
    fetchRestaurants(); // Recarrega a lista para refletir as mudanças
  }, [rows, urlToRestaurantData, fetchRestaurants]);

  const rowsToProcess = useMemo(() => rows.filter(r => r.externalUrl && !r.isGeocoded), [rows]);
  
  // Define a largura da grade dinamicamente
  const gridTemplateColumns = columns.map(col => col.width).join(' ') + ' 100px'; // + Status

  if (loading) {
    return (
      <Card className="p-6 shadow-soft-lg border-none rounded-xl bg-white dark:bg-gray-800 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-primary">Carregando dados de referência...</p>
      </Card>
    );
  }
  
  // Se a lista estiver vazia (apenas a linha inicial de mock), mostra a mensagem de concluído
  const isListEmpty = rows.length === 0 || (rows.length === 1 && !rows[0].externalUrl);

  if (isListEmpty && !loading) {
    return (
      <Card className="p-6 shadow-soft-lg border-none rounded-xl bg-white dark:bg-gray-800">
        <Alert className="border-green-500 bg-green-50 text-green-700">
          <MapPin className="h-4 w-4" />
          <AlertTitle>Fase 2 Concluída!</AlertTitle>
          <AlertDescription>
            Todos os restaurantes existentes possuem coordenadas geográficas. Use o botão "Adicionar Linha" para inserir novos dados de endereço.
          </AlertDescription>
        </Alert>
        <Button onClick={fetchRestaurants} className="mt-4">Recarregar Lista</Button>
        <Button 
            onClick={handleAddRow} 
            variant="outline" 
            className="mt-4 ml-3 border-primary text-primary hover:bg-primary/5"
          >
            <Plus className="h-4 w-4 mr-2" /> Adicionar Linha Manualmente
          </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6 shadow-soft-lg border-none rounded-xl bg-white dark:bg-gray-800">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-2xl font-bold text-primary">Fase 2: Endereços e Geocodificação</CardTitle>
        <CardDescription className="text-gray-600">
          Preencha os dados de endereço para obter as coordenadas geográficas (Latitude/Longitude). Se a URL Externa não existir, o restaurante será criado.
        </CardDescription>
      </CardHeader>
      
      <div className="space-y-6">
        {/* Tabela de Entrada de Dados */}
        <div className="overflow-x-auto">
          <div className="min-w-[1600px]">
            {/* Cabeçalho da Tabela */}
            <div 
              className="grid bg-gray-100 dark:bg-gray-700 p-2 rounded-t-xl font-semibold text-sm text-primary dark:text-white"
              style={{ gridTemplateColumns: gridTemplateColumns }}
            >
              {columns.map(col => (
                <div key={col.key} className="px-2 truncate">{col.label}</div>
              ))}
              <div className="px-2 truncate text-center">Status</div>
            </div>
            
            {/* Linhas de Dados */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-b-xl">
              {rows.map((row, index) => (
                <div 
                  key={row.id} 
                  className={cn(
                    "grid border-b border-gray-100 dark:border-gray-700 last:border-b-0",
                    errors[row.id || row.externalUrl] && "bg-red-50 dark:bg-red-900/20"
                  )}
                  style={{ gridTemplateColumns: gridTemplateColumns }}
                >
                  {columns.map(col => (
                    <Input
                      key={col.key}
                      value={String(row[col.key as keyof RestaurantDataPhase2] ?? '')}
                      onChange={(e) => handleUpdateCell(row.id || row.externalUrl, col.key as keyof RestaurantDataPhase2, e.target.value)}
                      onPaste={(e) => handleColumnPaste(e, index, col.key as keyof RestaurantDataPhase2)}
                      className="h-10 border-none rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-sm"
                      placeholder={col.label}
                    />
                  ))}
                  <div className="flex items-center justify-center text-sm">
                    {row.isGeocoded ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : errors[row.id || row.externalUrl] ? (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    ) : (
                      <MapPin className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
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

        <div className="flex gap-3">
          <Button 
            onClick={handleGeocodeAndUpload} 
            disabled={isUploading || rowsToProcess.length === 0}
            variant="highlight"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" /> Salvar Endereços e Geocodificar ({rowsToProcess.length})
              </>
            )}
          </Button>
          <Button 
            onClick={fetchRestaurants} 
            variant="outline" 
            disabled={isUploading}
          >
            Recarregar Lista
          </Button>
          <Button 
            onClick={handleAddRow} 
            variant="outline" 
            disabled={isUploading}
            className="border-primary text-primary hover:bg-primary/5"
          >
            <Plus className="h-4 w-4 mr-2" /> Adicionar Linha
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default UploadPhase2;
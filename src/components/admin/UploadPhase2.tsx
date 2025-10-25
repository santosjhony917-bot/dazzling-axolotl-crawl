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

// Define a estrutura de dados para a Fase 2 (incluindo campos do DB e campos de referência)
interface RestaurantDataPhase2 {
  id: string;
  name: string;
  cep: string;
  address: string; // Rua/Avenida (Mapeia para DB: address)
  number: string; // (Mapeia para DB: number)
  complement: string; // (Referência, não mapeado para DB)
  reference_point: string; // (Referência, não mapeado para DB)
  neighborhood: string; // (Mapeia para DB: neighborhood)
  city: string; // (Mapeia para DB: city)
  state: string; // (Mapeia para DB: state)
  latitude: number | null;
  longitude: number | null;
  isGeocoded: boolean;
}

// Colunas da planilha (incluindo campos editáveis para colagem)
const columns = [
  { key: 'name', label: 'Nome do Restaurante', readOnly: true, width: '150px' },
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
  id: generateRowId(),
  name: '',
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
        // Garante que as linhas persistidas tenham todos os novos campos
        return parsedData.map(row => ({ 
            ...initialRow, // Garante que todos os campos existam
            ...row, 
            id: row.id || generateRowId(), 
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

  // 1. Fetch Restaurants without Coordinates
  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    setErrors({});
    
    // Tenta carregar dados persistidos
    const persistedRows = loadPersistedRows();
    if (persistedRows) {
        setRows(persistedRows);
        setLoading(false);
        return;
    }
    
    try {
      // Busca restaurantes que não têm latitude OU longitude (ou ambos)
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, cep, address, number, neighborhood, city, state, latitude, longitude')
        .or('latitude.is.null,longitude.is.null')
        .limit(50); // Limita para evitar sobrecarga

      if (error) throw error;

      const initialRows: RestaurantDataPhase2[] = data.map(r => ({
        id: r.id,
        name: r.name,
        cep: r.cep || '',
        address: r.address || '',
        number: r.number || '',
        neighborhood: r.neighborhood || '',
        city: r.city || '',
        state: r.state || '',
        latitude: r.latitude,
        longitude: r.longitude,
        complement: '', // Vazio por padrão
        reference_point: '', // Vazio por padrão
        isGeocoded: !!r.latitude && !!r.longitude,
      }));

      setRows(initialRows);
      if (initialRows.length === 0) {
        showSuccess("Todos os restaurantes existentes possuem coordenadas geográficas. Você pode adicionar linhas manualmente para novos uploads.");
        // Adiciona uma linha vazia para permitir a colagem imediata
        setRows([initialRow]);
      }
    } catch (e) {
      showError("Falha ao carregar restaurantes para a Fase 2.");
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
      prevRows.map(row => (row.id === id ? { ...row, [key]: newValue, isGeocoded: false } : row))
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
  }, []);

  // 3. Handle Column Paste (similar to Phase 1)
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
      
      // Encontra o índice da coluna na lista de colunas
      const colIndex = columns.findIndex(c => c.key === key);
      if (colIndex === -1) return prevRows; // Coluna não encontrada

      for (let i = 0; i < values.length; i++) {
        const targetIndex = rowIndex + i;
        const value = values[i];
        
        if (targetIndex < newRows.length) {
          let finalValue = value;
          if (key === 'cep') {
            finalValue = formatCEP(value);
          }
          
          newRows[targetIndex] = { ...newRows[targetIndex], [key]: finalValue, isGeocoded: false };
        }
        // Não adicionamos novas linhas aqui, apenas atualizamos as existentes
      }
      
      return newRows;
    });
    
    showSuccess(`Colados ${values.length} valores na coluna ${columns.find(c => c.key === key)?.label}.`);
  }, []);
  
  const handleAddRow = () => {
    setRows(prevRows => [...prevRows, initialRow]);
  };


  // 4. Geocode and Upload Logic
  const handleGeocodeAndUpload = useCallback(async () => {
    setIsUploading(true);
    const newErrors: Record<string, string> = {};
    const updates: RestaurantDataPhase2[] = [];
    let successCount = 0;

    // Filtra linhas que têm ID de restaurante válido (não temporário) e precisam de geocodificação
    const rowsToProcess = rows.filter(r => !r.isGeocoded && !r.id.startsWith('temp-'));

    for (const row of rowsToProcess) {
      // Usamos apenas os campos que o Nominatim precisa para geocodificar
      const fullAddress = `${row.address}, ${row.number}, ${row.neighborhood}, ${row.city}, ${row.state}, ${row.cep}`;
      
      if (!row.address || !row.number || !row.city || !row.state || !row.cep) {
        newErrors[row.id] = `Endereço incompleto para ${row.name}.`;
        continue;
      }

      try {
        const geocoded = await geocodeAddress(fullAddress);
        
        if (geocoded) {
          updates.push({
            ...row,
            latitude: geocoded.lat,
            longitude: geocoded.lon,
            isGeocoded: true,
          });
          successCount++;
        } else {
          newErrors[row.id] = `Falha na geocodificação para ${row.name}.`;
        }
      } catch (e) {
        newErrors[row.id] = `Erro de rede/serviço para ${row.name}.`;
      }
    }
    
    setErrors(newErrors);

    if (updates.length > 0) {
      // 5. Bulk Update Supabase
      const updatePromises = updates.map(u => 
        supabase
          .from('restaurants')
          .update({
            cep: u.cep,
            address: u.address,
            number: u.number,
            neighborhood: u.neighborhood,
            city: u.city,
            state: u.state,
            latitude: u.latitude,
            longitude: u.longitude,
          })
          .eq('id', u.id)
      );

      const results = await Promise.all(updatePromises);
      const updateErrors = results.filter(r => r.error).map(r => r.error!.message);
      
      if (updateErrors.length > 0) {
        showError(`Sucesso na geocodificação, mas falha no DB para ${updateErrors.length} itens.`);
        console.error("Bulk Update Errors:", updateErrors);
      } else {
        showSuccess(`${successCount} restaurantes atualizados e geocodificados com sucesso!`);
      }
    } else if (Object.keys(newErrors).length === 0) {
        showSuccess("Nenhum restaurante novo para geocodificar.");
    }

    setIsUploading(false);
    localStorage.removeItem(STORAGE_KEY); // Limpa o cache após o upload
    fetchRestaurants(); // Recarrega a lista para mostrar apenas os não processados
  }, [rows, fetchRestaurants]);

  const rowsToProcess = useMemo(() => rows.filter(r => !r.isGeocoded && !r.id.startsWith('temp-')), [rows]);
  
  // Define a largura da grade dinamicamente
  const gridTemplateColumns = columns.map(col => col.width).join(' ') + ' 100px'; // + Status

  if (loading) {
    return (
      <Card className="p-6 shadow-lg border-none rounded-xl bg-white dark:bg-gray-800 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-primary">Carregando restaurantes sem coordenadas...</p>
      </Card>
    );
  }
  
  // Se a lista estiver vazia (apenas a linha inicial de mock), mostra a mensagem de concluído
  const isListEmpty = rows.length === 0 || (rows.length === 1 && rows[0].id.startsWith('temp-'));

  if (isListEmpty && !loading) {
    return (
      <Card className="p-6 shadow-lg border-none rounded-xl bg-white dark:bg-gray-800">
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
    <Card className="p-6 shadow-lg border-none rounded-xl bg-white dark:bg-gray-800">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-2xl font-bold text-primary">Fase 2: Endereços e Geocodificação</CardTitle>
        <CardDescription className="text-gray-600">
          Preencha os dados de endereço para obter as coordenadas geográficas (Latitude/Longitude).
        </CardDescription>
      </CardHeader>
      
      <div className="space-y-6">
        {/* Tabela de Entrada de Dados */}
        <div className="overflow-x-auto">
          <div className="min-w-[1400px]">
            {/* Cabeçalho da Tabela */}
            <div 
              className="grid bg-gray-100 dark:bg-gray-700 p-2 rounded-t-lg font-semibold text-sm text-primary dark:text-white"
              style={{ gridTemplateColumns: gridTemplateColumns }}
            >
              {columns.map(col => (
                <div key={col.key} className="px-2 truncate">{col.label}</div>
              ))}
              <div className="px-2 truncate text-center">Status</div>
            </div>
            
            {/* Linhas de Dados */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-b-lg">
              {rows.map((row, index) => (
                <div 
                  key={row.id} 
                  className={cn(
                    "grid border-b border-gray-100 dark:border-gray-700 last:border-b-0",
                    errors[row.id] && "bg-red-50 dark:bg-red-900/20"
                  )}
                  style={{ gridTemplateColumns: gridTemplateColumns }}
                >
                  {columns.map(col => (
                    <Input
                      key={col.key}
                      value={String(row[col.key as keyof RestaurantDataPhase2] ?? '')}
                      onChange={(e) => handleUpdateCell(row.id, col.key as keyof RestaurantDataPhase2, e.target.value)}
                      onPaste={(e) => col.readOnly ? undefined : handleColumnPaste(e, index, col.key as keyof RestaurantDataPhase2)}
                      className="h-10 border-none rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-sm"
                      placeholder={col.label}
                      readOnly={col.readOnly}
                    />
                  ))}
                  <div className="flex items-center justify-center text-sm">
                    {row.isGeocoded ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : errors[row.id] ? (
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
            className="bg-highlight hover:bg-highlight/90"
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
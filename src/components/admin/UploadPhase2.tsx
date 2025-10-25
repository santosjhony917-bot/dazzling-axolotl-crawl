import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, Plus, AlertTriangle, Loader2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { geocodeAddress, formatCEP } from '@/services/geocoding';
import axios from 'axios';

// Define a estrutura de dados para a Fase 2 (incluindo campos do DB)
interface RestaurantDataPhase2 {
  id: string;
  name: string;
  cep: string;
  address: string; // Rua/Avenida
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  isGeocoded: boolean;
}

// Colunas da planilha
const columns = [
  { key: 'name', label: 'Nome do Restaurante', readOnly: true },
  { key: 'cep', label: 'CEP' },
  { key: 'address', label: 'Rua/Avenida' },
  { key: 'number', label: 'Número' },
  { key: 'neighborhood', label: 'Bairro' },
  { key: 'city', label: 'Cidade' },
  { key: 'state', label: 'UF' },
];

const UploadPhase2: React.FC = () => {
  const [rows, setRows] = useState<RestaurantDataPhase2[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 1. Fetch Restaurants without Coordinates
  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    setErrors({});
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
        isGeocoded: !!r.latitude && !!r.longitude,
      }));

      setRows(initialRows);
      if (initialRows.length === 0) {
        showSuccess("Todos os restaurantes estão geocodificados ou não há dados para a Fase 2.");
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
      
      for (let i = 0; i < values.length; i++) {
        const targetIndex = rowIndex + i;
        const value = values[i];
        
        if (targetIndex < newRows.length) {
          const rowId = newRows[targetIndex].id;
          handleUpdateCell(rowId, key, value); // Usa o handler para aplicar formatação/CEP lookup
        }
        // Não adicionamos novas linhas aqui, apenas atualizamos as existentes
      }
      
      return newRows;
    });
    
    showSuccess(`Colados ${values.length} valores na coluna ${columns.find(c => c.key === key)?.label}.`);
  }, [handleUpdateCell]);

  // 4. Geocode and Upload Logic
  const handleGeocodeAndUpload = useCallback(async () => {
    setIsUploading(true);
    const newErrors: Record<string, string> = {};
    const updates: RestaurantDataPhase2[] = [];
    let successCount = 0;

    for (const row of rows) {
      if (row.isGeocoded) continue; // Pula se já estiver geocodificado

      const fullAddress = `${row.address}, ${row.number}, ${row.neighborhood}, ${row.city}, ${row.state}, ${row.cep}`;
      
      if (!row.address || !row.number || !row.city || !row.state) {
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
    fetchRestaurants(); // Recarrega a lista para mostrar apenas os não processados
  }, [rows, fetchRestaurants]);

  const rowsToProcess = useMemo(() => rows.filter(r => !r.isGeocoded), [rows]);

  if (loading) {
    return (
      <Card className="p-6 shadow-lg border-none rounded-xl bg-white dark:bg-gray-800 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-primary">Carregando restaurantes sem coordenadas...</p>
      </Card>
    );
  }
  
  if (rows.length === 0 && !loading) {
    return (
      <Card className="p-6 shadow-lg border-none rounded-xl bg-white dark:bg-gray-800">
        <Alert className="border-green-500 bg-green-50 text-green-700">
          <MapPin className="h-4 w-4" />
          <AlertTitle>Fase 2 Concluída!</AlertTitle>
          <AlertDescription>
            Todos os restaurantes existentes possuem coordenadas geográficas.
          </AlertDescription>
        </Alert>
        <Button onClick={fetchRestaurants} className="mt-4">Recarregar Lista</Button>
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
          <div className="min-w-[1200px]">
            {/* Cabeçalho da Tabela */}
            <div className="grid grid-cols-[200px_100px_200px_100px_150px_150px_80px_100px] bg-gray-100 dark:bg-gray-700 p-2 rounded-t-lg font-semibold text-sm text-primary dark:text-white">
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
                    "grid grid-cols-[200px_100px_200px_100px_150px_150px_80px_100px] border-b border-gray-100 dark:border-gray-700 last:border-b-0",
                    errors[row.id] && "bg-red-50 dark:bg-red-900/20"
                  )}
                >
                  {columns.map(col => (
                    <Input
                      key={col.key}
                      value={row[col.key as keyof RestaurantDataPhase2] || ''}
                      onChange={(e) => handleUpdateCell(row.id, col.key as keyof RestaurantDataPhase2, e.target.value)}
                      onPaste={(e) => handleColumnPaste(e, index, col.key as keyof RestaurantDataPhase2)}
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
                <Upload className="h-4 w-4 mr-2" /> Geocodificar e Atualizar ({rowsToProcess.length})
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
        </div>
      </div>
    </Card>
  );
};

export default UploadPhase2;
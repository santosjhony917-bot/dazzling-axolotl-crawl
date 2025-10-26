import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, Plus, AlertTriangle, Loader2, Clock, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';
import { WeekSchedule, DaySchedule, TimeSlot } from '@/types/schedule';
import { saveUploadRecord } from '@/utils/uploadHistory'; // NOVO IMPORT

// Define a estrutura de dados para a Fase 4
interface RestaurantDataPhase4 {
  id: string;
  name: string;
  // Campos de horário (string no formato da planilha: 'HH:MM-HH:MM, HH:MM-HH:MM' ou 'Fechado')
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
  status: 'pending' | 'error' | 'success';
}

// Colunas da planilha
const columns = [
  { key: 'name', label: 'Nome do Restaurante', readOnly: true, width: '150px' },
  { key: 'monday', label: 'Segunda' },
  { key: 'tuesday', label: 'Terça' },
  { key: 'wednesday', label: 'Quarta' },
  { key: 'thursday', label: 'Quinta' },
  { key: 'friday', label: 'Sexta' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

// Chave de persistência
const STORAGE_KEY = 'admin_upload_phase4_data';

// Função utilitária para parsear a string de horário (ex: 'HH:MM-HH:MM, HH:MM-HH:MM')
const parseTimeSlots = (timeString: string): DaySchedule => {
  const cleaned = timeString.trim().toLowerCase();
  
  if (cleaned === 'fechado' || !cleaned) {
    return { isOpen: false, slots: [] };
  }
  
  const slots: TimeSlot[] = [];
  const parts = cleaned.split(',').map(p => p.trim()).filter(Boolean);
  
  const timeRegex = /^(\d{2}:\d{2})-(\d{2}:\d{2})$/;

  for (const part of parts) {
    const match = part.match(timeRegex);
    if (match) {
      slots.push({ start: match[1], end: match[2] });
    }
  }
  
  return { isOpen: slots.length > 0, slots };
};

// Função para carregar dados do localStorage
const loadPersistedRows = (): RestaurantDataPhase4[] | null => {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      if (Array.isArray(parsedData) && parsedData.length > 0) {
        return parsedData.map(row => ({ ...row, status: 'pending' }));
      }
    }
  } catch (e) {
    console.error("Failed to load data from localStorage:", e);
  }
  return null;
};


const UploadPhase4: React.FC = () => {
  const [rows, setRows] = useState<RestaurantDataPhase4[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 1. Fetch Restaurants without Opening Hours
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
      // Busca restaurantes onde opening_hours é NULL
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, opening_hours')
        .is('opening_hours', null)
        .limit(50); // Limita para evitar sobrecarga

      if (error) throw error;

      const initialRows: RestaurantDataPhase4[] = data.map(r => ({
        id: r.id,
        name: r.name,
        monday: '',
        tuesday: '',
        wednesday: '',
        thursday: '',
        friday: '',
        saturday: '',
        sunday: '',
        status: 'pending',
      }));

      setRows(initialRows);
      if (initialRows.length === 0) {
        showSuccess("Todos os restaurantes existentes possuem horários de funcionamento definidos.");
      }
    } catch (e) {
      showError("Falha ao carregar restaurantes para a Fase 4.");
      console.error("Fetch Phase 4 Error:", e);
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
      // Salva apenas se houver dados e não estiver carregando
      if (rows.length > 0 && !loading) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
      }
    } catch (e) {
      console.error("Failed to save data to localStorage:", e);
    }
  }, [rows, loading]);


  // 2. Handle Cell Update
  const handleUpdateCell = useCallback((id: string, key: keyof RestaurantDataPhase4, value: string) => {
    setRows(prevRows => 
      prevRows.map(row => (row.id === id ? { ...row, [key]: value, status: 'pending' } : row))
    );
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[id];
      return newErrors;
    });
  }, []);

  // 3. Handle Column Paste
  const handleColumnPaste = useCallback((
    e: React.ClipboardEvent<HTMLInputElement>, 
    rowIndex: number, 
    key: keyof RestaurantDataPhase4
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
        }
      }
      
      return newRows;
    });
    
    showSuccess(`Colados ${values.length} valores na coluna ${columns.find(c => c.key === key)?.label}.`);
  }, []);

  // 4. Validation and Upload Logic
  const handleUpload = useCallback(async () => {
    setIsUploading(true);
    const newErrors: Record<string, string> = {};
    const updates: { id: string, opening_hours: WeekSchedule }[] = [];
    let successCount = 0;
    
    const dayKeys: (keyof RestaurantDataPhase4)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    for (const row of rows) {
      const schedule: Partial<WeekSchedule> = {};
      let hasError = false;
      
      for (const dayKey of dayKeys) {
        const timeString = row[dayKey];
        const daySchedule = parseTimeSlots(timeString);
        
        // Validação básica: se for aberto, deve ter slots válidos
        if (daySchedule.isOpen && daySchedule.slots.length === 0 && timeString.trim().toLowerCase() !== 'fechado' && timeString.trim().length > 0) {
            newErrors[row.id] = `Erro na formatação do horário para ${dayKey}. Use HH:MM-HH:MM.`;
            hasError = true;
            break;
        }
        
        schedule[dayKey as keyof WeekSchedule] = daySchedule as DaySchedule;
      }
      
      if (hasError) continue;
      
      updates.push({
        id: row.id,
        opening_hours: schedule as WeekSchedule,
      });
    }
    
    setErrors(newErrors);

    if (updates.length > 0) {
      // 5. Bulk Update Supabase
      const updatePromises = updates.map(u => 
        supabase
          .from('restaurants')
          .update({ opening_hours: u.opening_hours })
          .eq('id', u.id)
      );

      const results = await Promise.all(updatePromises);
      const updateErrors = results.filter(r => r.error).map(r => r.error!.message);
      
      if (updateErrors.length > 0) {
        showError(`Sucesso na conversão, mas falha no DB para ${updateErrors.length} itens.`);
        console.error("Bulk Update Errors:", updateErrors);
      } else {
        successCount = updates.length;
        showSuccess(`${successCount} horários de funcionamento atualizados com sucesso!`);
        
        // SALVAR REGISTRO DE UPLOAD
        saveUploadRecord({
          phase: 4,
          successCount: successCount,
          details: `Atualização de horários para ${successCount} restaurantes.`,
        });
      }
    } else if (Object.keys(newErrors).length === 0) {
        showSuccess("Nenhum horário novo para processar.");
    }

    setIsUploading(false);
    
    // Limpa o localStorage e recarrega a lista para mostrar apenas os não processados
    localStorage.removeItem(STORAGE_KEY);
    fetchRestaurants(); 
  }, [rows, fetchRestaurants]);

  const rowsToProcess = useMemo(() => rows.filter(r => r.status === 'pending'), [rows]);

  if (loading) {
    return (
      <Card className="p-6 shadow-soft-lg border-none rounded-xl bg-white dark:bg-gray-800 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-primary">Carregando restaurantes sem horários definidos...</p>
      </Card>
    );
  }
  
  if (rows.length === 0 && !loading) {
    return (
      <Card className="p-6 shadow-soft-lg border-none rounded-xl bg-white dark:bg-gray-800">
        <Alert className="border-green-500 bg-green-50 text-green-700">
          <Clock className="h-4 w-4" />
          <AlertTitle>Fase 4 Concluída!</AlertTitle>
          <AlertDescription>
            Todos os restaurantes existentes possuem horários de funcionamento definidos.
          </AlertDescription>
        </Alert>
        <Button onClick={fetchRestaurants} className="mt-4">Recarregar Lista</Button>
      </Card>
    );
  }

  return (
    <Card className="p-6 shadow-soft-lg border-none rounded-xl bg-white dark:bg-gray-800">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-2xl font-bold text-primary">Fase 4: Horários de Funcionamento</CardTitle>
        <CardDescription className="text-gray-600">
          Insira os horários de funcionamento para cada dia. Use o formato HH:MM-HH:MM (separado por vírgula para múltiplos slots) ou 'Fechado'.
        </CardDescription>
      </CardHeader>
      
      <div className="space-y-6">
        {/* Tabela de Entrada de Dados */}
        <div className="overflow-x-auto">
          <div className="min-w-[1400px]">
            {/* Cabeçalho da Tabela */}
            <div className="grid grid-cols-9 bg-gray-100 dark:bg-gray-700 p-2 rounded-t-xl font-semibold text-sm text-primary dark:text-white">
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
                    "grid grid-cols-9 border-b border-gray-100 dark:border-gray-700 last:border-b-0",
                    errors[row.id] && "bg-red-50 dark:bg-red-900/20"
                  )}
                >
                  {columns.map(col => (
                    <Input
                      key={col.key}
                      value={row[col.key as keyof RestaurantDataPhase4] || ''}
                      onChange={(e) => handleUpdateCell(row.id, col.key as keyof RestaurantDataPhase4, e.target.value)}
                      onPaste={(e) => handleColumnPaste(e, index, col.key as keyof RestaurantDataPhase4)}
                      className="h-10 border-none rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-sm"
                      placeholder={col.label}
                      readOnly={col.readOnly}
                    />
                  ))}
                  <div className="flex items-center justify-center text-sm">
                    {row.status === 'success' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : errors[row.id] ? (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-gray-400" />
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
            onClick={handleUpload} 
            disabled={isUploading || rowsToProcess.length === 0}
            variant="highlight"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" /> Atualizar Horários ({rowsToProcess.length})
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

export default UploadPhase4;
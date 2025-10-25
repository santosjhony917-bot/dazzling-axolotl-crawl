import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, Plus, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';

// Define a estrutura de dados para a Fase 1
interface RestaurantDataPhase1 {
  id: string;
  restaurantUrl: string;
  restaurantName: string;
  categories: string;
  logoUrl: string;
  coverUrl: string;
}

// Chave de persistência
const STORAGE_KEY = 'admin_upload_phase1_data';

// Colunas da planilha
const columns = [
  { key: 'restaurantUrl', label: 'URL do Restaurante' },
  { key: 'restaurantName', label: 'Nome do Restaurante' },
  { key: 'categories', label: 'Categorias (separadas por vírgula)' },
  { key: 'logoUrl', label: 'URL da Logo' },
  { key: 'coverUrl', label: 'URL da Capa' },
];

// Função utilitária para gerar um ID temporário
let rowIdCounter = 0;
const generateRowId = () => `temp-${rowIdCounter++}`;

const initialRow: RestaurantDataPhase1 = {
  id: generateRowId(),
  restaurantUrl: '',
  restaurantName: '',
  categories: '',
  logoUrl: '',
  coverUrl: '',
};

// Função para carregar dados do localStorage
const loadInitialRows = (): RestaurantDataPhase1[] => {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      if (Array.isArray(parsedData) && parsedData.length > 0) {
        // Garante que cada linha tenha um ID válido (caso o ID não tenha sido persistido corretamente)
        return parsedData.map(row => ({ ...row, id: row.id || generateRowId() }));
      }
    }
  } catch (e) {
    console.error("Failed to load data from localStorage:", e);
  }
  return [initialRow];
};

const UploadPhase1: React.FC = () => {
  const [rows, setRows] = useState<RestaurantDataPhase1[]>(loadInitialRows);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Efeito para salvar o estado no localStorage sempre que 'rows' mudar
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    } catch (e) {
      console.error("Failed to save data to localStorage:", e);
    }
  }, [rows]);

  const handleUpdateCell = useCallback((id: string, key: keyof RestaurantDataPhase1, value: string) => {
    setRows(prevRows => 
      prevRows.map(row => (row.id === id ? { ...row, [key]: value } : row))
    );
    // Limpa erros ao editar
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[id];
      return newErrors;
    });
  }, []);

  const handleAddRow = () => {
    setRows(prevRows => [...prevRows, { ...initialRow, id: generateRowId() }]);
  };

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text');
    const lines = pasteData.split('\n').filter(line => line.trim() !== '');
    
    const newRows: RestaurantDataPhase1[] = lines.map(line => {
      const values = line.split('\t'); // Assume TSV (Tab Separated Values)
      return {
        id: generateRowId(),
        restaurantUrl: values[0]?.trim() || '',
        restaurantName: values[1]?.trim() || '',
        categories: values[2]?.trim() || '',
        logoUrl: values[3]?.trim() || '',
        coverUrl: values[4]?.trim() || '',
      };
    });

    if (newRows.length > 0) {
        setRows(newRows);
    }
  }, []);

  const analyzeData = useCallback(() => {
    setIsAnalyzing(true);
    const newErrors: Record<string, string> = {};
    let validCount = 0;

    rows.forEach((row, index) => {
      const rowErrors: string[] = [];
      
      if (!row.restaurantName.trim()) {
        rowErrors.push('Nome do Restaurante obrigatório');
      }
      if (!row.categories.trim()) {
        rowErrors.push('Categorias obrigatórias');
      }
      if (row.restaurantUrl.trim() && !row.restaurantUrl.startsWith('http')) {
        rowErrors.push('URL do Restaurante inválida');
      }
      // Adicionar mais validações de URL se necessário

      if (rowErrors.length > 0) {
        newErrors[row.id] = `Linha ${index + 1}: ${rowErrors.join(', ')}`;
      } else {
        validCount++;
      }
    });

    setErrors(newErrors);
    setIsAnalyzing(false);
    
    if (Object.keys(newErrors).length === 0) {
      showSuccess(`Análise concluída. ${validCount} linhas prontas para upload.`);
    } else {
      showError(`Análise concluída com ${Object.keys(newErrors).length} erros.`);
    }
  }, [rows]);

  const handleUpload = useCallback(async () => {
    if (Object.keys(errors).length > 0 || rows.length === 0) {
      showError("Corrija os erros e analise os dados antes de fazer o upload.");
      return;
    }
    
    setIsUploading(true);
    // Simulação de chamada de API para Edge Function ou Supabase RPC
    console.log("Iniciando upload de dados da Fase 1:", rows);
    
    // Aqui seria a lógica de inserção no banco de dados
    // Ex: await supabase.rpc('bulk_insert_restaurants', { data: rows });
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simula delay
    
    showSuccess(`Upload de ${rows.length} restaurantes concluído com sucesso!`);
    
    // Limpa a planilha e o localStorage após o upload bem-sucedido
    setRows([initialRow]); 
    localStorage.removeItem(STORAGE_KEY);
    
    setIsUploading(false);
  }, [rows, errors]);

  const validRowCount = useMemo(() => {
    return rows.filter(row => !errors[row.id]).length;
  }, [rows, errors]);

  return (
    <Card className="p-6 shadow-lg border-none rounded-xl bg-white dark:bg-gray-800">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-2xl font-bold text-primary">Fase 1: Informações Gerais</CardTitle>
        <CardDescription className="text-gray-600">
          Cole os dados diretamente do Excel/Google Sheets nas colunas abaixo.
        </CardDescription>
      </CardHeader>
      
      <div className="space-y-6">
        {/* Tabela de Entrada de Dados */}
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Cabeçalho da Tabela */}
            <div className="grid grid-cols-5 bg-gray-100 dark:bg-gray-700 p-2 rounded-t-lg font-semibold text-sm text-primary dark:text-white">
              {columns.map(col => (
                <div key={col.key} className="px-2 truncate">{col.label}</div>
              ))}
            </div>
            
            {/* Linhas de Dados */}
            <div onPaste={handlePaste} className="border border-gray-200 dark:border-gray-700 rounded-b-lg">
              {rows.map((row, index) => (
                <div 
                  key={row.id} 
                  className={cn(
                    "grid grid-cols-5 border-b border-gray-100 dark:border-gray-700 last:border-b-0",
                    errors[row.id] && "bg-red-50 dark:bg-red-900/20"
                  )}
                >
                  {columns.map(col => (
                    <Input
                      key={col.key}
                      value={row[col.key as keyof RestaurantDataPhase1]}
                      onChange={(e) => handleUpdateCell(row.id, col.key as keyof RestaurantDataPhase1, e.target.value)}
                      className="h-10 border-none rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-sm"
                      placeholder={col.label}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Dica e Ações */}
        <div className="flex items-center gap-4">
          <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Dica: Copie as colunas do Excel e cole diretamente na área da planilha acima.
          </span>
        </div>

        <div className="flex gap-3">
          <Button 
            onClick={handleAddRow} 
            variant="outline" 
            disabled={isAnalyzing || isUploading}
            className="border-primary text-primary hover:bg-primary/5"
          >
            <Plus className="h-4 w-4 mr-2" /> Adicionar Linha
          </Button>
          <Button 
            onClick={analyzeData} 
            disabled={isAnalyzing || isUploading}
            className="bg-gray-200 text-primary hover:bg-gray-300"
          >
            {isAnalyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : 'Analisar Dados'}
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={isAnalyzing || isUploading || Object.keys(errors).length > 0 || validRowCount === 0}
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

export default UploadPhase1;
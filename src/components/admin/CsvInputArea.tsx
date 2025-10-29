import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { showError } from '@/utils/toast';

interface CsvInputAreaProps {
  onProcess: (csvData: string) => void;
  isLoading: boolean;
  placeholder: string;
  buttonText: string;
  requiredColumns: string[];
}

const CsvInputArea: React.FC<CsvInputAreaProps> = ({
  onProcess,
  isLoading,
  placeholder,
  buttonText,
  requiredColumns,
}) => {
  const [csvInput, setCsvInput] = useState('');

  const handleProcess = () => {
    if (!csvInput.trim()) {
      showError("Por favor, cole os dados CSV na área de texto.");
      return;
    }
    
    // Validação básica do cabeçalho
    const lines = csvInput.trim().split('\n');
    if (lines.length === 0) {
      showError("Nenhum dado encontrado.");
      return;
    }
    
    const header = lines[0].toLowerCase().split(',').map(h => h.trim());
    const missingColumns = requiredColumns.filter(col => !header.includes(col.toLowerCase()));

    if (missingColumns.length > 0) {
      showError(`Colunas obrigatórias faltando: ${missingColumns.join(', ')}`);
      return;
    }

    onProcess(csvInput);
  };

  return (
    <Card className="shadow-soft-sm border-gray-200 rounded-xl p-4">
      <CardContent className="p-0 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> Cole os dados CSV aqui:
          </label>
          <Textarea
            value={csvInput}
            onChange={(e) => setCsvInput(e.target.value)}
            placeholder={placeholder}
            rows={10}
            className="min-h-[200px] font-mono text-xs border-gray-300 focus:border-highlight focus:ring-highlight shadow-inner"
            disabled={isLoading}
          />
        </div>
        <Button 
          onClick={handleProcess} 
          disabled={isLoading}
          className="bg-highlight hover:bg-highlight/90 w-full"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          {buttonText}
        </Button>
      </CardContent>
    </Card>
  );
};

export default CsvInputArea;
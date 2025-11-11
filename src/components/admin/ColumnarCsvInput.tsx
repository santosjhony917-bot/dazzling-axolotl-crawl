import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Upload } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { showError } from '@/utils/toast';

interface ColumnarCsvInputProps {
  onProcess: (csvData: string) => void;
  isLoading: boolean;
  buttonText: string;
  requiredColumns: string[];
  primaryKeyColumn?: string;
}

const ColumnarCsvInput: React.FC<ColumnarCsvInputProps> = ({
  onProcess,
  isLoading,
  buttonText,
  requiredColumns,
  primaryKeyColumn,
}) => {
  const [columnInputs, setColumnInputs] = useState<Record<string, string>>(
    requiredColumns.reduce((acc, col) => ({ ...acc, [col]: '' }), {})
  );

  const handleInputChange = (column: string, value: string) => {
    setColumnInputs(prev => ({ ...prev, [column]: value }));
  };

  // Helper function to escape CSV values
  const escapeCsvValue = (value: string): string => {
    if (value.includes(',') || value.includes('\n') || value.includes('"')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const handleProcess = () => {
    const linesByColumn: Record<string, string[]> = {};
    let maxLines = 0;

    for (const col of requiredColumns) {
      const lines = (columnInputs[col] || '').split('\n').map(l => l.trim());
      linesByColumn[col] = lines;
      if (lines.length > maxLines && lines.some(l => l !== '')) {
        maxLines = lines.length;
      }
    }

    if (maxLines === 0 || (maxLines === 1 && Object.values(columnInputs).every(v => v.trim() === ''))) {
        showError("Por favor, cole os dados em pelo menos uma coluna.");
        return;
    }

    const header = requiredColumns.map(escapeCsvValue).join(',');
    const rows: string[] = [];

    for (let i = 0; i < maxLines; i++) {
      const rowData = requiredColumns.map(col => {
        const colLines = linesByColumn[col] || [];
        return escapeCsvValue(colLines[i] || '');
      });
      
      if (rowData.some(cell => cell !== '""' && cell !== '')) { // Check for actual content, considering escaped empty strings
        // Client-side validation for primaryKeyColumn
        if (primaryKeyColumn) {
          const primaryKeyIndex = requiredColumns.indexOf(primaryKeyColumn);
          // Remove quotes for validation if present
          const primaryKeyValue = rowData[primaryKeyIndex].replace(/^"|"$/g, '').replace(/""/g, '"');
          if (primaryKeyIndex !== -1 && primaryKeyValue.trim() === '') {
            showError(`A coluna "${primaryKeyColumn.replace(/_/g, ' ')}" não pode estar vazia na linha ${i + 1}.`);
            return; // Stop processing and show error
          }
        }
        rows.push(rowData.join(','));
      }
    }
    
    if (rows.length === 0) {
        showError("Nenhum dado válido para processar.");
        return;
    }

    const finalCsv = [header, ...rows].join('\n');
    onProcess(finalCsv);
  };

  return (
    <Card className="shadow-soft-sm border-gray-200 rounded-xl p-4">
      <CardContent className="p-0 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {requiredColumns.map(col => (
            <div key={col} className="space-y-2">
              <label className="text-sm font-medium text-gray-700 capitalize">
                {col.replace(/_/g, ' ')}
              </label>
              <Textarea
                value={columnInputs[col]}
                onChange={(e) => handleInputChange(col, e.target.value)}
                placeholder={`Cole a coluna "${col.replace(/_/g, ' ')}" aqui...`}
                rows={10}
                className="min-h-[200px] font-mono text-xs border-gray-300 focus:border-highlight focus:ring-highlight shadow-inner"
                disabled={isLoading}
              />
            </div>
          ))}
        </div>
        <Button 
          onClick={handleProcess} 
          disabled={isLoading}
          className="bg-highlight hover:bg-highlight/90 w-full mt-4"
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

export default ColumnarCsvInput;
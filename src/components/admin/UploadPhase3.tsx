import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { saveUploadRecord } from '@/utils/uploadHistory';
import { showSuccess, showError } from '@/utils/toast';
import ColumnarCsvInput from '@/components/admin/ColumnarCsvInput';
import Papa from 'papaparse';
import { processMenuItemUpload } from '@/integrations/supabase/adminMenu';
import { ScrollArea } from '@/components/ui/scroll-area';

// Helper para parsear preços em diferentes formatos (PT-BR, US, com R$, etc)
const parsePrice = (value: any): number => {
  if (typeof value === 'number') return value;
  if (!value) return NaN;
  
  let str = String(value).trim();
  
  // Remove R$ e espaços extras
  str = str.replace(/^R\$\s?/, '').trim();
  
  // Se tiver apenas vírgula, assume que é decimal (formato BR simples: 10,50)
  if (str.includes(',') && !str.includes('.')) {
    str = str.replace(',', '.');
  } 
  // Se tiver ponto e vírgula (ex: 1.000,00 ou 1,000.00)
  else if (str.includes(',') && str.includes('.')) {
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    
    if (lastComma > lastDot) {
      // Formato BR: 1.000,00 -> Remove pontos, substitui vírgula por ponto
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato US: 1,000.00 -> Remove vírgulas
      str = str.replace(/,/g, '');
    }
  }
  
  return parseFloat(str);
};

const UploadPhase3: React.FC<UploadPhase3Props> = ({ onNext }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [detailedErrors, setDetailedErrors] = useState<string[]>([]);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const handleProcessCsv = async (csvData: string) => {
    setIsProcessing(true);
    setProgress(null);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    setDetailedErrors([]);

    try {
      const { data, errors: parseErrors } = Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
      });

      if (parseErrors.length > 0) {
        parseErrors.forEach(err => errors.push(`Erro de parseamento: ${err.message}`));
        showError('Erros ao parsear o CSV. Verifique o log abaixo para detalhes.');
        console.error('CSV Parse Errors:', parseErrors);
        setDetailedErrors(errors);
        setIsProcessing(false);
        return;
      }

      const rows = data as any[];
      const totalRows = rows.length;
      setProgress({ current: 0, total: totalRows });

      for (let i = 0; i < totalRows; i++) {
        const row = rows[i];
        const { external_url, category_name, item_name, price, description, image_url } = row;

        // Atualiza progresso
        setProgress({ current: i + 1, total: totalRows });

        if (!external_url || !category_name || !item_name || !price) {
          errors.push(`Linha ${i + 1} ignorada por dados incompletos: ${JSON.stringify(row)}`);
          errorCount++;
          continue;
        }

        const parsedPrice = parsePrice(price);
        if (isNaN(parsedPrice)) {
          errors.push(`Linha ${i + 1}: Preço inválido '${price}' para o item '${item_name}'.`);
          errorCount++;
          continue;
        }

        // Invoca a Edge Function para processar o item de menu
        const result = await processMenuItemUpload({
          external_url,
          category_name,
          item_name,
          price: parsedPrice,
          description: description || null,
          image_url: image_url || null,
        });

        if (result.success) {
          successCount++;
        } else {
          errors.push(`Falha ao processar item '${item_name}' (Linha ${i + 1}): ${result.error || 'Erro desconhecido.'}`);
          errorCount++;
        }
      }

      if (successCount > 0) {
        showSuccess(`Fase 3 concluída! ${successCount} itens de menu processados com sucesso.`);
      }
      if (errorCount > 0) {
        showError(`Fase 3 concluída com ${errorCount} erros. Verifique o log abaixo para detalhes.`);
        console.error('Fase 3 - Erros detalhados:', errors);
      }
      
      saveUploadRecord({
        phase: 3,
        successCount: successCount,
        details: `Upload de ${successCount} itens de menu processados. ${errorCount} erros.`,
      });

    } catch (error) {
      console.error('Erro geral no processamento da Fase 3:', error);
      showError('Ocorreu um erro inesperado durante o processamento da Fase 3.');
      errors.push(`Erro inesperado: ${(error as Error).message}`);
      errorCount++;
    } finally {
      setDetailedErrors(errors);
      setIsProcessing(false);
      setProgress(null);
    }
  };

  return (
    <Card className="shadow-soft-lg border-none rounded-xl bg-white">
      <CardHeader>
        <CardTitle className="text-xl text-primary">Fase 3: Cardápios e Itens</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">
          Cole os dados do cardápio, uma coluna de cada vez. Use o <code>external_url</code> como chave de referência. O sistema criará categorias e itens automaticamente.
          As colunas esperadas são: <code>external_url</code>, <code>category_name</code>, <code>item_name</code>, <code>price</code>, <code>description</code>, <code>image_url</code>.
        </p>
        
        <ColumnarCsvInput
          onProcess={handleProcessCsv}
          isLoading={isProcessing}
          buttonText={progress ? `Processando ${progress.current}/${progress.total}...` : "Processar e Salvar Cardápios"}
          requiredColumns={REQUIRED_COLUMNS_PHASE3}
        />

        {detailedErrors.length > 0 && (
          <div className="mt-6 p-4 border border-red-300 bg-red-50 rounded-md">
            <h3 className="text-lg font-semibold text-red-700 mb-2">Detalhes dos Erros:</h3>
            <ScrollArea className="h-48 w-full rounded-md border p-4 bg-white">
              <ul className="list-disc list-inside text-sm text-red-600">
                {detailedErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UploadPhase3;
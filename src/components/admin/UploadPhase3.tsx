import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { saveUploadRecord } from '@/utils/uploadHistory';
import { showSuccess, showError } from '@/utils/toast';
import ColumnarCsvInput from '@/components/admin/ColumnarCsvInput';
import Papa from 'papaparse';
import { processMenuItemUpload } from '@/integrations/supabase/adminMenu';
import { ScrollArea } from '@/components/ui/scroll-area';

// Colunas obrigatórias para a Fase 3: Cardápios e Itens
const REQUIRED_COLUMNS_PHASE3 = ['external_url', 'category_name', 'item_name', 'price', 'description', 'image_url'];

const UploadPhase3: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [detailedErrors, setDetailedErrors] = useState<string[]>([]);

  const handleProcessCsv = async (csvData: string) => {
    setIsProcessing(true);
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

      for (const row of data as any[]) {
        const { external_url, category_name, item_name, price, description, image_url } = row;

        if (!external_url || !category_name || !item_name || !price) {
          errors.push(`Linha ignorada por dados incompletos: ${JSON.stringify(row)}`);
          errorCount++;
          continue;
        }

        // Invoca a Edge Function para processar o item de menu
        const result = await processMenuItemUpload({
          external_url,
          category_name,
          item_name,
          price: parseFloat(String(price).replace(',', '.')),
          description: description || null,
          image_url: image_url || null,
        });

        if (result.success) {
          successCount++;
        } else {
          errors.push(`Falha ao processar item '${item_name}' para a categoria '${category_name}' do restaurante ${external_url}. Detalhes: ${result.error || 'Erro desconhecido da Edge Function.'}`);
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
    }
  };

  return (
    <Card className="shadow-none border-none rounded-2xl bg-white">
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
          buttonText="Processar e Salvar Cardápios"
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
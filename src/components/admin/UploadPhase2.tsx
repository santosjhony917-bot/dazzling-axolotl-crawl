import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { saveUploadRecord } from '@/utils/uploadHistory';
import { showSuccess, showError } from '@/utils/toast';
import ColumnarCsvInput from '@/components/admin/ColumnarCsvInput';
import { bulkCreateRestaurants } from '@/integrations/supabase/edgeFunctions';

// Colunas obrigatórias para a Fase 2: Endereços e Localização
const REQUIRED_COLUMNS_PHASE2 = ['external_url', 'cep', 'address', 'number', 'neighborhood', 'city', 'state'];

const UploadPhase2: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadHistory, setUploadHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const requiredColumns = ['external_url', 'address', 'number', 'neighborhood', 'city', 'state', 'cep'];

  const handleProcessCsv = async (csvData: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('bulk-create-restaurants', {
        body: { csvData },
      });

      if (error) {
        showError(`Erro ao processar CSV: ${error.message}`);
        console.error('Edge Function Error:', error);
        setUploadHistory(prev => [...prev, { status: 'failed', message: `Erro ao processar CSV: ${error.message}` }]);
      } else {
        showSuccess(`Fase 2 concluída! ${data.successCount} registros processados. ${data.errors.length > 0 ? `${data.errors.length} erros.` : ''}`);
        if (data.errors.length > 0) {
          console.error('Erros no processamento da Edge Function:', data.errors);
        }
        setUploadHistory(prev => [...prev, { status: 'success', message: `Fase 2 concluída! ${data.successCount} registros processados.` }]);
        onNext();
      }
    } catch (error) {
      showError(`Erro inesperado: ${error.message}`);
      console.error('Unexpected error:', error);
      setUploadHistory(prev => [...prev, { status: 'failed', message: `Erro inesperado: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Fase 2: Endereços e Localização</h2>
      <p className="text-gray-600">
        Cole os dados de endereço dos restaurantes nas colunas correspondentes. A coluna "External URL" é obrigatória para cada registro.
      </p>
      <ColumnarCsvInput
        onProcess={handleProcessCsv}
        isLoading={isLoading}
        buttonText="Processar e Salvar Endereços"
        requiredColumns={requiredColumns}
        primaryKeyColumn="external_url" // Especificando external_url como coluna chave
      />
      <UploadHistory history={uploadHistory} />
    </div>
  );
};

export default UploadPhase2;
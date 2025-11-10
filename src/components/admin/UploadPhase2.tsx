import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { saveUploadRecord } from '@/utils/uploadHistory';
import { showSuccess, showError } from '@/utils/toast';
import ColumnarCsvInput from '@/components/admin/ColumnarCsvInput';
import { bulkUpdateRestaurantAddress } from '@/integrations/supabase/edgeFunctions';
import { supabase } from '@/integrations/supabase/client';
import UploadHistory from '@/components/admin/UploadHistory';

// Colunas obrigatórias para a Fase 2: Endereços e Localização
const REQUIRED_COLUMNS_PHASE2 = ['external_url', 'cep', 'address', 'number', 'neighborhood', 'city', 'state'];

interface UploadPhase2Props {
  onNext: () => void;
}

const UploadPhase2: React.FC<UploadPhase2Props> = ({ onNext }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadHistory, setUploadHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const requiredColumns = ['external_url', 'address', 'number', 'neighborhood', 'city', 'state', 'cep'];

  const handleProcessCsv = async (csvData: string) => {
    setIsLoading(true);
    try {
      const { successCount, message, errors } = await bulkUpdateRestaurantAddress(csvData);

      const details = `Fase 2 concluída! ${successCount} registros processados. ${errors && errors.length > 0 ? `${errors.length} erros.` : ''}`;
      showSuccess(details);
      if (errors && errors.length > 0) {
        console.error('Erros no processamento da Edge Function:', errors);
      }
      // Salva o registro de sucesso (ou sucesso parcial com erros) no histórico
      saveUploadRecord({
        phase: 2,
        successCount: successCount,
        details: details,
        error: errors && errors.length > 0,
        errors: errors && errors.length > 0 ? errors.map((err: any) => JSON.stringify(err)) : undefined, // Converte erros para string
      });
      setUploadHistory(prev => [...prev, { status: 'success', message: details }]);
      onNext();
    } catch (error: any) {
      showError(`Erro inesperado: ${error.message}`);
      console.error('Unexpected error:', error);
      // Salva o registro de erro inesperado no histórico
      saveUploadRecord({
        phase: 2,
        successCount: 0,
        details: `Erro inesperado: ${error.message}`,
        error: true,
        errors: [error.message], // Adiciona a mensagem de erro detalhada
      });
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
        primaryKeyColumn="external_url"
      />
      <UploadHistory />
    </div>
  );
};

export default UploadPhase2;
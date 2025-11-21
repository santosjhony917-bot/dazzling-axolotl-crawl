import React, { useState } from 'react';
import { saveUploadRecord } from '@/utils/uploadHistory';
import { showSuccess, showError } from '@/utils/toast';
import ColumnarCsvInput from '@/components/admin/ColumnarCsvInput';
import { bulkUpdateRestaurantAddress } from '@/integrations/supabase/edgeFunctions';
import UploadHistory from '@/components/admin/UploadHistory';

// Colunas obrigatórias para a Fase 2: Endereços e Localização

interface UploadPhase2Props {
  onNext: () => void;
}

const UploadPhase2: React.FC<UploadPhase2Props> = ({ onNext }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadHistory, setUploadHistory] = useState<any[]>([]);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [overallSuccessCount, setOverallSuccessCount] = useState(0);
  const [overallErrors, setOverallErrors] = useState<string[]>([]);

  const requiredColumns = ['external_url', 'address', 'number', 'neighborhood', 'city', 'state', 'cep'];

  const handleProcessCsv = async (fullCsvData: string) => {
    setIsLoading(true);
    setOverallSuccessCount(0);
    setOverallErrors([]);
    setTotalBatches(0);
    setCurrentBatch(0);

    try {
      const lines = fullCsvData.split('\n').filter(line => line.trim() !== '');
      if (lines.length <= 1) { // Only header or empty
        showError("Nenhum dado válido para processar.");
        setIsLoading(false);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const records = lines.slice(1).map(line => {
        const record: { [key: string]: string } = {};
        const values = line.split(',');
        headers.forEach((header, index) => {
          record[header] = values[index] ? values[index].trim() : '';
        });
        return record;
      });

      const BATCH_SIZE = 100; // Define o tamanho do lote
      const chunks = [];
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        chunks.push(records.slice(i, i + BATCH_SIZE));
      }
      setTotalBatches(chunks.length);

      let currentSuccess = 0;
      let currentErrors: string[] = [];

      for (let i = 0; i < chunks.length; i++) {
        setCurrentBatch(i + 1);
        const chunk = chunks[i];

        // Converte o lote de volta para uma string CSV
        const chunkCsv = [
          headers.join(','),
          ...chunk.map(record => headers.map(h => record[h]).join(','))
        ].join('\n');

        try {
          const { successCount, errors } = await bulkUpdateRestaurantAddress(chunkCsv);
          currentSuccess += successCount;
          if (errors) {
            currentErrors = currentErrors.concat(errors);
          }
        } catch (batchError: any) {
          currentErrors.push(`Erro no lote ${i + 1}: ${batchError.message}`);
          console.error(`Erro no lote ${i + 1}:`, batchError);
        }
      }

      const finalDetails = `Processamento em lotes concluído. ${currentSuccess} registros atualizados com sucesso. ${currentErrors.length > 0 ? `${currentErrors.length} erros.` : ''}`;
      if (currentErrors.length > 0) {
        showError(finalDetails);
      } else {
        showSuccess(finalDetails);
      }

      saveUploadRecord({
        phase: 2,
        successCount: currentSuccess,
        details: finalDetails,
        error: currentErrors.length > 0,
        errors: currentErrors,
      });
      setUploadHistory(prev => [...prev, { status: currentErrors.length > 0 ? 'failed' : 'success', message: finalDetails }]);
      onNext();

    } catch (error: any) {
      showError(`Erro inesperado durante o processamento em lotes: ${error.message}`);
      console.error('Unexpected error during batch processing:', error);
      saveUploadRecord({
        phase: 2,
        successCount: 0,
        details: `Erro inesperado durante o processamento em lotes: ${error.message}`,
        error: true,
        errors: [error.message],
      });
      setUploadHistory(prev => [...prev, { status: 'failed', message: `Erro inesperado: ${error.message}` }]);
    } finally {
      setIsLoading(false);
      setCurrentBatch(0);
      setTotalBatches(0);
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
        buttonText={
          isLoading
            ? totalBatches > 0
              ? `Processando lote ${currentBatch} de ${totalBatches}...`
              : "Processando..."
            : "Processar e Salvar Endereços"
        }
        requiredColumns={requiredColumns}
        primaryKeyColumn="external_url"
      />
      <UploadHistory />
    </div>
  );
};

export default UploadPhase2;
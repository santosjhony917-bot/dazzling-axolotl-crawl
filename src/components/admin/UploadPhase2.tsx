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

  const handleProcessCsv = async (csvData: string) => {
    setIsProcessing(true);
    
    try {
      const result = await bulkCreateRestaurants(csvData);
      saveUploadRecord({
        phase: 2,
        successCount: result.successCount,
        details: `Upload de ${result.successCount} endereços processado. ${result.errors && result.errors.length > 0 ? `${result.errors.length} erros.` : ''}`,
      });
      showSuccess(`Fase 2 concluída! ${result.successCount} registros processados. ${result.errors && result.errors.length > 0 ? `Verifique os ${result.errors.length} erros no console.` : ''}`);
      if (result.errors && result.errors.length > 0) {
        console.error("Erros durante o processamento da Fase 2:", result.errors);
      }
    } catch (error: any) {
      console.error("Erro ao processar CSV da Fase 2:", error);
      showError(`Falha na Fase 2: ${error.message || "Ocorreu um erro desconhecido."}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="shadow-soft-lg border-none rounded-xl bg-white">
      <CardHeader>
        <CardTitle className="text-xl text-primary">Fase 2: Endereços e Localização</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">
          Cole os dados de endereço, uma coluna de cada vez. Use o <code>external_url</code> como chave de referência. O sistema tentará geocodificar as coordenadas.
        </p>
        
        <ColumnarCsvInput
          onProcess={handleProcessCsv}
          isLoading={isProcessing}
          buttonText="Processar e Salvar Endereços"
          requiredColumns={REQUIRED_COLUMNS_PHASE2}
        />
      </CardContent>
    </Card>
  );
};

export default UploadPhase2;
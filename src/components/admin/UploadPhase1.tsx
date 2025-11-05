import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { saveUploadRecord } from '@/utils/uploadHistory';
import { showSuccess, showError } from '@/utils/toast';
import ColumnarCsvInput from '@/components/admin/ColumnarCsvInput';
import { bulkCreateRestaurants } from '@/integrations/supabase/edgeFunctions';

// Colunas obrigatórias para a Fase 1: Criação Base
const REQUIRED_COLUMNS_PHASE1 = ['external_url', 'name', 'category', 'image_url'];

const UploadPhase1: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcessCsv = async (csvData: string) => {
    setIsProcessing(true);
    try {
      const { successCount, message } = await bulkCreateRestaurants(csvData);

      saveUploadRecord({
        phase: 1,
        successCount: successCount,
        details: message,
      });
      showSuccess(`Fase 1 concluída! ${successCount} registros processados.`);

    } catch (error: any) {
      console.error("Erro ao processar o upload da Fase 1:", error);
      const errorMessage = error.message || "Ocorreu um erro desconhecido.";
      showError(errorMessage);
      saveUploadRecord({
        phase: 1,
        successCount: 0,
        details: `Falha no upload: ${errorMessage}`,
        error: true,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="shadow-soft-lg border-none rounded-xl bg-white">
      <CardHeader>
        <CardTitle className="text-xl text-primary">Fase 1: Criação Base (ID, Nome, Categoria, Logo)</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">
          Cole os dados mínimos para criar o registro do restaurante, uma coluna de cada vez. O <code>external_url</code> será usado como chave de referência nas próximas fases.
        </p>
        
        <ColumnarCsvInput
          onProcess={handleProcessCsv}
          isLoading={isProcessing}
          buttonText="Processar e Criar Registros Base"
          requiredColumns={REQUIRED_COLUMNS_PHASE1}
        />
      </CardContent>
    </Card>
  );
};

export default UploadPhase1;
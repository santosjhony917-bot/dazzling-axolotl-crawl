import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { saveUploadRecord } from '@/utils/uploadHistory';
import { showSuccess } from '@/utils/toast';
import ColumnarCsvInput from '@/components/admin/ColumnarCsvInput';

// Colunas obrigatórias para a Fase 4: Horários
const REQUIRED_COLUMNS_PHASE4 = ['external_url', 'day', 'open_time', 'close_time'];

interface UploadPhase4Props {
  onNext?: () => void;
}

const UploadPhase4: React.FC<UploadPhase4Props> = ({ onNext }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcessCsv = (csvData: string) => {
    setIsProcessing(true);
    
    // Simulação de processamento de dados
    const lines = csvData.trim().split('\n');
    const dataRows = lines.slice(1);
    const successCount = dataRows.length;

    setTimeout(() => {
      // Simulação de sucesso no upload
      saveUploadRecord({
        phase: 4,
        successCount: successCount,
        details: `Upload de ${successCount} horários processado.`,
      });
      showSuccess(`Fase 4 concluída! ${successCount} registros processados.`);
      setIsProcessing(false);
    }, 1500);
  };

  return (
    <Card className="shadow-soft-lg border-none rounded-xl bg-white">
      <CardHeader>
        <CardTitle className="text-xl text-primary">Fase 4: Horários de Funcionamento</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">
          Cole os horários de funcionamento, uma coluna de cada vez. Use o <code>external_url</code> como chave de referência. Use 'monday', 'tuesday', etc., para os dias da semana.
        </p>
        
        <ColumnarCsvInput
          onProcess={handleProcessCsv}
          isLoading={isProcessing}
          buttonText="Processar e Salvar Horários"
          requiredColumns={REQUIRED_COLUMNS_PHASE4}
        />
      </CardContent>
    </Card>
  );
};

export default UploadPhase4;
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Clock } from 'lucide-react';
import { saveUploadRecord } from '@/utils/uploadHistory';
import { showError, showSuccess } from '@/utils/toast';
import CsvInputArea from '@/components/admin/CsvInputArea';

// Colunas obrigatórias para a Fase 4: Horários
const REQUIRED_COLUMNS_PHASE4 = ['restaurant_name', 'day', 'open_time', 'close_time'];

const UploadPhase4: React.FC = () => {
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

  const placeholder = `restaurant_name,day,open_time,close_time
Restaurante A,monday,09:00,18:00
Restaurante A,tuesday,09:00,18:00
Restaurante B,friday,18:00,23:00
Restaurante B,saturday,18:00,23:00`;

  return (
    <Card className="shadow-soft-lg border-none rounded-xl bg-white">
      <CardHeader>
        <CardTitle className="text-xl text-primary">Fase 4: Horários de Funcionamento</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">
          Cole os horários de funcionamento. Use 'monday', 'tuesday', etc., para os dias da semana.
        </p>
        
        <CsvInputArea
          onProcess={handleProcessCsv}
          isLoading={isProcessing}
          placeholder={placeholder}
          buttonText="Processar e Salvar Horários"
          requiredColumns={REQUIRED_COLUMNS_PHASE4}
        />
      </CardContent>
    </Card>
  );
};

export default UploadPhase4;
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { saveUploadRecord } from '@/utils/uploadHistory';
import { showSuccess } from '@/utils/toast';
import ColumnarCsvInput from '@/components/admin/ColumnarCsvInput';

// Colunas obrigatórias para a Fase 3: Cardápios e Itens
const REQUIRED_COLUMNS_PHASE3 = ['external_url', 'category_name', 'item_name', 'price', 'description', 'image_url'];

const UploadPhase3: React.FC = () => {
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
        phase: 3,
        successCount: successCount,
        details: `Upload de ${successCount} itens de menu processado.`,
      });
      showSuccess(`Fase 3 concluída! ${successCount} itens processados.`);
      setIsProcessing(false);
    }, 1500);
  };

  return (
    <Card className="shadow-soft-lg border-none rounded-xl bg-white">
      <CardHeader>
        <CardTitle className="text-xl text-primary">Fase 3: Cardápios e Itens</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">
          Cole os dados do cardápio, uma coluna de cada vez. Use o <code>external_url</code> como chave de referência. O sistema criará categorias e itens automaticamente.
        </p>
        
        <ColumnarCsvInput
          onProcess={handleProcessCsv}
          isLoading={isProcessing}
          buttonText="Processar e Salvar Cardápios"
          requiredColumns={REQUIRED_COLUMNS_PHASE3}
        />
      </CardContent>
    </Card>
  );
};

export default UploadPhase3;
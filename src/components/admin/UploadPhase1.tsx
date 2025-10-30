import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Upload } from 'lucide-react';
import { saveUploadRecord } from '@/utils/uploadHistory';
import { showError, showSuccess } from '@/utils/toast';
import CsvInputArea from '@/components/admin/CsvInputArea';

// Colunas obrigatórias para a Fase 1: Criação Base
const REQUIRED_COLUMNS_PHASE1 = ['external_url', 'name', 'category', 'image_url'];

const UploadPhase1: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcessCsv = (csvData: string) => {
    setIsProcessing(true);
    
    // Simulação de processamento de dados
    const lines = csvData.trim().split('\n');
    const dataRows = lines.slice(1); // Ignora o cabeçalho
    const successCount = dataRows.length;

    setTimeout(() => {
      // Simulação de sucesso no upload
      saveUploadRecord({
        phase: 1,
        successCount: successCount,
        details: `Upload de ${successCount} restaurantes (Criação Base) processado.`,
      });
      showSuccess(`Fase 1 concluída! ${successCount} registros processados.`);
      setIsProcessing(false);
    }, 1500);
  };

  const placeholder = `external_url,name,category,image_url
https://restaurantea.com.br,Restaurante A,Pizzaria,https://link.com/logoA.jpg
https://restauranteb.com.br,Restaurante B,Hamburgueria,https://link.com/logoB.jpg`;

  return (
    <Card className="shadow-soft-lg border-none rounded-xl bg-white">
      <CardHeader>
        <CardTitle className="text-xl text-primary">Fase 1: Criação Base (ID, Nome, Categoria, Logo)</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">
          Cole os dados mínimos para criar o registro do restaurante. O <code>external_url</code> será usado como chave de referência nas próximas fases.
        </p>
        
        <CsvInputArea
          onProcess={handleProcessCsv}
          isLoading={isProcessing}
          placeholder={placeholder}
          buttonText="Processar e Criar Registros Base"
          requiredColumns={REQUIRED_COLUMNS_PHASE1}
        />
      </CardContent>
    </Card>
  );
};

export default UploadPhase1;
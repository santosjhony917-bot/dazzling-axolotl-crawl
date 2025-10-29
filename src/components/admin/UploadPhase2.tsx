import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MapPin } from 'lucide-react';
import { saveUploadRecord } from '@/utils/uploadHistory';
import { showError, showSuccess } from '@/utils/toast';
import CsvInputArea from '@/components/admin/CsvInputArea';

// Colunas obrigatórias para a Fase 2: Endereços e Localização
const REQUIRED_COLUMNS_PHASE2 = ['name', 'cep', 'address', 'number', 'neighborhood', 'city', 'state'];

const UploadPhase2: React.FC = () => {
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
        phase: 2,
        successCount: successCount,
        details: `Upload de ${successCount} endereços processado.`,
      });
      showSuccess(`Fase 2 concluída! ${successCount} registros processados.`);
      setIsProcessing(false);
    }, 1500);
  };

  const placeholder = `name,cep,address,number,neighborhood,city,state
Restaurante A,58039-000,Rua Exemplo,100,Tambaú,João Pessoa,PB
Restaurante B,58040-100,Av. Principal,250,Centro,Campina Grande,PB`;

  return (
    <Card className="shadow-soft-lg border-none rounded-xl bg-white">
      <CardHeader>
        <CardTitle className="text-xl text-primary">Fase 2: Endereços e Localização</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">
          Cole os dados de endereço. O sistema tentará geocodificar as coordenadas (latitude/longitude) automaticamente.
        </p>
        
        <CsvInputArea
          onProcess={handleProcessCsv}
          isLoading={isProcessing}
          placeholder={placeholder}
          buttonText="Processar e Salvar Endereços"
          requiredColumns={REQUIRED_COLUMNS_PHASE2}
        />
      </CardContent>
    </Card>
  );
};

export default UploadPhase2;
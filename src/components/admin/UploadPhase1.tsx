import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Upload } from 'lucide-react';
import { saveUploadRecord } from '@/utils/uploadHistory';
import { showError, showSuccess } from '@/utils/toast';
import CsvInputArea from '@/components/admin/CsvInputArea';

// Colunas obrigatórias para a Fase 1: Informações Gerais
const REQUIRED_COLUMNS_PHASE1 = ['name', 'email', 'phone', 'cnpj', 'category', 'plan', 'external_url'];

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
        details: `Upload de ${successCount} restaurantes (Info Gerais) processado.`,
      });
      showSuccess(`Fase 1 concluída! ${successCount} registros processados.`);
      setIsProcessing(false);
    }, 1500);
  };

  const placeholder = `name,email,phone,cnpj,category,plan,external_url
Restaurante A,a@exemplo.com,(83) 99999-9999,12345678000190,Pizzaria,premium,https://restaurantea.com.br
Restaurante B,b@exemplo.com,(83) 88888-8888,98765432000190,Hamburgueria,free,https://restauranteb.com.br`;

  return (
    <Card className="shadow-soft-lg border-none rounded-xl bg-white">
      <CardHeader>
        <CardTitle className="text-xl text-primary">Fase 1: Informações Gerais</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">
          Cole os dados básicos dos restaurantes. Certifique-se de que as colunas obrigatórias (name, email, phone, cnpj, category, plan, external_url) estão presentes.
        </p>
        
        <CsvInputArea
          onProcess={handleProcessCsv}
          isLoading={isProcessing}
          placeholder={placeholder}
          buttonText="Processar e Salvar Informações Gerais"
          requiredColumns={REQUIRED_COLUMNS_PHASE1}
        />
      </CardContent>
    </Card>
  );
};

export default UploadPhase1;
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Phone, Crown } from 'lucide-react';
import { saveUploadRecord } from '@/utils/uploadHistory';
import { showError, showSuccess } from '@/utils/toast';
import CsvInputArea from '@/components/admin/CsvInputArea';

// Colunas obrigatórias para a Nova Fase 3: Contatos e Plano
const REQUIRED_COLUMNS_PHASE3_CONTACTS = ['external_url', 'email', 'phone', 'cnpj', 'plan', 'whatsapp_url', 'ifood_url'];

const UploadPhase3Contacts: React.FC = () => {
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
        details: `Upload de ${successCount} contatos e planos processado.`,
      });
      showSuccess(`Fase 3 concluída! ${successCount} registros processados.`);
      setIsProcessing(false);
    }, 1500);
  };

  const placeholder = `external_url,email,phone,cnpj,plan,whatsapp_url,ifood_url
https://restaurantea.com.br,a@exemplo.com,(83) 99999-9999,12345678000190,premium,https://wa.me/5583999999999,https://ifood.com/a
https://restauranteb.com.br,b@exemplo.com,(83) 88888-8888,98765432000190,free,,`;

  return (
    <Card className="shadow-soft-lg border-none rounded-xl bg-white">
      <CardHeader>
        <CardTitle className="text-xl text-primary">Fase 3: Links e Dados Administrativos</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">
          Cole os dados de contato, CNPJ e o plano de assinatura. Estes dados podem ser preenchidos pelo Admin para completar o perfil, mas o proprietário pode alterá-los após a reivindicação. Use o <code>external_url</code> como chave de referência.
        </p>
        
        <CsvInputArea
          onProcess={handleProcessCsv}
          isLoading={isProcessing}
          placeholder={placeholder}
          buttonText="Processar e Salvar Links/Admin"
          requiredColumns={REQUIRED_COLUMNS_PHASE3_CONTACTS}
        />
      </CardContent>
    </Card>
  );
};

export default UploadPhase3Contacts;
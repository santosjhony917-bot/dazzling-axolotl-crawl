import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UtensilsCrossed } from 'lucide-react';
import { saveUploadRecord } from '@/utils/uploadHistory';
import { showError, showSuccess } from '@/utils/toast';
import CsvInputArea from '@/components/admin/CsvInputArea';

// Colunas obrigatórias para a Fase 4: Cardápios e Itens
const REQUIRED_COLUMNS_PHASE4 = ['external_url', 'category_name', 'item_name', 'price', 'description', 'image_url'];

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
        details: `Upload de ${successCount} itens de menu processado.`,
      });
      showSuccess(`Fase 4 concluída! ${successCount} itens processados.`);
      setIsProcessing(false);
    }, 1500);
  };

  const placeholder = `external_url,category_name,item_name,price,description,image_url
https://restaurantea.com.br,Pizzas,Pizza Calabresa,39.90,Mussarela e calabresa,https://link.com/pizza.jpg
https://restaurantea.com.br,Bebidas,Refrigerante Lata,5.00,Coca-cola 350ml,https://link.com/refri.jpg
https://restauranteb.com.br,Sanduíches,X-Bacon,25.00,Pão, carne, queijo e bacon,https://link.com/xbacon.jpg`;

  return (
    <Card className="shadow-soft-lg border-none rounded-xl bg-white">
      <CardHeader>
        <CardTitle className="text-xl text-primary">Fase 4: Cardápios e Itens</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">
          Cole os dados do cardápio. Use o <code>external_url</code> como chave de referência. O sistema criará categorias e itens automaticamente.
        </p>
        
        <CsvInputArea
          onProcess={handleProcessCsv}
          isLoading={isProcessing}
          placeholder={placeholder}
          buttonText="Processar e Salvar Cardápios"
          requiredColumns={REQUIRED_COLUMNS_PHASE4}
        />
      </CardContent>
    </Card>
  );
};

export default UploadPhase4;
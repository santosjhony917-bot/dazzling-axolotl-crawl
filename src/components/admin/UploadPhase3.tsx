import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { saveUploadRecord } from '@/utils/uploadHistory';
import { showSuccess, showError } from '@/utils/toast';
import ColumnarCsvInput from '@/components/admin/ColumnarCsvInput';
import Papa from 'papaparse';
import { getRestaurantIdByExternalUrl, findOrCreateMenuCategory, insertMenuItem } from '@/integrations/supabase/adminMenu';
import { MenuItem } from '@/types/supabase';

// Colunas obrigatórias para a Fase 3: Cardápios e Itens
const REQUIRED_COLUMNS_PHASE3 = ['external_url', 'category_name', 'item_name', 'price', 'description', 'image_url'];

const UploadPhase3: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcessCsv = async (csvData: string) => {
    setIsProcessing(true);
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    try {
      const { data, errors: parseErrors } = Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
      });

      if (parseErrors.length > 0) {
        parseErrors.forEach(err => errors.push(`Erro de parseamento: ${err.message}`));
        showError('Erros ao parsear o CSV. Verifique o console para detalhes.');
        console.error('CSV Parse Errors:', parseErrors);
        setIsProcessing(false);
        return;
      }

      for (const row of data as any[]) {
        const { external_url, category_name, item_name, price, description, image_url } = row;

        if (!external_url || !category_name || !item_name || !price) {
          errors.push(`Linha ignorada por dados incompletos: ${JSON.stringify(row)}`);
          errorCount++;
          continue;
        }

        const restaurantId = await getRestaurantIdByExternalUrl(external_url);
        if (!restaurantId) {
          errors.push(`Restaurante não encontrado para external_url: ${external_url}`);
          errorCount++;
          continue;
        }

        const categoryId = await findOrCreateMenuCategory(restaurantId, category_name);
        if (!categoryId) {
          errors.push(`Falha ao encontrar ou criar categoria '${category_name}' para o restaurante ${restaurantId}`);
          errorCount++;
          continue;
        }

        const menuItem: Omit<MenuItem, 'id' | 'created_at'> = {
          category_id: categoryId,
          name: item_name,
          price: parseFloat(price),
          description: description || null,
          image_url: image_url || null,
          order_index: 0, // Pode ser ajustado se houver uma coluna para isso
          is_active: true,
        };

        const insertedItem = await insertMenuItem(menuItem);
        if (insertedItem) {
          successCount++;
        } else {
          errors.push(`Falha ao inserir item '${item_name}' para a categoria ${category_name}`);
          errorCount++;
        }
      }

      if (successCount > 0) {
        showSuccess(`Fase 3 concluída! ${successCount} itens de menu processados com sucesso.`);
      }
      if (errorCount > 0) {
        showError(`Fase 3 concluída com ${errorCount} erros. Verifique o console para detalhes.`);
        console.error('Fase 3 - Erros detalhados:', errors);
      }
      
      saveUploadRecord({
        phase: 3,
        successCount: successCount,
        details: `Upload de ${successCount} itens de menu processados. ${errorCount} erros.`,
      });

    } catch (error) {
      console.error('Erro geral no processamento da Fase 3:', error);
      showError('Ocorreu um erro inesperado durante o processamento da Fase 3.');
      errors.push(`Erro inesperado: ${(error as Error).message}`);
      errorCount++;
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="shadow-soft-lg border-none rounded-xl bg-white">
      <CardHeader>
        <CardTitle className="text-xl text-primary">Fase 3: Cardápios e Itens</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">
          Cole os dados do cardápio, uma coluna de cada vez. Use o <code>external_url</code> como chave de referência. O sistema criará categorias e itens automaticamente.
          As colunas esperadas são: <code>external_url</code>, <code>category_name</code>, <code>item_name</code>, <code>price</code>, <code>description</code>, <code>image_url</code>.
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
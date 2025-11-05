import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { saveUploadRecord } from '@/utils/uploadHistory';
import { showSuccess, showError } from '@/utils/toast';
import ColumnarCsvInput from '@/components/admin/ColumnarCsvInput';
import Papa from 'papaparse';
import { bulkInsertRestaurants, RestaurantInsertPayload } from '@/integrations/supabase/adminFunctions';

// Colunas obrigatórias para a Fase 1: Criação Base
const REQUIRED_COLUMNS_PHASE1 = ['external_url', 'name', 'category', 'image_url'];

const UploadPhase1: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcessCsv = async (csvData: string) => {
    setIsProcessing(true);
    try {
      const parsed = Papa.parse<Record<string, string>>(csvData, {
        header: true,
        skipEmptyLines: true,
      });

      const restaurantsToInsert: RestaurantInsertPayload[] = parsed.data.map(row => ({
        external_url: row.external_url || null,
        name: row.name,
        category: row.category || null,
        image_url: row.image_url || null,
        plan: 'free', // Default plan
        visit_status: 'Pendente', // Default status
      }));

      if (restaurantsToInsert.length === 0) {
        showError("Nenhum dado válido para processar.");
        return;
      }

      const result = await bulkInsertRestaurants(restaurantsToInsert);
      
      saveUploadRecord({
        phase: 1,
        successCount: result.length,
        details: `Upload de ${result.length} restaurantes (Criação Base) concluído.`,
      });
      showSuccess(`Fase 1 concluída! ${result.length} registros criados no banco de dados.`);

    } catch (error: any) {
      showError(`Falha no upload: ${error.message}`);
      console.error("Failed to process CSV for Phase 1:", error);
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
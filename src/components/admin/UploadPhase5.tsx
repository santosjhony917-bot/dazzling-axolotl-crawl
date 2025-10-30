import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

interface Phase5Data {
  restaurant_id: string | null;
}

interface UploadPhase5Props {
  onNext: (data: Phase5Data) => void;
  initialData: any; // Recebe todos os dados das fases anteriores
  onReset: () => void;
}

const UploadPhase5: React.FC<UploadPhase5Props> = ({ onNext, initialData, onReset }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Inserir Restaurante
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .insert({
          name: initialData.name,
          category: initialData.category,
          external_url: initialData.external_url,
          description: initialData.description,
          address: initialData.address,
          latitude: initialData.latitude,
          longitude: initialData.longitude,
          // user_id é nulo por padrão, ou pode ser definido se o admin estiver logado
        })
        .select('id')
        .single();

      if (restaurantError) throw restaurantError;
      
      const restaurantId = restaurantData.id;

      // 2. Inserir Cardápio (Simplificado: apenas uma categoria e itens)
      if (initialData.menu_items && initialData.menu_items.length > 0) {
        const { data: categoryData, error: categoryError } = await supabase
          .from('menu_categories')
          .insert({
            restaurant_id: restaurantId,
            name: 'Geral (Importado)',
            order_index: 0,
          })
          .select('id')
          .single();

        if (categoryError) throw categoryError;
        const categoryId = categoryData.id;

        const itemsToInsert = initialData.menu_items.map((item: any, index: number) => ({
          category_id: categoryId,
          name: item.name || `Item ${index + 1}`,
          price: 10.00, // Placeholder price
          order_index: index,
        }));

        const { error: itemsError } = await supabase
          .from('menu_items')
          .insert(itemsToInsert);

        if (itemsError) console.error("Erro ao inserir itens do menu:", itemsError);
      }

      // 3. Inserir Galeria
      if (initialData.gallery_images && initialData.gallery_images.length > 0) {
        const galleryToInsert = initialData.gallery_images.map((image: any, index: number) => ({
          restaurant_id: restaurantId,
          image_url: image.url,
          order_index: index,
        }));

        const { error: galleryError } = await supabase
          .from('restaurant_gallery')
          .insert(galleryToInsert);

        if (galleryError) console.error("Erro ao inserir galeria:", galleryError);
      }

      showSuccess(`Restaurante '${initialData.name}' criado com sucesso!`);
      onNext({ restaurant_id: restaurantId });

    } catch (e) {
      console.error("Erro completo no upload:", e);
      setError(`Falha no upload: ${(e as Error).message}`);
      showError(`Falha no upload: Verifique o console para detalhes.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-none shadow-none">
      <CardHeader>
        <CardTitle className="text-xl text-[#022D68]">5. Revisão e Finalização</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-gray-600">
          Revise os dados coletados antes de finalizar o upload e criar o registro no banco de dados.
        </p>

        <div className="border p-4 rounded-xl bg-gray-50 space-y-2 text-sm">
          <h3 className="font-bold text-lg text-[#022D68]">Dados a serem inseridos:</h3>
          <p><strong>Nome:</strong> {initialData.name}</p>
          <p><strong>URL Externa:</strong> {initialData.external_url}</p>
          <p><strong>Endereço:</strong> {initialData.address}</p>
          <p><strong>Coordenadas:</strong> {initialData.latitude}, {initialData.longitude}</p>
          <p><strong>Itens de Menu:</strong> {initialData.menu_items?.length || 0}</p>
          <p><strong>Imagens de Galeria:</strong> {initialData.gallery_images?.length || 0}</p>
        </div>

        {error && (
          <div className="flex items-center p-3 bg-red-100 border border-red-400 text-red-700 rounded-xl">
            <AlertTriangle className="w-5 h-5 mr-2" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting || !initialData.name}
          className="w-full bg-green-600 hover:bg-green-700 h-10"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
          {isSubmitting ? 'Criando Restaurante...' : 'Finalizar Upload'}
        </Button>
        
        <Button 
          onClick={onReset}
          variant="outline"
          className="w-full h-10"
        >
          Cancelar e Reiniciar
        </Button>
      </CardContent>
    </Card>
  );
};

export default UploadPhase5;
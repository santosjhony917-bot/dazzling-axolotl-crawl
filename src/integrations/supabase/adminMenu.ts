import { supabase } from './client';
import { MenuItem } from '@/types/supabase';

/**
 * Processa o upload de um item de menu invocando uma Edge Function segura.
 * Esta função substitui a lógica anterior de busca de restaurante, criação de categoria e inserção de item,
 * movendo-a para o backend para segurança e para usar a service_role key.
 * @param itemData Os dados do item de menu a ser processado.
 * @returns Um objeto indicando sucesso e, em caso de falha, uma mensagem de erro detalhada.
 */
export async function processMenuItemUpload(itemData: {
  external_url: string;
  category_name: string;
  item_name: string;
  price: number;
  description?: string | null;
  image_url?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('admin-menu-operations', {
      body: itemData,
    });

    if (error) {
      console.error('Error invoking admin-menu-operations Edge Function:', error);
      let errorMessage = error.message;
      // Tenta extrair uma mensagem de erro mais detalhada do corpo da resposta da Edge Function
      if (error.context && error.context.body) {
        console.log('Raw Edge Function error body:', error.context.body); // Loga o corpo bruto para depuração
        try {
          const errorBody = typeof error.context.body === 'string' ? JSON.parse(error.context.body) : error.context.body;
          if (errorBody && errorBody.error) {
            errorMessage = errorBody.error;
          } else {
            // Se o corpo do erro for um objeto mas não tiver a propriedade 'error', stringify-o.
            // Se for uma string simples, use-a diretamente.
            errorMessage = typeof errorBody === 'string' ? errorBody : JSON.stringify(errorBody);
          }
        } catch (parseError) {
          console.warn('Não foi possível analisar o corpo do erro da Edge Function como JSON:', parseError);
          // Se a análise falhar, use o corpo bruto como mensagem de erro
          errorMessage = String(error.context.body);
        }
      }
      return { success: false, error: `Falha na Edge Function: ${errorMessage}` };
    }

    // A Edge Function pode retornar um objeto com 'error' se algo falhar internamente
    if (data && data.error) {
      console.error('Edge Function returned an error:', data.error);
      return { success: false, error: data.error };
    }

    return { success: true }; // Espera { success: true } da Edge Function
  } catch (error) {
    console.error('Unexpected error calling admin-menu-operations Edge Function:', error);
    return { success: false, error: (error as Error).message };
  }
}

// As funções getRestaurantIdByExternalUrl, findOrCreateMenuCategory e insertMenuItem
// foram movidas para a Edge Function e não são mais necessárias aqui.
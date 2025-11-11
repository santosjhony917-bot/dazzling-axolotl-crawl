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
      // Tenta extrair uma mensagem de erro mais detalhada
      let errorMessage = error.message;
      if (error.context && error.context.errors && error.context.errors.length > 0) {
        errorMessage = error.context.errors.map((e: any) => e.message || e.detail || JSON.stringify(e)).join('; ');
      } else if (error.context && error.context.body && typeof error.context.body === 'object' && error.context.body.error) {
        errorMessage = error.context.body.error;
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
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
      return { success: false, error: error.message };
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
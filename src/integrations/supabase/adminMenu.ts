import { supabase } from './client'; // Use o cliente normal para invocar Edge Functions
import { MenuItem } from '@/types/supabase';

/**
 * Processa o upload de um item de menu invocando uma Edge Function segura.
 * Esta função substitui a lógica anterior de busca de restaurante, criação de categoria e inserção de item,
 * movendo-a para o backend para segurança e para usar a service_role key.
 * @param itemData Os dados do item de menu a ser processado.
 * @returns true se o item foi processado com sucesso, false caso contrário.
 */
export async function processMenuItemUpload(itemData: {
  external_url: string;
  category_name: string;
  item_name: string;
  price: number;
  description?: string | null;
  image_url?: string | null;
}): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('admin-menu-operations', {
      body: itemData,
    });

    if (error) {
      console.error('Error invoking admin-menu-operations Edge Function:', error);
      return false;
    }

    // A Edge Function pode retornar um objeto com 'error' se algo falhar internamente
    if (data && data.error) {
      console.error('Edge Function returned an error:', data.error);
      return false;
    }

    return data?.success === true; // Espera { success: true } da Edge Function
  } catch (error) {
    console.error('Unexpected error calling admin-menu-operations Edge Function:', error);
    return false;
  }
}
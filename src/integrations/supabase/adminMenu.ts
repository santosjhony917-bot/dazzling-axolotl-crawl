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
      console.error('Full error object from Supabase client:', JSON.stringify(error, Object.getOwnPropertyNames(error)));

      let errorMessage = error.message;
      
      // Adiciona logs mais detalhados para depuração
      console.log('Error context:', error.context);
      console.log('Type of error.context.body:', typeof error.context.body);

      if (error.context && error.context.body) {
        let rawBodyString = '';
        // Tenta converter o corpo para string, se necessário
        if (typeof error.context.body === 'string') {
          rawBodyString = error.context.body;
        } else if (error.context.body instanceof Uint8Array) {
          rawBodyString = new TextDecoder().decode(error.context.body);
        } else {
          try {
            rawBodyString = JSON.stringify(error.context.body);
          } catch (e) {
            rawBodyString = String(error.context.body);
          }
        }
        
        console.log('Raw Edge Function error body (after string conversion):', rawBodyString);

        if (rawBodyString.trim() !== '') {
          try {
            const errorBody = JSON.parse(rawBodyString);
            if (errorBody && typeof errorBody === 'object' && errorBody.error) {
              errorMessage = errorBody.error;
            } else {
              // Se o JSON foi analisado mas não tem a propriedade 'error', ou é um objeto vazio
              errorMessage = `Edge Function retornou um corpo de erro inesperado: ${rawBodyString}`;
            }
          } catch (parseError) {
            console.warn('Não foi possível analisar o corpo do erro da Edge Function como JSON:', parseError);
            errorMessage = `O corpo do erro da Edge Function não pôde ser analisado: ${rawBodyString}`;
          }
        } else {
          errorMessage = 'Edge Function retornou um corpo de erro vazio.';
        }
      } else {
        errorMessage = `A invocação da Edge Function falhou com a mensagem: ${error.message}. Nenhum corpo de erro detalhado foi fornecido.`;
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
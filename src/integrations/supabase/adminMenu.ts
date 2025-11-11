import { supabase } from './client';
import { adminSupabase } from './adminClient';
import { MenuItem, MenuCategory } from '@/types/supabase';

/**
 * Busca o ID de um restaurante pelo seu external_url.
 * @param externalUrl O URL externo do restaurante.
 * @returns O ID do restaurante ou null se não encontrado.
 */
export async function getRestaurantIdByExternalUrl(externalUrl: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id')
    .eq('external_url', externalUrl)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
    console.error('Error fetching restaurant by external_url:', error);
    return null;
  }
  return data?.id || null;
}

/**
 * Encontra uma categoria de menu existente ou a cria se não existir.
 * @param restaurantId O ID do restaurante ao qual a categoria pertence.
 * @param categoryName O nome da categoria.
 * @returns O ID da categoria de menu.
 */
export async function findOrCreateMenuCategory(restaurantId: string, categoryName: string): Promise<string | null> {
  // Tenta encontrar a categoria existente usando o cliente normal (pode ser público ou autenticado)
  const { data: existingCategory, error: findError } = await supabase
    .from('menu_categories')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .eq('name', categoryName)
    .single();

  if (existingCategory) {
    return existingCategory.id;
  }

  if (findError && findError.code !== 'PGRST116') { // PGRST116 means no rows found
    console.error('Error finding menu category:', findError);
    // Se o erro não for "não encontrado", ainda pode ser um problema de RLS ou outro.
    // Vamos tentar criar mesmo assim, mas logar o erro de busca.
  }

  // Se não encontrou, cria a nova categoria usando o cliente adminSupabase para bypassar RLS
  const { data: newCategory, error: insertError } = await adminSupabase
    .from('menu_categories')
    .insert({ restaurant_id: restaurantId, name: categoryName })
    .select('id')
    .single();

  if (insertError) {
    console.error('Error creating menu category with admin client:', insertError);
    return null;
  }

  return newCategory?.id || null;
}

/**
 * Insere um novo item de menu no banco de dados.
 * @param menuItemData Os dados do item de menu a ser inserido.
 * @returns O item de menu inserido ou null em caso de erro.
 */
export async function insertMenuItem(menuItemData: Omit<MenuItem, 'id' | 'created_at'>): Promise<MenuItem | null> {
  const { data, error } = await adminSupabase
    .from('menu_items')
    .insert(menuItemData)
    .select()
    .single();

  if (error) {
    console.error('Error inserting menu item with admin client:', error);
    return null;
  }
  return data;
}
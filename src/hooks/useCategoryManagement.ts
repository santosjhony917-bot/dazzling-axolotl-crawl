import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CreateCategoryPayload, UpdateCategoryPayload } from '@/types/menu';
import { MenuCategory } from '@/types/supabase'; // Import MenuCategory from supabase types
import { toast } from 'react-hot-toast';

// --- Types (Assuming they are imported from types/menu.ts) ---
// interface CategoryBase { name: string; is_active: boolean; order_index?: number; }
// interface CreateCategoryPayload extends CategoryBase { restaurant_id: string; }
// interface UpdateCategoryPayload { id: string; updates: Partial<CategoryBase>; } // Defined in types/menu.ts

interface UseCategoryMutationsResult {
  createCategoryMutation: ReturnType<typeof useMutation>;
  updateCategoryMutation: ReturnType<typeof useMutation>;
  deleteCategoryMutation: ReturnType<typeof useMutation>;
}

interface UseMenuManagementResult {
  categoriesQuery: ReturnType<typeof useQuery<MenuCategory[]>>;
}

// --- API Calls ---

const fetchCategories = async (restaurantId: string): Promise<MenuCategory[]> => {
  const { data, error } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('order_index', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
};

const createCategory = async (payload: CreateCategoryPayload) => {
  if (!payload.restaurant_id) {
    throw new Error("ID do restaurante é obrigatório para criar uma categoria.");
  }
  
  const { data, error } = await supabase
    .from('menu_categories')
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(`Falha ao salvar categoria: ${error.message}`);
  return data;
};

const updateCategory = async ({ id, updates }: UpdateCategoryPayload) => {
  const { data, error } = await supabase
    .from('menu_categories')
    .update(updates) // Use the updates object
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Falha ao atualizar categoria: ${error.message}`);
  return data;
};

const deleteCategory = async (categoryId: string) => {
  const { error } = await supabase
    .from('menu_categories')
    .delete()
    .eq('id', categoryId);

  if (error) throw new Error(error.message);
};

// --- Hooks ---

export const useCategoryMutations = (restaurantId: string): UseCategoryMutationsResult => {
  const queryClient = useQueryClient();
  const queryKey = ['menu_categories', restaurantId];

  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey });
    queryClient.invalidateQueries({ queryKey: ['publicMenu'] }); // Invalida o menu público
  };

  const createCategoryMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      toast.success('Categoria criada com sucesso!');
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: updateCategory,
    onSuccess: () => {
      toast.success('Categoria atualizada com sucesso!');
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      toast.success('Categoria deletada com sucesso!');
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  return { createCategoryMutation, updateCategoryMutation, deleteCategoryMutation };
};


export const useMenuManagement = (restaurantId: string): UseMenuManagementResult => {
  const categoriesQuery = useQuery<MenuCategory[], Error>({
    queryKey: ['menu_categories', restaurantId],
    queryFn: () => fetchCategories(restaurantId),
    enabled: !!restaurantId,
  });

  return { categoriesQuery };
};
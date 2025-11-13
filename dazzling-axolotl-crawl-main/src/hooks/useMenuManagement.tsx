import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MenuCategory, MenuItem } from '@/types';
import { toast } from 'sonner';

// --- Types ---

type CategoryWithItems = MenuCategory & { menu_items: MenuItem[] };

interface CategoryBase {
  name: string;
  is_active: boolean;
  order_index?: number;
}

interface CreateCategoryPayload extends CategoryBase {
  restaurant_id: string;
}

interface UpdateCategoryPayload extends CategoryBase {
  id: string;
}

interface UseMenuManagementResult {
  categoriesQuery: ReturnType<typeof useQuery<CategoryWithItems[]>>;
  deleteCategoryMutation: ReturnType<typeof useMutation>;
}

interface UseCategoryMutationsResult {
  createCategoryMutation: ReturnType<typeof useMutation>;
  updateCategoryMutation: ReturnType<typeof useMutation>;
  deleteCategoryMutation: ReturnType<typeof useMutation>;
}

// --- API Calls ---

const fetchCategories = async (restaurantId: string): Promise<CategoryWithItems[]> => {
  const { data, error } = await supabase
    .from('menu_categories')
    .select('*, menu_items(*)')
    .eq('restaurant_id', restaurantId)
    .order('order_index', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
};

const createCategory = async (payload: CreateCategoryPayload) => {
  const { data, error } = await supabase
    .from('menu_categories')
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(`Falha ao salvar categoria: ${error.message}`);
  return data;
};

const updateCategory = async (payload: UpdateCategoryPayload) => {
  const { data, error } = await supabase
    .from('menu_categories')
    .update(payload)
    .eq('id', payload.id)
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
  const { deleteCategoryMutation } = useCategoryMutations(restaurantId);

  const categoriesQuery = useQuery<CategoryWithItems[]>({
    queryKey: ['menu_categories', restaurantId],
    queryFn: () => fetchCategories(restaurantId),
    enabled: !!restaurantId,
  });

  return { categoriesQuery, deleteCategoryMutation };
};
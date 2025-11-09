import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlusCircle, Loader2, AlertTriangle, Save, ArrowLeft, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import MenuItemList from '@/components/restaurant/menu/MenuItemList'; // Import as default
import { RestaurantAreaPageLayout } from '@/components/restaurant/RestaurantAreaPageLayout';
import ItemFormDialog, { MenuItemFormValues } from '@/components/restaurant/menu/ItemFormDialog'; // Import as default
import ConfirmationDialog from '@/components/ConfirmationDialog'; // Import as default
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const categorySchema = z.object({
  name: z.string().min(1, 'O nome da categoria é obrigatório.'),
  is_active: z.boolean(),
  is_popular: z.boolean(),
});

const CategoryDetailsPage: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const [category, setCategory] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [isCategoryDeleting, setIsCategoryDeleting] = useState(false);

  const form = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      is_active: true,
      is_popular: false,
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchCategoryAndItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!categoryId) {
      setError('ID da categoria não fornecido.');
      setLoading(false);
      return;
    }

    const { data: categoryData, error: categoryError } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('id', categoryId)
      .single();

    if (categoryError) {
      console.error('Error fetching category:', categoryError);
      setError('Falha ao carregar detalhes da categoria.');
      toast.error('Erro ao carregar detalhes da categoria.');
      setLoading(false);
      return;
    }

    setCategory(categoryData);
    form.reset({
      name: categoryData.name,
      is_active: categoryData.is_active,
      is_popular: categoryData.is_popular,
    });

    const { data: itemsData, error: itemsError } = await supabase
      .from('menu_items')
      .select('*')
      .eq('category_id', categoryId)
      .order('order_index', { ascending: true });

    if (itemsError) {
      console.error('Error fetching menu items:', itemsError);
      setError('Falha ao carregar itens do cardápio.');
      toast.error('Erro ao carregar itens do cardápio.');
    } else {
      setMenuItems(itemsData || []);
    }
    setLoading(false);
  }, [categoryId, form]);

  useEffect(() => {
    fetchCategoryAndItems();
  }, [fetchCategoryAndItems]);

  const handleUpdateCategory = async (values: z.infer<typeof categorySchema>) => {
    if (!categoryId) return;
    setIsSavingCategory(true);
    const { error } = await supabase
      .from('menu_categories')
      .update(values)
      .eq('id', categoryId);

    if (error) {
      console.error('Error updating category:', error);
      toast.error('Erro ao atualizar categoria.');
    } else {
      setCategory((prev: any) => ({ ...prev, ...values }));
      toast.success('Categoria atualizada com sucesso!');
    }
    setIsSavingCategory(false);
  };

  const handleAddItem = async (itemData: MenuItemFormValues) => {
    if (!categoryId) return;

    const { data, error } = await supabase
      .from('menu_items')
      .insert({
        ...itemData,
        category_id: categoryId,
        order_index: menuItems.length,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding menu item:', error);
      toast.error('Erro ao adicionar item ao cardápio.');
    } else {
      setMenuItems([...menuItems, data]);
      toast.success('Item adicionado com sucesso!');
    }
  };

  const handleUpdateItem = async (id: string, updates: Partial<MenuItemFormValues>) => {
    const { error } = await supabase
      .from('menu_items')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating menu item:', error);
      toast.error('Erro ao atualizar item do cardápio.');
    } else {
      setMenuItems(
        menuItems.map((item) => (item.id === id ? { ...item, ...updates } : item))
      );
      toast.success('Item atualizado com sucesso!');
    }
  };

  const handleDeleteItem = async (id: string) => {
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting menu item:', error);
      toast.error('Erro ao deletar item do cardápio.');
    } else {
      setMenuItems(menuItems.filter((item) => item.id !== id));
      toast.success('Item deletado com sucesso!');
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryId) return;
    setIsCategoryDeleting(true);
    const { error } = await supabase
      .from('menu_categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      console.error('Error deleting category:', error);
      toast.error('Erro ao deletar categoria.');
    } else {
      toast.success('Categoria deletada com sucesso!');
      navigate(-1); // Go back to menu management page
    }
    setIsCategoryDeleting(false);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = menuItems.findIndex((item) => item.id === active.id);
      const newIndex = menuItems.findIndex((item) => item.id === over?.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const newMenuItems = Array.from(menuItems);
      const [movedItem] = newMenuItems.splice(oldIndex, 1);
      newMenuItems.splice(newIndex, 0, movedItem);

      setMenuItems(newMenuItems);

      // Update order_index in DB for affected items
      const updates = newMenuItems.map((item, index) => ({
        id: item.id,
        order_index: index,
      }));

      const { error } = await supabase.from('menu_items').upsert(updates);

      if (error) {
        console.error('Error updating menu item order:', error);
        toast.error('Erro ao atualizar a ordem dos itens.');
        // Revert to original order if update fails
        fetchCategoryAndItems();
      } else {
        toast.success('Ordem dos itens atualizada!');
      }
    }
  };

  if (loading) {
    return (
      <RestaurantAreaPageLayout title="Detalhes da Categoria">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </RestaurantAreaPageLayout>
    );
  }

  if (error) {
    return (
      <RestaurantAreaPageLayout title="Detalhes da Categoria">
        <div className="flex flex-col items-center justify-center h-64 text-red-500">
          <AlertTriangle className="h-12 w-12 mb-4" />
          <p className="text-lg">{error}</p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
        </div>
      </RestaurantAreaPageLayout>
    );
  }

  if (!category) {
    return (
      <RestaurantAreaPageLayout title="Detalhes da Categoria">
        <div className="text-center py-10">
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Categoria não encontrada.
          </p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
        </div>
      </RestaurantAreaPageLayout>
    );
  }

  return (
    <RestaurantAreaPageLayout title={`Gerenciar: ${category.name}`}>
      <div className="space-y-8 pb-20">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleUpdateCategory)} className="space-y-4 p-4 border rounded-lg shadow-sm bg-white dark:bg-gray-800">
            <h2 className="text-xl font-semibold">Configurações da Categoria</h2>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Categoria</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome da categoria" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Categoria Ativa
                    </FormLabel>
                    <FormDescription>
                      Se desativada, esta categoria e seus itens não aparecerão no cardápio.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_popular"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Categoria Popular
                    </FormLabel>
                    <FormDescription>
                      Destaque esta categoria como popular no seu cardápio.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <ConfirmationDialog
                title="Deletar Categoria"
                description="Tem certeza que deseja deletar esta categoria? Todos os itens associados também serão removidos."
                onConfirm={handleDeleteCategory}
                confirmButtonText="Deletar"
                confirmButtonVariant="destructive"
              >
                <Button variant="destructive" type="button" disabled={isCategoryDeleting}>
                  {isCategoryDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Deletar Categoria
                </Button>
              </ConfirmationDialog>
              <Button type="submit" disabled={isSavingCategory}>
                {isSavingCategory ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Alterações
              </Button>
            </div>
          </form>
        </Form>

        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Itens do Cardápio</h2>
          <ItemFormDialog onSubmit={handleAddItem} isSubmitting={isAddingItem} setIsSubmitting={setIsAddingItem}>
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" /> Adicionar Item
            </Button>
          </ItemFormDialog>
        </div>

        {menuItems.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center">
            Nenhum item adicionado a esta categoria ainda.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={menuItems.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <MenuItemList
                items={menuItems}
                onUpdateItem={handleUpdateItem}
                onDeleteItem={handleDeleteItem}
              />
            </SortableContext>
          </DndContext>
        )}
      </div>
    </RestaurantAreaPageLayout>
  );
};

export default CategoryDetailsPage;
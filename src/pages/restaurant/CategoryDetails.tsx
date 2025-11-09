"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { useRestaurant } from '@/context/RestaurantContext';
import { showError, showSuccess } from '@/utils/toast';
import { MenuItem, MenuCategory } from '@/types/supabase';
import ItemFormDialog, { MenuItemFormValues } from '@/components/restaurant/menu/ItemFormDialog';
import MenuItemList from '@/components/restaurant/menu/MenuItemList'; // Corrigido para importação padrão
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';

const categorySchema = z.object({
  name: z.string().min(1, "O nome da categoria é obrigatório."),
  is_active: z.boolean(),
  is_popular: z.boolean(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

const CategoryDetails: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { restaurant, fetchRestaurantData, isOwner } = useRestaurant();

  const [category, setCategory] = useState<MenuCategory | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCategoryEditDialogOpen, setIsCategoryEditDialogOpen] = useState(false);
  const [isItemFormDialogOpen, setIsItemFormDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      is_active: true,
      is_popular: false,
    },
  });

  const fetchCategoryAndItems = useCallback(async () => {
    if (!categoryId) return;
    setLoading(true);
    const { data: categoryData, error: categoryError } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('id', categoryId)
      .single();

    if (categoryError) {
      showError(`Erro ao carregar categoria: ${categoryError.message}`);
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
      showError(`Erro ao carregar itens do menu: ${itemsError.message}`);
      setLoading(false);
      return;
    }
    setMenuItems(itemsData);
    setLoading(false);
  }, [categoryId, form]);

  useEffect(() => {
    fetchCategoryAndItems();
  }, [fetchCategoryAndItems]);

  const handleSaveCategory = async (values: CategoryFormValues) => {
    if (!category || !user || !restaurant) return;

    const { error } = await supabase
      .from('menu_categories')
      .update({
        name: values.name,
        is_active: values.is_active,
        is_popular: values.is_popular,
      })
      .eq('id', category.id)
      .eq('restaurant_id', restaurant.id);

    if (error) {
      showError(`Erro ao atualizar categoria: ${error.message}`);
    } else {
      showSuccess('Categoria atualizada com sucesso!');
      setIsCategoryEditDialogOpen(false);
      fetchCategoryAndItems();
      fetchRestaurantData(restaurant.id); // Refresh restaurant data to update category list
    }
  };

  const handleDeleteCategory = async () => {
    if (!category || !user || !restaurant) return;

    setIsDeletingCategory(true);
    const { error } = await supabase
      .from('menu_categories')
      .delete()
      .eq('id', category.id)
      .eq('restaurant_id', restaurant.id);

    if (error) {
      showError(`Erro ao deletar categoria: ${error.message}`);
    } else {
      showSuccess('Categoria deletada com sucesso!');
      navigate(`/restaurant/${restaurant.id}/menu`);
      fetchRestaurantData(restaurant.id); // Refresh restaurant data to update category list
    }
    setIsDeletingCategory(false);
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setIsItemFormDialogOpen(true);
  };

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setIsItemFormDialogOpen(true);
  };

  const handleSaveItem = async (values: MenuItemFormValues) => {
    if (!category || !user || !restaurant) return;

    const itemData = {
      category_id: category.id,
      name: values.name,
      description: values.description,
      price: values.price,
      image_url: values.image_url,
      is_active: values.is_active,
    };

    if (editingItem) {
      const { error } = await supabase
        .from('menu_items')
        .update(itemData)
        .eq('id', editingItem.id);

      if (error) {
        showError(`Erro ao atualizar item: ${error.message}`);
      } else {
        showSuccess('Item atualizado com sucesso!');
        setIsItemFormDialogOpen(false);
        fetchCategoryAndItems();
      }
    } else {
      const { data, error } = await supabase
        .from('menu_items')
        .insert(itemData)
        .select()
        .single();

      if (error) {
        showError(`Erro ao adicionar item: ${error.message}`);
      } else {
        showSuccess('Item adicionado com sucesso!');
        setIsItemFormDialogOpen(false);
        fetchCategoryAndItems();
      }
    }
  };

  const handleDeleteItem = async (item: MenuItem) => {
    if (!user) return;

    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', item.id);

    if (error) {
      showError(`Erro ao deletar item: ${error.message}`);
    } else {
      showSuccess('Item deletado com sucesso!');
      fetchCategoryAndItems();
    }
  };

  if (loading) {
    return (
      <RestaurantAreaPageLayout>
        <div className="flex justify-center items-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </RestaurantAreaPageLayout>
    );
  }

  if (!category) {
    return (
      <RestaurantAreaPageLayout>
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <p className="text-lg">Categoria não encontrada.</p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
        </div>
      </RestaurantAreaPageLayout>
    );
  }

  return (
    <RestaurantAreaPageLayout>
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao Menu
        </Button>
        <h1 className="text-3xl font-bold text-[#022D68]">{category.name}</h1>
        {isOwner && (
          <div className="flex space-x-2">
            <Button onClick={() => setIsCategoryEditDialogOpen(true)} variant="outline">
              <Edit className="h-4 w-4 mr-2" /> Editar Categoria
            </Button>
            <Button onClick={handleAddItem}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar Item
            </Button>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <MenuItemList
          items={menuItems}
          onEditItem={handleEditItem}
          onDeleteItem={handleDeleteItem}
          isOwner={isOwner}
        />
      </div>

      {/* Edit Category Dialog */}
      <Dialog open={isCategoryEditDialogOpen} onOpenChange={setIsCategoryEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveCategory)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Categoria</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <FormLabel className="text-base">Categoria Ativa</FormLabel>
                      <FormDescription>
                        Se desativado, esta categoria e seus itens não aparecerão no menu público.
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
                      <FormLabel className="text-base">Categoria Popular</FormLabel>
                      <FormDescription>
                        Marque para destacar esta categoria como popular no menu.
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
              <DialogFooter className="flex justify-between items-center mt-6">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteCategory}
                  disabled={isDeletingCategory}
                >
                  {isDeletingCategory ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  Deletar Categoria
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Item Form Dialog */}
      <ItemFormDialog
        isOpen={isItemFormDialogOpen}
        onClose={() => setIsItemFormDialogOpen(false)}
        onSave={handleSaveItem}
        initialData={editingItem}
      />
    </RestaurantAreaPageLayout>
  );
};

export default CategoryDetails;
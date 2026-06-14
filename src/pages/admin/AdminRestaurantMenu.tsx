"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Loader2, ArrowLeft, Utensils } from 'lucide-react'; // Adicionado Utensils para o ícone
import { Button } from '@/components/ui/button';
import { useAuthData } from '@/context/AuthContext';
import { useRestaurantContext } from '@/context/RestaurantContext'; // Corrigido: useRestaurant para useRestaurantContext
import { showError, showSuccess } from '@/utils/toast';
import { MenuCategory, MenuItem, MenuCategoryWithItems } from '@/types/supabase'; // Adicionado MenuCategoryWithItems
import CategoryFormDialog, { CategoryFormValues } from '@/components/restaurant/menu/CategoryFormDialog';
import MenuItemList from '@/components/restaurant/menu/MenuItemList';
import ItemFormDialog, { MenuItemFormValues } from '@/components/restaurant/menu/ItemFormDialog';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';
import { supabase } from '@/integrations/supabase/client';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const AdminRestaurantMenu: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthData();
  const { restaurant, refetch: fetchRestaurantData, isLoading: isRestaurantLoading } = useRestaurantContext(); // Corrigido: useRestaurant para useRestaurantContext e renomeado refetch

  const [categories, setCategories] = useState<MenuCategoryWithItems[]>([]); // Atualizado o tipo para MenuCategoryWithItems
  const [loading, setLoading] = useState(true);
  const [isCategoryFormDialogOpen, setIsCategoryFormDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [isItemFormDialogOpen, setIsItemFormDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<MenuCategory | null>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false); // Novo estado para o loading do formulário de categoria
  const [isSavingItem, setIsSavingItem] = useState(false); // Novo estado para o loading do formulário de item

  const fetchCategories = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('menu_categories')
      .select('*, menu_items(*)') // Modificado para buscar menu_items
      .eq('restaurant_id', restaurantId)
      .order('order_index', { ascending: true });

    if (error) {
      showError(`Erro ao carregar categorias: ${error.message}`);
    } else {
      setCategories(data || []);
    }
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleAddCategory = () => {
    setEditingCategory(null);
    setIsCategoryFormDialogOpen(true);
  };

  const handleEditCategory = (category: MenuCategory) => {
    setEditingCategory(category);
    setIsCategoryFormDialogOpen(true);
  };

  const handleSaveCategory = async (values: CategoryFormValues) => {
    if (!restaurantId || !user) return;

    setIsSavingCategory(true); // Inicia o loading
    const categoryData = {
      restaurant_id: restaurantId,
      name: values.name,
      is_active: values.is_active,
      is_popular: values.is_popular, // is_popular agora está no CategoryFormValues
    };

    if (editingCategory) {
      const { error } = await supabase
        .from('menu_categories')
        .update(categoryData)
        .eq('id', editingCategory.id);

      if (error) {
        showError(`Erro ao atualizar categoria: ${error.message}`);
      } else {
        showSuccess('Categoria atualizada com sucesso!');
        setIsCategoryFormDialogOpen(false);
        fetchCategories();
        fetchRestaurantData();
      }
    } else {
      const { data, error } = await supabase
        .from('menu_categories')
        .insert({ ...categoryData, order_index: categories.length })
        .select()
        .single();

      if (error) {
        showError(`Erro ao adicionar categoria: ${error.message}`);
      } else {
        showSuccess('Categoria adicionada com sucesso!');
        setIsCategoryFormDialogOpen(false);
        fetchCategories();
        fetchRestaurantData();
      }
    }
    setIsSavingCategory(false); // Finaliza o loading
  };

  const handleConfirmDeleteCategory = (category: MenuCategory) => {
    setCategoryToDelete(category);
    setIsConfirmDeleteDialogOpen(true);
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete || !user || !restaurantId) return;

    setIsDeletingCategory(true);
    const { error } = await supabase
      .from('menu_categories')
      .delete()
      .eq('id', categoryToDelete.id)
      .eq('restaurant_id', restaurantId);

    if (error) {
      showError(`Erro ao deletar categoria: ${error.message}`);
    } else {
      showSuccess('Categoria deletada com sucesso!');
      fetchCategories();
      fetchRestaurantData();
    }
    setIsDeletingCategory(false);
    setIsConfirmDeleteDialogOpen(false);
    setCategoryToDelete(null);
  };

  const handleAddItem = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setEditingItem(null);
    setIsItemFormDialogOpen(true);
  };

  const handleEditItem = (item: MenuItem) => {
    setSelectedCategoryId(item.category_id);
    setEditingItem(item);
    setIsItemFormDialogOpen(true);
  };

  const handleSaveItem = async (values: MenuItemFormValues) => {
    if (!selectedCategoryId || !user) return;

    const toTitleCase = (str: string) => {
      if (!str) return '';
      return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };

    const cleanPrefixes = (name: string) => {
      if (!name) return '';
      return name.replace(/^[\d\w\s]+:\s*/i, '').trim();
    };

    const sanitizedName = toTitleCase(cleanPrefixes(values.name));

    setIsSavingItem(true); // Inicia o loading
    const itemData = {
      category_id: selectedCategoryId,
      name: values.name,
      description: values.description,
      price: values.price,
      image_url: values.image_url,
      is_active: values.is_active,
      search_display_name: sanitizedName,
      is_illustrative: values.is_illustrative,
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
        fetchCategories(); // Refresh all categories to update item lists
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
        fetchCategories(); // Refresh all categories to update item lists
      }
    }
    setIsSavingItem(false); // Finaliza o loading
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
      fetchCategories(); // Refresh all categories to update item lists
    }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, type } = result;

    if (type === 'categories') {
      const reorderedCategories = Array.from(categories);
      const [movedCategory] = reorderedCategories.splice(source.index, 1);
      reorderedCategories.splice(destination.index, 0, movedCategory);

      setCategories(reorderedCategories);

      // Update order_index in DB
      const updates = reorderedCategories.map((cat, index) => ({
        id: cat.id,
        order_index: index,
      }));

      const { error } = await supabase
        .from('menu_categories')
        .upsert(updates, { onConflict: 'id' });

      if (error) {
        showError(`Erro ao reordenar categorias: ${error.message}`);
        fetchCategories(); // Revert to original order on error
      } else {
        showSuccess('Ordem das categorias atualizada!');
      }
    }
  };

  if (loading || isRestaurantLoading) {
    return (
      <RestaurantAreaPageLayout title="Carregando Menu" icon={Loader2} backPath={`/restaurant/${restaurantId}`}>
        <div className="flex justify-center items-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </RestaurantAreaPageLayout>
    );
  }

  if (!restaurant) {
    return (
      <RestaurantAreaPageLayout title="Restaurante Não Encontrado" icon={Utensils} backPath="/dashboard">
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <p className="text-lg">Restaurante não encontrado.</p>
          <Button onClick={() => navigate('/dashboard')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao Dashboard
          </Button>
        </div>
      </RestaurantAreaPageLayout>
    );
  }

  return (
    <RestaurantAreaPageLayout title="Gerenciar Menu" icon={Utensils} backPath={`/restaurant/${restaurantId}`}>
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" onClick={() => navigate(`/restaurant/${restaurantId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao Restaurante
        </Button>
        <h1 className="text-3xl font-bold text-primary">Gerenciar Menu</h1>
        {user && restaurant && user.id === restaurant.user_id && ( // Usando isOwner diretamente não é ideal aqui, pois o contexto pode não ter carregado ainda
          <Button onClick={handleAddCategory}>
            <Plus className="h-4 w-4 mr-2" /> Adicionar Categoria
          </Button>
        )}
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="categories" type="categories">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-6">
              {categories.map((category, index) => (
                <Draggable key={category.id} draggableId={category.id} index={index}>
                  {(provided) => (
                    <Card
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="relative"
                    >
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-xl text-primary">{category.name}</CardTitle>
                        {user && restaurant && user.id === restaurant.user_id && (
                          <div className="flex items-center space-x-2">
                            <Label htmlFor={`category-active-${category.id}`}>Ativa</Label>
                            <Switch
                              id={`category-active-${category.id}`}
                              checked={category.is_active}
                              onCheckedChange={async (checked) => {
                                const { error } = await supabase
                                  .from('menu_categories')
                                  .update({ is_active: checked })
                                  .eq('id', category.id);
                                if (error) {
                                  showError(`Erro ao atualizar status: ${error.message}`);
                                } else {
                                  showSuccess(`Categoria ${checked ? 'ativada' : 'desativada'}!`);
                                  fetchCategories();
                                }
                              }}
                            />
                            <Button variant="outline" size="icon" onClick={() => handleEditCategory(category)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="destructive" size="icon" onClick={() => handleConfirmDeleteCategory(category)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button onClick={() => handleAddItem(category.id)}>
                              <Plus className="h-4 w-4 mr-2" /> Item
                            </Button>
                          </div>
                        )}
                      </CardHeader>
                      <CardContent>
                        <MenuItemList
                          items={category.menu_items || []}
                          onEditItem={handleEditItem}
                          onDeleteItem={handleDeleteItem}
                          isOwner={user && restaurant ? user.id === restaurant.user_id : false}
                        />
                        {(!category.menu_items || category.menu_items.length === 0) && (
                          <div className="text-center text-gray-500 py-4">
                            Nenhum item nesta categoria.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {categories.length === 0 && !loading && (
        <div className="text-center text-gray-500 py-8">
          <p className="text-lg">Nenhuma categoria de menu adicionada ainda.</p>
          {user && restaurant && user.id === restaurant.user_id && (
            <Button onClick={handleAddCategory} className="mt-4">
              <Plus className="h-4 w-4 mr-2" /> Adicionar Primeira Categoria
            </Button>
          )}
        </div>
      )}

      {/* Category Form Dialog */}
      <CategoryFormDialog
        isOpen={isCategoryFormDialogOpen}
        onClose={() => setIsCategoryFormDialogOpen(false)}
        onSave={handleSaveCategory}
        initialData={editingCategory}
        restaurantId={restaurantId || ''}
        isLoading={isSavingCategory}
      />

      {/* Item Form Dialog */}
      {selectedCategoryId && restaurant && ( // Renderiza ItemFormDialog apenas se selectedCategoryId e restaurant não forem null
        <ItemFormDialog
          isOpen={isItemFormDialogOpen}
          onClose={() => setIsItemFormDialogOpen(false)}
          onSave={handleSaveItem}
          itemToEdit={editingItem}
          category={categories.find(cat => cat.id === selectedCategoryId) || { id: selectedCategoryId, name: '', restaurant_id: restaurant.id, is_active: true, is_popular: false, created_at: new Date().toISOString(), order_index: 0 }}
          isLoading={isSavingItem}
        />
      )}

      {/* Confirm Delete Category Dialog */}
      <Dialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p>Tem certeza de que deseja excluir a categoria "{categoryToDelete?.name}"? Todos os itens associados também serão excluídos.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteCategory} disabled={isDeletingCategory}>
              {isDeletingCategory ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RestaurantAreaPageLayout>
  );
};

export default AdminRestaurantMenu;
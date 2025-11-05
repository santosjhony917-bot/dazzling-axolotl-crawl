"use client";

import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import AdminAreaHeader from '@/components/admin/AdminAreaHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useMenuManagement, useCategoryMutations } from '@/hooks/useMenuManagement';
import { useMenuItemManagement } from '@/hooks/useMenuItemManagement';
import CategoryList from '@/components/restaurant/menu/CategoryList';
import CategoryFormDialog, { CategoryFormValues } from '@/components/restaurant/menu/CategoryFormDialog';
import { MenuItemList } from '@/components/restaurant/menu/MenuItemList';
import ItemFormDialog, { MenuItemFormValues } from '@/components/restaurant/menu/ItemFormDialog';
import { MenuCategory, MenuItem } from '@/types/supabase';
import ConfirmationDialog from '@/components/ConfirmationDialog';

type CategoryWithItems = MenuCategory & { menu_items: MenuItem[] };

const AdminRestaurantMenu: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  
  // State for categories
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [viewingCategory, setViewingCategory] = useState<CategoryWithItems | null>(null);

  // State for menu items
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isConfirmDeleteItemDialogOpen, setIsConfirmDeleteItemDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  if (!restaurantId) {
    return (
      <div className="space-y-6">
        <AdminAreaHeader title="Erro" description="ID do restaurante não fornecido." />
      </div>
    );
  }

  const { categoriesQuery } = useMenuManagement(restaurantId);
  const { createCategoryMutation, updateCategoryMutation, deleteCategoryMutation } = useCategoryMutations(restaurantId);
  const { createItemMutation, updateItemMutation, deleteItemMutation } = useMenuItemManagement(viewingCategory?.id);

  // --- Category Handlers ---
  const handleAddCategory = () => {
    setSelectedCategory(null);
    setIsCategoryDialogOpen(true);
  };

  const handleEditCategory = (category: MenuCategory) => {
    setSelectedCategory(category);
    setIsCategoryDialogOpen(true);
  };

  const handleSaveCategory = async (data: CategoryFormValues) => {
    if (selectedCategory) {
      await updateCategoryMutation.mutateAsync({ id: selectedCategory.id, updates: data });
    } else {
      await createCategoryMutation.mutateAsync({ ...data, restaurant_id: restaurantId });
    }
    setIsCategoryDialogOpen(false);
  };

  const handleDeleteCategory = (categoryId: string) => {
    setCategoryToDelete(categoryId);
    setIsConfirmDeleteDialogOpen(true);
  };

  const confirmDeleteCategory = async () => {
    if (categoryToDelete) {
      await deleteCategoryMutation.mutateAsync(categoryToDelete);
      setCategoryToDelete(null);
      setIsConfirmDeleteDialogOpen(false);
    }
  };

  const handleViewCategory = (category: MenuCategory) => {
    const categoryWithItems = categoriesQuery.data?.find(c => c.id === category.id);
    if (categoryWithItems) {
      setViewingCategory(categoryWithItems);
    }
  };

  // --- Menu Item Handlers ---
  const handleAddItem = () => {
    setSelectedItem(null);
    setIsItemDialogOpen(true);
  };

  const handleEditItem = (item: MenuItem) => {
    setSelectedItem(item);
    setIsItemDialogOpen(true);
  };

  const handleSaveItem = async (data: MenuItemFormValues) => {
    if (!viewingCategory) return;
    if (selectedItem) {
      await updateItemMutation.mutateAsync({ id: selectedItem.id, updates: data });
    } else {
      // Explicitly construct the object to satisfy the type requirements
      await createItemMutation.mutateAsync({
        name: data.name,
        price: data.price,
        description: data.description,
        image_url: data.image_url,
        is_active: data.is_active,
        category_id: viewingCategory.id
      });
    }
    setIsItemDialogOpen(false);
  };

  const handleDeleteItem = (itemId: string) => {
    setItemToDelete(itemId);
    setIsConfirmDeleteItemDialogOpen(true);
  };

  const confirmDeleteItem = async () => {
    if (itemToDelete) {
      await deleteItemMutation.mutateAsync(itemToDelete);
      setItemToDelete(null);
      setIsConfirmDeleteItemDialogOpen(false);
    }
  };

  const isCategoryMutating = createCategoryMutation.isPending || updateCategoryMutation.isPending || deleteCategoryMutation.isPending;
  const isItemMutating = createItemMutation.isPending || updateItemMutation.isPending || deleteItemMutation.isPending;
  const isMutating = isCategoryMutating || isItemMutating;

  const currentMenuItems = useMemo(() => {
    if (!viewingCategory) return [];
    const updatedCategory = categoriesQuery.data?.find(c => c.id === viewingCategory.id);
    return updatedCategory?.menu_items || [];
  }, [viewingCategory, categoriesQuery.data]);

  // --- Render Logic ---

  if (viewingCategory) {
    return (
      <div className="space-y-6">
        <AdminAreaHeader
          title={`Gerenciar Itens: ${viewingCategory.name}`}
          description="Adicione, edite ou remova os itens desta categoria."
        />
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <Button onClick={() => setViewingCategory(null)} variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Categorias
            </Button>
            <Button onClick={handleAddItem} disabled={isMutating}>
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Item
            </Button>
          </CardHeader>
          <CardContent>
            <MenuItemList
              items={currentMenuItems}
              onEdit={handleEditItem}
              onDelete={handleDeleteItem}
            />
          </CardContent>
        </Card>

        <ItemFormDialog
          isOpen={isItemDialogOpen}
          onClose={() => setIsItemDialogOpen(false)}
          onSave={handleSaveItem}
          itemToEdit={selectedItem}
          isLoading={isItemMutating}
          category={viewingCategory}
        />

        <ConfirmationDialog
          isOpen={isConfirmDeleteItemDialogOpen}
          onClose={() => setIsConfirmDeleteItemDialogOpen(false)}
          onConfirm={confirmDeleteItem}
          title="Confirmar Exclusão do Item"
          description="Tem certeza de que deseja excluir este item do cardápio?"
          isLoading={isItemMutating}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminAreaHeader
        title={`Gerenciar Cardápio do Restaurante`}
        description="Aqui você poderá gerenciar as categorias e itens do cardápio deste restaurante."
      />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Categorias do Cardápio</CardTitle>
          <Button onClick={handleAddCategory} disabled={isMutating}>
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Categoria
          </Button>
        </CardHeader>
        <CardContent>
          {categoriesQuery.isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : categoriesQuery.isError ? (
            <div className="text-center text-red-500 p-8">
              Erro ao carregar categorias: {categoriesQuery.error?.message}
            </div>
          ) : (
            <CategoryList
              categories={categoriesQuery.data || []}
              restaurantId={restaurantId}
              onEdit={handleEditCategory}
              onDelete={handleDeleteCategory}
              disableNavigation={true}
              onView={handleViewCategory}
            />
          )}
        </CardContent>
      </Card>

      <CategoryFormDialog
        isOpen={isCategoryDialogOpen}
        onClose={() => setIsCategoryDialogOpen(false)}
        restaurantId={restaurantId}
        initialData={selectedCategory}
        onSave={handleSaveCategory}
        isLoading={isCategoryMutating}
      />

      <ConfirmationDialog
        isOpen={isConfirmDeleteDialogOpen}
        onClose={() => setIsConfirmDeleteDialogOpen(false)}
        onConfirm={confirmDeleteCategory}
        title="Confirmar Exclusão"
        description="Tem certeza de que deseja excluir esta categoria? Todos os itens de menu associados a ela também serão excluídos."
        isLoading={isCategoryMutating}
      />
    </div>
  );
};

export default AdminRestaurantMenu;
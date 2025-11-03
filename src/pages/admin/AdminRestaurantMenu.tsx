"use client";

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import AdminAreaHeader from '@/components/admin/AdminAreaHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import { useMenuManagement, useCategoryMutations } from '@/hooks/useCategoryManagement';
import CategoryList from '@/components/restaurant/menu/CategoryList';
import CategoryFormDialog, { CategoryFormValues } from '@/components/restaurant/menu/CategoryFormDialog';
import { MenuCategory } from '@/types/supabase';
import ConfirmationDialog from '@/components/ConfirmationDialog';

const AdminRestaurantMenu: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  if (!restaurantId) {
    return (
      <div className="space-y-6">
        <AdminAreaHeader
          title="Erro"
          description="ID do restaurante não fornecido."
        />
      </div>
    );
  }

  const { categoriesQuery } = useMenuManagement(restaurantId);
  const { createCategoryMutation, updateCategoryMutation, deleteCategoryMutation } = useCategoryMutations(restaurantId);

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

  const isMutating = createCategoryMutation.isPending || updateCategoryMutation.isPending || deleteCategoryMutation.isPending;

  return (
    <div className="space-y-6">
      <AdminAreaHeader
        title={`Gerenciar Cardápio do Restaurante: ${restaurantId}`}
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
        isLoading={isMutating}
      />

      <ConfirmationDialog
        isOpen={isConfirmDeleteDialogOpen}
        onClose={() => setIsConfirmDeleteDialogOpen(false)}
        onConfirm={confirmDeleteCategory}
        title="Confirmar Exclusão"
        description="Tem certeza de que deseja excluir esta categoria? Todos os itens de menu associados a ela também serão excluídos."
        isLoading={isMutating}
      />
    </div>
  );
};

export default AdminRestaurantMenu;
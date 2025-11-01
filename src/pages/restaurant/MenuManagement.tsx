"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { MenuCategory } from '@/types/supabase';
import { useMenuManagement, useCategoryMutations } from '@/hooks/useCategoryManagement';
import CategoryList from '@/components/restaurant/menu/CategoryList';
import CategoryDialog from '@/components/restaurant/CategoryDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useAuthData } from '@/context/AuthContext'; // Import useAuthData to get restaurantId

const MenuManagement: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { restaurant } = useAuthData(); // Get restaurant from AuthContext
  const { categories, isLoading, error, refetchCategories, reorderCategories } = useMenuManagement();
  const {
    addCategoryMutation,
    updateCategoryMutation,
    deleteCategoryMutation,
    toggleCategoryActiveMutation,
    isSavingCategory,
  } = useCategoryMutations(refetchCategories, toast);

  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | undefined>(undefined);

  const handleAddCategory = () => {
    setEditingCategory(undefined);
    setIsCategoryDialogOpen(true);
  };

  const handleEditCategory = (category: MenuCategory) => {
    setEditingCategory(category);
    setIsCategoryDialogOpen(true);
  };

  const handleSaveCategory = async (values: { name: string; is_active?: boolean }) => {
    if (!restaurant?.id) {
      toast({ title: "Erro", description: "ID do restaurante não encontrado.", variant: "destructive" });
      return;
    }
    if (editingCategory) {
      await updateCategoryMutation.mutateAsync({ id: editingCategory.id, ...values });
    } else {
      await addCategoryMutation.mutateAsync({ restaurant_id: restaurant.id, ...values, name: values.name }); // Ensure name is passed
    }
    setIsCategoryDialogOpen(false);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta categoria? Todos os itens associados serão perdidos.')) {
      await deleteCategoryMutation.mutateAsync(categoryId);
    }
  };

  const handleToggleCategoryActive = async (categoryId: string, isActive: boolean) => {
    await toggleCategoryActiveMutation.mutateAsync({ id: categoryId, is_active: isActive });
  };

  const handleReorderCategories = async (newOrder: MenuCategory[]) => {
    await reorderCategories(newOrder);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    toast({
      title: "Erro",
      description: "Não foi possível carregar as categorias do menu.",
      variant: "destructive",
    });
    return (
      <div className="text-center text-red-500 py-8">
        <p>Erro ao carregar o menu. Por favor, tente novamente.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold text-[#022D68] mb-6">Gerenciamento de Menu</h1>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Categorias do Menu</CardTitle>
          <Button onClick={handleAddCategory} className="bg-[#E47948] hover:bg-[#C2653B]">
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Categoria
          </Button>
        </CardHeader>
        <CardDescription className="px-6">
          Organize seu cardápio em categorias. Arraste e solte para reordenar.
        </CardDescription>
        <CardContent className="pt-4">
          {categories.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Nenhuma categoria adicionada ainda.</p>
          ) : (
            <CategoryList
              categories={categories}
              onEditCategory={handleEditCategory}
              onDeleteCategory={handleDeleteCategory}
              onToggleCategoryActive={handleToggleCategoryActive}
              onReorderCategories={handleReorderCategories}
            />
          )}
        </CardContent>
      </Card>

      <CategoryDialog
        open={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        category={editingCategory}
        onSave={handleSaveCategory}
        isSaving={isSavingCategory}
      />
    </div>
  );
};

export default MenuManagement;
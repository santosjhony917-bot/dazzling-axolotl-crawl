"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Loader2, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { MenuCategory, MenuItem } from '@/types';
import { useMenuManagement, useCategoryMutations, useMenuItemManagement } from '@/hooks/useMenuManagement';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import CategoryDialog from '@/components/restaurant/CategoryDialog';
import { CategoryFormValues } from '@/components/restaurant/menu/CategoryFormDialog';
import MenuItemDialog from '@/components/restaurant/MenuItemDialog';
import { MenuItemFormValues } from '@/components/restaurant/menu/MenuItemFormDialog';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';
import { CategoryList } from '@/components/restaurant/menu/CategoryList';
import { Card, CardContent } from '@/components/ui/card';

const MenuManagement: React.FC = () => {
  const { toast } = useToast();
  const { restaurant, isLoading: profileLoading } = useRestaurantProfile();
  const restaurantId = restaurant?.id || '';

  const { categoriesQuery } = useMenuManagement(restaurantId);
  const { createCategoryMutation, updateCategoryMutation, deleteCategoryMutation, swapCategoryOrderMutation } = useCategoryMutations(restaurantId);
  
  // Estado para Categorias
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  
  // Estado para Confirmação
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<(() => void) | null>(null);
  const [confirmationTitle, setConfirmationTitle] = useState('');
  const [confirmationDescription, setConfirmationDescription] = useState('');

  const categories = categoriesQuery.data || [];
  const isLoading = profileLoading || categoriesQuery.isLoading;
  const isCategoryMutating = createCategoryMutation.isPending || updateCategoryMutation.isPending || deleteCategoryMutation.isPending;
  
  // --- Handlers de Categoria ---

  const handleOpenCategoryDialog = (category: MenuCategory | null) => {
    setEditingCategory(category);
    setIsCategoryDialogOpen(true);
  };

  const handleSaveCategory = useCallback(async (data: CategoryFormValues) => {
    if (editingCategory) {
      await updateCategoryMutation.mutateAsync({ 
        id: editingCategory.id,
        name: data.name,
        is_active: data.is_active,
        order_index: data.order_index,
      });
    } else {
      await createCategoryMutation.mutateAsync({ 
        restaurant_id: restaurantId,
        name: data.name,
        is_active: data.is_active,
        order_index: data.order_index,
      });
    }
  }, [editingCategory, updateCategoryMutation, createCategoryMutation, restaurantId]);

  const handleDeleteCategory = (categoryId: string) => {
    setConfirmationTitle("Excluir Categoria");
    setConfirmationDescription("Tem certeza de que deseja excluir esta categoria? Todos os itens de menu associados serão deletados.");
    setConfirmationAction(() => () => deleteCategoryMutation.mutate(categoryId));
    setIsConfirmationOpen(true);
  };
  
  const handleReorderCategory = (categoryIdA: string, categoryIdB: string) => {
    swapCategoryOrderMutation.mutate({ category_id_a: categoryIdA, category_id_b: categoryIdB });
  };

  // --- Render Logic ---

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (categoriesQuery.isError) {
    return <div className="text-center text-red-500 p-4">Erro ao carregar categorias: {categoriesQuery.error.message}</div>;
  }

  return (
    <RestaurantAreaPageLayout title="Gerenciar Cardápio" icon={Utensils} backPath="restaurant-area/profile-menu">
      <div className="p-4 space-y-6">
        
        <Card className="shadow-soft-lg border-none rounded-2xl">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-bold text-primary">Categorias do Menu</h1>
              <Button onClick={() => handleOpenCategoryDialog(null)} disabled={isCategoryMutating} className="bg-highlight hover:bg-highlight/90 rounded-xl shadow-soft-md">
                <Plus className="mr-2 h-4 w-4" /> Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>

        <CategoryList
          categories={categories}
          restaurantId={restaurantId}
          onEdit={handleOpenCategoryDialog}
          onDelete={handleDeleteCategory}
        />
      </div>

      {/* Dialogs */}
      <CategoryDialog
        isOpen={isCategoryDialogOpen}
        onClose={() => setIsCategoryDialogOpen(false)}
        category={editingCategory}
        restaurantId={restaurantId}
        onSave={handleSaveCategory}
        isLoading={isCategoryMutating}
      />
      
      <ConfirmationDialog
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
        onConfirm={() => {
          if (confirmationAction) {
            confirmationAction();
          }
          setIsConfirmationOpen(false);
        }}
        title={confirmationTitle}
        description={confirmationDescription}
        confirmText="Sim, Excluir"
      />
    </RestaurantAreaPageLayout>
  );
};

export default MenuManagement;
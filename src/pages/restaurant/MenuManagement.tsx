"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Loader2, ArrowLeft, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/context/AuthContext';
import { useMenuManagement, useCategoryMutations } from '@/hooks/useMenuManagement.ts';
import { MenuCategory } from '@/types';
import CategoryFormDialog, { CategoryFormValues } from '@/components/restaurant/menu/CategoryFormDialog';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { useNavigate } from 'react-router-dom';
import { Routes } from '@/router/routes';
import CategoryAccordion from '@/components/restaurant/menu/CategoryAccordion';
import RestaurantBottomNav from '@/components/restaurant/RestaurantBottomNav';
import { useUserRole } from '@/hooks/useUserRole';
import RestaurantAreaHeader from '@/components/restaurant/RestaurantAreaHeader';
import { showError } from '@/utils/toast';

const MenuManagement: React.FC = () => {
  const navigate = useNavigate();
  const { restaurant, isLoading: authLoading } = useAuthContext();
  const { isPremium } = useUserRole();
  const restaurantId = restaurant?.id || '';

  const { categoriesQuery } = useMenuManagement(restaurantId);
  const { createCategoryMutation, updateCategoryMutation, deleteCategoryMutation } = useCategoryMutations(restaurantId);

  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<(() => void) | null>(null);
  const [confirmationTitle, setConfirmationTitle] = useState('');
  const [confirmationDescription, setConfirmationDescription] = useState('');

  const categories = categoriesQuery.data || [];
  const isLoading = categoriesQuery.isLoading || authLoading;
  const isMutating = createCategoryMutation.isPending || updateCategoryMutation.isPending || deleteCategoryMutation.isPending;

  // --- Handlers ---

  const handleOpenCategoryDialog = (category: MenuCategory | null) => {
    setEditingCategory(category);
    setIsCategoryDialogOpen(true);
  };

  const handleSaveCategory = useCallback(async (data: CategoryFormValues) => {
    if (!restaurantId) {
      showError("ID do restaurante não encontrado.");
      return;
    }

    if (editingCategory) {
      await updateCategoryMutation.mutateAsync({
        id: editingCategory.id,
        name: data.name,
        is_active: data.is_active,
      });
    } else {
      // Find the highest order_index and set the new one to +1
      const maxOrder = categories.reduce((max, cat) => Math.max(max, cat.order_index || 0), 0);
      
      await createCategoryMutation.mutateAsync({
        restaurant_id: restaurantId,
        name: data.name,
        is_active: data.is_active,
        order_index: maxOrder + 1,
      });
    }
  }, [editingCategory, restaurantId, categories, createCategoryMutation, updateCategoryMutation]);

  const handleDeleteCategory = (categoryId: string) => {
    setConfirmationTitle("Excluir Categoria");
    setConfirmationDescription("Tem certeza de que deseja excluir esta categoria? Todos os itens de menu associados serão perdidos.");
    setConfirmationAction(() => () => deleteCategoryMutation.mutate(categoryId));
    setIsConfirmationOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#f5f7f8]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (categoriesQuery.isError) {
    return <div className="text-center text-red-500">Erro ao carregar o menu.</div>;
  }

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      <RestaurantAreaHeader title="Gerenciar Cardápio" icon={Utensils} backPath="restaurant-area/profile-menu" />
      
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-primary">Categorias</h1>
          <Button onClick={() => handleOpenCategoryDialog(null)} disabled={isMutating} className="bg-primary hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" /> Adicionar
          </Button>
        </div>

        {categories.length === 0 && !isLoading ? (
          <div className="text-center p-8 border rounded-xl bg-white shadow-sm">
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Nenhuma Categoria</h2>
            <p className="text-gray-500">Comece adicionando sua primeira categoria de pratos.</p>
          </div>
        ) : (
          <CategoryAccordion
            categories={categories}
            restaurantId={restaurantId}
            onEditCategory={handleOpenCategoryDialog}
            onDeleteCategory={handleDeleteCategory}
          />
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md z-30">
        <RestaurantBottomNav selectedTab="menu" isFree={!isPremium} />
      </div>

      {/* Dialogs */}
      <CategoryFormDialog
        isOpen={isCategoryDialogOpen}
        onClose={() => setIsCategoryDialogOpen(false)}
        restaurantId={restaurantId}
        initialData={editingCategory}
        onSave={handleSaveCategory}
        isLoading={isMutating}
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
    </div>
  );
};

export default MenuManagement;
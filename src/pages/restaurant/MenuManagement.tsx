"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { Plus, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthContext } from '@/context/AuthContext';
import { useCategoryMutations, useMenuItemManagement } from '@/hooks/useMenuManagement';
import { MenuCategory, MenuItem } from '@/types';
import CategoryFormDialog, { CategoryFormValues } from '@/components/restaurant/menu/CategoryFormDialog';
import MenuItemFormDialog, { MenuItemFormValues } from '@/components/restaurant/menu/MenuItemFormDialog';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { useNavigate } from 'react-router-dom';
import { Routes } from '@/router/routes';
import { useMenuCategoryItems } from '@/hooks/useMenuCategoryItems'; // Importando o hook de itens
import CategoryItemManager from '@/components/restaurant/menu/CategoryItemManager';
import { useCategoryReorder } from '@/hooks/useCategoryReorder';

const MenuManagement: React.FC = () => {
  const navigate = useNavigate();
  const { restaurant, isLoading: authLoading } = useAuthContext();
  const restaurantId = restaurant?.id || '';

  const { categoriesQuery } = useMenuCategoryItems(restaurantId); // Usando o hook de itens para buscar categorias
  const { createCategoryMutation, updateCategoryMutation, deleteCategoryMutation, swapCategoryOrderMutation } = useCategoryMutations(restaurantId);
  const { createItemMutation, updateItemMutation } = useMenuItemManagement('temp'); // Usado apenas para mutações de item

  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [currentItemCategoryId, setCurrentItemCategoryId] = useState<string | null>(null);
  
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<(() => void) | null>(null);
  const [confirmationTitle, setConfirmationTitle] = useState('');
  const [confirmationDescription, setConfirmationDescription] = useState('');

  const categories = categoriesQuery.data || [];
  const isLoading = categoriesQuery.isLoading || authLoading;
  const isMutating = createCategoryMutation.isPending || updateCategoryMutation.isPending || deleteCategoryMutation.isPending || swapCategoryOrderMutation.isPending;
  const isItemMutating = createItemMutation.isPending || updateItemMutation.isPending;

  // --- Handlers de Categoria ---

  const handleOpenCategoryDialog = (category: MenuCategory | null) => {
    setEditingCategory(category);
    setIsCategoryDialogOpen(true);
  };

  const handleSaveCategory = useCallback(async (data: CategoryFormValues) => {
    if (!restaurantId) return;

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
  
  const handleReorderCategory = useCallback((category_id_a: string, category_id_b: string) => {
    if (category_id_a && category_id_b) {
      swapCategoryOrderMutation.mutate({ category_id_a, category_id_b });
    }
  }, [swapCategoryOrderMutation]);

  // --- Handlers de Item ---
  
  const handleOpenItemDialog = (item: MenuItem | null, categoryId: string) => {
    setEditingItem(item);
    setCurrentItemCategoryId(categoryId);
    setIsItemDialogOpen(true);
  };
  
  const handleSaveItem = useCallback(async (data: MenuItemFormValues) => {
    if (!currentItemCategoryId) return;
    
    if (editingItem) {
      await updateItemMutation.mutateAsync({
        id: editingItem.id,
        name: data.name,
        description: data.description || '',
        price: data.price,
        image_url: data.image_url || null,
        is_active: data.is_active,
      });
    } else {
      // NOTE: O order_index será 0 por padrão no DB, o que é aceitável por enquanto.
      await createItemMutation.mutateAsync({
        category_id: currentItemCategoryId,
        name: data.name,
        description: data.description || '',
        price: data.price,
        image_url: data.image_url || null,
        is_active: data.is_active,
      });
    }
  }, [editingItem, currentItemCategoryId, createItemMutation, updateItemMutation]);


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (categoriesQuery.isError) {
    return <div className="text-center text-red-500">Erro ao carregar o menu.</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Button variant="link" onClick={() => navigate(Routes.PROFILE)} className="mb-4 pl-0">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para Perfil
      </Button>
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gerenciar Cardápio</h1>
        <Button onClick={() => handleOpenCategoryDialog(null)} disabled={isMutating}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar Categoria
        </Button>
      </div>

      <div className="space-y-4">
        {categories.map((category, index) => (
          <CategoryItemManager
            key={category.id}
            category={category}
            onEditCategory={handleOpenCategoryDialog}
            onDeleteCategory={handleDeleteCategory}
            onReorder={handleReorderCategory}
            isFirst={index === 0}
            isLast={index === categories.length - 1}
            isSwapping={swapCategoryOrderMutation.isPending}
            onOpenItemDialog={handleOpenItemDialog}
          />
        ))}
        
        {categories.length === 0 && (
            <p className="text-center text-gray-500 mt-8">Nenhuma categoria encontrada. Clique em "Adicionar Categoria" para começar.</p>
        )}
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
      
      <MenuItemFormDialog
        isOpen={isItemDialogOpen}
        onClose={() => setIsItemDialogOpen(false)}
        categoryId={currentItemCategoryId || ''}
        initialData={editingItem}
        onSave={handleSaveItem}
        isLoading={isItemMutating}
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
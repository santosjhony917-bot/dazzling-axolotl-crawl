"use client";

import React, { useState, useMemo } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MenuCategory, MenuItem } from '@/types/restaurant';
import { getRestaurantMenu, deleteCategory, deleteMenuItem, swapCategoryOrder } from '@/integrations/supabase/restaurant';
import CategoryDialog from '@/components/restaurant/CategoryDialog';
import MenuItemDialog from '@/components/restaurant/MenuItemDialog';
import CategoryItemManager from '@/components/restaurant/CategoryItemManager';
import ConfirmationDialog from '@/components/ConfirmationDialog';

const MenuManagement: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  
  const [isMenuItemDialogOpen, setIsMenuItemDialogOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<(() => void) | null>(null);
  const [confirmationTitle, setConfirmationTitle] = useState('');
  const [confirmationDescription, setConfirmationDescription] = useState('');

  const { data: menuData, isLoading, isError } = useQuery({
    queryKey: ['restaurantMenu'],
    queryFn: getRestaurantMenu,
  });

  const categories = useMemo(() => menuData?.categories || [], [menuData]);
  const items = useMemo(() => menuData?.items || [], [menuData]);

  // --- Mutations ---

  const deleteCategoryMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Categoria excluída com sucesso." });
      queryClient.invalidateQueries({ queryKey: ['restaurantMenu'] });
    },
    onError: (error) => {
      toast({ title: "Erro", description: `Falha ao excluir categoria: ${error.message}`, variant: "destructive" });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: deleteMenuItem,
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Item de menu excluído com sucesso." });
      queryClient.invalidateQueries({ queryKey: ['restaurantMenu'] });
    },
    onError: (error) => {
      toast({ title: "Erro", description: `Falha ao excluir item: ${error.message}`, variant: "destructive" });
    },
  });

  const reorderCategoryMutation = useMutation({
    mutationFn: ({ categoryIdA, categoryIdB }: { categoryIdA: string, categoryIdB: string }) => swapCategoryOrder(categoryIdA, categoryIdB),
    onSuccess: () => {
      // Optimistic update is handled in handleReorderCategory, just invalidate to confirm
      queryClient.invalidateQueries({ queryKey: ['restaurantMenu'] });
    },
    onError: (error) => {
      toast({ title: "Erro", description: `Falha ao reordenar categorias: ${error.message}`, variant: "destructive" });
      queryClient.invalidateQueries({ queryKey: ['restaurantMenu'] }); // Revert on error
    },
  });

  // --- Handlers ---

  const handleOpenCategoryDialog = (category: MenuCategory | null) => {
    setEditingCategory(category);
    setIsCategoryDialogOpen(true);
  };

  const handleOpenItemDialog = (categoryId: string, item: MenuItem | null = null) => {
    setSelectedCategoryId(categoryId);
    setEditingMenuItem(item);
    setIsMenuItemDialogOpen(true);
  };

  const handleDeleteCategory = (categoryId: string) => {
    setConfirmationTitle("Excluir Categoria");
    setConfirmationDescription("Tem certeza de que deseja excluir esta categoria? Todos os itens de menu associados serão perdidos.");
    setConfirmationAction(() => () => deleteCategoryMutation.mutate(categoryId));
    setIsConfirmationOpen(true);
  };

  const handleDeleteItem = (itemId: string) => {
    setConfirmationTitle("Excluir Item de Menu");
    setConfirmationDescription("Tem certeza de que deseja excluir este item de menu?");
    setConfirmationAction(() => () => deleteItemMutation.mutate(itemId));
    setIsConfirmationOpen(true);
  };

  const handleReorderCategory = (categoryId: string, direction: 'up' | 'down') => {
    const currentIndex = categories.findIndex(c => c.id === categoryId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= categories.length) {
      toast({ title: "Aviso", description: "Não é possível mover mais nesta direção.", variant: "default" });
      return;
    }

    const categoryA = categories[currentIndex];
    const categoryB = categories[targetIndex];

    // Optimistic Update
    queryClient.setQueryData(['restaurantMenu'], (oldData: { categories: MenuCategory[], items: MenuItem[] } | undefined) => {
      if (!oldData) return oldData;
      const newCategories = [...oldData.categories];
      [newCategories[currentIndex], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[currentIndex]];
      return { ...oldData, categories: newCategories };
    });

    reorderCategoryMutation.mutate({ categoryIdA: categoryA.id, categoryIdB: categoryB.id });
  };

  // --- Render Logic ---

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return <div className="text-center text-red-500">Erro ao carregar o menu.</div>;
  }

  const groupedItems = items.reduce((acc, item) => {
    const categoryId = item.category_id;
    if (!acc[categoryId]) {
      acc[categoryId] = [];
    }
    acc[categoryId].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gerenciar Menu</h1>
        <Button onClick={() => handleOpenCategoryDialog(null)}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar Categoria
        </Button>
      </div>

      <div className="space-y-4">
        {categories.length === 0 ? (
          <div className="text-center p-10 border-2 border-dashed rounded-lg text-gray-500">
            <p className="mb-4">Você ainda não tem categorias de menu.</p>
            <Button onClick={() => handleOpenCategoryDialog(null)}>
              Criar Primeira Categoria
            </Button>
          </div>
        ) : (
          categories.map((category) => (
            <CategoryItemManager
              key={category.id}
              category={category}
              items={groupedItems[category.id] || []}
              onEditCategory={handleOpenCategoryDialog}
              onDeleteCategory={handleDeleteCategory}
              onAddItem={(categoryId) => handleOpenItemDialog(categoryId)}
              onEditItem={(item) => handleOpenItemDialog(item.category_id, item)}
              onDeleteItem={handleDeleteItem}
              onReorder={handleReorderCategory}
            />
          ))
        )}
      </div>

      {/* Dialogs */}
      <CategoryDialog
        isOpen={isCategoryDialogOpen}
        onClose={() => setIsCategoryDialogOpen(false)}
        category={editingCategory}
      />
      <MenuItemDialog
        isOpen={isMenuItemDialogOpen}
        onClose={() => setIsMenuItemDialogOpen(false)}
        item={editingMenuItem}
        categoryId={selectedCategoryId}
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
      />
    </div>
  );
};

export default MenuManagement;
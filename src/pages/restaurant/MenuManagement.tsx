"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Loader2, Utensils, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { MenuCategory, MenuItem } from '@/types/supabase';
import { useMenuManagement, useCategoryMutations } from '@/hooks/useCategoryManagement';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import CategoryDialog from '@/components/restaurant/CategoryDialog';
import { CategoryFormValues } from '@/components/restaurant/menu/CategoryFormDialog';
import MenuItemDialog from '@/components/restaurant/MenuItemDialog';
import { MenuItemFormValues } from '@/components/restaurant/menu/ItemFormDialog';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';
import CategoryList from '@/components/restaurant/menu/CategoryList';
import { Card, CardContent } from '@/components/ui/card';
import { showError } from '@/utils/toast';
import { Link } from 'react-router-dom'; // Importação corrigida para React Router

const MenuManagement: React.FC = () => {
  const { toast } = useToast();
  const { restaurant, isLoading: profileLoading } = useRestaurantProfile();
  const restaurantId = restaurant?.id || '';

  const { categoriesQuery } = useMenuManagement(restaurantId);
  const { createCategoryMutation, updateCategoryMutation, deleteCategoryMutation } = useCategoryMutations(restaurantId);
  
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
    if (!restaurantId) {
      showError("ID do restaurante não encontrado. Por favor, crie seu restaurante primeiro.");
      return;
    }
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
        updates: {
          name: data.name,
          is_active: data.is_active,
          order_index: data.order_index,
        }
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
  
  // --- Render Logic ---

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Se carregou e não há restaurantId, o usuário precisa criar um restaurante.
  if (!restaurantId) {
    return (
      <RestaurantAreaPageLayout title="Gerenciar Cardápio" icon={Utensils} backPath="restaurant-area/profile-menu">
        <Card className="m-4 p-6 text-center border-dashed border-2 border-red-300 bg-red-50">
          <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-red-700 mb-2">Nenhum Restaurante Encontrado</h2>
          <p className="text-gray-600 mb-4">Você precisa criar e configurar seu restaurante antes de gerenciar o cardápio.</p>
          <Link to="/restaurant-area/profile-menu">
            <Button className="bg-red-600 hover:bg-red-700">
              Ir para Configuração do Restaurante
            </Button>
          </Link>
        </Card>
      </RestaurantAreaPageLayout>
    );
  }

  if (categoriesQuery.isError) {
    return <div className="text-center text-red-500 p-4">Erro ao carregar categorias: {categoriesQuery.error.message}</div>;
  }

  return (
    <RestaurantAreaPageLayout title="Gerenciar Cardápio" icon={Utensils} backPath="restaurant-area/profile-menu">
      <div className="p-4 space-y-6">
        
        <Card className="shadow-soft-lg border-none rounded-xl bg-white">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-bold text-primary">Categorias do Menu</h1>
              <Button 
                onClick={() => handleOpenCategoryDialog(null)} 
                disabled={isCategoryMutating}
                className="bg-highlight hover:bg-highlight/90"
              >
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
        onOpenChange={setIsCategoryDialogOpen}
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
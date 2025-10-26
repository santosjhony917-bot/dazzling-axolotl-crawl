import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMenuManagement, useCategoryMutations } from '@/hooks/useMenuManagement';
import { CategoryList } from '@/components/restaurant/menu/CategoryList';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import { MenuCategory } from '@/types';
import CategoryFormDialog, { CategoryFormValues } from '@/components/restaurant/menu/CategoryFormDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthContext } from '@/context/AuthContext';

export default function MenuManagement() {
  // Obtendo o restaurante do contexto de autenticação
  const { restaurant, isLoading: authLoading } = useAuthContext();
  const restaurantId = restaurant?.id || null;
  
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurantId) {
    return <div className="p-4 text-red-500">ID do Restaurante não encontrado. Certifique-se de que seu perfil de restaurante está vinculado.</div>;
  }

  const { categoriesQuery, deleteCategoryMutation } = useMenuManagement(restaurantId);
  const { createCategoryMutation, updateCategoryMutation } = useCategoryMutations(restaurantId);

  const categories = categoriesQuery.data || [];
  const isLoading = categoriesQuery.isLoading;
  const isSaving = createCategoryMutation.isPending || updateCategoryMutation.isPending;

  const handleOpenDialog = (category: MenuCategory | null = null) => {
    setEditingCategory(category);
    setIsCategoryModalOpen(true);
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (confirm('Tem certeza que deseja deletar esta categoria? Todos os itens de menu associados serão perdidos.')) {
      deleteCategoryMutation.mutate(categoryId);
    }
  };

  const handleSaveCategory = async (data: CategoryFormValues) => {
    // Erro 1: UpdateCategoryPayload requer name e is_active
    if (editingCategory) {
      await updateCategoryMutation.mutateAsync({
        id: editingCategory.id,
        name: data.name, // Garantindo que 'name' está presente
        is_active: data.is_active, // Garantindo que 'is_active' está presente
      });
    } else {
      // Erro 2: CreateCategoryPayload requer name e is_active
      await createCategoryMutation.mutateAsync({
        restaurant_id: restaurantId,
        name: data.name, // Garantindo que 'name' está presente
        is_active: data.is_active, // Garantindo que 'is_active' está presente
      });
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gerenciar Menu</h1>
        <Button onClick={() => handleOpenDialog(null)}>
          <PlusCircle className="w-4 h-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      <h2 className="text-xl font-semibold mb-4">Categorias</h2>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <CategoryList
          categories={categories}
          restaurantId={restaurantId}
          onEdit={handleOpenDialog}
          onDelete={handleDeleteCategory}
        />
      )}

      <CategoryFormDialog
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        restaurantId={restaurantId}
        initialData={editingCategory}
        onSave={handleSaveCategory}
        isLoading={isSaving}
      />
    </div>
  );
}
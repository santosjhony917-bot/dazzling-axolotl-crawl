import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMenuManagement } from '@/hooks/useMenuManagement';
import { CategoryList } from '@/components/restaurant/menu/CategoryList';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { MenuCategory } from '@/types';
import CategoryFormDialog from '@/components/restaurant/menu/CategoryFormDialog';
import { Skeleton } from '@/components/ui/skeleton';

export default function RestaurantMenuPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);

  if (!restaurantId) {
    return <div className="p-4 text-red-500">ID do Restaurante não encontrado.</div>;
  }

  // Corrigido: Acessando as propriedades corretas do hook
  const { 
    categoriesQuery, 
    deleteCategoryMutation 
  } = useMenuManagement(restaurantId);

  const categories = categoriesQuery.data || [];
  const isLoading = categoriesQuery.isLoading;

  const handleOpenDialog = (category: MenuCategory | null = null) => {
    setEditingCategory(category);
    setIsDialogOpen(true);
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (confirm('Tem certeza que deseja deletar esta categoria? Todos os itens de menu associados serão perdidos.')) {
      deleteCategoryMutation.mutate(categoryId);
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
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        restaurantId={restaurantId}
        initialData={editingCategory}
      />
    </div>
  );
}
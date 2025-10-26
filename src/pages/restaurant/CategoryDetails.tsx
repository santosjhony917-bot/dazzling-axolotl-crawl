import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMenuItemManagement } from '@/hooks/useMenuManagement';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { MenuItem } from '@/types';
import MenuItemFormDialog, { MenuItemFormValues } from '@/components/restaurant/menu/MenuItemFormDialog';
import { MenuItemList } from '@/components/restaurant/menu/MenuItemList';
import { Routes } from '@/router/routes';

export default function CategoryDetails() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  if (!categoryId) {
    return <div className="p-4 text-red-500">ID da Categoria não encontrado.</div>;
  }

  const { itemsQuery, createItemMutation, updateItemMutation, deleteItemMutation } = useMenuItemManagement(categoryId);
  
  // Nota: Para obter o nome da categoria, precisaríamos de um hook separado ou buscar a categoria aqui.
  // Por enquanto, vamos focar na funcionalidade dos itens.
  
  const items = itemsQuery.data || [];
  const isLoading = itemsQuery.isLoading;
  const isSaving = createItemMutation.isPending || updateItemMutation.isPending;

  const handleOpenDialog = (item: MenuItem | null = null) => {
    setEditingItem(item);
    setIsItemModalOpen(true);
  };

  const handleDeleteItem = (itemId: string) => {
    if (confirm('Tem certeza que deseja deletar este item de menu?')) {
      deleteItemMutation.mutate(itemId);
    }
  };

  const handleSaveItem = async (data: MenuItemFormValues) => {
    // Explicitly map fields to satisfy UpdateItemPayload
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
      // Explicitly map fields to satisfy CreateItemPayload
      await createItemMutation.mutateAsync({
        category_id: categoryId,
        name: data.name,
        description: data.description || '',
        price: data.price,
        image_url: data.image_url || null,
        is_active: data.is_active,
      });
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Button variant="link" onClick={() => navigate(Routes.MENU_MANAGEMENT)} className="mb-4 pl-0">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar para Categorias
      </Button>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Itens de Menu</h1>
        <Button onClick={() => handleOpenDialog(null)}>
          <PlusCircle className="w-4 h-4 mr-2" />
          Novo Item
        </Button>
      </div>

      <h2 className="text-xl font-semibold mb-4">Itens na Categoria: {categoryId}</h2> {/* Placeholder for category name */}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        <MenuItemList
          items={items}
          onEdit={handleOpenDialog}
          onDelete={handleDeleteItem}
        />
      )}

      <MenuItemFormDialog
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        categoryId={categoryId}
        initialData={editingItem}
        onSave={handleSaveItem}
        isLoading={isSaving}
      />
    </div>
  );
}
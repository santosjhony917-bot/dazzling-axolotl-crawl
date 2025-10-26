import React, { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMenuItemManagement, useMenuManagement } from '@/hooks/useMenuManagement';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowLeft, Loader2, Utensils } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { MenuItem } from '@/types';
import MenuItemFormDialog, { MenuItemFormValues } from '@/components/restaurant/menu/MenuItemFormDialog';
import { MenuItemList } from '@/components/restaurant/menu/MenuItemList';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { Card, CardContent } from '@/components/ui/card';

export default function CategoryDetails() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  
  // Estado para Confirmação
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<(() => void) | null>(null);
  const [confirmationTitle, setConfirmationTitle] = useState('');
  const [confirmationDescription, setConfirmationDescription] = useState('');

  if (!categoryId) {
    return <div className="p-4 text-red-500">ID da Categoria não encontrado.</div>;
  }

  const { itemsQuery, createItemMutation, updateItemMutation, deleteItemMutation } = useMenuItemManagement(categoryId);
  
  // Busca o nome da categoria (usando o hook de categorias, mas filtrando localmente)
  // Nota: Para evitar a necessidade de passar o restaurantId, vamos buscar o nome da categoria diretamente.
  const { categoriesQuery } = useMenuManagement(itemsQuery.data?.[0]?.category_id || '');
  const categoryName = categoriesQuery.data?.find(c => c.id === categoryId)?.name || 'Carregando...';
  
  const items = itemsQuery.data || [];
  const isLoading = itemsQuery.isLoading || categoriesQuery.isLoading;
  const isSaving = createItemMutation.isPending || updateItemMutation.isPending || deleteItemMutation.isPending;

  const handleOpenDialog = (item: MenuItem | null = null) => {
    setEditingItem(item);
    setIsItemModalOpen(true);
  };

  const handleDeleteItem = (itemId: string) => {
    setConfirmationTitle("Excluir Item de Menu");
    setConfirmationDescription("Tem certeza de que deseja excluir este item de menu?");
    setConfirmationAction(() => () => deleteItemMutation.mutate(itemId));
    setIsConfirmationOpen(true);
  };

  const handleSaveItem = useCallback(async (data: MenuItemFormValues) => {
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
      await createItemMutation.mutateAsync({
        category_id: categoryId,
        name: data.name,
        description: data.description || '',
        price: data.price,
        image_url: data.image_url || null,
        is_active: data.is_active,
      });
    }
  }, [editingItem, updateItemMutation, createItemMutation, categoryId]);

  return (
    <RestaurantAreaPageLayout title="Gerenciar Itens" icon={Utensils} backPath="restaurant-area/menu">
      <div className="p-4 space-y-6">
        
        <Card className="shadow-soft-lg border-none rounded-2xl">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-bold text-primary">Itens em: {categoryName}</h1>
              <Button onClick={() => handleOpenDialog(null)} disabled={isSaving} className="bg-highlight hover:bg-highlight/90 rounded-xl shadow-soft-md">
                <PlusCircle className="w-4 h-4 mr-2" />
                Novo Item
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : (
          <MenuItemList
            items={items}
            onEdit={handleOpenDialog}
            onDelete={handleDeleteItem}
          />
        )}
      </div>

      <MenuItemFormDialog
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        categoryId={categoryId}
        initialData={editingItem}
        onSave={handleSaveItem}
        isLoading={isSaving}
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
}
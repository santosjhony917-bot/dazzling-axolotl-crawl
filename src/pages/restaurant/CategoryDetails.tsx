import React, { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMenuItemManagement } from '@/hooks/useMenuItemManagement'; // CORRIGIDO
import { useMenuManagement } from '@/hooks/useCategoryManagement'; // CORRIGIDO: Usando o hook de categorias para buscar o nome
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowLeft, Loader2, Utensils } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { MenuItem } from '@/types/menu'; // Corrected import
import ItemFormDialog, { MenuItemFormValues } from '@/components/restaurant/menu/ItemFormDialog'; // CORRIGIDO: Importando ItemFormDialog
import { MenuItemList } from '@/components/restaurant/menu/MenuItemList';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthData } from '@/context/AuthContext';

export default function CategoryDetails() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { restaurant } = useAuthData(); // Get restaurant data to find restaurantId
  const restaurantId = restaurant?.id || '';
  
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

  // Use the category management hook to fetch all categories for the restaurant
  const { categoriesQuery } = useMenuManagement(restaurantId); 
  
  // Use the item management hook for the specific category
  const { itemsQuery, createItemMutation, updateItemMutation, deleteItemMutation } = useMenuItemManagement(categoryId);
  
  // Find the category name from the fetched categories
  const categoryName = useMemo(() => {
    return categoriesQuery.data?.find(c => c.id === categoryId)?.name || 'Carregando...';
  }, [categoriesQuery.data, categoryId]);
  
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
        updates: {
          name: data.name,
          description: data.description || null,
          price: data.price,
          image_url: data.image_url || null,
          is_active: data.is_active,
        }
      });
    } else {
      await createItemMutation.mutateAsync({
        category_id: categoryId,
        name: data.name,
        description: data.description || null,
        price: data.price,
        image_url: data.image_url || null,
        is_active: data.is_active,
      });
    }
  }, [editingItem, updateItemMutation, createItemMutation, categoryId]);

  return (
    <RestaurantAreaPageLayout title="Gerenciar Itens" icon={Utensils} backPath="restaurant-area/menu">
      <div className="p-4 space-y-6">
        
        <Card className="shadow-soft-lg border-none rounded-xl bg-white">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-bold text-primary">Itens em: {categoryName}</h1>
              <Button onClick={() => handleOpenDialog(null)} disabled={isSaving} className="bg-highlight hover:bg-highlight/90">
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

      <ItemFormDialog
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
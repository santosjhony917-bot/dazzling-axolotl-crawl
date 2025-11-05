import React, { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMenuItemManagement } from '@/hooks/useMenuItemManagement';
import { useMenuManagement } from '@/hooks/useCategoryManagement';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowLeft, Loader2, Utensils } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { MenuItem, MenuCategory } from '@/types/supabase';
import ItemFormDialog, { MenuItemFormValues } from '@/components/restaurant/menu/ItemFormDialog';
import { MenuItemList } from '@/components/restaurant/menu/MenuItemList'; // RE-ADICIONADO: Importando MenuItemList
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { Card, CardContent } from '@/components/ui/card';
import { showError, showSuccess } from '@/utils/toast';
import { useAuthData } from '@/context/AuthContext';
import MenuItemDialog from '@/components/restaurant/MenuItemDialog';
import { useQueryClient } from '@tanstack/react-query';

export default function CategoryDetails() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { restaurant } = useAuthData();
  const restaurantId = restaurant?.id || '';
  
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<MenuItem | null>(null);
  
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
  const queryClient = useQueryClient();
  
  // Find the category from the fetched categories
  const currentCategory = useMemo(() => {
    return categoriesQuery.data?.find(c => c.id === categoryId);
  }, [categoriesQuery.data, categoryId]);

  const items = itemsQuery.data || [];

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<MenuItem | null>(null);
  
  // Estado para Confirmação
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<(() => void) | null>(null);
  const [confirmationTitle, setConfirmationTitle] = useState('');
  const [confirmationDescription, setConfirmationDescription] = useState('');

  if (!currentCategory && !categoriesQuery.isLoading) {
    return <div className="p-4 text-red-500">Categoria não encontrada.</div>;
  }

  const isSaving = createItemMutation.isPending || updateItemMutation.isPending;

  const handleOpenDialog = (item: MenuItem | null = null) => {
    setEditingItem(item);
    setIsItemModalOpen(true);
  };

  const handleDeleteRequest = (itemId: string) => {
    const itemToDelete = items.find(item => item.id === itemId);
    if (!itemToDelete) {
      showError("Item não encontrado para exclusão.");
      return;
    }
    setDeletingItem(itemToDelete);
    setConfirmationTitle('Confirmar Exclusão');
    setConfirmationDescription(`Tem certeza que deseja excluir o item "${itemToDelete.name}"?`);
    setConfirmationAction(() => () => handleDeleteItem());
    setIsConfirmationOpen(true);
  };

  const handleDeleteItem = () => {
    if (deletingItem) {
      deleteItemMutation.mutate(deletingItem.id, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['menuItems', categoryId] });
          setDeletingItem(null);
          setIsConfirmationOpen(false);
          showSuccess('Item excluído com sucesso!');
        },
        onError: (error) => {
          showError(`Falha ao excluir item: ${error.message}`);
          setIsConfirmationOpen(false);
        }
      });
    }
  };

  const handleSaveItem = useCallback(async (data: MenuItemFormValues) => {
    try {
      if (editingItem) {
        await updateItemMutation.mutateAsync({
          id: editingItem.id,
          updates: {
            name: data.name,
            description: data.description,
            price: data.price,
            image_url: data.image_url,
            is_active: data.is_active,
          },
        });
      } else {
        await createItemMutation.mutateAsync({
          category_id: categoryId,
          name: data.name,
          description: data.description,
          price: data.price,
          image_url: data.image_url,
          is_active: data.is_active,
        });
      }
      // Fecha o modal após o sucesso da mutação
      setIsItemModalOpen(false); 
    } catch (e) {
      // O erro já é tratado no hook, mas pode-se adicionar lógica extra aqui se necessário
    }
  }, [editingItem, updateItemMutation, createItemMutation, categoryId]);

  return (
    <RestaurantAreaPageLayout
      title={currentCategory ? `Itens: ${currentCategory.name}` : 'Carregando Categoria...'}
      backLink={`/restaurant-area/menu`}
    >
      <div className="p-4">
        <div className="flex justify-end mb-4">
          <Button onClick={() => handleOpenDialog(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Item
          </Button>
        </div>

        {itemsQuery.isLoading ? (
          <div className="text-center p-8">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-gray-500">Carregando itens...</p>
          </div>
        ) : itemsQuery.isError ? (
          <div className="text-center text-red-500 p-8 bg-red-50 rounded-lg">
            <p>Ocorreu um erro ao carregar os itens.</p>
          </div>
        ) : (
          <MenuItemList
            items={items}
            onEdit={handleOpenDialog}
            onDelete={handleDeleteRequest}
          />
        )}
      </div>

      {currentCategory && (
        <MenuItemDialog
          isOpen={isItemModalOpen}
          onOpenChange={setIsItemModalOpen}
          category={currentCategory}
          item={editingItem}
          onSave={handleSaveItem}
          isLoading={isSaving}
        />
      )}
      
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
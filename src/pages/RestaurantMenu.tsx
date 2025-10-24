import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import { useMenuManagement } from '@/hooks/useMenuManagement';
import { MenuCategory, MenuItem } from '@/types/menu';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Utensils, Trash2, Edit, ChevronDown } from 'lucide-react';
import RestaurantAreaHeader from '@/components/restaurant/RestaurantAreaHeader';
import { createPageUrl } from '@/utils/url';
import { Skeleton } from '@/components/ui/skeleton';
import { showError, showSuccess } from '@/utils/toast';
import CategoryFormDialog from '@/components/restaurant/menu/CategoryFormDialog';
import ItemFormDialog from '@/components/restaurant/menu/ItemFormDialog';
import MenuItemCard from '@/components/restaurant/menu/MenuItemCard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client'; // <-- Import adicionado

const RestaurantMenu: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id || null;
  const { restaurant, loading: profileLoading } = useRestaurantProfile(userId);
  const restaurantId = restaurant?.id || null;

  const { categories, isLoading: menuLoading, refetch } = useMenuManagement(restaurantId);

  // Dialog States
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | undefined>(undefined);
  const [editingItem, setEditingItem] = useState<MenuItem | undefined>(undefined);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  
  // Deletion States
  const [isDeleteCategoryAlertOpen, setIsDeleteCategoryAlertOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<MenuCategory | null>(null);
  const [isDeleteItemAlertOpen, setIsDeleteItemAlertOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);

  // Loading States for CRUD operations
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- Category CRUD Operations ---

  const handleOpenNewCategoryDialog = () => {
    setEditingCategory(undefined);
    setIsCategoryDialogOpen(true);
  };

  const handleEditCategory = (category: MenuCategory) => {
    setEditingCategory(category);
    setIsCategoryDialogOpen(true);
  };

  const handleSaveCategory = useCallback(async (data: { name: string }) => {
    if (!restaurantId) {
      showError("Restaurante não encontrado.");
      return;
    }
    setIsSaving(true);
    try {
      if (editingCategory) {
        // Update
        const { error } = await supabase
          .from('menu_categories')
          .update({ name: data.name })
          .eq('id', editingCategory.id);
        
        if (error) throw error;
        showSuccess('Categoria atualizada com sucesso!');
      } else {
        // Insert
        const { error } = await supabase
          .from('menu_categories')
          .insert({ name: data.name, restaurant_id: restaurantId });
        
        if (error) throw error;
        showSuccess('Categoria criada com sucesso!');
      }
      refetch();
      setIsCategoryDialogOpen(false);
    } catch (error) {
      showError('Falha ao salvar a categoria.');
      console.error('Category save error:', error);
    } finally {
      setIsSaving(false);
    }
  }, [restaurantId, editingCategory, refetch]);

  const handleDeleteCategory = (category: MenuCategory) => {
    setCategoryToDelete(category);
    setIsDeleteCategoryAlertOpen(true);
  };

  const confirmDeleteCategory = useCallback(async () => {
    if (!categoryToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('menu_categories')
        .delete()
        .eq('id', categoryToDelete.id);

      if (error) throw error;
      showSuccess(`Categoria "${categoryToDelete.name}" e seus itens foram excluídos.`);
      refetch();
    } catch (error) {
      showError('Falha ao excluir a categoria.');
      console.error('Category delete error:', error);
    } finally {
      setIsDeleting(false);
      setIsDeleteCategoryAlertOpen(false);
      setCategoryToDelete(null);
    }
  }, [categoryToDelete, refetch]);

  // --- Item CRUD Operations ---

  const handleOpenNewItemDialog = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setEditingItem(undefined);
    setIsItemDialogOpen(true);
  };

  const handleEditItem = (item: MenuItem) => {
    setSelectedCategoryId(item.category_id);
    setEditingItem(item);
    setIsItemDialogOpen(true);
  };

  const handleSaveItem = useCallback(async (data: any) => {
    if (!selectedCategoryId) {
      showError("Categoria não selecionada.");
      return;
    }
    setIsSaving(true);
    try {
      const itemData = {
        name: data.name,
        description: data.description,
        price: data.price,
        image_url: data.image_url,
        category_id: selectedCategoryId,
      };

      if (editingItem) {
        // Update
        const { error } = await supabase
          .from('menu_items')
          .update(itemData)
          .eq('id', editingItem.id);
        
        if (error) throw error;
        showSuccess('Item atualizado com sucesso!');
      } else {
        // Insert
        const { error } = await supabase
          .from('menu_items')
          .insert(itemData);
        
        if (error) throw error;
        showSuccess('Item criado com sucesso!');
      }
      refetch();
      setIsItemDialogOpen(false);
    } catch (error) {
      showError('Falha ao salvar o item.');
      console.error('Item save error:', error);
    } finally {
      setIsSaving(false);
    }
  }, [selectedCategoryId, editingItem, refetch]);

  const handleDeleteItem = (item: MenuItem) => {
    setItemToDelete(item);
    setIsDeleteItemAlertOpen(true);
  };

  const confirmDeleteItem = useCallback(async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', itemToDelete.id);

      if (error) throw error;
      showSuccess(`Item "${itemToDelete.name}" excluído.`);
      refetch();
    } catch (error) {
      showError('Falha ao excluir o item.');
      console.error('Item delete error:', error);
    } finally {
      setIsDeleting(false);
      setIsDeleteItemAlertOpen(false);
      setItemToDelete(null);
    }
  }, [itemToDelete, refetch]);

  // --- Loading and Error States ---

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-[#f5f7f8] p-4 max-w-md mx-auto">
        <RestaurantAreaHeader title="Cardápio" icon={Utensils} backPath="restaurant-area/perfil" />
        <Skeleton className="h-10 w-full mt-4" />
        <Skeleton className="h-40 w-full mt-4" />
        <Skeleton className="h-40 w-full mt-4" />
      </div>
    );
  }

  if (!user || !restaurantId) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold text-[#022D68]">Acesso Negado</h2>
        <p className="text-gray-600 mt-2">Você precisa estar logado como proprietário de um restaurante para gerenciar o cardápio.</p>
        <Button onClick={() => navigate(createPageUrl('restaurant-login'))} className="mt-4 bg-[#E47948] hover:bg-[#E47948]/90">
          Fazer Login
        </Button>
      </div>
    );
  }

  return (
    <div className="relative bg-[#f5f7f8] font-sans antialiased flex min-h-screen w-full flex-col items-center overflow-x-hidden">
      <RestaurantAreaHeader title="Cardápio" icon={Utensils} backPath="restaurant-area/perfil" />

      <main className="flex-1 w-full max-w-md p-4 space-y-6">
        
        <Button 
          onClick={handleOpenNewCategoryDialog}
          className="w-full flex items-center justify-center gap-2 min-w-[84px] cursor-pointer overflow-hidden rounded-full h-12 px-4 bg-highlight hover:bg-highlight/90 text-white text-base font-bold leading-normal tracking-[0.015em]"
        >
          <Plus className="w-5 h-5 mr-2" />
          Adicionar Nova Categoria
        </Button>

        {menuLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : categories.length === 0 ? (
          <Alert className="border-dashed text-center">
            <Utensils className="h-4 w-4" />
            <AlertTitle>Cardápio Vazio</AlertTitle>
            <AlertDescription>
              Comece adicionando sua primeira categoria de menu.
            </AlertDescription>
          </Alert>
        ) : (
          <Accordion type="multiple" className="w-full space-y-4">
            {categories.map(category => (
              <Card key={category.id} className="shadow-md border-none">
                <AccordionItem value={category.id} className="border-b-0">
                  <AccordionTrigger className="flex items-center justify-between p-4 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <Utensils className="w-5 h-5 text-primary" />
                      <span className="font-bold text-lg text-primary">{category.name}</span>
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 text-gray-500" />
                  </AccordionTrigger>
                  <AccordionContent className="p-4 pt-0 space-y-4">
                    
                    {/* Item List */}
                    <div className="space-y-3">
                      {category.items.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center p-4 border border-dashed rounded-lg">
                          Nenhum item nesta categoria.
                        </p>
                      ) : (
                        category.items.map(item => (
                          <MenuItemCard 
                            key={item.id} 
                            item={item} 
                            onEdit={() => handleEditItem(item)} 
                            onDelete={() => handleDeleteItem(item)} 
                          />
                        ))
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <Button 
                        variant="outline" 
                        onClick={() => handleOpenNewItemDialog(category.id)}
                        className="flex-1 border-highlight text-highlight hover:bg-highlight/5"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Item
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleEditCategory(category)}
                        className="text-blue-500 hover:bg-blue-50"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteCategory(category)}
                        className="text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Card>
            ))}
          </Accordion>
        )}
      </main>

      {/* Dialogs */}
      <CategoryFormDialog
        isOpen={isCategoryDialogOpen}
        onClose={() => setIsCategoryDialogOpen(false)}
        onSave={handleSaveCategory}
        initialData={editingCategory}
        isLoading={isSaving}
      />

      <ItemFormDialog
        isOpen={isItemDialogOpen}
        onClose={() => setIsItemDialogOpen(false)}
        onSave={handleSaveItem}
        initialData={editingItem}
        isLoading={isSaving}
        categoryId={selectedCategoryId || ''}
      />

      {/* Delete Category Alert */}
      <AlertDialog open={isDeleteCategoryAlertOpen} onOpenChange={setIsDeleteCategoryAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação excluirá permanentemente a categoria "{categoryToDelete?.name}" e todos os itens de menu associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCategory} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Excluir Categoria'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Item Alert */}
      <AlertDialog open={isDeleteItemAlertOpen} onOpenChange={setIsDeleteItemAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação excluirá permanentemente o item "{itemToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteItem} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Excluir Item'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RestaurantMenu;
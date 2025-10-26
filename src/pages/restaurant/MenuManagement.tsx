import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Utensils, PlusCircle, Edit, Trash2, Loader2, Package, AlertTriangle, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import RestaurantAreaHeader from '@/components/restaurant/RestaurantAreaHeader';
import { useAuthContext } from '@/context/AuthContext';
import { useMenuManagement } from '@/hooks/useMenuManagement.tsx';
import { MenuCategory, MenuItem } from '@/types/supabase';
import CategoryFormDialog from '@/components/restaurant/menu/CategoryFormDialog';
import ItemFormDialog from '@/components/restaurant/menu/ItemFormDialog';
import { cn, formatPrice } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';
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
import { Switch } from '@/components/ui/switch';

// Componente para exibir um item de menu dentro da lista de categorias
const MenuItemDisplay: React.FC<{ item: MenuItem, onEdit: (item: MenuItem) => void, onDelete: (item: MenuItem) => void, onToggleActive: (item: MenuItem, isActive: boolean) => void }> = 
  React.memo(({ item, onEdit, onDelete, onToggleActive }) => (
    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {item.image_url && (
          <img 
            src={item.image_url} 
            alt={item.name} 
            className="w-12 h-12 object-cover rounded-md flex-shrink-0"
          />
        )}
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-gray-900 dark:text-white truncate">{item.name}</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{item.description || 'Sem descrição'}</p>
          <p className="text-sm font-bold text-highlight mt-0.5">{formatPrice(item.price)}</p>
        </div>
      </div>
      
      <div className="flex items-center space-x-2 flex-shrink-0">
        <Switch 
          checked={item.is_active || false} 
          onCheckedChange={(checked) => onToggleActive(item, checked)}
          className="data-[state=checked]:bg-green-600"
        />
        <Button variant="ghost" size="icon" onClick={() => onEdit(item)} className="h-8 w-8 text-blue-500 hover:bg-blue-50">
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(item)} className="h-8 w-8 text-red-500 hover:bg-red-50">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
));

export default function RestaurantMenuManagement() {
  const { restaurant, isLoading: authLoading } = useAuthContext();
  const restaurantId = restaurant?.id || null;
  const { menuData, isLoading: menuLoading, categoryMutations, itemMutations, invalidateMenu } = useMenuManagement(restaurantId);
  
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | undefined>(undefined);
  const [editingItem, setEditingItem] = useState<MenuItem | undefined>(undefined);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<MenuCategory | null>(null);

  const categories = menuData?.categories || [];
  const items = menuData?.items || [];
  
  const groupedItems = useMemo(() => {
    return items.reduce((acc, item) => {
      if (!acc[item.category_id]) {
        acc[item.category_id] = [];
      }
      acc[item.category_id].push(item);
      return acc;
    }, {} as Record<string, MenuItem[]>);
  }, [items]);

  // --- Handlers de Categoria ---
  const handleNewCategory = () => {
    setEditingCategory(undefined);
    setIsCategoryModalOpen(true);
  };

  const handleEditCategory = (category: MenuCategory) => {
    setEditingCategory(category);
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = useCallback(async (data: { name: string }) => {
    if (!restaurantId) return showError("ID do restaurante não encontrado.");
    
    const payload = {
      ...data,
      restaurant_id: restaurantId,
      id: editingCategory?.id,
      order_index: editingCategory?.order_index || categories.length,
    };
    
    await categoryMutations.save.mutateAsync(payload);
    setIsCategoryModalOpen(false);
  }, [restaurantId, editingCategory, categories.length, categoryMutations.save]);

  const handleDeleteCategoryClick = (category: MenuCategory) => {
    setCategoryToDelete(category);
    setIsDeleteAlertOpen(true);
  };
  
  const confirmDeleteCategory = useCallback(async () => {
    if (categoryToDelete) {
      await categoryMutations.delete.mutateAsync(categoryToDelete.id);
      setCategoryToDelete(null);
    }
  }, [categoryToDelete, categoryMutations.delete]);

  // --- Handlers de Item ---
  const handleNewItem = (categoryId: string) => {
    setEditingItem(undefined);
    setActiveCategoryId(categoryId);
    setIsItemModalOpen(true);
  };

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setActiveCategoryId(item.category_id);
    setIsItemModalOpen(true);
  };

  const handleSaveItem = useCallback(async (data: any) => {
    if (!activeCategoryId) return showError("Categoria não selecionada.");
    
    const payload = {
      ...data,
      category_id: activeCategoryId,
      id: editingItem?.id,
      order_index: editingItem?.order_index || (groupedItems[activeCategoryId]?.length || 0),
      is_active: editingItem?.is_active ?? true,
    };
    
    await itemMutations.save.mutateAsync(payload);
    setIsItemModalOpen(false);
  }, [activeCategoryId, editingItem, groupedItems, itemMutations.save]);

  const handleDeleteItemClick = (item: MenuItem) => {
    setItemToDelete(item);
    setIsDeleteAlertOpen(true);
  };
  
  const confirmDeleteItem = useCallback(async () => {
    if (itemToDelete) {
      await itemMutations.delete.mutateAsync(itemToDelete.id);
      setItemToDelete(null);
    }
  }, [itemToDelete, itemMutations.delete]);
  
  const handleToggleItemActive = useCallback(async (item: MenuItem, isActive: boolean) => {
    await itemMutations.save.mutateAsync({
      id: item.id,
      category_id: item.category_id, // Obrigatório para RLS
      is_active: isActive,
    });
    showSuccess(`Item ${item.name} ${isActive ? 'ativado' : 'desativado'}.`);
  }, [itemMutations.save]);


  if (authLoading || menuLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurantId) {
    return <div className="p-4">Restaurante não encontrado ou acesso negado.</div>;
  }

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      <RestaurantAreaHeader title="Gerenciar Cardápio" icon={Utensils} backPath="restaurant-area/profile-menu" />
      
      <main className="p-4 space-y-6">
        
        {/* Ação Principal: Adicionar Categoria */}
        <Card className="shadow-lg border-none rounded-xl">
          <CardContent className="p-4">
            <Button 
              className="w-full bg-highlight hover:bg-highlight/90"
              onClick={handleNewCategory}
              disabled={categoryMutations.save.isPending}
            >
              <PlusCircle className="w-4 h-4 mr-2" /> Criar Nova Categoria
            </Button>
          </CardContent>
        </Card>
        
        {/* Lista de Categorias */}
        <Card className="shadow-lg border-none rounded-xl">
          <CardHeader>
            <CardTitle className="text-xl text-primary flex items-center gap-2">
              <Package className="w-5 h-5" /> Categorias Ativas ({categories.length})
            </CardTitle>
            <CardDescription>Clique em uma categoria para gerenciar os itens.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-gray-100 dark:divide-gray-700">
            {categories.length === 0 ? (
              <p className="p-4 text-gray-500 text-center">Nenhuma categoria cadastrada.</p>
            ) : (
              categories.map((category) => (
                <div key={category.id} className="p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-primary">{category.name}</h3>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEditCategory(category)} className="h-8 w-8 text-blue-500 hover:bg-blue-50">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteCategoryClick(category)} className="h-8 w-8 text-red-500 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Botão Adicionar Item */}
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full mt-3 mb-3 border-highlight text-highlight hover:bg-highlight/5"
                    onClick={() => handleNewItem(category.id)}
                  >
                    <PlusCircle className="w-4 h-4 mr-2" /> Adicionar Item
                  </Button>
                  
                  {/* Lista de Itens da Categoria */}
                  <div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
                    {groupedItems[category.id]?.length > 0 ? (
                      groupedItems[category.id].map(item => (
                        <MenuItemDisplay 
                          key={item.id} 
                          item={item} 
                          onEdit={handleEditItem} 
                          onDelete={handleDeleteItemClick} 
                          onToggleActive={handleToggleItemActive}
                        />
                      ))
                    ) : (
                      <p className="p-3 text-sm text-gray-500 text-center">Nenhum item nesta categoria.</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
      
      {/* Modais */}
      <CategoryFormDialog
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSave={handleSaveCategory}
        initialData={editingCategory}
        isLoading={categoryMutations.save.isPending}
      />
      
      <ItemFormDialog
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSave={handleSaveItem}
        initialData={editingItem}
        isLoading={itemMutations.save.isPending}
        categoryId={activeCategoryId || ''}
      />
      
      {/* Alert Dialog para Confirmação de Exclusão */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" /> Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              {categoryToDelete ? (
                <>
                  Você tem certeza que deseja excluir a categoria <span className="font-bold">{categoryToDelete.name}</span>? 
                  **Todos os itens de menu associados a esta categoria serão permanentemente deletados.**
                </>
              ) : itemToDelete ? (
                <>
                  Você tem certeza que deseja excluir o item <span className="font-bold">{itemToDelete.name}</span>?
                </>
              ) : (
                "Confirma a exclusão?"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setCategoryToDelete(null); setItemToDelete(null); }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={categoryToDelete ? confirmDeleteCategory : confirmDeleteItem} 
              className="bg-red-600 hover:bg-red-700"
              disabled={categoryMutations.delete.isPending || itemMutations.delete.isPending}
            >
              {categoryMutations.delete.isPending || itemMutations.delete.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
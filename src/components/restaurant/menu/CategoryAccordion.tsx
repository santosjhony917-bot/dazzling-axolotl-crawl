"use client";

import React, { useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { MenuCategory, MenuItem } from '@/types';
import { CategoryListItem } from './CategoryListItem';
import { useCategoryMutations, useMenuItemManagement } from '@/hooks/useMenuManagement';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, AlertTriangle } from 'lucide-react';
import MenuItemFormDialog, { MenuItemFormValues } from './MenuItemFormDialog';
import { MenuItemList } from './MenuItemList';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { showSuccess } from '@/utils/toast';

interface CategoryAccordionProps {
  categories: MenuCategory[];
  restaurantId: string;
  onEditCategory: (category: MenuCategory) => void;
  onDeleteCategory: (categoryId: string) => void;
}

const CategoryAccordion: React.FC<CategoryAccordionProps> = ({
  categories,
  restaurantId,
  onEditCategory,
  onDeleteCategory,
}) => {
  // Removido useCategoryReorder
  const [activeCategoryIds, setActiveCategoryIds] = useState<string[]>([]);
  
  // Estado para gerenciamento de itens
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [currentItemCategoryId, setCurrentItemCategoryId] = useState<string | null>(null);
  
  // Estado para confirmação de exclusão de item
  const [isItemConfirmationOpen, setIsItemConfirmationOpen] = useState(false);
  const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

  // --- Item Management Hooks (Dynamic based on active category) ---
  const { 
    itemsQuery, 
    createItemMutation, 
    updateItemMutation, 
    deleteItemMutation 
  } = useMenuItemManagement(currentItemCategoryId || '');
  
  const isItemSaving = createItemMutation.isPending || updateItemMutation.isPending;
  const isItemDeleting = deleteItemMutation.isPending;

  // --- Item Management Handlers ---
  
  const handleOpenItemDialog = (categoryId: string, item: MenuItem | null = null) => {
    setCurrentItemCategoryId(categoryId);
    setEditingItem(item);
    setIsItemModalOpen(true);
  };
  
  const handleSaveItem = async (data: MenuItemFormValues) => {
    if (!currentItemCategoryId) return;

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
        category_id: currentItemCategoryId,
        name: data.name,
        description: data.description || '',
        price: data.price,
        image_url: data.image_url || null,
        is_active: data.is_active,
      });
    }
  };
  
  const handleDeleteItemClick = (itemId: string) => {
    setItemToDeleteId(itemId);
    setIsItemConfirmationOpen(true);
  };
  
  const handleDeleteItemConfirm = () => {
    if (itemToDeleteId) {
      deleteItemMutation.mutate(itemToDeleteId);
      setItemToDeleteId(null);
      setIsItemConfirmationOpen(false);
    }
  };
  
  // --- Accordion Change Handler ---
  const handleAccordionChange = (value: string[]) => {
    setActiveCategoryIds(value);
    
    // Se uma categoria foi aberta, define o ID para o hook de itens
    if (value.length > 0) {
        setCurrentItemCategoryId(value[0]);
    } else {
        setCurrentItemCategoryId(null);
    }
  };

  return (
    <>
      <Accordion 
        type="multiple" 
        className="w-full space-y-4"
        value={activeCategoryIds}
        onValueChange={handleAccordionChange}
      >
        {categories.map((category, index) => {
          const isExpanded = activeCategoryIds.includes(category.id);
          
          // Se a categoria atual estiver expandida, usamos o hook de itens para ela
          const currentItems = isExpanded && itemsQuery.data ? itemsQuery.data : [];
          const isItemsLoading = isExpanded && itemsQuery.isLoading;
          const itemsError = isExpanded && itemsQuery.isError;
          
          return (
            <AccordionItem 
              key={category.id} 
              value={category.id} 
              className="border rounded-xl shadow-sm bg-white"
            >
              <AccordionTrigger className="p-0 hover:no-underline">
                <CategoryListItem
                  category={category}
                  onEdit={onEditCategory}
                  onDelete={onDeleteCategory}
                  isExpanded={isExpanded}
                />
              </AccordionTrigger>
              
              <AccordionContent className="p-4 pt-0 border-t">
                <div className="flex justify-end mb-4">
                  <Button 
                    size="sm" 
                    onClick={() => handleOpenItemDialog(category.id, null)}
                    className="bg-highlight hover:bg-highlight/90"
                  >
                    <Plus className="w-4 h-4 mr-2" /> Adicionar Item
                  </Button>
                </div>
                
                {isItemsLoading ? (
                  <div className="flex justify-center items-center h-20">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : itemsError ? (
                    <div className="p-4 text-red-500 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" /> Erro ao carregar itens.
                    </div>
                ) : (
                  <MenuItemList
                    items={currentItems}
                    onEdit={(item) => handleOpenItemDialog(category.id, item)}
                    onDelete={handleDeleteItemClick}
                  />
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
      
      {/* Item Form Dialog */}
      <MenuItemFormDialog
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        categoryId={currentItemCategoryId || ''}
        initialData={editingItem}
        onSave={handleSaveItem}
        isLoading={isItemSaving}
      />
      
      {/* Item Delete Confirmation */}
      <ConfirmationDialog
        isOpen={isItemConfirmationOpen}
        onClose={() => setIsItemConfirmationOpen(false)}
        onConfirm={handleDeleteItemConfirm}
        title="Excluir Item de Menu"
        description="Tem certeza que deseja deletar este item? Esta ação é irreversível."
        confirmText="Sim, Deletar"
      />
    </>
  );
};

export default CategoryAccordion;
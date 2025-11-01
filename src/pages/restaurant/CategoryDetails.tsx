"use client";

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, Edit, Trash2, Eye, EyeOff, ArrowLeft, GripVertical } from 'lucide-react'; // Importando GripVertical
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { MenuItem, MenuCategory } from '@/types/supabase';
import ItemFormDialog, { MenuItemFormValues } from '@/components/restaurant/menu/ItemFormDialog';
import { useMenuManagement, useItemMutations } from '@/hooks/useCategoryManagement'; // Importando useItemMutations
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'; // Importando do @hello-pangea/dnd
import { cn } from '@/lib/utils';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';

const CategoryDetails: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { categories, isLoading: isLoadingCategories, error: errorCategories, refetchCategories } = useMenuManagement();
  const currentCategory = categories.find(cat => cat.id === categoryId);

  // Declare refetchItems outside useItemMutations to avoid block-scoped variable error
  let refetchItemsFn: (() => Promise<any>) | undefined;

  const {
    items,
    isLoading: isLoadingItems,
    error: errorItems,
    refetchItems,
    reorderItems,
    addItemMutation,
    updateItemMutation,
    deleteItemMutation,
    toggleItemActiveMutation,
    isSavingItem,
  } = useItemMutations(categoryId || '', () => refetchItemsFn && refetchItemsFn(), toast); // Pass a function to get refetchItems

  // Assign refetchItems to the outer variable after it's defined
  refetchItemsFn = refetchItems;

  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | undefined>(undefined);

  const handleAddItem = () => {
    setEditingItem(undefined);
    setIsItemDialogOpen(true);
  };

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setIsItemDialogOpen(true);
  };

  const handleSaveItem = async (values: MenuItemFormValues) => {
    if (!categoryId) {
      toast({ title: "Erro", description: "ID da categoria não encontrado.", variant: "destructive" });
      return;
    }
    if (editingItem) {
      await updateItemMutation.mutateAsync({ id: editingItem.id, category_id: categoryId, ...values });
    } else {
      await addItemMutation.mutateAsync({ category_id: categoryId, name: values.name, price: values.price, description: values.description, image_url: values.image_url, is_active: values.is_active });
    }
    setIsItemDialogOpen(false);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este item?')) {
      await deleteItemMutation.mutateAsync(itemId);
    }
  };

  const handleToggleItemActive = async (itemId: string, isActive: boolean) => {
    await toggleItemActiveMutation.mutateAsync({ id: itemId, is_active: isActive });
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const reorderedItemsList = Array.from(items);
    const [removed] = reorderedItemsList.splice(result.source.index, 1);
    reorderedItemsList.splice(result.destination.index, 0, removed);

    reorderItems(reorderedItemsList);
  };

  if (isLoadingCategories || isLoadingItems) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (errorCategories || errorItems) {
    toast({
      title: "Erro",
      description: "Não foi possível carregar os detalhes da categoria ou itens.",
      variant: "destructive",
    });
    return (
      <div className="text-center text-red-500 py-8">
        <p>Erro ao carregar. Por favor, tente novamente.</p>
      </div>
    );
  }

  if (!currentCategory) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p className="text-gray-600">Categoria não encontrada.</p>
        <Button onClick={() => navigate('/restaurant/menu')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para o Menu
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" onClick={() => navigate('/restaurant/menu')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Categorias
        </Button>
        <h1 className="text-3xl font-bold text-[#022D68]">Itens de {currentCategory.name}</h1>
        <Button onClick={handleAddItem} className="bg-[#E47948] hover:bg-[#C2653B]">
          <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Item
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Itens</CardTitle>
          <CardDescription>Arraste e solte para reordenar os itens.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {items.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Nenhum item nesta categoria ainda.</p>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="menu-items">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                    {items.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(
                              "flex items-center bg-white p-4 rounded-lg shadow-sm border",
                              !item.is_active && "opacity-60 bg-gray-50"
                            )}
                          >
                            <div {...provided.dragHandleProps} className="mr-3 cursor-grab text-gray-400 hover:text-gray-600">
                              <GripVertical className="h-5 w-5" />
                            </div>
                            <img
                              src={item.image_url || PLACEHOLDER_IMAGE_URL}
                              alt={item.name}
                              className="w-16 h-16 object-cover rounded-md mr-4"
                            />
                            <div className="flex-grow">
                              <h3 className="font-semibold text-lg text-[#022D68]">{item.name}</h3>
                              <p className="text-sm text-gray-600">R$ {item.price.toFixed(2)}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleItemActive(item.id, !item.is_active)}
                                title={item.is_active ? "Desativar Item" : "Ativar Item"}
                              >
                                {item.is_active ? <Eye className="h-5 w-5 text-green-600" /> : <EyeOff className="h-5 w-5 text-red-600" />}
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleEditItem(item)} title="Editar Item">
                                <Edit className="h-5 w-5 text-blue-600" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)} title="Excluir Item">
                                <Trash2 className="h-5 w-5 text-red-600" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </CardContent>
      </Card>

      <ItemFormDialog
        open={isItemDialogOpen}
        onOpenChange={setIsItemDialogOpen}
        initialData={editingItem}
        onSave={handleSaveItem}
        isSaving={isSavingItem}
        categories={categories} // Pass all categories for selection
      />
    </div>
  );
};

export default CategoryDetails;
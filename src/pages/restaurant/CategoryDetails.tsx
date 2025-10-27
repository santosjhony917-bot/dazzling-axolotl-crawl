import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Utensils, Plus, Loader2, Edit, Trash2, GripVertical, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';
import { useRestaurantContext } from '@/context/RestaurantContext';
import { useMenuItems, useCreateMenuItem, useUpdateMenuItem, useDeleteMenuItem } from '@/hooks/useMenuItemMutations';
import { showSuccess, showError } from '@/utils/toast';
import { MenuItem } from '@/types/supabase';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { formatPrice } from '@/lib/utils';

// Componente de Item de Menu
interface MenuItemCardProps {
  item: MenuItem;
  index: number;
  onEdit: (item: MenuItem) => void;
  onDelete: (itemId: string) => void;
  isPremium: boolean;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, index, onEdit, onDelete, isPremium }) => {
  return (
    <Draggable draggableId={item.id} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center flex-grow min-w-0">
            <span {...provided.dragHandleProps} className="cursor-grab text-gray-400 dark:text-gray-500 mr-3">
              <GripVertical className="w-5 h-5" />
            </span>
            <div className="flex-grow min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white truncate">{item.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{formatPrice(item.price)}</p>
            </div>
          </div>
          <div className="flex space-x-2 flex-shrink-0">
            <Button variant="outline" size="icon" onClick={() => onEdit(item)}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="destructive" size="icon" onClick={() => onDelete(item.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </Draggable>
  );
};

// Componente principal de Detalhes da Categoria
const CategoryDetails: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const { restaurant, isLoading: contextLoading, isPremium } = useRestaurantContext();
  const restaurantId = restaurant?.id;

  const { data: items, isLoading: itemsLoading, refetch } = useMenuItems(categoryId);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formState, setFormState] = useState({
    name: '',
    description: '',
    price: '',
    imageFile: null as File | null,
    imageUrl: '',
  });

  const createMutation = useCreateMenuItem();
  const updateMutation = useUpdateMenuItem();
  const deleteMutation = useDeleteMenuItem();

  const isLoading = contextLoading || itemsLoading || createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const categoryName = useMemo(() => {
    // Find category name from restaurant context if available, or mock it
    // For simplicity, we'll assume the category name is fetched elsewhere or passed down, 
    // but for now, we'll use a placeholder.
    return "Itens da Categoria";
  }, [categoryId]);

  if (isLoading && !items) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurantId || !categoryId || !restaurant) {
    return <p className="text-red-500">Erro: Dados do restaurante ou categoria ausentes.</p>;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormState(prev => ({ ...prev, imageFile: e.target.files![0] }));
    } else {
      setFormState(prev => ({ ...prev, imageFile: null }));
    }
  };

  const resetForm = () => {
    setFormState({ name: '', description: '', price: '', imageFile: null, imageUrl: '' });
    setIsEditing(false);
    setEditingItem(null);
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name.trim() || !formState.price.trim()) return;

    let finalImageUrl = formState.imageUrl;
    
    try {
      // 1. Handle Image Upload if a new file is selected
      if (formState.imageFile) {
        const fileExt = formState.imageFile.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `${restaurantId}/menu_items/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('menu_items')
          .upload(filePath, formState.imageFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('menu_items')
          .getPublicUrl(filePath);
          
        if (!publicUrlData.publicUrl) throw new Error("Failed to get public URL.");
        finalImageUrl = publicUrlData.publicUrl;
      }

      const priceNumeric = parseFloat(formState.price.replace(',', '.'));
      if (isNaN(priceNumeric)) throw new Error("Preço inválido.");

      const itemData = {
        name: formState.name,
        description: formState.description,
        price: priceNumeric,
        image_url: finalImageUrl || null,
      };

      if (isEditing && editingItem) {
        await updateMutation.mutateAsync({ itemId: editingItem.id, ...itemData });
        showSuccess('Item atualizado com sucesso!');
      } else {
        const nextOrderIndex = items ? items.length : 0;
        await createMutation.mutateAsync({ categoryId, orderIndex: nextOrderIndex, ...itemData });
        showSuccess('Item criado com sucesso!');
      }
      
      resetForm();
      refetch();
    } catch (error) {
      showError('Falha ao salvar item.');
      console.error(error);
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormState({
      name: item.name,
      description: item.description || '',
      price: item.price.toString().replace('.', ','),
      imageFile: null,
      imageUrl: item.image_url || '',
    });
    setIsEditing(true);
  };

  const handleDelete = async (itemId: string) => {
    if (!window.confirm('Tem certeza que deseja deletar este item?')) return;
    try {
      await deleteMutation.mutateAsync(itemId);
      showSuccess('Item deletado com sucesso!');
      refetch();
    } catch (error) {
      showError('Falha ao deletar item.');
      console.error(error);
    }
  };

  const onDragEnd = (result: DropResult) => {
    // Implementar lógica de reordenação se necessário
    if (!result.destination) return;
    showError('Reordenação de itens não implementada ainda.');
  };

  // Limite de 10 itens para o plano Free
  const isLimitReached = !isPremium && items && items.length >= 10;

  return (
    <RestaurantAreaPageLayout title={categoryName} backPath={`/restaurant-area/${restaurantId}/menu`} restaurant={restaurant}>
      <div className="p-4 space-y-6">
        
        {/* Formulário de Criação/Edição */}
        <Card className="shadow-soft-md dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="text-xl text-primary dark:text-highlight">
              {isEditing ? 'Editar Item' : 'Novo Item de Menu'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLimitReached && (
              <div className="p-3 mb-4 bg-red-100 text-red-700 rounded-lg flex items-center gap-2">
                <Package className="w-5 h-5" />
                <p className="text-sm font-medium">Limite de 10 itens atingido no plano Free. Faça upgrade para adicionar mais.</p>
              </div>
            )}
            <form onSubmit={handleCreateOrUpdate} className="space-y-4">
              <Input
                placeholder="Nome do Item"
                value={formState.name}
                onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                disabled={isLoading || (!isEditing && isLimitReached)}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <Textarea
                placeholder="Descrição (opcional)"
                value={formState.description}
                onChange={(e) => setFormState(prev => ({ ...prev, description: e.target.value }))}
                disabled={isLoading || (!isEditing && isLimitReached)}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <Input
                placeholder="Preço (Ex: 19,90)"
                value={formState.price}
                onChange={(e) => setFormState(prev => ({ ...prev, price: e.target.value }))}
                disabled={isLoading || (!isEditing && isLimitReached)}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={isLoading || (!isEditing && isLimitReached)}
                  className="flex-grow dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                {formState.imageUrl && !formState.imageFile && (
                  <img src={formState.imageUrl} alt="Item preview" className="w-12 h-12 object-cover rounded-md" />
                )}
              </div>
              
              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={isLoading || !formState.name.trim() || !formState.price.trim() || (!isEditing && isLimitReached)}
                  className="flex-grow"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : (isEditing ? 'Salvar Alterações' : 'Adicionar Item')}
                </Button>
                {(isEditing || formState.name || formState.description || formState.price) && (
                  <Button type="button" variant="outline" onClick={resetForm} disabled={isLoading}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Separator className="dark:bg-gray-700" />

        {/* Lista de Itens */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Itens Cadastrados ({items?.length || 0})</h2>
        
        {items && items.length > 0 ? (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="menu-items">
              {(provided) => (
                <div 
                  {...provided.droppableProps} 
                  ref={provided.innerRef} 
                  className="space-y-3"
                >
                  {items.map((item, index) => (
                    <MenuItemCard 
                      key={item.id} 
                      item={item} 
                      index={index} 
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      isPremium={isPremium}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 italic">Nenhum item cadastrado nesta categoria.</p>
        )}
      </div>
    </RestaurantAreaPageLayout>
  );
};

export default CategoryDetails;
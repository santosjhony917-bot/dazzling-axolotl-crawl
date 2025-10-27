import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Utensils, Plus, Loader2, ArrowLeft, Edit, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';
import { useRestaurantContext } from '@/context/RestaurantContext';
import { useMenuCategories } from '@/hooks/useMenuCategories';
import { useCreateCategory, useUpdateCategory, useDeleteCategory, useSwapCategoryOrder } from '@/hooks/useCategoryMutations';
import { showSuccess, showError } from '@/utils/toast';
import { MenuCategory } from '@/types/supabase';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

// Componente de Item de Categoria
interface CategoryItemProps {
  category: MenuCategory;
  index: number;
  restaurantId: string;
  onEdit: (category: MenuCategory) => void;
  onDelete: (categoryId: string) => void;
}

const CategoryItem: React.FC<CategoryItemProps> = ({ category, index, restaurantId, onEdit, onDelete }) => {
  return (
    <Draggable draggableId={category.id} index={index}>
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
            <Link to={`/restaurant-area/${restaurantId}/menu/${category.id}`} className="flex-grow min-w-0">
              <p className="font-semibold text-gray-900 dark:text-white truncate">{category.name}</p>
            </Link>
          </div>
          <div className="flex space-x-2 flex-shrink-0">
            <Button variant="outline" size="icon" onClick={() => onEdit(category)}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="destructive" size="icon" onClick={() => onDelete(category.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </Draggable>
  );
};

// Componente principal de Gerenciamento de Menu
const MenuManagement: React.FC = () => {
  const { restaurant, isLoading: contextLoading } = useRestaurantContext();
  const restaurantId = restaurant?.id;
  
  const { data: categories, isLoading: categoriesLoading, refetch } = useMenuCategories(restaurantId);
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();
  const swapMutation = useSwapCategoryOrder();

  const isLoading = contextLoading || categoriesLoading || createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || swapMutation.isPending;

  if (isLoading && !categories) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurantId) {
    return <p className="text-red-500">Erro: ID do restaurante não encontrado.</p>;
  }

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      if (isEditing && editingCategory) {
        await updateMutation.mutateAsync({ categoryId: editingCategory.id, name: newCategoryName });
        showSuccess('Categoria atualizada com sucesso!');
      } else {
        const nextOrderIndex = categories ? categories.length : 0;
        await createMutation.mutateAsync({ restaurantId, name: newCategoryName, orderIndex: nextOrderIndex });
        showSuccess('Categoria criada com sucesso!');
      }
      setNewCategoryName('');
      setIsEditing(false);
      setEditingCategory(null);
      refetch();
    } catch (error) {
      showError('Falha ao salvar categoria.');
      console.error(error);
    }
  };

  const handleEdit = (category: MenuCategory) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setIsEditing(true);
  };

  const handleDelete = async (categoryId: string) => {
    if (!window.confirm('Tem certeza que deseja deletar esta categoria? Todos os itens serão perdidos.')) return;
    try {
      await deleteMutation.mutateAsync(categoryId);
      showSuccess('Categoria deletada com sucesso!');
      refetch();
    } catch (error) {
      showError('Falha ao deletar categoria.');
      console.error(error);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination || !categories) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    const categoryA = categories[sourceIndex];
    const categoryB = categories[destinationIndex];

    if (!categoryA || !categoryB) return;

    try {
      // Optimistic update
      const newCategories = Array.from(categories);
      const [removed] = newCategories.splice(sourceIndex, 1);
      newCategories.splice(destinationIndex, 0, removed);
      // Note: We don't update state here, we rely on refetch after successful swap

      await swapMutation.mutateAsync({ categoryIdA: categoryA.id, categoryIdB: categoryB.id });
      showSuccess('Ordem atualizada com sucesso!');
      refetch(); // Refetch to ensure state matches DB
    } catch (error) {
      showError('Falha ao reordenar categorias.');
      refetch(); // Revert optimistic update by refetching
      console.error(error);
    }
  };

  return (
    <RestaurantAreaPageLayout title="Gerenciar Cardápio" backPath={`/restaurant-area/${restaurantId}/dashboard`} restaurant={restaurant!}>
      <div className="p-4 space-y-6">
        
        {/* Formulário de Criação/Edição */}
        <Card className="shadow-soft-md dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="text-xl text-primary dark:text-highlight">
              {isEditing ? 'Editar Categoria' : 'Nova Categoria'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateOrUpdate} className="flex gap-2">
              <Input
                placeholder="Nome da Categoria (Ex: Entradas, Pratos Principais)"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                disabled={isLoading}
                className="flex-grow dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <Button type="submit" disabled={isLoading || !newCategoryName.trim()}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isEditing ? 'Salvar' : 'Criar')}
              </Button>
              {isEditing && (
                <Button type="button" variant="outline" onClick={() => {
                  setIsEditing(false);
                  setEditingCategory(null);
                  setNewCategoryName('');
                }} disabled={isLoading}>
                  Cancelar
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        <Separator className="dark:bg-gray-700" />

        {/* Lista de Categorias */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Categorias Existentes ({categories?.length || 0})</h2>
        
        {categories && categories.length > 0 ? (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="categories">
              {(provided) => (
                <div 
                  {...provided.droppableProps} 
                  ref={provided.innerRef} 
                  className="space-y-3"
                >
                  {categories.map((category, index) => (
                    <CategoryItem 
                      key={category.id} 
                      category={category} 
                      index={index} 
                      restaurantId={restaurantId}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 italic">Nenhuma categoria cadastrada. Crie uma acima!</p>
        )}
      </div>
    </RestaurantAreaPageLayout>
  );
};

export default MenuManagement;
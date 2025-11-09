"use client";

import React, { useState, useEffect } from 'react';
import { PlusCircle, Loader2, AlertTriangle, GripVertical, Save, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import CategoryList from '@/components/restaurant/menu/CategoryList';
import { useRestaurantData } from '@/context/RestaurantContext';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface MenuManagementProps {
  restaurantId: string;
}

const MenuManagement: React.FC<MenuManagementProps> = ({ restaurantId }) => {
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { refreshRestaurantData } = useRestaurantData();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchCategories();
  }, [restaurantId]);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      setError('Failed to load menu categories.');
      toast.error('Erro ao carregar categorias do cardápio.');
    } else {
      setCategories(data || []);
    }
    setLoading(false);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('O nome da categoria não pode ser vazio.');
      return;
    }
    setIsAddingCategory(true);
    const { data, error } = await supabase
      .from('menu_categories')
      .insert({
        restaurant_id: restaurantId,
        name: newCategoryName.trim(),
        order_index: categories.length, // New category goes to the end
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding category:', error);
      toast.error('Erro ao adicionar categoria.');
    } else {
      setCategories([...categories, data]);
      setNewCategoryName('');
      toast.success('Categoria adicionada com sucesso!');
      refreshRestaurantData();
    }
    setIsAddingCategory(false);
  };

  const handleUpdateCategory = async (id: string, updates: Partial<any>) => {
    const { error } = await supabase
      .from('menu_categories')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating category:', error);
      toast.error('Erro ao atualizar categoria.');
    } else {
      setCategories(
        categories.map((cat) => (cat.id === id ? { ...cat, ...updates } : cat))
      );
      toast.success('Categoria atualizada com sucesso!');
      refreshRestaurantData();
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const { error } = await supabase
      .from('menu_categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting category:', error);
      toast.error('Erro ao deletar categoria.');
    } else {
      setCategories(categories.filter((cat) => cat.id !== id));
      toast.success('Categoria deletada com sucesso!');
      refreshRestaurantData();
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = categories.findIndex((cat) => cat.id === active.id);
      const newIndex = categories.findIndex((cat) => cat.id === over?.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const newCategories = Array.from(categories);
      const [movedCategory] = newCategories.splice(oldIndex, 1);
      newCategories.splice(newIndex, 0, movedCategory);

      setCategories(newCategories);

      // Update order_index in DB for affected categories
      const updates = newCategories.map((cat, index) => ({
        id: cat.id,
        order_index: index,
      }));

      const { error } = await supabase.from('menu_categories').upsert(updates);

      if (error) {
        console.error('Error updating category order:', error);
        toast.error('Erro ao atualizar a ordem das categorias.');
        // Revert to original order if update fails
        fetchCategories();
      } else {
        toast.success('Ordem das categorias atualizada!');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-500">
        <AlertTriangle className="h-12 w-12 mb-4" />
        <p className="text-lg">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Input
          placeholder="Nome da nova categoria"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleAddCategory();
            }
          }}
          className="flex-grow"
        />
        <Button onClick={handleAddCategory} disabled={isAddingCategory}>
          {isAddingCategory ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <PlusCircle className="h-4 w-4 mr-2" />
          )}
          Adicionar Categoria
        </Button>
      </div>

      {categories.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center">
          Nenhuma categoria de cardápio adicionada ainda.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={categories.map((cat) => cat.id)}
            strategy={verticalListSortingStrategy}
          >
            <CategoryList
              categories={categories}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
              restaurantId={restaurantId}
            />
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

export default MenuManagement;
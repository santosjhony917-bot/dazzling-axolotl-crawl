"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { AlertCircle, Plus, Loader2, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { MenuCategory } from '@/types/supabase';
import { useMenuManagement, useCategoryMutations } from '@/hooks/useCategoryManagement';
import CategoryDialog from '@/components/restaurant/CategoryDialog';
import { CategoryFormValues } from '@/components/restaurant/menu/CategoryFormDialog';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';
import CategoryList from '@/components/restaurant/menu/CategoryList';
import { Card, CardContent } from '@/components/ui/card';
import { showError } from '@/utils/toast';
import { useAuthData } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const MenuManagement: React.FC = () => {
  const { toast } = useToast();
  // Usando useAuthData para obter o objeto restaurant gerenciado globalmente
  const { restaurant, isProfileLoading: profileLoading } = useAuthData(); 
  const restaurantId = restaurant?.id || '';

  const { categoriesQuery } = useMenuManagement(restaurantId);
  const { createCategoryMutation, updateCategoryMutation, deleteCategoryMutation } = useCategoryMutations(restaurantId);
  
  // Estado para Categorias
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  
  // Estado para Confirmação
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<(() => void) | null>(null);
  const [confirmationTitle, setConfirmationTitle] = useState('');
  const [confirmationDescription, setConfirmationDescription] = useState('');

  const categories = categoriesQuery.data || [];
  const isLoading = profileLoading || categoriesQuery.isLoading;
  const isCategoryMutating = createCategoryMutation.isPending || updateCategoryMutation.isPending || deleteCategoryMutation.isPending;
  
  // --- Handlers de Categoria ---

  const handleOpenCategoryDialog = (category: MenuCategory | null) => {
    if (!restaurantId) {
      showError("ID do restaurante não encontrado. Tente recarregar a página.");
      return;
    }
    setEditingCategory(category);
    setIsCategoryDialogOpen(true);
  };

  const handleSaveCategory = useCallback(async (data: CategoryFormValues) => {
    if (!restaurantId) {
      showError("ID do restaurante não encontrado.");
      return;
    }
    
    const resolveSectionId = async (sectionName?: string | null) => {
      const cleanName = sectionName?.trim();
      if (!cleanName) return null;
      const { data: existing, error: existingError } = await supabase
        .from('menu_sections')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .ilike('name', cleanName)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing?.id) return existing.id;

      const { data: created, error: createError } = await supabase
        .from('menu_sections')
        .insert({ restaurant_id: restaurantId, name: cleanName, order_index: 0 })
        .select('id')
        .single();
      if (createError) throw createError;
      return created.id;
    };

    let sectionId: string | null = null;
    try {
      sectionId = await resolveSectionId(data.section_name);
    } catch (error: any) {
      showError(`Erro ao preparar secao do menu: ${error.message}`);
      return;
    }

    if (editingCategory) {
      await updateCategoryMutation.mutateAsync({ 
        id: editingCategory.id,
        updates: { // CORRIGIDO: Usando a estrutura 'updates'
          name: data.name,
          is_active: data.is_active,
          order_index: data.order_index,
          section_id: sectionId,
        }
      });
    } else {
      await createCategoryMutation.mutateAsync({ 
        restaurant_id: restaurantId,
        name: data.name,
        is_active: data.is_active,
        order_index: data.order_index,
        section_id: sectionId,
      });
    }
  }, [editingCategory, updateCategoryMutation, createCategoryMutation, restaurantId]);

  const handleDeleteCategory = (categoryId: string) => {
    setConfirmationTitle("Excluir Categoria");
    setConfirmationDescription("Tem certeza de que deseja excluir esta categoria? Todos os itens de menu associados serão deletados.");
    setConfirmationAction(() => () => deleteCategoryMutation.mutate(categoryId));
    setIsConfirmationOpen(true);
  };
  
  // A reordenação será tratada pelo CategoryList usando useCategoryReorder

  // --- Render Logic ---

  if (isLoading) {
    return (
      <RestaurantAreaPageLayout title="Gerenciar Cardápio" icon={Utensils} backPath="restaurant-area/profile-menu">
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-soft">
          <Loader2 className="h-8 w-8 animate-spin text-[#df4b1c]" />
        </div>
      </RestaurantAreaPageLayout>
    );
  }

  if (!restaurantId) {
    return (
      <RestaurantAreaPageLayout title="Gerenciar Cardápio" icon={Utensils} backPath="restaurant-area/profile-menu">
        <Card className="rounded-2xl border border-dashed border-slate-100 bg-white shadow-soft">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <AlertCircle className="h-8 w-8 text-[#df4b1c]" />
            <h2 className="text-lg font-bold text-[#3C2F2F]">Restaurante não encontrado</h2>
            <p className="text-sm text-slate-500">
              Não foi possível carregar o restaurante vinculado a esta conta. Recarregue a página ou faça login novamente.
            </p>
          </CardContent>
        </Card>
      </RestaurantAreaPageLayout>
    );
  }

  if (categoriesQuery.isError) {
    return (
      <RestaurantAreaPageLayout title="Gerenciar Cardápio" icon={Utensils} backPath="restaurant-area/profile-menu">
        <Card className="rounded-2xl border border-red-100 bg-white shadow-soft">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h2 className="text-lg font-bold text-red-700">Erro ao carregar o cardápio</h2>
            <p className="text-sm text-red-700/80">
              {categoriesQuery.error.message || 'Tente novamente em alguns instantes.'}
            </p>
          </CardContent>
        </Card>
      </RestaurantAreaPageLayout>
    );
  }

  return (
    <RestaurantAreaPageLayout title="Gerenciar Cardápio" icon={Utensils} backPath="restaurant-area/profile-menu">
      <div className="space-y-6">
        
        <Card className="rounded-2xl border border-slate-100 bg-white shadow-soft">
          <CardContent className="p-5">
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-bold text-[#3C2F2F]">Categorias do Menu</h1>
              <Button 
                onClick={() => handleOpenCategoryDialog(null)} 
                disabled={isCategoryMutating || !restaurantId} // Desabilita se não houver restaurantId
                className="rounded-2xl bg-[#df4b1c] hover:bg-[#bd3f17]"
              >
                <Plus className="mr-2 h-4 w-4" /> Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>

        <CategoryList
          categories={categories}
          restaurantId={restaurantId}
          onEdit={handleOpenCategoryDialog}
          onDelete={handleDeleteCategory}
        />
      </div>

      {/* Dialogs */}
      <CategoryDialog
        isOpen={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
        category={editingCategory}
        restaurantId={restaurantId}
        onSave={handleSaveCategory}
        isLoading={isCategoryMutating}
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
};

export default MenuManagement;

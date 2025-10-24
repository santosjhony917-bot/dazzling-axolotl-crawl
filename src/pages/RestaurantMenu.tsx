import React, { useState, useEffect, useCallback } from 'react';
import { UtensilsCrossed, Plus, ChevronDown, ChevronUp, Edit, Trash2, Loader2, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import { useMenuManagement } from '@/hooks/useMenuManagement';
import { MenuCategory, MenuItem } from '@/types/restaurant';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import CategoryFormDialog from '@/components/restaurant/menu/CategoryFormDialog';
import ItemFormDialog from '@/components/restaurant/menu/ItemFormDialog';
import MenuItemCard from '@/components/restaurant/menu/MenuItemCard';
import { z } from 'zod';
import { showError } from '@/utils/toast';

// --- Schemas e Tipos de Formulário ---
const categorySchema = z.object({ 
  id: z.string().optional(), 
  name: z.string(), 
  order_index: z.number().optional(), 
  is_active: z.boolean().optional() 
});
type CategoryFormData = z.infer<typeof categorySchema>;

// Definindo o schema do item de forma que category_id seja obrigatório
const itemSchema = z.object({ 
  id: z.string().optional(), 
  category_id: z.string().min(1, "Category ID is required"), // Garantindo que é string e obrigatório
  name: z.string(), 
  description: z.string().optional().nullable(), 
  price: z.number(), 
  image_url: z.string().optional().nullable(), 
  order_index: z.number().optional(), 
  is_active: z.boolean().optional() 
});
type ItemFormData = z.infer<typeof itemSchema>;

// Tipos para o estado de edição
type CategoryFormState = { open: boolean, data: MenuCategory | null };
type ItemFormState = { open: boolean, categoryId: string, data: MenuItem | null };

export default function RestaurantMenu() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { restaurant, loading: restaurantLoading } = useRestaurantProfile(user?.id);
  const restaurantId = restaurant?.id || null;
  
  const { 
    menuData, 
    isLoading: menuLoading, 
    categoryMutations, 
    itemMutations 
  } = useMenuManagement(restaurantId);

  const [categoryForm, setCategoryForm] = useState<CategoryFormState>({ open: false, data: null });
  const [itemForm, setItemForm] = useState<ItemFormState>({ open: false, categoryId: '', data: null });
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Redirecionamento se não estiver logado ou sem restaurante
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/restaurant-login');
    }
  }, [authLoading, user, navigate]);

  // --- Handlers de Categoria ---
  const handleOpenCategoryForm = (data: MenuCategory | null = null) => {
    setCategoryForm({ open: true, data });
  };

  const handleSaveCategory = (data: CategoryFormData) => {
    if (!restaurantId) {
      showError("ID do restaurante não encontrado.");
      return;
    }
    categoryMutations.save.mutate({ ...data, restaurant_id: restaurantId });
    setCategoryForm({ open: false, data: null });
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (window.confirm("Tem certeza que deseja deletar esta categoria? Todos os itens nela serão removidos.")) {
      categoryMutations.delete.mutate(categoryId);
    }
  };
  
  const handleToggleCategoryActive = (category: MenuCategory) => {
    categoryMutations.save.mutate({ 
      id: category.id, 
      restaurant_id: category.restaurant_id,
      is_active: !category.is_active 
    });
  };

  // --- Handlers de Item ---
  const handleOpenItemForm = (categoryId: string, data: MenuItem | null = null) => {
    setItemForm({ open: true, categoryId, data });
  };

  const handleSaveItem = (data: ItemFormData) => {
    // CORREÇÃO: Usamos asserção de tipo para garantir que category_id é string, resolvendo o erro TS2345.
    itemMutations.save.mutate(data as Partial<MenuItem> & { category_id: string });
    setItemForm({ open: false, categoryId: '', data: null });
  };

  const handleDeleteItem = (itemId: string) => {
    if (window.confirm("Tem certeza que deseja deletar este item?")) {
      itemMutations.delete.mutate(itemId);
    }
  };
  
  const handleToggleItemActive = (item: MenuItem) => {
    itemMutations.save.mutate({ 
      id: item.id, 
      category_id: item.category_id,
      is_active: !item.is_active 
    } as Partial<MenuItem> & { category_id: string }); // Asserção de tipo necessária aqui também
  };

  const categories = menuData?.categories || [];
  const items = menuData?.items || [];
  
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category_id]) {
      acc[item.category_id] = [];
    }
    acc[item.category_id].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  if (authLoading || restaurantLoading || menuLoading) {
    return (
      <div className="p-4 space-y-6 pb-20 flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#022D68]" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-20 max-w-md mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-[#022D68]">Gerenciar Cardápio</h2>
        <Button 
          size="sm" 
          className="bg-[#E47948] hover:bg-[#E47948]/90 text-white"
          onClick={() => handleOpenCategoryForm()}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      <Card className="shadow-xl rounded-xl border-none">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2 text-[#022D68]">
            <UtensilsCrossed className="h-5 w-5" />
            Categorias Cadastradas ({categories.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {categories.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>Nenhuma categoria cadastrada. Comece adicionando uma!</p>
            </div>
          ) : (
            <Accordion 
              type="single" 
              collapsible 
              className="w-full"
              value={expandedCategory || undefined}
              onValueChange={(value) => setExpandedCategory(value)}
            >
              {categories.map(category => (
                <AccordionItem key={category.id} value={category.id} className="border-b border-gray-100 dark:border-gray-700">
                  <AccordionTrigger className="p-4 hover:no-underline">
                    <div className="flex justify-between items-center w-full pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-primary">{category.name}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${category.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {category.is_active ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">{groupedItems[category.id]?.length || 0} itens</span>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={(e) => { e.stopPropagation(); handleOpenCategoryForm(category); }}
                          className="h-8 w-8 text-primary hover:bg-primary/10"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={(e) => { e.stopPropagation(); handleDeleteCategory(category.id); }}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          disabled={categoryMutations.delete.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="p-4 pt-0 bg-gray-50 dark:bg-gray-900/50">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center pt-2">
                        <h4 className="text-sm font-semibold text-primary">Itens em {category.name}</h4>
                        <Button 
                          size="sm" 
                          className="bg-[#022D68] hover:bg-[#022D68]/90 text-white h-8 text-xs"
                          onClick={() => handleOpenItemForm(category.id)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Novo Item
                        </Button>
                      </div>
                      <Separator />
                      
                      {groupedItems[category.id]?.length > 0 ? (
                        <div className="space-y-3">
                          {groupedItems[category.id].map(item => (
                            <MenuItemCard 
                              key={item.id}
                              item={item}
                              onEdit={(i) => handleOpenItemForm(category.id, i)}
                              onDelete={itemMutations.delete.mutate}
                              onToggleActive={handleToggleItemActive}
                              isDeleting={itemMutations.delete.isPending}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">Nenhum item nesta categoria.</p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      <div className="pt-4 text-center">
        <Button 
          variant="outline" 
          onClick={() => navigate('/restaurant-area/profile-menu')}
        >
          Voltar ao Perfil
        </Button>
      </div>
      
      {/* Modals */}
      <CategoryFormDialog
        open={categoryForm.open}
        onOpenChange={(open) => setCategoryForm({ open, data: null })}
        onSave={handleSaveCategory}
        isSaving={categoryMutations.save.isPending}
        initialData={categoryForm.data}
      />
      
      <ItemFormDialog
        open={itemForm.open}
        onOpenChange={(open) => setItemForm({ open, categoryId: '', data: null })}
        onSave={handleSaveItem}
        isSaving={itemMutations.save.isPending}
        categoryId={itemForm.categoryId}
        initialData={itemForm.data}
      />
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Utensils, PlusCircle, ArrowRight, Edit, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createPageUrl } from '@/utils/url';
import { useRestaurantContext } from '@/context/RestaurantContext';
import { showError, showSuccess } from '@/utils/toast';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/lib/database.types';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type MenuCategory = Database['public']['Tables']['menu_categories']['Row'];

export default function MenuManagement() {
  const navigate = useNavigate();
  const { restaurant, isLoading: isRestaurantLoading, refetchRestaurant } = useRestaurantContext();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const restaurantId = restaurant?.id;

  const fetchCategories = async () => {
    if (!restaurantId) return;
    setIsLoadingCategories(true);
    try {
      const { data, error } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      showError('Falha ao carregar categorias.');
    } finally {
      setIsLoadingCategories(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [restaurantId]);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || !restaurantId) return;

    try {
      const newOrderIndex = categories.length > 0 ? categories[categories.length - 1].order_index + 1 : 0;

      const { error } = await supabase
        .from('menu_categories')
        .insert({
          restaurant_id: restaurantId,
          name: newCategoryName.trim(),
          order_index: newOrderIndex,
          is_active: true,
        });

      if (error) throw error;

      showSuccess('Categoria criada com sucesso!');
      setNewCategoryName('');
      setIsDialogOpen(false);
      fetchCategories();
    } catch (error) {
      console.error('Error creating category:', error);
      showError('Falha ao criar categoria.');
    }
  };

  const handleMoveCategory = async (categoryId: string, direction: 'up' | 'down') => {
    const index = categories.findIndex(c => c.id === categoryId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const categoryA = categories[index];
    const categoryB = categories[targetIndex];

    try {
      // Chamada para a função PL/pgSQL para trocar a ordem
      const { error } = await supabase.rpc('swap_category_order', {
        category_id_a: categoryA.id,
        category_id_b: categoryB.id,
      });

      if (error) throw error;

      showSuccess('Ordem da categoria atualizada.');
      // Atualiza o estado localmente para feedback rápido antes de refetch
      const newCategories = [...categories];
      [newCategories[index], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[index]];
      setCategories(newCategories);
      
    } catch (error) {
      console.error('Error swapping category order:', error);
      showError('Falha ao reordenar categorias.');
      fetchCategories(); // Refetch em caso de erro
    }
  };

  if (isRestaurantLoading || isLoadingCategories) {
    return (
      <RestaurantAreaPageLayout title="Gerenciar Cardápio" icon={Utensils} backPath="restaurant-area/profile-menu">
        <div className="p-4 text-center text-gray-500">Carregando cardápio...</div>
      </RestaurantAreaPageLayout>
    );
  }

  return (
    <RestaurantAreaPageLayout title="Gerenciar Cardápio" icon={Utensils} backPath="restaurant-area/profile-menu">
      <div className="p-4 space-y-6">
        
        {/* Botão de Adicionar Categoria */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full h-12 bg-primary hover:bg-primary/90 shadow-soft-md">
              <PlusCircle className="w-5 h-5 mr-2" />
              Adicionar Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-xl">
            <DialogHeader>
              <DialogTitle>Nova Categoria</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="categoryName">Nome da Categoria</Label>
                <Input
                  id="categoryName"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Ex: Entradas, Pratos Principais"
                />
              </div>
            </div>
            <Button onClick={handleCreateCategory} disabled={!newCategoryName.trim()}>
              Criar Categoria
            </Button>
          </DialogContent>
        </Dialog>

        <Separator />

        {/* Lista de Categorias */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-primary">Categorias Atuais ({categories.length})</h3>
          
          {categories.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhuma categoria cadastrada ainda.</p>
          ) : (
            categories.map((category, index) => (
              <Card key={category.id} className="shadow-soft-sm border-none">
                <CardContent className="p-4 flex items-center justify-between">
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => navigate(createPageUrl('menuItemDetails', { itemId: category.id }))}
                  >
                    <p className="font-semibold text-primary">{category.name}</p>
                    <p className="text-sm text-gray-500">Itens: 0 (Mock)</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Botões de Reordenar */}
                    <div className="flex flex-col space-y-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleMoveCategory(category.id, 'up')}
                        disabled={index === 0}
                        className="h-6 w-6 p-0 text-gray-600 hover:bg-gray-100"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleMoveCategory(category.id, 'down')}
                        disabled={index === categories.length - 1}
                        className="h-6 w-6 p-0 text-gray-600 hover:bg-gray-100"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Botão de Editar */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => navigate(createPageUrl('menuItemDetails', { itemId: category.id }))}
                      className="h-8 w-8 text-primary hover:bg-primary/10"
                    >
                      <Edit className="h-5 w-5" />
                    </Button>
                    
                    {/* Botão de Deletar (Mock) */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-red-600 hover:bg-red-100"
                      onClick={() => showError('Funcionalidade de exclusão pendente.')}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </RestaurantAreaPageLayout>
  );
}
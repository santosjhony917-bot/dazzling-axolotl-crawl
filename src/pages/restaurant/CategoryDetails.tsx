import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Utensils, PlusCircle, Edit, Trash2, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';

type MenuItem = Database['public']['Tables']['menu_items']['Row'];
type MenuCategory = Database['public']['Tables']['menu_categories']['Row'];

export default function CategoryDetails() {
  const navigate = useNavigate();
  const { categoryId } = useParams<{ categoryId: string }>();
  const { restaurant, isLoading: isRestaurantLoading } = useRestaurantContext();
  
  const [category, setCategory] = useState<MenuCategory | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<MenuItem> | null>(null);

  const restaurantId = restaurant?.id;

  const fetchCategoryAndItems = async () => {
    if (!categoryId || !restaurantId) return;
    setIsLoadingData(true);
    try {
      // 1. Fetch Category Details
      const { data: categoryData, error: categoryError } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('id', categoryId)
        .eq('restaurant_id', restaurantId)
        .single();

      if (categoryError) throw categoryError;
      setCategory(categoryData);

      // 2. Fetch Menu Items
      const { data: itemsData, error: itemsError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('category_id', categoryId)
        .order('order_index', { ascending: true });

      if (itemsError) throw itemsError;
      setMenuItems(itemsData || []);

    } catch (error) {
      console.error('Error fetching category details:', error);
      showError('Falha ao carregar detalhes da categoria.');
      setCategory(null);
      setMenuItems([]);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    fetchCategoryAndItems();
  }, [categoryId, restaurantId]);

  const handleSaveItem = async () => {
    if (!currentItem?.name || !currentItem.price || !categoryId) return;

    const itemToSave = {
      ...currentItem,
      category_id: categoryId,
      price: Number(currentItem.price),
      is_active: currentItem.is_active ?? true,
    };

    try {
      if (currentItem.id) {
        // Update existing item
        const { error } = await supabase
          .from('menu_items')
          .update(itemToSave)
          .eq('id', currentItem.id);
        
        if (error) throw error;
        showSuccess('Item atualizado com sucesso!');
      } else {
        // Insert new item
        const newOrderIndex = menuItems.length > 0 ? menuItems[menuItems.length - 1].order_index + 1 : 0;
        
        const { error } = await supabase
          .from('menu_items')
          .insert({ ...itemToSave, order_index: newOrderIndex });

        if (error) throw error;
        showSuccess('Item criado com sucesso!');
      }

      setIsItemDialogOpen(false);
      setCurrentItem(null);
      fetchCategoryAndItems();
    } catch (error) {
      console.error('Error saving item:', error);
      showError('Falha ao salvar item.');
    }
  };

  const handleEditItem = (item: MenuItem) => {
    setCurrentItem(item);
    setIsItemDialogOpen(true);
  };

  const handleNewItem = () => {
    setCurrentItem({});
    setIsItemDialogOpen(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm('Tem certeza que deseja deletar este item do cardápio?')) return;

    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      showSuccess('Item removido com sucesso.');
      fetchCategoryAndItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      showError('Falha ao remover item.');
    }
  };

  if (isRestaurantLoading || isLoadingData) {
    return (
      <RestaurantAreaPageLayout title="Gerenciar Itens" icon={Utensils} backPath="restaurant-area/profile-menu">
        <div className="p-4 text-center text-gray-500">Carregando itens...</div>
      </RestaurantAreaPageLayout>
    );
  }

  if (!category) {
    return (
      <RestaurantAreaPageLayout title="Categoria Não Encontrada" icon={Utensils} backPath="restaurant-area/profile-menu">
        <div className="p-4 text-center text-red-500">A categoria solicitada não existe ou você não tem permissão para acessá-la.</div>
      </RestaurantAreaPageLayout>
    );
  }

  return (
    <RestaurantAreaPageLayout title={`Itens: ${category.name}`} icon={Utensils} backPath="restaurant-area/profile-menu">
      <div className="p-4 space-y-6">
        
        {/* Botão de Adicionar Item */}
        <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="w-full h-12 bg-primary hover:bg-primary/90 shadow-soft-md"
              onClick={handleNewItem}
            >
              <PlusCircle className="w-5 h-5 mr-2" />
              Adicionar Novo Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-xl">
            <DialogHeader>
              <DialogTitle>{currentItem?.id ? 'Editar Item' : 'Novo Item'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="itemName">Nome do Item</Label>
                <Input
                  id="itemName"
                  value={currentItem?.name || ''}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Hambúrguer Clássico"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemDescription">Descrição</Label>
                <Textarea
                  id="itemDescription"
                  value={currentItem?.description || ''}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Ingredientes, detalhes..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemPrice">Preço (R$)</Label>
                <Input
                  id="itemPrice"
                  type="number"
                  step="0.01"
                  value={currentItem?.price || ''}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, price: Number(e.target.value) }))}
                  placeholder="19.90"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemImageUrl">URL da Imagem (Opcional)</Label>
                <Input
                  id="itemImageUrl"
                  value={currentItem?.image_url || ''}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://exemplo.com/prato.jpg"
                />
              </div>
            </div>
            <Button onClick={handleSaveItem} disabled={!currentItem?.name || !currentItem.price}>
              {currentItem?.id ? 'Salvar Alterações' : 'Criar Item'}
            </Button>
          </DialogContent>
        </Dialog>

        <Separator />

        {/* Lista de Itens */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-primary">Itens em {category.name} ({menuItems.length})</h3>
          
          {menuItems.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhum item cadastrado nesta categoria.</p>
          ) : (
            menuItems.map((item) => (
              <Card key={item.id} className="shadow-soft-sm border-none">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1 pr-4">
                    <p className="font-semibold text-primary">{item.name}</p>
                    <p className="text-sm text-gray-500 truncate">{item.description || 'Sem descrição.'}</p>
                    <p className="text-base font-bold text-highlight mt-1">R$ {item.price.toFixed(2)}</p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {/* Botão de Editar */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleEditItem(item)}
                      className="h-8 w-8 text-primary hover:bg-primary/10"
                    >
                      <Edit className="h-5 w-5" />
                    </Button>
                    
                    {/* Botão de Deletar */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-red-600 hover:bg-red-100"
                      onClick={() => handleDeleteItem(item.id)}
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
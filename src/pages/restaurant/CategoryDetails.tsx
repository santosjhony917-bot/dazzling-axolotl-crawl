"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Utensils, Plus, Edit, Trash2, Loader2, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  is_active: boolean;
  order_index: number;
}

interface MenuCategory {
  id: string;
  name: string;
  is_active: boolean;
  is_popular: boolean;
  order_index: number;
  menu_items: MenuItem[];
  restaurant_id: string;
}

interface Restaurant {
  id: string;
  name: string;
}

const CategoryDetails: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [category, setCategory] = useState<MenuCategory | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCategoryEditDialogOpen, setIsCategoryEditDialogOpen] = useState(false);
  const [isMenuItemDialogOpen, setIsMenuItemDialogOpen] = useState(false);
  const [currentMenuItem, setCurrentMenuItem] = useState<MenuItem | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryIsActive, setCategoryIsActive] = useState(true);
  const [categoryIsPopular, setCategoryIsPopular] = useState(false);
  const [menuItemName, setMenuItemName] = useState('');
  const [menuItemDescription, setMenuItemDescription] = useState('');
  const [menuItemPrice, setMenuItemPrice] = useState<number | string>('');
  const [menuItemImageUrl, setMenuItemImageUrl] = useState('');
  const [menuItemIsActive, setMenuItemIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchCategoryAndRestaurantData();
  }, [categoryId]);

  const fetchCategoryAndRestaurantData = async () => {
    if (!categoryId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: categoryData, error: categoryError } = await supabase
      .from('menu_categories')
      .select(`
        *,
        menu_items (
          id,
          name,
          description,
          price,
          image_url,
          is_active,
          order_index
        )
      `)
      .eq('id', categoryId)
      .order('order_index', { foreignTable: 'menu_items', ascending: true })
      .single();

    if (categoryError) {
      console.error('Error fetching category data:', categoryError.message);
      toast.error('Erro ao carregar detalhes da categoria.');
      setLoading(false);
      return;
    }

    if (categoryData) {
      setCategory(categoryData as MenuCategory);
      setCategoryName(categoryData.name);
      setCategoryIsActive(categoryData.is_active);
      setCategoryIsPopular(categoryData.is_popular);

      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('id, name')
        .eq('id', categoryData.restaurant_id)
        .single();

      if (restaurantError) {
        console.error('Error fetching restaurant data:', restaurantError.message);
        toast.error('Erro ao carregar dados do restaurante.');
      } else if (restaurantData) {
        setRestaurant(restaurantData);
      }
    }
    setLoading(false);
  };

  const handleSaveCategory = async () => {
    if (!category || !categoryName.trim()) {
      toast.error('O nome da categoria não pode ser vazio.');
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from('menu_categories')
      .update({ name: categoryName, is_active: categoryIsActive, is_popular: categoryIsPopular })
      .eq('id', category.id);

    if (error) {
      console.error('Error updating category:', error.message);
      toast.error('Erro ao atualizar categoria.');
    } else {
      toast.success('Categoria atualizada com sucesso!');
      setIsCategoryEditDialogOpen(false);
      fetchCategoryAndRestaurantData();
    }
    setIsSaving(false);
  };

  const handleDeleteCategory = async () => {
    if (!category) return;
    if (!confirm('Tem certeza que deseja excluir esta categoria e todos os seus itens?')) return;

    const { error } = await supabase
      .from('menu_categories')
      .delete()
      .eq('id', category.id);

    if (error) {
      console.error('Error deleting category:', error.message);
      toast.error('Erro ao excluir categoria.');
    } else {
      toast.success('Categoria excluída com sucesso!');
      // Redirect to menu management page or restaurant home
      // navigate(`/restaurant-area/menu-management/${category.restaurant_id}`);
    }
  };

  const handleAddItem = () => {
    if (!category) return;
    setCurrentMenuItem(null);
    setMenuItemName('');
    setMenuItemDescription('');
    setMenuItemPrice('');
    setMenuItemImageUrl('');
    setMenuItemIsActive(true);
    setIsMenuItemDialogOpen(true);
  };

  const handleEditMenuItem = (item: MenuItem) => {
    setCurrentMenuItem(item);
    setMenuItemName(item.name);
    setMenuItemDescription(item.description);
    setMenuItemPrice(item.price);
    setMenuItemImageUrl(item.image_url || '');
    setMenuItemIsActive(item.is_active);
    setIsMenuItemDialogOpen(true);
  };

  const handleSaveMenuItem = async () => {
    if (!category || !menuItemName.trim() || menuItemPrice === '') {
      toast.error('Nome e preço do item não podem ser vazios.');
      return;
    }

    setIsSaving(true);
    const priceValue = typeof menuItemPrice === 'string' ? parseFloat(menuItemPrice.replace(',', '.')) : menuItemPrice;

    if (isNaN(priceValue) || priceValue < 0) {
      toast.error('Preço inválido.');
      setIsSaving(false);
      return;
    }

    if (currentMenuItem) {
      // Update menu item
      const { error } = await supabase
        .from('menu_items')
        .update({
          name: menuItemName,
          description: menuItemDescription,
          price: priceValue,
          image_url: menuItemImageUrl || null,
          is_active: menuItemIsActive,
        })
        .eq('id', currentMenuItem.id);

      if (error) {
        console.error('Error updating menu item:', error.message);
        toast.error('Erro ao atualizar item do cardápio.');
      } else {
        toast.success('Item do cardápio atualizado com sucesso!');
        setIsMenuItemDialogOpen(false);
        fetchCategoryAndRestaurantData();
      }
    } else {
      // Add new menu item
      const { data: existingItems } = await supabase
        .from('menu_items')
        .select('order_index')
        .eq('category_id', category.id)
        .order('order_index', { ascending: false })
        .limit(1);

      const newOrderIndex = existingItems && existingItems.length > 0
        ? existingItems[0].order_index + 1
        : 0;

      const { error } = await supabase
        .from('menu_items')
        .insert({
          category_id: category.id,
          name: menuItemName,
          description: menuItemDescription,
          price: priceValue,
          image_url: menuItemImageUrl || null,
          is_active: menuItemIsActive,
          order_index: newOrderIndex,
        });

      if (error) {
        console.error('Error adding menu item:', error.message);
        toast.error('Erro ao adicionar item do cardápio.');
      } else {
        toast.success('Item do cardápio adicionado com sucesso!');
        setIsMenuItemDialogOpen(false);
        fetchCategoryAndRestaurantData();
      }
    }
    setIsSaving(false);
  };

  const handleDeleteMenuItem = async (itemId: string) => {
    if (!confirm('Tem certeza que deseja excluir este item do cardápio?')) return;

    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('Error deleting menu item:', error.message);
      toast.error('Erro ao excluir item do cardápio.');
    } else {
      toast.success('Item do cardápio excluído com sucesso!');
      fetchCategoryAndRestaurantData();
    }
  };

  const moveMenuItem = async (itemId: string, direction: 'up' | 'down') => {
    if (!category) return;

    const itemIndex = category.menu_items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) return;

    const newItems = [...category.menu_items];
    const itemToMove = newItems[itemIndex];

    let targetIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;

    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    const itemToSwap = newItems[targetIndex];

    // Swap order_index values
    const { error } = await supabase
      .from('menu_items')
      .update({ order_index: itemToSwap.order_index })
      .eq('id', itemToMove.id);

    const { error: error2 } = await supabase
      .from('menu_items')
      .update({ order_index: itemToMove.order_index })
      .eq('id', itemToSwap.id);

    if (error || error2) {
      console.error('Error swapping menu item order:', error?.message || error2?.message);
      toast.error('Erro ao reordenar itens do cardápio.');
    } else {
      toast.success('Itens do cardápio reordenados com sucesso!');
      fetchCategoryAndRestaurantData(); // Re-fetch to ensure consistent state
    }
  };

  if (loading) {
    return (
      <RestaurantAreaPageLayout title="Carregando Categoria" icon={Loader2}>
        <div className="flex justify-center items-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </RestaurantAreaPageLayout>
    );
  }

  if (!category) {
    return (
      <RestaurantAreaPageLayout title="Categoria Não Encontrada" icon={Utensils}>
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <Utensils className="h-16 w-16 mb-4" />
          <p className="text-xl">A categoria que você procura não existe ou foi removida.</p>
        </div>
      </RestaurantAreaPageLayout>
    );
  }

  return (
    <RestaurantAreaPageLayout title={category.name} icon={Utensils}>
      <div className="p-4 space-y-6">
        <Card className="mb-4">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle>Gerenciar Categoria</CardTitle>
            <div className="flex flex-wrap justify-end gap-2 w-full">
              <Button onClick={() => setIsCategoryEditDialogOpen(true)} variant="outline" className="w-full sm:w-auto">
                <Edit className="h-4 w-4 mr-2" /> Editar Categoria
              </Button>
              <Button onClick={handleAddItem} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" /> Adicionar Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">Status: {category.is_active ? 'Ativa' : 'Inativa'}</p>
            <p className="text-gray-700">Popular: {category.is_popular ? 'Sim' : 'Não'}</p>
            {restaurant && (
              <p className="text-gray-700">Restaurante: {restaurant.name}</p>
            )}
          </CardContent>
        </Card>

        <h2 className="text-2xl font-bold mb-4">Itens do Cardápio</h2>
        {category.menu_items.length === 0 ? (
          <p className="text-center text-gray-500">Nenhum item nesta categoria. Adicione um!</p>
        ) : (
          <div className="space-y-4">
            {category.menu_items.map((item, index) => (
              <Card key={item.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center space-x-4">
                    {item.image_url && (
                      <img src={item.image_url} alt={item.name} className="w-16 h-16 object-cover rounded-md" />
                    )}
                    <div>
                      <p className="font-semibold text-lg">{item.name}</p>
                      <p className="text-gray-600 text-sm">{item.description}</p>
                      <p className="font-bold text-primary">R$ {item.price.toFixed(2)}</p>
                      {!item.is_active && (
                        <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Inativo</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => moveMenuItem(item.id, 'up')} disabled={index === 0}>
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => moveMenuItem(item.id, 'down')} disabled={index === category.menu_items.length - 1}>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEditMenuItem(item)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteMenuItem(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Category Edit Dialog */}
      <Dialog open={isCategoryEditDialogOpen} onOpenChange={setIsCategoryEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="editCategoryName">Nome da Categoria</Label>
              <Input
                id="editCategoryName"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Ex: Pizzas, Bebidas, Sobremesas"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="editCategoryIsActive"
                checked={categoryIsActive}
                onCheckedChange={setCategoryIsActive}
              />
              <Label htmlFor="editCategoryIsActive">Ativa</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="editCategoryIsPopular"
                checked={categoryIsPopular}
                onCheckedChange={setCategoryIsPopular}
              />
              <Label htmlFor="editCategoryIsPopular">Popular</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryEditDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteCategory} disabled={isSaving}>
              Excluir Categoria
            </Button>
            <Button onClick={handleSaveCategory} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Menu Item Dialog */}
      <Dialog open={isMenuItemDialogOpen} onOpenChange={setIsMenuItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentMenuItem ? 'Editar Item do Cardápio' : 'Adicionar Novo Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="menuItemName">Nome do Item</Label>
              <Input
                id="menuItemName"
                value={menuItemName}
                onChange={(e) => setMenuItemName(e.target.value)}
                placeholder="Ex: Pizza Calabresa, Coca-Cola"
              />
            </div>
            <div>
              <Label htmlFor="menuItemDescription">Descrição</Label>
              <Textarea
                id="menuItemDescription"
                value={menuItemDescription}
                onChange={(e) => setMenuItemDescription(e.target.value)}
                placeholder="Uma breve descrição do item"
              />
            </div>
            <div>
              <Label htmlFor="menuItemPrice">Preço</Label>
              <Input
                id="menuItemPrice"
                type="number"
                step="0.01"
                value={menuItemPrice}
                onChange={(e) => setMenuItemPrice(e.target.value)}
                placeholder="Ex: 29.90"
              />
            </div>
            <div>
              <Label htmlFor="menuItemImageUrl">URL da Imagem</Label>
              <Input
                id="menuItemImageUrl"
                value={menuItemImageUrl}
                onChange={(e) => setMenuItemImageUrl(e.target.value)}
                placeholder="https://exemplo.com/imagem.jpg"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="menuItemIsActive"
                checked={menuItemIsActive}
                onCheckedChange={setMenuItemIsActive}
              />
              <Label htmlFor="menuItemIsActive">Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMenuItemDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveMenuItem} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RestaurantAreaPageLayout>
  );
};

export default CategoryDetails;
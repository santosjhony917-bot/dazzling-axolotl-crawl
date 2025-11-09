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
}

interface Restaurant {
  id: string;
  name: string;
}

const AdminRestaurantMenu: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isMenuItemDialogOpen, setIsMenuItemDialogOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<MenuCategory | null>(null);
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
    fetchRestaurantAndMenuData();
  }, [restaurantId]);

  const fetchRestaurantAndMenuData = async () => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data: restaurantData, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name')
      .eq('id', restaurantId)
      .single();

    if (restaurantError) {
      console.error('Error fetching restaurant:', restaurantError.message);
      toast.error('Erro ao carregar dados do restaurante.');
      setLoading(false);
      return;
    }
    setRestaurant(restaurantData);

    const { data: categoriesData, error: categoriesError } = await supabase
      .from('menu_categories')
      .select(`
        id,
        name,
        is_active,
        is_popular,
        order_index,
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
      .eq('restaurant_id', restaurantId)
      .order('order_index', { ascending: true })
      .order('order_index', { foreignTable: 'menu_items', ascending: true });

    if (categoriesError) {
      console.error('Error fetching menu data:', categoriesError.message);
      toast.error('Erro ao carregar o cardápio.');
    } else {
      setCategories(categoriesData as MenuCategory[]);
    }
    setLoading(false);
  };

  const handleAddCategory = () => {
    setCurrentCategory(null);
    setCategoryName('');
    setCategoryIsActive(true);
    setCategoryIsPopular(false);
    setIsCategoryDialogOpen(true);
  };

  const handleEditCategory = (category: MenuCategory) => {
    setCurrentCategory(category);
    setCategoryName(category.name);
    setCategoryIsActive(category.is_active);
    setCategoryIsPopular(category.is_popular);
    setIsCategoryDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!restaurantId || !categoryName.trim()) {
      toast.error('O nome da categoria não pode ser vazio.');
      return;
    }

    setIsSaving(true);
    if (currentCategory) {
      // Update category
      const { error } = await supabase
        .from('menu_categories')
        .update({ name: categoryName, is_active: categoryIsActive, is_popular: categoryIsPopular })
        .eq('id', currentCategory.id);

      if (error) {
        console.error('Error updating category:', error.message);
        toast.error('Erro ao atualizar categoria.');
      } else {
        toast.success('Categoria atualizada com sucesso!');
        setIsCategoryDialogOpen(false);
        fetchRestaurantAndMenuData();
      }
    } else {
      // Add new category
      const { data: existingCategories } = await supabase
        .from('menu_categories')
        .select('order_index')
        .eq('restaurant_id', restaurantId)
        .order('order_index', { ascending: false })
        .limit(1);

      const newOrderIndex = existingCategories && existingCategories.length > 0
        ? existingCategories[0].order_index + 1
        : 0;

      const { error } = await supabase
        .from('menu_categories')
        .insert({
          restaurant_id: restaurantId,
          name: categoryName,
          is_active: categoryIsActive,
          is_popular: categoryIsPopular,
          order_index: newOrderIndex,
        });

      if (error) {
        console.error('Error adding category:', error.message);
        toast.error('Erro ao adicionar categoria.');
      } else {
        toast.success('Categoria adicionada com sucesso!');
        setIsCategoryDialogOpen(false);
        fetchRestaurantAndMenuData();
      }
    }
    setIsSaving(false);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria e todos os seus itens?')) return;

    const { error } = await supabase
      .from('menu_categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      console.error('Error deleting category:', error.message);
      toast.error('Erro ao excluir categoria.');
    } else {
      toast.success('Categoria excluída com sucesso!');
      fetchRestaurantAndMenuData();
    }
  };

  const handleAddMenuItem = (category: MenuCategory) => {
    setCurrentCategory(category);
    setCurrentMenuItem(null);
    setMenuItemName('');
    setMenuItemDescription('');
    setMenuItemPrice('');
    setMenuItemImageUrl('');
    setMenuItemIsActive(true);
    setIsMenuItemDialogOpen(true);
  };

  const handleEditMenuItem = (category: MenuCategory, item: MenuItem) => {
    setCurrentCategory(category);
    setCurrentMenuItem(item);
    setMenuItemName(item.name);
    setMenuItemDescription(item.description);
    setMenuItemPrice(item.price);
    setMenuItemImageUrl(item.image_url || '');
    setMenuItemIsActive(item.is_active);
    setIsMenuItemDialogOpen(true);
  };

  const handleSaveMenuItem = async () => {
    if (!currentCategory || !menuItemName.trim() || menuItemPrice === '') {
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
        fetchRestaurantAndMenuData();
      }
    } else {
      // Add new menu item
      const { data: existingItems } = await supabase
        .from('menu_items')
        .select('order_index')
        .eq('category_id', currentCategory.id)
        .order('order_index', { ascending: false })
        .limit(1);

      const newOrderIndex = existingItems && existingItems.length > 0
        ? existingItems[0].order_index + 1
        : 0;

      const { error } = await supabase
        .from('menu_items')
        .insert({
          category_id: currentCategory.id,
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
        fetchRestaurantAndMenuData();
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
      fetchRestaurantAndMenuData();
    }
  };

  const moveCategory = async (categoryId: string, direction: 'up' | 'down') => {
    const categoryIndex = categories.findIndex(cat => cat.id === categoryId);
    if (categoryIndex === -1) return;

    const newCategories = [...categories];
    const categoryToMove = newCategories[categoryIndex];

    let targetIndex = direction === 'up' ? categoryIndex - 1 : categoryIndex + 1;

    if (targetIndex < 0 || targetIndex >= newCategories.length) return;

    const categoryToSwap = newCategories[targetIndex];

    // Swap order_index values
    const { error } = await supabase.rpc('swap_category_order', {
      category_id_a: categoryToMove.id,
      category_id_b: categoryToSwap.id,
    });

    if (error) {
      console.error('Error swapping category order:', error.message);
      toast.error('Erro ao reordenar categorias.');
    } else {
      toast.success('Categorias reordenadas com sucesso!');
      fetchRestaurantAndMenuData(); // Re-fetch to ensure consistent state
    }
  };

  const moveMenuItem = async (categoryId: string, itemId: string, direction: 'up' | 'down') => {
    const category = categories.find(cat => cat.id === categoryId);
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
      fetchRestaurantAndMenuData(); // Re-fetch to ensure consistent state
    }
  };

  if (loading) {
    return (
      <RestaurantAreaPageLayout title="Carregando Menu" icon={Loader2}>
        <div className="flex justify-center items-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </RestaurantAreaPageLayout>
    );
  }

  if (!restaurant) {
    return (
      <RestaurantAreaPageLayout title="Restaurante Não Encontrado" icon={Utensils}>
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <Utensils className="h-16 w-16 mb-4" />
          <p className="text-xl">O restaurante que você procura não existe ou foi removido.</p>
        </div>
      </RestaurantAreaPageLayout>
    );
  }

  return (
    <RestaurantAreaPageLayout title={`Gerenciar Menu: ${restaurant.name}`} icon={Utensils}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Cardápio</h2>
        <Button onClick={handleAddCategory}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar Categoria
        </Button>
      </div>

      {categories.length === 0 ? (
        <p className="text-center text-gray-500">Nenhuma categoria de cardápio encontrada. Adicione uma!</p>
      ) : (
        <div className="space-y-4">
          {categories.map((category, catIndex) => (
            <Card key={category.id}>
              <CardHeader className="flex flex-row items-center justify-between space-x-2 p-4">
                <div className="flex items-center space-x-2">
                  <CardTitle className="text-lg">{category.name}</CardTitle>
                  {category.is_popular && (
                    <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">Popular</span>
                  )}
                  {!category.is_active && (
                    <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded-full">Inativo</span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => moveCategory(category.id, 'up')} disabled={catIndex === 0}>
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => moveCategory(category.id, 'down')} disabled={catIndex === categories.length - 1}>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEditCategory(category)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleAddMenuItem(category)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteCategory(category.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {category.menu_items.length === 0 ? (
                  <p className="text-gray-500 text-sm">Nenhum item nesta categoria. Adicione um!</p>
                ) : (
                  <div className="space-y-3">
                    {category.menu_items.map((item, itemIndex) => (
                      <div key={item.id} className="flex items-center justify-between border-b pb-3 last:border-b-0 last:pb-0">
                        <div className="flex items-center space-x-3">
                          {item.image_url && (
                            <img src={item.image_url} alt={item.name} className="w-12 h-12 object-cover rounded-md" />
                          )}
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-gray-600">{item.description}</p>
                            <p className="text-sm font-semibold">R$ {item.price.toFixed(2)}</p>
                            {!item.is_active && (
                              <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Inativo</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => moveMenuItem(category.id, item.id, 'up')} disabled={itemIndex === 0}>
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => moveMenuItem(category.id, item.id, 'down')} disabled={itemIndex === category.menu_items.length - 1}>
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleEditMenuItem(category, item)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteMenuItem(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentCategory ? 'Editar Categoria' : 'Adicionar Nova Categoria'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="categoryName">Nome da Categoria</Label>
              <Input
                id="categoryName"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Ex: Pizzas, Bebidas, Sobremesas"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="categoryIsActive"
                checked={categoryIsActive}
                onCheckedChange={setCategoryIsActive}
              />
              <Label htmlFor="categoryIsActive">Ativa</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="categoryIsPopular"
                checked={categoryIsPopular}
                onCheckedChange={setCategoryIsPopular}
              />
              <Label htmlFor="categoryIsPopular">Popular</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveCategory} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar
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

export default AdminRestaurantMenu;
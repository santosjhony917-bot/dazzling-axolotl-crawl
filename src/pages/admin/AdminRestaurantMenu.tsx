import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { PlusCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { MenuItemList } from '@/components/restaurant/menu/MenuItemList';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ItemFormSheet } from '@/components/restaurant/menu/ItemFormSheet';
import { CategoryFormDialog } from '@/components/restaurant/menu/CategoryFormDialog';
import { MenuCategory, MenuItem } from '@/types/menu';

type CategoryWithItems = MenuCategory & { menu_items: MenuItem[] };

const fetchMenu = async (restaurantId: string): Promise<CategoryWithItems[]> => {
  const { data, error } = await supabase
    .from('menu_categories')
    .select('*, menu_items(*)')
    .eq('restaurant_id', restaurantId)
    .order('order_index', { ascending: true })
    .order('order_index', { foreignTable: 'menu_items', ascending: true });

  if (error) throw new Error(error.message);
  return data as CategoryWithItems[];
};

export default function AdminRestaurantMenu({ restaurantId }: { restaurantId: string }) {
  const queryClient = useQueryClient();
  const [isItemSheetOpen, setItemSheetOpen] = useState(false);
  const [isCategoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | undefined>(undefined);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | undefined>(undefined);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const { data: menu, isLoading, error } = useQuery({
    queryKey: ['menu', restaurantId],
    queryFn: () => fetchMenu(restaurantId),
  });

  const handleNewItem = (categoryId: string) => {
    setEditingItem(undefined);
    setActiveCategoryId(categoryId);
    setItemSheetOpen(true);
  };

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setActiveCategoryId(item.category_id);
    setItemSheetOpen(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este item?')) return;
    const { error } = await supabase.from('menu_items').delete().eq('id', itemId);
    if (error) {
      toast.error(`Erro ao excluir item: ${error.message}`);
    } else {
      toast.success('Item excluído com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['menu', restaurantId] });
    }
  };

  const handleToggleItemActive = async (item: MenuItem, isActive: boolean) => {
    const { error } = await supabase.from('menu_items').update({ is_active: isActive }).eq('id', item.id);
    if (error) {
      toast.error('Erro ao atualizar item.');
    } else {
      toast.success(`Item ${isActive ? 'ativado' : 'pausado'}.`);
      queryClient.invalidateQueries({ queryKey: ['menu', restaurantId] });
    }
  };

  const handleItemOrderChange = async (items: MenuItem[]) => {
    const updates = items.map((item, index) => ({
      id: item.id,
      order_index: index,
    }));
    const { error } = await supabase.from('menu_items').upsert(updates);
    if (error) {
      toast.error('Erro ao reordenar itens.');
    } else {
      toast.success('Ordem dos itens atualizada.');
      queryClient.invalidateQueries({ queryKey: ['menu', restaurantId] });
    }
  };

  const handleNewCategory = () => {
    setEditingCategory(undefined);
    setCategoryDialogOpen(true);
  };

  if (isLoading) return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
  if (error) return <div>Erro ao carregar o cardápio: {error.message}</div>;

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gerenciar Cardápio</h1>
        <Button onClick={handleNewCategory}>
          <PlusCircle className="mr-2 h-4 w-4" /> Nova Categoria
        </Button>
      </div>

      <div className="space-y-6">
        {menu?.map((category) => (
          <div key={category.id} className="border rounded-lg">
            <div className="bg-muted/50 p-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold">{category.name}</h2>
              <Button onClick={() => handleNewItem(category.id)} size="sm">Adicionar Item</Button>
            </div>
            <div className="p-4">
              {category.menu_items.length > 0 ? (
                <MenuItemList
                  items={category.menu_items}
                  onEdit={handleEditItem}
                  onDelete={handleDeleteItem}
                  onToggleActive={handleToggleItemActive}
                  onOrderChange={handleItemOrderChange}
                />
              ) : (
                <p className="text-muted-foreground text-sm">Nenhum item nesta categoria.</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <ItemFormSheet
        isOpen={isItemSheetOpen}
        setIsOpen={setItemSheetOpen}
        item={editingItem}
        categoryId={activeCategoryId!}
        restaurantId={restaurantId}
      />
      <CategoryFormDialog
        isOpen={isCategoryDialogOpen}
        setIsOpen={setCategoryDialogOpen}
        category={editingCategory}
        restaurantId={restaurantId}
      />
    </div>
  );
}
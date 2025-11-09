import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MenuCategory, MenuItem } from '@/types/menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, PlusCircle } from 'lucide-react';
import { MenuItemList } from '@/components/restaurant/menu/MenuItemList';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ItemFormSheet } from '@/components/restaurant/menu/ItemFormSheet';

const fetchCategoryDetails = async (categoryId: string) => {
  const { data, error } = await supabase
    .from('menu_categories')
    .select('*, menu_items(*)')
    .eq('id', categoryId)
    .single();
  if (error) throw new Error(error.message);
  return data;
};

const updateCategory = async (category: Partial<MenuCategory> & { id: string }) => {
  const { error } = await supabase.from('menu_categories').update(category).eq('id', category.id);
  if (error) throw new Error(error.message);
};

export default function CategoryDetails() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | undefined>(undefined);

  const { data: category, isLoading, error } = useQuery({
    queryKey: ['category', categoryId],
    queryFn: () => fetchCategoryDetails(categoryId!),
    enabled: !!categoryId,
  });

  const mutation = useMutation({
    mutationFn: updateCategory,
    onSuccess: () => {
      toast.success('Categoria atualizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['category', categoryId] });
    },
    onError: (err) => {
      toast.error(`Erro ao atualizar categoria: ${err.message}`);
    },
  });

  const handleUpdateName = (e: React.FocusEvent<HTMLInputElement>) => {
    if (category && e.target.value !== category.name) {
      mutation.mutate({ id: category.id, name: e.target.value });
    }
  };

  const handleToggleActive = (isActive: boolean) => {
    if (category) {
      mutation.mutate({ id: category.id, is_active: isActive });
    }
  };

  const handleNewItem = () => {
    setEditingItem(undefined);
    setSheetOpen(true);
  };

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setSheetOpen(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este item?')) return;
    const { error } = await supabase.from('menu_items').delete().eq('id', itemId);
    if (error) {
      toast.error(`Erro ao excluir item: ${error.message}`);
    } else {
      toast.success('Item excluído com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['category', categoryId] });
    }
  };

  const handleOrderChange = async (items: MenuItem[]) => {
    const updates = items.map((item, index) => ({
      id: item.id,
      order_index: index,
    }));
    const { error } = await supabase.from('menu_items').upsert(updates);
    if (error) {
      toast.error('Erro ao reordenar itens.');
    } else {
      toast.success('Ordem dos itens atualizada.');
      queryClient.setQueryData(['category', categoryId], (oldData: any) => {
        if (!oldData) return oldData;
        return { ...oldData, menu_items: items };
      });
    }
  };

  if (isLoading) return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
  if (error) return <div>Erro ao carregar a categoria: {error.message}</div>;
  if (!category) return <div>Categoria não encontrada.</div>;

  const items = category.menu_items || [];

  return (
    <div className="p-4 md:p-6">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
      </Button>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <Input
          defaultValue={category.name}
          onBlur={handleUpdateName}
          className="text-2xl font-bold max-w-md"
        />
        <div className="flex items-center space-x-2">
          <Switch
            id="category-active"
            checked={category.is_active ?? false}
            onCheckedChange={handleToggleActive}
          />
          <Label htmlFor="category-active">Ativa</Label>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Itens do Cardápio</h2>
        <Button onClick={handleNewItem}>
          <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Item
        </Button>
      </div>

      {items.length === 0 ? (
        <p>Nenhum item nesta categoria ainda.</p>
      ) : (
        <MenuItemList
          items={items}
          onEdit={handleEditItem}
          onDelete={handleDeleteItem}
          onToggleActive={(item, isActive) => console.log(item, isActive)}
          onOrderChange={handleOrderChange}
        />
      )}

      <ItemFormSheet
        isOpen={isSheetOpen}
        setIsOpen={setSheetOpen}
        item={editingItem}
        categoryId={categoryId!}
        restaurantId={category.restaurant_id}
      />
    </div>
  );
}
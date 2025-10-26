import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Edit, Trash2, Plus, GripVertical, Loader2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { MenuCategory, MenuItem } from '@/types';
import { cn, formatPrice } from '@/lib/utils';
import { useMenuCategoryItems } from '@/hooks/useMenuCategoryItems';
import { useMenuItemManagement } from '@/hooks/useMenuManagement';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

interface CategoryItemManagerProps {
  category: MenuCategory;
  onEditCategory: (category: MenuCategory) => void;
  onDeleteCategory: (categoryId: string) => void;
  onReorder: (category_id_a: string, category_id_b: string) => void;
  isFirst: boolean;
  isLast: boolean;
  isSwapping: boolean;
  onOpenItemDialog: (item: MenuItem | null, categoryId: string) => void;
}

// Componente para exibir um item de menu dentro da lista
const ItemDisplayCard: React.FC<{ item: MenuItem, onEdit: (item: MenuItem) => void, onDelete: (itemId: string) => void }> = ({ item, onEdit, onDelete }) => {
  const { updateItemMutation } = useMenuItemManagement(item.category_id);
  const isUpdating = updateItemMutation.isPending;

  const handleToggleActive = (checked: boolean) => {
    updateItemMutation.mutate({
      id: item.id,
      name: item.name,
      description: item.description || '',
      price: item.price,
      image_url: item.image_url,
      is_active: checked,
    });
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 border rounded-lg transition-all",
        item.is_active ? "bg-white hover:bg-gray-50" : "bg-red-50 opacity-80 hover:bg-red-100"
      )}
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <GripVertical className="h-4 w-4 text-gray-400 cursor-grab shrink-0" />
        {item.image_url && (
          <img src={item.image_url} alt={item.name} className="w-10 h-10 object-cover rounded-md shrink-0" />
        )}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="font-medium text-primary truncate">{item.name}</span>
          <span className="text-sm text-highlight font-semibold">{formatPrice(item.price)}</span>
        </div>
      </div>

      <div className="flex space-x-2 items-center shrink-0">
        <div className="flex items-center space-x-2">
          <Switch
            id={`item-active-switch-${item.id}`}
            checked={item.is_active}
            onCheckedChange={handleToggleActive}
            disabled={isUpdating}
            className="data-[state=checked]:bg-highlight"
          />
          {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        </div>
        <Button variant="ghost" size="icon" onClick={() => onEdit(item)} title="Editar Item" className="h-8 w-8">
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)} title="Excluir Item" className="h-8 w-8 text-red-500 hover:bg-red-50">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};


const CategoryItemManager: React.FC<CategoryItemManagerProps> = ({
  category,
  onEditCategory,
  onDeleteCategory,
  onReorder,
  isFirst,
  isLast,
  isSwapping,
  onOpenItemDialog,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { data: items = [], isLoading: isItemsLoading } = useMenuCategoryItems(category.id);
  const { deleteItemMutation } = useMenuItemManagement(category.id);
  
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const handleDeleteItemClick = (itemId: string) => {
    setItemToDelete(itemId);
    setIsConfirmationOpen(true);
  };
  
  const confirmDeleteItem = () => {
    if (itemToDelete) {
      deleteItemMutation.mutate(itemToDelete);
    }
    setIsConfirmationOpen(false);
    setItemToDelete(null);
  };

  const activeItems = items.filter(item => item.is_active);
  const inactiveItems = items.filter(item => !item.is_active);

  return (
    <>
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="space-y-2 border border-gray-200 rounded-xl bg-white shadow-md"
      >
        {/* Category Header (Trigger) */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="flex flex-col min-w-0">
              <h3 className="text-lg font-bold text-primary truncate">{category.name}</h3>
              <p className="text-sm text-gray-500">{items.length} itens | {category.is_active ? 'Ativa' : 'Inativa'}</p>
            </div>
          </div>

          {/* Category Actions */}
          <div className="flex space-x-2 items-center shrink-0">
            {/* Botões de Reordenação */}
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onReorder(category.id, items[items.findIndex(i => i.id === category.id) - 1]?.id || ''); }} disabled={isFirst || isSwapping} title="Mover para cima">
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onReorder(category.id, items[items.findIndex(i => i.id === category.id) + 1]?.id || ''); }} disabled={isLast || isSwapping} title="Mover para baixo">
              <ChevronDown className="h-4 w-4" />
            </Button>
            
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEditCategory(category); }} title="Editar Categoria" className="text-blue-500 hover:bg-blue-50">
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDeleteCategory(category.id); }} title="Excluir Categoria" className="text-red-500 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
            </Button>
            
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/5">
                {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        {/* Collapsible Content (Menu Items) */}
        <CollapsibleContent className="space-y-4 p-4 pt-0 border-t border-gray-100">
          <Button 
            onClick={() => onOpenItemDialog(null, category.id)} 
            className="w-full bg-highlight hover:bg-highlight/90"
          >
            <Plus className="mr-2 h-4 w-4" /> Adicionar Novo Item
          </Button>
          
          {isItemsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-gray-500 italic text-sm text-center pt-4">Nenhum item nesta categoria.</p>
          ) : (
            <div className="space-y-3">
              {/* Itens Ativos */}
              {activeItems.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-primary">Itens Ativos ({activeItems.length})</h4>
                  {activeItems.map((item) => (
                    <ItemDisplayCard
                      key={item.id}
                      item={item}
                      onEdit={(i) => onOpenItemDialog(i, category.id)}
                      onDelete={handleDeleteItemClick}
                    />
                  ))}
                </div>
              )}

              {/* Itens Inativos */}
              {inactiveItems.length > 0 && (
                <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                  <h4 className="text-sm font-semibold text-red-500 mb-2">Itens Inativos ({inactiveItems.length})</h4>
                  <div className="space-y-3">
                    {inactiveItems.map((item) => (
                      <ItemDisplayCard
                        key={item.id}
                        item={item}
                        onEdit={(i) => onOpenItemDialog(i, category.id)}
                        onDelete={handleDeleteItemClick}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
      
      <ConfirmationDialog
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
        onConfirm={confirmDeleteItem}
        title="Excluir Item de Menu"
        description="Tem certeza que deseja deletar este item? Esta ação é irreversível."
        confirmText="Sim, Deletar"
      />
    </>
  );
};

export default CategoryItemManager;
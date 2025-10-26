import React from 'react';
import { MenuCategory } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, ArrowUp, ArrowDown, Loader2, ChevronRight, GripVertical } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useCategoryMutations } from '@/hooks/useMenuManagement';
import { cn } from '@/lib/utils';

interface CategoryListItemProps {
  category: MenuCategory;
  onEdit: (category: MenuCategory) => void;
  onDelete: (categoryId: string) => void;
  // Removendo props de reordenação explícita
  isExpanded: boolean;
}

export const CategoryListItem: React.FC<CategoryListItemProps> = ({
  category,
  onEdit,
  onDelete,
  isExpanded,
}) => {
  const { updateCategoryMutation } = useCategoryMutations(category.restaurant_id);
  const isUpdating = updateCategoryMutation.isPending;

  const handleToggleActive = (checked: boolean) => {
    updateCategoryMutation.mutate({
      id: category.id,
      name: category.name,
      is_active: checked,
    });
  };

  return (
    <div className="flex items-center justify-between w-full p-4">
      {/* Nome e Status */}
      <div className="flex items-center space-x-4 flex-grow min-w-0">
        <GripVertical className="h-5 w-5 text-gray-400 cursor-grab shrink-0" />
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold truncate">{category.name}</h3>
          <div className="flex items-center space-x-2">
            <Switch
              id={`active-switch-${category.id}`}
              checked={category.is_active}
              onCheckedChange={handleToggleActive}
              disabled={isUpdating}
              // Previne que o clique no switch propague para o AccordionTrigger
              onClick={(e) => e.stopPropagation()} 
              className="data-[state=checked]:bg-highlight"
            />
            <Label htmlFor={`active-switch-${category.id}`} className="text-sm text-gray-500">
              {category.is_active ? 'Ativa' : 'Inativa'}
            </Label>
            {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </div>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex space-x-2 items-center shrink-0">
        {/* Botões de Edição e Deleção */}
        <Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(category); }} title="Editar">
          <Edit className="w-4 h-4" />
        </Button>
        <Button variant="destructive" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(category.id); }} title="Deletar">
          <Trash2 className="w-4 h-4" />
        </Button>
        
        {/* Indicador de Expansão */}
        <ChevronRight className={cn("w-5 h-5 text-gray-400 ml-2 transition-transform", isExpanded && "rotate-90")} />
      </div>
    </div>
  );
};
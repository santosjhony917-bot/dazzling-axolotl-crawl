import React from 'react';
import { MenuCategory } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useCategoryMutations } from '@/hooks/useMenuManagement';

interface CategoryListItemProps {
  category: MenuCategory;
  onEdit: (category: MenuCategory) => void;
  onDelete: (categoryId: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  isSwapping: boolean;
}

export const CategoryListItem: React.FC<CategoryListItemProps> = ({
  category,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  isSwapping,
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
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-grow">
          <h3 className="text-lg font-semibold">{category.name}</h3>
          <div className="flex items-center space-x-2">
            <Switch
              id={`active-switch-${category.id}`}
              checked={category.is_active}
              onCheckedChange={handleToggleActive}
              disabled={isUpdating}
            />
            <Label htmlFor={`active-switch-${category.id}`} className="text-sm text-gray-500">
              {category.is_active ? 'Ativa' : 'Inativa'}
            </Label>
            {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </div>
        </div>

        <div className="flex space-x-2 items-center">
          {/* Botões de Reordenação */}
          <Button
            variant="outline"
            size="icon"
            onClick={onMoveUp}
            disabled={isFirst || isSwapping}
            title="Mover para cima"
          >
            <ArrowUp className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onMoveDown}
            disabled={isLast || isSwapping}
            title="Mover para baixo"
          >
            <ArrowDown className="w-4 h-4" />
          </Button>
          
          {isSwapping && <Loader2 className="h-4 w-4 animate-spin text-primary" />}

          {/* Botões de Ação */}
          <Button variant="outline" size="icon" onClick={() => onEdit(category)} title="Editar">
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="destructive" size="icon" onClick={() => onDelete(category.id)} title="Deletar">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};